import { describe, expect, test } from "bun:test";
import { DataError } from "../src/data/errors.js";
import { compileRowFilter } from "../src/data/execution/filter.js";
import { recordWriteback } from "../src/data/execution/writeback.js";
import { assertOAuthState } from "../src/data/providers/google-sheets/oauth.js";
import { redactSensitive, sensitiveValues } from "../src/data/redaction.js";
import { detectSchema } from "../src/data/schema.js";
import { applyTransformation } from "../src/data/transformations.js";
import { googleSheetsUriFromInput, parseDataSourceUri } from "../src/data/uri.js";
import {
	getNestedValue,
	interpolateVariables,
	mergeVariableScopes,
	referencedVariables,
} from "../src/data/variables.js";
import { attachGoogleSheetToFlow } from "../src/tui/wizard-google-sheets.js";

describe("provider-neutral data utilities", () => {
	test("attaches a Google Sheet as the active provider-neutral workflow source", () => {
		const flow = attachGoogleSheetToFlow(
			{ name: "Leads", steps: [] },
			{
				input: "https://docs.google.com/spreadsheets/d/1234567890abcdefghijk/edit",
				tab: "Qualified Leads",
				range: "A1:H500",
				account: "owner@example.com",
			},
		);

		expect(flow.data?.source).toBe("googleSheet");
		expect(flow.dataSources?.googleSheet).toEqual({
			provider: "google-sheets",
			uri: "google-sheets://1234567890abcdefghijk/Qualified%20Leads?range=A1%3AH500",
			account: "owner@example.com",
		});
	});

	test("parses provider URIs, encoded tabs, ranges, and Google URL GIDs", () => {
		const parsed = parseDataSourceUri(
			"google-sheets://sheet_123456789012345/Users%20EU?range=A%3AE&headerRow=2",
		);
		expect(parsed.provider).toBe("google-sheets");
		expect(parsed.resource).toBe("sheet_123456789012345");
		expect(parsed.path).toBe("Users EU");
		expect(parsed.params).toEqual({ range: "A:E", headerRow: "2" });

		const uri = googleSheetsUriFromInput(
			"https://docs.google.com/spreadsheets/d/abcDEF_1234567890/edit#gid=42",
			undefined,
			"B:F",
		);
		expect(uri).toContain("google-sheets://abcDEF_1234567890");
		expect(uri).toContain("range=B%3AF");
		expect(uri).toContain("gid=42");
	});

	test("resolves nested variables, precedence, and transformations", () => {
		const variables = mergeVariableScopes({
			step: { value: "step" },
			row: { value: "row", user: { email: "  USER@EXAMPLE.COM " } },
			workflow: { value: "workflow" },
			cli: { value: "cli" },
			system: { value: "system" },
		});
		expect(variables.value).toBe("system");
		expect(getNestedValue(variables, "user.email")).toContain("USER");
		expect(interpolateVariables("{{ user.email | trim | lowercase | urlEncode }}", variables)).toBe(
			"user%40example.com",
		);
		expect(interpolateVariables('{{ missing | default("fallback") }}', variables)).toBe("fallback");
		expect(applyTransformation(["a", "b"], "join(-)")).toBe("a-b");
		expect(
			applyTransformation("2024-01-02T00:00:00.000Z", 'formatDate(en-US,{"year":"numeric"})'),
		).toBe("2024");
	});

	test("discovers references, schema, filters, and sensitive values", () => {
		expect(referencedVariables({ text: "{{row.email | trim}} {{query}} {{env.TOKEN}}" })).toEqual([
			"row.email",
			"query",
		]);
		const rows = [
			{ id: "1", index: 2, values: { email: "a@example.com", age: 20, apiToken: "secret" } },
			{ id: "2", index: 3, values: { email: "b@example.com", age: 40, apiToken: "other" } },
		];
		const schema = detectSchema(rows);
		expect(schema.columns.find((column) => column.name === "age")?.type).toBe("number");
		expect(schema.columns.find((column) => column.name === "apiToken")?.sensitive).toBe(true);
		expect(rows.filter(compileRowFilter("age>=30"))).toHaveLength(1);
		const secrets = sensitiveValues(rows[0]?.values || {});
		expect(redactSensitive({ message: "token secret", nested: rows[0]?.values }, secrets)).toEqual({
			message: "token [REDACTED]",
			nested: { email: "a@example.com", age: 20, apiToken: "[REDACTED]" },
		});
	});

	test("validates OAuth state and maps typed execution results", () => {
		expect(() => assertOAuthState("expected", "different")).toThrow(DataError);
		const values = recordWriteback(
			{
				rowId: "sheet:1:2",
				rowIndex: 2,
				runId: "run-1",
				workflowId: "workflow-1",
				status: "completed",
				attempts: 2,
				result: {
					flowName: "Signup",
					success: true,
					totalDurationMs: 10,
					steps: [],
					data: { user: { id: 42 } },
				},
			},
			{ created_user_id: "data.user.id" },
		);
		expect(values.created_user_id).toBe(42);
		expect(values.__automation_status).toBe("completed");
		expect(values.__automation_attempts).toBe(2);
	});
});
