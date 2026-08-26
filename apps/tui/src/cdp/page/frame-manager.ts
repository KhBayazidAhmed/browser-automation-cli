import { Frame } from "../frame.js";
import type { Page } from "../page.js";
import { INJECTED_FIND_ELEMENT_SRC } from "./injected-element-finder.js";
import { type SelectorOptions, serializeMatchOptions } from "./types.js";

export interface FrameFilterOptions {
	id?: string;
	name?: string;
	url?: string | RegExp;
}

export type FrameIdentifier = string | FrameFilterOptions;

export class FrameManager {
	private _frames = new Map<string, Frame>();
	private _mainFrameId: string | null = null;
	public readonly _frameIdToContext = new Map<string, number>();

	constructor(private readonly page: Page) {
		this.setupEventListeners();
	}

	async init(): Promise<void> {
		try {
			const { frameTree } = await this.page.client.send("Page.getFrameTree");
			if (frameTree) this.processFrameTree(frameTree);
		} catch {}
	}

	private setupEventListeners(): void {
		this.page.client.on("Page.frameAttached", (p: { frameId: string; parentFrameId?: string }) => {
			if (!p?.frameId) return;
			const existing = this._frames.get(p.frameId);
			if (existing) existing.parentId = p.parentFrameId;
			else {
				this._frames.set(
					p.frameId,
					new Frame(this.page, {
						id: p.frameId,
						parentId: p.parentFrameId,
						url: "about:blank",
						contextId: this._frameIdToContext.get(p.frameId),
					}),
				);
			}
		});

		this.page.client.on(
			"Page.frameNavigated",
			(p: { frame?: { id: string; parentId?: string; url?: string; name?: string } }) => {
				const f = p?.frame;
				if (!f?.id) return;
				if (!f.parentId || f.id === this._mainFrameId) {
					this._mainFrameId = f.id;
					for (const [id] of this._frames.entries()) {
						if (id !== f.id) {
							this._frames.delete(id);
							this._frameIdToContext.delete(id);
						}
					}
				}
				const existing = this._frames.get(f.id);
				if (existing) {
					existing.url = f.url || existing.url;
					existing.name = f.name || existing.name;
					existing.parentId = f.parentId;
					if (!existing.contextId) existing.contextId = this._frameIdToContext.get(f.id);
				} else {
					this._frames.set(
						f.id,
						new Frame(this.page, {
							id: f.id,
							parentId: f.parentId,
							url: f.url || "",
							name: f.name,
							contextId: this._frameIdToContext.get(f.id),
						}),
					);
				}
			},
		);

		this.page.client.on("Page.frameDetached", (p: { frameId: string }) => {
			if (p?.frameId) {
				this._frames.delete(p.frameId);
				this._frameIdToContext.delete(p.frameId);
			}
		});

		this.page.client.on(
			"Runtime.executionContextCreated",
			(p: { context: { id: number; auxData?: { frameId?: string } } }) => {
				const ctx = p?.context;
				if (ctx?.auxData?.frameId) {
					this._frameIdToContext.set(ctx.auxData.frameId, ctx.id);
					const frame = this._frames.get(ctx.auxData.frameId);
					if (frame) frame.contextId = ctx.id;
				}
			},
		);

		this.page.client.on(
			"Runtime.executionContextDestroyed",
			(p: { executionContextId: number }) => {
				for (const [frameId, ctxId] of this._frameIdToContext.entries()) {
					if (ctxId === p.executionContextId) {
						this._frameIdToContext.delete(frameId);
						const frame = this._frames.get(frameId);
						if (frame && frame.contextId === ctxId) frame.contextId = undefined;
					}
				}
			},
		);

		this.page.client.on("Runtime.executionContextsCleared", () => {
			this._frameIdToContext.clear();
			for (const frame of this._frames.values()) frame.contextId = undefined;
		});
	}

	private processFrameTree(tree: {
		frame: { id: string; parentId?: string; url?: string; name?: string };
		childFrames?: Array<{
			frame: { id: string; parentId?: string; url?: string; name?: string };
			childFrames?: unknown[];
		}>;
	}): void {
		const f = tree.frame;
		if (!f?.id) return;
		if (!f.parentId) this._mainFrameId = f.id;

		const existing = this._frames.get(f.id);
		if (existing) {
			existing.url = f.url || existing.url;
			existing.name = f.name || existing.name;
			existing.parentId = f.parentId;
		} else {
			this._frames.set(
				f.id,
				new Frame(this.page, {
					id: f.id,
					parentId: f.parentId,
					url: f.url || "",
					name: f.name,
					contextId: this._frameIdToContext.get(f.id),
				}),
			);
		}

		if (Array.isArray(tree.childFrames)) {
			for (const child of tree.childFrames)
				this.processFrameTree(child as Parameters<FrameManager["processFrameTree"]>[0]);
		}
	}

	mainFrame(): Frame {
		if (this._mainFrameId && this._frames.has(this._mainFrameId)) {
			return this._frames.get(this._mainFrameId)!;
		}
		for (const frame of this._frames.values()) {
			if (!frame.parentId) return frame;
		}
		const fallback = new Frame(this.page, { id: "main", url: "about:blank" });
		this._frames.set("main", fallback);
		return fallback;
	}

	frames(): Frame[] {
		return Array.from(this._frames.values());
	}

	getFrame(identifier: FrameIdentifier): Frame | undefined {
		if (typeof identifier === "string") {
			if (this._frames.has(identifier)) return this._frames.get(identifier);
			for (const frame of this._frames.values()) {
				if (frame.name === identifier) return frame;
				if (frame.url.includes(identifier)) return frame;
			}
			return undefined;
		}
		return this.frames().find((frame) => {
			if (identifier.id && frame.id !== identifier.id) return false;
			if (identifier.name && frame.name !== identifier.name) return false;
			if (identifier.url) {
				if (typeof identifier.url === "string" && !frame.url.includes(identifier.url)) return false;
				if (identifier.url instanceof RegExp && !identifier.url.test(frame.url)) return false;
			}
			return true;
		});
	}

	async resolveFrame(identifier: FrameIdentifier, timeout = 10000): Promise<Frame> {
		const start = Date.now();
		while (Date.now() - start < timeout) {
			const frame = this.getFrame(identifier);
			if (frame) {
				await frame.ensureContextId(500);
				return frame;
			}
			if (typeof identifier === "string") {
				try {
					const mainCtx = await this.mainFrame().ensureContextId(500);
					const frameSrc = await this.page.evaluateInContext<string | null>(
						mainCtx,
						(selector) => {
							const el = (document.querySelector(selector) ||
								document.querySelector(`iframe[name="${selector}"]`) ||
								document.querySelector(`iframe#${selector}`)) as HTMLIFrameElement | null;
							return el ? el.src || el.name || el.id : null;
						},
						identifier,
					);
					if (frameSrc) {
						const matched = this.getFrame(frameSrc);
						if (matched) {
							await matched.ensureContextId(500);
							return matched;
						}
					}
				} catch {}
			}
			await new Promise((r) => setTimeout(r, 50));
		}
		const fallback = this.getFrame(identifier);
		if (fallback) return fallback;
		throw new Error(`Frame not found matching "${JSON.stringify(identifier)}"`);
	}

	async waitForFrame(filter: FrameIdentifier, timeout = 10000): Promise<Frame> {
		return this.resolveFrame(filter, timeout);
	}

	async findFrameWithElement(
		selector?: string,
		options: SelectorOptions = {},
	): Promise<Frame | null> {
		const matchOpts = serializeMatchOptions(options);
		const expr = `${INJECTED_FIND_ELEMENT_SRC}\nreturn Boolean(__cdpFindElement(arguments[0], arguments[1]));`;
		try {
			const mainCtx = await this.mainFrame().ensureContextId(400);
			const existsInMain = await this.page.evaluateInContext<boolean>(
				mainCtx,
				expr,
				selector,
				matchOpts,
			);
			if (existsInMain) return this.mainFrame();
		} catch {}

		for (const frame of this.frames()) {
			if (frame.isMainFrame()) continue;
			try {
				const ctx = await frame.ensureContextId(400);
				const exists = await this.page.evaluateInContext<boolean>(ctx, expr, selector, matchOpts);
				if (exists) return frame;
			} catch {}
		}
		return null;
	}
}
