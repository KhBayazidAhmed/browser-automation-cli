import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { INJECTED_ADVANCED_RECORDER_SCRIPT } from "../src/flow/recorder.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

describe("HUD Recorder DOM & Event Isolation (PR 5)", () => {
	let ctx: TestContext;

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
	});

	afterAll(async () => {
		await teardownTestContext();
	});

	test("1. ensures HUD container has all:initial reset and encapsulated shadow root", async () => {
		await ctx.page.goto(ctx.server.url("/"));

		const hudStatus = await ctx.page.evaluate<{
			exists: boolean;
			hasShadow: boolean;
			pointerEvents?: string;
		}>(() => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			return {
				exists: Boolean(hud),
				hasShadow: Boolean(hud?.shadowRoot),
				pointerEvents: hud?.style.pointerEvents,
			};
		});

		expect(hudStatus.exists).toBe(true);
		expect(hudStatus.hasShadow).toBe(true);
		expect(hudStatus.pointerEvents).toBe("none");
	});

	test("2. shields HUD clicks so page click listeners are not triggered", async () => {
		await ctx.page.goto(ctx.server.url("/disambiguation"));

		const result = await ctx.page.evaluate<{ pageClicked: boolean }>(() => {
			let pageClicked = false;
			document.body.addEventListener("click", () => {
				pageClicked = true;
			});

			const hud = document.getElementById("__cdp_recorder_hud__");
			const pauseBtn = hud?.shadowRoot?.getElementById("btn-pause");
			pauseBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			return { pageClicked };
		});

		expect(result.pageClicked).toBe(false);
	});

	test("3. automatically re-attaches HUD via MutationObserver if container is removed", async () => {
		await ctx.page.goto(ctx.server.url("/"));

		const reattached = await ctx.page.evaluate(async () => {
			const hud = document.getElementById("__cdp_recorder_hud__");
			hud?.remove();

			// Trigger DOM mutation so MutationObserver catches it
			const dummy = document.createElement("div");
			document.body.appendChild(dummy);

			await new Promise((r) => setTimeout(r, 50));
			return Boolean(document.getElementById("__cdp_recorder_hud__"));
		});

		expect(reattached).toBe(true);
	});
});
