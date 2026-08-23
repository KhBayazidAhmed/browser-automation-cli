import { isAbsolute, relative, resolve } from "node:path";
import type { FlowStep } from "../flow/types.js";
import type { BrowserObservation } from "./types.js";

export function isPathWithin(root: string, target: string): boolean {
	const pathFromRoot = relative(resolve(root), resolve(target));
	return pathFromRoot === "" || (!pathFromRoot.startsWith("..") && !isAbsolute(pathFromRoot));
}

export function traceSafeResult(step: FlowStep, result: unknown): unknown {
	if (step.action === "type" || step.action === "eval") return "[redacted]";
	return result;
}

export function traceSafeStep(step: FlowStep): FlowStep {
	if (step.action === "type") {
		return {
			...step,
			text: /^\{\{[^{}]+\}\}$/.test(step.text) ? step.text : "[redacted]",
		};
	}
	if (step.action === "eval") {
		return {
			...step,
			code: step.code ? "[redacted]" : undefined,
			script: step.script ? "[redacted]" : undefined,
		};
	}
	return step;
}

export function fallbackObservation(url: string): BrowserObservation {
	return {
		timestamp: new Date().toISOString(),
		url,
		title: "",
		visibleText: "",
		elements: [],
		frames: [],
	};
}
