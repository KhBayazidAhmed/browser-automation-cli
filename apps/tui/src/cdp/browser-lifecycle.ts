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
}

export async function cleanupOrphanChromeProcesses(): Promise<number> {
	if (process.platform === "darwin" || process.platform === "linux") {
		try {
			const proc = Bun.spawn(["ps", "-axo", "pid=,ppid=,command="], {
				stdout: "pipe",
			});
			const output = await new Response(proc.stdout).text();
			const pids = output
				.split("\n")
				.map((line) => line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/))
				.filter((match): match is RegExpMatchArray =>
					Boolean(
						match &&
							match[2] === "1" &&
							/(?:cdp-chrome-profile-|cdp-cloned-profile-)/.test(match[3] || ""),
					),
				)
				.map((match) => match[1]);
			let killed = 0;
			for (const p of pids) {
				const pidNum = Number.parseInt(p || "", 10);
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
