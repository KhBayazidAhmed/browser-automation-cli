import { join } from "node:path";
import * as readline from "node:readline";
import { startRepl } from "../cli.js";
import { FlowRecorder } from "../flow/recorder.js";
import { FlowRunner } from "../flow/runner.js";
import { taskRegistry } from "../tasks/registry.js";
import { c } from "./dashboard-views.js";
import type { WorkflowFile } from "./workflow-loader.js";

export async function executeWorkflowAction(
	wf: WorkflowFile,
	isHeadless: boolean,
	onDone: () => void,
) {
	if (process.stdin.isTTY) process.stdin.setRawMode(false);
	console.clear();
	await FlowRunner.run(wf.flow, {}, { headless: isHeadless });

	console.log(`\n${c.bold}Press [ENTER] to return to the Studio Dashboard...${c.reset}`);
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	rl.on("line", () => {
		rl.close();
		if (process.stdin.isTTY) process.stdin.setRawMode(true);
		onDone();
	});
}

export async function executeTaskAction(taskId: string, isHeadless: boolean, onDone: () => void) {
	if (process.stdin.isTTY) process.stdin.setRawMode(false);
	console.clear();
	await taskRegistry.runTask(taskId, {}, { headless: isHeadless });

	console.log(`\n${c.bold}Press [ENTER] to return to the Studio Dashboard...${c.reset}`);
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	rl.on("line", () => {
		rl.close();
		if (process.stdin.isTTY) process.stdin.setRawMode(true);
		onDone();
	});
}

export async function runInteractiveReplAction(isHeadless: boolean) {
	if (process.stdin.isTTY) process.stdin.setRawMode(false);
	console.clear();
	await startRepl({ headless: isHeadless });
}

export async function startRecordingPromptAction(onDone: () => void) {
	if (process.stdin.isTTY) process.stdin.setRawMode(false);
	console.clear();
	console.log(`\n${c.bold}${c.cyan}🔴 New Workflow Recording Setup${c.reset}`);
	console.log(
		`${c.dim}═══════════════════════════════════════════════════════════════════${c.reset}\n`,
	);

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	const question = (q: string): Promise<string> => new Promise((res) => rl.question(q, res));

	const defaultFilename = `workflow-${Date.now()}.json`;
	const filenameAnswer = await question(`  📁 Workflow Filename (default: ${defaultFilename}): `);
	const filename = filenameAnswer.trim() || defaultFilename;
	const finalFilename = filename.endsWith(".json") ? filename : `${filename}.json`;
	const outputPath = join(process.cwd(), "workflows", finalFilename);

	const defaultUrl = "https://news.ycombinator.com";
	const urlAnswer = await question(`  🌐 Starting Website URL (default: ${defaultUrl}): `);
	const url = urlAnswer.trim() || defaultUrl;

	rl.close();
	await FlowRecorder.record(outputPath, url);

	console.log(`\n${c.bold}Press [ENTER] to return to the Studio Dashboard...${c.reset}`);
	const rl2 = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	rl2.on("line", () => {
		rl2.close();
		if (process.stdin.isTTY) process.stdin.setRawMode(true);
		onDone();
	});
}
