import { DataError } from "../errors.js";
import type { DataProvider, DataWrite } from "../types.js";

export class ControlledResultWriter {
	private queued: DataWrite[] = [];
	private chain = Promise.resolve();
	private readonly failures = new Map<string, DataError>();
	private readonly batchSize: number;

	constructor(
		private readonly provider: DataProvider,
		batchSize = 25,
	) {
		this.batchSize = Math.max(1, Math.min(500, Math.floor(batchSize) || 25));
	}

	async enqueue(write: DataWrite): Promise<void> {
		this.queued.push(write);
		if (this.queued.length >= this.batchSize) await this.flush();
	}

	async flush(): Promise<void> {
		if (!this.queued.length) return;
		if (!this.provider.update) {
			this.queued = [];
			return;
		}
		const batch = this.queued.splice(0, this.batchSize);
		this.chain = this.chain.then(() => this.writeBatch(batch));
		await this.chain;
		if (this.queued.length) await this.flush();
	}

	failure(rowId: string): DataError | undefined {
		return this.failures.get(rowId);
	}

	private async writeBatch(batch: DataWrite[]): Promise<void> {
		if (!this.provider.update) return;
		for (let attempt = 0; attempt < 3; attempt++) {
			try {
				await this.provider.update(batch);
				return;
			} catch (error) {
				const typed =
					error instanceof DataError
						? error
						: new DataError(
								error instanceof Error ? error.message : String(error),
								"PROVIDER_ERROR",
								false,
								undefined,
								error,
							);
				if (typed.retryable && attempt < 2) {
					await Bun.sleep(
						Math.min(30_000, typed.retryAfterMs || Math.min(10_000, 250 * 2 ** attempt)),
					);
					continue;
				}
				for (const write of batch) this.failures.set(write.rowId, typed);
				return;
			}
		}
	}
}
