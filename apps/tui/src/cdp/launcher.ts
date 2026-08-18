import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Subprocess, spawn } from "bun";

export interface LaunchOptions {
	headless?: boolean;
	port?: number;
	executablePath?: string;
	userDataDir?: string;
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

const DEFAULT_CHROME_PATHS = {
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
	],
	win32: [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	],
};

export function findSystemChrome(): string {
	const platform = process.platform as "darwin" | "linux" | "win32";
	const paths = DEFAULT_CHROME_PATHS[platform] || DEFAULT_CHROME_PATHS.linux;

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
	const port = options.port || Math.floor(Math.random() * (9999 - 9200 + 1)) + 9200;
	const isTempProfile = !options.userDataDir;
	const userDataDir =
		options.userDataDir ||
		join(tmpdir(), `cdp-chrome-profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

	if (!existsSync(userDataDir)) {
		mkdirSync(userDataDir, { recursive: true });
	}

	const defaultArgs = [
		`--remote-debugging-port=${port}`,
		`--user-data-dir=${userDataDir}`,
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

	const proc = spawn([executablePath, ...defaultArgs], {
		stdout: "ignore",
		stderr: "ignore",
	});

	// Poll until the CDP endpoint is responsive (typically 20-50ms)
	const maxAttempts = 50;
	const intervalMs = 50;
	let versionInfo: any = null;

	for (let i = 0; i < maxAttempts; i++) {
		try {
			const res = await fetch(`http://127.0.0.1:${port}/json/version`);
			if (res.ok) {
				versionInfo = await res.json();
				break;
			}
		} catch {
			// Chrome is still starting up
		}
		await new Promise((r) => setTimeout(r, intervalMs));
	}

	if (!versionInfo || !versionInfo.webSocketDebuggerUrl) {
		proc.kill();
		if (isTempProfile) {
			try {
				rmSync(userDataDir, { recursive: true, force: true });
			} catch {}
		}
		throw new Error(`Failed to connect to Chrome CDP on port ${port} within timeout.`);
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
