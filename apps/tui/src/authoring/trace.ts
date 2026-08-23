import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { AuthoringTraceRecord } from "./types.js";

export class AuthoringTrace {
	private sequence = 0;

	constructor(
		readonly sessionId: string,
		readonly path: string,
	) {}

	async append(record: Omit<AuthoringTraceRecord, "sequence" | "timestamp" | "sessionId">) {
		await mkdir(dirname(this.path), { recursive: true });
		const entry: AuthoringTraceRecord = {
			...record,
			sequence: ++this.sequence,
			timestamp: new Date().toISOString(),
			sessionId: this.sessionId,
		};
		await appendFile(this.path, `${JSON.stringify(entry)}\n`, "utf8");
		return entry;
	}

	async read(): Promise<AuthoringTraceRecord[]> {
		try {
			const contents = await readFile(this.path, "utf8");
			return contents
				.split("\n")
				.filter(Boolean)
				.map((line) => JSON.parse(line) as AuthoringTraceRecord);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
			throw error;
		}
	}
}
