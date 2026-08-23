import { Browser, detectBrowserProfiles, prepareProfileLaunch } from "./cdp/index.js";
import { startRepl } from "./cli.js";
import { FlowRecorder } from "./flow/recorder.js";
import { FlowRunner } from "./flow/runner.js";
import type { FlowDefinition } from "./flow/types.js";
import { taskRegistry } from "./tasks/registry.js";
import { runInteractiveWizard } from "./tui/wizard.js";

const args = process.argv.slice(2);

function extractProfileConfig(cliArgs: string[]): {
	userDataDir?: string;
	profileDirectory?: string;
} {
	const directMode = cliArgs.includes("--direct-profile");
	const customUserDataArg = cliArgs.find((a) => a.startsWith("--user-data-dir="));
	const customProfileDirArg = cliArgs.find(
		(a) => a.startsWith("--profile-directory=") || a.startsWith("--profile-dir="),
	);

	if (customUserDataArg) {
		return {
			userDataDir: customUserDataArg.split("=")[1],
			profileDirectory: customProfileDirArg ? customProfileDirArg.split("=")[1] : undefined,
		};
	}

	const profileArg = cliArgs.find((a) => a.startsWith("--profile="));
	if (profileArg) {
		const target = profileArg.split("=")[1]?.toLowerCase() || "";
		const profiles = detectBrowserProfiles();
		const matched = profiles.find(
			(p) =>
				p.id.toLowerCase() === target ||
				p.profileDir.toLowerCase() === target ||
				p.browserName.toLowerCase().includes(target) ||
				p.displayName.toLowerCase().includes(target),
		);

		if (matched) {
			console.log(`\x1b[36mℹ Using Browser Profile: ${matched.displayName}\x1b[0m`);
			return prepareProfileLaunch(matched, directMode ? "direct" : "clone");
		}
		console.warn(
			`\x1b[33m⚠ Profile matching "${target}" not found. Falling back to clean profile.\x1b[0m`,
		);
	}
	return {};
}

function parseCliKeyValues(cliArgs: string[], startIndex: number): Record<string, any> {
	const vars: Record<string, any> = {};
	for (let i = startIndex; i < cliArgs.length; i++) {
		const raw = cliArgs[i] || "";
		if (
			raw.startsWith("--profile") ||
			raw.startsWith("--user-data-dir") ||
			raw.startsWith("--headed")
		)
			continue;
		const cleaned = raw.startsWith("--") ? raw.slice(2) : raw;
		const [k, v] = cleaned.split("=");
		if (k && v !== undefined)
			vars[k] =
				v === "true" ? true : v === "false" ? false : Number.isNaN(Number(v)) ? v : Number(v);
	}
	return vars;
}

async function main() {
	const isRepl = args.includes("repl");
	const isRecord = args[0] === "record";
	const isFlow = args[0] === "flow" && Boolean(args[1]);
	const isProfilesList = args[0] === "profiles" || (args[0] === "profile" && args[1] === "list");
	const isTasksList = args.includes("tasks") || (args[0] === "task" && args[1] === "list");
	const isTaskRun = args[0] === "task" || args[0] === "run";
	const isHeaded = args.includes("--headed") || args.includes("--headless=false");
	const urlArgIndex = args.indexOf("--url");
	const screenshotArgIndex = args.indexOf("--screenshot");
	const profileConfig = extractProfileConfig(args);

	if (isProfilesList) {
		const profiles = detectBrowserProfiles();
		console.log("\n👤 Discovered System Browser Profiles:\n" + "═".repeat(67));
		if (profiles.length === 0) console.log("  No standard Chrome/Brave/Edge profiles discovered.");
		else {
			for (const p of profiles) {
				console.log(
					`\n• \x1b[1m\x1b[36m${p.displayName}\x1b[0m\n  Profile ID:   \x1b[33m--profile=${p.id}\x1b[0m\n  Directory:    \x1b[2m${p.profilePath}\x1b[0m`,
				);
			}
		}
		console.log(
			"\n" +
				"═".repeat(67) +
				"\nUse in any command: \x1b[32mbun src/index.ts <record|flow|task|repl> --profile=<id>\x1b[0m\n",
		);
		process.exit(0);
	}

	if (isRecord) {
		const outputPath =
			args[1] && !args[1].startsWith("--") ? args[1] : `workflows/recorded-${Date.now()}.json`;
		const initialUrl =
			args[2] && !args[2].startsWith("--") ? args[2] : "https://news.ycombinator.com";
		await FlowRecorder.record(outputPath, initialUrl, {
			userDataDir: profileConfig.userDataDir,
			profileDirectory: profileConfig.profileDirectory,
		});
		process.exit(0);
	}

	if (isFlow && args[1]) {
		const filePath = args[1];
		const file = Bun.file(filePath);
		if (!(await file.exists())) {
			console.error(`\x1b[31mError: Flow file not found at "${filePath}"\x1b[0m`);
			process.exit(1);
		}
		let flowDef: FlowDefinition;
		try {
			flowDef = (await file.json()) as FlowDefinition;
		} catch (err: any) {
			console.error(`\x1b[31mError parsing JSON flow file: ${err.message}\x1b[0m`);
			process.exit(1);
		}

		const result = await FlowRunner.run(flowDef, parseCliKeyValues(args, 2), {
			headless: !isHeaded,
			userDataDir: profileConfig.userDataDir,
			profileDirectory: profileConfig.profileDirectory,
		});
		process.exit(result.success ? 0 : 1);
	}

	if (isTasksList) {
		console.log("\n⚡ Available Automation Tasks:\n" + "═".repeat(67));
		for (const task of taskRegistry.list()) {
			console.log(
				`\n• \x1b[1m\x1b[36m${task.id}\x1b[0m - ${task.name}\n  \x1b[2m${task.description}\x1b[0m`,
			);
			if (task.params && task.params.length > 0) {
				console.log("  Parameters:");
				for (const p of task.params)
					console.log(`    --${p.name}=<value> : ${p.description} (default: ${p.default})`);
			}
		}
		console.log(
			"\n" +
				"═".repeat(67) +
				"\nRun any task with: \x1b[32mbun src/index.ts task <task-id> [--param=val] [--profile=<id>]\x1b[0m\n",
		);
		process.exit(0);
	}

	if (isTaskRun && args[1] && args[1] !== "list") {
		const result = await taskRegistry.runTask(args[1], parseCliKeyValues(args, 2), {
			headless: !isHeaded,
			userDataDir: profileConfig.userDataDir,
			profileDirectory: profileConfig.profileDirectory,
		});
		process.exit(result.success ? 0 : 1);
	}

	if (args[0] === "cleanup") {
		console.log("\n🧹 Cleaning up any lingering orphan Chrome browser processes...");
		const killed = await Browser.cleanupOrphans();
		console.log(
			killed > 0
				? `\x1b[32m✓ Successfully terminated ${killed} orphan Chrome process(es).\x1b[0m\n`
				: "\x1b[32m✓ Clean: No lingering orphan Chrome processes found.\x1b[0m\n",
		);
		process.exit(0);
	}

	if (urlArgIndex !== -1 && args[urlArgIndex + 1]) {
		const url = args[urlArgIndex + 1] ?? "";
		const screenshotPath = screenshotArgIndex !== -1 ? args[screenshotArgIndex + 1] : undefined;
		console.log(`\n🚀 Launching lightweight CDP automation for: ${url}`);
		let browser: Browser | null = null;
		try {
			browser = await Browser.launch({
				headless: !isHeaded,
				userDataDir: profileConfig.userDataDir,
				profileDirectory: profileConfig.profileDirectory,
			});
			const page = await browser.newPage();
			const start = performance.now();
			await page.goto(url);
			const title = await page.title();
			console.log(`✓ Loaded: "${title}" in ${Math.round(performance.now() - start)}ms`);
			if (screenshotPath) {
				const bytes = await page.screenshot({ path: screenshotPath });
				console.log(
					`✓ Screenshot saved to ${screenshotPath} (${(bytes.length / 1024).toFixed(1)} KB)`,
				);
			}
		} finally {
			if (browser) await browser.close();
		}
		process.exit(0);
	}

	if (isRepl) {
		await startRepl({
			headless: !isHeaded,
			userDataDir: profileConfig.userDataDir,
			profileDirectory: profileConfig.profileDirectory,
		});
		return;
	}

	await runInteractiveWizard();
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
