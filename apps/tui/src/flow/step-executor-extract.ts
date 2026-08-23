import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Page } from "../cdp/page.js";
import { redactSensitive } from "../data/redaction.js";
import { resolveTuiPath } from "../runtime-paths.js";
import { serializeCsv } from "./csv.js";
import { captureSecurePdf, captureSecureScreenshot } from "./screenshot-security.js";
import type {
	AssertStep,
	BlockStep,
	EvalStep,
	ExtractMultipleStep,
	ExtractStep,
	FlowStep,
	PDFStep,
	SaveStep,
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
			const rawText = s.text ? interpolate(s.text, ctx) : undefined;
			const frame = s.frame ? interpolate(s.frame, ctx) : undefined;
			const rawStrict =
				typeof s.strictText === "string" ? interpolate(s.strictText, ctx) : s.strictText;
			const matchOptions = {
				frame,
				text: rawText,
				strictText: rawStrict,
				ignoreCase: s.ignoreCase,
				regex: s.regex,
				startsWith: s.startsWith,
				endsWith: s.endsWith,
				normalizeWhitespace: s.normalizeWhitespace,
				timeout: s.timeout,
			};
			await page.waitForSelector(selector, matchOptions);
			if (s.all) {
				const allSelector = selector || "*";
				return s.attribute
					? page.getMultipleAttribute(allSelector, s.attribute, matchOptions)
					: page.getMultipleText(allSelector, matchOptions);
			}
			return s.attribute
				? page.getAttribute(selector, s.attribute, matchOptions)
				: page.getText(selector, matchOptions);
		}

		case "extractMultiple": {
			const s = step as ExtractMultipleStep;
			const containerSelector = interpolate(s.containerSelector, ctx);
			const filterText = s.filterText ? interpolate(s.filterText, ctx) : undefined;
			const frameIdentifier = s.frame ? interpolate(s.frame, ctx) : undefined;
			const targetFrame = frameIdentifier
				? await page.frameManager.resolveFrame(frameIdentifier)
				: page.mainFrame();

			return targetFrame.evaluate(
				(
					cSel: string,
					fMap: Record<string, string>,
					maxItems: number,
					fText?: string,
					fIgnore?: boolean,
					fRegex?: string,
				) => {
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
						for (const [fieldKey, fieldDef] of Object.entries(fMap || {})) {
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
				s.limit ?? 100,
				filterText,
				Boolean(s.filterIgnoreCase),
				s.filterRegex,
			);
		}

		case "eval": {
			const s = step as EvalStep;
			const code = s.code || s.script || "";
			let interpolatedCode = interpolate(code, ctx);
			const frameIdentifier = s.frame ? interpolate(s.frame, ctx) : undefined;
			if (s.selector) {
				const selector = interpolate(s.selector, ctx);
				const target = frameIdentifier
					? await page.frameManager.resolveFrame(frameIdentifier)
					: page.mainFrame();
				await target.waitForSelector(selector);
				interpolatedCode = `(() => {\nconst element = document.querySelector(${JSON.stringify(selector)});\n${interpolatedCode}\n})()`;
			}
			if (frameIdentifier) {
				const f = await page.frameManager.resolveFrame(frameIdentifier);
				return f.evaluate(interpolatedCode);
			}
			return page.evaluate(interpolatedCode);
		}

		case "block": {
			const s = step as BlockStep;
			const types = (s.types || ["image", "media", "font"]).map(String);
			return page.blockResources(types);
		}
		case "screenshot": {
			const s = step as ScreenshotStep;
			let clip: { x: number; y: number; width: number; height: number; scale?: number } | undefined;
			if (s.selector) {
				const selector = interpolate(s.selector, ctx);
				const frame = s.frame
					? await page.frameManager.resolveFrame(interpolate(s.frame, ctx))
					: null;
				const target = frame || page.mainFrame();
				await target.waitForSelector(selector);
				clip = await target.evaluate((sel: string) => {
					const element = document.querySelector(sel);
					if (!element) return undefined;
					element.scrollIntoView({ block: "center", inline: "center" });
					const rect = element.getBoundingClientRect();
					let x = rect.left;
					let y = rect.top;
					let current: Window = window;
					while (current !== current.top) {
						try {
							const frameElement = current.frameElement;
							if (frameElement) {
								const frameRect = frameElement.getBoundingClientRect();
								x += frameRect.left;
								y += frameRect.top;
							}
							current = current.parent;
						} catch {
							break;
						}
					}
					x += current.scrollX;
					y += current.scrollY;
					return { x, y, width: rect.width, height: rect.height, scale: 1 };
				}, selector);
				if (!clip || clip.width <= 0 || clip.height <= 0) {
					throw new Error(`Cannot capture screenshot for invisible selector "${selector}"`);
				}
			}
			const secrets = Array.isArray(ctx.__sensitiveValues) ? ctx.__sensitiveValues.map(String) : [];
			const shotBuffer = await captureSecureScreenshot(page, secrets, {
				fullPage: clip ? false : s.fullPage,
				clip,
			});
			if (s.path) {
				const outPath = resolveTuiPath(interpolate(s.path, ctx));
				await mkdir(dirname(outPath), { recursive: true });
				await writeFile(outPath, shotBuffer);
				return { savedTo: outPath };
			}
			return shotBuffer;
		}

		case "pdf": {
			const s = step as PDFStep;
			const secrets = Array.isArray(ctx.__sensitiveValues) ? ctx.__sensitiveValues.map(String) : [];
			const pdfBuffer = await captureSecurePdf(page, secrets);
			if (s.path) {
				const outPath = resolveTuiPath(interpolate(s.path, ctx));
				await mkdir(dirname(outPath), { recursive: true });
				await writeFile(outPath, pdfBuffer);
				return { savedTo: outPath };
			}
			return pdfBuffer;
		}

		case "assert": {
			const s = step as AssertStep;
			const selector = s.selector ? interpolate(s.selector, ctx) : undefined;
			const rawText = s.text ? interpolate(s.text, ctx) : undefined;
			const frame = s.frame ? interpolate(s.frame, ctx) : undefined;
			const rawStrict =
				typeof s.strictText === "string" ? interpolate(s.strictText, ctx) : s.strictText;
			const rawEquals = s.equals ? interpolate(s.equals, ctx) : undefined;
			const rawContains = s.contains ? interpolate(s.contains, ctx) : undefined;
			const rawStarts = s.startsWith ? interpolate(s.startsWith, ctx) : undefined;
			const rawEnds = s.endsWith ? interpolate(s.endsWith, ctx) : undefined;
			const rawMatches = s.matches ? interpolate(s.matches, ctx) : undefined;

			return page.assertText(selector, {
				frame,
				text: rawText,
				strictText: rawStrict,
				equals: rawEquals,
				contains: rawContains,
				startsWith: rawStarts,
				endsWith: rawEnds,
				matches: rawMatches,
				ignoreCase: s.ignoreCase,
				normalizeWhitespace: s.normalizeWhitespace,
				attribute: s.attribute,
				timeout: s.timeout,
			});
		}

		case "save": {
			const s = step as SaveStep;
			const defaultPath = s.format === "csv" ? "{{outputDir}}/data.csv" : "{{outputDir}}/data.json";
			const outPath = resolveTuiPath(interpolate(s.path || defaultPath, ctx));
			await mkdir(dirname(outPath), { recursive: true });
			const data =
				ctx.extractedData && typeof ctx.extractedData === "object"
					? (ctx.extractedData as Record<string, unknown>)
					: {};
			const secrets = Array.isArray(ctx.__sensitiveValues) ? ctx.__sensitiveValues.map(String) : [];
			const safeData = redactSensitive(data, secrets);
			const content =
				s.format === "csv" ? serializeCsv(safeData) : JSON.stringify(safeData, null, 2);
			await writeFile(outPath, content, "utf-8");
			return { savedTo: outPath };
		}

		default:
			throw new Error(`Unhandled step action in dispatch: ${(step as FlowStep).action}`);
	}
}
