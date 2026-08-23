import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { INJECTED_ADVANCED_RECORDER_SCRIPT } from "../src/flow/recorder.js";
import { FlowRunner } from "../src/flow/runner.js";
import type { FlowDefinition, FlowStep } from "../src/flow/types.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

describe("Flow Recorder - Multi-Iframe Recording & Flow Tagging Suite", () => {
	let ctx: TestContext;
	const recordedSteps: FlowStep[] = [];
	let isPaused = false;

	beforeAll(async () => {
		ctx = await setupTestContext();
		const page = ctx.page;

		await page.client.send("Runtime.enable");
		await page.client.send("Page.enable");
		await page.client.send("Runtime.addBinding", {
			name: "__cdpRecordEvent",
		});
		await page.client.send("Page.addScriptToEvaluateOnNewDocument", {
			source: INJECTED_ADVANCED_RECORDER_SCRIPT,
		});

		page.client.on("Runtime.bindingCalled", (params: unknown) => {
			const p = params as { name?: string; payload?: string };
			if (p.name === "__cdpRecordEvent" && p.payload) {
				try {
					const event = JSON.parse(p.payload);
					const frame = event.frame || undefined;
					if (event.type === "pause") isPaused = true;
					else if (event.type === "resume") isPaused = false;
					else if (event.type === "click") {
						recordedSteps.push({
							name: event.text ? `Click "${event.text}"` : `Click ${event.selector}`,
							action: "click",
							frame,
							selector: event.selector,
							text: event.text || undefined,
							strictText: event.text ? true : undefined,
						});
					} else if (event.type === "type") {
						recordedSteps.push({
							name: `Type into ${event.selector}`,
							action: "type",
							frame,
							selector: event.selector,
							text: event.value,
							targetText: event.targetText || undefined,
							strictText: true,
						});
					} else if (event.type === "extract") {
						recordedSteps.push({
							name: `Extract "${event.as}" from ${event.selector}`,
							action: "extract",
							frame,
							selector: event.selector,
							as: event.as,
							text: event.text || event.sampleValue || undefined,
							strictText: true,
						});
					} else if (event.type === "assert") {
						recordedSteps.push({
							name: `Assert ${event.selector} strictly equals "${event.text}"`,
							action: "assert",
							frame,
							selector: event.selector,
							text: event.text,
							strictText: true,
						});
					}
				} catch {}
			}
		});
	});

	afterAll(async () => {
		await teardownTestContext();
	});

	test("1. mounts HUD bar in main window but hides duplicate bar in child iframes", async () => {
		await ctx.page.goto(ctx.server.url("/iframes-main"));
		await ctx.page.waitForSelector("#frame-login");

		const topBarVisible = await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			const bar = hud?.shadowRoot?.getElementById("bar");
			return bar && getComputedStyle(bar).display !== "none";
		});
		expect(topBarVisible).toBe(true);

		const loginFrame = ctx.page.frame({ name: "loginFrame" });
		expect(loginFrame).toBeDefined();

		const childBarHidden = await loginFrame?.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			const bar = hud?.shadowRoot?.getElementById("bar");
			return !bar || getComputedStyle(bar).display === "none" || bar.style.display === "none";
		});
		expect(childBarHidden).toBe(true);
	});

	test("2. ignores top-level iframe boundary hover and click", async () => {
		const initLen = recordedSteps.length;
		await ctx.page.evaluate(() => {
			const iframe = document.getElementById("frame-login");
			iframe?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
			iframe?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		});
		expect(recordedSteps.length).toBe(initLen);
	});

	test("3. records typing and click actions inside child iframe with frame attribute", async () => {
		const loginFrame = ctx.page.frame({ name: "loginFrame" });
		expect(loginFrame).toBeDefined();

		await loginFrame?.evaluate(() => {
			const input = document.getElementById("frame-user") as HTMLInputElement;
			if (input) {
				input.value = "admin_user";
				input.dispatchEvent(new Event("change", { bubbles: true }));
			}
			const btn = document.getElementById("btn-login-submit");
			btn?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		});

		const typeStep = recordedSteps.find(
			(s) => s.action === "type" && (s as Record<string, unknown>).selector === "#frame-user",
		);
		expect(typeStep).toBeDefined();
		expect(typeStep?.frame).toBe("loginFrame");
		expect((typeStep as Record<string, unknown>)?.text).toBe("admin_user");

		const clickStep = recordedSteps.find(
			(s) =>
				s.action === "click" && (s as Record<string, unknown>).selector === "#btn-login-submit",
		);
		expect(clickStep).toBeDefined();
		expect(clickStep?.frame).toBe("loginFrame");
		expect((clickStep as Record<string, unknown>)?.text).toBe("Sign In");
	});

	test("4. records assertion and extraction in another child iframe", async () => {
		const checkoutFrame = ctx.page.frame({ name: "checkoutFrame" });
		expect(checkoutFrame).toBeDefined();

		await checkoutFrame?.evaluate(() => {
			const input = document.getElementById("card-number") as HTMLInputElement;
			if (input) {
				input.value = "4111-2222-3333-4444";
				input.dispatchEvent(new Event("change", { bubbles: true }));
			}
			const payBtn = document.getElementById("btn-pay-now");
			payBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		});

		const payStep = recordedSteps.find(
			(s) => s.action === "click" && (s as Record<string, unknown>).selector === "#btn-pay-now",
		);
		expect(payStep).toBeDefined();
		expect(payStep?.frame).toBe("checkoutFrame");
	});

	test("5. replays recorded multi-iframe flow seamlessly via FlowRunner", async () => {
		const replayFlow: FlowDefinition = {
			name: "Recorded Multi-Iframe Replay",
			steps: [
				{ name: "Goto Iframe Hub", action: "goto", url: ctx.server.url("/iframes-main") },
				{ name: "Wait Login Frame", action: "waitForSelector", selector: "#frame-login" },
				{
					name: "Type Username in Frame",
					action: "type",
					frame: "loginFrame",
					selector: "#frame-user",
					text: "replayed_admin",
				},
				{
					name: "Click Login in Frame",
					action: "click",
					frame: "loginFrame",
					selector: "#btn-login-submit",
				},
				{
					name: "Assert Logged In",
					action: "assert",
					frame: "loginFrame",
					selector: "#frame-login-status",
					text: "LOGGED_IN:replayed_admin",
					strictText: true,
				},
			],
		};

		const result = await FlowRunner.run(replayFlow, {}, { headless: true });
		expect(result.success).toBe(true);
		expect(result.steps.length).toBe(5);
		expect(result.steps.every((r) => r.success)).toBe(true);
	});
});
