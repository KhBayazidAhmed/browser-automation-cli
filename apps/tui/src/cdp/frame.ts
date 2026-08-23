import {
	assertElementText,
	getElementAttribute,
	getElementText,
	getMultipleElementTexts,
} from "./page/page-extractors.js";
import { clearElement, clickElement, typeIntoElement } from "./page/page-interactions.js";
import type {
	AssertOptions,
	SelectorOptions,
	TextMatchOptions,
	TypeOptions,
} from "./page/types.js";
import type { Page } from "./page.js";

export interface FramePayload {
	id: string;
	parentId?: string;
	url: string;
	name?: string;
	contextId?: number;
}

export class Frame {
	public id: string;
	public parentId?: string;
	public url: string;
	public name?: string;
	private _contextId?: number;

	constructor(
		private readonly page: Page,
		payload: FramePayload,
	) {
		this.id = payload.id;
		this.parentId = payload.parentId;
		this.url = payload.url;
		this.name = payload.name;
		this._contextId = payload.contextId;
	}

	get contextId(): number | undefined {
		if (this._contextId !== undefined) return this._contextId;
		return (this.page.frameManager as any)._frameIdToContext?.get(this.id);
	}

	set contextId(val: number | undefined) {
		this._contextId = val;
	}

	async ensureContextId(timeout = 3000): Promise<number | undefined> {
		if (this.contextId !== undefined) return this.contextId;
		const start = Date.now();
		while (this.contextId === undefined && Date.now() - start < timeout) {
			await new Promise((r) => setTimeout(r, 40));
		}
		if (this.contextId === undefined && this.id) {
			try {
				const res = await this.page.client.send("Page.createIsolatedWorld", {
					frameId: this.id,
					worldName: "cdp_engine",
					grantUniversalAccess: true,
				});
				if (res?.executionContextId) {
					this.contextId = res.executionContextId;
					(this.page.frameManager as any)._frameIdToContext?.set(this.id, res.executionContextId);
					return this.contextId;
				}
			} catch {}
		}
		return this.contextId;
	}

	isMainFrame(): boolean {
		return !this.parentId;
	}

	parentFrame(): Frame | null {
		if (!this.parentId) return null;
		return this.page.frames().find((f) => f.id === this.parentId) || null;
	}

	childFrames(): Frame[] {
		return this.page.frames().filter((f) => f.parentId === this.id);
	}

	async evaluate<T = unknown>(
		expressionOrFn: string | ((...args: any[]) => any),
		...args: unknown[]
	): Promise<T> {
		const ctxId = await this.ensureContextId();
		return this.page.evaluateInContext<T>(ctxId, expressionOrFn, ...args);
	}

	async title(): Promise<string> {
		return (await this.evaluate<string>(() => document.title)) || "";
	}

	async content(): Promise<string> {
		return (await this.evaluate<string>(() => document.documentElement?.outerHTML || "")) || "";
	}

	async waitForSelector(selector?: string, options: SelectorOptions = {}): Promise<boolean> {
		const ctxId = await this.ensureContextId();
		return this.page.waitForSelectorInContext(ctxId, selector, options);
	}

	async waitForText(text: string, options: SelectorOptions = {}): Promise<boolean> {
		return this.waitForSelector(options.selector, {
			...options,
			text,
			strictText: options.strictText ?? true,
		});
	}

	async click(selector?: string, options: SelectorOptions = {}): Promise<void> {
		const ctxId = await this.ensureContextId();
		return clickElement(this.page, selector, options, ctxId);
	}

	async clickByText(text: string, options: SelectorOptions = {}): Promise<void> {
		return this.click(options.selector, {
			...options,
			text,
			strictText: options.strictText ?? true,
		});
	}

	async type(selector?: string, text = "", options: TypeOptions = {}): Promise<void> {
		const ctxId = await this.ensureContextId();
		return typeIntoElement(this.page, selector, text, options, ctxId);
	}

	async clear(selector?: string, options: SelectorOptions = {}): Promise<void> {
		const ctxId = await this.ensureContextId();
		return clearElement(this.page, selector, options, ctxId);
	}

	async getText(selector?: string, options: SelectorOptions = {}): Promise<string | null> {
		const ctxId = await this.ensureContextId();
		return getElementText(this.page, selector, options, ctxId);
	}

	async getMultipleText(selector: string, options: TextMatchOptions = {}): Promise<string[]> {
		const ctxId = await this.ensureContextId();
		return getMultipleElementTexts(this.page, selector, options, ctxId);
	}

	async getAttribute(
		selector: string | undefined,
		attribute: string,
		options: SelectorOptions = {},
	): Promise<string | null> {
		const ctxId = await this.ensureContextId();
		return getElementAttribute(this.page, selector, attribute, options, ctxId);
	}

	async assertText(selector: string | undefined, options: AssertOptions = {}): Promise<string> {
		const ctxId = await this.ensureContextId();
		return assertElementText(this.page, selector, options, ctxId);
	}
}
