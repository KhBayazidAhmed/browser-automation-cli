import { existsSync, rmSync } from "node:fs";
import { CDPClient } from "./client.js";
import {
	type LaunchedChrome,
	type LaunchOptions,
	launchChrome,
} from "./launcher.js";
import { Page } from "./page.js";

const activeBrowsers = new Set<Browser>();
let processHooksInstalled = false;

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

export class Browser {
	private _pages: Page[] = [];
	private _isClosed = false;

	constructor(
		public readonly launched: LaunchedChrome,
		public readonly browserClient: CDPClient,
	) {
		activeBrowsers.add(this);
		installProcessHooks();
	}

	static async launch(options: LaunchOptions = {}): Promise<Browser> {
		const launched = await launchChrome(options);
		const browserClient = new CDPClient(launched.webSocketDebuggerUrl);
		await browserClient.connect();

		const browser = new Browser(launched, browserClient);
		return browser;
	}

	async newPage(url = "about:blank"): Promise<Page> {
		if (this._isClosed) {
			throw new Error("Cannot create page on a closed Browser instance.");
		}

		// Create new target via CDP or HTTP
		const res = await fetch(
			`http://127.0.0.1:${this.launched.port}/json/new?${encodeURIComponent(url)}`,
			{
				method: "PUT",
			},
		);
		const target = (await res.json()) as {
			id: string;
			webSocketDebuggerUrl?: string;
		};

		if (!target.webSocketDebuggerUrl) {
			throw new Error(
				`Failed to create new page target on port ${this.launched.port}`,
			);
		}

		const pageClient = new CDPClient(target.webSocketDebuggerUrl);
		await pageClient.connect();

		const page = new Page(pageClient, target.id);
		await page.init();

		this._pages.push(page);
		return page;
	}

	async pages(): Promise<Page[]> {
		if (this._isClosed) return [];

		const res = await fetch(`http://127.0.0.1:${this.launched.port}/json/list`);
		const targets = (await res.json()) as Array<{
			id: string;
			type: string;
			webSocketDebuggerUrl?: string;
		}>;

		const pageTargets = targets.filter(
			(t) => t.type === "page" && t.webSocketDebuggerUrl,
		);
		const existingIds = new Set(this._pages.map((p) => p.targetId));

		for (const target of pageTargets) {
			if (!existingIds.has(target.id) && target.webSocketDebuggerUrl) {
				const client = new CDPClient(target.webSocketDebuggerUrl);
				await client.connect();
				const page = new Page(client, target.id);
				await page.init();
				this._pages.push(page);
			}
		}

		return this._pages;
	}

	get isClosed(): boolean {
		return this._isClosed;
	}

	get version(): string {
		return this.launched.browserVersion;
	}

	async close(): Promise<void> {
		if (this._isClosed) return;
		this._isClosed = true;
		activeBrowsers.delete(this);

		// 1. Close page CDP clients
		for (const page of this._pages) {
			try {
				page.client.close();
			} catch {}
		}
		this._pages = [];

		// 2. Request graceful browser shutdown via CDP
		try {
			const closePromise = this.browserClient.send("Browser.close");
			const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 500));
			await Promise.race([closePromise, timeoutPromise]);
		} catch {}

		// 3. Close browser CDP client connection
		try {
			this.browserClient.close();
		} catch {}

		// 4. Ensure process and any child helpers are terminated
		await this.killProcess();

		// 5. Clean up temporary user profile directory
		if (this.launched.isTempProfile && this.launched.userDataDir) {
			try {
				await new Promise((r) => setTimeout(r, 100));
				if (existsSync(this.launched.userDataDir)) {
					rmSync(this.launched.userDataDir, { recursive: true, force: true });
				}
			} catch {}
		}
	}

	private async killProcess(): Promise<void> {
		const pid = this.launched.process?.pid;

		try {
			this.launched.process.kill();
		} catch {}

		// Allow up to 400ms for clean exit
		try {
			const exited = this.launched.process.exited;
			const timeout = new Promise((r) => setTimeout(r, 400));
			await Promise.race([exited, timeout]);
		} catch {}

		// Fallback force kill on POSIX
		if (pid) {
			try {
				process.kill(pid, "SIGKILL");
			} catch {}
		}
	}

	forceKillSync(): void {
		if (this._isClosed) return;
		this._isClosed = true;

		try {
			for (const page of this._pages) {
				try {
					page.client.close();
				} catch {}
			}
			this._pages = [];
			this.browserClient.close();
		} catch {}

		const pid = this.launched.process?.pid;
		if (pid) {
			try {
				process.kill(pid, "SIGKILL");
			} catch {}
		}

		if (this.launched.isTempProfile && this.launched.userDataDir) {
			try {
				if (existsSync(this.launched.userDataDir)) {
					rmSync(this.launched.userDataDir, { recursive: true, force: true });
				}
			} catch {}
		}
	}

	async [Symbol.asyncDispose](): Promise<void> {
		await this.close();
	}

	static async cleanupOrphans(): Promise<number> {
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
}
