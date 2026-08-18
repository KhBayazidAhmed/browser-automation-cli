import { join } from "node:path";
import * as p from "@clack/prompts";
import { FlowRecorder } from "../flow/recorder.js";
import { FlowRunner } from "../flow/runner.js";
import type { WorkflowFile } from "./workflow-loader.js";

export async function handleRecordWorkflow() {
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

	const finalFilename = filename.endsWith(".json") ? filename : `${filename}.json`;
	const outputPath = join(process.cwd(), "workflows", finalFilename);

	p.log.info("🔴 Launching Chrome with In-Page Recorder HUD...");
	p.log.step(
		"Browse and interact in the browser. Click 'Finish' in the browser or press Enter when done.",
	);

	await FlowRecorder.record(outputPath, startUrl);
	p.log.success(`Workflow saved to: ${outputPath}`);
}

export async function handleRunWorkflowSelection(selectedWf: WorkflowFile) {
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

	if (p.isCancel(viewSteps) || viewSteps === "back") return;

	if (viewSteps === "inspect") {
		const stepSummary = selectedWf.flow.steps
			.map((s, idx) => {
				const name = s.name || s.action.toUpperCase();
				const details: string[] = [];
				const stepAny = s as Record<string, unknown>;
				if (stepAny.selector) details.push(`sel: ${stepAny.selector}`);
				if (s.text) details.push(`text: "${s.text}"`);
				if (stepAny.equals) details.push(`equals: "${stepAny.equals}"`);
				if (stepAny.contains) details.push(`contains: "${stepAny.contains}"`);
				const detStr = details.length > 0 ? ` (${details.join(", ")})` : "";
				return `[${idx + 1}] ${s.action.toUpperCase()}: ${name}${detStr}`;
			})
			.join("\n");

		p.note(stepSummary, `Steps for "${selectedWf.flow.name}"`);

		const runAfterInspect = await p.confirm({
			message: "Ready to execute this workflow?",
			initialValue: true,
		});

		if (!runAfterInspect || p.isCancel(runAfterInspect)) return;
	}

	const isHeaded = viewSteps === "run_headed";
	const s = p.spinner();
	s.start(`Executing workflow: ${selectedWf.flow.name}...`);

	const result = await FlowRunner.run(selectedWf.flow, {}, { headless: !isHeaded });

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
