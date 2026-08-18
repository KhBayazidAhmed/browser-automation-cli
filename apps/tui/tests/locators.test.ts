import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Page } from "../src/cdp/page.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

describe("Strict Text Locators & Element Disambiguation", () => {
	let ctx: TestContext;
	let page: Page;

	beforeAll(async () => {
		ctx = await setupTestContext();
		page = ctx.page;
	});

	afterAll(async () => {
		await teardownTestContext();
	});

	test("disambiguates strict text from substring siblings during click", async () => {
		await page.goto(ctx.server.url("/disambiguation"));

		// 1. Click exact "Save" -> must not click "Save All" or "Save Changes"
		await page.click(undefined, { text: "Save", strictText: true });
		expect(await page.getText("#output")).toBe("btn_exact");

		// 2. Click exact "Save All" using standard Playwright syntax text="Save All"
		await page.click('text="Save All"');
		expect(await page.getText("#output")).toBe("btn_all");

		// 3. Click exact "Save Changes" using pseudo-selector :text-is("Save Changes")
		await page.click('button:text-is("Save Changes")');
		expect(await page.getText("#output")).toBe("btn_changes");

		// 4. Click link using clickByText helper
		await page.clickByText("Documentation", { strictText: true });
		expect(await page.getText("#output")).toBe("link_clicked");
	});

	test("extracts text and attributes using strict text element targeting", async () => {
		await page.goto(ctx.server.url("/disambiguation"));

		const text = await page.getText(undefined, {
			text: "Documentation",
			strictText: true,
		});
		expect(text).toBe("Documentation");

		const href = await page.getAttribute(undefined, "href", {
			text: "Documentation",
			strictText: true,
		});
		expect(href).toBe("/docs");
	});
});
