import { FlowRunner } from "../../flow/runner.js";
import type { FlowDefinition } from "../../flow/types.js";
import { OUTPUT_DIR } from "../../runtime-paths.js";
import { classifyExecutionError } from "../errors.js";
import { redactSensitive, sensitiveValues } from "../redaction.js";
import type { DataRow } from "../types.js";
import { referencedEnvironmentVariables } from "../variables.js";
import type { ControlledResultWriter } from "./result-writer.js";
import type { ExecutionStateStore } from "./state-store.js";
import type { RowExecutionOptions, RowExecutionRecord } from "./types.js";
import { recordWriteback } from "./writeback.js";

export async function executeWorkflowRow(
	row: DataRow,
	previous: RowExecutionRecord | undefined,
	state: ExecutionStateStore,
	writer: ControlledResultWriter,
	runId: string,
	workflowId: string,
	flow: FlowDefinition,
	options: RowExecutionOptions,
): Promise<RowExecutionRecord> {
	const startedAt = new Date().toISOString();
	const started = performance.now();
	const secrets = [
		...new Set([
			...sensitiveValues(row.values, options.sensitiveColumns),
			...referencedEnvironmentVariables({ variables: flow.variables, steps: flow.steps })
				.map((name) => process.env[name] || "")
				.filter(Boolean),
		]),
	];
	let attempts = previous?.attempts || Number(row.values.__automation_attempts || 0);
	let record: RowExecutionRecord = {
		rowId: row.id,
		rowIndex: row.index,
		runId,
		workflowId,
		status: "running",
		attempts,
		startedAt,
	};
	await state.set(record);
	options.onProgress?.(record);
	if (options.signal?.aborted) {
		record = { ...record, status: "cancelled", completedAt: new Date().toISOString() };
		await finishRow(record, row, state, writer, options);
		return record;
	}
	const maxAttempts = Math.max(1, (options.retryCount || 0) + 1);
	for (let current = 0; current < maxAttempts; current++) {
		attempts++;
		try {
			const result = await FlowRunner.run(flow, options.cliVariables || {}, {
				headless: options.headless,
				userDataDir: options.userDataDir,
				profileDirectory: options.profileDirectory,
				variableScopes: {
					row: { ...row.values, row: row.values },
					system: {
						__strictVariables: true,
						outputDir: OUTPUT_DIR,
						runId,
						workflowId,
						__sensitiveValues: secrets,
					},
				},
				writeArtifacts: false,
				redactValues: secrets,
			});
			if (!result.success) throw new Error(result.error || "Workflow failed");
			record = {
				...record,
				status: "completed",
				attempts,
				completedAt: new Date().toISOString(),
				durationMs: Math.round(performance.now() - started),
				result: redactSensitive(result, secrets),
			};
			break;
		} catch (error) {
			const typed = classifyExecutionError(error);
			record = {
				...record,
				status: "failed",
				attempts,
				completedAt: new Date().toISOString(),
				durationMs: Math.round(performance.now() - started),
				error: {
					type: typed.code,
					message: redactSensitive(typed.message, secrets),
				},
			};
			if (current + 1 < maxAttempts && typed.retryable) {
				await Bun.sleep(Math.min(10_000, 250 * 2 ** current));
			} else break;
		}
	}
	await finishRow(record, row, state, writer, options);
	return record;
}

async function finishRow(
	record: RowExecutionRecord,
	row: DataRow,
	state: ExecutionStateStore,
	writer: ControlledResultWriter,
	options: RowExecutionOptions,
): Promise<void> {
	record.writebackPending = true;
	await state.set(record);
	await writer.enqueue({
		rowId: row.id,
		values: recordWriteback(record, options.resultMapping),
	});
}
