import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Page } from "../cdp/page.js";
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
			return page.getText(selector, {
				frame,
				text: rawText,
				strictText: rawStrict,
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
				Number(s.limit) || 100,
				filterText,
				Boolean(s.filterIgnoreCase),
				s.filterRegex,
			);
		}

		case "eval": {
			const s = step as EvalStep;
			const code = s.code || s.script || "";
			const interpolatedCode = interpolate(code, ctx);
			const frameIdentifier = s.frame ? interpolate(s.frame, ctx) : undefined;
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
			const shotBuffer = await page.screenshot({
				fullPage: s.fullPage,
			});
			if (s.path) {
				const outPath = interpolate(s.path, ctx);
				await mkdir(dirname(outPath), { recursive: true });
				await writeFile(outPath, shotBuffer);
				return { savedTo: outPath };
			}
			return shotBuffer;
		}

		case "pdf": {
			const s = step as PDFStep;
			const pdfBuffer = await page.pdf();
			if (s.path) {
				const outPath = interpolate(s.path, ctx);
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
			const outPath = interpolate(s.path || "{{outputDir}}/data.json", ctx);
			await mkdir(dirname(outPath), { recursive: true });
			const content = JSON.stringify(ctx, null, 2);
			await writeFile(outPath, content, "utf-8");
			return { savedTo: outPath };
		}

		default:
			throw new Error(`Unhandled step action in dispatch: ${(step as FlowStep).action}`);
	}
}
