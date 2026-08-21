import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Page } from "../src/cdp/page.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

describe("CDP Core Connection, Page & Interactions Suite", () => {
	let ctx: TestContext;
	let page: Page;

	beforeAll(async () => {
		ctx = await setupTestContext();
		page = ctx.page;
	});

	afterAll(async () => {
		await teardownTestContext();
	});

	test("1. navigates to URL and verifies title and heading text", async () => {
		await page.goto(ctx.server.url("/"));
		expect(await page.title()).toBe("CDP Test Server");
		expect(await page.url()).toContain("127.0.0.1");
		expect(await page.getText("#title")).toBe("Automation Control Center");
	});

	test("2. evaluates expressions and DOM queries in page context", async () => {
		const docTitle = await page.evaluate(() => document.title);
		expect(docTitle).toBe("CDP Test Server");

		const computed = await page.evaluate((a: number, b: number) => a + b, 10, 20);
		expect(computed).toBe(30);
	});

	test("3. captures viewport and full-page screenshot binary buffer", async () => {
		const viewportBuffer = await page.screenshot();
		expect(viewportBuffer).toBeInstanceOf(Uint8Array);
		expect(viewportBuffer.length).toBeGreaterThan(100);

		const fullPageBuffer = await page.screenshot({ fullPage: true });
		expect(fullPageBuffer).toBeInstanceOf(Uint8Array);
		expect(fullPageBuffer.length).toBeGreaterThanOrEqual(viewportBuffer.length);
	});

	test("4. generates clean PDF document buffer", async () => {
		const pdfBuffer = await page.pdf();
		expect(pdfBuffer).toBeInstanceOf(Uint8Array);
		expect(pdfBuffer.length).toBeGreaterThan(100);
	});

	test("5. extracts performance layout and memory metrics", async () => {
		const metrics = await page.getMetrics();
		expect(metrics).toHaveProperty("Timestamp");
		expect(metrics).toHaveProperty("Documents");
		expect(metrics).toHaveProperty("Nodes");
		expect(metrics.Nodes).toBeGreaterThan(0);
	});
});
