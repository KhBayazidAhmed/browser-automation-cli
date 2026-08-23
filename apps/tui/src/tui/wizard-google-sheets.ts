import * as p from "@clack/prompts";
import { registerGoogleSheetsProvider } from "../data/providers/google-sheets/index.js";
import { GoogleOAuth } from "../data/providers/google-sheets/oauth.js";
import { dataProviderRegistry } from "../data/registry.js";
import { googleSheetsUriFromInput, parseDataSourceUri } from "../data/uri.js";
import type { FlowDefinition } from "../flow/types.js";
import { loadAllWorkflows } from "./workflow-loader.js";

interface SheetConnectionInput {
	input: string;
	tab?: string;
	range?: string;
	account?: string;
	name?: string;
}

export function attachGoogleSheetToFlow(
	flow: FlowDefinition,
	connection: SheetConnectionInput,
): FlowDefinition {
	const name = connection.name?.trim() || "googleSheet";
	const uri = googleSheetsUriFromInput(connection.input, connection.tab, connection.range);
	return {
		...flow,
		data: { ...flow.data, source: name },
		dataSources: {
			...flow.dataSources,
			[name]: {
				provider: "google-sheets",
				uri,
				...(connection.account ? { account: connection.account } : {}),
			},
		},
	};
}

async function selectGoogleAccount(oauth: GoogleOAuth): Promise<string | undefined | null> {
	const accounts = await oauth.listAccounts();
	const choice = await p.select({
		message: "Choose a Google account:",
		options: [
			...accounts.map((account) => ({
				value: account.account,
				label: account.email || account.account,
				hint: account.expiresAt > Date.now() ? "Connected" : "Token refresh required",
			})),
			{
				value: "__connect__",
				label: "＋ Connect another Google account",
				hint: "Open Google's OAuth consent page",
			},
		],
	});
	if (p.isCancel(choice)) return null;
	if (choice !== "__connect__") return String(choice);

	const hint = await p.text({
		message: "Google account email (optional):",
		placeholder: "you@example.com",
	});
	if (p.isCancel(hint)) return null;
	p.log.info("Opening Google authorization in your browser…");
	const credentials = await oauth.login(hint.trim() || undefined);
	p.log.success(`Connected ${credentials.email || credentials.account}`);
	return credentials.account;
}

async function previewConnection(connection: SheetConnectionInput): Promise<void> {
	registerGoogleSheetsProvider();
	const uri = googleSheetsUriFromInput(connection.input, connection.tab, connection.range);
	const reference = parseDataSourceUri(uri);
	const provider = await dataProviderRegistry.create(reference.provider, {
		reference,
		account: connection.account,
	});
	const spinner = p.spinner();
	spinner.start("Checking Google Sheet access and reading columns…");
	try {
		await provider.connect();
		const schema = await provider.discoverSchema();
		const preview: Array<Record<string, unknown>> = [];
		for await (const row of provider.rows({ batchSize: 5 })) {
			preview.push(row.values);
			if (preview.length >= 5) break;
		}
		spinner.stop(`Connected — ${schema.columns.length} columns found`);
		const columns = schema.columns.map((column) => column.name).join(", ") || "No columns found";
		const rows = preview.length
			? preview.map((row, index) => `${index + 1}. ${JSON.stringify(row)}`).join("\n")
			: "No data rows found after the header.";
		p.note(`Columns: ${columns}\n\nPreview:\n${rows}`, "Google Sheets connection");
	} catch (error) {
		spinner.error("Could not connect");
		throw error;
	} finally {
		await provider.disconnect().catch(() => undefined);
	}
}

export async function handleGoogleSheetsConnection(): Promise<void> {
	try {
		const account = await selectGoogleAccount(new GoogleOAuth());
		if (account === null) return;

		const input = await p.text({
			message: "Google Sheet URL or spreadsheet ID:",
			placeholder: "https://docs.google.com/spreadsheets/d/...",
			validate: (value) => {
				if (!value?.trim()) return "A Google Sheet URL or spreadsheet ID is required";
				try {
					googleSheetsUriFromInput(value.trim());
				} catch (error) {
					return error instanceof Error ? error.message : "Invalid Google Sheet";
				}
				return undefined;
			},
		});
		if (p.isCancel(input)) return;

		const tab = await p.text({
			message: "Sheet tab (optional):",
			placeholder: "Leads",
		});
		if (p.isCancel(tab)) return;
		const range = await p.text({
			message: "Cell range (optional):",
			placeholder: "A1:H500",
		});
		if (p.isCancel(range)) return;

		const connection: SheetConnectionInput = {
			input: input.trim(),
			tab: tab.trim() || undefined,
			range: range.trim() || undefined,
			account: account || undefined,
		};
		await previewConnection(connection);

		const workflows = loadAllWorkflows();
		if (!workflows.length) {
			p.log.info(
				"Connection verified. Use the Sheets button in the recorder HUD to attach it to a new workflow.",
			);
			return;
		}
		const shouldAttach = await p.confirm({
			message: "Attach this Google Sheet to an existing workflow?",
			initialValue: true,
		});
		if (p.isCancel(shouldAttach) || !shouldAttach) return;

		const workflow = await p.select({
			message: "Choose a workflow:",
			options: workflows.map((item) => ({
				value: item.path,
				label: item.flow.name,
				hint: item.filename,
			})),
		});
		if (p.isCancel(workflow)) return;
		const selected = workflows.find((item) => item.path === String(workflow));
		if (!selected) return;

		const name = await p.text({
			message: "Connection name:",
			defaultValue: "googleSheet",
			validate: (value) =>
				/^[A-Za-z_][A-Za-z0-9_-]*$/.test(value || "")
					? undefined
					: "Use letters, numbers, underscores, or hyphens",
		});
		if (p.isCancel(name)) return;
		const updated = attachGoogleSheetToFlow(selected.flow, { ...connection, name });
		await Bun.write(selected.path, JSON.stringify(updated, null, 2));
		p.log.success(`Attached Google Sheets connection to ${selected.filename}`);
		p.log.info(`Run it with: bun src/index.ts workflow run ${selected.path}`);
	} catch (error) {
		p.log.error(error instanceof Error ? error.message : String(error));
	}
}
