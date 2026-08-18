import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadAllWorkflows } from "../src/tui/workflow-loader.js";

describe("Workflow Loader Suite", () => {
	const workflowsDir = join(process.cwd(), "workflows");
	const testWorkflowFile = join(workflowsDir, "temp-test-loader.json");
	const invalidWorkflowFile = join(workflowsDir, "temp-invalid-loader.json");

	test("1. scans workflows directory and loads valid flow definitions", () => {
		if (!existsSync(workflowsDir)) {
			mkdirSync(workflowsDir, { recursive: true });
		}

		writeFileSync(
			testWorkflowFile,
			JSON.stringify({
				name: "Temporary Loader Test Flow",
				description: "Used for unit test verification",
				steps: [
					{ name: "Step 1", action: "goto", url: "https://example.com" },
					{ name: "Step 2", action: "wait", durationMs: 100 },
				],
			}),
		);

		const workflows = loadAllWorkflows();
		expect(Array.isArray(workflows)).toBe(true);

		const found = workflows.find((w) => w.filename === "temp-test-loader.json");
		expect(found).toBeDefined();
		expect(found?.flow.name).toBe("Temporary Loader Test Flow");
		expect(found?.stepCount).toBe(2);

		// Clean up
		try {
			unlinkSync(testWorkflowFile);
		} catch {}
	});

	test("2. ignores invalid files or JSON without proper schema", () => {
		writeFileSync(
			invalidWorkflowFile,
			JSON.stringify({
				notAFlow: true,
			}),
		);

		const workflows = loadAllWorkflows();
		const found = workflows.find((w) => w.filename === "temp-invalid-loader.json");
		expect(found).toBeUndefined();

		// Clean up
		try {
			unlinkSync(invalidWorkflowFile);
		} catch {}
	});
});
