import type { Page } from "../page.js";
import { getContextId } from "./page-extractors.js";
import { serializeMatchOptions, type TextMatchOptions } from "./types.js";

export async function getMultipleElementTexts(
	page: Page,
	selector: string,
	options: TextMatchOptions = {},
	contextId?: number,
): Promise<string[]> {
	return getMultipleElementValues(page, selector, options, contextId);
}

export async function getMultipleElementAttributes(
	page: Page,
	selector: string,
	attribute: string,
	options: TextMatchOptions = {},
	contextId?: number,
): Promise<string[]> {
	return getMultipleElementValues(page, selector, options, contextId, attribute);
}

async function getMultipleElementValues(
	page: Page,
	selector: string,
	options: TextMatchOptions,
	contextId?: number,
	attribute?: string,
): Promise<string[]> {
	await page.init();
	const ctxId = await getContextId(page, selector, options, contextId);
	const matchOpts = serializeMatchOptions(options);
	return page.evaluateInContext(
		ctxId,
		(sel: string, rawOpts: unknown, attr?: string) => {
			const opts = (rawOpts || {}) as Record<string, unknown>;
			const normalize = (value: unknown) => {
				let result = value == null ? "" : String(value);
				if (opts.normalizeWhitespace !== false) result = result.replace(/\s+/g, " ");
				return result.trim();
			};
			const matches = (value: string) => {
				const actual = opts.ignoreCase ? normalize(value).toLowerCase() : normalize(value);
				if (opts.regex) {
					const existingFlags = String(opts.regexFlags || "");
					const flags = `${existingFlags}${opts.ignoreCase && !existingFlags.includes("i") ? "i" : ""}`;
					return new RegExp(String(opts.regex), flags).test(value);
				}
				for (const [kind, expectedRaw] of [
					["startsWith", opts.startsWith],
					["endsWith", opts.endsWith],
				] as const) {
					if (expectedRaw !== undefined) {
						const expected = opts.ignoreCase
							? normalize(expectedRaw).toLowerCase()
							: normalize(expectedRaw);
						return kind === "startsWith" ? actual.startsWith(expected) : actual.endsWith(expected);
					}
				}
				const expectedRaw = typeof opts.strictText === "string" ? opts.strictText : opts.text;
				if (expectedRaw === undefined) return true;
				const expected = opts.ignoreCase
					? normalize(expectedRaw).toLowerCase()
					: normalize(expectedRaw);
				return opts.strictText === false ? actual.includes(expected) : actual === expected;
			};
			const elements = Array.from(document.querySelectorAll(sel));
			return elements
				.filter((el) => !el.closest?.("#__cdp_recorder_hud__"))
				.filter((el) => {
					const html = el as HTMLElement & { value?: unknown };
					const value =
						typeof html.value === "string" ? html.value : html.innerText || html.textContent || "";
					return matches(value);
				})
				.map((el) => {
					if (attr) return el.getAttribute(attr) || "";
					const elVal = el as { value?: unknown };
					if ("value" in el && typeof elVal.value === "string") return elVal.value.trim();
					const html = el as HTMLElement;
					return html.innerText
						? html.innerText.trim()
						: html.textContent
							? html.textContent.trim()
							: "";
				});
		},
		selector,
		matchOpts,
		attribute,
	);
}
