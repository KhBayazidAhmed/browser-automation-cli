import type { FlowDefinition, FlowStep } from "../flow/types.js";

export interface AuthoringSessionOptions {
	goal: string;
	initialUrl: string;
	headless?: boolean;
	userDataDir?: string;
	profileDirectory?: string;
	allowedDomains?: string[];
	maxSteps?: number;
	timeoutMs?: number;
}

export interface ObservedElement {
	ref: string;
	tag: string;
	role?: string;
	name?: string;
	text?: string;
	selector: string;
	type?: string;
	placeholder?: string;
	href?: string;
	disabled?: boolean;
}

export interface ObservedFrame {
	id: string;
	name?: string;
	url: string;
	main: boolean;
}

export interface BrowserObservation {
	timestamp: string;
	url: string;
	title: string;
	visibleText: string;
	elements: ObservedElement[];
	frames: ObservedFrame[];
}

export type AuthoringTraceKind =
	| "session_started"
	| "observation"
	| "action"
	| "published"
	| "session_closed";

export interface AuthoringTraceRecord {
	sequence: number;
	timestamp: string;
	kind: AuthoringTraceKind;
	sessionId: string;
	url?: string;
	step?: FlowStep;
	success?: boolean;
	durationMs?: number;
	result?: unknown;
	error?: string;
	observation?: BrowserObservation;
	metadata?: Record<string, unknown>;
}

export interface PerformStepResult {
	success: boolean;
	recorded: boolean;
	step: FlowStep;
	durationMs: number;
	result?: unknown;
	error?: string;
	observation: BrowserObservation;
}

export interface PublishFlowOptions {
	path: string;
	name?: string;
	description?: string;
	variables?: Record<string, unknown>;
}

export interface PublishFlowResult {
	path: string;
	flow: FlowDefinition;
	stepCount: number;
	tracePath: string;
}
