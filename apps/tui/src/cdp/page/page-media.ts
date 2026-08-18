import type { Page } from "../page.js";
import type { PDFOptions, ScreenshotOptions } from "./types.js";

export async function captureScreenshot(
	page: Page,
	options: ScreenshotOptions = {},
): Promise<Uint8Array> {
	await page.init();

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
	}

	const res = await page.client.send("Page.captureScreenshot", {
		format: options.format || "png",
		quality: options.quality,
	});

	if (options.fullPage) {
		await page.client.send("Emulation.clearDeviceMetricsOverride");
	}

	const buffer = Buffer.from(res.data, "base64");
	const uint8 = new Uint8Array(buffer);

	if (options.path) {
		await Bun.write(options.path, uint8);
	}

	return uint8;
}

export async function generatePdf(page: Page, options: PDFOptions = {}): Promise<Uint8Array> {
	await page.init();
	const res = await page.client.send("Page.printToPDF", {
		printBackground: options.printBackground ?? true,
	});

	const buffer = Buffer.from(res.data, "base64");
	const uint8 = new Uint8Array(buffer);

	if (options.path) {
		await Bun.write(options.path, uint8);
	}

	return uint8;
}

export async function blockPageResources(
	page: Page,
	resourceTypes: string[] = ["image", "font", "media"],
): Promise<void> {
	await page.init();
	await page.client.send("Network.setBlockedURLs", {
		urls: resourceTypes.map((t) => `*${t}*`),
	});
}

export async function getPerformanceMetrics(page: Page): Promise<Record<string, number>> {
	await page.init();
	const res = await page.client.send("Performance.getMetrics");
	const result: Record<string, number> = {};
	for (const metric of res.metrics) {
		result[metric.name] = metric.value;
	}
	return result;
}
