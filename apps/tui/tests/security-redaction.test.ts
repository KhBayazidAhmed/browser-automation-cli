import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { redactSensitive, sensitiveValues } from "../src/data/redaction.js";
import {
	captureSecureScreenshot,
	maskSensitiveContent,
	unmaskSensitiveContent,
} from "../src/flow/screenshot-security.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

describe("Security & Redaction Hardening (PR 4)", () => {
	let ctx: TestContext;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	afterAll(async () => {
		await teardownTestContext();
	});

	test("1. sensitiveValues ignores short tokens under 4 chars to prevent false positive redactions", () => {
		const row = {
			id: "1",
			userToken: "SECRET-TOKEN-999",
			apiKey: "a", // under 4 chars
			password: "supersecretpass",
			code: "99", // under 4 chars
		};

		const secrets = sensitiveValues(row);
		expect(secrets).toContain("SECRET-TOKEN-999");
		expect(secrets).toContain("supersecretpass");
		expect(secrets).not.toContain("1");
		expect(secrets).not.toContain("a");
		expect(secrets).not.toContain("99");

		const text = "Item id 1 with code 99 and password supersecretpass";
		const redacted = redactSensitive(text, secrets);
		expect(redacted).toBe("Item id 1 with code 99 and password [REDACTED]");
	});

	test("2. multi-frame screenshot masking masks inputs inside iframes without error", async () => {
		const page = await ctx.browser.newPage();
		await page.goto(ctx.server.url("/iframes-main"));

		const secrets = ["supersecretpass123"];
		await maskSensitiveContent(page, secrets);

		const shot = await captureSecureScreenshot(page, secrets, { fullPage: false });
		expect(shot).toBeDefined();
		expect(shot.length).toBeGreaterThan(0);

		await unmaskSensitiveContent(page);
		await page.close();
	});
});
