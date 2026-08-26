import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { handleRecordedEvent } from "../src/flow/recorder/recorder-event-bridge.js";
import { INJECTED_ADVANCED_RECORDER_SCRIPT } from "../src/flow/recorder.js";
import type { FlowStep } from "../src/flow/types.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

describe("Flow Recorder - Interactive Pointer & Step Builder Suite", () => {
	let ctx: TestContext;
	const recordedSteps: FlowStep[] = [];
	const variables: Record<string, unknown> = {};
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
					handleRecordedEvent(
						event,
						recordedSteps,
						variables,
						(v) => {
							isPaused = v;
						},
						() => {},
					);
				} catch {}
			}
		});

		await page.goto(ctx.server.url("/forms"));
	});

	afterAll(async () => {
		await teardownTestContext();
	});

	test("1. dynamic selector engine ignores transient IDs and tailwind classes in favor of test IDs and semantic locators", async () => {
		const candidateInfo = await ctx.page.evaluate(() => {
			const dynamicEl = document.createElement("button");
			dynamicEl.id = ":r1:login_btn_82914";
			dynamicEl.setAttribute("data-testid", "submit-form-btn");
			dynamicEl.setAttribute("aria-label", "Submit Profile Form");
			dynamicEl.className =
				"flex p-4 w-full bg-blue-600 rounded-lg active hover:bg-blue-700 custom-action-btn";
			dynamicEl.innerText = "Save & Continue";
			document.body.appendChild(dynamicEl);

			// @ts-expect-error
			return window.__cdpGenerateSelectorCandidates(dynamicEl);
		});

		expect(candidateInfo).toBeDefined();
		expect(candidateInfo.recommended).toBe('[data-testid="submit-form-btn"]');
		const selectors = candidateInfo.candidates.map((c: { selector: string }) => c.selector);
		expect(selectors).toContain('[data-testid="submit-form-btn"]');
		expect(selectors).toContain('button[aria-label="Submit Profile Form"]');
		expect(selectors).toContain('button:text-is("Save & Continue")');
		expect(selectors).toContain("button.custom-action-btn");
		expect(selectors.some((s: string) => s.includes(":r1:"))).toBe(false);
	});

	test("2. launches pointer inspection mode from HUD toolbar and picks element to open Step Builder modal", async () => {
		await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			const shadow = hud?.shadowRoot;
			shadow?.getElementById("btn-pick")?.click();

			const targetInput = document.getElementById("user-email");
			targetInput?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		});

		const isModalOpen = await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			const shadow = hud?.shadowRoot;
			const modal = shadow?.getElementById("modal-step-builder-overlay");
			const tag = shadow?.getElementById("builder-tag-badge")?.innerText;
			const targetSel = (shadow?.getElementById("builder-target-selector") as HTMLInputElement)
				?.value;
			return {
				open: modal?.classList.contains("open"),
				tag,
				targetSel,
			};
		});

		expect(isModalOpen.open).toBe(true);
		expect(isModalOpen.tag).toContain("input");
		expect(isModalOpen.targetSel).toBe("#user-email");
	});

	test("3. configures and saves a Type step with clearFirst and custom value from Step Builder", async () => {
		await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			const shadow = hud?.shadowRoot;
			const actionSelect = shadow?.getElementById("builder-action-type") as HTMLSelectElement;
			const typeInput = shadow?.getElementById("builder-type-text") as HTMLInputElement;
			const clearCheck = shadow?.getElementById("builder-type-clear") as HTMLInputElement;

			if (actionSelect) actionSelect.value = "type";
			if (typeInput) typeInput.value = "Jane Doe";
			if (clearCheck) clearCheck.checked = true;

			shadow?.getElementById("builder-save-btn")?.click();
		});

		const typeStep = recordedSteps.find((s) => s.action === "type" && s.selector === "#user-email");
		expect(typeStep).toBeDefined();
		expect(typeStep?.text).toBe("Jane Doe");
		expect(typeStep?.clearFirst).toBe(true);
	});

	test("4. launches pointer picker from Config Drawer, selects button, and adds WaitForSelector step", async () => {
		await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			const shadow = hud?.shadowRoot;
			shadow?.getElementById("btn-config")?.click();
			shadow?.querySelector('.drawer-tab[data-tab="add"]')?.dispatchEvent(new MouseEvent("click"));
			shadow?.getElementById("btn-start-picker")?.click();

			const saveBtn = document.getElementById("btn-save");
			saveBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			const actionSelect = shadow?.getElementById("builder-action-type") as HTMLSelectElement;
			if (actionSelect) {
				actionSelect.value = "waitForSelector";
				actionSelect.dispatchEvent(new Event("change"));
			}
			const timeoutInput = shadow?.getElementById("builder-timeout-val") as HTMLInputElement;
			if (timeoutInput) timeoutInput.value = "4500";

			shadow?.getElementById("builder-save-btn")?.click();
		});

		const waitStep = recordedSteps.find(
			(s) => s.action === "waitForSelector" && s.selector === "#btn-save",
		);
		expect(waitStep).toBeDefined();
		expect(waitStep?.timeout).toBe(4500);
	});

	test("5. picks element inside child iframe, passes frame identifier, and creates frame-targeted step", async () => {
		await ctx.page.goto(ctx.server.url("/iframes-main"));
		await ctx.page.waitForSelector("#frame-login");

		const loginFrame = ctx.page.frame({ name: "loginFrame" });
		expect(loginFrame).toBeDefined();

		// Activate pointer mode on top window
		await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			hud?.shadowRoot?.getElementById("btn-pick")?.click();
		});

		// Click input inside login iframe
		await loginFrame?.evaluate(() => {
			const usernameInput = document.getElementById("frame-user");
			usernameInput?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		});

		// Verify Step Builder modal in top window is opened with iframe context
		const frameContextModal = await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			const shadow = hud?.shadowRoot;
			const modal = shadow?.getElementById("modal-step-builder-overlay");
			const frameBadge = shadow?.getElementById("builder-frame-badge");
			const frameInput = shadow?.getElementById("builder-frame-selector") as HTMLInputElement;
			const targetSel = (shadow?.getElementById("builder-target-selector") as HTMLInputElement)
				?.value;

			return {
				open: modal?.classList.contains("open"),
				badgeDisplay: frameBadge ? getComputedStyle(frameBadge).display : "none",
				badgeText: frameBadge?.innerText,
				frameValue: frameInput?.value,
				targetSel,
			};
		});

		expect(frameContextModal.open).toBe(true);
		expect(frameContextModal.frameValue).toContain("loginFrame");
		expect(frameContextModal.targetSel).toBe("#frame-user");

		// Submit the frame-targeted type step
		await ctx.page.evaluate(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			const shadow = hud?.shadowRoot;
			const typeInput = shadow?.getElementById("builder-type-text") as HTMLInputElement;
			if (typeInput) typeInput.value = "admin_user";
			shadow?.getElementById("builder-save-btn")?.click();
		});

		const iframeStep = recordedSteps.find(
			(s) => s.action === "type" && s.selector === "#frame-user",
		);
		expect(iframeStep).toBeDefined();
		expect(iframeStep?.frame).toBe("loginFrame");
		expect(iframeStep?.text).toBe("admin_user");
	});
});
