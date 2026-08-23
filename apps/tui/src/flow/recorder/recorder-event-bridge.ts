import type { FlowStep } from "../types.js";

const SENSITIVE_NAME = /(password|passwd|secret|token|api.?key|credential|otp|one.?time)/i;
const RESERVED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function isSafeRecorderVariableKey(key: string): boolean {
	return /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(key) && !RESERVED_KEYS.has(key);
}

export function sanitizeRecorderValue(key: string, value: unknown): unknown {
	if (!SENSITIVE_NAME.test(key)) return value;
	if (typeof value === "string" && /^\{\{env\.[A-Z_][A-Z0-9_]*\}\}$/.test(value)) return value;
	const envKey = key
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
	return `{{env.${envKey || "RECORDED_SECRET"}}}`;
}

export function handleRecordedEvent(
	event: Record<string, unknown>,
	steps: FlowStep[],
	variables: Record<string, unknown>,
	setPaused: (paused: boolean) => void,
	triggerFinish: () => void,
) {
	const frame = (event.frame as string) || undefined;
	if (event.type === "pause") setPaused(true);
	else if (event.type === "resume") setPaused(false);
	else if (event.type === "undo") steps.pop();
	else if (event.type === "deleteStep") {
		const idx = event.index as number;
		if (typeof idx === "number" && idx >= 0 && idx < steps.length) {
			steps.splice(idx, 1);
		}
	} else if (event.type === "moveStep") {
		const { fromIndex, toIndex } = event as { fromIndex: number; toIndex: number };
		if (
			typeof fromIndex === "number" &&
			typeof toIndex === "number" &&
			steps[fromIndex] &&
			steps[toIndex]
		) {
			const item = steps.splice(fromIndex, 1)[0];
			if (item) steps.splice(toIndex, 0, item);
		}
	} else if (event.type === "addVariable") {
		const key = event.key as string;
		if (isSafeRecorderVariableKey(key)) variables[key] = sanitizeRecorderValue(key, event.value);
	} else if (event.type === "setVariables") {
		Object.keys(variables).forEach((k) => {
			delete variables[k];
		});
		const incoming = event.variables as Record<string, unknown>;
		for (const [key, value] of Object.entries(incoming || {})) {
			if (isSafeRecorderVariableKey(key)) variables[key] = sanitizeRecorderValue(key, value);
		}
	} else if (event.type === "click") {
		steps.push({
			name: event.text ? `Click "${event.text}"` : `Click ${event.selector}`,
			action: "click",
			frame,
			selector: event.selector as string,
			text: (event.text as string) || undefined,
			strictText: event.text ? true : undefined,
		});
	} else if (event.type === "type") {
		const hint = `${String(event.targetText || "")} ${String(event.selector || "")}`;
		steps.push({
			name: `Type into ${event.selector}`,
			action: "type",
			frame,
			selector: event.selector as string,
			text: sanitizeRecorderValue(hint, event.value) as string,
			targetText: (event.targetText as string) || undefined,
			strictText: true,
		});
	} else if (event.type === "extract") {
		steps.push({
			name: `Extract "${event.as}" from ${event.selector}`,
			action: "extract",
			frame,
			selector: event.selector as string,
			as: event.as as string,
		});
	} else if (event.type === "extractMultiple") {
		steps.push({
			name: `Extract List "${event.as}" from ${event.containerSelector}`,
			action: "extractMultiple",
			frame,
			containerSelector: event.containerSelector as string,
			as: event.as as string,
			limit: (event.limit as number) || 20,
			fields: (event.fields as Record<string, string>) || { title: "a", link: "a@href" },
		});
	} else if (event.type === "assert") {
		const assertVal = (event.equals ||
			event.text ||
			event.contains ||
			event.matches ||
			event.startsWith ||
			event.endsWith) as string;
		steps.push({
			name: (event.name as string) || `Assert ${event.selector} strictly equals "${assertVal}"`,
			action: "assert",
			frame,
			selector: event.selector as string,
			text: (event.text as string) || assertVal,
			equals: (event.equals as string) || (event.strictText ? assertVal : undefined),
			contains: (event.contains as string) || undefined,
			matches: (event.matches as string) || undefined,
			startsWith: (event.startsWith as string) || undefined,
			endsWith: (event.endsWith as string) || undefined,
			strictText: (event.strictText as boolean) ?? true,
		});
	} else if (event.type === "wait") {
		steps.push({
			name: (event.name as string) || `Wait ${event.durationMs}ms`,
			action: "wait",
			durationMs: (event.durationMs as number) || 1000,
		});
	} else if (event.type === "waitForSelector") {
		steps.push({
			name: (event.name as string) || `Wait for ${event.selector || event.text}`,
			action: "waitForSelector",
			frame,
			selector: (event.selector as string) || undefined,
			text: (event.text as string) || undefined,
			strictText: (event.strictText as boolean) || undefined,
		});
	} else if (event.type === "eval") {
		steps.push({
			name: (event.name as string) || "Eval JavaScript",
			action: "eval",
			frame,
			code: event.code as string,
			as: (event.as as string) || undefined,
		});
	} else if (event.type === "screenshot") {
		steps.push({
			name: `Capture Screenshot at Step ${steps.length + 1}`,
			action: "screenshot",
			path: (event.path as string) || `{{outputDir}}/screenshot-${Date.now()}.png`,
		});
	} else if (event.type === "goto") {
		steps.push({
			name: (event.name as string) || `Navigate to ${event.url}`,
			action: "goto",
			url: event.url as string,
		});
	} else if (event.type === "finish") {
		triggerFinish();
	}
}
