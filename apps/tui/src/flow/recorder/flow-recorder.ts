import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type * as readline from "node:readline";
import { Browser } from "../../cdp/browser.js";
import type { FlowDefinition, FlowStep } from "../types.js";
import { INJECTED_ADVANCED_RECORDER_SCRIPT } from "./injected-recorder-script.js";
import { handleRecordedEvent } from "./recorder-event-bridge.js";
import { printRecordingHeader, setupTerminalInterface } from "./terminal-prompt.js";

const colors = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	green: "\x1b[32m",
	cyan: "\x1b[36m",
};

export class FlowRecorder {
	static async record(
		outputPath: string,
		initialUrl = "https://news.ycombinator.com",
	): Promise<FlowDefinition> {
		const steps: FlowStep[] = [];
		const variables: Record<string, unknown> = {};
		let lastUrl = "";
		let isFinished = false;
		let isPaused = false;

		const flowName =
			outputPath
				.split("/")
				.pop()
				?.replace(/\.json$/i, "")
				.replace(/[^a-z0-9]/gi, " ")
				.trim() || "Recorded Flow";

		printRecordingHeader(initialUrl, outputPath);

		let browser: Browser | null = null;
		let rl: readline.Interface | null = null;

		try {
			browser = await Browser.launch({
				headless: false,
				args: ["--start-maximized"],
			});

			const page = await browser.newPage();
			await page.init();

			await page.client.send("Runtime.enable");
			await page.client.send("Page.enable");
			await page.client.send("Runtime.addBinding", {
				name: "__cdpRecordEvent",
			});
			await page.client.send("Page.addScriptToEvaluateOnNewDocument", {
				source: INJECTED_ADVANCED_RECORDER_SCRIPT,
			});

			let finishResolver: (() => void) | null = null;
			const finishPromise = new Promise<void>((resolve) => {
				finishResolver = resolve;
			});

			const triggerFinish = () => {
				if (!isFinished) {
					isFinished = true;
					finishResolver?.();
				}
			};

			const syncStateToBrowser = async () => {
				try {
					await page.evaluate(
						(stateStr) => {
							const win = window as unknown as {
								__cdpSyncState?: (s: string) => void;
							};
							if (win.__cdpSyncState) {
								win.__cdpSyncState(stateStr as string);
							}
						},
						JSON.stringify({ name: flowName, steps, variables, isPaused }),
					);
				} catch {}
			};

			page.client.on("close", triggerFinish);

			page.client.on("Page.frameNavigated", async (params: unknown) => {
				if (isPaused) return;
				const frame = (params as { frame?: { parentId?: string; url?: string } })?.frame;
				if (frame && !frame.parentId && frame.url && frame.url !== "about:blank") {
					if (frame.url !== lastUrl) {
						lastUrl = frame.url;
						const step: FlowStep = {
							name: `Navigate to ${new URL(frame.url).hostname || frame.url}`,
							action: "goto",
							url: frame.url,
						};
						steps.push(step);
						console.log(
							`  ${colors.cyan}🌐 [NAVIGATE]${colors.reset} ${frame.url} ${colors.dim}(Step ${steps.length})${colors.reset}`,
						);
						await syncStateToBrowser();
					}
				}
			});

			page.client.on("Runtime.bindingCalled", (params: unknown) => {
				const p = params as { name?: string; payload?: string };
				if ((p.name === "__cdpRecordEvent" || p.name === "__cdpRecordEvent__") && p.payload) {
					try {
						const event = JSON.parse(p.payload);
						handleRecordedEvent(
							event,
							steps,
							variables,
							(v) => {
								isPaused = v;
							},
							triggerFinish,
						);
					} catch {}
				}
			});

			await page.goto(initialUrl);
			await syncStateToBrowser();

			rl = setupTerminalInterface(
				flowName,
				steps,
				variables,
				() => isPaused,
				(p) => {
					isPaused = p;
				},
				syncStateToBrowser,
				triggerFinish,
			);

			await finishPromise;
		} finally {
			if (rl) {
				try {
					rl.close();
				} catch {}
			}
			if (browser) await browser.close();
		}

		const flowDefinition: FlowDefinition = {
			name: flowName,
			description: `Recorded on ${new Date().toLocaleString()}`,
			variables,
			steps,
		};

		const targetDir = dirname(outputPath);
		if (targetDir && !existsSync(targetDir)) {
			mkdirSync(targetDir, { recursive: true });
		}

		await Bun.write(outputPath, JSON.stringify(flowDefinition, null, 2));

		console.log(`\n${colors.bold}${colors.green}✓ Recording complete!${colors.reset}`);
		console.log(`  📁 Saved ${steps.length} steps to: ${colors.bold}${outputPath}${colors.reset}`);
		console.log(
			`  🚀 Replay anytime with: ${colors.cyan}bun run flow ${outputPath}${colors.reset}\n`,
		);

		return flowDefinition;
	}
}
