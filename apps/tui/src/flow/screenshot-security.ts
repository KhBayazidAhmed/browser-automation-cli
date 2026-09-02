import type { Page } from "../cdp/page.js";

export async function maskSensitiveContent(page: Page, values: string[]): Promise<void> {
	const validSecrets = values.filter((s) => typeof s === "string" && s.length >= 4);
	if (!validSecrets.length) return;
	const frames = page.frames();
	for (const frame of frames) {
		try {
			await frame.evaluate((secrets: string[]) => {
				const containsSecret = (value: string) => secrets.some((secret) => value.includes(secret));
				for (const element of document.querySelectorAll(
					"input, textarea, [contenteditable='true']",
				)) {
					const target = element as HTMLElement & { value?: string };
					if (!target.value || !containsSecret(target.value)) continue;
					target.dataset.automationOriginalSecurityStyle = target.style.cssText;
					target.dataset.automationSecretMasked = "true";
					target.style.setProperty("-webkit-text-security", "disc");
					target.style.setProperty("color", "transparent");
					target.style.setProperty("text-shadow", "0 0 8px #000");
				}
				for (const element of document.querySelectorAll("body *")) {
					const target = element as HTMLElement;
					if (
						target.children.length ||
						!target.textContent ||
						!containsSecret(target.textContent.trim())
					) {
						continue;
					}
					target.dataset.automationOriginalSecurityStyle = target.style.cssText;
					target.dataset.automationSecretMasked = "true";
					target.style.setProperty("filter", "blur(8px)");
				}
			}, validSecrets);
		} catch {}
	}
}

export async function unmaskSensitiveContent(page: Page): Promise<void> {
	const frames = page.frames();
	for (const frame of frames) {
		try {
			await frame.evaluate(() => {
				for (const element of document.querySelectorAll("[data-automation-secret-masked='true']")) {
					const target = element as HTMLElement;
					target.style.cssText = target.dataset.automationOriginalSecurityStyle || "";
					delete target.dataset.automationOriginalSecurityStyle;
					delete target.dataset.automationSecretMasked;
				}
			});
		} catch {}
	}
}

export async function captureSecureScreenshot(
	page: Page,
	values: string[],
	options: {
		fullPage?: boolean;
		clip?: { x: number; y: number; width: number; height: number; scale?: number };
	},
): Promise<Uint8Array> {
	await maskSensitiveContent(page, values);
	try {
		return await page.screenshot(options);
	} finally {
		await unmaskSensitiveContent(page);
	}
}

export async function captureSecurePdf(page: Page, values: string[]): Promise<Uint8Array> {
	await maskSensitiveContent(page, values);
	try {
		return await page.pdf();
	} finally {
		await unmaskSensitiveContent(page);
	}
}
