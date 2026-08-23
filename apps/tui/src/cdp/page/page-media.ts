import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { Page } from "../page.js";
import type { PDFOptions, ScreenshotOptions } from "./types.js";

async function writeOutput(path: string | undefined, bytes: Uint8Array): Promise<void> {
	if (!path) return;
	await mkdir(dirname(path), { recursive: true });
	await Bun.write(path, bytes);
}

export async function captureScreenshot(
	page: Page,
	options: ScreenshotOptions = {},
): Promise<Uint8Array> {
	await page.init();

	if (options.clip) {
		const clip = options.clip;
		const response = await page.client.send("Page.captureScreenshot", {
			format: options.format || "png",
			quality: options.quality,
			clip: {
				x: clip.x,
				y: clip.y,
				width: clip.width,
				height: clip.height,
				scale: clip.scale ?? 1,
			},
		});

		const buffer = Buffer.from(response.data, "base64");
		const uint8 = new Uint8Array(buffer);

		await writeOutput(options.path, uint8);

		return uint8;
	}

	if (options.fullPage) {
		const metrics = await page.client.send("Page.getLayoutMetrics");
		const width = Math.ceil(metrics.contentSize.width);
		const height = Math.ceil(metrics.contentSize.height);

		await page.client.send("Emulation.setDeviceMetricsOverride", {
			width,
			height,
			deviceScaleFactor: 1,
			mobile: false,
		});

		let response: { data: string };
		try {
			response = await page.client.send("Page.captureScreenshot", {
				format: options.format || "png",
				quality: options.quality,
				captureBeyondViewport: true,
			});
		} finally {
			await page.client.send("Emulation.clearDeviceMetricsOverride").catch(() => undefined);
		}

		const buffer = Buffer.from(response.data, "base64");
		const uint8 = new Uint8Array(buffer);

		await writeOutput(options.path, uint8);

		return uint8;
	}

	const response = await page.client.send("Page.captureScreenshot", {
		format: options.format || "png",
		quality: options.quality,
	});

	const buffer = Buffer.from(response.data, "base64");
	const uint8 = new Uint8Array(buffer);

	await writeOutput(options.path, uint8);

	return uint8;
}

export async function generatePdf(page: Page, options: PDFOptions = {}): Promise<Uint8Array> {
	await page.init();

	const response = await page.client.send("Page.printToPDF", {
		landscape: options.landscape,
		displayHeaderFooter: options.displayHeaderFooter,
		printBackground: options.printBackground ?? true,
		scale: options.scale,
		paperWidth: options.paperWidth,
		paperHeight: options.paperHeight,
		marginTop: options.marginTop,
		marginBottom: options.marginBottom,
		marginLeft: options.marginLeft,
		marginRight: options.marginRight,
		pageRanges: options.pageRanges,
	});

	const buffer = Buffer.from(response.data, "base64");
	const uint8 = new Uint8Array(buffer);

	await writeOutput(options.path, uint8);

	return uint8;
}

export async function blockPageResources(
	page: Page,
	resourceTypes: string[] = ["image", "font", "media"],
): Promise<void> {
	await page.init();
	const typeMap: Record<string, string> = {
		image: "Image",
		stylesheet: "Stylesheet",
		font: "Font",
		media: "Media",
		script: "Script",
	};
	const types = [...new Set(resourceTypes.map((type) => typeMap[type]).filter(Boolean))];
	await page.client.send("Fetch.disable").catch(() => undefined);
	if (types.length === 0) return;
	if (!resourceBlockHandlers.has(page)) {
		const unsubscribe = page.client.on("Fetch.requestPaused", (params: { requestId?: string }) => {
			if (!params?.requestId) return;
			void page.client
				.send("Fetch.failRequest", {
					requestId: params.requestId,
					errorReason: "BlockedByClient",
				})
				.catch(() => undefined);
		});
		resourceBlockHandlers.set(page, unsubscribe);
	}
	await page.client.send("Fetch.enable", {
		patterns: types.map((resourceType) => ({
			urlPattern: "*",
			resourceType,
			requestStage: "Request",
		})),
	});
}

const resourceBlockHandlers = new WeakMap<Page, () => void>();

export async function getPerformanceMetrics(page: Page): Promise<Record<string, number>> {
	await page.init();
	await page.client.send("Performance.enable");
	const res = await page.client.send("Performance.getMetrics");
	const result: Record<string, number> = {};
	for (const metric of res.metrics) {
		result[metric.name] = metric.value;
	}
	return result;
}
