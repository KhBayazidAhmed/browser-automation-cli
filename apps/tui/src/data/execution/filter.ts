import { DataError } from "../errors.js";
import type { DataRow } from "../types.js";
import { getNestedValue } from "../variables.js";

export function compileRowFilter(expression?: string): (row: DataRow) => boolean {
	if (!expression) return () => true;
	const match = expression.match(/^\s*([A-Za-z_][\w.-]*)\s*(==|=|!=|>=|<=|>|<|~)\s*(.*?)\s*$/);
	if (!match?.[1] || !match[2]) {
		throw new DataError(`Invalid --where expression "${expression}"`, "DATA_VALIDATION_ERROR");
	}
	const [, path, operator, expected = ""] = match;
	return (row) => {
		const actual = getNestedValue(row.values, path);
		if (operator === "~")
			return String(actual ?? "")
				.toLowerCase()
				.includes(expected.toLowerCase());
		if (operator === "=" || operator === "==") return String(actual ?? "") === expected;
		if (operator === "!=") return String(actual ?? "") !== expected;
		const left = Number(actual);
		const right = Number(expected);
		if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
		if (operator === ">") return left > right;
		if (operator === "<") return left < right;
		if (operator === ">=") return left >= right;
		return left <= right;
	};
}
