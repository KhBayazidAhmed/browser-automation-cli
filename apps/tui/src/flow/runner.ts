import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Browser } from "../cdp/browser.js";
import {
	logFlowStart,
	logFlowSummary,
	logStepFail,
	logStepPass,
	logStepStart,
} from "./runner-logger.js";
import { executeStep } from "./step-executor.js";
import type { FlowDefinition, FlowExecutionResult, StepExecutionResult } from "./types.js";

export class FlowRunner {
	static async run(
		flow: FlowDefinition,
		overrideVars: Record<string, unknown> = {},
		options: {
			headless?: boolean;
			userDataDir?: string;
			profileDirectory?: string;
		} = {},
	): Promise<FlowExecutionResult> {
		const outputDir = join(process.cwd(), "output");
		if (!existsSync(outputDir)) {
			mkdirSync(outputDir, { recursive: true });
		}

		const variables: Record<string, unknown> = {
			...flow.variables,
			...overrideVars,
		};

		const extractedData: Record<string, unknown> = {};
		const stepResults: StepExecutionResult[] = [];
		const flowStart = performance.now();

		logFlowStart(flow.name, flow.description, flow.steps.length);

		const isHeadless = options.headless ?? flow.headless ?? true;
		let browser: Browser | null = null;

		try {
			browser = await Browser.launch({
				headless: isHeadless,
				userDataDir: options.userDataDir,
				profileDirectory: options.profileDirectory,
			});
			const page = await browser.newPage();

			if (flow.blockMedia) {
				await page.blockResources(["image", "font", "media"]);
			}

			for (let i = 0; i < flow.steps.length; i++) {
				const step = flow.steps[i]!;
				const stepName = step.name || `${step.action.toUpperCase()} Step ${i + 1}`;
				const stepStart = performance.now();

				logStepStart(i + 1, flow.steps.length, stepName);

				try {
					const extracted = await executeStep(step, page, {
						...variables,
						...extractedData,
						extractedData,
						outputDir,
					});

					const s = step as Record<string, unknown>;
					if (extracted !== undefined && "as" in step && s.as) {
						extractedData[s.as as string] = extracted;
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

					logStepPass(durationMs);
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

					logStepFail(errorMsg);
					throw new Error(`Flow aborted at step ${i + 1} (${stepName}): ${errorMsg}`);
				}
			}

			const totalDuration = Math.round(performance.now() - flowStart);
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

			let dataFile = "";
			if (Object.keys(extractedData).length > 0) {
				dataFile = join(outputDir, `flow-${sanitizedName}-data.json`);
				await Bun.write(dataFile, JSON.stringify(extractedData, null, 2));
			}

			logFlowSummary(totalDuration, extractedData, dataFile, resultFile);

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
}
