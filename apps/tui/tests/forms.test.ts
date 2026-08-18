import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Page } from "../src/cdp/page.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

describe("Forms, Inputs & DOM Actions", () => {
	let ctx: TestContext;
	let page: Page;

	beforeAll(async () => {
		ctx = await setupTestContext();
		page = ctx.page;
	});

	afterAll(async () => {
		await teardownTestContext();
	});

	test("targets inputs by placeholder and aria-label with clearFirst", async () => {
		await page.goto(ctx.server.url("/forms"));

		// 1. Type into input targeted strictly by placeholder with clearFirst
		await page.type(undefined, "sarah@company.com", {
			targetText: "Work Email",
			strictText: true,
			clearFirst: true,
		});

		// 2. Type into input targeted strictly by aria-label
		await page.type(undefined, "SECRET-KEY-999", {
			targetText: "Secret Authentication Code",
			strictText: true,
		});

		// 3. Submit form by clicking submit button with strict text
		await page.click("button:text-is('Save Profile Settings')");

		// 4. Assert saved status
		const status = await page.assertText("#status", {
			strictText: "SAVED:sarah@company.com:SECRET-KEY-999",
		});
		expect(status).toBe("SAVED:sarah@company.com:SECRET-KEY-999");
	});

	test("clears input field using page.clear", async () => {
		await page.goto(ctx.server.url("/forms"));
		await page.clear("#user-email");
		const val = await page.evaluate(
			() => (document.getElementById("user-email") as HTMLInputElement)?.value,
		);
		expect(val).toBe("");
	});

	test("waits for dynamically mutated DOM text", async () => {
		await page.goto(ctx.server.url("/async"));
		const found = await page.waitForText("Async Operation Finished", {
			timeout: 3000,
		});
		expect(found).toBe(true);
		expect(await page.getText("#async-banner")).toBe("Async Operation Finished");
	});
});
