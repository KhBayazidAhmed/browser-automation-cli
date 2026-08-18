export interface KillableBrowser {
	forceKillSync(): void;
}

const activeBrowsers = new Set<KillableBrowser>();
let processHooksInstalled = false;

export function registerActiveBrowser(browser: KillableBrowser) {
	activeBrowsers.add(browser);
	installProcessHooks();
}

export function unregisterActiveBrowser(browser: KillableBrowser) {
	activeBrowsers.delete(browser);
}

function installProcessHooks() {
	if (processHooksInstalled) return;
	processHooksInstalled = true;

	const handleExit = () => {
		for (const browser of activeBrowsers) {
			try {
				browser.forceKillSync();
			} catch {}
		}
		activeBrowsers.clear();
	};

	const handleSignal = (signal: string) => {
		handleExit();
		process.exit(signal === "SIGINT" ? 130 : 143);
	};

	process.on("SIGINT", () => handleSignal("SIGINT"));
	process.on("SIGTERM", () => handleSignal("SIGTERM"));
	process.on("SIGHUP", () => handleSignal("SIGHUP"));
	process.on("exit", handleExit);
	process.on("uncaughtException", (err) => {
		handleExit();
		console.error("Uncaught exception:", err);
		process.exit(1);
	});
	process.on("unhandledRejection", (reason) => {
		handleExit();
		console.error("Unhandled rejection:", reason);
		process.exit(1);
	});
}

export async function cleanupOrphanChromeProcesses(): Promise<number> {
	if (process.platform === "darwin" || process.platform === "linux") {
		try {
			const proc = Bun.spawn(["pgrep", "-f", "cdp-chrome-profile"], {
				stdout: "pipe",
			});
			const output = await new Response(proc.stdout).text();
			const pids = output
				.split("\n")
				.map((p) => p.trim())
				.filter(Boolean);
			let killed = 0;
			for (const p of pids) {
				const pidNum = Number.parseInt(p, 10);
				if (pidNum && pidNum !== process.pid) {
					try {
						process.kill(pidNum, "SIGKILL");
						killed++;
					} catch {}
				}
			}
			return killed;
		} catch {
			return 0;
		}
	}
	return 0;
}
