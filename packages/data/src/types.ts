export type DataValue =
	| string
	| number
	| boolean
	| null
	| DataValue[]
	| { [key: string]: DataValue };

export interface DataRow {
	id: string;
	index: number;
	values: Record<string, DataValue>;
	metadata?: Record<string, unknown>;
}

export interface DataColumn {
	name: string;
	type: "string" | "number" | "boolean" | "date" | "json" | "unknown";
	required?: boolean;
	sensitive?: boolean;
	providerName?: string;
}

export interface DataSchema {
	columns: DataColumn[];
	metadata?: Record<string, unknown>;
}

export interface DataReadOptions {
	fromRow?: number;
	toRow?: number;
	batchSize?: number;
	where?: string;
}

export interface DataWrite {
	rowId: string;
	values: Record<string, DataValue>;
}

export interface DataProviderCapabilities {
	read: boolean;
	write: boolean;
	update: boolean;
	streaming: boolean;
	schemaDiscovery: boolean;
}

export interface DataSourceReference {
	provider: string;
	resource: string;
	path?: string;
	params: Record<string, string>;
	raw: string;
}

export interface DataProvider {
	readonly name: string;
	readonly capabilities: DataProviderCapabilities;
	connect(): Promise<void>;
	disconnect(): Promise<void>;
	discoverSchema(): Promise<DataSchema>;
	rows(options?: DataReadOptions): AsyncIterable<DataRow>;
	readRow?(rowId: string): Promise<DataRow | null>;
	write?(rows: DataRow[]): Promise<void>;
	update?(writes: DataWrite[]): Promise<void>;
}

export interface DataProviderFactoryContext {
	reference: DataSourceReference;
	account?: string;
	options?: Record<string, unknown>;
}

export type DataProviderFactory = (
	context: DataProviderFactoryContext,
) => DataProvider | Promise<DataProvider>;

export interface DataSourceConfig {
	provider: string;
	uri?: string;
	account?: string;
	options?: Record<string, unknown>;
}
