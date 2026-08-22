import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Browser } from "../cdp/browser.js";
import { formAutomationTask } from "./builtin/form-automation.js";
import { scrapeHnTask } from "./builtin/scrape-hn.js";
import { siteAuditTask } from "./builtin/site-audit.js";
import type { TaskDefinition, TaskExecutionResult, TaskLogger } from "./types.js";

const colors = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	green: "\x1b[32m",
	red: "\x1b[31m",
	yellow: "\x1b[33m",
	cyan: "\x1b[36m",
	magenta: "\x1b[35m",
};

export class TaskRegistry {
	private tasks = new Map<string, TaskDefinition>();

	constructor() {
		this.register(scrapeHnTask);
		this.register(siteAuditTask);
		this.register(formAutomationTask);
	}

	register(task: TaskDefinition) {
		this.tasks.set(task.id, task);
	}

	list(): TaskDefinition[] {
		return Array.from(this.tasks.values());
	}

	get(id: string): TaskDefinition | undefined {
		return this.tasks.get(id);
	}

	async run(
		taskId: string,
		args: Record<string, string | boolean | number> = {},
		options: { headless?: boolean; userDataDir?: string; profileDirectory?: string } = {},
	): Promise<TaskExecutionResult> {
		return this.runTask(taskId, args, options);
	}

	async runTask(
		taskId: string,
		args: Record<string, string | boolean | number> = {},
		options: { headless?: boolean; userDataDir?: string; profileDirectory?: string } = {},
	): Promise<TaskExecutionResult> {
		const task = this.get(taskId);
		if (!task) {
			throw new Error(
				`Task "${taskId}" not found. Available tasks: ${Array.from(this.tasks.keys()).join(", ")}`,
			);
		}

		const outputDir = join(process.cwd(), "output");
		if (!existsSync(outputDir)) {
			mkdirSync(outputDir, { recursive: true });
		}

		const log: TaskLogger = {
			info: (msg: string) => console.log(`  ${colors.cyan}ℹ${colors.reset} ${msg}`),
			success: (msg: string) => console.log(`  ${colors.green}✓${colors.reset} ${msg}`),
			warn: (msg: string) => console.log(`  ${colors.yellow}⚠${colors.reset} ${msg}`),
			error: (msg: string) => console.log(`  ${colors.red}✗${colors.reset} ${msg}`),
		};

		console.log(
			`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════════════${colors.reset}`,
		);
		console.log(
			`  🚀 Running Task: ${colors.bold}${task.name}${colors.reset} ${colors.dim}(id: ${task.id})${colors.reset}`,
		);
		console.log(`  📝 ${task.description}`);
		console.log(
			`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════════════${colors.reset}\n`,
		);

		const startTime = performance.now();
		let browser: Browser | null = null;

		try {
			browser = await Browser.launch({
				headless: options.headless ?? true,
				userDataDir: options.userDataDir,
				profileDirectory: options.profileDirectory,
			});
			const page = await browser.newPage();

			const data = await task.run({
				browser,
				page,
				args,
				log,
				outputDir,
			});

			const durationMs = Math.round(performance.now() - startTime);

			console.log(
				`\n${colors.green}✓ Task completed successfully in ${durationMs}ms!${colors.reset}\n`,
			);

			return {
				success: true,
				data,
				durationMs,
			};
		} catch (err: unknown) {
			const durationMs = Math.round(performance.now() - startTime);
			const msg = err instanceof Error ? err.message : String(err);
			console.log(`\n${colors.red}✗ Task failed after ${durationMs}ms: ${msg}${colors.reset}\n`);

			return {
				success: false,
				durationMs,
				error: msg,
			};
		} finally {
			if (browser) {
				await browser.close();
			}
		}
	}
}

export const taskRegistry = new TaskRegistry();
