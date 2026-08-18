import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Browser } from "../src/cdp/browser.js";
import type { Page } from "../src/cdp/page.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

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

	test("1. navigates to HTTP server URL, inspects title and current URL", async () => {
		await page.goto(ctx.server.url("/"));
		expect(await page.title()).toBe("CDP Test Server");
		expect(await page.url()).toContain("127.0.0.1");
		expect(await page.getText("#title")).toBe("Automation Control Center");
	});

	test("2. evaluates expressions and DOM queries in page context", async () => {
		const docTitle = await page.evaluate(() => document.title);
		expect(docTitle).toBe("CDP Test Server");

		const computed = await page.evaluate((a, b) => a + b, 10, 20);
		expect(computed).toBe(30);
	});

	test("3. captures viewport and full-page screenshot binary buffer", async () => {
		const viewportBuffer = await page.screenshot();
		expect(viewportBuffer).toBeInstanceOf(Uint8Array);
		expect(viewportBuffer.length).toBeGreaterThan(100);

		const fullPageBuffer = await page.screenshot({ fullPage: true });
		expect(fullPageBuffer).toBeInstanceOf(Uint8Array);
		expect(fullPageBuffer.length).toBeGreaterThan(100);
	});

	test("4. generates PDF document binary buffer", async () => {
		const pdfBuffer = await page.pdf();
		expect(pdfBuffer).toBeInstanceOf(Uint8Array);
		expect(pdfBuffer.length).toBeGreaterThan(100);
	});

	test("5. reads browser memory and performance metrics", async () => {
		const metrics = await page.getMetrics();
		expect(metrics).toBeDefined();
		expect(typeof metrics).toBe("object");
	});

	test("6. blocks specified network resources via CDP Network domain", async () => {
		await page.blockResources(["image", "font", "stylesheet"]);
		await page.goto(ctx.server.url("/"));
		expect(await page.getText("#title")).toBe("Automation Control Center");
	});

	test("7. extracts multiple matching elements text array with getMultipleText", async () => {
		await page.goto(ctx.server.url("/inventory"));
		const skus = await page.getMultipleText("td.sku");
		expect(Array.isArray(skus)).toBe(true);
		expect(skus.length).toBeGreaterThan(0);
		expect(skus).toContain("SKU-A1");
	});

	test("8. Browser.cleanupOrphans executes process check", async () => {
		const killedCount = await Browser.cleanupOrphans();
		expect(typeof killedCount).toBe("number");
		expect(killedCount).toBeGreaterThanOrEqual(0);
	});
});
