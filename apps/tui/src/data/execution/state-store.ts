import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { RowExecutionRecord } from "./types.js";

export class ExecutionStateStore {
	private db: Database | null = null;
	private inMemoryFallback: Record<string, RowExecutionRecord> = {};

	constructor(readonly path: string) {}

	async load(): Promise<void> {
		try {
			await mkdir(dirname(this.path), { recursive: true });
			const dbPath = this.path.endsWith(".json")
				? this.path.replace(/\.json$/, ".sqlite")
				: this.path;
			this.db = new Database(dbPath, { create: true });
			this.db.run("PRAGMA journal_mode = WAL;");
			this.db.run("PRAGMA synchronous = NORMAL;");
			this.db.run(`
				CREATE TABLE IF NOT EXISTS row_records (
					row_id TEXT PRIMARY KEY,
					row_index INTEGER,
					run_id TEXT,
					workflow_id TEXT,
					status TEXT,
					attempts INTEGER,
					started_at TEXT,
					completed_at TEXT,
					duration_ms INTEGER,
					error_json TEXT,
					result_json TEXT,
					writeback_pending INTEGER,
					updated_at TEXT
				);
			`);
		} catch {
			this.db = null;
		}
	}

	get(rowId: string): RowExecutionRecord | undefined {
		if (!this.db) return this.inMemoryFallback[rowId];
		try {
			const query = this.db.query("SELECT * FROM row_records WHERE row_id = ?");
			const row = query.get(rowId) as Record<string, unknown> | null;
			if (!row) return undefined;
			return this.deserialize(row);
		} catch {
			return this.inMemoryFallback[rowId];
		}
	}

	async set(record: RowExecutionRecord): Promise<void> {
		this.inMemoryFallback[record.rowId] = record;
		if (!this.db) return;
		try {
			const stmt = this.db.prepare(`
				INSERT INTO row_records (
					row_id, row_index, run_id, workflow_id, status, attempts,
					started_at, completed_at, duration_ms, error_json, result_json,
					writeback_pending, updated_at
				) VALUES (
					?, ?, ?, ?, ?, ?,
					?, ?, ?, ?, ?,
					?, ?
				)
				ON CONFLICT(row_id) DO UPDATE SET
					row_index = excluded.row_index,
					run_id = excluded.run_id,
					workflow_id = excluded.workflow_id,
					status = excluded.status,
					attempts = excluded.attempts,
					started_at = excluded.started_at,
					completed_at = excluded.completed_at,
					duration_ms = excluded.duration_ms,
					error_json = excluded.error_json,
					result_json = excluded.result_json,
					writeback_pending = excluded.writeback_pending,
					updated_at = excluded.updated_at;
			`);

			stmt.run(
				record.rowId,
				record.rowIndex,
				record.runId,
				record.workflowId,
				record.status,
				record.attempts,
				record.startedAt || null,
				record.completedAt || null,
				record.durationMs || null,
				record.error ? JSON.stringify(record.error) : null,
				record.result ? JSON.stringify(record.result) : null,
				record.writebackPending ? 1 : 0,
				new Date().toISOString(),
			);
		} catch {
			// In-memory fallback is already updated
		}
	}

	private deserialize(row: Record<string, unknown>): RowExecutionRecord {
		return {
			rowId: String(row.row_id),
			rowIndex: Number(row.row_index),
			runId: String(row.run_id),
			workflowId: String(row.workflow_id),
			status: String(row.status) as RowExecutionRecord["status"],
			attempts: Number(row.attempts),
			startedAt: row.started_at ? String(row.started_at) : undefined,
			completedAt: row.completed_at ? String(row.completed_at) : undefined,
			durationMs: row.duration_ms !== null ? Number(row.duration_ms) : undefined,
			error: row.error_json
				? (JSON.parse(String(row.error_json)) as RowExecutionRecord["error"])
				: undefined,
			result: row.result_json
				? (JSON.parse(String(row.result_json)) as RowExecutionRecord["result"])
				: undefined,
			writebackPending: Boolean(row.writeback_pending),
		};
	}

	close(): void {
		if (this.db) {
			try {
				this.db.close();
			} catch {}
			this.db = null;
		}
	}
}
