import type { DataValue } from "../types.js";
import { getNestedValue } from "../variables.js";
import type { RowExecutionRecord } from "./types.js";

function value(input: unknown): DataValue {
	if (input === undefined) return null;
	if (
		input === null ||
		typeof input === "string" ||
		typeof input === "number" ||
		typeof input === "boolean"
	)
		return input;
	return JSON.parse(JSON.stringify(input)) as DataValue;
}

export function recordWriteback(
	record: RowExecutionRecord,
	mapping: Record<string, string> = {},
): Record<string, DataValue> {
	const result = record.result;
	const values: Record<string, DataValue> = {
		__automation_status: record.status,
		__automation_run_id: record.runId,
		__automation_started_at: record.startedAt || null,
		__automation_completed_at: record.completedAt || null,
		__automation_duration_ms: record.durationMs ?? null,
		__automation_attempts: record.attempts,
		__automation_result: result ? JSON.stringify(result.data) : null,
		__automation_error_type: record.error?.type || null,
		__automation_error: record.error?.message || null,
	};
	for (const [column, path] of Object.entries(mapping))
		values[column] = value(getNestedValue(result, path));
	return values;
}
