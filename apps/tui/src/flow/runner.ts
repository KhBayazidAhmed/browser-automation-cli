import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Browser } from "../cdp/browser.js";
import { redactSensitive } from "../data/redaction.js";
import {
	mergeVariableScopes,
	referencedEnvironmentVariables,
	type VariableScopes,
} from "../data/variables.js";
import { OUTPUT_DIR } from "../runtime-paths.js";
import {
	logFlowStart,
	logFlowSummary,
	logStepFail,
	logStepPass,
	logStepStart,
} from "./runner-logger.js";
import { executeStep } from "./step-executor.js";
import type { FlowDefinition, FlowExecutionResult, StepExecutionResult } from "./types.js";
import { parseFlowDefinition } from "./validate.js";

function runFileStem(flowName: string): string {
	const safeName = flowName.toLowerCase().replace(/[^a-z0-9]/gi, "_") || "flow";
	const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	return `flow-${safeName}-${runId}`;
}

// biome-ignore lint/complexity/noStaticOnlyClass: Retained as the established public API.
export class FlowRunner {
	static async run(
		flow: FlowDefinition,
		overrideVars: Record<string, unknown> = {},
		options: {
			headless?: boolean;
			userDataDir?: string;
			profileDirectory?: string;
			variableScopes?: Omit<VariableScopes, "workflow" | "cli">;
			writeArtifacts?: boolean;
			redactValues?: string[];
		} = {},
	): Promise<FlowExecutionResult> {
		const outputDir = OUTPUT_DIR;
		if (!existsSync(outputDir)) {
			mkdirSync(outputDir, { recursive: true });
		}
		const extractedData: Record<string, unknown> = {};
		const stepResults: StepExecutionResult[] = [];
		const flowStart = performance.now();
		let validatedFlow: FlowDefinition;
		try {
			validatedFlow = parseFlowDefinition(flow);
		} catch (error) {
			const invalidResult: FlowExecutionResult = {
				flowName:
					flow && typeof flow === "object" && typeof flow.name === "string"
						? flow.name
						: "Invalid Flow",
				success: false,
				totalDurationMs: Math.round(performance.now() - flowStart),
				steps: stepResults,
				data: extractedData,
				error: error instanceof Error ? error.message : String(error),
			};
			if (options.writeArtifacts !== false) {
				const resultFile = join(outputDir, `${runFileStem(invalidResult.flowName)}-result.json`);
				await Bun.write(
					resultFile,
					JSON.stringify({ ...invalidResult, timestamp: new Date().toISOString() }, null, 2),
				);
			}
			return invalidResult;
		}
		const redactValues = [
			...new Set([
				...(options.redactValues || []),
				...referencedEnvironmentVariables(validatedFlow)
					.map((name) => process.env[name] || "")
					.filter(Boolean),
			]),
		];

		const variableScopes: VariableScopes = {
			...options.variableScopes,
			workflow: validatedFlow.variables,
			cli: overrideVars,
			system: {
				__sensitiveValues: redactValues,
				extractedData,
				outputDir,
				...options.variableScopes?.system,
			},
		};

		logFlowStart(validatedFlow.name, validatedFlow.description, validatedFlow.steps.length);

		const isHeadless = options.headless ?? validatedFlow.headless ?? true;
		let browser: Browser | null = null;
		let result: FlowExecutionResult;

		try {
			browser = await Browser.launch({
				headless: isHeadless,
				userDataDir: options.userDataDir,
				profileDirectory: options.profileDirectory,
			});
			const page = await browser.newPage();

			if (validatedFlow.blockMedia) {
				await page.blockResources(["image", "font", "media"]);
			}

			for (const [i, step] of validatedFlow.steps.entries()) {
				const stepName = step.name || `${step.action.toUpperCase()} Step ${i + 1}`;
				const stepStart = performance.now();

				logStepStart(i + 1, validatedFlow.steps.length, stepName);

				if (step.condition) {
					const cond = step.condition;
					let targetExists = false;
					try {
						const condSelector = cond.exists || cond.selector;
						const condText = cond.text;
						if (condSelector || condText) {
							targetExists = await page.waitForSelector(condSelector, {
								text: condText,
								timeout: 400,
							});
						}
					} catch {
						targetExists = false;
					}
					const matchesCondition = cond.not ? !targetExists : targetExists;
					if (!matchesCondition) {
						console.log("  ↷ \x1b[2mSkipped (condition not met)\x1b[0m");
						stepResults.push({
							stepIndex: i + 1,
							name: stepName,
							action: step.action,
							durationMs: 0,
							status: "skipped",
							success: true,
						});
						continue;
					}
				}

				const maxAttempts = step.retry?.maxAttempts ?? 1;
				const backoffMs = step.retry?.backoffMs ?? 500;
				let lastError: unknown;
				let stepSucceeded = false;
				let extractedResult: unknown;

				for (let attempt = 1; attempt <= maxAttempts; attempt++) {
					try {
						extractedResult = await executeStep(
							step,
							page,
							mergeVariableScopes({
								...variableScopes,
								step: {
									...variableScopes.step,
									...step.variables,
									...extractedData,
								},
							}),
						);
						stepSucceeded = true;
						break;
					} catch (err: unknown) {
						lastError = err;
						if (attempt < maxAttempts) {
							console.log(
								`  ↻ \x1b[33mRetry ${attempt}/${maxAttempts} for step ${i + 1} (${stepName})...\x1b[0m`,
							);
							await new Promise((r) => setTimeout(r, backoffMs));
						}
					}
				}

				const durationMs = Math.round(performance.now() - stepStart);

				if (stepSucceeded) {
					const s = step as Record<string, unknown>;
					if (extractedResult !== undefined && "as" in step && s.as) {
						extractedData[s.as as string] = extractedResult;
					}

					stepResults.push({
						stepIndex: i + 1,
						name: stepName,
						action: step.action,
						durationMs,
						success: true,
						status: "pass",
						extracted: extractedResult,
					});

					logStepPass(durationMs);
				} else {
					const rawError = lastError instanceof Error ? lastError.message : String(lastError);
					const errorMsg = redactSensitive(rawError, redactValues);

					if (step.optional || step.continueOnError) {
						console.log(`  ⚠️ \x1b[33mIgnored failure (optional step): ${errorMsg}\x1b[0m`);
						stepResults.push({
							stepIndex: i + 1,
							name: stepName,
							action: step.action,
							durationMs,
							success: false,
							status: "skipped",
							error: errorMsg,
						});
					} else {
						stepResults.push({
							stepIndex: i + 1,
							name: stepName,
							action: step.action,
							durationMs,
							success: false,
							status: "fail",
							error: errorMsg,
						});

						logStepFail(errorMsg);
						throw new Error(`Flow aborted at step ${i + 1} (${stepName}): ${errorMsg}`);
					}
				}
			}

			result = {
				flowName: validatedFlow.name,
				success: true,
				totalDurationMs: Math.round(performance.now() - flowStart),
				steps: stepResults,
				data: extractedData,
			};
		} catch (err: unknown) {
			const errorMsg = redactSensitive(
				err instanceof Error ? err.message : String(err),
				redactValues,
			);
			result = {
				flowName: validatedFlow.name,
				success: false,
				totalDurationMs: Math.round(performance.now() - flowStart),
				steps: stepResults,
				data: extractedData,
				error: errorMsg,
			};
		} finally {
			if (browser) {
				await browser.close();
			}
		}

		if (options.writeArtifacts === false) return result;
		const fileStem = runFileStem(validatedFlow.name);
		const resultFile = join(outputDir, `${fileStem}-result.json`);
		await Bun.write(
			resultFile,
			JSON.stringify({ ...result, timestamp: new Date().toISOString() }, null, 2),
		);
		let dataFile = "";
		if (Object.keys(extractedData).length > 0) {
			dataFile = join(outputDir, `${fileStem}-data.json`);
			await Bun.write(dataFile, JSON.stringify(extractedData, null, 2));
		}
		if (result.success) {
			logFlowSummary(result.totalDurationMs, extractedData, dataFile, resultFile);
		}
		return result;
	}
}
