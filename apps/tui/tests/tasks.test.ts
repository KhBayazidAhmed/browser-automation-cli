import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { taskRegistry } from "../src/tasks/registry.js";
import {
	setupTestContext,
	type TestContext,
	teardownTestContext,
} from "./fixtures/browser.js";

describe("Programmatic Tasks & Task Registry Suite", () => {
	let ctx: TestContext;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	afterAll(async () => {
		await teardownTestContext();
	});

	test("1. taskRegistry lists and registers all built-in automation tasks", () => {
		const tasks = taskRegistry.list();
		expect(tasks.length).toBeGreaterThanOrEqual(3);

		const taskIds = tasks.map((t) => t.id);
		expect(taskIds).toContain("site-audit");
		expect(taskIds).toContain("form-submit");
		expect(taskIds).toContain("scrape-hn");

		const audit = taskRegistry.get("site-audit");
		expect(audit).toBeDefined();
		expect(audit?.name).toBe("Website Health & DOM Audit");
		expect(audit?.params?.length).toBeGreaterThan(0);
	});

	test("2. runs site-audit task on local server and produces performance & content report", async () => {
		const result = await taskRegistry.runTask(
			"site-audit",
			{
				url: ctx.server.url("/"),
				screenshot: true,
			},
			{ headless: true },
		);

		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.data.content.title).toBe("CDP Test Server");
		expect(result.data.performance.domNodes).toBeGreaterThanOrEqual(0);
		expect(result.data.screenshot).toContain(".png");
		expect(result.durationMs).toBeGreaterThan(0);
	}, 15000);

	test("3. runs form-submit task with custom input arguments", async () => {
		const result = await taskRegistry.runTask(
			"form-submit",
			{
				name: "Alice Engineer",
				email: "alice@automated.io",
			},
			{ headless: true },
		);

		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.data.submittedEmail).toBe("alice@automated.io");
		expect(result.data.submittedName).toBe("Alice Engineer");
		expect(result.data.resultText).toContain(
			"Registration Successful for: Alice Engineer",
		);
	}, 15000);

	test("4. handles unknown task IDs gracefully with clear error", async () => {
		expect(taskRegistry.runTask("non-existent-task-12345", {})).rejects.toThrow(
			'Task "non-existent-task-12345" not found',
		);
	});
});
