import type { Page } from "../cdp/page.js";
import type { ClickStep, GotoStep, TypeStep, WaitForSelectorStep, WaitStep } from "./types.js";

export async function executeDomStep(
	action: string,
	step: unknown,
	page: Page,
	ctx: Record<string, unknown>,
	interpolate: (t: string | undefined | null, vars: Record<string, unknown>) => string,
): Promise<unknown> {
	switch (action) {
		case "goto": {
			const s = step as GotoStep;
			const targetUrl = interpolate(s.url, ctx);
			await page.goto(targetUrl, {
				waitUntil: s.waitUntil || "domcontentloaded",
				timeout: s.timeout,
			});
			return targetUrl;
		}

		case "click": {
			const s = step as ClickStep;
			const selector = s.selector ? interpolate(s.selector, ctx) : undefined;
			const text = s.text ? interpolate(s.text, ctx) : undefined;
			const frame = s.frame ? interpolate(s.frame, ctx) : undefined;
			const strictText =
				typeof s.strictText === "string"
					? interpolate(s.strictText, ctx)
					: s.strictText !== undefined
						? s.strictText
						: text
							? true
							: undefined;
			await page.click(selector, {
				frame,
				text,
				strictText,
				ignoreCase: s.ignoreCase,
				regex: s.regex,
				startsWith: s.startsWith,
				endsWith: s.endsWith,
				normalizeWhitespace: s.normalizeWhitespace,
				timeout: s.timeout,
			});
			return text || selector || true;
		}

		case "type": {
			const s = step as TypeStep;
			const selector = s.selector ? interpolate(s.selector, ctx) : undefined;
			const text = interpolate(s.text, ctx);
			const frame = s.frame ? interpolate(s.frame, ctx) : undefined;
			const targetText = s.targetText ? interpolate(s.targetText, ctx) : undefined;
			const strictText =
				typeof s.strictText === "string" ? interpolate(s.strictText, ctx) : s.strictText;
			await page.type(selector, text, {
				frame,
				clearFirst: s.clearFirst,
				timeout: s.timeout,
				targetText,
				strictText,
				ignoreCase: s.ignoreCase,
				regex: s.regex,
				startsWith: s.startsWith,
				endsWith: s.endsWith,
				normalizeWhitespace: s.normalizeWhitespace,
			});
			return text;
		}

		case "wait": {
			const s = step as WaitStep;
			await new Promise((r) => setTimeout(r, s.durationMs));
			return s.durationMs;
		}

		case "waitForSelector": {
			const s = step as WaitForSelectorStep;
			const selector = s.selector ? interpolate(s.selector, ctx) : undefined;
			const text = s.text ? interpolate(s.text, ctx) : undefined;
			const frame = s.frame ? interpolate(s.frame, ctx) : undefined;
			const strictText =
				typeof s.strictText === "string"
					? interpolate(s.strictText, ctx)
					: s.strictText !== undefined
						? s.strictText
						: text
							? true
							: undefined;
			await page.waitForSelector(selector, {
				frame,
				timeout: s.timeout,
				text,
				strictText,
				ignoreCase: s.ignoreCase,
				regex: s.regex,
				startsWith: s.startsWith,
				endsWith: s.endsWith,
				normalizeWhitespace: s.normalizeWhitespace,
			});
			return true;
		}

		default:
			return undefined;
	}
}
