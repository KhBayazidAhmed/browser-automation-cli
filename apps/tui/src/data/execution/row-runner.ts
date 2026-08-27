import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import type { FlowDefinition } from "../../flow/types.js";
import { OUTPUT_DIR } from "../../runtime-paths.js";
import { DataError } from "../errors.js";
import { redactSensitive, sensitiveValues } from "../redaction.js";
import { assertRequiredColumns } from "../schema.js";
import type { DataProvider, DataRow } from "../types.js";
import { referencedVariables, validateVariableExpressions } from "../variables.js";
import { executeWorkflowRow } from "./execute-row.js";
import { compileRowFilter } from "./filter.js";
import { ControlledResultWriter } from "./result-writer.js";
import { ExecutionStateStore } from "./state-store.js";
import type { RowExecutionOptions, RowExecutionRecord, RowExecutionSummary } from "./types.js";
import { recordWriteback } from "./writeback.js";

function workflowId(flow: FlowDefinition): string {
	const name = (flow.name || "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]/gi, "_");
	if (name) return name.slice(0, 32);
	return createHash("sha256").update(JSON.stringify(flow)).digest("hex").slice(0, 16);
}

function requiredRowColumns(flow: FlowDefinition, options: RowExecutionOptions): string[] {
	const known = new Set([
		...Object.keys(flow.variables || {}),
		...Object.keys(options.cliVariables || {}),
		...flow.steps.flatMap((step) => Object.keys(step.variables || {})),
		...flow.steps.flatMap((step) => {
			const output = (step as Record<string, unknown>).as;
			return typeof output === "string" && output ? [output] : [];
		}),
		"outputDir",
		"runId",
		"workflowId",
		"row",
	]);
	return referencedVariables({ variables: flow.variables, steps: flow.steps })
		.map((path) => (path.startsWith("row.") ? path.slice(4) : path))
		.filter((path) => path && !known.has(path.split(".")[0] || ""));
}

function shouldSkip(
	row: DataRow,
	previous: RowExecutionRecord | undefined,
	options: RowExecutionOptions,
): boolean {
	const sheetStatus = String(row.values.__automation_status || "").toLowerCase();
	const status = previous?.status || sheetStatus;
	if (!options.resume) return false;
	if (status === "completed") return true;
	if (status === "failed" && !options.retryFailed) return true;
	return false;
}

export class RowWorkflowRunner {
	constructor(
		private readonly provider: DataProvider,
		private readonly flow: FlowDefinition,
	) {}

	async run(options: RowExecutionOptions = {}): Promise<RowExecutionSummary> {
		const started = performance.now();
		const runId = randomUUID();
		const id = workflowId(this.flow);
		const state = new ExecutionStateStore(join(OUTPUT_DIR, `.automation-state-${id}.sqlite`));
		await state.load();
		await this.provider.connect();
		try {
			const schema = await this.provider.discoverSchema();
			validateVariableExpressions({ variables: this.flow.variables, steps: this.flow.steps });
			const effectiveOptions: RowExecutionOptions = {
				...options,
				sensitiveColumns: [
					...new Set([
						...(options.sensitiveColumns || []),
						...schema.columns.filter((column) => column.sensitive).map((column) => column.name),
					]),
				],
			};
			assertRequiredColumns(schema, [...new Set(requiredRowColumns(this.flow, effectiveOptions))]);
			const rows = this.selectedRows(effectiveOptions);
			if (effectiveOptions.dryRun)
				return await this.dryRun(rows, runId, id, started, effectiveOptions);
			return await this.execute(rows, state, runId, id, started, effectiveOptions);
		} finally {
			await this.provider.disconnect();
		}
	}

	private async *selectedRows(options: RowExecutionOptions): AsyncIterable<DataRow> {
		const matches = compileRowFilter(options.where);
		for await (const row of this.provider.rows({
			fromRow: options.fromRow,
			toRow: options.toRow,
			batchSize: options.batchSize,
		})) {
			if (options.signal?.aborted) break;
			if (matches(row)) yield row;
		}
	}

	private async dryRun(
		rows: AsyncIterable<DataRow>,
		runId: string,
		id: string,
		started: number,
		options: RowExecutionOptions,
	): Promise<RowExecutionSummary> {
		const previewRows: DataRow[] = [];
		let total = 0;
		for await (const row of rows) {
			total++;
			if (previewRows.length < 10) {
				const secrets = sensitiveValues(row.values, options.sensitiveColumns);
				previewRows.push(redactSensitive(row, secrets));
			}
		}
		return {
			runId,
			workflowId: id,
			total,
			completed: 0,
			failed: 0,
			skipped: 0,
			cancelled: 0,
			durationMs: Math.round(performance.now() - started),
			records: [],
			dryRun: true,
			interrupted: options.signal?.aborted || false,
			previewRows,
		};
	}

	private async execute(
		rows: AsyncIterable<DataRow>,
		state: ExecutionStateStore,
		runId: string,
		id: string,
		started: number,
		options: RowExecutionOptions,
	): Promise<RowExecutionSummary> {
		const records: RowExecutionRecord[] = [];
		const writer = new ControlledResultWriter(this.provider, Math.max(1, options.batchSize || 25));
		const active = new Set<Promise<void>>();
		const parallel = Math.max(1, Math.min(100, options.parallel || 1));
		let interrupted = false;
		if (parallel > 1 && options.userDataDir) {
			throw new DataError(
				"Parallel row execution cannot share one browser profile. Use --parallel=1 with --profile/--user-data-dir, or omit the profile for isolated temporary workers.",
				"DATA_VALIDATION_ERROR",
			);
		}
		for await (const row of rows) {
			if (options.signal?.aborted) {
				interrupted = true;
				break;
			}
			const previous = state.get(row.id);
			if (options.resume && previous?.writebackPending) {
				const pendingRecord: RowExecutionRecord = previous.result
					? { ...previous, status: "completed", error: undefined }
					: previous;
				await writer.enqueue({
					rowId: row.id,
					values: recordWriteback(pendingRecord, options.resultMapping),
				});
				records.push(pendingRecord);
				continue;
			}
			if (shouldSkip(row, previous, options)) {
				const skipped: RowExecutionRecord = {
					rowId: row.id,
					rowIndex: row.index,
					runId,
					workflowId: id,
					status: "skipped",
					attempts: previous?.attempts || Number(row.values.__automation_attempts || 0),
				};
				records.push(skipped);
				options.onProgress?.(skipped);
				continue;
			}
			const task = executeWorkflowRow(row, previous, state, writer, runId, id, this.flow, options)
				.then((record) => {
					records.push(record);
				})
				.finally(() => active.delete(task));
			active.add(task);
			if (active.size >= parallel) await Promise.race(active);
		}
		await Promise.all(active);
		interrupted ||= options.signal?.aborted || false;
		await writer.flush();
		for (const [index, record] of records.entries()) {
			if (record.status === "skipped") continue;
			const failure = writer.failure(record.rowId);
			const finalRecord: RowExecutionRecord = failure
				? {
						...record,
						...(record.status === "completed"
							? {
									status: "failed" as const,
									error: { type: failure.code, message: failure.message },
								}
							: {}),
						writebackPending: true,
					}
				: { ...record, writebackPending: false };
			records[index] = finalRecord;
			await state.set(finalRecord);
			options.onProgress?.(finalRecord);
		}
		const count = (status: RowExecutionRecord["status"]) =>
			records.filter((record) => record.status === status).length;
		return {
			runId,
			workflowId: id,
			total: records.length,
			completed: count("completed"),
			failed: count("failed"),
			skipped: count("skipped"),
			cancelled: count("cancelled"),
			durationMs: Math.round(performance.now() - started),
			records,
			dryRun: false,
			interrupted,
		};
	}
}
