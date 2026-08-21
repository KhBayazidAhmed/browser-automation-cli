import { taskRegistry } from "../tasks/registry.js";

const colors = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	green: "\x1b[32m",
	red: "\x1b[31m",
	yellow: "\x1b[33m",
	cyan: "\x1b[36m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
};

export function printReplHelp() {
	console.log(`\n${colors.bold}Available Commands:${colors.reset}`);
	console.log(`  ${colors.cyan}goto <url>${colors.reset}               - Navigate to a webpage`);
	console.log(
		`  ${colors.cyan}title${colors.reset}                    - Print the current page title`,
	);
	console.log(
		`  ${colors.cyan}url${colors.reset}                      - Print the current page URL`,
	);
	console.log(
		`  ${colors.cyan}text <selector>${colors.reset}          - Get text content of an element`,
	);
	console.log(`  ${colors.cyan}click <selector>${colors.reset}         - Click an element`);
	console.log(
		`  ${colors.cyan}type <selector> <text>${colors.reset}   - Type text into an input field`,
	);
	console.log(
		`  ${colors.cyan}eval <code>${colors.reset}              - Evaluate JavaScript in the page`,
	);
	console.log(
		`  ${colors.cyan}shot [path]${colors.reset}              - Save a screenshot (default: output/repl-screenshot.png)`,
	);
	console.log(
		`  ${colors.cyan}pdf [path]${colors.reset}               - Export page as PDF (default: output/repl-page.pdf)`,
	);
	console.log(
		`  ${colors.cyan}block <types>${colors.reset}            - Block resource types (e.g. block image,css,font)`,
	);
	console.log(
		`  ${colors.cyan}tasks${colors.reset}                    - List registered programmatic tasks`,
	);
	console.log(
		`  ${colors.cyan}task <id> [argsJson]${colors.reset}    - Execute a registered automation task`,
	);
	console.log(
		`  ${colors.cyan}help${colors.reset}                     - Show this list of commands`,
	);
	console.log(`  ${colors.cyan}exit / quit${colors.reset}              - Close the session\n`);
}

export function printReplTasks() {
	const tasks = taskRegistry.list();
	console.log(`\n${colors.bold}Registered Automation Tasks:${colors.reset}`);
	for (const t of tasks) {
		console.log(
			`  ${colors.cyan}${t.id.padEnd(16)}${colors.reset} - ${colors.bold}${t.name}${colors.reset}`,
		);
		console.log(`  ${"".padEnd(16)}   ${colors.dim}${t.description}${colors.reset}`);
	}
	console.log();
}

export const listTasks = printReplTasks;

export async function handleTaskCommand(args: string[], headless = false): Promise<void> {
	if (!args || args.length === 0 || !args[0]) {
		console.log(`${colors.red}Usage: task <taskId> [jsonArgs]${colors.reset}`);
		printReplTasks();
		return;
	}

	const [taskId, ...rawJsonParts] = args;
	if (!taskId) return;

	let taskArgs: Record<string, any> = {};

	if (rawJsonParts.length > 0) {
		try {
			taskArgs = JSON.parse(rawJsonParts.join(" "));
		} catch (err: unknown) {
			console.log(
				`${colors.yellow}Warning: Could not parse task arguments as JSON, passing as empty object.${colors.reset}`,
			);
		}
	}

	try {
		await taskRegistry.run(taskId, taskArgs, { headless });
	} catch (err: unknown) {
		console.log(
			`${colors.red}Task failed: ${err instanceof Error ? err.message : String(err)}${colors.reset}`,
		);
	}
}
