import { DataError } from "../../errors.js";
import { GoogleOAuth } from "./oauth.js";

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const DRIVE_API = "https://www.googleapis.com/drive/v3/files";

function retryDelay(response: Response, attempt: number): number {
	const retryAfter = response.headers.get("retry-after");
	if (retryAfter && Number.isFinite(Number(retryAfter))) {
		return Math.min(30_000, Number(retryAfter) * 1000);
	}
	if (retryAfter) {
		const retryAt = Date.parse(retryAfter);
		if (Number.isFinite(retryAt)) return Math.min(30_000, Math.max(0, retryAt - Date.now()));
	}
	return Math.min(30_000, 500 * 2 ** attempt) + Math.floor(Math.random() * 250);
}

export interface SheetProperties {
	sheetId: number;
	title: string;
	gridProperties?: { rowCount?: number; columnCount?: number };
}

export class GoogleSheetsClient {
	constructor(
		private readonly oauth = new GoogleOAuth(),
		private readonly account?: string,
	) {}

	private async request<T>(url: string, init?: RequestInit): Promise<T> {
		let forceRefresh = false;
		let refreshedAfterUnauthorized = false;
		for (let attempt = 0; attempt < 5; attempt++) {
			const token = await this.oauth.accessToken(this.account, forceRefresh);
			forceRefresh = false;
			let response: Response;
			try {
				response = await fetch(url, {
					...init,
					headers: {
						authorization: `Bearer ${token}`,
						"content-type": "application/json",
						...init?.headers,
					},
				});
			} catch (error) {
				if (attempt < 4) {
					await Bun.sleep(Math.min(30_000, 500 * 2 ** attempt));
					continue;
				}
				throw new DataError(
					`Google API network error: ${error instanceof Error ? error.message : String(error)}`,
					"PROVIDER_ERROR",
					true,
					undefined,
					error,
				);
			}
			if (response.ok) return (response.status === 204 ? undefined : await response.json()) as T;
			if (response.status === 401 && !refreshedAfterUnauthorized) {
				refreshedAfterUnauthorized = true;
				forceRefresh = true;
				continue;
			}
			let detail = response.statusText;
			let reason = "";
			try {
				const body = (await response.json()) as {
					error?: {
						message?: string;
						status?: string;
						errors?: Array<{ reason?: string }>;
					};
				};
				reason = [body.error?.status, ...(body.error?.errors?.map((item) => item.reason) || [])]
					.filter(Boolean)
					.join(" ");
				detail = body.error?.message || detail;
			} catch {}
			const quotaLimited =
				response.status === 429 ||
				(response.status === 403 &&
					/quota|rate.?limit|resource.?exhausted/i.test(`${reason} ${detail}`));
			const retryable = quotaLimited || response.status === 408 || response.status >= 500;
			if (retryable && attempt < 4) {
				await Bun.sleep(retryDelay(response, attempt));
				continue;
			}
			const code = quotaLimited
				? "RATE_LIMIT_ERROR"
				: response.status === 401 || response.status === 403
					? "AUTH_ERROR"
					: "PROVIDER_ERROR";
			throw new DataError(
				`Google API ${response.status}: ${detail}`,
				code,
				retryable,
				retryDelay(response, attempt),
			);
		}
		throw new DataError("Google API retry limit exhausted", "RATE_LIMIT_ERROR", true);
	}

	async metadata(spreadsheetId: string): Promise<{
		spreadsheetId: string;
		properties: { title: string };
		sheets: Array<{ properties: SheetProperties }>;
	}> {
		return this.request(
			`${SHEETS_API}/${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId,properties.title,sheets.properties`,
		);
	}

	async values(
		spreadsheetId: string,
		range: string,
	): Promise<Array<Array<string | number | boolean>>> {
		const result = await this.request<{ values?: Array<Array<string | number | boolean>> }>(
			`${SHEETS_API}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`,
		);
		return result.values || [];
	}

	async batchUpdateValues(
		spreadsheetId: string,
		data: Array<{ range: string; values: unknown[][] }>,
	): Promise<void> {
		for (let start = 0; start < data.length; start += 500) {
			await this.request(`${SHEETS_API}/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`, {
				method: "POST",
				body: JSON.stringify({ valueInputOption: "RAW", data: data.slice(start, start + 500) }),
			});
		}
	}

	async appendValues(spreadsheetId: string, range: string, values: unknown[][]): Promise<void> {
		if (!values.length) return;
		const query = new URLSearchParams({
			valueInputOption: "RAW",
			insertDataOption: "INSERT_ROWS",
		});
		await this.request(
			`${SHEETS_API}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?${query}`,
			{
				method: "POST",
				body: JSON.stringify({ majorDimension: "ROWS", values }),
			},
		);
	}

	async listSpreadsheets(): Promise<Array<{ id: string; name: string; modifiedTime?: string }>> {
		const files: Array<{ id: string; name: string; modifiedTime?: string }> = [];
		let pageToken: string | undefined;
		do {
			const query = new URLSearchParams({
				q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
				fields: "nextPageToken,files(id,name,modifiedTime)",
				orderBy: "modifiedTime desc",
				pageSize: "100",
			});
			if (pageToken) query.set("pageToken", pageToken);
			const result = await this.request<{
				files?: Array<{ id: string; name: string; modifiedTime?: string }>;
				nextPageToken?: string;
			}>(`${DRIVE_API}?${query}`);
			files.push(...(result.files || []));
			pageToken = result.nextPageToken;
		} while (pageToken);
		return files;
	}
}
