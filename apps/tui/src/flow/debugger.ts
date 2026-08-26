import * as readline from "node:readline";
import type { FlowStep } from "./types.js";

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

export type DebugDecision =
	| "run"
	| "continue"
	| "back"
	| "skip"
	| "retry"
	| "vars"
	| "inspect"
	| "abort"
	| "unknown";

export type BeforeStepDecision = "run" | "skip" | "back" | "abort";
export type FailureDecision = "retry" | "back" | "skip" | "abort";

export interface StepPromptContext {
	index: number;
	total: number;
	name: string;
	step: FlowStep;
}

interface DebuggerHooks {
	pageSummary(): Promise<{ url: string; title: string }>;
	collectedData(): Record<string, unknown>;
}

const PROMPT = `${colors.bold}${colors.magenta}debug>${colors.reset} `;

export function resolveDebugCommand(raw: string): DebugDecision {
	const cmd = raw.trim().toLowerCase();
	if (!cmd || cmd === "n" || cmd === "next") return "run";
	if (cmd === "c" || cmd === "continue") return "continue";
	if (cmd === "b" || cmd === "back") return "back";
	if (cmd === "s" || cmd === "skip") return "skip";
	if (cmd === "r" || cmd === "retry") return "retry";
	if (cmd === "v" || cmd === "vars") return "vars";
	if (cmd === "i" || cmd === "info" || cmd === "inspect") return "inspect";
	if (cmd === "q" || cmd === "quit" || cmd === "abort") return "abort";
	return "unknown";
}

function stepDetails(step: FlowStep): string {
	const s = step as Record<string, unknown>;
	const details: string[] = [];
	if (s.url) details.push(`url: ${s.url}`);
	if (s.selector) details.push(`selector: ${s.selector}`);
	if (s.text !== undefined) details.push(`text: "${s.text}"`);
	if (s.as) details.push(`as: ${s.as}`);
	if (s.equals !== undefined) details.push(`equals: "${s.equals}"`);
	if (s.contains !== undefined) details.push(`contains: "${s.contains}"`);
	if (s.durationMs) details.push(`duration: ${s.durationMs}ms`);
	return details.join("\n");
}

function printPauseBanner(ctx: StepPromptContext) {
	console.log(
		`\n${colors.bold}${colors.magenta}🐛 DEBUG${colors.reset} ${colors.dim}[${ctx.index}/${ctx.total}]${colors.reset} ${colors.bold}${ctx.step.action.toUpperCase()}${colors.reset}: ${ctx.name}`,
	);
	const details = stepDetails(ctx.step);
	if (details) console.log(`${colors.dim}${details}${colors.reset}`);
	console.log(
		`${colors.dim}[Enter]/n=next  c=continue-all  b=back  s=skip  v=vars  i=step-info  q=quit${colors.reset}`,
	);
}

export class FlowDebugger {
	static create(hooks: DebuggerHooks): FlowDebugger | null {
		if (!process.stdin.isTTY) {
			console.warn(
				`${colors.yellow}⚠ --debug requires an interactive terminal; continuing without pauses.${colors.reset}`,
			);
			return null;
		}
		return new FlowDebugger(hooks);
	}

	private autoContinue = false;
	private closed = false;
	private rl: readline.Interface;
	private pendingLines: string[] = [];
	private waiter: ((line: string) => void) | null = null;

	constructor(
		private hooks: DebuggerHooks,
		input: NodeJS.ReadableStream = process.stdin,
		output?: NodeJS.WritableStream,
	) {
		this.rl = readline.createInterface({ input, output: output ?? process.stdout });
		this.rl.on("line", (line: string) => {
			if (this.waiter) {
				const wake = this.waiter;
				this.waiter = null;
				wake(line);
			} else {
				this.pendingLines.push(line);
			}
		});
		this.rl.on("close", () => {
			this.closed = true;
			this.waiter?.("");
			this.waiter = null;
		});
	}

	private nextLine(): Promise<string> {
		const buffered = this.pendingLines.shift();
		if (buffered !== undefined) return Promise.resolve(buffered);
		if (this.closed) return Promise.resolve("q");
		return new Promise((resolve) => {
			this.waiter = resolve;
		});
	}

	private async promptCommand(): Promise<DebugDecision> {
		process.stdout.write(PROMPT);
		return resolveDebugCommand(await this.nextLine());
	}

	async beforeStep(ctx: StepPromptContext): Promise<BeforeStepDecision> {
		while (!this.autoContinue) {
			printPauseBanner(ctx);
			const decision = await this.promptCommand();
			switch (decision) {
				case "run":
					return "run";
				case "continue":
					this.autoContinue = true;
					console.log(`  ${colors.green}▶ Continuing without pauses...${colors.reset}`);
					return "run";
				case "back":
					if (ctx.index === 1) {
						console.log(`  ${colors.yellow}Already at first step.${colors.reset}`);
						continue;
					}
					return "back";
				case "skip":
					return "skip";
				case "vars":
					await this.printVars();
					continue;
				case "inspect":
					console.log(JSON.stringify(ctx.step, null, 2));
					continue;
				case "abort":
					return "abort";
				default:
					console.log(
						`${colors.dim}Unknown command. Use [Enter]=next, c=continue, b=back, s=skip, v=vars, i=info, q=quit.${colors.reset}`,
					);
			}
		}
		return "run";
	}

	async onFailure(ctx: StepPromptContext, error: string): Promise<FailureDecision> {
		while (true) {
			console.log(
				`\n${colors.bold}${colors.magenta}🐛 DEBUG${colors.reset} ${colors.red}Step ${ctx.index} failed:${colors.reset} ${error}`,
			);
			console.log(
				`${colors.dim}r=retry  s=skip-and-continue  b=back-to-previous  v=vars  q=quit${colors.reset}`,
			);
			const decision = await this.promptCommand();
			switch (decision) {
				case "run":
				case "retry":
				case "continue":
					return "retry";
				case "skip":
					return "skip";
				case "back":
					return "back";
				case "vars":
					await this.printVars();
					continue;
				case "abort":
					return "abort";
				default:
					console.log(
						`${colors.dim}Unknown command. Use r=retry, s=skip, b=back, v=vars, q=quit.${colors.reset}`,
					);
			}
		}
	}

	private async printVars() {
		const { url, title } = await this.hooks.pageSummary();
		console.log(
			`\n${colors.bold}${colors.cyan}📄 Page:${colors.reset} ${title} ${colors.dim}(${url})${colors.reset}`,
		);
		const data = this.hooks.collectedData();
		const keys = Object.keys(data);
		if (keys.length === 0) {
			console.log(`${colors.dim}No extracted variables yet.${colors.reset}\n`);
			return;
		}
		console.log(
			`${colors.bold}${colors.cyan}📊 Extracted Variables (${keys.length}):${colors.reset}`,
		);
		for (const key of keys) {
			const value = data[key];
			const display = Array.isArray(value) ? `[${value.length} items]` : JSON.stringify(value);
			console.log(`  • ${colors.bold}${key}${colors.reset}: ${display}`);
		}
		console.log();
	}

	close() {
		this.rl.close();
	}
}
