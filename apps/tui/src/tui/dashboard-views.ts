import { taskRegistry } from "../tasks/registry.js";
import type { WorkflowFile } from "./workflow-loader.js";

export const c = {
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
};

export function renderMainMenu(
	selectedIndex: number,
	workflowsCount: number,
	outputsCount: number,
	isHeadless: boolean,
) {
	const menuItems = [
		{
			icon: "🌊",
			title: "Workflows Library",
			desc: `Browse & execute declarative flows (${workflowsCount} available)`,
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
			desc: `Inspect generated JSON files and screenshots (${outputsCount} files)`,
		},
		{
			icon: "⚙️ ",
			title: `Toggle Browser Window Mode (${isHeadless ? "Headless" : "Headed Window"})`,
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
		const isSelected = idx === selectedIndex;
		const prefix = isSelected ? `${c.bgCyan} > ` : "   ";
		const title = isSelected ? `${c.bold}${item.title}${c.reset}` : `${item.title}`;
		console.log(`${prefix} ${item.icon} ${title}${isSelected ? c.reset : ""}`);
		console.log(`      ${c.dim}${item.desc}${c.reset}`);
	});

	console.log(
		`\n${c.dim}Navigation: [↑/↓] or [w/s] to move | [Enter] to select | [q] to exit${c.reset}`,
	);
}

export function renderWorkflowsMenu(workflows: WorkflowFile[], selectedIndex: number) {
	console.log(`${c.bold}${c.cyan}🌊 Workflows Library${c.reset}`);
	console.log(`${c.dim}Select a workflow to run or inspect steps:${c.reset}\n`);

	if (workflows.length === 0) {
		console.log(`  ${c.yellow}No workflow files found in ./workflows/${c.reset}`);
		console.log("  Press 'r' to record a new workflow!\n");
	} else {
		workflows.forEach((wf, idx) => {
			const isSelected = idx === selectedIndex;
			const prefix = isSelected ? `${c.bgCyan} > ` : "   ";
			const title = isSelected ? `${c.bold}${wf.flow.name}${c.reset}` : wf.flow.name;
			console.log(`${prefix} ${title} ${c.dim}(${wf.stepCount} steps) - ${wf.filename}${c.reset}`);
			if (wf.flow.description) {
				console.log(`      ${c.dim}${wf.flow.description}${c.reset}`);
			}
		});
	}

	console.log(
		`\n${c.dim}[Enter] Run Workflow | [v] View Steps | [Esc / Backspace] Back | [q] Quit${c.reset}`,
	);
}

export function renderWorkflowDetails(wf: WorkflowFile) {
	console.log(`${c.bold}${c.cyan}🌊 Workflow: ${wf.flow.name}${c.reset}`);
	console.log(`  ${c.dim}File: ${wf.path}${c.reset}`);
	if (wf.flow.description) {
		console.log(`  ${c.dim}Description: ${wf.flow.description}${c.reset}`);
	}
	console.log(`\n${c.bold}Steps (${wf.flow.steps.length}):${c.reset}`);

	wf.flow.steps.forEach((step, idx) => {
		const stepName = step.name || step.action.toUpperCase();
		let details = "";
		const s = step as Record<string, unknown>;
		if (step.action === "goto") details = `URL: ${s.url}`;
		else if (step.action === "click") {
			details = s.selector ? `Selector: ${s.selector}` : "";
			if (s.text) details += `${details ? ", " : ""}Strict: "${s.text}"`;
		} else if (step.action === "type") {
			details = `"${s.text}" -> ${s.selector || (s.targetText ? `target: "${s.targetText}"` : "input")}`;
		} else if (step.action === "extract") {
			details = `"${s.as}" from ${s.selector || `text: "${s.text}"`}`;
		} else if (step.action === "extractMultiple") {
			details = `"${s.as}" from ${s.containerSelector}`;
		} else if (step.action === "screenshot") {
			details = `Path: ${s.path || "default"}`;
		} else if (step.action === "assert") {
			details = s.selector ? `Selector: ${s.selector}` : "";
			if (s.equals || s.strictText)
				details += `${details ? ", " : ""}Strict: "${s.equals || s.strictText}"`;
			else if (s.contains) details += `${details ? ", " : ""}Contains: "${s.contains}"`;
		}

		console.log(
			`  ${c.bold}[${idx + 1}] ${step.action.toUpperCase()}${c.reset} - ${stepName} ${c.dim}(${details})${c.reset}`,
		);
	});

	console.log(`\n${c.dim}[Enter] Execute Workflow | [Esc / Backspace] Back to list${c.reset}`);
}

export function renderTasksMenu(selectedIndex: number) {
	console.log(`${c.bold}${c.cyan}🚀 Programmatic Automation Tasks${c.reset}`);
	console.log(`${c.dim}Select a task to run immediately:${c.reset}\n`);

	const tasks = taskRegistry.list();
	tasks.forEach((task, idx) => {
		const isSelected = idx === selectedIndex;
		const prefix = isSelected ? `${c.bgCyan} > ` : "   ";
		const title = isSelected ? `${c.bold}${task.name}${c.reset}` : task.name;
		console.log(`${prefix} ${title} ${c.dim}(id: ${task.id})${c.reset}`);
		console.log(`      ${c.dim}${task.description}${c.reset}`);
	});

	console.log(
		`\n${c.dim}[Enter] Run Task | [Esc / Backspace] Back to Main Menu | [q] Quit${c.reset}`,
	);
}

export function renderOutputsMenu(
	outputs: Array<{ name: string; size: string; time: string }>,
	selectedIndex: number,
) {
	console.log(`${c.bold}${c.cyan}📁 Extracted Outputs & Reports${c.reset}`);
	console.log(`${c.dim}Files saved in ./output/:${c.reset}\n`);

	if (outputs.length === 0) {
		console.log(`  ${c.yellow}No output files generated yet.${c.reset}`);
	} else {
		outputs.forEach((item, idx) => {
			const isSelected = idx === selectedIndex;
			const prefix = isSelected ? `${c.bgCyan} > ` : "   ";
			const icon = item.name.endsWith(".png") ? "📸" : item.name.endsWith(".json") ? "📄" : "📁";
			console.log(`${prefix} ${icon} ${item.name} ${c.dim}(${item.size} - ${item.time})${c.reset}`);
		});
	}

	console.log(`\n${c.dim}[Esc / Backspace] Back to Main Menu | [r] Refresh | [q] Quit${c.reset}`);
}
