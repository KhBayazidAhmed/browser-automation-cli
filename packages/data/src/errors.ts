export type ExecutionErrorCode =
	| "AUTH_ERROR"
	| "PROVIDER_ERROR"
	| "RATE_LIMIT_ERROR"
	| "DATA_VALIDATION_ERROR"
	| "WORKFLOW_ERROR"
	| "BROWSER_ERROR"
	| "ASSERTION_ERROR"
	| "TIMEOUT_ERROR";

export class DataError extends Error {
	constructor(
		message: string,
		readonly code: ExecutionErrorCode,
		readonly retryable = false,
		readonly retryAfterMs?: number,
		override readonly cause?: unknown,
	) {
		super(message);
		this.name = "DataError";
	}
}

export function classifyExecutionError(error: unknown): DataError {
	if (error instanceof DataError) return error;
	const message = error instanceof Error ? error.message : String(error);
	if (
		/missing required (?:data columns?|variables?|environment variables?)|invalid transformation|unknown transformation/i.test(
			message,
		)
	) {
		return new DataError(message, "DATA_VALIDATION_ERROR", false, undefined, error);
	}
	if (/assert/i.test(message))
		return new DataError(message, "ASSERTION_ERROR", false, undefined, error);
	if (/timeout|timed out/i.test(message)) {
		return new DataError(message, "TIMEOUT_ERROR", true, undefined, error);
	}
	if (/browser|chrome|target closed|websocket/i.test(message)) {
		return new DataError(message, "BROWSER_ERROR", true, undefined, error);
	}
	return new DataError(message, "WORKFLOW_ERROR", false, undefined, error);
}
