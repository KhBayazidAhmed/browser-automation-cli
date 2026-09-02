export type FlowActionType =
	| "goto"
	| "click"
	| "type"
	| "wait"
	| "waitForSelector"
	| "extract"
	| "extractMultiple"
	| "screenshot"
	| "pdf"
	| "block"
	| "eval"
	| "assert"
	| "save";

export interface StepRetryOptions {
	maxAttempts: number;
	backoffMs?: number;
}

export interface StepConditionOptions {
	exists?: string;
	selector?: string;
	text?: string;
	not?: boolean;
}

export interface BaseStep {
	[key: string]: unknown;
	name?: string;
	action: FlowActionType;
	frame?: string;
	text?: string;
	strictText?: boolean | string;
	ignoreCase?: boolean;
	regex?: string;
	startsWith?: string;
	endsWith?: string;
	normalizeWhitespace?: boolean;
	variables?: Record<string, unknown>;
	optional?: boolean;
	continueOnError?: boolean;
	retry?: StepRetryOptions;
	condition?: StepConditionOptions;
}

export interface GotoStep extends BaseStep {
	action: "goto";
	url: string;
	waitUntil?: "load" | "domcontentloaded" | "networkidle";
	timeout?: number;
}

export interface ClickStep extends BaseStep {
	action: "click";
	selector?: string;
	text?: string;
	strictText?: boolean | string;
	ignoreCase?: boolean;
	regex?: string;
	startsWith?: string;
	endsWith?: string;
	normalizeWhitespace?: boolean;
	timeout?: number;
}

export interface TypeStep extends BaseStep {
	action: "type";
	selector?: string;
	text: string;
	targetText?: string;
	strictText?: boolean | string;
	ignoreCase?: boolean;
	regex?: string;
	startsWith?: string;
	endsWith?: string;
	normalizeWhitespace?: boolean;
	clearFirst?: boolean;
	timeout?: number;
}

export interface WaitStep extends BaseStep {
	action: "wait";
	durationMs: number;
}

export interface WaitForSelectorStep extends BaseStep {
	action: "waitForSelector";
	selector?: string;
	text?: string;
	strictText?: boolean | string;
	ignoreCase?: boolean;
	regex?: string;
	startsWith?: string;
	endsWith?: string;
	normalizeWhitespace?: boolean;
	timeout?: number;
}

export interface ExtractStep extends BaseStep {
	action: "extract";
	selector?: string;
	text?: string;
	strictText?: boolean | string;
	ignoreCase?: boolean;
	regex?: string;
	startsWith?: string;
	endsWith?: string;
	normalizeWhitespace?: boolean;
	as: string;
	attribute?: string; // "text" (default) or "innerText", "href", "src", "value", etc.
	all?: boolean; // if true, returns string[] of all matching elements
	timeout?: number;
}

export interface ExtractMultipleStep extends BaseStep {
	action: "extractMultiple";
	containerSelector: string;
	as: string;
	limit?: number;
	fields: Record<string, string>; // e.g. { "title": "h2", "link": "a@href", "price": ".price" }
	filterText?: string;
	filterIgnoreCase?: boolean;
	filterRegex?: string;
}

export interface ScreenshotStep extends BaseStep {
	action: "screenshot";
	path?: string;
	selector?: string;
	fullPage?: boolean;
}

export interface PDFStep extends BaseStep {
	action: "pdf";
	path?: string;
}

export interface BlockStep extends BaseStep {
	action: "block";
	types: Array<"image" | "stylesheet" | "font" | "media" | "script">;
}

export interface EvalStep extends BaseStep {
	action: "eval";
	script?: string;
	code?: string;
	selector?: string;
	as?: string;
}

export interface AssertStep extends BaseStep {
	action: "assert";
	selector?: string;
	text?: string;
	strictText?: boolean | string;
	equals?: string;
	contains?: string;
	startsWith?: string;
	endsWith?: string;
	matches?: string;
	ignoreCase?: boolean;
	normalizeWhitespace?: boolean;
	attribute?: string;
	timeout?: number;
}

export interface SaveStep extends BaseStep {
	action: "save";
	path?: string;
	format?: "json" | "csv";
}

export type FlowStep =
	| GotoStep
	| ClickStep
	| TypeStep
	| WaitStep
	| WaitForSelectorStep
	| ExtractStep
	| ExtractMultipleStep
	| ScreenshotStep
	| PDFStep
	| BlockStep
	| EvalStep
	| AssertStep
	| SaveStep;

export interface FlowDefinition {
	name: string;
	description?: string;
	version?: string;
	variables?: Record<string, unknown>;
	data?: {
		source: string;
		results?: Record<string, string>;
		sensitiveColumns?: string[];
	};
	dataSources?: Record<
		string,
		{
			provider: string;
			uri?: string;
			account?: string;
			options?: Record<string, unknown>;
		}
	>;
	steps: FlowStep[];
	headless?: boolean;
	blockMedia?: boolean;
}

export interface StepExecutionResult {
	stepIndex: number;
	name?: string;
	stepName?: string;
	action: FlowActionType;
	status?: "pass" | "fail" | "skipped";
	success?: boolean;
	durationMs: number;
	result?: unknown;
	extracted?: unknown;
	error?: string;
}

export interface FlowExecutionResult {
	flowName: string;
	success: boolean;
	totalDurationMs: number;
	steps: StepExecutionResult[];
	data: Record<string, unknown>;
	error?: string;
}
