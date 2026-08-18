import { join } from "node:path";
import type { Page } from "../cdp/page.js";
import type {
	AssertStep,
	BlockStep,
	EvalStep,
	ExtractMultipleStep,
	ExtractStep,
	PDFStep,
	ScreenshotStep,
} from "./types.js";

export async function executeExtractStep(
	action: string,
	step: unknown,
	page: Page,
	ctx: Record<string, unknown>,
	interpolate: (t: string | undefined | null, vars: Record<string, unknown>) => string,
): Promise<unknown> {
	switch (action) {
		case "extract": {
			const s = step as ExtractStep;
			const selector = s.selector ? interpolate(s.selector, ctx) : undefined;
			const text = s.text ? interpolate(s.text, ctx) : undefined;
			const strictText =
				typeof s.strictText === "string"
					? interpolate(s.strictText, ctx)
					: s.strictText !== undefined
						? s.strictText
						: text
							? true
							: undefined;
			const attribute = s.attribute || "text";

			if (s.all) {
				return page.getMultipleText(selector || "*", {
					text,
					strictText,
					ignoreCase: s.ignoreCase,
					regex: s.regex,
					startsWith: s.startsWith,
					endsWith: s.endsWith,
					normalizeWhitespace: s.normalizeWhitespace,
				});
			}

			if (attribute === "text" || attribute === "innerText") {
				return page.getText(selector, {
					text,
					strictText,
					ignoreCase: s.ignoreCase,
					regex: s.regex,
					startsWith: s.startsWith,
					endsWith: s.endsWith,
					normalizeWhitespace: s.normalizeWhitespace,
				});
			}
			return page.getAttribute(selector, attribute, {
				text,
				strictText,
				ignoreCase: s.ignoreCase,
				regex: s.regex,
				startsWith: s.startsWith,
				endsWith: s.endsWith,
				normalizeWhitespace: s.normalizeWhitespace,
			});
		}

		case "extractMultiple": {
			const s = step as ExtractMultipleStep;
			const containerSelector = interpolate(s.containerSelector, ctx);
			const filterText = s.filterText ? interpolate(s.filterText, ctx) : undefined;
			return page.evaluate(
				(cSel, fMap, maxItems, fText, fIgnore, fRegex) => {
					let containers = Array.from(document.querySelectorAll(cSel)) as HTMLElement[];
					if (fRegex) {
						const r = new RegExp(fRegex, fIgnore ? "i" : "");
						containers = containers.filter((c) => r.test(c.textContent || ""));
					} else if (fText) {
						const tNorm = fText.trim();
						const compT = fIgnore ? tNorm.toLowerCase() : tNorm;
						containers = containers.filter((c) => {
							const txt = c.textContent?.trim() || "";
							return (fIgnore ? txt.toLowerCase() : txt).includes(compT);
						});
					}
					containers = containers.slice(0, maxItems);
					return containers.map((container) => {
						const item: Record<string, string> = {};
						for (const [fieldKey, fieldDef] of Object.entries(fMap as Record<string, string>)) {
							if (fieldDef.includes("@")) {
								const [subSel, attr] = fieldDef.split("@");
								const targetEl = subSel ? container.querySelector(subSel) : container;
								item[fieldKey] = targetEl?.getAttribute(attr || "") || "";
							} else {
								const targetEl = container.querySelector(fieldDef);
								item[fieldKey] = targetEl?.textContent?.trim() || "";
							}
						}
						return item;
					});
				},
				containerSelector,
				s.fields,
				s.limit || 100,
				filterText,
				Boolean(s.filterIgnoreCase),
				s.filterRegex,
			);
		}

		case "screenshot": {
			const s = step as ScreenshotStep;
			const outDir = (ctx.outputDir as string) || "";
			const rawPath = s.path || join(outDir, `screenshot-${Date.now()}.png`);
			const path = interpolate(rawPath, ctx);
			await page.screenshot({ path, fullPage: s.fullPage });
			return path;
		}

		case "pdf": {
			const s = step as PDFStep;
			const outDir = (ctx.outputDir as string) || "";
			const rawPath = s.path || join(outDir, `document-${Date.now()}.pdf`);
			const path = interpolate(rawPath, ctx);
			await page.pdf({ path });
			return path;
		}

		case "block": {
			const s = step as BlockStep;
			await page.blockResources(s.types);
			return s.types;
		}

		case "eval": {
			const s = step as EvalStep;
			const code = interpolate(s.code || s.script || "", ctx);
			return page.evaluate(code);
		}

		case "assert": {
			const s = step as AssertStep;
			const selector = s.selector ? interpolate(s.selector, ctx) : undefined;
			const text = s.text ? interpolate(s.text, ctx) : undefined;
			const equals = s.equals ? interpolate(s.equals, ctx) : undefined;
			const contains = s.contains ? interpolate(s.contains, ctx) : undefined;
			const startsWith = s.startsWith ? interpolate(s.startsWith, ctx) : undefined;
			const endsWith = s.endsWith ? interpolate(s.endsWith, ctx) : undefined;
			const matches = s.matches ? interpolate(s.matches, ctx) : undefined;
			const strictText =
				typeof s.strictText === "string"
					? interpolate(s.strictText, ctx)
					: s.strictText !== undefined
						? s.strictText
						: equals
							? equals
							: text
								? true
								: undefined;

			return page.assertText(selector, {
				equals: typeof strictText === "string" ? strictText : equals,
				contains,
				startsWith,
				endsWith,
				matches,
				ignoreCase: s.ignoreCase,
				normalizeWhitespace: s.normalizeWhitespace,
				strictText,
				text,
				attribute: s.attribute,
				timeout: s.timeout,
			});
		}

		case "save": {
			const s = step as Record<string, unknown>;
			const outDir = (ctx.outputDir as string) || "";
			const rawPath = (s.path as string) || join(outDir, "extracted-data.json");
			const path = interpolate(rawPath, ctx);
			const format = s.format || (path.endsWith(".csv") ? "csv" : "json");
			const data = (ctx.extractedData || ctx) as Record<string, unknown>;

			if (format === "csv") {
				const csvRows: string[] = [];
				for (const k of Object.keys(data)) {
					const val = data[k];
					if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") {
						const headers = Object.keys(val[0]);
						csvRows.push(headers.join(","));
						for (const row of val) {
							csvRows.push(headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
						}
						break;
					}
				}
				await Bun.write(path, csvRows.join("\n") || "No tabular data");
			} else {
				await Bun.write(path, JSON.stringify(data, null, 2));
			}
			return path;
		}

		default:
			throw new Error(`Unknown flow action: ${action}`);
	}
}
