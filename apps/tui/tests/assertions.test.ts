import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Page } from "../src/cdp/page.js";
import {
	setupTestContext,
	type TestContext,
	teardownTestContext,
} from "./fixtures/browser.js";

describe("Strict Text Assertions & Boundary Validation", () => {
	let ctx: TestContext;
	let page: Page;

	beforeAll(async () => {
		ctx = await setupTestContext();
		page = ctx.page;
	});

	afterAll(async () => {
		await teardownTestContext();
	});

	test("passes strict equality for exact trimmed text", async () => {
		await page.goto(ctx.server.url("/boundaries"));

		const chipText = await page.assertText("#chip-status", {
			strictText: "Payment Complete (Order #883)",
		});
		expect(chipText).toBe("Payment Complete (Order #883)");

		const price = await page.assertText("#price-tag", {
			strictText: "$499.00",
		});
		expect(price).toBe("$499.00");
	});

	test("rejects partial substring matches in strict mode", async () => {
		await page.goto(ctx.server.url("/boundaries"));

		// "Payment Complete" is a partial substring of "Payment Complete (Order #883)"
		let threw = false;
		try {
			await page.assertText("#chip-status", {
				strictText: "Payment Complete",
				timeout: 250,
			});
		} catch {
			threw = true;
		}
		expect(threw).toBe(true);
	});

	test("times out when asserting non-existent element", async () => {
		let threw = false;
		try {
			await page.assertText("#missing-element-id", {
				strictText: "Does Not Exist",
				timeout: 250,
			});
		} catch {
			threw = true;
		}
		expect(threw).toBe(true);
	});
});
