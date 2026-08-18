import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Page } from "../src/cdp/page.js";
import { FlowRunner } from "../src/flow/runner.js";
import type { FlowDefinition } from "../src/flow/types.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

describe("Text Case Sensitivity, Regex & Normalization Engine", () => {
	let ctx: TestContext;
	let page: Page;

	beforeAll(async () => {
		ctx = await setupTestContext();
		page = ctx.page;
	});

	afterAll(async () => {
		await teardownTestContext();
	});

	test("1. targets and clicks element using case-insensitive exact text", async () => {
		await page.goto(ctx.server.url("/text-cases"));

		// Target "Submit Application" using lowercase text with ignoreCase
		await page.click("button", {
			text: "submit application",
			strictText: true,
			ignoreCase: true,
		});

		const out = await page.getText("#output");
		expect(out).toBe("SUBMIT_CLICKED");
	});

	test("2. targets element using selector syntax text/i and :text-is with case flag", async () => {
		await page.goto(ctx.server.url("/text-cases"));

		// Reset output
		await page.evaluate(() => {
			document.getElementById("output")!.innerText = "none";
		});

		// text/i="cancel now" -> case-insensitive strict text
		await page.click('text/i="cancel now"');
		expect(await page.getText("#output")).toBe("CANCEL_CLICKED");

		// Reset
		await page.evaluate(() => {
			document.getElementById("output")!.innerText = "none";
		});

		// :text-is("submit application", i)
		await page.click(':text-is("submit application", "i")');
		expect(await page.getText("#output")).toBe("SUBMIT_CLICKED");
	});

	test("3. matches regex pattern in selector and options", async () => {
		await page.goto(ctx.server.url("/text-cases"));

		// Assert invoice ID using regex option
		const invoice = await page.assertText("#invoice-id", {
			matches: /#INV-\d{4}-\d{4}-[A-Z]{2}/,
		});
		expect(invoice).toBe("Invoice #INV-2026-8842-OK");

		// Assert version tag using regex with case insensitivity
		const version = await page.assertText("#version-tag", {
			matches: "^build v2.*\\(rev \\d+\\)$",
			ignoreCase: true,
		});
		expect(version).toBe("Build v2.10.4-beta (rev 9811)");
	});

	test("4. normalizes multiline text and irregular whitespace", async () => {
		await page.goto(ctx.server.url("/text-cases"));

		// Target multi-line text by normalized single-line string
		const text = await page.getText("#multiline-message", {
			normalizeWhitespace: true,
		});
		expect(text).toBe("Welcome Back, Enterprise User!");

		// Assert text with prefix and suffix
		await page.assertText("#multiline-message", {
			startsWith: "welcome back",
			endsWith: "enterprise user!",
			ignoreCase: true,
			normalizeWhitespace: true,
		});
	});

	test("5. fills input using case-insensitive placeholder or aria-label", async () => {
		await page.goto(ctx.server.url("/text-cases"));

		// Type into input whose placeholder is "ENTER PROMO CODE" using lowercase targetText
		await page.type(undefined, "DISCOUNT50", {
			targetText: "enter promo code",
			ignoreCase: true,
			clearFirst: true,
		});

		// Click apply button
		await page.click("button", {
			text: "apply discount",
			ignoreCase: true,
		});

		const out = await page.getText("#output");
		expect(out).toBe("FORM:DISCOUNT50");
	});

	test("6. executes declarative flow with ignoreCase and regex assertion steps", async () => {
		const flow: FlowDefinition = {
			name: "Case Insensitive & Regex E2E Flow",
			steps: [
				{
					action: "goto",
					url: ctx.server.url("/text-cases"),
				},
				{
					action: "type",
					text: "FLOWCODE",
					targetText: "customer discount voucher",
					ignoreCase: true,
					clearFirst: true,
				},
				{
					action: "click",
					text: "apply discount",
					ignoreCase: true,
				},
				{
					action: "assert",
					selector: "#output",
					equals: "form:flowcode",
					ignoreCase: true,
				},
				{
					action: "assert",
					selector: "#invoice-id",
					matches: "^Invoice #INV-\\d+",
				},
				{
					action: "extract",
					selector: "#multiline-message",
					as: "welcomeMsg",
					normalizeWhitespace: true,
				},
			],
		};

		const result = await FlowRunner.run(flow, {
			headless: true,
			outputDir: "/tmp/flow-test-output",
		});

		expect(result.success).toBe(true);
		expect(result.data.welcomeMsg).toBe("Welcome Back, Enterprise User!");
	});
});
