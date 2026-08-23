import { existsSync, rmSync } from "node:fs";
import {
	cleanupOrphanChromeProcesses,
	registerActiveBrowser,
	unregisterActiveBrowser,
} from "./browser-lifecycle.js";
import { CDPClient } from "./client.js";
import { type LaunchedChrome, type LaunchOptions, launchChrome } from "./launcher.js";
import { Page } from "./page.js";

export class Browser {
	private _pages: Page[] = [];
	private _isClosed = false;

	constructor(
		public readonly launched: LaunchedChrome,
		public readonly browserClient: CDPClient,
	) {
		registerActiveBrowser(this);
	}

	static async launch(options: LaunchOptions = {}): Promise<Browser> {
		const launched = await launchChrome(options);
		const browserClient = new CDPClient(launched.webSocketDebuggerUrl);
		try {
			await browserClient.connect();
			return new Browser(launched, browserClient);
		} catch (error) {
			try {
				browserClient.close();
				launched.process.kill();
				await Promise.race([
					launched.process.exited,
					new Promise((resolve) => setTimeout(resolve, 1000)),
				]);
				if (launched.isTempProfile && existsSync(launched.userDataDir)) {
					rmSync(launched.userDataDir, { recursive: true, force: true });
				}
			} catch {}
			throw error;
		}
	}

	async newPage(url = "about:blank"): Promise<Page> {
		if (this._isClosed) {
			throw new Error("Cannot create page on a closed Browser instance.");
		}

		const res = await fetch(
			`http://127.0.0.1:${this.launched.port}/json/new?${encodeURIComponent(url)}`,
			{ method: "PUT" },
		);
		const target = (await res.json()) as {
			id: string;
			webSocketDebuggerUrl?: string;
		};

		if (!target.webSocketDebuggerUrl) {
			throw new Error(`Failed to create new page target on port ${this.launched.port}`);
		}

		const pageClient = new CDPClient(target.webSocketDebuggerUrl);
		let page: Page;
		try {
			await pageClient.connect();
			page = new Page(pageClient, target.id);
			await page.init();
		} catch (error) {
			pageClient.close();
			await this.browserClient
				.send("Target.closeTarget", { targetId: target.id })
				.catch(() => undefined);
			throw error;
		}

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

		const pageTargets = targets.filter((t) => t.type === "page" && t.webSocketDebuggerUrl);
		const liveIds = new Set(pageTargets.map((target) => target.id));
		for (const stalePage of this._pages.filter((page) => !liveIds.has(page.targetId))) {
			stalePage.client.close();
		}
		this._pages = this._pages.filter((page) => liveIds.has(page.targetId));
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
		unregisterActiveBrowser(this);

		for (const page of this._pages) {
			try {
				page.client.close();
			} catch {}
		}
		this._pages = [];

		try {
			const closePromise = this.browserClient.send("Browser.close");
			const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 500));
			await Promise.race([closePromise, timeoutPromise]);
		} catch {}

		try {
			this.browserClient.close();
		} catch {}

		await this.killProcess();

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

		try {
			const exited = this.launched.process.exited;
			const timeout = new Promise((r) => setTimeout(r, 400));
			await Promise.race([exited, timeout]);
		} catch {}

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
		return cleanupOrphanChromeProcesses();
	}
}
