import type { CDPClient } from "./client.js";
import type { Frame } from "./frame.js";
import { buildEvaluateExpression } from "./page/evaluate-helper.js";
import { type FrameIdentifier, FrameManager } from "./page/frame-manager.js";
import { INJECTED_FIND_ELEMENT_SRC } from "./page/injected-element-finder.js";
import {
	assertElementText,
	getElementAttribute,
	getElementText,
	getMultipleElementTexts,
} from "./page/page-extractors.js";
import { clearElement, clickElement, typeIntoElement } from "./page/page-interactions.js";
import {
	blockPageResources,
	captureScreenshot,
	generatePdf,
	getPerformanceMetrics,
} from "./page/page-media.js";
import { navigatePage } from "./page/page-navigation.js";
import {
	type AssertOptions,
	type GotoOptions,
	type PDFOptions,
	type ScreenshotOptions,
	type SelectorOptions,
	serializeMatchOptions,
	type TextMatchOptions,
	type TypeOptions,
	type ViewportOptions,
} from "./page/types.js";

export type {
	AssertOptions,
	GotoOptions,
	PDFOptions,
	ScreenshotOptions,
	SelectorOptions,
	TextMatchOptions,
	TypeOptions,
	ViewportOptions,
};

export class Page {
	private initialized = false;
	public readonly frameManager: FrameManager;

	constructor(
		public readonly client: CDPClient,
		public readonly targetId: string,
	) {
		this.frameManager = new FrameManager(this);
	}

	async init(): Promise<void> {
		if (this.initialized) return;
		await Promise.all([
			this.client.send("Page.enable"),
			this.client.send("Runtime.enable"),
			this.client.send("DOM.enable"),
			this.client.send("Network.enable"),
		]);
		await this.frameManager.init();
		this.initialized = true;
	}

	mainFrame(): Frame {
		return this.frameManager.mainFrame();
	}
	frames(): Frame[] {
		return this.frameManager.frames();
	}
	frame(filter: FrameIdentifier): Frame | undefined {
		return this.frameManager.getFrame(filter);
	}
	async waitForFrame(filter: FrameIdentifier, timeout = 10000): Promise<Frame> {
		return this.frameManager.waitForFrame(filter, timeout);
	}

	async goto(url: string, options: GotoOptions = {}): Promise<void> {
		return navigatePage(this, url, options);
	}

	async title(): Promise<string> {
		await this.init();
		return (await this.evaluate<string>(() => document.title)) || "";
	}

	async url(): Promise<string> {
		await this.init();
		return (await this.evaluate<string>(() => window.location.href)) || "";
	}

	async content(): Promise<string> {
		await this.init();
		return (await this.evaluate<string>(() => document.documentElement.outerHTML)) || "";
	}

	async setContent(html: string): Promise<void> {
		await this.init();
		await this.goto(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
	}

	async evaluateInContext<T = unknown>(
		contextId: number | undefined,
		expressionOrFn: string | ((...args: any[]) => any),
		...args: unknown[]
	): Promise<T> {
		await this.init();
		const expr = buildEvaluateExpression(expressionOrFn, args);
		const params: Record<string, unknown> = {
			expression: expr,
			returnByValue: true,
			awaitPromise: true,
		};
		if (contextId !== undefined) params.contextId = contextId;
		const response = await this.client.send("Runtime.evaluate", params);

		if (response.exceptionDetails) {
			const detail =
				response.exceptionDetails.exception?.description ||
				response.exceptionDetails.text ||
				"Unknown evaluation error";
			throw new Error(`Evaluation failed: ${detail}`);
		}
		return response.result?.value as T;
	}

	async evaluate<T = unknown>(
		expressionOrFn: string | ((...args: any[]) => any),
		...args: unknown[]
	): Promise<T> {
		return this.evaluateInContext<T>(undefined, expressionOrFn, ...args);
	}

	async waitForSelectorInContext(
		contextId: number | undefined,
		selector?: string,
		options: SelectorOptions = {},
	): Promise<boolean> {
		await this.init();
		const timeout = options.timeout || 10000;
		const startTime = Date.now();
		const matchOpts = serializeMatchOptions(options);

		while (Date.now() - startTime < timeout) {
			const exists = await this.evaluateInContext<boolean>(
				contextId,
				`${INJECTED_FIND_ELEMENT_SRC}\nreturn Boolean(__cdpFindElement(arguments[0], arguments[1]));`,
				selector,
				matchOpts,
			);
			if (exists) return true;
			await new Promise((r) => setTimeout(r, 50));
		}
		throw new Error(
			`Timeout waiting for element${selector ? ` "${selector}"` : ""}${options.text ? ` (text: "${options.text}")` : ""} (${timeout}ms)`,
		);
	}

	async waitForSelector(selector?: string, options: SelectorOptions = {}): Promise<boolean> {
		await this.init();
		if (options.frame) {
			const f = await this.frameManager.resolveFrame(options.frame);
			const ctx = await f.ensureContextId();
			return this.waitForSelectorInContext(ctx, selector, options);
		}
		const timeout = options.timeout || 10000;
		const startTime = Date.now();
		while (Date.now() - startTime < timeout) {
			const targetFrame = await this.frameManager.findFrameWithElement(selector, options);
			if (targetFrame) return true;
			await new Promise((r) => setTimeout(r, 50));
		}
		throw new Error(
			`Timeout waiting for element${selector ? ` "${selector}"` : ""}${options.text ? ` (text: "${options.text}")` : ""} (${timeout}ms)`,
		);
	}

	async waitForText(text: string, options: SelectorOptions = {}): Promise<boolean> {
		return this.waitForSelector(options.selector, {
			...options,
			text,
			strictText: options.strictText ?? true,
		});
	}

	async click(selector?: string, options: SelectorOptions = {}): Promise<void> {
		return clickElement(this, selector, options);
	}

	async clickByText(text: string, options: SelectorOptions = {}): Promise<void> {
		return this.click(options.selector, {
			...options,
			text,
			strictText: options.strictText ?? true,
		});
	}

	async type(selector?: string, text = "", options: TypeOptions = {}): Promise<void> {
		return typeIntoElement(this, selector, text, options);
	}

	async clear(selector?: string, options: SelectorOptions = {}): Promise<void> {
		return clearElement(this, selector, options);
	}

	async getText(selector?: string, options: SelectorOptions = {}): Promise<string | null> {
		return getElementText(this, selector, options);
	}

	async getMultipleText(selector: string, options: TextMatchOptions = {}): Promise<string[]> {
		return getMultipleElementTexts(this, selector, options);
	}

	async getAttribute(
		selector: string | undefined,
		attribute: string,
		options: SelectorOptions = {},
	): Promise<string | null> {
		return getElementAttribute(this, selector, attribute, options);
	}

	async assertText(selector: string | undefined, options: AssertOptions = {}): Promise<string> {
		return assertElementText(this, selector, options);
	}

	async screenshot(options: ScreenshotOptions = {}): Promise<Uint8Array> {
		return captureScreenshot(this, options);
	}

	async pdf(options: PDFOptions = {}): Promise<Uint8Array> {
		return generatePdf(this, options);
	}

	async blockResources(resourceTypes: string[] = ["image", "font", "media"]): Promise<void> {
		return blockPageResources(this, resourceTypes);
	}

	async getMetrics(): Promise<Record<string, number>> {
		return getPerformanceMetrics(this);
	}

	async close(): Promise<void> {
		try {
			await this.client.send("Target.closeTarget", { targetId: this.targetId });
		} catch {
			this.client.close();
		}
	}
}
