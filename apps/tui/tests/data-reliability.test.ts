import { describe, expect, test } from "bun:test";
import { DataError } from "../src/data/errors.js";
import { ControlledResultWriter } from "../src/data/execution/result-writer.js";
import type { DataProvider, DataWrite } from "../src/data/types.js";

describe("data result reliability", () => {
	test("retries transient provider writes without losing the batch", async () => {
		let attempts = 0;
		const provider = {
			name: "retrying",
			capabilities: {
				read: false,
				write: false,
				update: true,
				streaming: false,
				schemaDiscovery: false,
			},
			async connect() {},
			async disconnect() {},
			async discoverSchema() {
				return { columns: [] };
			},
			async *rows() {},
			async update(_writes: DataWrite[]) {
				attempts++;
				if (attempts < 3) {
					throw new DataError("quota", "RATE_LIMIT_ERROR", true, 1);
				}
			},
		} satisfies DataProvider;
		const writer = new ControlledResultWriter(provider, 2);
		await writer.enqueue({ rowId: "row-1", values: { status: "complete" } });
		await writer.enqueue({ rowId: "row-2", values: { status: "complete" } });
		await writer.flush();
		expect(attempts).toBe(3);
		expect(writer.failure("row-1")).toBeUndefined();
		expect(writer.failure("row-2")).toBeUndefined();
	});

	test("records a permanent write failure for every row in the batch", async () => {
		const provider = {
			name: "failing",
			capabilities: {
				read: false,
				write: false,
				update: true,
				streaming: false,
				schemaDiscovery: false,
			},
			async connect() {},
			async disconnect() {},
			async discoverSchema() {
				return { columns: [] };
			},
			async *rows() {},
			async update() {
				throw new DataError("permission denied", "PROVIDER_ERROR");
			},
		} satisfies DataProvider;
		const writer = new ControlledResultWriter(provider, 2);
		await writer.enqueue({ rowId: "row-1", values: { status: "complete" } });
		await writer.enqueue({ rowId: "row-2", values: { status: "complete" } });
		expect(writer.failure("row-1")?.code).toBe("PROVIDER_ERROR");
		expect(writer.failure("row-2")?.message).toBe("permission denied");
	});
});
