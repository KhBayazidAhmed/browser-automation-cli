import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { INJECTED_ADVANCED_RECORDER_SCRIPT } from "../src/flow/recorder.js";
import type { FlowStep } from "../src/flow/types.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

describe("Flow Recorder - Live Config Drawer & Custom Inserters Suite", () => {
	let ctx: TestContext;
	const recordedSteps: FlowStep[] = [];
	const recordedVariables: Record<string, unknown> = {};

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
					if (event.type === "wait") {
						recordedSteps.push({
							name: event.name || `Wait ${event.durationMs}ms`,
							action: "wait",
							durationMs: event.durationMs,
						});
					} else if (event.type === "waitForSelector") {
						recordedSteps.push({
							name: event.name || `Wait for ${event.selector}`,
							action: "waitForSelector",
							selector: event.selector,
							text: event.text,
							strictText: event.strictText,
						});
					} else if (event.type === "eval") {
						recordedSteps.push({
							name: event.name || "Eval JS",
							action: "eval",
							code: event.code,
							as: event.as,
						});
					} else if (event.type === "goto") {
						recordedSteps.push({
							name: event.name || `Navigate to ${event.url}`,
							action: "goto",
							url: event.url,
						});
					} else if (event.type === "deleteStep") {
						recordedSteps.splice(event.index, 1);
					} else if (event.type === "moveStep") {
						const { fromIndex, toIndex } = event;
						const item = recordedSteps.splice(fromIndex, 1)[0]!;
						recordedSteps.splice(toIndex, 0, item);
					} else if (event.type === "addVariable") {
						recordedVariables[event.key] = event.value;
					} else if (event.type === "setVariables") {
						Object.keys(recordedVariables).forEach((k) => {
							delete recordedVariables[k];
						});
						Object.assign(recordedVariables, event.variables);
					}
				} catch {}
			}
		});

		await page.goto(ctx.server.url("/forms"));
	});

	afterAll(async () => {
		await teardownTestContext();
	});

	test("1. opens live config inspector drawer and displays step list", async () => {
		const isDrawerOpenBefore = await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			return hud?.shadowRoot?.getElementById("drawer-overlay")?.classList.contains("open");
		});
		expect(isDrawerOpenBefore).toBe(false);

		await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			hud?.shadowRoot?.getElementById("btn-config")?.click();
		});

		const isDrawerOpenAfter = await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			return hud?.shadowRoot?.getElementById("drawer-overlay")?.classList.contains("open");
		});
		expect(isDrawerOpenAfter).toBe(true);
	});

	test("2. adds custom wait step and variables via HUD drawer", async () => {
		await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			const shadow = hud?.shadowRoot;
			const input = shadow?.getElementById("add-wait-ms") as HTMLInputElement;
			if (input) input.value = "2500";
			shadow?.getElementById("btn-submit-wait")?.click();
		});

		const waitStep = recordedSteps.find((s) => s.action === "wait");
		expect(waitStep).toBeDefined();
		expect((waitStep as Record<string, unknown>).durationMs).toBe(2500);

		await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			const shadow = hud?.shadowRoot;
			const keyInput = shadow?.getElementById("new-var-key") as HTMLInputElement;
			const valInput = shadow?.getElementById("new-var-val") as HTMLInputElement;
			if (keyInput) keyInput.value = "apiToken";
			if (valInput) valInput.value = "secret-123";
			shadow?.getElementById("btn-add-var")?.click();
		});

		expect(recordedVariables.apiToken).toBe("secret-123");
	});

	test("3. adds custom waitForSelector, eval, and goto steps via HUD drawer", async () => {
		await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			const shadow = hud?.shadowRoot;
			const sel = shadow?.getElementById("add-waitfor-sel") as HTMLInputElement;
			if (sel) sel.value = "#custom-box";
			shadow?.getElementById("btn-submit-waitfor")?.click();

			const code = shadow?.getElementById("add-eval-code") as HTMLTextAreaElement;
			const as = shadow?.getElementById("add-eval-var") as HTMLInputElement;
			if (code) code.value = "return document.title;";
			if (as) as.value = "docTitle";
			shadow?.getElementById("btn-submit-eval")?.click();

			const url = shadow?.getElementById("add-goto-url") as HTMLInputElement;
			if (url) url.value = "https://example.com/custom";
			shadow?.getElementById("btn-submit-goto")?.click();
		});

		expect(recordedSteps.some((s) => s.action === "waitForSelector")).toBe(true);
		expect(recordedSteps.some((s) => s.action === "eval")).toBe(true);
		expect(recordedSteps.some((s) => s.action === "goto")).toBe(true);
	});

	test("4. supports step reordering (moving up and down) in HUD drawer", async () => {
		expect(recordedSteps.length).toBeGreaterThanOrEqual(2);
		const firstStepName = recordedSteps[0]?.name;

		await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			const shadow = hud?.shadowRoot;
			const downBtn = shadow?.querySelector(".step-item .btn-icon-down") as HTMLElement;
			downBtn?.click();
		});

		expect(recordedSteps[1]?.name).toBe(firstStepName);
	});

	test("5. supports deleting individual step and deleting variable from within HUD drawer", async () => {
		const initialCount = recordedSteps.length;
		await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			const shadow = hud?.shadowRoot;
			const delBtn = shadow?.querySelector(".step-item .btn-icon-del") as HTMLElement;
			delBtn?.click();
		});
		expect(recordedSteps.length).toBe(initialCount - 1);

		await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			const shadow = hud?.shadowRoot;
			const delVarBtn = shadow?.querySelector(".var-item .btn-icon-del") as HTMLElement;
			delVarBtn?.click();
		});
		expect(recordedVariables.apiToken).toBeUndefined();
	});
});
