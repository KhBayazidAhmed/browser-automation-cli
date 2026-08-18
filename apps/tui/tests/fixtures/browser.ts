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

	const page = await sharedBrowser.newPage();

	return {
		browser: sharedBrowser,
		page,
		server: sharedServer,
	};
}

export async function teardownTestContext(): Promise<void> {
	if (sharedBrowser) {
		await sharedBrowser.close();
		sharedBrowser = null;
	}
	if (sharedServer) {
		sharedServer.close();
		sharedServer = null;
	}
}
