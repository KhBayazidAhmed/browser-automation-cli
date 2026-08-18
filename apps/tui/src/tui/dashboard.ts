import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import * as readline from "node:readline";
import { taskRegistry } from "../tasks/registry.js";
import {
	executeTaskAction,
	executeWorkflowAction,
	runInteractiveReplAction,
	startRecordingPromptAction,
} from "./dashboard-actions.js";
import {
	c,
	renderMainMenu,
	renderOutputsMenu,
	renderTasksMenu,
	renderWorkflowDetails,
	renderWorkflowsMenu,
} from "./dashboard-views.js";
import { loadAllWorkflows, type WorkflowFile } from "./workflow-loader.js";

type ViewState = "MAIN" | "WORKFLOWS" | "WORKFLOW_DETAILS" | "TASKS" | "OUTPUTS";

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
				renderMainMenu(
					this.selectedIndex,
					this.workflows.length,
					this.outputs.length,
					this.isHeadless,
				);
				break;
			case "WORKFLOWS":
				renderWorkflowsMenu(this.workflows, this.selectedIndex);
				break;
			case "WORKFLOW_DETAILS":
				if (this.selectedWorkflow) renderWorkflowDetails(this.selectedWorkflow);
				break;
			case "TASKS":
				renderTasksMenu(this.selectedIndex);
				break;
			case "OUTPUTS":
				renderOutputsMenu(this.outputs, this.selectedIndex);
				break;
		}
	}

	async start() {
		readline.emitKeypressEvents(process.stdin);
		if (process.stdin.isTTY) process.stdin.setRawMode(true);
		this.render();

		process.stdin.on("keypress", async (_str, key) => {
			if (key.ctrl && key.name === "c") {
				console.clear();
				process.exit(0);
			}
			if (key.name === "h") {
				this.isHeadless = !this.isHeadless;
				this.render();
				return;
			}
			if (key.name === "r") {
				this.refreshData();
				this.render();
				return;
			}
			if (key.name === "q") {
				console.clear();
				process.exit(0);
			}

			if (key.name === "up" || key.name === "w") {
				this.selectedIndex = Math.max(0, this.selectedIndex - 1);
				this.render();
				return;
			}
			if (key.name === "down" || key.name === "s") {
				let max = 6;
				if (this.view === "WORKFLOWS") max = Math.max(0, this.workflows.length - 1);
				if (this.view === "TASKS") max = Math.max(0, taskRegistry.list().length - 1);
				if (this.view === "OUTPUTS") max = Math.max(0, this.outputs.length - 1);
				this.selectedIndex = Math.min(max, this.selectedIndex + 1);
				this.render();
				return;
			}
			if (key.name === "escape" || key.name === "backspace") {
				if (this.view === "WORKFLOW_DETAILS") this.view = "WORKFLOWS";
				else {
					this.view = "MAIN";
					this.selectedIndex = 0;
				}
				this.render();
				return;
			}
			if (key.name === "v" && this.view === "WORKFLOWS" && this.workflows[this.selectedIndex]) {
				this.selectedWorkflow = this.workflows[this.selectedIndex]!;
				this.view = "WORKFLOW_DETAILS";
				this.render();
				return;
			}
			if (key.name === "return") {
				await this.handleSelection();
			}
		});
	}

	private async handleSelection() {
		if (this.view === "MAIN") {
			switch (this.selectedIndex) {
				case 0:
					this.refreshData();
					this.view = "WORKFLOWS";
					this.selectedIndex = 0;
					this.render();
					break;
				case 1:
					await startRecordingPromptAction(() => {
						this.refreshData();
						this.render();
					});
					break;
				case 2:
					this.view = "TASKS";
					this.selectedIndex = 0;
					this.render();
					break;
				case 3:
					await runInteractiveReplAction(this.isHeadless);
					break;
				case 4:
					this.refreshData();
					this.view = "OUTPUTS";
					this.selectedIndex = 0;
					this.render();
					break;
				case 5:
					this.isHeadless = !this.isHeadless;
					this.render();
					break;
				case 6:
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
				await executeWorkflowAction(targetWf, this.isHeadless, () => {
					this.refreshData();
					this.render();
				});
			}
		} else if (this.view === "TASKS") {
			const task = taskRegistry.list()[this.selectedIndex];
			if (task) {
				await executeTaskAction(task.id, this.isHeadless, () => {
					this.refreshData();
					this.render();
				});
			}
		}
	}
}
