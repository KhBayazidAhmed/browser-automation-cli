import type { Page } from "../page.js";
import type { GotoOptions } from "./types.js";

export async function navigatePage(
	page: Page,
	url: string,
	options: GotoOptions = {},
): Promise<void> {
	await page.init();
	const waitUntil = options.waitUntil || "domcontentloaded";
	const timeout = options.timeout ?? 30000;
	const targetEvent =
		waitUntil === "load"
			? "Page.loadEventFired"
			: waitUntil === "networkidle"
				? "Page.lifecycleEvent"
				: "Page.domContentEventFired";

	if (waitUntil === "networkidle") {
		await page.client.send("Page.setLifecycleEventsEnabled", { enabled: true });
	}

	await new Promise<void>((resolve, reject) => {
		let settled = false;
		let expectedLoaderId: string | undefined;
		let pendingLifecycle: { name?: string; loaderId?: string } | undefined;
		const cleanup = () => {
			clearTimeout(timer);
			unsubscribe();
		};
		const finish = (error?: Error) => {
			if (settled) return;
			settled = true;
			cleanup();
			if (error) reject(error);
			else resolve();
		};
		const unsubscribe = page.client.on(
			targetEvent,
			(params: { name?: string; loaderId?: string }) => {
				if (waitUntil === "networkidle") {
					if (params?.name !== "networkIdle") return;
					if (!expectedLoaderId) {
						pendingLifecycle = params;
						return;
					}
					if (params.loaderId !== expectedLoaderId) return;
				}
				finish();
			},
		);
		const timer = setTimeout(
			() => finish(new Error(`Navigation timeout after ${timeout}ms to ${url}`)),
			timeout,
		);

		void page.client
			.send<{ errorText?: string; loaderId?: string }>("Page.navigate", { url })
			.then((result) => {
				if (result?.errorText)
					finish(new Error(`Navigation failed for ${url}: ${result.errorText}`));
				else if (waitUntil === "networkidle") {
					expectedLoaderId = result?.loaderId;
					if (!expectedLoaderId) finish();
					else if (pendingLifecycle?.loaderId === expectedLoaderId) finish();
				}
			})
			.catch((error: unknown) => finish(error instanceof Error ? error : new Error(String(error))));
	});
}
