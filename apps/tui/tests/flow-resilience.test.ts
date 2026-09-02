import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { FlowRunner } from "../src/flow/runner.js";
import type { FlowDefinition } from "../src/flow/types.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

describe("Workflow Resilience & Control Flow (PR 1)", () => {
	let ctx: TestContext;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	afterAll(async () => {
		await teardownTestContext();
	});

	test("1. ignores optional step failure and completes remaining workflow steps", async () => {
		const flow: FlowDefinition = {
			name: "Optional Step Resilience Flow",
			steps: [
				{
					name: "Navigate to Root",
					action: "goto",
					url: ctx.server.url("/"),
				},
				{
					name: "Try clicking non-existent cookie banner",
					action: "click",
					selector: "#non-existent-cookie-accept-btn",
					timeout: 300,
					optional: true,
				},
				{
					name: "Assert Title Exists",
					action: "assert",
					selector: "#title",
					contains: "Automation",
				},
			],
		};

		const result = await FlowRunner.run(flow, {}, { writeArtifacts: false });
		expect(result.success).toBe(true);
		expect(result.steps.length).toBe(3);
		expect(result.steps[1]?.status).toBe("skipped");
		expect(result.steps[1]?.success).toBe(false);
		expect(result.steps[2]?.success).toBe(true);
	});

	test("2. evaluates condition and skips step if condition not met", async () => {
		const flow: FlowDefinition = {
			name: "Conditional Step Execution Flow",
			steps: [
				{
					name: "Navigate to Forms",
					action: "goto",
					url: ctx.server.url("/forms"),
				},
				{
					name: "Conditional Action (Condition False)",
					action: "click",
					selector: "#btn-save",
					condition: {
						exists: "#non-existent-element",
					},
				},
				{
					name: "Conditional Action (Condition True)",
					action: "type",
					selector: "#notes",
					text: "Condition matched note",
					condition: {
						exists: "#notes",
					},
				},
				{
					name: "Conditional Action (Not Condition True)",
					action: "type",
					selector: "#notes",
					text: " - inverted condition matched",
					condition: {
						exists: "#non-existent-banner",
						not: true,
					},
				},
			],
		};

		const result = await FlowRunner.run(flow, {}, { writeArtifacts: false });
		expect(result.success).toBe(true);
		expect(result.steps.length).toBe(4);
		expect(result.steps[1]?.status).toBe("skipped");
		expect(result.steps[2]?.success).toBe(true);
		expect(result.steps[3]?.success).toBe(true);
	});

	test("3. retries step up to maxAttempts on failure", async () => {
		const flow: FlowDefinition = {
			name: "Step Retry Flow",
			steps: [
				{
					name: "Navigate to Disambiguation",
					action: "goto",
					url: ctx.server.url("/disambiguation"),
				},
				{
					name: "Click Save with retry on missing selector",
					action: "click",
					selector: "#btn-missing",
					timeout: 200,
					retry: {
						maxAttempts: 2,
						backoffMs: 50,
					},
					optional: true,
				},
			],
		};

		const result = await FlowRunner.run(flow, {}, { writeArtifacts: false });
		expect(result.success).toBe(true);
		expect(result.steps[1]?.status).toBe("skipped");
	});
});
