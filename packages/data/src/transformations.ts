import { randomUUID } from "node:crypto";
import { DataError } from "./errors.js";

type Transform = (value: unknown, args: string[]) => unknown;

function stringify(value: unknown): string {
	return value === null || value === undefined ? "" : String(value);
}

function parseLiteral(value: string): unknown {
	const trimmed = value.trim();
	if (!trimmed) return "";
	try {
		return JSON.parse(trimmed);
	} catch {
		return trimmed.replace(/^(['"])(.*)\1$/, "$2");
	}
}

const transforms: Record<string, Transform> = {
	trim: (value) => stringify(value).trim(),
	lowercase: (value) => stringify(value).toLowerCase(),
	uppercase: (value) => stringify(value).toUpperCase(),
	replace: (value, [search = "", replacement = ""]) =>
		stringify(value).replaceAll(search, replacement),
	default: (value, args) =>
		value === undefined || value === null || value === "" ? args[0] : value,
	split: (value, [separator = ","]) => stringify(value).split(separator),
	join: (value, [separator = ","]) =>
		Array.isArray(value) ? value.join(separator) : stringify(value),
	uuid: () => randomUUID(),
	random: (_value, [length = "12"]) => {
		const size = Math.max(1, Math.min(128, Number(length) || 12));
		return Array.from({ length: size }, () => Math.random().toString(36)[2] || "0").join("");
	},
	date: (value) => new Date(value ? stringify(value) : Date.now()).toISOString(),
	formatdate: (value, [locale = "en-US", options]) => {
		const date = new Date(value ? stringify(value) : Date.now());
		const parsedOptions = options
			? (parseLiteral(options) as Intl.DateTimeFormatOptions)
			: undefined;
		return new Intl.DateTimeFormat(locale, parsedOptions).format(date);
	},
	json: (value) => JSON.stringify(value),
	urlencode: (value) => encodeURIComponent(stringify(value)),
};

function splitArguments(input: string): string[] {
	if (!input.trim()) return [];
	const argument = (raw: string) => {
		const trimmed = raw.trim();
		return /^(['"]).*\1$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
	};
	const result: string[] = [];
	let current = "";
	let quote = "";
	let depth = 0;
	for (const character of input) {
		if ((character === '"' || character === "'") && (!quote || quote === character)) {
			quote = quote ? "" : character;
			current += character;
		} else if (!quote && (character === "{" || character === "[" || character === "(")) {
			depth++;
			current += character;
		} else if (!quote && (character === "}" || character === "]" || character === ")")) {
			depth--;
			current += character;
		} else if (!quote && depth === 0 && character === ",") {
			result.push(argument(current));
			current = "";
		} else current += character;
	}
	result.push(argument(current));
	return result;
}

function parseTransformation(expression: string): { transform: Transform; args: string[] } {
	const match = expression.trim().match(/^([a-zA-Z][\w-]*)(?:\((.*)\))?$/);
	if (!match?.[1]) {
		throw new DataError(`Invalid transformation "${expression}"`, "DATA_VALIDATION_ERROR");
	}
	const name = match[1].toLowerCase();
	const transform = transforms[name];
	if (!transform) throw new DataError(`Unknown transformation "${name}"`, "DATA_VALIDATION_ERROR");
	return { transform, args: splitArguments(match[2] || "") };
}

export function validateTransformation(expression: string): void {
	parseTransformation(expression);
}

export function applyTransformation(value: unknown, expression: string): unknown {
	const { transform, args } = parseTransformation(expression);
	return transform(value, args);
}

export function applyTransformations(value: unknown, pipeline: string[]): unknown {
	return pipeline.reduce((current, expression) => applyTransformation(current, expression), value);
}
