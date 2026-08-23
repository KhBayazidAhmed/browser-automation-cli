import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import type * as readline from "node:readline";
import { Browser } from "../../cdp/browser.js";
import { googleSheetsUriFromInput } from "../../data/uri.js";
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

const SENSITIVE_URL_PARAM =
	/^(?:access_?token|auth|authorization|code|credential|jwt|key|ott|password|refresh_?token|secret|session|sid|token)$/i;

function containsSensitiveUrlData(rawUrl: string): boolean {
	try {
		const url = new URL(rawUrl);
		if (Array.from(url.searchParams.keys()).some((key) => SENSITIVE_URL_PARAM.test(key)))
			return true;
		return /(?:access_?token|code|credential|jwt|password|refresh_?token|secret|session|sid|token)=/i.test(
			url.hash,
		);
	} catch {
		return false;
	}
}

// biome-ignore lint/complexity/noStaticOnlyClass: Retained as the established public API.
export class FlowRecorder {
	static async record(
		outputPath: string,
		initialUrl = "https://news.ycombinator.com",
		options: {
			userDataDir?: string;
			profileDirectory?: string;
			headless?: boolean;
			signal?: AbortSignal;
		} = {},
	): Promise<FlowDefinition> {
		const steps: FlowStep[] = [];
		const variables: Record<string, unknown> = {};
		let data: FlowDefinition["data"];
		let dataSources: NonNullable<FlowDefinition["dataSources"]> = {};
		let lastUrl = "";
		let isFinished = false;
		let isPaused = false;

		const flowName =
			basename(outputPath)
				.replace(/\.json$/i, "")
				.replace(/[^a-z0-9]/gi, " ")
				.trim() || "Recorded Flow";
		const dir = dirname(outputPath);
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
		const buildFlowDefinition = (): FlowDefinition => ({
			name: flowName,
			description: `Recorded on ${new Date().toLocaleString()}`,
			steps,
			variables,
			...(data ? { data } : {}),
			...(Object.keys(dataSources).length ? { dataSources } : {}),
		});
		const saveDraft = () => {
			writeFileSync(outputPath, JSON.stringify(buildFlowDefinition(), null, 2));
		};
		const syncDraftSafely = async (sync: () => Promise<void>) => {
			try {
				await sync();
			} catch (error) {
				console.error(
					`Unable to update recorder draft: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		};

		printRecordingHeader(initialUrl, outputPath);
		saveDraft();

		let browser: Browser | null = null;
		let rl: readline.Interface | null = null;
		let abortHandler: (() => void) | null = null;

		try {
			browser = await Browser.launch({
				headless: options.headless ?? false,
				userDataDir: options.userDataDir,
				profileDirectory: options.profileDirectory,
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
			abortHandler = triggerFinish;
			if (options.signal?.aborted) triggerFinish();
			else options.signal?.addEventListener("abort", abortHandler, { once: true });

			const syncStateToBrowser = async () => {
				saveDraft();
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
						JSON.stringify({
							name: flowName,
							steps,
							variables,
							isPaused,
							data: data ?? null,
							dataSources,
						}),
					);
				} catch {}
			};

			page.client.on("close", triggerFinish);

			page.client.on("Page.frameNavigated", (params: unknown) => {
				if (isPaused) return;
				const frame = (params as { frame?: { parentId?: string; url?: string } })?.frame;
				if (frame && !frame.parentId && frame.url && frame.url !== "about:blank") {
					if (frame.url !== lastUrl) {
						lastUrl = frame.url;
						if (containsSensitiveUrlData(frame.url)) {
							console.log(
								`  ${colors.dim}Skipped navigation containing sensitive session parameters.${colors.reset}`,
							);
							return;
						}
						const step: FlowStep = {
							name: `Navigate to ${new URL(frame.url).hostname || frame.url}`,
							action: "goto",
							url: frame.url,
						};
						steps.push(step);
						console.log(
							`  ${colors.cyan}🌐 [NAVIGATE]${colors.reset} ${frame.url} ${colors.dim}(Step ${steps.length})${colors.reset}`,
						);
						void syncDraftSafely(syncStateToBrowser);
					}
				}
			});

			page.client.on("Runtime.bindingCalled", (params: unknown) => {
				const p = params as { name?: string; payload?: string };
				if ((p.name === "__cdpRecordEvent" || p.name === "__cdpRecordEvent__") && p.payload) {
					try {
						const event = JSON.parse(p.payload);
						if (event.type === "attachDataSource" && event.provider === "google-sheets") {
							const uri = googleSheetsUriFromInput(
								String(event.input || ""),
								typeof event.tab === "string" ? event.tab : undefined,
								typeof event.range === "string" ? event.range : undefined,
							);
							const sourceName = "googleSheet";
							data = { ...data, source: sourceName };
							dataSources = {
								...dataSources,
								[sourceName]: {
									provider: "google-sheets",
									uri,
									...(typeof event.account === "string" && event.account
										? { account: event.account }
										: {}),
								},
							};
							console.log(
								`  ${colors.cyan}▦ [DATA]${colors.reset} Attached Google Sheet ${colors.dim}${uri}${colors.reset}`,
							);
							void syncDraftSafely(syncStateToBrowser);
							return;
						}
						if (event.type === "detachDataSource" && event.provider === "google-sheets") {
							const sourceName = data?.source;
							if (sourceName && dataSources[sourceName]?.provider === "google-sheets") {
								const remaining = { ...dataSources };
								delete remaining[sourceName];
								dataSources = remaining;
								data = undefined;
							}
							void syncDraftSafely(syncStateToBrowser);
							return;
						}
						if (event.type === "goto" && containsSensitiveUrlData(String(event.url || ""))) {
							console.log(
								`  ${colors.dim}Skipped navigation containing sensitive session parameters.${colors.reset}`,
							);
							return;
						}
						handleRecordedEvent(
							event,
							steps,
							variables,
							(v) => {
								isPaused = v;
							},
							triggerFinish,
						);
						void syncDraftSafely(syncStateToBrowser);
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
			if (abortHandler) options.signal?.removeEventListener("abort", abortHandler);
			if (rl) {
				try {
					rl.close();
				} catch {}
			}
			if (browser) await browser.close();
		}

		const flowDef = buildFlowDefinition();

		await Bun.write(outputPath, JSON.stringify(flowDef, null, 2));
		console.log(`\n${colors.green}✓ Saved recorded flow to:${colors.reset} ${outputPath}`);
		return flowDef;
	}
}
