import type { Page } from "../page.js";
import { INJECTED_FIND_ELEMENT_SRC } from "./injected-element-finder.js";
import {
	type AssertOptions,
	type SelectorOptions,
	serializeMatchOptions,
	type TextMatchOptions,
} from "./types.js";

export async function getElementText(
	page: Page,
	selector?: string,
	options: SelectorOptions = {},
): Promise<string | null> {
	await page.init();
	const matchOpts = serializeMatchOptions(options);

	return page.evaluate(
		`${INJECTED_FIND_ELEMENT_SRC}
		const el = __cdpFindElement(arguments[0], arguments[1]);
		if (!el) return null;
		if ("value" in el && typeof el.value === "string") return el.value.trim();
		return el.innerText ? el.innerText.trim() : (el.textContent ? el.textContent.trim() : "");`,
		selector,
		matchOpts,
	);
}

export async function getMultipleElementTexts(
	page: Page,
	selector: string,
	options: TextMatchOptions = {},
): Promise<string[]> {
	await page.init();
	const matchOpts = serializeMatchOptions(options);

	return page.evaluate(
		(sel: string, _opts: unknown) => {
			const elements = Array.from(document.querySelectorAll(sel));
			return elements
				.filter((el) => !el.closest || !el.closest("#__cdp_recorder_hud__"))
				.map((el) => {
					const elVal = el as { value?: unknown };
					if ("value" in el && typeof elVal.value === "string") {
						return elVal.value.trim();
					}
					const h = el as HTMLElement;
					return h.innerText ? h.innerText.trim() : h.textContent ? h.textContent.trim() : "";
				});
		},
		selector,
		matchOpts,
	);
}

export async function getElementAttribute(
	page: Page,
	selector: string | undefined,
	attribute: string,
	options: SelectorOptions = {},
): Promise<string | null> {
	await page.init();
	const matchOpts = serializeMatchOptions(options);

	return page.evaluate(
		`${INJECTED_FIND_ELEMENT_SRC}
		const el = __cdpFindElement(arguments[0], arguments[2]);
		if (!el) return null;
		return el.getAttribute(arguments[1]);`,
		selector,
		attribute,
		matchOpts,
	);
}

export async function assertElementText(
	page: Page,
	selector: string | undefined,
	options: AssertOptions = {},
): Promise<string> {
	await page.init();
	const timeout = options.timeout || 10000;
	const startTime = Date.now();

	const hasExpected = Boolean(
		options.equals !== undefined ||
			options.contains !== undefined ||
			options.startsWith !== undefined ||
			options.endsWith !== undefined ||
			options.matches !== undefined ||
			options.text !== undefined ||
			options.strictText !== undefined,
	);

	if (!hasExpected) {
		throw new Error("assertText requires at least one assertion condition");
	}

	const expectedVal =
		options.equals ||
		options.contains ||
		options.startsWith ||
		options.endsWith ||
		(options.matches instanceof RegExp ? options.matches.source : options.matches) ||
		(typeof options.strictText === "string" ? options.strictText : undefined) ||
		options.text ||
		"";

	while (Date.now() - startTime < timeout) {
		const result = await page.evaluate(
			`${INJECTED_FIND_ELEMENT_SRC}
			const el = __cdpFindElement(arguments[0], arguments[1]);
			if (!el) return { found: false, text: "" };
			let actual = "";
			if (arguments[1].attribute) {
				actual = el.getAttribute(arguments[1].attribute) || "";
			} else if ("value" in el && typeof el.value === "string") {
				actual = el.value.trim();
			} else {
				actual = el.innerText ? el.innerText.trim() : (el.textContent ? el.textContent.trim() : "");
			}

			const normalize = (str) => {
				if (str === null || str === undefined) return "";
				let res = String(str);
				if (arguments[1].normalizeWhitespace !== false) res = res.replace(/\\s+/g, " ");
				return res.trim();
			};

			const actNorm = normalize(actual);
			const actCased = arguments[1].ignoreCase ? actNorm.toLowerCase() : actNorm;

			let passed = false;
			if (arguments[1].matches) {
				const r = new RegExp(arguments[1].matches, arguments[1].ignoreCase ? "i" : "");
				passed = r.test(actual);
			} else if (arguments[1].startsWith) {
				const exp = arguments[1].ignoreCase ? normalize(arguments[1].startsWith).toLowerCase() : normalize(arguments[1].startsWith);
				passed = actCased.startsWith(exp);
			} else if (arguments[1].endsWith) {
				const exp = arguments[1].ignoreCase ? normalize(arguments[1].endsWith).toLowerCase() : normalize(arguments[1].endsWith);
				passed = actCased.endsWith(exp);
			} else if (arguments[1].contains) {
				const exp = arguments[1].ignoreCase ? normalize(arguments[1].contains).toLowerCase() : normalize(arguments[1].contains);
				passed = actCased.includes(exp);
			} else if (arguments[1].equals) {
				const exp = arguments[1].ignoreCase ? normalize(arguments[1].equals).toLowerCase() : normalize(arguments[1].equals);
				passed = actCased === exp;
			} else if (arguments[1].strictText !== undefined && arguments[1].strictText !== false) {
				const expRaw = typeof arguments[1].strictText === "string" ? arguments[1].strictText : arguments[1].text;
				const exp = arguments[1].ignoreCase ? normalize(expRaw).toLowerCase() : normalize(expRaw);
				passed = actCased === exp;
			} else if (arguments[1].text) {
				const exp = arguments[1].ignoreCase ? normalize(arguments[1].text).toLowerCase() : normalize(arguments[1].text);
				passed = actCased.includes(exp);
			}

			return { found: true, text: actual, passed };`,
			selector,
			serializeMatchOptions(options),
		);

		if (
			result &&
			(result as { found?: boolean; passed?: boolean; text?: string }).found &&
			(result as { passed?: boolean }).passed
		) {
			return (result as { text: string }).text;
		}

		await new Promise((r) => setTimeout(r, 50));
	}

	throw new Error(
		`Assertion failed: Expected element${selector ? ` "${selector}"` : ""} to match "${expectedVal}" (timeout ${timeout}ms)`,
	);
}
