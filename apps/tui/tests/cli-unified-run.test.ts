import { describe, expect, test } from "bun:test";
import { handleDataCommand } from "../src/cli/data-commands.js";
import { handleWorkflowCommand } from "../src/cli/workflow-command.js";
import { taskRegistry } from "../src/tasks/registry.js";

describe("Unified CLI Taxonomy & Aliases (PR 6)", () => {
	test("1. data list and data providers commands list installed data providers", async () => {
		const handledList = await handleDataCommand(["data", "list"]);
		expect(handledList).toBe(true);

		const handledProviders = await handleDataCommand(["data", "providers"]);
		expect(handledProviders).toBe(true);
	});

	test("2. task registry lists tasks and finds tasks by ID", () => {
		const tasks = taskRegistry.list();
		expect(tasks.length).toBeGreaterThan(0);

		const taskIds = tasks.map((t) => t.id);
		expect(taskIds).toContain("scrape-hn");
		expect(taskIds).toContain("site-audit");
		expect(taskIds).toContain("form-submit");

		const formsTask = taskRegistry.get("form-submit");
		expect(formsTask).toBeDefined();
		expect(formsTask?.name).toBeDefined();
	});

	test("3. handleWorkflowCommand routes run with --data", async () => {
		// When called with non-existent file, it should throw or attempt to run
		let errorThrown = false;
		try {
			await handleWorkflowCommand(
				["run", "non-existent-wf.json", "--data=google-sheets://123/Sheet1"],
				{},
			);
		} catch (err: unknown) {
			errorThrown = true;
			expect(String(err)).toContain("Workflow file not found");
		}
		expect(errorThrown).toBe(true);
	});
});
