import type { Page } from "../page.js";
import type { GotoOptions } from "./types.js";

export async function navigatePage(
	page: Page,
	url: string,
	options: GotoOptions = {},
): Promise<void> {
	await page.init();
	const waitUntil = options.waitUntil || "domcontentloaded";
	const timeout = options.timeout || 30000;
	const targetEvent = waitUntil === "load" ? "Page.loadEventFired" : "Page.domContentEventFired";

	const eventPromise = page.client.once(targetEvent);
	const timeoutPromise = new Promise<never>((_, reject) =>
		setTimeout(() => reject(new Error(`Navigation timeout after ${timeout}ms to ${url}`)), timeout),
	);
	const navigatePromise = page.client.send("Page.navigate", { url });

	await Promise.race([Promise.all([navigatePromise, eventPromise]), timeoutPromise]);
}
