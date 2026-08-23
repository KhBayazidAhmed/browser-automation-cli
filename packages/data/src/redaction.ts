const SENSITIVE_KEY = /(password|passwd|secret|token|api.?key|credential|otp|session)/i;

export function sensitiveValues(
	row: Record<string, unknown>,
	additionalColumns: string[] = [],
): string[] {
	const explicit = new Set(additionalColumns);
	return Object.entries(row)
		.filter(([key]) => explicit.has(key) || SENSITIVE_KEY.test(key))
		.map(([, value]) => String(value ?? ""))
		.filter((value) => value.length > 0);
}

function redactString(value: string, secrets: string[]): string {
	return secrets.reduce((current, secret) => current.replaceAll(secret, "[REDACTED]"), value);
}

export function redactSensitive<T>(value: T, secrets: string[]): T {
	if (!secrets.length) return value;
	if (typeof value === "string") return redactString(value, secrets) as T;
	if (Array.isArray(value)) return value.map((item) => redactSensitive(item, secrets)) as T;
	if (value && typeof value === "object") {
		const redacted: Record<string, unknown> = {};
		for (const [key, item] of Object.entries(value)) {
			redacted[key] = SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactSensitive(item, secrets);
		}
		return redacted as T;
	}
	return value;
}
