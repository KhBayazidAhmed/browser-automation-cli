import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Subprocess, spawn } from "bun";

export interface LaunchOptions {
	headless?: boolean;
	port?: number;
	executablePath?: string;
	userDataDir?: string;
	profileDirectory?: string;
	args?: string[];
	blockAudio?: boolean;
}

export interface LaunchedChrome {
	process: Subprocess;
	port: number;
	webSocketDebuggerUrl: string;
	browserVersion: string;
	userDataDir: string;
	isTempProfile: boolean;
}

function compactPaths(paths: Array<string | undefined>): string[] {
	return [...new Set(paths.filter((path): path is string => Boolean(path)))];
}

function windowsBrowserPaths(): string[] {
	const programFiles = process.env.PROGRAMFILES || process.env.ProgramFiles;
	const programFilesX86 = process.env["PROGRAMFILES(X86)"] || process.env["ProgramFiles(x86)"];
	const localAppData = process.env.LOCALAPPDATA;
	const roots = compactPaths([programFiles, programFilesX86, localAppData]);
	const relativeExecutables = [
		["Google", "Chrome", "Application", "chrome.exe"],
		["Microsoft", "Edge", "Application", "msedge.exe"],
		["BraveSoftware", "Brave-Browser", "Application", "brave.exe"],
		["Chromium", "Application", "chrome.exe"],
	];

	return roots.flatMap((root) => relativeExecutables.map((parts) => join(root, ...parts)));
}

function defaultChromePaths(): Record<"darwin" | "linux" | "win32", string[]> {
	return {
		darwin: [
			"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
			"/Applications/Chromium.app/Contents/MacOS/Chromium",
			"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
			"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
		],
		linux: [
			"/usr/bin/google-chrome",
			"/usr/bin/chromium",
			"/usr/bin/chromium-browser",
			"/usr/bin/brave-browser",
			"/usr/bin/microsoft-edge",
			"/usr/bin/microsoft-edge-stable",
			"/opt/google/chrome/google-chrome",
			"/snap/bin/chromium",
		],
		win32: windowsBrowserPaths(),
	};
}

export function findSystemChrome(): string {
	const configuredPath = process.env.CHROME_PATH;
	if (configuredPath) {
		if (existsSync(configuredPath)) return configuredPath;
		throw new Error(`CHROME_PATH does not point to an existing browser: ${configuredPath}`);
	}

	const platform = process.platform as "darwin" | "linux" | "win32";
	const browserPaths = defaultChromePaths();
	const paths = browserPaths[platform] || browserPaths.linux;

	for (const p of paths) {
		if (existsSync(p)) {
			return p;
		}
	}

	throw new Error(
		"No Chromium-based browser found on this system. Please specify an executablePath or install Google Chrome.",
	);
}

export async function launchChrome(options: LaunchOptions = {}): Promise<LaunchedChrome> {
	const executablePath = options.executablePath || findSystemChrome();
	const requestedPort = options.port ?? 0;
	const userDataDir =
		options.userDataDir ||
		join(tmpdir(), `cdp-chrome-profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
	const isTempProfile =
		!options.userDataDir || /(?:^|[/\\])cdp-cloned-profile-[^/\\]+$/.test(userDataDir);

	if (!existsSync(userDataDir)) {
		mkdirSync(userDataDir, { recursive: true });
	}

	const defaultArgs = [
		`--remote-debugging-port=${requestedPort}`,
		`--user-data-dir=${userDataDir}`,
		options.profileDirectory ? `--profile-directory=${options.profileDirectory}` : "",
		options.headless !== false ? "--headless=new" : "",
		"--no-first-run",
		"--no-default-browser-check",
		"--disable-background-networking",
		"--disable-background-timer-throttling",
		"--disable-backgrounding-occluded-windows",
		"--disable-breakpad",
		"--disable-component-update",
		"--disable-default-apps",
		"--disable-dev-shm-usage",
		"--disable-extensions",
		"--disable-gpu",
		"--disable-sync",
		"--disable-translate",
		"--metrics-recording-only",
		options.blockAudio !== false ? "--mute-audio" : "",
		"--hide-scrollbars",
		...(options.args || []),
	].filter(Boolean);

	const devtoolsPortFile = join(userDataDir, "DevToolsActivePort");
	const previousPortFile = existsSync(devtoolsPortFile)
		? readFileSync(devtoolsPortFile, "utf-8")
		: null;
	const proc = spawn([executablePath, ...defaultArgs], {
		stdout: "ignore",
		stderr: "pipe",
	});
	const stderrPromise = new Response(proc.stderr).text();

	// Poll until the CDP endpoint is responsive (typically 20-50ms)
	const maxAttempts = 200;
	const intervalMs = 50;
	let port = requestedPort;
	let versionInfo: { webSocketDebuggerUrl?: string; Browser?: string } | null = null;

	for (let i = 0; i < maxAttempts; i++) {
		try {
			if (port === 0 && existsSync(devtoolsPortFile)) {
				const currentPortFile = readFileSync(devtoolsPortFile, "utf-8");
				if (currentPortFile !== previousPortFile) {
					const detectedPort = Number.parseInt(currentPortFile.split("\n")[0] || "", 10);
					if (Number.isInteger(detectedPort) && detectedPort > 0) port = detectedPort;
				}
			}
			if (port > 0) {
				const res = await fetch(`http://127.0.0.1:${port}/json/version`);
				if (res.ok) {
					versionInfo = (await res.json()) as {
						webSocketDebuggerUrl?: string;
						Browser?: string;
					};
					break;
				}
			}
		} catch {
			// Chrome is still starting up
		}
		await new Promise((r) => setTimeout(r, intervalMs));
	}

	if (!versionInfo?.webSocketDebuggerUrl) {
		proc.kill();
		await Promise.race([proc.exited, new Promise((resolve) => setTimeout(resolve, 1000))]);
		const stderr = (await stderrPromise).trim();
		if (isTempProfile) {
			try {
				rmSync(userDataDir, { recursive: true, force: true });
			} catch {}
		}
		throw new Error(
			`Failed to connect to Chrome CDP${port > 0 ? ` on port ${port}` : ""} within 10 seconds.${stderr ? ` Chrome stderr: ${stderr.slice(-1200)}` : ""}`,
		);
	}

	return {
		process: proc,
		port,
		webSocketDebuggerUrl: versionInfo.webSocketDebuggerUrl,
		browserVersion: versionInfo.Browser || "Chromium",
		userDataDir,
		isTempProfile,
	};
}
