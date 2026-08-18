import type { Page } from "../cdp/page.js";
import { executeDomStep } from "./step-executor-dom.js";
import { executeExtractStep } from "./step-executor-extract.js";
import type { FlowStep } from "./types.js";

export function interpolate(
	text: string | undefined | null,
	vars: Record<string, unknown>,
): string {
	if (text === undefined || text === null) return "";
	return String(text).replace(/\{\{([^{}]+)\}\}/g, (_, key) => {
		const trimmed = key.trim();
		return vars[trimmed] !== undefined ? String(vars[trimmed]) : `{{${trimmed}}}`;
	});
}

export async function executeStep(
	step: FlowStep,
	page: Page,
	ctx: Record<string, unknown>,
): Promise<unknown> {
	const domResult = await executeDomStep(step.action, step, page, ctx, interpolate);
	if (domResult !== undefined) return domResult;
	return executeExtractStep(step.action, step, page, ctx, interpolate);
}
