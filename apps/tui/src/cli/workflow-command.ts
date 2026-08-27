import { resolve } from "node:path";
import { flagValue, parseCliKeyValues } from "../cli-args.js";
import {
	type RowExecutionOptions,
	type RowExecutionSummary,
	RowWorkflowRunner,
} from "../data/execution/index.js";
import { registerGoogleSheetsProvider } from "../data/providers/google-sheets/index.js";
import { dataProviderRegistry } from "../data/registry.js";
import { parseDataSourceUri } from "../data/uri.js";
import type { FlowDefinition } from "../flow/types.js";
import { parseFlowDefinition } from "../flow/validate.js";
import { OUTPUT_DIR, resolveTuiPath } from "../runtime-paths.js";

const EXECUTION_FLAGS = new Set([
	"data",
	"data-source",
	"resume",
	"retry-failed",
	"retry-count",
	"from-row",
	"to-row",
	"batch-size",
	"parallel",
	"where",
	"dry-run",
	"headed",
	"headless",
	"profile",
	"user-data-dir",
	"profile-directory",
	"profile-dir",
	"account",
]);
const VALUE_EXECUTION_FLAGS = new Set([
	"data",
	"data-source",
	"retry-count",
	"from-row",
	"to-row",
	"batch-size",
	"parallel",
	"where",
	"profile",
	"user-data-dir",
	"profile-directory",
	"profile-dir",
	"account",
]);

function booleanFlag(args: string[], name: string): boolean {
	const inline = args.find((arg) => arg.startsWith(`${name}=`));
	if (inline) return inline.slice(name.length + 1) === "true";
	const index = args.indexOf(name);
	if (index === -1) return false;
	return args[index + 1] !== "false";
}

function workflowVariables(args: string[], start: number): Record<string, unknown> {
	const variableArgs: string[] = [];
	for (let index = start; index < args.length; index++) {
		const raw = args[index] || "";
		if (!raw.startsWith("--")) continue;
		const name = raw.slice(2).split("=", 1)[0] || "";
		if (EXECUTION_FLAGS.has(name)) {
			if (!raw.includes("=") && VALUE_EXECUTION_FLAGS.has(name)) index++;
			continue;
		}
		variableArgs.push(raw);
	}
	return parseCliKeyValues(variableArgs, 0);
}

async function loadWorkflow(path: string): Promise<FlowDefinition> {
	const file = Bun.file(resolveTuiPath(path));
	if (!(await file.exists()))
		throw new Error(`Workflow file not found at "${resolveTuiPath(path)}"`);
	return parseFlowDefinition(await file.json());
}

function resolveSource(
	flow: FlowDefinition,
	args: string[],
): { uri: string; account?: string; provider?: string; options?: Record<string, unknown> } {
	const direct = flagValue(args, "--data");
	if (direct) return { uri: direct, account: flagValue(args, "--account") };
	const name = flagValue(args, "--data-source") || flow.data?.source;
	const config = name ? flow.dataSources?.[name] : undefined;
	if (!name || !config)
		throw new Error("Provide --data=<provider-uri> or configure data.source and dataSources");
	if (!config.uri) throw new Error(`Data source "${name}" requires a uri`);
	return {
		uri: config.uri,
		account: flagValue(args, "--account") || config.account,
		provider: config.provider,
		options: config.options,
	};
}

export async function runDataWorkflow(
	path: string,
	args: string[],
	startIndex: number,
	profile: { userDataDir?: string; profileDirectory?: string } = {},
): Promise<number> {
	registerGoogleSheetsProvider();
	const flow = await loadWorkflow(path);
	const source = resolveSource(flow, args);
	const reference = parseDataSourceUri(source.uri);
	if (source.provider && source.provider.toLowerCase() !== reference.provider) {
		throw new Error(
			`Data source provider "${source.provider}" does not match URI provider "${reference.provider}"`,
		);
	}
	const provider = await dataProviderRegistry.create(reference.provider, {
		reference,
		account: source.account,
		options: source.options,
	});
	const abortController = new AbortController();
	const abort = () => abortController.abort();
	const signalProcess = process as unknown as {
		once(event: "SIGINT" | "SIGTERM", listener: () => void): void;
		off(event: "SIGINT" | "SIGTERM", listener: () => void): void;
	};
	signalProcess.once("SIGINT", abort);
	signalProcess.once("SIGTERM", abort);
	const options: RowExecutionOptions = {
		parallel: Number(flagValue(args, "--parallel")) || 1,
		batchSize: Number(flagValue(args, "--batch-size")) || 25,
		fromRow: Number(flagValue(args, "--from-row")) || undefined,
		toRow: Number(flagValue(args, "--to-row")) || undefined,
		where: flagValue(args, "--where"),
		resume: booleanFlag(args, "--resume"),
		retryFailed: booleanFlag(args, "--retry-failed"),
		retryCount: Number(flagValue(args, "--retry-count")) || 0,
		dryRun: booleanFlag(args, "--dry-run"),
		headless: !args.includes("--headed") && !args.includes("--headless=false"),
		...profile,
		cliVariables: workflowVariables(args, startIndex),
		resultMapping: flow.data?.results,
		sensitiveColumns: flow.data?.sensitiveColumns,
		onProgress: (record) =>
			console.log(
				`[row ${record.rowIndex}] ${record.status}${record.error ? `: ${record.error.type} ${record.error.message}` : ""}`,
			),
		signal: abortController.signal,
	};
	let summary: RowExecutionSummary;
	try {
		summary = await new RowWorkflowRunner(provider, flow).run(options);
	} finally {
		signalProcess.off("SIGINT", abort);
		signalProcess.off("SIGTERM", abort);
	}
	const summaryPath = resolve(OUTPUT_DIR, `workflow-${summary.runId}-summary.json`);
	await Bun.write(summaryPath, JSON.stringify(summary, null, 2));
	console.log(
		`${summary.dryRun ? "Dry run" : "Run"}: ${summary.total} rows; ${summary.completed} completed, ${summary.failed} failed, ${summary.skipped} skipped${summary.interrupted ? "; interrupted" : ""}`,
	);
	console.log(`Summary: ${summaryPath}`);
	return summary.failed || summary.cancelled || summary.interrupted ? 1 : 0;
}

export async function handleWorkflowCommand(
	args: string[],
	profile: { userDataDir?: string; profileDirectory?: string },
): Promise<number | null> {
	if (args[0] === "workflow" && args[1] === "run" && args[2])
		return runDataWorkflow(args[2], args, 3, profile);
	if (
		(args[0] === "flow" || args[0] === "run") &&
		args[1] &&
		(flagValue(args, "--data") || flagValue(args, "--data-source"))
	)
		return runDataWorkflow(args[1], args, 2, profile);
	return null;
}
