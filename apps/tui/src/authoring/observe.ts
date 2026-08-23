import type { Page } from "../cdp/page.js";
import type { BrowserObservation, ObservedElement } from "./types.js";

interface PageSnapshot {
	visibleText: string;
	elements: Omit<ObservedElement, "ref">[];
}

const MAX_VISIBLE_TEXT = 8_000;
const MAX_ELEMENTS = 120;

export async function observePage(page: Page): Promise<BrowserObservation> {
	const [url, title, snapshot] = await Promise.all([
		page.url(),
		page.title(),
		page.evaluate<PageSnapshot>(
			(maxVisibleText: number, maxElements: number) => {
				const normalize = (value: unknown) =>
					String(value || "")
						.replace(/\s+/g, " ")
						.trim();
				const escapeAttribute = (value: string) =>
					value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
				const selectorFor = (element: Element): string => {
					const html = element as HTMLElement;
					const tag = element.tagName.toLowerCase();
					if (html.id) return `#${CSS.escape(html.id)}`;
					for (const attribute of ["data-testid", "data-qa", "data-action", "name"]) {
						const value = element.getAttribute(attribute);
						if (value) return `${tag}[${attribute}="${escapeAttribute(value)}"]`;
					}
					for (const attribute of ["aria-label", "placeholder"]) {
						const value = element.getAttribute(attribute);
						if (value) return `[${attribute}="${escapeAttribute(value)}"]`;
					}
					const path: string[] = [];
					let current: Element | null = element;
					while (current && current !== document.body && path.length < 4) {
						const currentTag = current.tagName.toLowerCase();
						const siblings = current.parentElement
							? Array.from(current.parentElement.children).filter(
									(candidate) => candidate.tagName === current?.tagName,
								)
							: [];
						const suffix =
							siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(current) + 1})` : "";
						path.unshift(`${currentTag}${suffix}`);
						current = current.parentElement;
					}
					return path.join(" > ") || tag;
				};
				const isVisible = (element: Element): boolean => {
					const style = getComputedStyle(element);
					const rect = element.getBoundingClientRect();
					return (
						style.display !== "none" &&
						style.visibility !== "hidden" &&
						Number(style.opacity || "1") > 0 &&
						rect.width > 0 &&
						rect.height > 0
					);
				};
				const candidates = Array.from(
					document.querySelectorAll(
						"a,button,input,textarea,select,[role],[tabindex],[contenteditable='true']",
					),
				)
					.filter(isVisible)
					.slice(0, maxElements);
				const elements = candidates.map((element) => {
					const input = element as HTMLInputElement;
					const text = normalize((element as HTMLElement).innerText || element.textContent);
					const name = normalize(
						element.getAttribute("aria-label") ||
							element.getAttribute("title") ||
							element.getAttribute("placeholder") ||
							text,
					);
					return {
						tag: element.tagName.toLowerCase(),
						role: element.getAttribute("role") || undefined,
						name: name.slice(0, 160) || undefined,
						text: text.slice(0, 240) || undefined,
						selector: selectorFor(element),
						type: element.getAttribute("type") || undefined,
						placeholder: element.getAttribute("placeholder") || undefined,
						href: element instanceof HTMLAnchorElement ? element.href : undefined,
						disabled: "disabled" in input ? Boolean(input.disabled) : undefined,
					};
				});
				return {
					visibleText: normalize(document.body?.innerText).slice(0, maxVisibleText),
					elements,
				};
			},
			MAX_VISIBLE_TEXT,
			MAX_ELEMENTS,
		),
	]);

	return {
		timestamp: new Date().toISOString(),
		url,
		title,
		visibleText: snapshot.visibleText,
		elements: snapshot.elements.map((element, index) => ({ ...element, ref: `e${index + 1}` })),
		frames: page.frames().map((frame) => ({
			id: frame.id,
			name: frame.name,
			url: frame.url,
			main: frame.isMainFrame(),
		})),
	};
}
