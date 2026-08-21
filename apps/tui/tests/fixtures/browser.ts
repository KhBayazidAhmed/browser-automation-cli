import { Browser } from "../../src/cdp/browser.js";
import type { Page } from "../../src/cdp/page.js";
import { startTestServer, type TestServer } from "./server.js";

export interface TestContext {
	browser: Browser;
	page: Page;
	server: TestServer;
}

let sharedBrowser: Browser | null = null;
let sharedServer: TestServer | null = null;
let activeContexts = 0;

export async function setupTestContext(): Promise<TestContext> {
	if (!sharedServer) {
		sharedServer = startTestServer();
	}

	if (!sharedBrowser) {
		const isHeaded = process.env.HEADED === "1" || process.env.HEADED === "true";
		sharedBrowser = await Browser.launch({
			headless: !isHeaded,
		});
	}

	activeContexts++;
	const page = await sharedBrowser.newPage();

	return {
		browser: sharedBrowser,
		page,
		server: sharedServer,
	};
}

export async function teardownTestContext(ctx?: TestContext): Promise<void> {
	activeContexts = Math.max(0, activeContexts - 1);
	if (ctx?.page) {
		try {
			await ctx.page.close();
		} catch {}
	}
	if (activeContexts === 0 && sharedBrowser) {
		try {
			await sharedBrowser.close();
		} catch {}
		sharedBrowser = null;
		if (sharedServer) {
			sharedServer.close();
			sharedServer = null;
		}
	}
}
