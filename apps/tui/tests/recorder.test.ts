import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { INJECTED_ADVANCED_RECORDER_SCRIPT } from "../src/flow/recorder.js";
import { FlowRunner } from "../src/flow/runner.js";
import type { FlowDefinition, FlowStep } from "../src/flow/types.js";
import {
	setupTestContext,
	type TestContext,
	teardownTestContext,
} from "./fixtures/browser.js";

describe("Flow Recorder - End-to-End Actions & Features", () => {
	let ctx: TestContext;
	let page: any;
	const recordedEvents: any[] = [];
	const recordedSteps: FlowStep[] = [];
	let lastUrl = "";
	let isPaused = false;
	let isFinished = false;

	beforeAll(async () => {
		ctx = await setupTestContext();
		page = ctx.page;

		// 1. Enable CDP domains
		await page.client.send("Runtime.enable");
		await page.client.send("Page.enable");

		// 2. Add binding to catch events from injected recorder script
		await page.client.send("Runtime.addBinding", {
			name: "__cdpRecordEvent",
		});

		// 3. Inject actual recorder script on every new document / navigation
		await page.client.send("Page.addScriptToEvaluateOnNewDocument", {
			source: INJECTED_ADVANCED_RECORDER_SCRIPT,
		});

		// 4. Hook frame navigation
		page.client.on("Page.frameNavigated", (params: any) => {
			if (isPaused) return;
			const frame = params?.frame;
			if (
				frame &&
				!frame.parentId &&
				frame.url &&
				frame.url !== "about:blank"
			) {
				if (frame.url !== lastUrl) {
					lastUrl = frame.url;
					recordedSteps.push({
						name: `Navigate to ${new URL(frame.url).pathname || frame.url}`,
						action: "goto",
						url: frame.url,
					});
				}
			}
		});

		// 5. Hook binding called
		page.client.on("Runtime.bindingCalled", (params: any) => {
			if (
				(params.name === "__cdpRecordEvent" ||
					params.name === "__cdpRecordEvent__") &&
				params.payload
			) {
				try {
					const event = JSON.parse(params.payload);
					recordedEvents.push(event);

					if (event.type === "pause") {
						isPaused = true;
					} else if (event.type === "resume") {
						isPaused = false;
					} else if (event.type === "undo") {
						recordedSteps.pop();
					} else if (event.type === "click") {
						const stepName = event.text
							? `Click "${event.text}"`
							: `Click ${event.selector}`;
						recordedSteps.push({
							name: stepName,
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
					} else if (event.type === "extract") {
						recordedSteps.push({
							name: `Extract "${event.as}" from ${event.selector}`,
							action: "extract",
							selector: event.selector,
							as: event.as,
							text: event.text || event.sampleValue || undefined,
							strictText: true,
						});
					} else if (event.type === "extractMultiple") {
						recordedSteps.push({
							name: `Extract List "${event.as}" from ${event.containerSelector}`,
							action: "extractMultiple",
							containerSelector: event.containerSelector,
							as: event.as,
							limit: event.limit || 20,
							fields: event.fields || { title: "a", link: "a@href" },
						});
					} else if (event.type === "assert") {
						const assertVal = event.equals || event.text || event.contains;
						recordedSteps.push({
							name: `Assert ${event.selector} strictly equals "${assertVal}"`,
							action: "assert",
							selector: event.selector,
							text: event.text || assertVal,
							equals: assertVal,
							strictText: true,
						});
					} else if (event.type === "screenshot") {
						recordedSteps.push({
							name: `Capture Screenshot at Step ${recordedSteps.length + 1}`,
							action: "screenshot",
							path: "{{outputDir}}/screenshot-test.png",
						});
					} else if (event.type === "finish") {
						isFinished = true;
					}
				} catch {}
			}
		});

		// Navigate to initial page so the script evaluates
		await page.goto(ctx.server.url("/"));
	});

	afterAll(async () => {
		await teardownTestContext();
	});

	test("1. records page navigation events accurately", async () => {
		await page.goto(ctx.server.url("/forms"));
		await new Promise((r) => setTimeout(r, 100));

		const navStep = recordedSteps.find(
			(s) => s.action === "goto" && (s as any).url.includes("/forms"),
		);
		expect(navStep).toBeDefined();
		expect(navStep?.action).toBe("goto");
		expect((navStep as any)?.url).toBe(ctx.server.url("/forms"));
	});

	test("2. records standard click actions with smart selector and strict text", async () => {
		await page.evaluate(() => {
			const btn = document.getElementById("btn-save");
			btn?.click();
		});
		await new Promise((r) => setTimeout(r, 100));

		const clickStep = recordedSteps.find(
			(s) => s.action === "click" && (s as any).selector === "#btn-save",
		);
		expect(clickStep).toBeDefined();
		expect((clickStep as any)?.selector).toBe("#btn-save");
		expect((clickStep as any)?.text).toBe("Save Profile Settings");
		expect((clickStep as any)?.strictText).toBe(true);
	});

	test("3. records input typing and change events with target label and value", async () => {
		await page.evaluate(() => {
			const emailInput = document.getElementById(
				"user-email",
			) as HTMLInputElement;
			if (emailInput) {
				emailInput.value = "engineer@enterprise.io";
				emailInput.dispatchEvent(new Event("change", { bubbles: true }));
			}
		});
		await new Promise((r) => setTimeout(r, 100));

		const typeStep = recordedSteps.find(
			(s) =>
				s.action === "type" &&
				(s as any).selector === "#user-email" &&
				(s as any).text === "engineer@enterprise.io",
		);
		expect(typeStep).toBeDefined();
		expect((typeStep as any).text).toBe("engineer@enterprise.io");
		expect((typeStep as any).targetText).toBe("Work Email");
	});

	test("4. records variable extraction via in-page HUD modal submission", async () => {
		await page.evaluate(() => {
			const hud = document.getElementById(
				"__cdp_recorder_hud__",
			) as HTMLElement;
			const shadow = hud.shadowRoot!;

			// 1. Activate extract mode from HUD
			const btnExtract = shadow.getElementById(
				"btn-extract",
			) as HTMLButtonElement;
			btnExtract.click();

			// 2. Click element to extract
			const statusEl = document.getElementById("status");
			statusEl?.click();

			// 3. Fill and submit in-DOM modal
			const input = shadow.getElementById(
				"modal-var-input",
			) as HTMLInputElement;
			input.value = "extractedStatus";
			const saveBtn = shadow.getElementById(
				"modal-save-btn",
			) as HTMLButtonElement;
			saveBtn.click();
		});
		await new Promise((r) => setTimeout(r, 100));

		const extractStep = recordedSteps.find(
			(s) => s.action === "extract" && (s as any).as === "extractedStatus",
		);
		expect(extractStep).toBeDefined();
		expect((extractStep as any).selector).toBe("#status");
		expect((extractStep as any).as).toBe("extractedStatus");
	});

	test("5. records list & table extraction with pattern recognition and modal submission", async () => {
		await page.goto(ctx.server.url("/inventory"));
		await new Promise((r) => setTimeout(r, 100));

		await page.evaluate(() => {
			const hud = document.getElementById(
				"__cdp_recorder_hud__",
			) as HTMLElement;
			const shadow = hud.shadowRoot!;

			// 1. Activate list mode
			const btnList = shadow.getElementById("btn-list") as HTMLButtonElement;
			btnList.click();

			// 2. Click a table row element
			const row = document.querySelector(".inv-row") as HTMLElement;
			row?.click();

			// 3. Confirm modal
			const input = shadow.getElementById(
				"modal-var-input",
			) as HTMLInputElement;
			input.value = "inventoryList";
			const saveBtn = shadow.getElementById(
				"modal-save-btn",
			) as HTMLButtonElement;
			saveBtn.click();
		});
		await new Promise((r) => setTimeout(r, 100));

		const listStep = recordedSteps.find(
			(s) =>
				s.action === "extractMultiple" && (s as any).as === "inventoryList",
		);
		expect(listStep).toBeDefined();
		expect((listStep as any).containerSelector).toContain("tr");
		expect((listStep as any).fields).toBeDefined();
	});

	test("6. records strict assertion steps (Alt+Click mode)", async () => {
		await page.evaluate(() => {
			const badge = document.getElementById("session-badge");
			const altClickEvent = new MouseEvent("click", {
				bubbles: true,
				cancelable: true,
				altKey: true,
			});
			badge?.dispatchEvent(altClickEvent);
		});
		await new Promise((r) => setTimeout(r, 100));

		const assertStep = recordedSteps.find(
			(s) =>
				s.action === "assert" &&
				(s as any).selector === "#session-badge" &&
				(s as any).equals === "TENANT-CORP-900",
		);
		expect(assertStep).toBeDefined();
		expect((assertStep as any).equals).toBe("TENANT-CORP-900");
		expect((assertStep as any).strictText).toBe(true);
	});

	test("7. records instant screenshot step via HUD toolbar button", async () => {
		await page.evaluate(() => {
			const hud = document.getElementById(
				"__cdp_recorder_hud__",
			) as HTMLElement;
			const shadow = hud.shadowRoot!;
			const btnShot = shadow.getElementById("btn-shot") as HTMLButtonElement;
			btnShot.click();
		});
		await new Promise((r) => setTimeout(r, 100));

		const shotStep = recordedSteps.find((s) => s.action === "screenshot");
		expect(shotStep).toBeDefined();
		expect((shotStep as any).path).toContain("screenshot");
	});

	test("8. supports pause and resume recording modes", async () => {
		const stepsBefore = recordedSteps.length;

		// 1. Pause recording
		await page.evaluate(() => {
			const hud = document.getElementById(
				"__cdp_recorder_hud__",
			) as HTMLElement;
			const shadow = hud.shadowRoot!;
			const btnPause = shadow.getElementById("btn-pause") as HTMLButtonElement;
			btnPause.click();
		});
		await new Promise((r) => setTimeout(r, 50));

		// 2. Click while paused (must be ignored)
		await page.evaluate(() => {
			const badge = document.getElementById("session-badge");
			badge?.click();
		});
		await new Promise((r) => setTimeout(r, 50));
		expect(recordedSteps.length).toBe(stepsBefore);

		// 3. Resume recording
		await page.evaluate(() => {
			const hud = document.getElementById(
				"__cdp_recorder_hud__",
			) as HTMLElement;
			const shadow = hud.shadowRoot!;
			const btnPause = shadow.getElementById("btn-pause") as HTMLButtonElement;
			btnPause.click();
		});
		await new Promise((r) => setTimeout(r, 50));

		// 4. Click while resumed (must be recorded)
		await page.evaluate(() => {
			const badge = document.getElementById("session-badge");
			badge?.click();
		});
		await new Promise((r) => setTimeout(r, 100));
		expect(recordedSteps.length).toBe(stepsBefore + 1);
	});

	test("9. supports undo to revert the last recorded action", async () => {
		const countBefore = recordedSteps.length;

		await page.evaluate(() => {
			const hud = document.getElementById(
				"__cdp_recorder_hud__",
			) as HTMLElement;
			const shadow = hud.shadowRoot!;
			const btnUndo = shadow.getElementById("btn-undo") as HTMLButtonElement;
			btnUndo.click();
		});
		await new Promise((r) => setTimeout(r, 100));

		expect(recordedSteps.length).toBe(countBefore - 1);
	});

	test("10. supports toolbar collapse toggle and finish button", async () => {
		const isCollapsed = await page.evaluate(() => {
			const hud = document.getElementById(
				"__cdp_recorder_hud__",
			) as HTMLElement;
			const shadow = hud.shadowRoot!;
			const btnToggle = shadow.getElementById(
				"btn-toggle",
			) as HTMLButtonElement;
			btnToggle.click();
			const bar = shadow.getElementById("bar");
			const collapsed = bar?.classList.contains("collapsed");

			// Trigger Finish
			const btnStop = shadow.getElementById("btn-stop") as HTMLButtonElement;
			btnStop.click();

			return collapsed;
		});
		await new Promise((r) => setTimeout(r, 100));

		expect(isCollapsed).toBe(true);
		expect(isFinished).toBe(true);
	});

	test("11. executes end-to-end recorded flow with FlowRunner replay validation", async () => {
		const generatedFlow: FlowDefinition = {
			name: "E2E Recorded Flow Replay Test",
			description: "Validated flow created by interactive recorder",
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
					text: "validated@rec.com",
					clearFirst: true,
				},
				{
					name: "Click Save",
					action: "click",
					selector: "#btn-save",
				},
				{
					name: "Assert Status Text",
					action: "assert",
					selector: "#status",
					contains: "validated@rec.com",
				},
				{
					name: "Extract Status",
					action: "extract",
					selector: "#status",
					as: "finalStatus",
				},
			],
		};

		const result = await FlowRunner.run(generatedFlow, {}, { headless: true });
		expect(result.success).toBe(true);
		expect(result.data.finalStatus).toBe("SAVED:validated@rec.com:");
		expect(result.steps.length).toBe(5);
		expect(result.steps.every((s) => s.success)).toBe(true);
	});
});
