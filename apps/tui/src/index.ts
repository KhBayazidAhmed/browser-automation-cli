import { Browser } from "./cdp/index.js";
import { startRepl } from "./cli.js";
import { FlowRecorder } from "./flow/recorder.js";
import { FlowRunner } from "./flow/runner.js";
import type { FlowDefinition } from "./flow/types.js";
import { taskRegistry } from "./tasks/registry.js";
import { runInteractiveWizard } from "./tui/wizard.js";

const args = process.argv.slice(2);

async function main() {
	const isRepl = args.includes("repl");
	const isRecord = args[0] === "record";
	const isFlow = args[0] === "flow" && Boolean(args[1]);
	const isTasksList =
		args.includes("tasks") || (args[0] === "task" && args[1] === "list");
	const isTaskRun = args[0] === "task" || args[0] === "run";
	const isHeaded =
		args.includes("--headed") || args.includes("--headless=false");
	const urlArgIndex = args.indexOf("--url");
	const screenshotArgIndex = args.indexOf("--screenshot");

	// Record Flow Command (e.g. bun src/index.ts record workflows/my-flow.json https://news.ycombinator.com)
	if (isRecord) {
		const outputPath = args[1] || `workflows/recorded-${Date.now()}.json`;
		const initialUrl = args[2] || "https://news.ycombinator.com";
		await FlowRecorder.record(outputPath, initialUrl);
		process.exit(0);
	}

	// Declarative Flow Execution (e.g. bun src/index.ts flow workflows/hn-top-stories.json)
	if (isFlow && args[1]) {
		const filePath = args[1];
		const file = Bun.file(filePath);
		if (!(await file.exists())) {
			console.error(
				`\x1b[31mError: Flow file not found at "${filePath}"\x1b[0m`,
			);
			process.exit(1);
		}

		let flowDef: FlowDefinition;
		try {
			flowDef = (await file.json()) as FlowDefinition;
		} catch (err: any) {
			console.error(
				`\x1b[31mError parsing JSON flow file: ${err.message}\x1b[0m`,
			);
			process.exit(1);
		}

		const overrideVars: Record<string, any> = {};
		for (let i = 2; i < args.length; i++) {
			const raw = args[i] || "";
			const cleaned = raw.startsWith("--") ? raw.slice(2) : raw;
			const [k, v] = cleaned.split("=");
			if (k && v !== undefined) {
				overrideVars[k] =
					v === "true"
						? true
						: v === "false"
							? false
							: Number.isNaN(Number(v))
								? v
								: Number(v);
			}
		}

		const result = await FlowRunner.run(flowDef, overrideVars, {
			headless: !isHeaded,
		});
		process.exit(result.success ? 0 : 1);
	}

	// Task List Command (e.g. bun src/index.ts tasks)
	if (isTasksList) {
		console.log("\n⚡ Available Automation Tasks:");
		console.log(
			"═══════════════════════════════════════════════════════════════════",
		);
		for (const task of taskRegistry.list()) {
			console.log(`\n• \x1b[1m\x1b[36m${task.id}\x1b[0m - ${task.name}`);
			console.log(`  \x1b[2m${task.description}\x1b[0m`);
			if (task.params && task.params.length > 0) {
				console.log("  Parameters:");
				for (const p of task.params) {
					console.log(
						`    --${p.name}=<value> : ${p.description} (default: ${p.default})`,
					);
				}
			}
		}
		console.log(
			"\n═══════════════════════════════════════════════════════════════════",
		);
		console.log(
			"Run any task with: \x1b[32mbun src/index.ts task <task-id> [--param=val]\x1b[0m\n",
		);
		process.exit(0);
	}

	// Task Execution Command (e.g. bun src/index.ts task scrape-hn limit=5)
	if (isTaskRun && args[1] && args[1] !== "list") {
		const taskId = args[1];
		const taskArgs: Record<string, string | boolean | number> = {};

		for (let i = 2; i < args.length; i++) {
			const raw = args[i] || "";
			const cleaned = raw.startsWith("--") ? raw.slice(2) : raw;
			const [k, v] = cleaned.split("=");
			if (k && v !== undefined) {
				taskArgs[k] =
					v === "true"
						? true
						: v === "false"
							? false
							: Number.isNaN(Number(v))
								? v
								: Number(v);
			}
		}

		const result = await taskRegistry.runTask(taskId, taskArgs, {
			headless: !isHeaded,
		});
		process.exit(result.success ? 0 : 1);
	}

	// Cleanup Orphan Browsers Command (e.g. bun src/index.ts cleanup)
	if (args[0] === "cleanup") {
		console.log(
			"\n🧹 Cleaning up any lingering orphan Chrome browser processes...",
		);
		const killed = await Browser.cleanupOrphans();
		if (killed > 0) {
			console.log(
				`\x1b[32m✓ Successfully terminated ${killed} orphan Chrome process(es).\x1b[0m\n`,
			);
		} else {
			console.log(
				"\x1b[32m✓ Clean: No lingering orphan Chrome processes found.\x1b[0m\n",
			);
		}
		process.exit(0);
	}

	// One-shot CLI command (e.g. --url https://example.com --screenshot out.png)
	if (urlArgIndex !== -1 && args[urlArgIndex + 1]) {
		const url = args[urlArgIndex + 1] ?? "";
		const screenshotPath =
			screenshotArgIndex !== -1 ? args[screenshotArgIndex + 1] : undefined;

		console.log(`\n🚀 Launching lightweight CDP automation for: ${url}`);
		let browser: Browser | null = null;
		try {
			browser = await Browser.launch({ headless: !isHeaded });
			const page = await browser.newPage();

			const start = performance.now();
			await page.goto(url);
			const title = await page.title();
			console.log(
				`✓ Loaded: "${title}" in ${Math.round(performance.now() - start)}ms`,
			);

			if (screenshotPath) {
				const bytes = await page.screenshot({ path: screenshotPath });
				console.log(
					`✓ Screenshot saved to ${screenshotPath} (${(bytes.length / 1024).toFixed(1)} KB)`,
				);
			}
		} finally {
			if (browser) {
				await browser.close();
			}
		}
		process.exit(0);
	}

	if (isRepl) {
		await startRepl({ headless: !isHeaded });
		return;
	}

	// Default: Launch Modern Interactive Wizard
	await runInteractiveWizard();
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
