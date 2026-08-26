import type { Page } from "../cdp/page.js";
import { redactSensitive } from "../data/redaction.js";
import { mergeVariableScopes, type VariableScopes } from "../data/variables.js";
import type { FlowDebugger } from "./debugger.js";
import { logStepFail, logStepPass, logStepSkipped, logStepStart } from "./runner-logger.js";
import { executeStep } from "./step-executor.js";
import type { FlowStep, StepExecutionResult } from "./types.js";

export interface StepLoopParams {
	steps: FlowStep[];
	page: Page;
	variableScopes: VariableScopes;
	redactValues: string[];
	extractedData: Record<string, unknown>;
	stepResults: StepExecutionResult[];
	debug: FlowDebugger | null;
}

function trimResultsFrom(stepResults: StepExecutionResult[], position: number) {
	while (
		stepResults.length > 0 &&
		(stepResults[stepResults.length - 1]?.stepIndex ?? 0) >= position
	) {
		stepResults.pop();
	}
}

export async function runStepLoop({
	steps,
	page,
	variableScopes,
	redactValues,
	extractedData,
	stepResults,
	debug,
}: StepLoopParams): Promise<void> {
	let i = 0;
	while (i < steps.length) {
		const step = steps[i];
		if (!step) break;
		const stepNumber = i + 1;
		const stepName = step.name || `${step.action.toUpperCase()} Step ${i + 1}`;
		const promptCtx = { index: stepNumber, total: steps.length, name: stepName, step };
		const stepStart = performance.now();

		if (debug) {
			const decision = await debug.beforeStep(promptCtx);
			if (decision === "abort") {
				throw new Error(`Flow aborted by user at step ${stepNumber} (${stepName})`);
			}
			if (decision === "back") {
				i -= 1;
				trimResultsFrom(stepResults, i + 1);
				continue;
			}
			if (decision === "skip") {
				logStepSkipped("by user");
				stepResults.push({
					stepIndex: stepNumber,
					name: stepName,
					action: step.action,
					durationMs: 0,
					success: true,
					status: "skipped",
				});
				i += 1;
				continue;
			}
		}

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
					stepIndex: stepNumber,
					name: stepName,
					action: step.action,
					durationMs: 0,
					status: "skipped",
					success: true,
				});
				i += 1;
				continue;
			}
		}

		logStepStart(i + 1, steps.length, stepName);

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
						`  ↻ \x1b[33mRetry ${attempt}/${maxAttempts} for step ${stepNumber} (${stepName})...\x1b[0m`,
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
				stepIndex: stepNumber,
				name: stepName,
				action: step.action,
				durationMs,
				success: true,
				status: "pass",
				extracted: extractedResult,
			});

			logStepPass(durationMs);
			i += 1;
		} else {
			const rawError = lastError instanceof Error ? lastError.message : String(lastError);
			const errorMsg = redactSensitive(rawError, redactValues);

			if (step.optional || step.continueOnError) {
				console.log(`  ⚠️ \x1b[33mIgnored failure (optional step): ${errorMsg}\x1b[0m`);
				stepResults.push({
					stepIndex: stepNumber,
					name: stepName,
					action: step.action,
					durationMs,
					success: false,
					status: "skipped",
					error: errorMsg,
				});
				i += 1;
				continue;
			}

			stepResults.push({
				stepIndex: stepNumber,
				name: stepName,
				action: step.action,
				durationMs,
				success: false,
				status: "fail",
				error: errorMsg,
			});

			logStepFail(errorMsg);

			if (debug) {
				const recovery = await debug.onFailure(promptCtx, errorMsg);
				if (recovery === "abort") {
					throw new Error(`Flow aborted at step ${stepNumber} (${stepName}): ${errorMsg}`);
				}
				if (recovery === "skip") {
					const failedEntry = stepResults[stepResults.length - 1];
					if (failedEntry) failedEntry.status = "skipped";
					logStepSkipped("by user after failure");
					i += 1;
					continue;
				}
				trimResultsFrom(stepResults, stepNumber);
				if (recovery === "back") i -= 1;
				continue;
			}

			throw new Error(`Flow aborted at step ${stepNumber} (${stepName}): ${errorMsg}`);
		}
	}
}
