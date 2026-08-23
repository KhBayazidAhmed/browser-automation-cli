import { describe, expect, test } from "bun:test";
import type { GoogleSheetsClient } from "../src/data/providers/google-sheets/client.js";
import {
	columnIndex,
	columnName,
	normalizeHeaders,
} from "../src/data/providers/google-sheets/mapping.js";
import { GoogleSheetsProvider } from "../src/data/providers/google-sheets/provider.js";
import { parseDataSourceUri } from "../src/data/uri.js";

class FakeSheetsClient {
	updates: Array<{ range: string; values: unknown[][] }> = [];
	appends: Array<{ range: string; values: unknown[][] }> = [];
	async metadata() {
		return {
			spreadsheetId: "sheet_123456789012345",
			properties: { title: "Test" },
			sheets: [
				{ properties: { sheetId: 0, title: "Other", gridProperties: { rowCount: 3 } } },
				{ properties: { sheetId: 42, title: "Users", gridProperties: { rowCount: 4 } } },
			],
		};
	}
	async values(_id: string, range: string) {
		if (range.includes("C1:E1")) return [["email", "age", "email"]];
		if (range.includes("C2:E3"))
			return [
				["a@example.com", 20, "alt@example.com"],
				["b@example.com", 40],
			];
		if (range.includes("C4:E4")) return [];
		return [];
	}
	async batchUpdateValues(_id: string, data: Array<{ range: string; values: unknown[][] }>) {
		this.updates.push(...data);
	}
	async appendValues(_id: string, range: string, values: unknown[][]) {
		this.appends.push({ range, values });
	}
}

describe("Google Sheets provider", () => {
	test("maps columns and normalizes duplicate headers", () => {
		expect(columnName(0)).toBe("A");
		expect(columnName(26)).toBe("AA");
		expect(columnIndex("AA")).toBe(26);
		expect(normalizeHeaders(["email", "email", ""])).toEqual(["email", "email_2", "column_3"]);
	});

	test("streams stable rows using GID and performs sparse write-back", async () => {
		const client = new FakeSheetsClient();
		const provider = new GoogleSheetsProvider(
			parseDataSourceUri("google-sheets://sheet_123456789012345?gid=42&range=C:E"),
			client as unknown as GoogleSheetsClient,
		);
		await provider.connect();
		const rows = [];
		for await (const row of provider.rows({ batchSize: 2 })) rows.push(row);
		expect(rows.map((row) => row.id)).toEqual([
			"sheet_123456789012345:42:2",
			"sheet_123456789012345:42:3",
		]);
		expect(rows[0]?.values).toEqual({
			email: "a@example.com",
			age: 20,
			email_2: "alt@example.com",
		});

		await provider.update([
			{ rowId: rows[0]?.id || "", values: { __automation_status: "completed" } },
		]);
		expect(client.updates.some((update) => update.range.endsWith("F1"))).toBe(true);
		expect(client.updates.some((update) => update.range.endsWith("F2"))).toBe(true);
		expect(client.updates.some((update) => update.range.includes("C2:F2"))).toBe(false);

		await provider.write([
			{
				id: "new",
				index: 0,
				values: { email: "new@example.com", age: 30, source: "import" },
			},
		]);
		expect(client.appends).toHaveLength(1);
		expect(client.appends[0]?.range).toContain("'Users'!C:G");
		expect(client.appends[0]?.values[0]).toEqual(["new@example.com", 30, null, null, "import"]);
	});
});
