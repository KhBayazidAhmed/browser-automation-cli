import type { FlowExecutionResult } from "../../flow/types.js";
import type { ExecutionErrorCode } from "../errors.js";
import type { DataRow } from "../types.js";

export type RowExecutionStatus =
	| "pending"
	| "running"
	| "completed"
	| "failed"
	| "skipped"
	| "cancelled";

export interface RowExecutionRecord {
	rowId: string;
	rowIndex: number;
	runId: string;
	workflowId: string;
	status: RowExecutionStatus;
	attempts: number;
	startedAt?: string;
	completedAt?: string;
	durationMs?: number;
	error?: { type: ExecutionErrorCode; message: string };
	result?: FlowExecutionResult;
	writebackPending?: boolean;
}

export interface RowExecutionOptions {
	parallel?: number;
	batchSize?: number;
	fromRow?: number;
	toRow?: number;
	where?: string;
	resume?: boolean;
	retryFailed?: boolean;
	retryCount?: number;
	dryRun?: boolean;
	headless?: boolean;
	userDataDir?: string;
	profileDirectory?: string;
	cliVariables?: Record<string, unknown>;
	resultMapping?: Record<string, string>;
	sensitiveColumns?: string[];
	onProgress?: (record: RowExecutionRecord) => void;
	signal?: AbortSignal;
}

export interface RowExecutionSummary {
	runId: string;
	workflowId: string;
	total: number;
	completed: number;
	failed: number;
	skipped: number;
	cancelled: number;
	durationMs: number;
	records: RowExecutionRecord[];
	dryRun: boolean;
	interrupted: boolean;
	previewRows?: DataRow[];
}
