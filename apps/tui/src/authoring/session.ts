import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Browser } from "../cdp/browser.js";
import type { Page } from "../cdp/page.js";
import { executeStep } from "../flow/step-executor.js";
import type { AssertStep, FlowDefinition, FlowStep } from "../flow/types.js";
import { parseFlowDefinition } from "../flow/validate.js";
import { OUTPUT_DIR, resolveTuiPath, WORKFLOWS_DIR } from "../runtime-paths.js";
import { observePage } from "./observe.js";
import {
	assertDomainAllowed,
	isDomainAllowed,
	validateActionPolicy,
	validatePublishedVariables,
} from "./policy.js";
import {
	fallbackObservation,
	isPathWithin,
	traceSafeResult,
	traceSafeStep,
} from "./session-helpers.js";
import { AuthoringTrace } from "./trace.js";
import type {
	AuthoringSessionOptions,
	BrowserObservation,
	PerformStepResult,
	PublishFlowOptions,
	PublishFlowResult,
} from "./types.js";

const DEFAULT_MAX_STEPS = 50;
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1_000;

export class AuthoringSession {
	readonly id = crypto.randomUUID();
	readonly trace: AuthoringTrace;
	readonly allowedDomains: string[];
	private readonly steps: FlowStep[] = [];
	private readonly extractedData: Record<string, unknown> = {};
	private readonly startedAt = Date.now();
	private readonly maxSteps: number;
	private readonly timeoutMs: number;
	private actionAttempts = 0;
	private closed = false;

	private constructor(
		readonly options: AuthoringSessionOptions,
		private readonly browser: Browser,
		private readonly page: Page,
	) {
		const initialDomain = new URL(options.initialUrl).hostname;
		this.allowedDomains = options.allowedDomains?.length ? options.allowedDomains : [initialDomain];
		this.maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
		this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
		this.trace = new AuthoringTrace(
			this.id,
			resolve(OUTPUT_DIR, "authoring", this.id, "trace.jsonl"),
		);
	}

	static async start(options: AuthoringSessionOptions): Promise<AuthoringSession> {
		if (!options.goal.trim()) throw new Error("Authoring session requires a goal");
		const initialDomain = new URL(options.initialUrl).hostname;
		const allowedDomains = options.allowedDomains?.length
			? options.allowedDomains
			: [initialDomain];
		assertDomainAllowed(options.initialUrl, allowedDomains);

		const browser = await Browser.launch({
			headless: options.headless ?? false,
			userDataDir: options.userDataDir,
			profileDirectory: options.profileDirectory,
		});
		try {
			const page = await browser.newPage();
			await page.goto(options.initialUrl, { waitUntil: "domcontentloaded" });
			const session = new AuthoringSession(options, browser, page);
			await session.trace.append({
				kind: "session_started",
				url: options.initialUrl,
				metadata: {
					goal: options.goal,
					allowedDomains: session.allowedDomains,
					maxSteps: session.maxSteps,
					timeoutMs: session.timeoutMs,
				},
			});
			return session;
		} catch (error) {
			await browser.close();
			throw error;
		}
	}

	private assertUsable(): void {
		if (this.closed) throw new Error(`Authoring session "${this.id}" is closed`);
		if (Date.now() - this.startedAt > this.timeoutMs) {
			throw new Error(`Authoring session exceeded its ${this.timeoutMs}ms time budget`);
		}
	}

	private async safeObserve(): Promise<BrowserObservation> {
		let url = "about:blank";
		try {
			url = await this.page.url();
			if (!isDomainAllowed(url, this.allowedDomains)) return fallbackObservation(url);
			return await observePage(this.page);
		} catch {
			return fallbackObservation(url);
		}
	}

	async observe(): Promise<BrowserObservation> {
		this.assertUsable();
		const url = await this.page.url();
		assertDomainAllowed(url, this.allowedDomains);
		const observation = await observePage(this.page);
		await this.trace.append({ kind: "observation", url: observation.url, observation });
		return observation;
	}

	async perform(
		stepInput: FlowStep,
		options: { confirmed?: boolean; variables?: Record<string, unknown> } = {},
	): Promise<PerformStepResult> {
		this.assertUsable();
		if (this.actionAttempts >= this.maxSteps) {
			throw new Error(`Authoring session reached its ${this.maxSteps}-action budget`);
		}
		this.actionAttempts++;
		const validated = parseFlowDefinition({ name: "Authoring action", steps: [stepInput] });
		const step = validated.steps[0] as FlowStep;
		const startedAt = performance.now();

		try {
			validateActionPolicy(step, this.allowedDomains, options.confirmed ?? false);
			const result = await executeStep(step, this.page, {
				...options.variables,
				...step.variables,
				...this.extractedData,
				extractedData: this.extractedData,
				outputDir: OUTPUT_DIR,
			});
			const url = await this.page.url();
			assertDomainAllowed(url, this.allowedDomains);
			if (result !== undefined && "as" in step && typeof step.as === "string") {
				this.extractedData[step.as] = result;
			}
			this.steps.push(step);
			const durationMs = Math.round(performance.now() - startedAt);
			const observation = await this.safeObserve();
			await this.trace.append({
				kind: "action",
				url,
				step: traceSafeStep(step),
				success: true,
				durationMs,
				result: traceSafeResult(step, result),
				observation,
			});
			return { success: true, recorded: true, step, durationMs, result, observation };
		} catch (error) {
			const durationMs = Math.round(performance.now() - startedAt);
			const message = error instanceof Error ? error.message : String(error);
			const observation = await this.safeObserve();
			await this.trace.append({
				kind: "action",
				url: observation.url,
				step: traceSafeStep(step),
				success: false,
				durationMs,
				error: message,
				observation,
			});
			return {
				success: false,
				recorded: false,
				step,
				durationMs,
				error: message,
				observation,
			};
		}
	}

	async verify(step: AssertStep): Promise<PerformStepResult> {
		if (step.action !== "assert") throw new Error("Verification requires an assert step");
		return this.perform(step);
	}

	async publish(options: PublishFlowOptions): Promise<PublishFlowResult> {
		this.assertUsable();
		validatePublishedVariables(options.variables);
		if (!this.steps.some((step) => step.action === "assert")) {
			throw new Error("Published workflows require at least one successful assertion");
		}
		const targetPath = resolveTuiPath(options.path);
		if (!isPathWithin(process.cwd(), targetPath) && !isPathWithin(WORKFLOWS_DIR, targetPath)) {
			throw new Error("Workflow output path must stay inside the current project");
		}
		const flow = parseFlowDefinition({
			name: options.name?.trim() || this.options.goal.trim().slice(0, 100),
			description: options.description || `Agent-authored workflow: ${this.options.goal}`,
			version: "1.0",
			variables: options.variables,
			steps: this.steps,
		} satisfies FlowDefinition);
		await mkdir(dirname(targetPath), { recursive: true });
		await Bun.write(targetPath, `${JSON.stringify(flow, null, 2)}\n`);
		await this.trace.append({
			kind: "published",
			url: await this.page.url(),
			metadata: { path: targetPath, stepCount: flow.steps.length },
		});
		return { path: targetPath, flow, stepCount: flow.steps.length, tracePath: this.trace.path };
	}

	async getTrace() {
		return this.trace.read();
	}

	async close(): Promise<void> {
		if (this.closed) return;
		this.closed = true;
		try {
			await this.trace.append({
				kind: "session_closed",
				metadata: { stepCount: this.steps.length, actionAttempts: this.actionAttempts },
			});
		} finally {
			await this.browser.close();
		}
	}
}
