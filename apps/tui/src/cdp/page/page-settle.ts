import type { Page } from "../page.js";

export interface SettleWatchOptions {
	quietMs?: number;
	timeoutMs?: number;
}

export interface NetworkActivityWatcher {
	waitForQuiet(options?: SettleWatchOptions): Promise<void>;
}

export function watchNetworkActivity(page: Page): NetworkActivityWatcher {
	let lastActivityAt = Date.now();
	let inflightRequests = 0;
	const mark = () => {
		lastActivityAt = Date.now();
	};
	const onRequest = () => {
		inflightRequests++;
		mark();
	};
	const onResponseOrFinish = () => {
		inflightRequests = Math.max(0, inflightRequests - 1);
		mark();
	};

	const unsubscribers = [
		page.client.on("Network.requestWillBeSent", onRequest),
		page.client.on("Network.responseReceived", mark),
		page.client.on("Network.loadingFinished", onResponseOrFinish),
		page.client.on("Network.loadingFailed", onResponseOrFinish),
		page.client.on("Page.frameStartedLoading", onRequest),
		page.client.on("Page.frameStoppedLoading", onResponseOrFinish),
	];

	return {
		async waitForQuiet(options: SettleWatchOptions = {}): Promise<void> {
			const quietMs = options.quietMs ?? 500;
			const timeoutMs = options.timeoutMs ?? 5000;
			const deadline = Date.now() + timeoutMs;
			lastActivityAt = Date.now();
			try {
				while (true) {
					if (Date.now() >= deadline) return;
					const idleFor = Date.now() - lastActivityAt;
					if (inflightRequests === 0 && idleFor >= quietMs) {
						return;
					}
					await new Promise((resolve) => setTimeout(resolve, 50));
				}
			} finally {
				for (const unsubscribe of unsubscribers) unsubscribe();
			}
		},
	};
}
