import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { INJECTED_ADVANCED_RECORDER_SCRIPT } from "../src/flow/recorder.js";
import type { FlowStep } from "../src/flow/types.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

describe("Flow Recorder - Actions, Navigation & Controls Suite", () => {
	let ctx: TestContext;
	const recordedSteps: FlowStep[] = [];
	let isPaused = false;
	let finishTriggered = false;

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
					if (event.type === "pause") isPaused = true;
					else if (event.type === "resume") isPaused = false;
					else if (event.type === "undo") recordedSteps.pop();
					else if (event.type === "click") {
						recordedSteps.push({
							name: event.text ? `Click "${event.text}"` : `Click ${event.selector}`,
							action: "click",
							selector: event.selector,
							text: event.text || undefined,
							strictText: event.text ? true : undefined,
						});
					} else if (event.type === "type") {
						recordedSteps.push({
							name: `Type into ${event.selector}`,
							action: "type",
							selector: event.selector,
							text: event.value,
							targetText: event.targetText || undefined,
							strictText: true,
						});
					} else if (event.type === "screenshot") {
						recordedSteps.push({
							name: "Capture Screenshot",
							action: "screenshot",
							path: event.path,
						});
					} else if (event.type === "finish") finishTriggered = true;
				} catch {}
			}
		});

		page.client.on("Page.frameNavigated", (params: unknown) => {
			if (isPaused) return;
			const frame = (params as { frame?: { parentId?: string; url?: string } })?.frame;
			if (frame && !frame.parentId && frame.url && frame.url !== "about:blank") {
				recordedSteps.push({
					name: `Navigate to ${new URL(frame.url).hostname || frame.url}`,
					action: "goto",
					url: frame.url,
				});
			}
		});
	});

	afterAll(async () => {
		await teardownTestContext();
	});

	test("1. records page navigation events accurately", async () => {
		await ctx.page.goto(ctx.server.url("/forms"));
		expect(recordedSteps.length).toBeGreaterThan(0);
		const navStep = recordedSteps.find((s) => s.action === "goto");
		expect(navStep).toBeDefined();
		expect((navStep as Record<string, unknown>)?.url).toBe(ctx.server.url("/forms"));
	});

	test("2. records standard click actions with smart selector and strict text", async () => {
		await ctx.page.evaluate(() => {
			const btn = document.getElementById("btn-save");
			btn?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		});

		const clickStep = recordedSteps.find(
			(s) => s.action === "click" && (s as Record<string, unknown>).selector === "#btn-save",
		);
		expect(clickStep).toBeDefined();
		expect((clickStep as Record<string, unknown>)?.text).toBe("Save Profile Settings");
		expect((clickStep as Record<string, unknown>)?.strictText).toBe(true);
	});

	test("3. records input typing and change events with target label and value", async () => {
		await ctx.page.evaluate(() => {
			const input = document.getElementById("user-email") as HTMLInputElement;
			if (input) {
				input.value = "engineer@enterprise.io";
				input.dispatchEvent(new Event("change", { bubbles: true }));
			}
		});

		const typeStep = recordedSteps.find(
			(s) =>
				s.action === "type" &&
				(s as Record<string, unknown>).selector === "#user-email" &&
				(s as Record<string, unknown>).text === "engineer@enterprise.io",
		);
		expect(typeStep).toBeDefined();
		expect((typeStep as Record<string, unknown>).targetText).toBe("Work Email");
	});

	test("3b. replaces sensitive input values with environment references", async () => {
		await ctx.page.evaluate(() => {
			const input = document.getElementById("auth-token") as HTMLInputElement;
			input.value = "must-not-be-recorded";
			input.dispatchEvent(new Event("change", { bubbles: true }));
		});
		const secretStep = recordedSteps.find(
			(step) =>
				step.action === "type" && (step as Record<string, unknown>).selector === "#auth-token",
		);
		expect((secretStep as Record<string, unknown>)?.text).toBe("{{env.AUTH_TOKEN}}");
		expect(JSON.stringify(recordedSteps)).not.toContain("must-not-be-recorded");
	});

	test("4. records instant screenshot step via HUD toolbar button", async () => {
		const initLen = recordedSteps.length;
		await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			const shadow = hud?.shadowRoot;
			shadow?.getElementById("btn-shot")?.click();
		});

		expect(recordedSteps.length).toBe(initLen + 1);
		const shotStep = recordedSteps[recordedSteps.length - 1];
		expect(shotStep?.action).toBe("screenshot");
	});

	test("5. supports pause and resume recording modes", async () => {
		await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			hud?.shadowRoot?.getElementById("btn-pause")?.click();
		});
		expect(isPaused).toBe(true);

		const preCount = recordedSteps.length;
		await ctx.page.evaluate(() => {
			document.getElementById("btn-save")?.click();
		});
		expect(recordedSteps.length).toBe(preCount);

		await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			hud?.shadowRoot?.getElementById("btn-pause")?.click();
		});
		expect(isPaused).toBe(false);
	});

	test("6. supports undo to revert the last recorded action", async () => {
		const preLen = recordedSteps.length;
		await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			hud?.shadowRoot?.getElementById("btn-undo")?.click();
		});
		expect(recordedSteps.length).toBe(preLen - 1);
	});

	test("7. supports toolbar collapse toggle and finish button", async () => {
		const collapsedBefore = await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			return hud?.shadowRoot?.getElementById("bar")?.classList.contains("collapsed");
		});
		expect(collapsedBefore).toBe(false);

		await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			hud?.shadowRoot?.getElementById("btn-toggle")?.click();
		});

		const collapsedAfter = await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			return hud?.shadowRoot?.getElementById("bar")?.classList.contains("collapsed");
		});
		expect(collapsedAfter).toBe(true);

		await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			hud?.shadowRoot?.getElementById("btn-stop")?.click();
		});
		expect(finishTriggered).toBe(true);
	});
});
