import { DataError } from "./errors.js";
import { applyTransformations, validateTransformation } from "./transformations.js";

export interface VariableScopes {
	system?: Record<string, unknown>;
	cli?: Record<string, unknown>;
	workflow?: Record<string, unknown>;
	row?: Record<string, unknown>;
	step?: Record<string, unknown>;
}

const RESERVED_PATH_PARTS = new Set(["__proto__", "prototype", "constructor"]);

function splitPipeline(expression: string): string[] {
	const result: string[] = [];
	let current = "";
	let quote = "";
	let depth = 0;
	for (const character of expression) {
		if ((character === '"' || character === "'") && (!quote || quote === character)) {
			quote = quote ? "" : character;
			current += character;
		} else if (!quote && (character === "{" || character === "[" || character === "(")) {
			depth++;
			current += character;
		} else if (!quote && (character === "}" || character === "]" || character === ")")) {
			depth--;
			current += character;
		} else if (!quote && depth === 0 && character === "|") {
			result.push(current.trim());
			current = "";
		} else {
			current += character;
		}
	}
	result.push(current.trim());
	return result;
}

export function mergeVariableScopes(scopes: VariableScopes): Record<string, unknown> {
	return {
		...scopes.step,
		...scopes.row,
		...scopes.workflow,
		...scopes.cli,
		...scopes.system,
	};
}

export function getNestedValue(input: unknown, path: string): unknown {
	let current = input;
	const parts = path.split(".");
	for (const [index, part] of parts.entries()) {
		if (!part || RESERVED_PATH_PARTS.has(part)) return undefined;
		if (!current || typeof current !== "object") return undefined;
		const remaining = parts.slice(index).join(".");
		if (Object.hasOwn(current, remaining)) {
			return (current as Record<string, unknown>)[remaining];
		}
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

function resolveExpression(expression: string, vars: Record<string, unknown>): unknown {
	const [rawPath = "", ...pipeline] = splitPipeline(expression);
	let value: unknown;
	if (rawPath.startsWith("env.")) {
		const envName = rawPath.slice(4);
		value = process.env[envName];
		if (value === undefined) {
			throw new DataError(
				`Missing required environment variable "${envName}"`,
				"DATA_VALIDATION_ERROR",
			);
		}
	} else {
		value = getNestedValue(vars, rawPath);
	}
	return applyTransformations(value, pipeline);
}

export function interpolateVariables(
	text: string | undefined | null,
	vars: Record<string, unknown>,
	strict = false,
): string {
	if (text === undefined || text === null) return "";
	return String(text).replace(/\{\{([\s\S]*?)\}\}/g, (placeholder, expression) => {
		const value = resolveExpression(expression, vars);
		if (value === undefined || (strict && value === null)) {
			if (strict) {
				throw new DataError(
					`Missing required variable "${expression.trim()}"`,
					"DATA_VALIDATION_ERROR",
				);
			}
			return placeholder;
		}
		return typeof value === "string" ? value : JSON.stringify(value);
	});
}

export function referencedVariables(value: unknown): string[] {
	const found = new Set<string>();
	const visit = (item: unknown): void => {
		if (typeof item === "string") {
			for (const match of item.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
				const path = splitPipeline(match[1] || "")[0]?.trim();
				if (path && !path.startsWith("env.") && !path.startsWith("system.")) found.add(path);
			}
		} else if (Array.isArray(item)) item.forEach(visit);
		else if (item && typeof item === "object") Object.values(item).forEach(visit);
	};
	visit(value);
	return [...found];
}

export function referencedEnvironmentVariables(value: unknown): string[] {
	const found = new Set<string>();
	const visit = (item: unknown): void => {
		if (typeof item === "string") {
			for (const match of item.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
				const path = splitPipeline(match[1] || "")[0]?.trim();
				if (path?.startsWith("env.") && path.length > 4) found.add(path.slice(4));
			}
		} else if (Array.isArray(item)) {
			item.forEach(visit);
		} else if (item && typeof item === "object") {
			Object.values(item).forEach(visit);
		}
	};
	visit(value);
	return [...found];
}

export function validateVariableExpressions(value: unknown): void {
	const visit = (item: unknown): void => {
		if (typeof item === "string") {
			for (const match of item.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
				const [path = "", ...pipeline] = splitPipeline(match[1] || "");
				if (!path) {
					throw new DataError("Variable expression cannot be empty", "DATA_VALIDATION_ERROR");
				}
				if (path.startsWith("env.") && process.env[path.slice(4)] === undefined) {
					throw new DataError(
						`Missing required environment variable "${path.slice(4)}"`,
						"DATA_VALIDATION_ERROR",
					);
				}
				for (const expression of pipeline) validateTransformation(expression);
			}
			const remainder = item.replace(/\{\{([\s\S]*?)\}\}/g, "");
			if (remainder.includes("{{")) {
				throw new DataError(`Malformed variable expression in "${item}"`, "DATA_VALIDATION_ERROR");
			}
		} else if (Array.isArray(item)) {
			item.forEach(visit);
		} else if (item && typeof item === "object") {
			Object.values(item).forEach(visit);
		}
	};
	visit(value);
}
