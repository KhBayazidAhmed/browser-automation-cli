import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { INJECTED_ADVANCED_RECORDER_SCRIPT } from "../src/flow/recorder.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

interface WebcamState {
	sourceType: string;
	sourceInfo?: string;
	hasStream: boolean;
}

interface WebcamModalState extends WebcamState {
	wasOpen: boolean;
	isClosed: boolean;
	btnText: string;
	previewText: string;
}

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
	}, 15000);

	afterAll(async () => {
		await teardownTestContext(ctx);
	}, 15000);

	test("1. provides CDP Virtual Webcam device in enumerateDevices", async () => {
		const devices = await ctx.page.evaluate<
			Array<{ kind: string; label: string; deviceId: string }>
		>(`
			navigator.mediaDevices.enumerateDevices().then(devs => 
				devs.map(d => ({ kind: d.kind, label: d.label, deviceId: d.deviceId }))
			)
		`);

		expect(Array.isArray(devices)).toBe(true);
		const virtualCam = devices.find((device) => device.label.includes("CDP Virtual Webcam"));
		expect(virtualCam).toBeDefined();
		expect(virtualCam?.kind).toBe("videoinput");
	});

	test("2. intercepts getUserMedia and returns active virtual video track", async () => {
		const trackInfo = await ctx.page.evaluate<{
			trackCount: number;
			enabled: boolean;
			readyState: string;
			label: string;
		}>(`
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

		expect(trackInfo.trackCount).toBe(1);
		expect(trackInfo.enabled).toBe(true);
		expect(trackInfo.readyState).toBe("live");
		expect(trackInfo.label).toContain("CDP Virtual Webcam");
	});

	test("3. switches virtual webcam feed to synthetic test pattern", async () => {
		const switched = await ctx.page.evaluate<WebcamState>(`
			(() => {
				if (!window.__cdpVirtualWebcam) return false;
				window.__cdpVirtualWebcam.useTestPattern();
				return {
					sourceType: window.__cdpVirtualWebcam.sourceType,
					hasStream: Boolean(window.__cdpVirtualWebcam.stream)
				};
			})()
		`);

		expect(switched.sourceType).toBe("pattern");
		expect(switched.hasStream).toBe(true);
	});

	test("4. switches virtual webcam feed to solid color feed", async () => {
		const switched = await ctx.page.evaluate<WebcamState>(`
			(() => {
				if (!window.__cdpVirtualWebcam) return false;
				window.__cdpVirtualWebcam.useColorFeed("#3b82f6");
				return {
					sourceType: window.__cdpVirtualWebcam.sourceType,
					sourceInfo: window.__cdpVirtualWebcam.sourceInfo,
					hasStream: Boolean(window.__cdpVirtualWebcam.stream)
				};
			})()
		`);

		expect(switched.sourceType).toBe("solid");
		expect(switched.sourceInfo).toContain("#3b82f6");
		expect(switched.hasStream).toBe(true);
	});

	test("5. sets virtual webcam source to video URL", async () => {
		const result = await ctx.page.evaluate<WebcamState>(`
			(async () => {
				if (!window.__cdpVirtualWebcam) return null;
				await window.__cdpVirtualWebcam.setVideoUrl("https://example.com/demo.mp4");
				return {
					sourceType: window.__cdpVirtualWebcam.sourceType,
					sourceInfo: window.__cdpVirtualWebcam.sourceInfo,
					hasStream: Boolean(window.__cdpVirtualWebcam.stream)
				};
			})()
		`);

		expect(result.sourceType).toBe("url");
		expect(result.sourceInfo).toContain("URL:");
		expect(result.hasStream).toBe(true);
	});

	test("6. sets virtual webcam source to local video file", async () => {
		const result = await ctx.page.evaluate<WebcamState>(`
			(async () => {
				if (!window.__cdpVirtualWebcam) return null;
				const dummyBlob = new Blob(["video-sample"], { type: "video/mp4" });
				const dummyFile = new File([dummyBlob], "custom-recording.mp4", { type: "video/mp4" });
				await window.__cdpVirtualWebcam.setVideoFile(dummyFile);
				return {
					sourceType: window.__cdpVirtualWebcam.sourceType,
					sourceInfo: window.__cdpVirtualWebcam.sourceInfo,
					hasStream: Boolean(window.__cdpVirtualWebcam.stream)
				};
			})()
		`);

		expect(result.sourceType).toBe("file");
		expect(result.sourceInfo).toContain("custom-recording.mp4");
		expect(result.hasStream).toBe(true);
	});

	test("7. opens virtual webcam modal and applies video URL via HUD", async () => {
		const modalCheck = await ctx.page.evaluate<WebcamModalState>(`
			(async () => {
				const hud = document.getElementById("__cdp_recorder_hud__");
				const shadow = hud.shadowRoot;
				const btnWebcam = shadow.getElementById("btn-webcam");
				const modalOverlay = shadow.getElementById("modal-webcam-overlay");
				const inputUrl = shadow.getElementById("input-webcam-url");
				const btnUrlApply = shadow.getElementById("btn-webcam-url-apply");
				const preview = shadow.getElementById("webcam-status-preview");

				btnWebcam.click();
				const wasOpen = modalOverlay.classList.contains("open");

				inputUrl.value = "https://example.com/test-stream.mp4";
				btnUrlApply.click();

				// Wait a moment for async handler
				await new Promise(r => setTimeout(r, 100));

				return {
					wasOpen,
					isClosed: !modalOverlay.classList.contains("open"),
					sourceType: window.__cdpVirtualWebcam?.sourceType,
					btnText: btnWebcam.textContent,
					previewText: preview.innerText
				};
			})()
		`);

		expect(modalCheck.wasOpen).toBe(true);
		expect(modalCheck.isClosed).toBe(true);
		expect(modalCheck.sourceType).toBe("url");
		expect(modalCheck.btnText).toContain("Virtual camera on");
		expect(modalCheck.previewText).toContain("URL:");
	});

	test("8. clears/disables virtual webcam feed and resets status", async () => {
		const resetCheck = await ctx.page.evaluate<{
			isBtnActive: boolean;
			btnText: string;
			sourceType: string;
		}>(`
			(() => {
				const hud = document.getElementById("__cdp_recorder_hud__");
				const shadow = hud.shadowRoot;
				const btnReset = shadow.getElementById("btn-webcam-reset");
				const btnWebcam = shadow.getElementById("btn-webcam");

				btnReset.click();

				return {
					isBtnActive: btnWebcam.classList.contains("active-cam"),
					btnText: btnWebcam.textContent,
					sourceType: window.__cdpVirtualWebcam?.sourceType
				};
			})()
		`);

		expect(resetCheck.isBtnActive).toBe(false);
		expect(resetCheck.btnText).toContain("Virtual camera");
		expect(resetCheck.sourceType).toBe("none");
	});
});
