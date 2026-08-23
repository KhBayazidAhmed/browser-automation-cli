import { DataError } from "./errors.js";
import type { DataProvider, DataProviderFactory, DataProviderFactoryContext } from "./types.js";

export class DataProviderRegistry {
	private readonly factories = new Map<string, DataProviderFactory>();

	register(name: string, factory: DataProviderFactory): void {
		const normalized = name.trim().toLowerCase();
		if (!normalized) throw new DataError("Provider name cannot be empty", "DATA_VALIDATION_ERROR");
		if (this.factories.has(normalized)) {
			throw new DataError(`Data provider "${normalized}" is already registered`, "PROVIDER_ERROR");
		}
		this.factories.set(normalized, factory);
	}

	has(name: string): boolean {
		return this.factories.has(name.toLowerCase());
	}

	list(): string[] {
		return [...this.factories.keys()].sort();
	}

	async create(name: string, context: DataProviderFactoryContext): Promise<DataProvider> {
		const factory = this.factories.get(name.toLowerCase());
		if (!factory) {
			throw new DataError(
				`Unknown data provider "${name}". Available: ${this.list().join(", ") || "none"}`,
				"PROVIDER_ERROR",
			);
		}
		return factory(context);
	}
}

export const dataProviderRegistry = new DataProviderRegistry();
