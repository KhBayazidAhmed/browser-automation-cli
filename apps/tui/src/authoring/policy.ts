import type { FlowStep } from "../flow/types.js";

const HIGH_IMPACT_PATTERN =
	/\b(delete|remove|purchase|buy|pay|place\s+order|submit|send|publish|confirm|book|transfer|approve)\b/i;
const SENSITIVE_TARGET_PATTERN =
	/(password|passwd|secret|token|api.?key|credential|otp|one.?time)/i;
const ENV_REFERENCE_PATTERN = /^\{\{env\.[A-Z_][A-Z0-9_]*\}\}$/;

function normalizeDomain(value: string): string {
	return value.trim().toLowerCase().replace(/^\.+/, "");
}

export function isDomainAllowed(url: string, allowedDomains: string[]): boolean {
	const parsed = new URL(url);
	if (parsed.protocol === "about:" || parsed.protocol === "data:") return true;
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
	const hostname = parsed.hostname.toLowerCase();
	return allowedDomains.some((domain) => {
		const normalized = normalizeDomain(domain);
		return hostname === normalized || hostname.endsWith(`.${normalized}`);
	});
}

export function assertDomainAllowed(url: string, allowedDomains: string[]): void {
	if (!isDomainAllowed(url, allowedDomains)) {
		throw new Error(`Navigation to "${url}" is outside the allowed domains`);
	}
}

export function stepRequiresConfirmation(step: FlowStep): boolean {
	if (step.action === "eval") return true;
	if (step.action !== "click") return false;
	const candidate = [step.name, step.selector, step.text, step.strictText]
		.filter((value): value is string => typeof value === "string")
		.join(" ");
	return HIGH_IMPACT_PATTERN.test(candidate);
}

export function validateActionPolicy(
	step: FlowStep,
	allowedDomains: string[],
	confirmed: boolean,
): void {
	if (step.action === "goto") assertDomainAllowed(step.url, allowedDomains);
	if (step.action === "type") {
		const target = [step.name, step.selector, step.targetText].filter(Boolean).join(" ");
		if (SENSITIVE_TARGET_PATTERN.test(target) && !ENV_REFERENCE_PATTERN.test(step.text)) {
			throw new Error(
				"Sensitive inputs must use an environment reference such as {{env.ACCOUNT_PASSWORD}}.",
			);
		}
	}
	if (stepRequiresConfirmation(step) && !confirmed) {
		throw new Error(
			"This action may cause an external side effect. Retry only after the user explicitly confirms it.",
		);
	}
}

export function validatePublishedVariables(variables: Record<string, unknown> = {}): void {
	for (const key of Object.keys(variables)) {
		if (!SENSITIVE_TARGET_PATTERN.test(key)) continue;
		throw new Error(
			`Omit sensitive workflow variable "${key}" and reference {{env.${key.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}}} directly in the step instead.`,
		);
	}
}
