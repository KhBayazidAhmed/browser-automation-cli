import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { FlowRunner } from "../src/flow/runner.js";
import type { FlowDefinition } from "../src/flow/types.js";
import {
	setupTestContext,
	type TestContext,
	teardownTestContext,
} from "./fixtures/browser.js";

describe("Declarative Flows & Multi-Step Extraction", () => {
	let ctx: TestContext;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	afterAll(async () => {
		await teardownTestContext();
	});

	test("executes multi-step flow with variable passing and strict text assertions", async () => {
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
		expect(result.data.portalStatus).toBe(
			"SAVED:lead@enterprise.com:AUTH-8877",
		);
	});

	test("extracts tabular collections with filterText strict filtering", async () => {
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
	});
});
