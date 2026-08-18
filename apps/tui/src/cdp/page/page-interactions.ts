import type { Page } from "../page.js";
import { INJECTED_FIND_ELEMENT_SRC } from "./injected-element-finder.js";
import { type SelectorOptions, serializeMatchOptions, type TypeOptions } from "./types.js";

export async function clickElement(
	page: Page,
	selector?: string,
	options: SelectorOptions = {},
): Promise<void> {
	await page.init();
	await page.waitForSelector(selector, options);
	const matchOpts = serializeMatchOptions(options);

	const success = await page.evaluate(
		`${INJECTED_FIND_ELEMENT_SRC}
		const el = __cdpFindElement(arguments[0], arguments[1]);
		if (el) {
			el.scrollIntoView({ block: "center", inline: "center" });
			el.click();
			return true;
		}
		return false;`,
		selector,
		matchOpts,
	);

	if (!success) {
		throw new Error(
			`Could not click element: ${selector ? `"${selector}"` : ""}${options.text || options.strictText ? ` with text "${options.strictText || options.text}"` : ""}${options.regex ? ` matching /${options.regex}/` : ""}`,
		);
	}
}

export async function typeIntoElement(
	page: Page,
	selector?: string,
	text = "",
	options: TypeOptions = {},
): Promise<void> {
	await page.init();
	const matchOpts = serializeMatchOptions({
		...options,
		text: options.targetText || options.text,
	});

	await page.waitForSelector(selector, {
		...options,
		text: options.targetText || options.text,
	});

	const success = await page.evaluate(
		`${INJECTED_FIND_ELEMENT_SRC}
		const el = __cdpFindElement(arguments[0], arguments[3]);
		if (el) {
			el.scrollIntoView({ block: "center", inline: "center" });
			el.focus();
			if (arguments[2] && "value" in el) {
				el.value = "";
				el.dispatchEvent(new Event("input", { bubbles: true }));
				el.dispatchEvent(new Event("change", { bubbles: true }));
			}
			if ("value" in el) {
				el.value = arguments[2] ? arguments[1] : (el.value || "") + arguments[1];
			} else {
				el.innerText = arguments[1];
			}
			el.dispatchEvent(new Event("input", { bubbles: true }));
			el.dispatchEvent(new Event("change", { bubbles: true }));
			return true;
		}
		return false;`,
		selector,
		text,
		options.clearFirst ?? false,
		matchOpts,
	);

	if (!success) {
		throw new Error(
			`Could not type into element: ${selector ? `"${selector}"` : ""}${options.targetText ? ` (target: "${options.targetText}")` : ""}`,
		);
	}
}

export async function clearElement(
	page: Page,
	selector?: string,
	options: SelectorOptions = {},
): Promise<void> {
	await page.init();
	await page.waitForSelector(selector, options);
	const matchOpts = serializeMatchOptions(options);

	const success = await page.evaluate(
		`${INJECTED_FIND_ELEMENT_SRC}
		const el = __cdpFindElement(arguments[0], arguments[1]);
		if (el) {
			el.focus();
			if ("value" in el) {
				el.value = "";
				el.dispatchEvent(new Event("input", { bubbles: true }));
				el.dispatchEvent(new Event("change", { bubbles: true }));
			} else {
				el.innerText = "";
			}
			return true;
		}
		return false;`,
		selector,
		matchOpts,
	);

	if (!success) {
		throw new Error(`Could not clear element: ${selector ? `"${selector}"` : ""}`);
	}
}
