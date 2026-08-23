import type { DataValue } from "../../types.js";

export function columnName(index: number): string {
	let value = index + 1;
	let result = "";
	while (value > 0) {
		value--;
		result = String.fromCharCode(65 + (value % 26)) + result;
		value = Math.floor(value / 26);
	}
	return result;
}

export function columnIndex(name: string): number {
	let result = 0;
	for (const character of name.toUpperCase()) {
		if (character >= "A" && character <= "Z") {
			result = result * 26 + character.charCodeAt(0) - 64;
		}
	}
	return Math.max(0, result - 1);
}

export function rowValues(
	headers: string[],
	cells: Array<string | number | boolean>,
): Record<string, DataValue> {
	const values: Record<string, DataValue> = {};
	for (const [index, header] of headers.entries()) {
		if (header) values[header] = cells[index] ?? null;
	}
	return values;
}

export function normalizeHeaders(cells: Array<string | number | boolean>): string[] {
	const seen = new Map<string, number>();
	return cells.map((cell, index) => {
		const base = String(cell || `column_${index + 1}`).trim();
		const count = seen.get(base) || 0;
		seen.set(base, count + 1);
		return count === 0 ? base : `${base}_${count + 1}`;
	});
}

export function extractOutputPath(input: unknown, path: string): unknown {
	let current = input;
	for (const part of path.split(".")) {
		if (!current || typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}
