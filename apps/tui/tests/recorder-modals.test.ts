import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { INJECTED_ADVANCED_RECORDER_SCRIPT } from "../src/flow/recorder.js";
import type { FlowStep } from "../src/flow/types.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

describe("Flow Recorder - Modals & Assertion Engine Suite", () => {
	let ctx: TestContext;
	const recordedSteps: FlowStep[] = [];

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
					if (event.type === "extract") {
						recordedSteps.push({
							name: `Extract "${event.as}"`,
							action: "extract",
							selector: event.selector,
							as: event.as,
							text: event.text || event.sampleValue,
							strictText: true,
						});
					} else if (event.type === "extractMultiple") {
						recordedSteps.push({
							name: `Extract List "${event.as}"`,
							action: "extractMultiple",
							containerSelector: event.containerSelector,
							as: event.as,
							limit: event.limit,
							fields: event.fields,
						});
					} else if (event.type === "assert") {
						recordedSteps.push({
							name: event.name || `Assert ${event.selector}`,
							action: "assert",
							selector: event.selector,
							text: event.text,
							equals: event.equals,
							contains: event.contains,
							matches: event.matches,
							startsWith: event.startsWith,
							endsWith: event.endsWith,
							strictText: event.strictText,
						});
					}
				} catch {}
			}
		});

		await page.goto(ctx.server.url("/forms"));
	});

	afterAll(async () => {
		await teardownTestContext();
	});

	test("1. records variable extraction via in-page HUD modal submission", async () => {
		await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			const shadow = hud?.shadowRoot;
			shadow?.getElementById("btn-extract")?.click();
			document.getElementById("status")?.click();

			const varInput = shadow?.getElementById("modal-var-input") as HTMLInputElement;
			if (varInput) varInput.value = "extractedStatus";
			shadow?.getElementById("modal-save-btn")?.click();
		});

		const extractStep = recordedSteps.find(
			(s) => s.action === "extract" && (s as Record<string, unknown>).as === "extractedStatus",
		);
		expect(extractStep).toBeDefined();
		expect((extractStep as Record<string, unknown>).selector).toBe("#status");
	});

	test("2. records list & table extraction with pattern recognition and modal submission", async () => {
		await ctx.page.goto(ctx.server.url("/inventory"));
		await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			const shadow = hud?.shadowRoot;
			shadow?.getElementById("btn-list")?.click();

			const firstRow = document.querySelector("tr.inv-row");
			firstRow?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			const varInput = shadow?.getElementById("modal-var-input") as HTMLInputElement;
			if (varInput) varInput.value = "inventoryList";
			shadow?.getElementById("modal-save-btn")?.click();
		});

		const listStep = recordedSteps.find(
			(s) =>
				s.action === "extractMultiple" && (s as Record<string, unknown>).as === "inventoryList",
		);
		expect(listStep).toBeDefined();
		expect((listStep as Record<string, unknown>).containerSelector).toContain("tr");
	});

	test("3. records strict assertion steps (Alt+Click mode)", async () => {
		await ctx.page.goto(ctx.server.url("/forms"));
		await ctx.page.evaluate(() => {
			const target = document.getElementById("btn-save");
			target?.dispatchEvent(
				new MouseEvent("click", {
					bubbles: true,
					cancelable: true,
					altKey: true,
				}),
			);
		});

		const assertStep = recordedSteps.find((s) => s.action === "assert");
		expect(assertStep).toBeDefined();
		expect((assertStep as Record<string, unknown>).selector).toBe("#btn-save");
		expect((assertStep as Record<string, unknown>).strictText).toBe(true);
	});

	test("4. supports assertion mode with assertion modal and substring/regex matching", async () => {
		await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			const shadow = hud?.shadowRoot;
			shadow?.getElementById("btn-assert")?.click();
			document.getElementById("btn-save")?.click();

			const typeSelect = shadow?.getElementById("modal-assert-type") as HTMLSelectElement;
			const valInput = shadow?.getElementById("modal-assert-val") as HTMLInputElement;
			if (typeSelect) typeSelect.value = "contains";
			if (valInput) valInput.value = "Profile";
			shadow?.getElementById("modal-assert-save")?.click();
		});

		const modalAssertStep = recordedSteps.find(
			(s) => s.action === "assert" && (s as Record<string, unknown>).contains === "Profile",
		);
		expect(modalAssertStep).toBeDefined();
	});
});
