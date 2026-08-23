import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { RowWorkflowRunner } from "../src/data/execution/row-runner.js";
import { detectSchema } from "../src/data/schema.js";
import type { DataProvider, DataReadOptions, DataRow, DataWrite } from "../src/data/types.js";
import type { FlowDefinition } from "../src/flow/types.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

class MemoryProvider implements DataProvider {
	readonly name = "memory";
	readonly capabilities = {
		read: true,
		write: true,
		update: true,
		streaming: true,
		schemaDiscovery: true,
	} as const;
	writes: DataWrite[] = [];
	constructor(private readonly input: DataRow[]) {}
	async connect() {}
	async disconnect() {}
	async discoverSchema() {
		return detectSchema(this.input);
	}
	async *rows(options: DataReadOptions = {}) {
		for (const row of this.input) {
			if (options.fromRow && row.index < options.fromRow) continue;
			if (options.toRow && row.index > options.toRow) continue;
			yield row;
		}
	}
	async update(writes: DataWrite[]) {
		this.writes.push(...writes);
	}
}

describe("row-based workflow execution", () => {
	let ctx: TestContext;
	beforeAll(async () => {
		ctx = await setupTestContext();
	});
	afterAll(async () => {
		await teardownTestContext();
	});

	test("runs rows concurrently, isolates failures, redacts secrets, and writes results", async () => {
		const provider = new MemoryProvider([
			{ id: "sheet:1:2", index: 2, values: { email: "a@example.com", apiToken: "TOKEN-A" } },
			{ id: "sheet:1:3", index: 3, values: { email: "b@example.com", apiToken: "TOKEN-B" } },
		]);
		const flow: FlowDefinition = {
			name: `Data execution ${Date.now()}`,
			steps: [
				{ action: "goto", url: ctx.server.url("/forms") },
				{ action: "type", selector: "#user-email", text: "{{row.email}}", clearFirst: true },
				{ action: "type", selector: "#auth-token", text: "{{row.apiToken}}", clearFirst: true },
				{ action: "click", selector: "#btn-save" },
				{ action: "extract", selector: "#status", as: "saved" },
			],
		};
		const summary = await new RowWorkflowRunner(provider, flow).run({
			parallel: 2,
			batchSize: 2,
			resultMapping: { saved_status: "data.saved" },
		});
		expect(summary.completed).toBe(2);
		expect(summary.failed).toBe(0);
		expect(JSON.stringify(summary)).not.toContain("TOKEN-A");
		expect(JSON.stringify(summary)).not.toContain("TOKEN-B");
		expect(provider.writes).toHaveLength(2);
		expect(provider.writes.every((write) => write.values.__automation_status === "completed")).toBe(
			true,
		);
		expect(provider.writes[0]?.values.saved_status).toContain("[REDACTED]");
	}, 30000);

	test("dry-run validates and masks rows without launching workflows or writing", async () => {
		const provider = new MemoryProvider([
			{ id: "sheet:1:2", index: 2, values: { email: "a@example.com", password: "never-show" } },
		]);
		const flow: FlowDefinition = {
			name: "Dry run",
			steps: [{ action: "type", selector: "#email", text: "{{email}}" }],
		};
		const summary = await new RowWorkflowRunner(provider, flow).run({ dryRun: true });
		expect(summary.total).toBe(1);
		expect(JSON.stringify(summary.previewRows)).not.toContain("never-show");
		expect(provider.writes).toHaveLength(0);
	});
});
