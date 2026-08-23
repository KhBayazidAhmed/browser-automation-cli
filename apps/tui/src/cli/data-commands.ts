import { flagValue } from "../cli-args.js";
import { GoogleSheetsClient } from "../data/providers/google-sheets/client.js";
import { registerGoogleSheetsProvider } from "../data/providers/google-sheets/index.js";
import { GoogleOAuth } from "../data/providers/google-sheets/oauth.js";
import { redactSensitive, sensitiveValues } from "../data/redaction.js";
import { dataProviderRegistry } from "../data/registry.js";
import type { DataProvider } from "../data/types.js";
import { googleSheetsUriFromInput, parseDataSourceUri } from "../data/uri.js";

function sheetsUri(args: string[], input: string): string {
	const tab = flagValue(args, "--sheet");
	const range = flagValue(args, "--range");
	const uri = new URL(googleSheetsUriFromInput(input, tab, range));
	const gid = flagValue(args, "--gid");
	const headerRow = flagValue(args, "--header-row");
	if (tab) uri.pathname = `/${tab}`;
	if (range) uri.searchParams.set("range", range);
	if (gid) uri.searchParams.set("gid", gid);
	if (headerRow) uri.searchParams.set("headerRow", headerRow);
	return uri.toString();
}

async function providerFor(args: string[], input: string): Promise<DataProvider> {
	registerGoogleSheetsProvider();
	const reference = parseDataSourceUri(sheetsUri(args, input));
	return dataProviderRegistry.create(reference.provider, {
		reference,
		account: flagValue(args, "--account"),
	});
}

async function collectRows(provider: DataProvider, args: string[], defaultLimit?: number) {
	const rows = [];
	const limit = Number(flagValue(args, "--limit") || defaultLimit || 1000);
	for await (const row of provider.rows({
		fromRow: Number(flagValue(args, "--from-row")) || undefined,
		toRow: Number(flagValue(args, "--to-row")) || undefined,
		batchSize: Number(flagValue(args, "--batch-size")) || undefined,
	})) {
		rows.push(redactSensitive(row, sensitiveValues(row.values)));
		if (rows.length >= limit) break;
	}
	return rows;
}

function requireInput(args: string[], index: number, usage: string): string {
	const input = args[index];
	if (!input || input.startsWith("--")) throw new Error(`Usage: ${usage}`);
	return input;
}

export async function handleDataCommand(args: string[]): Promise<boolean> {
	if (args[0] !== "data") return false;
	registerGoogleSheetsProvider();
	if (args[1] === "providers") {
		console.log(dataProviderRegistry.list().join("\n"));
		return true;
	}
	throw new Error("Usage: data providers");
}

export async function handleSheetsCommand(args: string[]): Promise<boolean> {
	if (args[0] !== "sheets") return false;
	const action = args[1];
	const oauth = new GoogleOAuth();
	const account = flagValue(args, "--account");
	if (action === "login") {
		const credentials = await oauth.login(account);
		console.log(`Authenticated Google account: ${credentials.email || credentials.account}`);
		return true;
	}
	if (action === "logout") {
		await oauth.logout(account);
		console.log(account ? `Logged out ${account}` : "Logged out the default Google account");
		return true;
	}
	if (action === "accounts") {
		const accounts = await oauth.listAccounts();
		if (!accounts.length) console.log("No Google accounts configured.");
		else
			for (const item of accounts)
				console.log(
					`${item.email || item.account}\t${item.expiresAt > Date.now() ? "active" : "refresh required"}`,
				);
		return true;
	}
	if (action === "status") {
		const accounts = await oauth.listAccounts();
		if (!accounts.length) console.log("No Google accounts configured.");
		for (const item of accounts) {
			try {
				await oauth.accessToken(item.account);
				console.log(`${item.email || item.account}\tactive`);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				console.log(`${item.email || item.account}\treauthentication required\t${message}`);
			}
		}
		return true;
	}
	if (action === "list") {
		const files = await new GoogleSheetsClient(oauth, account).listSpreadsheets();
		for (const file of files)
			console.log(`${file.id}\t${file.name}${file.modifiedTime ? `\t${file.modifiedTime}` : ""}`);
		return true;
	}
	if (["inspect", "preview", "read", "write"].includes(action || "")) {
		const input = requireInput(
			args,
			2,
			`sheets ${action} <spreadsheet> [--sheet=<tab>] [--range=A:E]`,
		);
		const provider = await providerFor(args, input);
		await provider.connect();
		try {
			if (action === "inspect")
				console.log(JSON.stringify(await provider.discoverSchema(), null, 2));
			else if (action === "preview" || action === "read")
				console.log(
					JSON.stringify(
						await collectRows(provider, args, action === "preview" ? 10 : undefined),
						null,
						2,
					),
				);
			else {
				const row = Number(flagValue(args, "--row"));
				const values = JSON.parse(flagValue(args, "--values") || "{}") as Record<
					string,
					string | number | boolean | null
				>;
				if (!values || typeof values !== "object" || Array.isArray(values)) {
					throw new Error("--values must be a JSON object");
				}
				if (!row || !provider.update)
					throw new Error("Usage: sheets write <spreadsheet> --row=<number> --values='<json>'");
				const reference = parseDataSourceUri(sheetsUri(args, input));
				const metadata = await new GoogleSheetsClient(oauth, account).metadata(reference.resource);
				const gid = reference.params.gid;
				const sheetId = metadata.sheets.find((sheet) =>
					reference.path
						? sheet.properties.title === reference.path
						: gid
							? String(sheet.properties.sheetId) === gid
							: true,
				)?.properties.sheetId;
				if (sheetId === undefined) throw new Error("Sheet tab was not found");
				await provider.update([{ rowId: `${reference.resource}:${sheetId}:${row}`, values }]);
				console.log(`Updated row ${row}`);
			}
		} finally {
			await provider.disconnect();
		}
		return true;
	}
	throw new Error("Usage: sheets login|logout|accounts|status|list|inspect|preview|read|write");
}
