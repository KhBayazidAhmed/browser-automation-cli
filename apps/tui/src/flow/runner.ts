import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Browser } from "../cdp/browser.js";
import type { Page } from "../cdp/page.js";
import type {
	AssertStep,
	BlockStep,
	ClickStep,
	EvalStep,
	ExtractMultipleStep,
	ExtractStep,
	FlowDefinition,
	FlowExecutionResult,
	FlowStep,
	GotoStep,
	PDFStep,
	ScreenshotStep,
	StepExecutionResult,
	TypeStep,
	WaitForSelectorStep,
	WaitStep,
} from "./types.js";

const colors = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	green: "\x1b[32m",
	red: "\x1b[31m",
	yellow: "\x1b[33m",
	cyan: "\x1b[36m",
	magenta: "\x1b[35m",
};

export class FlowRunner {
	private static interpolate(
		text: string | undefined | null,
		vars: Record<string, any>,
	): string {
		if (text === undefined || text === null) return "";
		return String(text).replace(/\{\{([^{}]+)\}\}/g, (_, key) => {
			const trimmed = key.trim();
			return vars[trimmed] !== undefined
				? String(vars[trimmed])
				: `{{${trimmed}}}`;
		});
	}

	static async run(
		flow: FlowDefinition,
		overrideVars: Record<string, any> = {},
		options: { headless?: boolean } = {},
	): Promise<FlowExecutionResult> {
		const outputDir = join(process.cwd(), "output");
		if (!existsSync(outputDir)) {
			mkdirSync(outputDir, { recursive: true });
		}

		const variables: Record<string, any> = {
			...flow.variables,
			...overrideVars,
		};

		const extractedData: Record<string, any> = {};
		const stepResults: StepExecutionResult[] = [];
		const flowStart = performance.now();

		console.log(
			`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════════════${colors.reset}`,
		);
		console.log(
			`  🌊 Executing Flow: ${colors.bold}${flow.name}${colors.reset}`,
		);
		if (flow.description) {
			console.log(`  📝 ${flow.description}`);
		}
		console.log(`  🔢 Total Steps: ${flow.steps.length}`);
		console.log(
			`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════════════${colors.reset}\n`,
		);

		const isHeadless = options.headless ?? flow.headless ?? true;
		let browser: Browser | null = null;

		try {
			browser = await Browser.launch({ headless: isHeadless });
			const page = await browser.newPage();

			if (flow.blockMedia) {
				await page.blockResources(["image", "font", "media"]);
			}

			for (let i = 0; i < flow.steps.length; i++) {
				const step = flow.steps[i]!;
				const stepName =
					step.name || `${step.action.toUpperCase()} Step ${i + 1}`;
				const stepStart = performance.now();

				process.stdout.write(
					`  [${i + 1}/${flow.steps.length}] ${stepName}... `,
				);

				try {
					const extracted = await FlowRunner.executeStep(step, page, {
						...variables,
						...extractedData,
						outputDir,
					});

					if (extracted !== undefined && "as" in step && (step as any).as) {
						extractedData[(step as any).as] = extracted;
					}

					const durationMs = Math.round(performance.now() - stepStart);
					stepResults.push({
						stepIndex: i + 1,
						name: stepName,
						action: step.action,
						durationMs,
						success: true,
						extracted,
					});

					console.log(
						`${colors.green}✓ PASS${colors.reset} ${colors.dim}(${durationMs}ms)${colors.reset}`,
					);
				} catch (err: unknown) {
					const durationMs = Math.round(performance.now() - stepStart);
					const errorMsg = err instanceof Error ? err.message : String(err);
					stepResults.push({
						stepIndex: i + 1,
						name: stepName,
						action: step.action,
						durationMs,
						success: false,
						error: errorMsg,
					});

					console.log(`${colors.red}✗ FAIL${colors.reset}`);
					console.log(`    ${colors.red}↳ ${errorMsg}${colors.reset}`);

					throw new Error(
						`Flow aborted at step ${i + 1} (${stepName}): ${errorMsg}`,
					);
				}
			}

			const totalDuration = Math.round(performance.now() - flowStart);

			// 1. Save complete flow execution result
			const sanitizedName = flow.name.toLowerCase().replace(/[^a-z0-9]/gi, "_");
			const resultFile = join(outputDir, `flow-${sanitizedName}-result.json`);
			await Bun.write(
				resultFile,
				JSON.stringify(
					{
						flow: flow.name,
						timestamp: new Date().toISOString(),
						durationMs: totalDuration,
						data: extractedData,
					},
					null,
					2,
				),
			);

			// 2. Also save standalone clean extracted data JSON file
			const dataKeys = Object.keys(extractedData);
			let dataFile = "";
			if (dataKeys.length > 0) {
				dataFile = join(outputDir, `flow-${sanitizedName}-data.json`);
				await Bun.write(dataFile, JSON.stringify(extractedData, null, 2));
			}

			console.log(
				`\n${colors.green}${colors.bold}✓ Flow completed successfully in ${totalDuration}ms!${colors.reset}`,
			);

			if (dataKeys.length > 0) {
				console.log(
					`\n${colors.bold}${colors.cyan}📊 Extracted Data Summary (${dataKeys.length} items):${colors.reset}`,
				);
				for (const key of dataKeys) {
					const val = extractedData[key];
					if (Array.isArray(val)) {
						console.log(
							`  • ${colors.bold}${key}${colors.reset}: [${val.length} items]`,
						);
						if (val.length > 0 && typeof val[0] === "object") {
							console.log(
								`    ${colors.dim}Preview: ${JSON.stringify(val[0])}${colors.reset}`,
							);
						}
					} else {
						console.log(`  • ${colors.bold}${key}${colors.reset}: "${val}"`);
					}
				}
				if (dataFile) {
					console.log(
						`\n  💾 ${colors.bold}Clean Data File:${colors.reset} ${colors.green}${dataFile}${colors.reset}`,
					);
				}
			}

			console.log(
				`  📋 ${colors.bold}Full Run Report:${colors.reset} ${resultFile}\n`,
			);

			return {
				flowName: flow.name,
				success: true,
				totalDurationMs: totalDuration,
				steps: stepResults,
				data: extractedData,
			};
		} catch (err: unknown) {
			const totalDuration = Math.round(performance.now() - flowStart);
			const errorMsg = err instanceof Error ? err.message : String(err);

			return {
				flowName: flow.name,
				success: false,
				totalDurationMs: totalDuration,
				steps: stepResults,
				data: extractedData,
				error: errorMsg,
			};
		} finally {
			if (browser) {
				await browser.close();
			}
		}
	}

	private static async executeStep(
		step: FlowStep,
		page: Page,
		ctx: Record<string, any>,
	): Promise<any> {
		switch (step.action) {
			case "goto": {
				const s = step as GotoStep;
				const targetUrl = FlowRunner.interpolate(s.url, ctx);
				await page.goto(targetUrl, {
					waitUntil: s.waitUntil || "domcontentloaded",
					timeout: s.timeout,
				});
				return targetUrl;
			}

			case "click": {
				const s = step as ClickStep;
				const selector = s.selector
					? FlowRunner.interpolate(s.selector, ctx)
					: undefined;
				const text = s.text ? FlowRunner.interpolate(s.text, ctx) : undefined;
				const strictText =
					typeof s.strictText === "string"
						? FlowRunner.interpolate(s.strictText, ctx)
						: s.strictText !== undefined
							? s.strictText
							: text
								? true
								: undefined;
				await page.click(selector, {
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
				const selector = s.selector
					? FlowRunner.interpolate(s.selector, ctx)
					: undefined;
				const text = FlowRunner.interpolate(s.text, ctx);
				const targetText = s.targetText
					? FlowRunner.interpolate(s.targetText, ctx)
					: undefined;
				const strictText =
					typeof s.strictText === "string"
						? FlowRunner.interpolate(s.strictText, ctx)
						: s.strictText;
				await page.type(selector, text, {
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
				const selector = s.selector
					? FlowRunner.interpolate(s.selector, ctx)
					: undefined;
				const text = s.text ? FlowRunner.interpolate(s.text, ctx) : undefined;
				const strictText =
					typeof s.strictText === "string"
						? FlowRunner.interpolate(s.strictText, ctx)
						: s.strictText !== undefined
							? s.strictText
							: text
								? true
								: undefined;
				await page.waitForSelector(selector, {
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

			case "extract": {
				const s = step as ExtractStep;
				const selector = s.selector
					? FlowRunner.interpolate(s.selector, ctx)
					: undefined;
				const text = s.text ? FlowRunner.interpolate(s.text, ctx) : undefined;
				const strictText =
					typeof s.strictText === "string"
						? FlowRunner.interpolate(s.strictText, ctx)
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
					const val = await page.getText(selector, {
						text,
						strictText,
						ignoreCase: s.ignoreCase,
						regex: s.regex,
						startsWith: s.startsWith,
						endsWith: s.endsWith,
						normalizeWhitespace: s.normalizeWhitespace,
					});
					return val;
				}
				const val = await page.getAttribute(selector, attribute, {
					text,
					strictText,
					ignoreCase: s.ignoreCase,
					regex: s.regex,
					startsWith: s.startsWith,
					endsWith: s.endsWith,
					normalizeWhitespace: s.normalizeWhitespace,
				});
				return val;
			}

			case "extractMultiple": {
				const s = step as ExtractMultipleStep;
				const containerSelector = FlowRunner.interpolate(
					s.containerSelector,
					ctx,
				);
				const filterText = s.filterText
					? FlowRunner.interpolate(s.filterText, ctx)
					: undefined;
				const fields = s.fields;
				const limit = s.limit || 100;
				const filterIgnoreCase = Boolean(s.filterIgnoreCase);
				const filterRegex = s.filterRegex;

				return page.evaluate(
					(cSel, fMap, maxItems, fText, fIgnore, fRegex) => {
						let containers = Array.from(
							document.querySelectorAll(cSel),
						) as HTMLElement[];
						if (fRegex) {
							const r = new RegExp(fRegex, fIgnore ? "i" : "");
							containers = containers.filter((c) =>
								r.test(c.textContent || ""),
							);
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
							for (const [fieldKey, fieldDef] of Object.entries(
								fMap as Record<string, string>,
							)) {
								if (fieldDef.includes("@")) {
									const [subSel, attr] = fieldDef.split("@");
									const targetEl = subSel
										? container.querySelector(subSel)
										: container;
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
					fields,
					limit,
					filterText,
					filterIgnoreCase,
					filterRegex,
				);
			}

			case "screenshot": {
				const s = step as ScreenshotStep;
				const rawPath =
					s.path || join(ctx.outputDir, `screenshot-${Date.now()}.png`);
				const path = FlowRunner.interpolate(rawPath, ctx);
				await page.screenshot({ path, fullPage: s.fullPage });
				return path;
			}

			case "pdf": {
				const s = step as PDFStep;
				const rawPath =
					s.path || join(ctx.outputDir, `document-${Date.now()}.pdf`);
				const path = FlowRunner.interpolate(rawPath, ctx);
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
				let code = FlowRunner.interpolate(s.code || s.script || "", ctx);
				if (
					code.includes("return ") &&
					!code.trim().startsWith("(") &&
					!code.trim().startsWith("function")
				) {
					code = `(() => { ${code} })()`;
				}
				return page.evaluate(code);
			}

			case "assert": {
				const s = step as AssertStep;
				const selector = s.selector
					? FlowRunner.interpolate(s.selector, ctx)
					: undefined;
				const text = s.text ? FlowRunner.interpolate(s.text, ctx) : undefined;
				const equals = s.equals
					? FlowRunner.interpolate(s.equals, ctx)
					: undefined;
				const contains = s.contains
					? FlowRunner.interpolate(s.contains, ctx)
					: undefined;
				const startsWith = s.startsWith
					? FlowRunner.interpolate(s.startsWith, ctx)
					: undefined;
				const endsWith = s.endsWith
					? FlowRunner.interpolate(s.endsWith, ctx)
					: undefined;
				const matches = s.matches
					? FlowRunner.interpolate(s.matches, ctx)
					: undefined;
				const strictText =
					typeof s.strictText === "string"
						? FlowRunner.interpolate(s.strictText, ctx)
						: s.strictText !== undefined
							? s.strictText
							: equals
								? equals
								: text
									? true
									: undefined;

				const actual = await page.assertText(selector, {
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

				return actual;
			}

			case "save": {
				const s = step as any;
				const rawPath = s.path || join(ctx.outputDir, "extracted-data.json");
				const path = FlowRunner.interpolate(rawPath, ctx);
				const format = s.format || (path.endsWith(".csv") ? "csv" : "json");

				if (format === "csv") {
					const data = ctx.extractedData || ctx;
					const csvRows: string[] = [];
					for (const k of Object.keys(data)) {
						const val = data[k];
						if (
							Array.isArray(val) &&
							val.length > 0 &&
							typeof val[0] === "object"
						) {
							const headers = Object.keys(val[0]);
							csvRows.push(headers.join(","));
							for (const row of val) {
								csvRows.push(
									headers.map((h) => JSON.stringify(row[h] ?? "")).join(","),
								);
							}
							break;
						}
					}
					await Bun.write(path, csvRows.join("\n") || "No tabular data");
				} else {
					await Bun.write(
						path,
						JSON.stringify(ctx.extractedData || ctx, null, 2),
					);
				}
				return path;
			}

			default:
				throw new Error(`Unknown flow action: ${(step as any).action}`);
		}
	}
}
