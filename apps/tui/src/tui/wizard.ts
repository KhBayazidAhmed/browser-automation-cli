import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { Browser } from "../cdp/browser.js";
import { startRepl } from "../cli.js";
import { FlowRecorder } from "../flow/recorder.js";
import { FlowRunner } from "../flow/runner.js";
import type { FlowDefinition } from "../flow/types.js";
import { taskRegistry } from "../tasks/registry.js";
import { loadAllWorkflows, type WorkflowFile } from "./workflow-loader.js";

export async function runInteractiveWizard() {
	console.clear();
	p.intro("⚡ \x1b[1m\x1b[36mBrowser Automation Studio\x1b[0m");

	while (true) {
		const workflows = loadAllWorkflows();
		const outputDir = join(process.cwd(), "output");
		const outputFiles = existsSync(outputDir)
			? readdirSync(outputDir).filter((f) => !f.startsWith("."))
			: [];

		const action = await p.select({
			message: "What would you like to do?",
			options: [
				{
					value: "run_workflow",
					label: `🌊 Run a Workflow (${workflows.length} available)`,
					hint: "Execute declarative JSON workflows",
				},
				{
					value: "record_workflow",
					label: "🔴 Record New Workflow",
					hint: "Launch visual in-browser recorder with HUD",
				},
				{
					value: "run_task",
					label: "🚀 Run Programmatic Task",
					hint: "Scraper, site audit, form submitter",
				},
				{
					value: "open_repl",
					label: "💬 Open Interactive Browser REPL",
					hint: "Live terminal session to control Chrome",
				},
				{
					value: "view_outputs",
					label: `📁 View Extracted Data & Outputs (${outputFiles.length} files)`,
					hint: "Inspect JSON results and screenshots",
				},
				{
					value: "cleanup",
					label: "🧹 Clean Lingering Browser Instances",
					hint: "Terminates orphan background Chrome processes",
				},
				{
					value: "exit",
					label: "❌ Exit",
				},
			],
		});

		if (p.isCancel(action) || action === "exit") {
			p.outro("👋 Happy automating!");
			process.exit(0);
		}

		if (action === "cleanup") {
			const s = p.spinner();
			s.start("Scanning for orphan browser processes...");
			const count = await Browser.cleanupOrphans();
			s.stop(
				count > 0
					? `Cleaned up ${count} lingering browser process(es)!`
					: "Clean: No lingering browser processes found.",
			);
			continue;
		}

		// 1. RUN WORKFLOW
		if (action === "run_workflow") {
			if (workflows.length === 0) {
				p.log.warn("No workflow files found in ./workflows/");
				const shouldRecord = await p.confirm({
					message: "Would you like to record one now?",
					initialValue: true,
				});
				if (shouldRecord && !p.isCancel(shouldRecord)) {
					await handleRecordWorkflow();
				}
				continue;
			}

			const wfChoices = workflows.map((wf) => ({
				value: wf,
				label: `${wf.flow.name} (${wf.stepCount} steps)`,
				hint: wf.filename,
			}));

			const selectedWf = (await p.select({
				message: "Select a workflow to execute:",
				options: wfChoices,
			})) as WorkflowFile | symbol;

			if (p.isCancel(selectedWf)) continue;

			const viewSteps = await p.select({
				message: `Workflow: ${selectedWf.flow.name}`,
				options: [
					{ value: "run", label: "▶️  Run Workflow Now" },
					{
						value: "run_headed",
						label: "👁️  Run in Visible Chrome Window (Headed)",
					},
					{ value: "inspect", label: "🔍 Inspect Step-by-Step Breakdown" },
					{ value: "back", label: "↩  Back" },
				],
			});

			if (p.isCancel(viewSteps) || viewSteps === "back") continue;

			if (viewSteps === "inspect") {
				const stepSummary = selectedWf.flow.steps
					.map((s, idx) => {
						const name = s.name || s.action.toUpperCase();
						const details: string[] = [];
						if ((s as any).selector)
							details.push(`sel: ${(s as any).selector}`);
						if (s.text) details.push(`text: "${s.text}"`);
						if ((s as any).equals)
							details.push(`equals: "${(s as any).equals}"`);
						if ((s as any).contains)
							details.push(`contains: "${(s as any).contains}"`);
						const detStr = details.length > 0 ? ` (${details.join(", ")})` : "";
						return `[${idx + 1}] ${s.action.toUpperCase()}: ${name}${detStr}`;
					})
					.join("\n");

				p.note(stepSummary, `Steps for "${selectedWf.flow.name}"`);

				const runAfterInspect = await p.confirm({
					message: "Ready to execute this workflow?",
					initialValue: true,
				});

				if (!runAfterInspect || p.isCancel(runAfterInspect)) continue;
			}

			const isHeaded = viewSteps === "run_headed";
			const s = p.spinner();
			s.start(`Executing workflow: ${selectedWf.flow.name}...`);

			const result = await FlowRunner.run(
				selectedWf.flow,
				{},
				{ headless: !isHeaded },
			);

			if (result.success) {
				s.stop(`Completed in ${result.totalDurationMs}ms!`);

				const dataKeys = Object.keys(result.data);
				if (dataKeys.length > 0) {
					const previewText = dataKeys
						.map((k) => {
							const v = result.data[k];
							const display = Array.isArray(v)
								? `[${v.length} items] (e.g. ${JSON.stringify(v[0] || "")})`
								: JSON.stringify(v);
							return `• ${k}: ${display}`;
						})
						.join("\n");

					p.note(previewText, "📊 Extracted Data Summary");
				}
			} else {
				s.stop(`Execution failed: ${result.error}`);
			}
		}

		// 2. RECORD WORKFLOW
		if (action === "record_workflow") {
			await handleRecordWorkflow();
		}

		// 3. RUN PROGRAMMATIC TASK
		if (action === "run_task") {
			const tasks = taskRegistry.list();
			const taskChoices = tasks.map((t) => ({
				value: t.id,
				label: t.name,
				hint: t.description,
			}));

			const selectedTaskId = (await p.select({
				message: "Select a task to run:",
				options: taskChoices,
			})) as string | symbol;

			if (p.isCancel(selectedTaskId)) continue;

			const isHeaded = await p.confirm({
				message: "Open in visible Chrome window?",
				initialValue: false,
			});

			if (p.isCancel(isHeaded)) continue;

			const s = p.spinner();
			s.start(`Running task ${selectedTaskId}...`);

			const result = await taskRegistry.runTask(
				selectedTaskId,
				{},
				{ headless: !isHeaded },
			);

			if (result.success) {
				s.stop(`Task completed successfully in ${result.durationMs}ms!`);
			} else {
				s.stop(`Task failed: ${result.error}`);
			}
		}

		// 4. OPEN REPL
		if (action === "open_repl") {
			const isHeaded = await p.confirm({
				message: "Open visible Chrome window for REPL?",
				initialValue: false,
			});

			if (p.isCancel(isHeaded)) continue;

			p.log.info(
				"Starting browser session... Type 'exit' to return to wizard.",
			);
			await startRepl({ headless: !isHeaded });
		}

		// 5. VIEW OUTPUTS
		if (action === "view_outputs") {
			if (outputFiles.length === 0) {
				p.log.warn("No output files generated yet. Run a workflow first!");
				continue;
			}

			const fileChoices = outputFiles.map((f) => {
				const stats = statSync(join(outputDir, f));
				return {
					value: f,
					label: f,
					hint: `${(stats.size / 1024).toFixed(1)} KB - ${new Date(stats.mtime).toLocaleTimeString()}`,
				};
			});

			const selectedFile = (await p.select({
				message: "Select an output file to inspect:",
				options: fileChoices,
			})) as string | symbol;

			if (p.isCancel(selectedFile)) continue;

			const fullPath = join(outputDir, selectedFile);
			if (selectedFile.endsWith(".json")) {
				try {
					const content = JSON.parse(readFileSync(fullPath, "utf-8"));
					p.note(JSON.stringify(content, null, 2), `Content: ${selectedFile}`);
				} catch {
					p.log.error(`Could not read ${selectedFile}`);
				}
			} else if (selectedFile.endsWith(".png")) {
				p.log.success(`📸 Image saved at: ${fullPath}`);
			}
		}
	}
}

async function handleRecordWorkflow() {
	const defaultFilename = `workflow-${Date.now()}.json`;
	const filename = await p.text({
		message: "Enter workflow filename:",
		placeholder: defaultFilename,
		defaultValue: defaultFilename,
	});

	if (p.isCancel(filename)) return;

	const defaultUrl = "https://news.ycombinator.com";
	const startUrl = await p.text({
		message: "Enter starting URL:",
		placeholder: defaultUrl,
		defaultValue: defaultUrl,
	});

	if (p.isCancel(startUrl)) return;

	const finalFilename = filename.endsWith(".json")
		? filename
		: `${filename}.json`;
	const outputPath = join(process.cwd(), "workflows", finalFilename);

	p.log.info("🔴 Launching Chrome with In-Page Recorder HUD...");
	p.log.step(
		`Browse and interact in the browser. Click 'Finish' in the browser or press Enter when done.`,
	);

	await FlowRecorder.record(outputPath, startUrl);

	p.log.success(`Workflow saved to: ${outputPath}`);
}
