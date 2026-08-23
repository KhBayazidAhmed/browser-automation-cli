import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { FlowRunner } from "../src/flow/runner.js";
import type { FlowDefinition } from "../src/flow/types.js";
import { OUTPUT_DIR } from "../src/runtime-paths.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

describe("Workflow option contracts", () => {
	let ctx: TestContext;
	beforeAll(async () => {
		ctx = await setupTestContext();
	});
	afterAll(async () => {
		await teardownTestContext();
	});

	test("honors all/attribute extraction, selector screenshots, CSV saves, env refs, and element eval", async () => {
		const csvPath = join(OUTPUT_DIR, "flow-options.csv");
		const shotPath = join(OUTPUT_DIR, "flow-selector-shot.png");
		process.env.TUI_TEST_SECRET = "env-value-with=equals";
		try {
			const flow: FlowDefinition = {
				name: "Flow Option Contract",
				steps: [
					{ action: "goto", url: ctx.server.url("/inventory") },
					{
						action: "extract",
						selector: ".inv-row",
						attribute: "class",
						all: true,
						as: "rowClasses",
					},
					{ action: "eval", code: "return '{{env.TUI_TEST_SECRET}}'", as: "envValue" },
					{
						action: "eval",
						selector: ".inv-row .sku",
						code: "return element.textContent",
						as: "firstSku",
					},
					{ action: "screenshot", selector: "table", path: shotPath },
					{ action: "save", format: "csv", path: csvPath },
				],
			};
			const result = await FlowRunner.run(flow, {}, { headless: true });
			expect(result.success).toBe(true);
			expect(result.data.rowClasses).toEqual(["inv-row", "inv-row", "inv-row"]);
			expect(result.data.envValue).toBe("env-value-with=equals");
			expect(result.data.firstSku).toBe("SKU-A1");
			expect(statSync(shotPath).size).toBeGreaterThan(100);
			expect(readFileSync(csvPath, "utf-8")).toStartWith("key,value");
		} finally {
			delete process.env.TUI_TEST_SECRET;
			for (const path of [csvPath, shotPath]) {
				try {
					unlinkSync(path);
				} catch {}
			}
		}
	}, 15000);
});

test("invalid workflow schemas fail before Chrome launches", async () => {
	const result = await FlowRunner.run({
		name: "Invalid",
		steps: [{ action: "extractList" }],
	} as never);
	expect(result.success).toBe(false);
	expect(result.error).toContain("unsupported action");
	expect(result.steps).toHaveLength(0);
});
