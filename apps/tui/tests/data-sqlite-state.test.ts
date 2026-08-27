import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { ExecutionStateStore } from "../src/data/execution/state-store.js";
import type { RowExecutionRecord } from "../src/data/execution/types.js";
import { OUTPUT_DIR } from "../src/runtime-paths.js";

describe("SQLite Execution State Store (PR 2)", () => {
	const testDbPath = join(OUTPUT_DIR, `.test-state-${Date.now()}.sqlite`);
	let store: ExecutionStateStore;

	beforeEach(async () => {
		store = new ExecutionStateStore(testDbPath);
		await store.load();
	});

	afterEach(() => {
		store.close();
		if (existsSync(testDbPath)) {
			try {
				unlinkSync(testDbPath);
			} catch {}
		}
	});

	test("1. stores and retrieves row records atomically", async () => {
		const record1: RowExecutionRecord = {
			rowId: "row-101",
			rowIndex: 2,
			runId: "run-abc",
			workflowId: "wf-main",
			status: "completed",
			attempts: 1,
			startedAt: new Date().toISOString(),
			completedAt: new Date().toISOString(),
			durationMs: 450,
			writebackPending: false,
		};

		await store.set(record1);

		const retrieved = store.get("row-101");
		expect(retrieved).toBeDefined();
		expect(retrieved?.rowId).toBe("row-101");
		expect(retrieved?.status).toBe("completed");
		expect(retrieved?.durationMs).toBe(450);
	});

	test("2. performs upsert on conflict without data loss", async () => {
		const initial: RowExecutionRecord = {
			rowId: "row-102",
			rowIndex: 3,
			runId: "run-1",
			workflowId: "wf-1",
			status: "failed",
			attempts: 1,
			error: { type: "TIMEOUT_ERROR", message: "Timeout" },
			writebackPending: true,
		};

		await store.set(initial);
		expect(store.get("row-102")?.status).toBe("failed");
		expect(store.get("row-102")?.attempts).toBe(1);

		const updated: RowExecutionRecord = {
			...initial,
			status: "completed",
			attempts: 2,
			error: undefined,
			writebackPending: false,
		};

		await store.set(updated);
		const result = store.get("row-102");
		expect(result?.status).toBe("completed");
		expect(result?.attempts).toBe(2);
		expect(result?.error).toBeUndefined();
	});

	test("3. handles large batch writes with high throughput", async () => {
		const count = 500;
		for (let i = 0; i < count; i++) {
			await store.set({
				rowId: `batch-row-${i}`,
				rowIndex: i + 1,
				runId: "batch-run",
				workflowId: "batch-wf",
				status: i % 2 === 0 ? "completed" : "failed",
				attempts: 1,
				durationMs: 10 + i,
			});
		}

		expect(store.get("batch-row-0")?.status).toBe("completed");
		expect(store.get("batch-row-499")?.status).toBe("failed");
		expect(store.get("batch-row-499")?.durationMs).toBe(509);
	});
});
