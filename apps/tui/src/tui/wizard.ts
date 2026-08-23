import { existsSync, readdirSync } from "node:fs";
import * as p from "@clack/prompts";
import { Browser } from "../cdp/browser.js";
import { detectBrowserProfiles } from "../cdp/profiles.js";
import { startRepl } from "../cli.js";
import { OUTPUT_DIR } from "../runtime-paths.js";
import { taskRegistry } from "../tasks/registry.js";
import { promptProfileSelection } from "./profile-picker.js";
import { handleGoogleSheetsConnection } from "./wizard-google-sheets.js";
import { handleViewOutputs } from "./wizard-outputs.js";
import { handleRecordWorkflow, handleRunWorkflowSelection } from "./wizard-workflow.js";
import { loadAllWorkflows, type WorkflowFile } from "./workflow-loader.js";

export async function runInteractiveWizard() {
	console.clear();
	p.intro("⚡ \x1b[1m\x1b[36mBrowser Automation Studio\x1b[0m");

	while (true) {
		const workflows = loadAllWorkflows();
		const outputDir = OUTPUT_DIR;
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
					value: "connect_google_sheets",
					label: "🔗 Connect Google Sheets",
					hint: "Authorize, preview, and attach a sheet to a workflow",
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
					value: "manage_profiles",
					label: "👤 Discovered Browser Profiles",
					hint: "Inspect detected Chrome, Brave, and Edge profiles",
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

		if (action === "manage_profiles") {
			const profiles = detectBrowserProfiles();
			if (profiles.length === 0) {
				p.log.warn("No existing browser profiles detected in default system paths.");
			} else {
				p.log.success(`Found ${profiles.length} browser profile(s):`);
				const profileListText = profiles
					.map(
						(prof, i) =>
							`[${i + 1}] ${prof.displayName}\n    ID: ${prof.id}\n    Path: ${prof.profilePath}`,
					)
					.join("\n\n");
				p.note(profileListText, "Detected System Profiles");
			}
			continue;
		}

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
			await handleRunWorkflowSelection(selectedWf as WorkflowFile);
		}

		if (action === "record_workflow") {
			await handleRecordWorkflow();
		}

		if (action === "connect_google_sheets") {
			await handleGoogleSheetsConnection();
		}

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
			const selectedTask = taskRegistry.get(selectedTaskId);
			const taskArgs: Record<string, string | boolean | number> = {};
			let parameterEntryCancelled = false;
			for (const parameter of selectedTask?.params || []) {
				const response =
					typeof parameter.default === "boolean"
						? await p.confirm({
								message: parameter.description,
								initialValue: parameter.default,
							})
						: await p.text({
								message: parameter.description,
								defaultValue:
									parameter.default === undefined ? undefined : String(parameter.default),
								validate: (value) => {
									if (parameter.required && !value) return `${parameter.name} is required`;
									if (typeof parameter.default === "number" && !Number.isFinite(Number(value))) {
										return `${parameter.name} must be a number`;
									}
									return undefined;
								},
							});
				if (p.isCancel(response)) {
					parameterEntryCancelled = true;
					break;
				}
				taskArgs[parameter.name] =
					typeof parameter.default === "number" ? Number(response) : response;
			}
			if (parameterEntryCancelled) continue;

			const profileChoice = await promptProfileSelection("Choose profile for task execution:");
			if (!profileChoice) continue;

			const isHeaded = await p.confirm({
				message: "Open in visible Chrome window?",
				initialValue: false,
			});

			if (p.isCancel(isHeaded)) continue;

			p.log.step(`Running task ${selectedTaskId}...`);

			const result = await taskRegistry.runTask(selectedTaskId, taskArgs, {
				headless: !isHeaded,
				userDataDir: profileChoice.userDataDir,
				profileDirectory: profileChoice.profileDirectory,
			});

			if (result.success) {
				p.log.success(`Task completed successfully in ${result.durationMs}ms!`);
			} else {
				p.log.error(`Task failed: ${result.error}`);
			}
		}

		if (action === "open_repl") {
			const profileChoice = await promptProfileSelection("Choose profile for REPL:");
			if (!profileChoice) continue;

			const isHeaded = await p.confirm({
				message: "Open visible Chrome window for REPL?",
				initialValue: false,
			});

			if (p.isCancel(isHeaded)) continue;

			p.log.info("Starting browser session... Type 'exit' to return to wizard.");
			await startRepl({
				headless: !isHeaded,
				userDataDir: profileChoice.userDataDir,
				profileDirectory: profileChoice.profileDirectory,
			});
		}

		if (action === "view_outputs") {
			await handleViewOutputs(outputDir, outputFiles);
		}
	}
}
