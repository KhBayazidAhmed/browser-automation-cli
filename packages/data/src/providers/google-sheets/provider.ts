import { DataError } from "../../errors.js";
import { detectSchema } from "../../schema.js";
import type {
	DataProvider,
	DataReadOptions,
	DataRow,
	DataSchema,
	DataSourceReference,
	DataValue,
	DataWrite,
} from "../../types.js";
import type { GoogleSheetsClient, SheetProperties } from "./client.js";
import { columnIndex, columnName, normalizeHeaders, rowValues } from "./mapping.js";

interface SheetContext {
	properties: SheetProperties;
	headers: string[];
	headerRow: number;
	startColumn: string;
	endColumn: string;
	rangeStartRow?: number;
	rangeEndRow?: number;
}

function quotedSheetTitle(title: string): string {
	return `'${title.replaceAll("'", "''")}'`;
}

function rangeBounds(range?: string): {
	startColumn: string;
	endColumn: string;
	startRow?: number;
	endRow?: number;
} {
	const clean = (range || "A:ZZ").split("!").pop() || "A:ZZ";
	const match = clean.toUpperCase().match(/^([A-Z]+)(\d*)?(?::([A-Z]+)?(\d*)?)?$/);
	if (!match?.[1]) {
		throw new DataError(`Invalid Google Sheets range "${range}"`, "DATA_VALIDATION_ERROR");
	}
	const startColumn = match[1];
	const endColumn = match[3] || (clean.includes(":") ? "ZZ" : startColumn);
	const startRow = match[2] ? Number(match[2]) : undefined;
	const endRow = match[4] ? Number(match[4]) : undefined;
	if (
		columnIndex(endColumn) < columnIndex(startColumn) ||
		(startRow !== undefined && startRow < 1) ||
		(endRow !== undefined && endRow < 1) ||
		(startRow !== undefined && endRow !== undefined && endRow < startRow)
	) {
		throw new DataError(`Invalid Google Sheets range "${range}"`, "DATA_VALIDATION_ERROR");
	}
	return { startColumn, endColumn, startRow, endRow };
}

function dataValue(value: unknown): DataValue {
	if (
		value === null ||
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	)
		return value;
	return JSON.parse(JSON.stringify(value)) as DataValue;
}

export class GoogleSheetsProvider implements DataProvider {
	readonly name = "google-sheets";
	readonly capabilities = {
		read: true,
		write: true,
		update: true,
		streaming: true,
		schemaDiscovery: true,
	} as const;
	private context?: SheetContext;

	constructor(
		readonly reference: DataSourceReference,
		readonly client: GoogleSheetsClient,
	) {}

	async connect(): Promise<void> {
		await this.loadContext();
	}
	async disconnect(): Promise<void> {}

	private async loadContext(): Promise<SheetContext> {
		if (this.context) return this.context;
		const metadata = await this.client.metadata(this.reference.resource);
		const requested = this.reference.path;
		const gid = this.reference.params.gid;
		const properties =
			metadata.sheets
				.map((sheet) => sheet.properties)
				.find((sheet) =>
					requested ? sheet.title === requested : gid ? String(sheet.sheetId) === gid : true,
				) || metadata.sheets[0]?.properties;
		if (!properties) throw new DataError("Spreadsheet has no sheets", "PROVIDER_ERROR");
		if (requested && properties.title !== requested)
			throw new DataError(`Sheet tab "${requested}" was not found`, "DATA_VALIDATION_ERROR");
		const bounds = rangeBounds(this.reference.params.range);
		const headerRow = Number(this.reference.params.headerRow || bounds.startRow || 1);
		if (!Number.isInteger(headerRow) || headerRow < 1) {
			throw new DataError(
				"Google Sheets headerRow must be a positive integer",
				"DATA_VALIDATION_ERROR",
			);
		}
		const { startColumn, endColumn } = bounds;
		const headerValues = await this.client.values(
			this.reference.resource,
			`${quotedSheetTitle(properties.title)}!${startColumn}${headerRow}:${endColumn}${headerRow}`,
		);
		const headers = normalizeHeaders(headerValues[0] || []);
		if (!headers.length)
			throw new DataError(
				`Sheet "${properties.title}" has no header row at ${headerRow}`,
				"DATA_VALIDATION_ERROR",
			);
		this.context = {
			properties,
			headers,
			headerRow,
			startColumn,
			endColumn: columnName(columnIndex(startColumn) + headers.length - 1),
			rangeStartRow: bounds.startRow,
			rangeEndRow: bounds.endRow,
		};
		return this.context;
	}

	async discoverSchema(): Promise<DataSchema> {
		const context = await this.loadContext();
		const rows: DataRow[] = [];
		for await (const row of this.rows({ toRow: context.headerRow + 25, batchSize: 25 })) {
			rows.push(row);
		}
		const emptyRow: DataRow = {
			id: "schema",
			index: context.headerRow,
			values: Object.fromEntries(context.headers.map((header) => [header, null])),
		};
		const base = detectSchema([emptyRow]);
		const detected = new Map(detectSchema(rows).columns.map((column) => [column.name, column]));
		const schema = {
			columns: base.columns.map((column) => detected.get(column.name) || column),
		};
		return {
			...schema,
			metadata: {
				spreadsheetId: this.reference.resource,
				sheet: context.properties.title,
			},
		};
	}

	async *rows(options: DataReadOptions = {}): AsyncIterable<DataRow> {
		const context = await this.loadContext();
		const batchSize = Math.max(1, Math.min(1000, options.batchSize || 250));
		let start = Math.max(
			context.headerRow + 1,
			context.rangeStartRow || context.headerRow + 1,
			options.fromRow || context.headerRow + 1,
		);
		const lastCandidates = [
			options.toRow,
			context.rangeEndRow,
			context.properties.gridProperties?.rowCount,
		].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
		const configuredLast = lastCandidates.length ? Math.min(...lastCandidates) : undefined;
		const last = configuredLast || Number.MAX_SAFE_INTEGER;
		while (start <= last) {
			const end = Math.min(last, start + batchSize - 1);
			const range = `${quotedSheetTitle(context.properties.title)}!${context.startColumn}${start}:${context.endColumn}${end}`;
			const values = await this.client.values(this.reference.resource, range);
			for (const [offset, cells] of values.entries()) {
				if (cells.every((cell) => cell === "" || cell === null || cell === undefined)) continue;
				const rowNumber = start + offset;
				yield {
					id: `${this.reference.resource}:${context.properties.sheetId}:${rowNumber}`,
					index: rowNumber,
					values: rowValues(context.headers, cells),
					metadata: {
						rowNumber,
						sheetId: context.properties.sheetId,
						sheet: context.properties.title,
					},
				};
			}
			if (!configuredLast && values.length < batchSize) break;
			start = end + 1;
		}
	}

	async readRow(rowId: string): Promise<DataRow | null> {
		const context = await this.loadContext();
		const [spreadsheetId, sheetId, rawRowNumber] = rowId.split(":");
		const rowNumber = Number(rawRowNumber);
		if (
			spreadsheetId !== this.reference.resource ||
			sheetId !== String(context.properties.sheetId) ||
			!Number.isInteger(rowNumber) ||
			rowNumber <= context.headerRow
		) {
			throw new DataError(`Invalid Google Sheets row ID "${rowId}"`, "DATA_VALIDATION_ERROR");
		}
		const values = await this.client.values(
			this.reference.resource,
			`${quotedSheetTitle(context.properties.title)}!${context.startColumn}${rowNumber}:${context.endColumn}${rowNumber}`,
		);
		const cells = values[0];
		if (!cells || cells.every((cell) => cell === "" || cell === null || cell === undefined)) {
			return null;
		}
		return {
			id: rowId,
			index: rowNumber,
			values: rowValues(context.headers, cells),
			metadata: {
				rowNumber,
				sheetId: context.properties.sheetId,
				sheet: context.properties.title,
			},
		};
	}

	private async ensureHeaders(headers: string[]): Promise<SheetContext> {
		const context = await this.loadContext();
		if (headers.some((header) => !header.trim())) {
			throw new DataError("Google Sheets column names cannot be empty", "DATA_VALIDATION_ERROR");
		}
		const newHeaders = [...new Set(headers.filter((key) => !context.headers.includes(key)))];
		if (!newHeaders.length) return context;
		const firstNewIndex = context.headers.length;
		context.headers.push(...newHeaders);
		context.endColumn = columnName(columnIndex(context.startColumn) + context.headers.length - 1);
		await this.client.batchUpdateValues(
			this.reference.resource,
			newHeaders.map((header, offset) => ({
				range: `${quotedSheetTitle(context.properties.title)}!${columnName(
					columnIndex(context.startColumn) + firstNewIndex + offset,
				)}${context.headerRow}`,
				values: [[header]],
			})),
		);
		return context;
	}

	async write(rows: DataRow[]): Promise<void> {
		if (!rows.length) return;
		const context = await this.ensureHeaders(rows.flatMap((row) => Object.keys(row.values)));
		await this.client.appendValues(
			this.reference.resource,
			`${quotedSheetTitle(context.properties.title)}!${context.startColumn}:${context.endColumn}`,
			rows.map((row) => context.headers.map((header) => dataValue(row.values[header] ?? null))),
		);
	}

	async update(writes: DataWrite[]): Promise<void> {
		if (!writes.length) return;
		const context = await this.ensureHeaders(writes.flatMap((write) => Object.keys(write.values)));
		const data = writes.flatMap((write) => {
			const rowNumber = Number(write.rowId.split(":").pop());
			if (!Number.isInteger(rowNumber) || rowNumber <= context.headerRow)
				throw new DataError(
					`Invalid Google Sheets row ID "${write.rowId}"`,
					"DATA_VALIDATION_ERROR",
				);
			return Object.entries(write.values).map(([header, value]) => ({
				range: `${quotedSheetTitle(context.properties.title)}!${columnName(
					columnIndex(context.startColumn) + context.headers.indexOf(header),
				)}${rowNumber}`,
				values: [[dataValue(value)]],
			}));
		});
		await this.client.batchUpdateValues(this.reference.resource, data);
	}
}
