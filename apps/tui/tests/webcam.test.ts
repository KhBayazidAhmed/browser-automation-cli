import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { INJECTED_ADVANCED_RECORDER_SCRIPT } from "../src/flow/recorder.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

describe("Virtual Webcam & MediaStream Injection Suite", () => {
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
		await page.goto(ctx.server.url("/forms"));
		await page.waitForSelector("#__cdp_recorder_hud__");
	});

	afterAll(async () => {
		await teardownTestContext(ctx);
	});

	test("1. provides CDP Virtual Webcam device in enumerateDevices", async () => {
		const devices = await ctx.page.evaluate(`
			navigator.mediaDevices.enumerateDevices().then(devs => 
				devs.map(d => ({ kind: d.kind, label: d.label, deviceId: d.deviceId }))
			)
		`);

		expect(Array.isArray(devices)).toBe(true);
		const virtualCam = (devices as any[]).find((d) => d.label.includes("CDP Virtual Webcam"));
		expect(virtualCam).toBeDefined();
		expect(virtualCam?.kind).toBe("videoinput");
	});

	test("2. intercepts getUserMedia and returns active virtual video track", async () => {
		const trackInfo = await ctx.page.evaluate(`
			navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
				const tracks = stream.getVideoTracks();
				return {
					trackCount: tracks.length,
					enabled: tracks[0]?.enabled,
					readyState: tracks[0]?.readyState,
					label: tracks[0]?.label
				};
			})
		`);

		expect((trackInfo as any).trackCount).toBe(1);
		expect((trackInfo as any).enabled).toBe(true);
		expect((trackInfo as any).readyState).toBe("live");
		expect((trackInfo as any).label).toContain("CDP Virtual Webcam");
	});

	test("3. switches virtual webcam feed to synthetic test pattern", async () => {
		const switched = await ctx.page.evaluate(`
			(() => {
				if (!window.__cdpVirtualWebcam) return false;
				window.__cdpVirtualWebcam.useTestPattern();
				return {
					sourceType: window.__cdpVirtualWebcam.sourceType,
					hasStream: Boolean(window.__cdpVirtualWebcam.stream)
				};
			})()
		`);

		expect((switched as any).sourceType).toBe("pattern");
		expect((switched as any).hasStream).toBe(true);
	});

	test("4. opens virtual webcam modal from HUD toolbar and allows switching feeds", async () => {
		const modalCheck = await ctx.page.evaluate(`
			(() => {
				const hud = document.getElementById("__cdp_recorder_hud__");
				const shadow = hud.shadowRoot;
				const btnWebcam = shadow.getElementById("btn-webcam");
				const modalOverlay = shadow.getElementById("modal-webcam-overlay");
				const btnPattern = shadow.getElementById("btn-webcam-pattern");

				// Click toolbar cam button
				btnWebcam.click();
				const wasOpen = modalOverlay.classList.contains("open");

				// Click test pattern
				btnPattern.click();
				const isClosed = !modalOverlay.classList.contains("open");
				const isBtnActive = btnWebcam.classList.contains("active-cam");

				return { wasOpen, isClosed, isBtnActive, btnText: btnWebcam.innerText };
			})()
		`);

		expect((modalCheck as any).wasOpen).toBe(true);
		expect((modalCheck as any).isClosed).toBe(true);
		expect((modalCheck as any).isBtnActive).toBe(true);
		expect((modalCheck as any).btnText).toContain("Cam (ON)");
	});

	test("5. clears/disables virtual webcam feed and resets status", async () => {
		const resetCheck = await ctx.page.evaluate(`
			(() => {
				const hud = document.getElementById("__cdp_recorder_hud__");
				const shadow = hud.shadowRoot;
				const btnReset = shadow.getElementById("btn-webcam-reset");
				const btnWebcam = shadow.getElementById("btn-webcam");

				btnReset.click();

				return {
					isBtnActive: btnWebcam.classList.contains("active-cam"),
					btnText: btnWebcam.innerText,
					sourceType: window.__cdpVirtualWebcam?.sourceType
				};
			})()
		`);

		expect((resetCheck as any).isBtnActive).toBe(false);
		expect((resetCheck as any).btnText).toContain("Cam");
		expect((resetCheck as any).sourceType).toBe("none");
	});
});
