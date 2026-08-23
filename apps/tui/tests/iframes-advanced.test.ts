import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

describe("Advanced CDP Frame Engine & Lifecycle", () => {
	let ctx: TestContext;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	afterAll(async () => {
		await teardownTestContext(ctx);
	});

	it("1. handles deeply nested iframe hierarchies seamlessly", async () => {
		await ctx.page.goto(ctx.server.url("/iframes-nested-parent"));
		await new Promise((r) => setTimeout(r, 200));

		const childFrame = await ctx.page.waitForFrame({ url: /iframe-nested-child/ });
		expect(childFrame).toBeDefined();
		expect(await childFrame.getText("#nested-heading")).toBe("Deeply Nested Content");

		// Click inside deeply nested frame via auto-discovery
		await ctx.page.click("#btn-deep");
		const deepStatus = await ctx.page.getText("#deep-result");
		expect(deepStatus).toBe("DEEP_TRIGGERED");
	});

	it("2. dynamically tracks iframe insertion and removal at runtime", async () => {
		await ctx.page.goto(ctx.server.url("/iframes-dynamic"));
		await new Promise((r) => setTimeout(r, 200));

		// Trigger dynamic iframe creation in page
		await ctx.page.click("#btn-add-iframe");

		// Wait for dynamically attached frame
		const dynFrame = await ctx.page.waitForFrame("dynFrame", 5000);
		expect(dynFrame).toBeDefined();
		expect(dynFrame.name).toBe("dynFrame");

		// Interact with dynamic frame
		await dynFrame.type("#frame-user", "dynamic_user");
		await dynFrame.click("#btn-login-submit");
		expect(await dynFrame.getText("#frame-login-status")).toBe("LOGGED_IN:dynamic_user");

		// Remove frame and verify detachment
		await ctx.page.click("#btn-remove-iframe");
		await new Promise((r) => setTimeout(r, 150));
		expect(ctx.page.frame("dynFrame")).toBeUndefined();
	});

	it("3. handles evaluateInContext and waitForSelectorInContext directly", async () => {
		await ctx.page.goto(ctx.server.url("/iframes-main"));
		await new Promise((r) => setTimeout(r, 200));

		const checkoutFrame = ctx.page.frame("checkoutFrame")!;
		expect(checkoutFrame).toBeDefined();

		const heading = await ctx.page.evaluateInContext<string>(
			checkoutFrame.contextId,
			() => document.querySelector("#checkout-title")?.textContent || "",
		);
		expect(heading).toBe("Credit Card Checkout");

		const exists = await ctx.page.waitForSelectorInContext(checkoutFrame.contextId, "#card-number");
		expect(exists).toBe(true);
	});

	it("4. clicks modern SPA pointerdown, mousedown, role=button and shadow DOM buttons inside frame", async () => {
		await ctx.page.goto(ctx.server.url("/iframes-main"));
		await new Promise((r) => setTimeout(r, 200));

		const spaFrame = await ctx.page.waitForFrame("spaFrame");
		expect(spaFrame).toBeDefined();

		// Click pointerdown-only button
		await spaFrame.click("#btn-pointer");
		expect(await spaFrame.getText("#spa-out")).toBe("POINTER_TRIGGERED");

		// Click mousedown-only button with text/nested icon
		await spaFrame.clickByText("Compose Email");
		expect(await spaFrame.getText("#spa-out")).toBe("MOUSEDOWN_TRIGGERED");

		// Click role="button"
		await spaFrame.click("#div-btn");
		expect(await spaFrame.getText("#spa-out")).toBe("ROLE_BTN_TRIGGERED");

		// Click button inside Shadow DOM
		await spaFrame.click("#shadow-btn");
		expect(await spaFrame.getText("#spa-out")).toBe("SHADOW_TRIGGERED");
	});
});
