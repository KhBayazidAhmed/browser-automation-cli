import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { FlowRunner } from "../src/flow/runner.js";
import type { FlowDefinition } from "../src/flow/types.js";
import { OUTPUT_DIR } from "../src/runtime-paths.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

describe("Declarative Flows & Multi-Step Extraction", () => {
	let ctx: TestContext;
	const outputDir = OUTPUT_DIR;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	afterAll(async () => {
		await teardownTestContext();
	});

	test("1. executes multi-step flow with variable passing and strict text assertions", async () => {
		const flow: FlowDefinition = {
			name: "Enterprise Pipeline Flow",
			variables: {
				adminEmail: "lead@enterprise.com",
			},
			steps: [
				{
					name: "Navigate to Forms",
					action: "goto",
					url: ctx.server.url("/forms"),
				},
				{
					name: "Fill Email",
					action: "type",
					targetText: "Work Email",
					text: "{{adminEmail}}",
					strictText: true,
					clearFirst: true,
				},
				{
					name: "Fill Auth Token",
					action: "type",
					targetText: "Secret Authentication Code",
					text: "AUTH-8877",
					strictText: true,
				},
				{
					name: "Click Save",
					action: "click",
					text: "Save Profile Settings",
					strictText: true,
				},
				{
					name: "Assert Saved Message",
					action: "assert",
					selector: "#status",
					equals: "SAVED:{{adminEmail}}:AUTH-8877",
					strictText: "SAVED:{{adminEmail}}:AUTH-8877",
				},
				{
					name: "Extract Saved Result",
					action: "extract",
					selector: "#status",
					as: "portalStatus",
					strictText: true,
				},
			],
		};

		const result = await FlowRunner.run(flow, {}, { headless: true });
		expect(result.success).toBe(true);
		expect(result.steps.length).toBe(6);
		expect(result.data.portalStatus).toBe("SAVED:lead@enterprise.com:AUTH-8877");
	}, 15000);

	test("2. extracts tabular collections with filterText strict filtering", async () => {
		const flow: FlowDefinition = {
			name: "Filtered Table Extraction",
			steps: [
				{
					name: "Navigate to Inventory",
					action: "goto",
					url: ctx.server.url("/inventory"),
				},
				{
					name: "Extract Enterprise Tier Rows",
					action: "extractMultiple",
					containerSelector: "tr.inv-row",
					filterText: "Enterprise",
					fields: {
						sku: "td.sku",
						tier: "td.tier",
						name: "td.name",
						link: "a@href",
					},
					as: "enterpriseItems",
				},
			],
		};

		const result = await FlowRunner.run(flow, {}, { headless: true });
		expect(result.success).toBe(true);
		expect(result.data.enterpriseItems).toEqual([
			{
				sku: "SKU-A1",
				tier: "Enterprise",
				name: "Direct Server",
				link: "/buy/101",
			},
			{
				sku: "SKU-A3",
				tier: "Enterprise",
				name: "Compute Blade",
				link: "/buy/103",
			},
		]);
	}, 15000);

	test("3. executes eval, block, screenshot, pdf, and save steps in flow", async () => {
		const testPdfPath = join(outputDir, "flow-test-doc.pdf");
		const testShotPath = join(outputDir, "flow-test-shot.png");
		const testDataPath = join(outputDir, "flow-custom-save.json");

		const flow: FlowDefinition = {
			name: "Advanced Step Actions Flow",
			blockMedia: true,
			steps: [
				{
					name: "Navigate to Root",
					action: "goto",
					url: ctx.server.url("/"),
				},
				{
					name: "Block Fonts & Styles",
					action: "block",
					types: ["font", "stylesheet"],
				},
				{
					name: "Evaluate Calculation",
					action: "eval",
					code: "return 100 * 5;",
					as: "calcResult",
				},
				{
					name: "Capture Viewport Screenshot",
					action: "screenshot",
					path: testShotPath,
				},
				{
					name: "Export PDF",
					action: "pdf",
					path: testPdfPath,
				},
				{
					name: "Save Custom Data File",
					action: "save",
					path: testDataPath,
					format: "json",
				},
			],
		};

		const result = await FlowRunner.run(flow, {}, { headless: true });
		expect(result.success).toBe(true);
		expect(result.data.calcResult).toBe(500);
		expect(existsSync(testShotPath)).toBe(true);
		expect(existsSync(testPdfPath)).toBe(true);
		expect(existsSync(testDataPath)).toBe(true);

		// Clean up
		try {
			unlinkSync(testPdfPath);
			unlinkSync(testShotPath);
			unlinkSync(testDataPath);
		} catch {}
	}, 15000);

	test("4. supports CLI variable overrides", async () => {
		const flow: FlowDefinition = {
			name: "Variable Override Flow",
			variables: {
				targetUser: "DefaultBob",
			},
			steps: [
				{
					name: "Navigate to Root",
					action: "goto",
					url: ctx.server.url("/"),
				},
				{
					name: "Extract Value with Override",
					action: "eval",
					code: "return '{{targetUser}}';",
					as: "resolvedUser",
				},
			],
		};

		const result = await FlowRunner.run(
			flow,
			{ targetUser: "OverriddenAlice" },
			{ headless: true },
		);
		expect(result.success).toBe(true);
		expect(result.data.resolvedUser).toBe("OverriddenAlice");
	}, 15000);

	test("5. handles step failure and aborts flow execution cleanly", async () => {
		const failingFlow: FlowDefinition = {
			name: "Failing Step Flow",
			steps: [
				{
					name: "Navigate to Forms",
					action: "goto",
					url: ctx.server.url("/forms"),
				},
				{
					name: "Click Non-Existent Selector with Short Timeout",
					action: "click",
					selector: "#does-not-exist-element-99",
					timeout: 200,
				},
			],
		};

		const failResult = await FlowRunner.run(failingFlow, {}, { headless: true });
		expect(failResult.success).toBe(false);
		expect(failResult.error).toContain("does-not-exist-element-99");
	}, 15000);
});
