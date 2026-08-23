import type { Browser } from "../cdp/browser.js";
import type { Page } from "../cdp/page.js";

export interface TaskLogger {
	info: (msg: string) => void;
	success: (msg: string) => void;
	warn: (msg: string) => void;
	error: (msg: string) => void;
}

export interface TaskContext {
	browser: Browser;
	page: Page;
	args: Record<string, string | boolean | number>;
	log: TaskLogger;
	outputDir: string;
}

export interface TaskParameter {
	name: string;
	description: string;
	required?: boolean;
	default?: string | boolean | number;
}

export interface TaskDefinition<TOutput = unknown> {
	id: string;
	name: string;
	description: string;
	params?: TaskParameter[];
	run: (ctx: TaskContext) => Promise<TOutput>;
}

export interface TaskExecutionResult<TOutput = unknown> {
	taskId: string;
	success: boolean;
	durationMs: number;
	data?: TOutput;
	error?: string;
}
