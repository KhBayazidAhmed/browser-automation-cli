import { DataError } from "./errors.js";
import type { DataSourceReference } from "./types.js";

const PROVIDER_SCHEME = /^[a-z][a-z0-9+.-]*:$/i;

export function parseDataSourceUri(input: string): DataSourceReference {
	let url: URL;
	try {
		url = new URL(input);
	} catch (error) {
		throw new DataError(
			`Invalid data source URI: ${input}`,
			"DATA_VALIDATION_ERROR",
			false,
			undefined,
			error,
		);
	}
	if (!PROVIDER_SCHEME.test(`${url.protocol}`)) {
		throw new DataError(`Invalid provider scheme in URI: ${input}`, "DATA_VALIDATION_ERROR");
	}
	const provider = url.protocol.slice(0, -1).toLowerCase();
	const resource = decodeURIComponent(url.hostname);
	if (!resource)
		throw new DataError("Data source URI requires a resource ID", "DATA_VALIDATION_ERROR");
	const path = decodeURIComponent(url.pathname.replace(/^\/+/, "")) || undefined;
	const params: Record<string, string> = {};
	for (const [key, value] of url.searchParams) params[key] = value;
	return { provider, resource, path, params, raw: input };
}

export function spreadsheetIdFromInput(input: string): string {
	if (/^[a-zA-Z0-9_-]{15,}$/.test(input)) return input;
	try {
		const url = new URL(input);
		const match = url.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
		if (match?.[1]) return match[1];
	} catch {}
	throw new DataError(
		`Could not determine spreadsheet ID from "${input}"`,
		"DATA_VALIDATION_ERROR",
	);
}

export function googleSheetsUriFromInput(input: string, tab?: string, range?: string): string {
	if (input.startsWith("google-sheets://")) return input;
	const id = spreadsheetIdFromInput(input);
	const encodedTab = tab ? `/${encodeURIComponent(tab)}` : "";
	const params = new URLSearchParams();
	if (range) params.set("range", range);
	try {
		const source = new URL(input);
		const gid =
			source.searchParams.get("gid") || new URLSearchParams(source.hash.slice(1)).get("gid");
		if (gid) params.set("gid", gid);
	} catch {}
	const query = params.size ? `?${params}` : "";
	return `google-sheets://${id}${encodedTab}${query}`;
}
