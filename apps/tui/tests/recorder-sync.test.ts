import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { INJECTED_ADVANCED_RECORDER_SCRIPT } from "../src/flow/recorder.js";
import { FlowRunner } from "../src/flow/runner.js";
import type { FlowDefinition, FlowStep } from "../src/flow/types.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

describe("Flow Recorder - State Sync & Replay Suite", () => {
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
					if (event.type === "click") {
						recordedSteps.push({
							name: `Click ${event.selector}`,
							action: "click",
							selector: event.selector,
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

	test("1. supports external state synchronization via window.__cdpSyncState", async () => {
		await ctx.page.evaluate(() => {
			const win = window as unknown as {
				__cdpSyncState?: (state: string) => void;
			};
			if (win.__cdpSyncState) {
				win.__cdpSyncState(
					JSON.stringify({
						name: "Externally Updated Flow",
						steps: [
							{
								name: "Synced Click",
								action: "click",
								selector: "#btn-sync",
							},
						],
						variables: { env: "staging" },
					}),
				);
			}
		});

		const subtitleText = await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			return hud?.shadowRoot?.getElementById("drawer-subtitle")?.innerText;
		});

		expect(subtitleText).toContain("Externally Updated Flow");
		expect(subtitleText).toContain("1 steps");
	});

	test("2. executes end-to-end recorded flow with FlowRunner replay validation", async () => {
		const replayFlow: FlowDefinition = {
			name: "E2E Recorded Flow Replay Test",
			description: "Validated flow created by interactive recorder",
			variables: {
				recordedEmail: "validated@rec.com",
			},
			steps: [
				{
					name: "Navigate to Forms",
					action: "goto",
					url: ctx.server.url("/forms"),
				},
				{
					name: "Type Email",
					action: "type",
					selector: "#user-email",
					text: "{{recordedEmail}}",
					strictText: true,
					clearFirst: true,
				},
				{
					name: "Click Save",
					action: "click",
					selector: "#btn-save",
					text: "Save Profile Settings",
					strictText: true,
				},
				{
					name: "Wait Brief",
					action: "wait",
					durationMs: 50,
				},
				{
					name: "Assert Status Text",
					action: "assert",
					selector: "#status",
					contains: "SAVED:{{recordedEmail}}",
				},
				{
					name: "Extract Status",
					action: "extract",
					selector: "#status",
					as: "finalStatus",
					strictText: true,
				},
			],
		};

		const result = await FlowRunner.run(replayFlow, {}, { headless: true });
		expect(result.success).toBe(true);
		expect(result.steps.length).toBe(6);
		expect(result.data.finalStatus).toContain("SAVED:validated@rec.com");
	}, 15000);
});
