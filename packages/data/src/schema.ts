import { DataError } from "./errors.js";
import type { DataColumn, DataRow, DataSchema, DataValue } from "./types.js";

const SENSITIVE_COLUMN = /(password|passwd|secret|token|api.?key|credential|otp|session)/i;

function inferType(values: DataValue[]): DataColumn["type"] {
	const present = values.filter((value) => value !== null && value !== "");
	if (present.length === 0) return "unknown";
	if (present.every((value) => typeof value === "boolean")) return "boolean";
	if (present.every((value) => typeof value === "number")) return "number";
	if (present.every((value) => typeof value === "object")) return "json";
	if (present.every((value) => typeof value === "string" && !Number.isNaN(Date.parse(value)))) {
		return "date";
	}
	return "string";
}

export function detectSchema(rows: DataRow[]): DataSchema {
	const names = [...new Set(rows.flatMap((row) => Object.keys(row.values)))];
	return {
		columns: names.map((name) => ({
			name,
			type: inferType(rows.map((row) => row.values[name] ?? null)),
			sensitive: SENSITIVE_COLUMN.test(name),
		})),
	};
}

export function assertRequiredColumns(schema: DataSchema, required: string[]): void {
	const present = new Set(schema.columns.map((column) => column.name));
	const missing = required.filter((name) => {
		if (present.has(name)) return false;
		const root = name.split(".")[0];
		return !root || !present.has(root);
	});
	if (missing.length) {
		throw new DataError(
			`Missing required data columns: ${missing.join(", ")}`,
			"DATA_VALIDATION_ERROR",
		);
	}
}
