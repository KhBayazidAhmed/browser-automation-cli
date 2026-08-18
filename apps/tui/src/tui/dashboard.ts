import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import * as readline from "node:readline";
import { startRepl } from "../cli.js";
import { FlowRecorder } from "../flow/recorder.js";
import { FlowRunner } from "../flow/runner.js";
import { taskRegistry } from "../tasks/registry.js";
import { loadAllWorkflows, type WorkflowFile } from "./workflow-loader.js";

const c = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	green: "\x1b[32m",
	red: "\x1b[31m",
	yellow: "\x1b[33m",
	cyan: "\x1b[36m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	bgCyan: "\x1b[46m\x1b[30m",
	bgBlue: "\x1b[44m\x1b[37m",
	bgWhite: "\x1b[47m\x1b[30m",
};

type ViewState =
	| "MAIN"
	| "WORKFLOWS"
	| "WORKFLOW_DETAILS"
	| "TASKS"
	| "OUTPUTS"
	| "RECORD_PROMPT";

export class Dashboard {
	private view: ViewState = "MAIN";
	private selectedIndex = 0;
	private isHeadless = true;
	private workflows: WorkflowFile[] = [];
	private selectedWorkflow: WorkflowFile | null = null;
	private outputs: Array<{ name: string; size: string; time: string }> = [];

	constructor() {
		this.refreshData();
	}

	refreshData() {
		this.workflows = loadAllWorkflows();
		const outputDir = join(process.cwd(), "output");
		if (existsSync(outputDir)) {
			const files = readdirSync(outputDir).filter((f) => !f.startsWith("."));
			this.outputs = files.map((f) => {
				const stats = statSync(join(outputDir, f));
				return {
					name: f,
					size: `${(stats.size / 1024).toFixed(1)} KB`,
					time: new Date(stats.mtime).toLocaleTimeString(),
				};
			});
		} else {
			this.outputs = [];
		}
	}

	render() {
		console.clear();
		const width = 72;
		const line = "═".repeat(width);
		const modeBadge = this.isHeadless
			? `${c.dim}Headless: [ON]${c.reset}`
			: `${c.green}Headed: [VISIBLE]${c.reset}`;

		console.log(`${c.bold}${c.cyan}╔${line}╗${c.reset}`);
		console.log(
			`${c.bold}${c.cyan}║   ⚡ DIRECT CDP BROWSER AUTOMATION STUDIO                      ║${c.reset}`,
		);
		console.log(
			`${c.bold}${c.cyan}║   ${modeBadge}  ${c.dim}| Mode toggle: 'h' | Refresh: 'r' | Quit: 'q'${c.cyan}  ║${c.reset}`,
		);
		console.log(`${c.bold}${c.cyan}╚${line}╝${c.reset}\n`);

		switch (this.view) {
			case "MAIN":
				this.renderMainMenu();
				break;
			case "WORKFLOWS":
				this.renderWorkflowsMenu();
				break;
			case "WORKFLOW_DETAILS":
				this.renderWorkflowDetails();
				break;
			case "TASKS":
				this.renderTasksMenu();
				break;
			case "OUTPUTS":
				this.renderOutputsMenu();
				break;
		}
	}

	private renderMainMenu() {
		const menuItems = [
			{
				icon: "🌊",
				title: "Workflows Library",
				desc: `Browse & execute declarative flows (${this.workflows.length} available)`,
			},
			{
				icon: "🔴",
				title: "Record New Workflow",
				desc: "Launch visual in-browser recorder with HUD & data capture",
			},
			{
				icon: "🚀",
				title: "Programmatic Tasks",
				desc: "Scrapers, site health audit, and interactive form automations",
			},
			{
				icon: "💬",
				title: "Interactive Browser REPL",
				desc: "Direct live terminal prompt to execute CDP commands",
			},
			{
				icon: "📁",
				title: "View Extracted Outputs",
				desc: `Inspect generated JSON files and screenshots (${this.outputs.length} files)`,
			},
			{
				icon: "⚙️ ",
				title: `Toggle Browser Window Mode (${this.isHeadless ? "Headless" : "Headed Window"})`,
				desc: "Switch between background execution and visible Chrome window",
			},
			{
				icon: "❌",
				title: "Exit Studio",
				desc: "Close the terminal UI",
			},
		];

		console.log(`${c.bold}Select an option:${c.reset}\n`);

		menuItems.forEach((item, idx) => {
			const isSelected = idx === this.selectedIndex;
			const prefix = isSelected ? `${c.bgCyan} > ` : "   ";
			const title = isSelected
				? `${c.bold}${item.title}${c.reset}`
				: `${item.title}`;
			const suffix = isSelected ? `${c.reset}` : "";

			console.log(`${prefix} ${item.icon} ${title}${suffix}`);
			console.log(`      ${c.dim}${item.desc}${c.reset}`);
		});

		console.log(
			`\n${c.dim}Navigation: [↑/↓] or [w/s] to move | [Enter] to select | [q] to exit${c.reset}`,
		);
	}

	private renderWorkflowsMenu() {
		console.log(`${c.bold}${c.cyan}🌊 Workflows Library${c.reset}`);
		console.log(
			`${c.dim}Select a workflow to run or inspect steps:${c.reset}\n`,
		);

		if (this.workflows.length === 0) {
			console.log(
				`  ${c.yellow}No workflow files found in ./workflows/${c.reset}`,
			);
			console.log(`  Press 'r' to record a new workflow!\n`);
		} else {
			this.workflows.forEach((wf, idx) => {
				const isSelected = idx === this.selectedIndex;
				const prefix = isSelected ? `${c.bgCyan} > ` : "   ";
				const title = isSelected
					? `${c.bold}${wf.flow.name}${c.reset}`
					: `${wf.flow.name}`;

				console.log(
					`${prefix} ${title} ${c.dim}(${wf.stepCount} steps) - ${wf.filename}${c.reset}`,
				);
				if (wf.flow.description) {
					console.log(`      ${c.dim}${wf.flow.description}${c.reset}`);
				}
			});
		}

		console.log(
			`\n${c.dim}[Enter] Run Workflow | [v] View Steps | [Esc / Backspace] Back | [q] Quit${c.reset}`,
		);
	}

	private renderWorkflowDetails() {
		if (!this.selectedWorkflow) return;
		const wf = this.selectedWorkflow;

		console.log(`${c.bold}${c.cyan}🌊 Workflow: ${wf.flow.name}${c.reset}`);
		console.log(`  ${c.dim}File: ${wf.path}${c.reset}`);
		if (wf.flow.description) {
			console.log(`  ${c.dim}Description: ${wf.flow.description}${c.reset}`);
		}
		console.log(`\n${c.bold}Steps (${wf.flow.steps.length}):${c.reset}`);

		wf.flow.steps.forEach((step, idx) => {
			const stepName = step.name || step.action.toUpperCase();
			let details = "";
			if (step.action === "goto") details = `URL: ${(step as any).url}`;
			else if (step.action === "click") {
				const s = step as any;
				details = s.selector ? `Selector: ${s.selector}` : "";
				if (s.text) details += `${details ? ", " : ""}Strict Text: "${s.text}"`;
			} else if (step.action === "type") {
				const s = step as any;
				details = `"${s.text}" -> ${s.selector || (s.targetText ? `target: "${s.targetText}"` : "input")}`;
			} else if (step.action === "waitForSelector") {
				const s = step as any;
				details = s.selector ? `Selector: ${s.selector}` : "";
				if (s.text) details += `${details ? ", " : ""}Strict Text: "${s.text}"`;
			} else if (step.action === "extract") {
				const s = step as any;
				details = `"${s.as}" from ${s.selector || `text: "${s.text}"`}`;
			} else if (step.action === "extractMultiple")
				details = `"${(step as any).as}" from ${(step as any).containerSelector}`;
			else if (step.action === "screenshot")
				details = `Path: ${(step as any).path || "default"}`;
			else if (step.action === "assert") {
				const s = step as any;
				details = s.selector ? `Selector: ${s.selector}` : "";
				if (s.equals || s.strictText)
					details += `${details ? ", " : ""}Strict Text: "${s.equals || s.strictText}"`;
				else if (s.contains)
					details += `${details ? ", " : ""}Contains: "${s.contains}"`;
			}

			console.log(
				`  ${c.bold}[${idx + 1}] ${step.action.toUpperCase()}${c.reset} - ${stepName} ${c.dim}(${details})${c.reset}`,
			);
		});

		console.log(
			`\n${c.dim}[Enter] Execute Workflow | [Esc / Backspace] Back to list${c.reset}`,
		);
	}

	private renderTasksMenu() {
		console.log(`${c.bold}${c.cyan}🚀 Programmatic Automation Tasks${c.reset}`);
		console.log(`${c.dim}Select a task to run immediately:${c.reset}\n`);

		const tasks = taskRegistry.list();
		tasks.forEach((task, idx) => {
			const isSelected = idx === this.selectedIndex;
			const prefix = isSelected ? `${c.bgCyan} > ` : "   ";
			const title = isSelected
				? `${c.bold}${task.name}${c.reset}`
				: `${task.name}`;

			console.log(`${prefix} ${title} ${c.dim}(id: ${task.id})${c.reset}`);
			console.log(`      ${c.dim}${task.description}${c.reset}`);
		});

		console.log(
			`\n${c.dim}[Enter] Run Task | [Esc / Backspace] Back to Main Menu | [q] Quit${c.reset}`,
		);
	}

	private renderOutputsMenu() {
		console.log(`${c.bold}${c.cyan}📁 Extracted Outputs & Reports${c.reset}`);
		console.log(`${c.dim}Files saved in ./output/:${c.reset}\n`);

		if (this.outputs.length === 0) {
			console.log(`  ${c.yellow}No output files generated yet.${c.reset}`);
		} else {
			this.outputs.forEach((item, idx) => {
				const isSelected = idx === this.selectedIndex;
				const prefix = isSelected ? `${c.bgCyan} > ` : "   ";
				const icon = item.name.endsWith(".png")
					? "📸"
					: item.name.endsWith(".json")
						? "📄"
						: "📁";
				console.log(
					`${prefix} ${icon} ${item.name} ${c.dim}(${item.size} - ${item.time})${c.reset}`,
				);
			});
		}

		console.log(
			`\n${c.dim}[Esc / Backspace] Back to Main Menu | [r] Refresh | [q] Quit${c.reset}`,
		);
	}

	async start() {
		readline.emitKeypressEvents(process.stdin);
		if (process.stdin.isTTY) {
			process.stdin.setRawMode(true);
		}

		this.render();

		process.stdin.on("keypress", async (str, key) => {
			if (key.ctrl && key.name === "c") {
				console.clear();
				process.exit(0);
			}

			// Hotkey: toggle headed / headless
			if (key.name === "h") {
				this.isHeadless = !this.isHeadless;
				this.render();
				return;
			}

			// Hotkey: refresh
			if (key.name === "r") {
				this.refreshData();
				this.render();
				return;
			}

			// Hotkey: quit
			if (key.name === "q") {
				console.clear();
				process.exit(0);
			}

			// Navigation
			if (key.name === "up" || key.name === "w") {
				this.selectedIndex = Math.max(0, this.selectedIndex - 1);
				this.render();
				return;
			}

			if (key.name === "down" || key.name === "s") {
				let max = 7;
				if (this.view === "WORKFLOWS")
					max = Math.max(0, this.workflows.length - 1);
				if (this.view === "TASKS")
					max = Math.max(0, taskRegistry.list().length - 1);
				if (this.view === "OUTPUTS") max = Math.max(0, this.outputs.length - 1);
				this.selectedIndex = Math.min(max, this.selectedIndex + 1);
				this.render();
				return;
			}

			// Back navigation
			if (key.name === "escape" || key.name === "backspace") {
				if (this.view === "WORKFLOW_DETAILS") {
					this.view = "WORKFLOWS";
				} else {
					this.view = "MAIN";
					this.selectedIndex = 0;
				}
				this.render();
				return;
			}

			// View details in workflows
			if (
				key.name === "v" &&
				this.view === "WORKFLOWS" &&
				this.workflows[this.selectedIndex]
			) {
				this.selectedWorkflow = this.workflows[this.selectedIndex]!;
				this.view = "WORKFLOW_DETAILS";
				this.render();
				return;
			}

			// Enter key (Action trigger)
			if (key.name === "return") {
				await this.handleSelection();
			}
		});
	}

	private async handleSelection() {
		if (this.view === "MAIN") {
			switch (this.selectedIndex) {
				case 0: // Workflows
					this.refreshData();
					this.view = "WORKFLOWS";
					this.selectedIndex = 0;
					this.render();
					break;
				case 1: // Record
					await this.startRecordingPrompt();
					break;
				case 2: // Tasks
					this.view = "TASKS";
					this.selectedIndex = 0;
					this.render();
					break;
				case 3: // REPL
					await this.runInteractiveRepl();
					break;
				case 4: // Outputs
					this.refreshData();
					this.view = "OUTPUTS";
					this.selectedIndex = 0;
					this.render();
					break;
				case 5: // Toggle Mode
					this.isHeadless = !this.isHeadless;
					this.render();
					break;
				case 6: // Exit
					console.clear();
					process.exit(0);
					break;
			}
		} else if (this.view === "WORKFLOWS" || this.view === "WORKFLOW_DETAILS") {
			const targetWf =
				this.view === "WORKFLOW_DETAILS"
					? this.selectedWorkflow
					: this.workflows[this.selectedIndex];

			if (targetWf) {
				await this.executeWorkflow(targetWf);
			}
		} else if (this.view === "TASKS") {
			const tasks = taskRegistry.list();
			const task = tasks[this.selectedIndex];
			if (task) {
				await this.executeTask(task.id);
			}
		}
	}

	private async executeWorkflow(wf: WorkflowFile) {
		if (process.stdin.isTTY) {
			process.stdin.setRawMode(false);
		}
		console.clear();
		await FlowRunner.run(wf.flow, {}, { headless: this.isHeadless });

		console.log(
			`\n${c.bold}Press [ENTER] to return to the Studio Dashboard...${c.reset}`,
		);
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		rl.on("line", () => {
			rl.close();
			if (process.stdin.isTTY) {
				process.stdin.setRawMode(true);
			}
			this.refreshData();
			this.render();
		});
	}

	private async executeTask(taskId: string) {
		if (process.stdin.isTTY) {
			process.stdin.setRawMode(false);
		}
		console.clear();
		await taskRegistry.runTask(taskId, {}, { headless: this.isHeadless });

		console.log(
			`\n${c.bold}Press [ENTER] to return to the Studio Dashboard...${c.reset}`,
		);
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		rl.on("line", () => {
			rl.close();
			if (process.stdin.isTTY) {
				process.stdin.setRawMode(true);
			}
			this.refreshData();
			this.render();
		});
	}

	private async runInteractiveRepl() {
		if (process.stdin.isTTY) {
			process.stdin.setRawMode(false);
		}
		console.clear();
		await startRepl({ headless: this.isHeadless });
	}

	private async startRecordingPrompt() {
		if (process.stdin.isTTY) {
			process.stdin.setRawMode(false);
		}
		console.clear();
		console.log(
			`\n${c.bold}${c.cyan}🔴 New Workflow Recording Setup${c.reset}`,
		);
		console.log(
			`${c.dim}═══════════════════════════════════════════════════════════════════${c.reset}\n`,
		);

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		const question = (q: string): Promise<string> =>
			new Promise((res) => rl.question(q, res));

		const defaultFilename = `workflow-${Date.now()}.json`;
		const filenameAnswer = await question(
			`  📁 Workflow Filename (default: ${defaultFilename}): `,
		);
		const filename = filenameAnswer.trim() || defaultFilename;
		const finalFilename = filename.endsWith(".json")
			? filename
			: `${filename}.json`;
		const outputPath = join(process.cwd(), "workflows", finalFilename);

		const defaultUrl = "https://news.ycombinator.com";
		const urlAnswer = await question(
			`  🌐 Starting Website URL (default: ${defaultUrl}): `,
		);
		const url = urlAnswer.trim() || defaultUrl;

		rl.close();

		await FlowRecorder.record(outputPath, url);

		console.log(
			`\n${c.bold}Press [ENTER] to return to the Studio Dashboard...${c.reset}`,
		);
		const rl2 = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		rl2.on("line", () => {
			rl2.close();
			if (process.stdin.isTTY) {
				process.stdin.setRawMode(true);
			}
			this.refreshData();
			this.render();
		});
	}
}
