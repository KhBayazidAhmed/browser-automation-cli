import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Page } from "../src/cdp/page.js";
import {
	setupTestContext,
	type TestContext,
	teardownTestContext,
} from "./fixtures/browser.js";

describe("CDP Core Protocol & Browser APIs", () => {
	let ctx: TestContext;
	let page: Page;

	beforeAll(async () => {
		ctx = await setupTestContext();
		page = ctx.page;
	});

	afterAll(async () => {
		await teardownTestContext();
	});

	test("navigates to HTTP server URL, inspects title and current URL", async () => {
		await page.goto(ctx.server.url("/"));
		expect(await page.title()).toBe("CDP Test Server");
		expect(await page.url()).toContain("127.0.0.1");
		expect(await page.getText("#title")).toBe("Automation Control Center");
	});

	test("evaluates expressions and DOM queries in page context", async () => {
		const docTitle = await page.evaluate(() => document.title);
		expect(docTitle).toBe("CDP Test Server");

		const computed = await page.evaluate((a, b) => a + b, 10, 20);
		expect(computed).toBe(30);
	});

	test("captures screenshot binary buffer", async () => {
		const buffer = await page.screenshot();
		expect(buffer).toBeInstanceOf(Uint8Array);
		expect(buffer.length).toBeGreaterThan(100);
	});

	test("reads browser memory and performance metrics", async () => {
		const metrics = await page.getMetrics();
		expect(metrics).toBeDefined();
		expect(typeof metrics).toBe("object");
	});

	test("blocks specified network resources via CDP Network domain", async () => {
		await page.blockResources(["image", "font", "stylesheet"]);
		await page.goto(ctx.server.url("/"));
		expect(await page.getText("#title")).toBe("Automation Control Center");
	});
});
