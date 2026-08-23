import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { FlowRunner } from "../src/flow/runner.js";
import type { FlowDefinition } from "../src/flow/types.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

describe("Unified CDP Frame Engine & Iframe Automation", () => {
	let ctx: TestContext;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	afterAll(async () => {
		await teardownTestContext(ctx);
	});

	it("1. discovers all page frames, hierarchy, and parent-child links", async () => {
		await ctx.page.goto(ctx.server.url("/iframes-main"));
		await new Promise((r) => setTimeout(r, 200));

		const frames = ctx.page.frames();
		expect(frames.length).toBeGreaterThanOrEqual(3);

		const mainFrame = ctx.page.mainFrame();
		expect(mainFrame.isMainFrame()).toBe(true);
		expect(mainFrame.url).toContain("/iframes-main");

		const childFrames = mainFrame.childFrames();
		expect(childFrames.length).toBeGreaterThanOrEqual(2);

		const loginFrame = await ctx.page.waitForFrame("loginFrame");
		expect(loginFrame.parentFrame()?.id).toBe(mainFrame.id);
	});

	it("2. resolves frames by name, url pattern, and DOM iframe selector", async () => {
		await ctx.page.goto(ctx.server.url("/iframes-main"));
		await new Promise((r) => setTimeout(r, 200));

		const byName = await ctx.page.waitForFrame("loginFrame");
		expect(byName).toBeDefined();
		expect(byName?.url).toContain("/iframe-login");

		const byUrl = await ctx.page.waitForFrame({ url: /iframe-checkout/ });
		expect(byUrl).toBeDefined();
		expect(byUrl?.name).toBe("checkoutFrame");

		const bySelector = await ctx.page.frameManager.resolveFrame("#frame-login");
		expect(bySelector).toBeDefined();
		expect(bySelector.url).toContain("/iframe-login");
	});

	it("3. performs evaluation, title, content, type, and clear on Frame handle", async () => {
		await ctx.page.goto(ctx.server.url("/iframes-main"));
		await new Promise((r) => setTimeout(r, 200));

		const loginFrame = await ctx.page.waitForFrame("loginFrame");
		expect(loginFrame).toBeDefined();
		expect(await loginFrame.title()).toBe("Login Frame");
		expect(await loginFrame.content()).toContain("Secure Portal Login");

		await loginFrame.type("#frame-user", "agent_smith");
		await loginFrame.clickByText("Sign In");

		const status = await loginFrame.getText("#frame-login-status");
		expect(status).toBe("LOGGED_IN:agent_smith");

		await loginFrame.clear("#frame-user");
		const val = await loginFrame.evaluate<string>(
			() => (document.getElementById("frame-user") as HTMLInputElement).value,
		);
		expect(val).toBe("");
	});

	it("4. supports wait, multi-text, attribute extraction, and text assertion on Frame", async () => {
		await ctx.page.goto(ctx.server.url("/iframes-list-host"));
		await new Promise((r) => setTimeout(r, 200));

		const listFrame = await ctx.page.waitForFrame("listFrame");
		expect(listFrame).toBeDefined();

		await listFrame.waitForSelector(".frame-list");
		await listFrame.waitForText("Item Beta");

		const items = await listFrame.getMultipleText(".f-item");
		expect(items).toEqual(["Item Alpha", "Item Beta", "Item Gamma"]);

		const attr = await listFrame.getAttribute(".f-item", "data-code");
		expect(attr).toBe("C-101");

		const asserted = await listFrame.assertText(".f-item", { contains: "Alpha" });
		expect(asserted).toBe("Item Alpha");
	});

	it("5. automatically discovers and interacts with elements inside child iframes from Page API", async () => {
		await ctx.page.goto(ctx.server.url("/iframes-main"));
		await new Promise((r) => setTimeout(r, 200));

		await ctx.page.type("#card-number", "4242-5555-6666-7777");
		await ctx.page.click("#btn-pay-now");

		const payStatus = await ctx.page.getText("#pay-status");
		expect(payStatus).toBe("PAID:4242-5555-6666-7777");

		const asserted = await ctx.page.assertText("#pay-status", {
			contains: "4242-5555",
		});
		expect(asserted).toBe("PAID:4242-5555-6666-7777");
	});

	it("6. executes targeted page operations when explicit frame option is provided", async () => {
		await ctx.page.goto(ctx.server.url("/iframes-main"));
		await new Promise((r) => setTimeout(r, 200));

		await ctx.page.clear("#frame-user", { frame: "#frame-login" });
		await ctx.page.type("#frame-user", "neo_matrix", { frame: "loginFrame" });
		await ctx.page.click("#btn-login-submit", { frame: "loginFrame" });

		const updatedStatus = await ctx.page.getText("#frame-login-status", {
			frame: "#frame-login",
		});
		expect(updatedStatus).toBe("LOGGED_IN:neo_matrix");
	});

	it("7. executes declarative JSON Flow across multiple iframes seamlessly", async () => {
		const flow: FlowDefinition = {
			name: "Multi-Iframe Automation Flow",
			steps: [
				{ name: "Load Portal", action: "goto", url: ctx.server.url("/iframes-main") },
				{
					name: "Fill User",
					action: "type",
					frame: "loginFrame",
					selector: "#frame-user",
					text: "flow_user_99",
					clearFirst: true,
				},
				{
					name: "Submit Login",
					action: "click",
					frame: "loginFrame",
					selector: "#btn-login-submit",
				},
				{
					name: "Extract Status",
					action: "extract",
					frame: "loginFrame",
					selector: "#frame-login-status",
					as: "loginResult",
				},
				{
					name: "Type Card",
					action: "type",
					frame: "#frame-checkout",
					selector: "#card-number",
					text: "9999-8888-7777-6666",
					clearFirst: true,
				},
				{
					name: "Submit Payment",
					action: "click",
					frame: "#frame-checkout",
					selector: "#btn-pay-now",
				},
				{
					name: "Assert Status",
					action: "assert",
					frame: "#frame-checkout",
					selector: "#pay-status",
					equals: "PAID:9999-8888-7777-6666",
				},
				{
					name: "Extract Pay",
					action: "extract",
					frame: "#frame-checkout",
					selector: "#pay-status",
					as: "checkoutResult",
				},
			],
		};

		const result = await FlowRunner.run(flow, {}, { headless: true });
		expect(result.success).toBe(true);
		expect(result.data.loginResult).toBe("LOGGED_IN:flow_user_99");
		expect(result.data.checkoutResult).toBe("PAID:9999-8888-7777-6666");
	});
});
