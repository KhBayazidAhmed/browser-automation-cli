import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { RowExecutionRecord } from "./types.js";

interface StateFile {
	version: 1;
	updatedAt: string;
	records: Record<string, RowExecutionRecord>;
}

export class ExecutionStateStore {
	private state: StateFile = { version: 1, updatedAt: new Date(0).toISOString(), records: {} };
	private writeChain = Promise.resolve();

	constructor(readonly path: string) {}

	async load(): Promise<void> {
		try {
			this.state = JSON.parse(await readFile(this.path, "utf8")) as StateFile;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		}
	}

	get(rowId: string): RowExecutionRecord | undefined {
		return this.state.records[rowId];
	}

	async set(record: RowExecutionRecord): Promise<void> {
		this.state.records[record.rowId] = record;
		this.state.updatedAt = new Date().toISOString();
		this.writeChain = this.writeChain.then(async () => {
			await mkdir(dirname(this.path), { recursive: true });
			const temporary = `${this.path}.${process.pid}.tmp`;
			await writeFile(temporary, JSON.stringify(this.state, null, 2));
			await rename(temporary, this.path);
		});
		await this.writeChain;
	}
}
