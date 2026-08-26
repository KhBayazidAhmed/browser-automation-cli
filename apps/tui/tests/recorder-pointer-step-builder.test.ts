import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { INJECTED_ADVANCED_RECORDER_SCRIPT } from "../src/flow/recorder.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

interface RecordedClickEvent {
	type: string;
	selector?: string;
	text?: string;
	strictText?: boolean;
	sourceEvent?: string;
	pointerType?: string;
	button?: number;
}

describe("Recorder selector engine and pointer step builder", () => {
	let ctx: TestContext;
	let recordedEvents: RecordedClickEvent[] = [];

	beforeAll(async () => {
		ctx = await setupTestContext();
		await ctx.page.client.send("Runtime.enable");
		await ctx.page.client.send("Page.enable");
		await ctx.page.client.send("Runtime.addBinding", { name: "__cdpRecordEvent" });
		await ctx.page.client.send("Page.addScriptToEvaluateOnNewDocument", {
			source: INJECTED_ADVANCED_RECORDER_SCRIPT,
		});
		ctx.page.client.on("Runtime.bindingCalled", (params: unknown) => {
			const binding = params as { name?: string; payload?: string };
			if (binding.name !== "__cdpRecordEvent" || !binding.payload) return;
			try {
				recordedEvents.push(JSON.parse(binding.payload) as RecordedClickEvent);
			} catch {}
		});
		await ctx.page.goto(ctx.server.url("/forms"));
	});

	beforeEach(async () => {
		recordedEvents = [];
		await ctx.page.evaluate(() => {
			document.getElementById("recorder-regression-fixture")?.remove();
			const recorderWindow = window as typeof window & {
				__cdpSyncState?: (state: { steps: unknown[] }) => void;
			};
			recorderWindow.__cdpSyncState?.({ steps: [] });
		});
	});

	afterAll(async () => {
		await teardownTestContext(ctx);
	});

	const waitForClicks = async (count: number, attempts = 40) => {
		for (let attempt = 0; attempt < attempts; attempt++) {
			const clicks = recordedEvents.filter((event) => event.type === "click");
			if (clicks.length >= count) return clicks;
			await new Promise((resolve) => setTimeout(resolve, 10));
		}
		return recordedEvents.filter((event) => event.type === "click");
	};

	test("generates unique strict-text selectors for unlabelled interactive elements", async () => {
		await ctx.page.evaluate(() => {
			const fixture = document.createElement("div");
			fixture.id = "recorder-regression-fixture";
			fixture.innerHTML =
				'<button class="unstable-generated-class"><span>Open Customer Profile</span></button>';
			document.body.appendChild(fixture);
			fixture
				.querySelector("span")
				?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
		});

		const [event] = await waitForClicks(1);
		expect(event?.selector).toBe('button:text-is("Open Customer Profile")');
		expect(event?.text).toBe("Open Customer Profile");
		expect(event?.strictText).toBe(true);
		expect(event?.sourceEvent).toBe("click");
	});

	test("generates ARIA and placeholder selectors for form controls", async () => {
		await ctx.page.evaluate(() => {
			const fixture = document.createElement("div");
			fixture.id = "recorder-regression-fixture";
			fixture.innerHTML = [
				'<input aria-label="Customer Account Email" />',
				'<input placeholder="One-time Access Code" />',
			].join("");
			document.body.appendChild(fixture);
			const inputs = fixture.querySelectorAll<HTMLInputElement>("input");
			const ariaInput = inputs[0];
			const placeholderInput = inputs[1];
			if (!ariaInput || !placeholderInput) throw new Error("Recorder fixture inputs are missing");
			ariaInput.value = "customer@example.com";
			ariaInput.dispatchEvent(new Event("change", { bubbles: true }));
			placeholderInput.value = "123456";
			placeholderInput.dispatchEvent(new Event("change", { bubbles: true }));
		});

		for (
			let attempt = 0;
			attempt < 40 && recordedEvents.filter((event) => event.type === "type").length < 2;
			attempt++
		) {
			await new Promise((resolve) => setTimeout(resolve, 10));
		}
		const typeEvents = recordedEvents.filter((event) => event.type === "type");
		expect(typeEvents.map((event) => event.selector)).toEqual([
			'[aria-label="Customer Account Email"]',
			'[placeholder="One-time Access Code"]',
		]);
	});

	test("records a browser pointer sequence as exactly one click step", async () => {
		await ctx.page.evaluate(() => {
			const fixture = document.createElement("div");
			fixture.id = "recorder-regression-fixture";
			fixture.innerHTML =
				'<button class="generated-pointer-button"><span>Launch Pointer Action</span></button>';
			document.body.appendChild(fixture);
			const target = fixture.querySelector("span");
			target?.dispatchEvent(
				new PointerEvent("pointerdown", {
					bubbles: true,
					cancelable: true,
					button: 0,
					isPrimary: true,
					pointerType: "mouse",
				}),
			);
			target?.dispatchEvent(
				new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }),
			);
			target?.dispatchEvent(
				new MouseEvent("mouseup", { bubbles: true, cancelable: true, button: 0 }),
			);
			target?.dispatchEvent(
				new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
			);
		});

		await waitForClicks(1);
		await new Promise((resolve) => setTimeout(resolve, 30));
		const clicks = recordedEvents.filter((event) => event.type === "click");
		expect(clicks).toHaveLength(1);
		expect(clicks[0]?.selector).toBe('button:text-is("Launch Pointer Action")');
		expect(clicks[0]?.sourceEvent).toBe("pointerdown");
		expect(clicks[0]?.pointerType).toBe("mouse");
		expect(clicks[0]?.button).toBe(0);
	});

	test("records mousedown-only activations when no pointer event is emitted", async () => {
		await ctx.page.evaluate(() => {
			const fixture = document.createElement("div");
			fixture.id = "recorder-regression-fixture";
			fixture.innerHTML = '<div role="button" tabindex="0"><span>Compose Message</span></div>';
			document.body.appendChild(fixture);
			fixture
				.querySelector("span")
				?.dispatchEvent(
					new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }),
				);
		});

		const [event] = await waitForClicks(1, 100);
		expect(event?.selector).toBe('div:text-is("Compose Message")');
		expect(event?.sourceEvent).toBe("mousedown");
		expect(event?.pointerType).toBe("mouse");
	});
});
