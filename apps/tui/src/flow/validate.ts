import type { FlowActionType, FlowDefinition } from "./types.js";

const ACTIONS = new Set<FlowActionType>([
	"goto",
	"click",
	"type",
	"wait",
	"waitForSelector",
	"extract",
	"extractMultiple",
	"screenshot",
	"pdf",
	"block",
	"eval",
	"assert",
	"save",
]);
const RESOURCE_TYPES = new Set(["image", "stylesheet", "font", "media", "script"]);
const MATCHERS = ["selector", "text", "regex", "startsWith", "endsWith"];

function hasString(value: Record<string, unknown>, key: string): boolean {
	return typeof value[key] === "string" && (value[key] as string).length > 0;
}

function assertOptionalString(value: Record<string, unknown>, key: string, label: string): void {
	if (value[key] !== undefined && typeof value[key] !== "string") {
		throw new Error(`${label} has non-string "${key}"`);
	}
}

function assertOptionalBoolean(value: Record<string, unknown>, key: string, label: string): void {
	if (value[key] !== undefined && typeof value[key] !== "boolean") {
		throw new Error(`${label} has non-boolean "${key}"`);
	}
}

function assertOptionalTimeout(value: Record<string, unknown>, label: string): void {
	if (
		value.timeout !== undefined &&
		(typeof value.timeout !== "number" || !Number.isFinite(value.timeout) || value.timeout < 0)
	) {
		throw new Error(`${label} has invalid "timeout"`);
	}
}

export function parseFlowDefinition(value: unknown): FlowDefinition {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error("Flow must be a JSON object");
	}
	const flow = value as Record<string, unknown>;
	if (!hasString(flow, "name")) throw new Error('Flow requires a non-empty string "name"');
	if (!Array.isArray(flow.steps)) throw new Error('Flow requires a "steps" array');
	if (
		flow.variables !== undefined &&
		(!flow.variables || typeof flow.variables !== "object" || Array.isArray(flow.variables))
	) {
		throw new Error('Flow "variables" must be an object');
	}
	assertOptionalString(flow, "description", "Flow");
	assertOptionalString(flow, "version", "Flow");
	assertOptionalBoolean(flow, "headless", "Flow");
	assertOptionalBoolean(flow, "blockMedia", "Flow");

	for (const [index, rawStep] of flow.steps.entries()) {
		const label = `Step ${index + 1}`;
		if (!rawStep || typeof rawStep !== "object" || Array.isArray(rawStep)) {
			throw new Error(`${label} must be an object`);
		}
		const step = rawStep as Record<string, unknown>;
		if (typeof step.action !== "string" || !ACTIONS.has(step.action as FlowActionType)) {
			throw new Error(`${label} has unsupported action "${String(step.action)}"`);
		}
		for (const key of ["name", "frame", "text", "regex", "startsWith", "endsWith"]) {
			assertOptionalString(step, key, label);
		}
		for (const key of ["ignoreCase", "normalizeWhitespace"]) {
			assertOptionalBoolean(step, key, label);
		}
		if (
			step.strictText !== undefined &&
			typeof step.strictText !== "boolean" &&
			typeof step.strictText !== "string"
		) {
			throw new Error(`${label} has invalid "strictText"`);
		}
		assertOptionalTimeout(step, label);

		switch (step.action as FlowActionType) {
			case "goto":
				if (!hasString(step, "url")) throw new Error(`${label} (goto) requires "url"`);
				if (
					step.waitUntil !== undefined &&
					!["load", "domcontentloaded", "networkidle"].includes(String(step.waitUntil))
				) {
					throw new Error(`${label} (goto) has invalid "waitUntil"`);
				}
				break;
			case "click":
			case "waitForSelector":
				if (!MATCHERS.some((key) => hasString(step, key)) && typeof step.strictText !== "string") {
					throw new Error(`${label} (${step.action}) requires a selector or text matcher`);
				}
				break;
			case "type":
				if (typeof step.text !== "string")
					throw new Error(`${label} (type) requires string "text"`);
				if (
					!["selector", "targetText", "regex", "startsWith", "endsWith"].some((key) =>
						hasString(step, key),
					)
				) {
					throw new Error(`${label} (type) requires "selector" or "targetText"`);
				}
				assertOptionalBoolean(step, "clearFirst", label);
				break;
			case "wait":
				if (
					typeof step.durationMs !== "number" ||
					!Number.isFinite(step.durationMs) ||
					step.durationMs < 0
				) {
					throw new Error(`${label} (wait) requires a non-negative finite "durationMs"`);
				}
				break;
			case "extract":
				if (!hasString(step, "as")) throw new Error(`${label} (extract) requires "as"`);
				if (!MATCHERS.some((key) => hasString(step, key)) && typeof step.strictText !== "string") {
					throw new Error(`${label} (extract) requires a selector or text matcher`);
				}
				assertOptionalString(step, "attribute", label);
				assertOptionalBoolean(step, "all", label);
				break;
			case "extractMultiple":
				if (!hasString(step, "as") || !hasString(step, "containerSelector")) {
					throw new Error(`${label} (extractMultiple) requires "as" and "containerSelector"`);
				}
				if (!step.fields || typeof step.fields !== "object" || Array.isArray(step.fields)) {
					throw new Error(`${label} (extractMultiple) requires a "fields" object`);
				}
				if (
					Object.keys(step.fields as object).length === 0 ||
					Object.values(step.fields as object).some(
						(field) => typeof field !== "string" || field.length === 0,
					)
				) {
					throw new Error(`${label} (extractMultiple) fields must be non-empty strings`);
				}
				if (
					step.limit !== undefined &&
					(!Number.isInteger(step.limit) || (step.limit as number) <= 0)
				) {
					throw new Error(`${label} (extractMultiple) "limit" must be a positive integer`);
				}
				assertOptionalString(step, "filterText", label);
				assertOptionalString(step, "filterRegex", label);
				assertOptionalBoolean(step, "filterIgnoreCase", label);
				break;
			case "block":
				if (
					!Array.isArray(step.types) ||
					step.types.length === 0 ||
					step.types.some((type) => !RESOURCE_TYPES.has(String(type)))
				) {
					throw new Error(`${label} (block) requires valid resource "types"`);
				}
				break;
			case "eval":
				if (!hasString(step, "code") && !hasString(step, "script")) {
					throw new Error(`${label} (eval) requires "code" or "script"`);
				}
				assertOptionalString(step, "selector", label);
				assertOptionalString(step, "as", label);
				break;
			case "assert":
				if (
					!["text", "equals", "contains", "startsWith", "endsWith", "matches", "strictText"].some(
						(key) => typeof step[key] === "string",
					)
				) {
					throw new Error(`${label} (assert) requires an assertion condition`);
				}
				for (const key of ["selector", "equals", "contains", "matches", "attribute"]) {
					assertOptionalString(step, key, label);
				}
				break;
			case "screenshot":
				assertOptionalString(step, "path", label);
				assertOptionalString(step, "selector", label);
				assertOptionalBoolean(step, "fullPage", label);
				break;
			case "pdf":
				assertOptionalString(step, "path", label);
				break;
			case "save":
				assertOptionalString(step, "path", label);
				if (step.format !== undefined && step.format !== "json" && step.format !== "csv") {
					throw new Error(`${label} (save) has invalid "format"`);
				}
				break;
		}
	}

	return value as FlowDefinition;
}
