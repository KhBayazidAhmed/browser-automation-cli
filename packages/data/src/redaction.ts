const SENSITIVE_KEY = /(password|passwd|secret|token|api.?key|credential|otp|session)/i;

export function sensitiveValues(
	row: Record<string, unknown>,
	additionalColumns: string[] = [],
): string[] {
	const explicit = new Set(additionalColumns);
	return Object.entries(row)
		.filter(([key]) => explicit.has(key) || SENSITIVE_KEY.test(key))
		.map(([, value]) => String(value ?? ""))
		.filter((value) => value.length >= 4);
}

function redactString(value: string, secrets: string[]): string {
	const effectiveSecrets = secrets.filter((s) => typeof s === "string" && s.length >= 4);
	return effectiveSecrets.reduce(
		(current, secret) => current.replaceAll(secret, "[REDACTED]"),
		value,
	);
}

export function redactSensitive<T>(value: T, secrets: string[]): T {
	const effectiveSecrets = secrets.filter((s) => typeof s === "string" && s.length >= 4);
	if (!effectiveSecrets.length) return value;
	if (typeof value === "string") return redactString(value, effectiveSecrets) as T;
	if (Array.isArray(value))
		return value.map((item) => redactSensitive(item, effectiveSecrets)) as T;
	if (value && typeof value === "object") {
		const redacted: Record<string, unknown> = {};
		for (const [key, item] of Object.entries(value)) {
			redacted[key] = SENSITIVE_KEY.test(key)
				? "[REDACTED]"
				: redactSensitive(item, effectiveSecrets);
		}
		return redacted as T;
	}
	return value;
}
