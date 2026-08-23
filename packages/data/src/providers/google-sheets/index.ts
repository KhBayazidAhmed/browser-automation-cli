import { dataProviderRegistry } from "../../registry.js";
import { GoogleSheetsClient } from "./client.js";
import { GoogleSheetsProvider } from "./provider.js";

export * from "./client.js";
export * from "./credentials.js";
export * from "./mapping.js";
export * from "./oauth.js";
export * from "./provider.js";

export function registerGoogleSheetsProvider(): void {
	if (dataProviderRegistry.has("google-sheets")) return;
	dataProviderRegistry.register("google-sheets", ({ reference, account, options }) => {
		const params = { ...reference.params };
		for (const [key, value] of Object.entries(options || {})) {
			if (value !== undefined && value !== null && typeof value !== "object" && !(key in params)) {
				params[key] = String(value);
			}
		}
		const path = reference.path || (typeof options?.sheet === "string" ? options.sheet : undefined);
		return new GoogleSheetsProvider(
			{ ...reference, path, params },
			new GoogleSheetsClient(undefined, account),
		);
	});
}
