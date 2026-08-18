import type { CDPClient } from "./client.js";

export interface GotoOptions {
	waitUntil?: "load" | "domcontentloaded" | "networkidle";
	timeout?: number;
}

export interface ScreenshotOptions {
	path?: string;
	format?: "png" | "jpeg" | "webp";
	quality?: number;
	fullPage?: boolean;
}

export interface PDFOptions {
	path?: string;
	printBackground?: boolean;
}

export interface ViewportOptions {
	width: number;
	height: number;
	deviceScaleFactor?: number;
	isMobile?: boolean;
}

export class Page {
	private initialized = false;

	constructor(
		public readonly client: CDPClient,
		public readonly targetId: string,
	) {}

	async init(): Promise<void> {
		if (this.initialized) return;
		await Promise.all([
			this.client.send("Page.enable"),
			this.client.send("Runtime.enable"),
			this.client.send("DOM.enable"),
			this.client.send("Network.enable"),
		]);
		this.initialized = true;
	}

	async goto(url: string, options: GotoOptions = {}): Promise<void> {
		await this.init();
		const waitUntil = options.waitUntil || "domcontentloaded";
		const timeout = options.timeout || 30000;

		let targetEvent = "Page.domContentEventFired";
		if (waitUntil === "load") {
			targetEvent = "Page.loadEventFired";
		}

		const eventPromise = this.client.once(targetEvent);

		const timeoutPromise = new Promise<never>((_, reject) =>
			setTimeout(
				() =>
					reject(new Error(`Navigation timeout after ${timeout}ms to ${url}`)),
				timeout,
			),
		);

		const navigatePromise = this.client.send("Page.navigate", { url });

		await Promise.race([
			Promise.all([navigatePromise, eventPromise]),
			timeoutPromise,
		]);
	}

	async title(): Promise<string> {
		await this.init();
		const res = await this.evaluate<string>(() => document.title);
		return res || "";
	}

	async url(): Promise<string> {
		await this.init();
		const res = await this.evaluate<string>(() => window.location.href);
		return res || "";
	}

	async content(): Promise<string> {
		await this.init();
		const res = await this.evaluate<string>(
			() => document.documentElement.outerHTML,
		);
		return res || "";
	}

	async setContent(html: string): Promise<void> {
		await this.init();
		await this.goto(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
	}

	async evaluate<T = any>(
		expressionOrFn: string | ((...args: any[]) => any),
		...args: any[]
	): Promise<T> {
		await this.init();
		let expr: string;
		if (typeof expressionOrFn === "function") {
			expr = `(${expressionOrFn.toString()})(${args.map((a) => (a === undefined ? "undefined" : JSON.stringify(a))).join(",")})`;
		} else {
			expr = expressionOrFn;
		}

		const response = await this.client.send("Runtime.evaluate", {
			expression: expr,
			returnByValue: true,
			awaitPromise: true,
		});

		if (response.exceptionDetails) {
			const detail =
				response.exceptionDetails.exception?.description ||
				response.exceptionDetails.text ||
				"Unknown evaluation error";
			throw new Error(`Evaluation failed: ${detail}`);
		}

		return response.result?.value as T;
	}

	async waitForSelector(
		selector?: string,
		options: {
			timeout?: number;
			text?: string;
			strictText?: boolean | string;
		} = {},
	): Promise<boolean> {
		await this.init();
		const timeout = options.timeout || 10000;
		const startTime = Date.now();

		while (Date.now() - startTime < timeout) {
			const exists = await this.evaluate(
				(sel, text, strictText) => {
					let targetText = text;
					let isStrict = false;

					if (typeof strictText === "string") {
						targetText = strictText;
						isStrict = true;
					} else if (strictText === true) {
						isStrict = true;
					} else if (text && strictText !== false) {
						isStrict = true;
					}

					let s = sel?.trim() || "";
					if (s) {
						const strictQuotedMatch = s.match(/^text\s*=\s*["']([^"']+)["']$/i);
						if (strictQuotedMatch) {
							targetText = strictQuotedMatch[1];
							isStrict = true;
							s = "";
						} else {
							const textMatch = s.match(/^text\s*=\s*(.+)$/i);
							if (textMatch) {
								targetText = textMatch[1]?.trim();
								isStrict = strictText !== false;
								s = "";
							} else {
								const textIsMatch = s.match(
									/^(.*?):text-is\s*\(\s*["']([^"']+)["']\s*\)$/i,
								);
								if (textIsMatch) {
									s = textIsMatch[1]?.trim() || "";
									targetText = textIsMatch[2];
									isStrict = true;
								} else {
									const hasTextMatch = s.match(
										/^(.*?):(has-text|contains)\s*\(\s*["']([^"']+)["']\s*\)$/i,
									);
									if (hasTextMatch) {
										s = hasTextMatch[1]?.trim() || "";
										targetText = hasTextMatch[3];
										isStrict = false;
									}
								}
							}
						}
					}

					let candidates: HTMLElement[] = [];
					if (s) {
						try {
							candidates = Array.from(
								document.querySelectorAll(s),
							) as HTMLElement[];
						} catch {
							if (!targetText) {
								targetText = s;
								isStrict = strictText !== false;
							}
						}
					}

					if (candidates.length === 0 && targetText) {
						candidates = Array.from(
							document.querySelectorAll(
								"button, a, input, textarea, select, label, summary, [role='button'], [role='link'], [role='tab'], [role='menuitem'], [role='option'], [tabindex], h1, h2, h3, h4, h5, h6, p, span, div, li, td, th, *",
							),
						) as HTMLElement[];
					}

					if (targetText !== undefined && targetText !== "") {
						const targetNorm = targetText.trim();
						for (const el of candidates) {
							if (el.closest && el.closest("#__cdp_recorder_hud__")) continue;
							const inner = el.innerText?.trim() ?? "";
							const content = el.textContent?.trim() ?? "";
							const val =
								"value" in el && typeof (el as any).value === "string"
									? (el as any).value.trim()
									: "";
							const aria = el.getAttribute("aria-label")?.trim() ?? "";
							const placeholder = el.getAttribute("placeholder")?.trim() ?? "";
							const title = el.getAttribute("title")?.trim() ?? "";

							if (isStrict) {
								if (
									inner === targetNorm ||
									content === targetNorm ||
									val === targetNorm ||
									aria === targetNorm ||
									placeholder === targetNorm ||
									title === targetNorm
								) {
									return true;
								}
							} else {
								if (
									inner.includes(targetNorm) ||
									content.includes(targetNorm) ||
									val.includes(targetNorm) ||
									aria.includes(targetNorm) ||
									placeholder.includes(targetNorm) ||
									title.includes(targetNorm)
								) {
									return true;
								}
							}
						}
						return false;
					}

					return candidates.length > 0;
				},
				selector,
				options.text,
				options.strictText,
			);

			if (exists) return true;
			await new Promise((r) => setTimeout(r, 100));
		}

		throw new Error(
			`Timeout waiting for element${selector ? ` "${selector}"` : ""}${options.text || options.strictText ? ` with text "${options.strictText || options.text}"` : ""} (${timeout}ms)`,
		);
	}

	async waitForText(
		text: string,
		options: { selector?: string; strictText?: boolean; timeout?: number } = {},
	): Promise<boolean> {
		return this.waitForSelector(options.selector, {
			text,
			strictText: options.strictText ?? true,
			timeout: options.timeout,
		});
	}

	async click(
		selector?: string,
		options: {
			timeout?: number;
			text?: string;
			strictText?: boolean | string;
		} = {},
	): Promise<void> {
		await this.init();
		await this.waitForSelector(selector, options);
		const success = await this.evaluate(
			(sel, text, strictText) => {
				let targetText = text;
				let isStrict = false;

				if (typeof strictText === "string") {
					targetText = strictText;
					isStrict = true;
				} else if (strictText === true) {
					isStrict = true;
				} else if (text && strictText !== false) {
					isStrict = true;
				}

				let s = sel?.trim() || "";
				if (s) {
					const strictQuotedMatch = s.match(/^text\s*=\s*["']([^"']+)["']$/i);
					if (strictQuotedMatch) {
						targetText = strictQuotedMatch[1];
						isStrict = true;
						s = "";
					} else {
						const textMatch = s.match(/^text\s*=\s*(.+)$/i);
						if (textMatch) {
							targetText = textMatch[1]?.trim();
							isStrict = strictText !== false;
							s = "";
						} else {
							const textIsMatch = s.match(
								/^(.*?):text-is\s*\(\s*["']([^"']+)["']\s*\)$/i,
							);
							if (textIsMatch) {
								s = textIsMatch[1]?.trim() || "";
								targetText = textIsMatch[2];
								isStrict = true;
							} else {
								const hasTextMatch = s.match(
									/^(.*?):(has-text|contains)\s*\(\s*["']([^"']+)["']\s*\)$/i,
								);
								if (hasTextMatch) {
									s = hasTextMatch[1]?.trim() || "";
									targetText = hasTextMatch[3];
									isStrict = false;
								}
							}
						}
					}
				}

				let candidates: HTMLElement[] = [];
				if (s) {
					try {
						candidates = Array.from(
							document.querySelectorAll(s),
						) as HTMLElement[];
					} catch {
						if (!targetText) {
							targetText = s;
							isStrict = strictText !== false;
						}
					}
				}

				if (candidates.length === 0 && targetText) {
					candidates = Array.from(
						document.querySelectorAll(
							"button, a, input, textarea, select, label, summary, [role='button'], [role='link'], [role='tab'], [role='menuitem'], [role='option'], [tabindex], h1, h2, h3, h4, h5, h6, p, span, div, li, td, th, *",
						),
					) as HTMLElement[];
				}

				let targetEl: HTMLElement | null = null;

				if (targetText !== undefined && targetText !== "") {
					const targetNorm = targetText.trim();
					const matched: {
						el: HTMLElement;
						depth: number;
						textLen: number;
						isDirect: boolean;
					}[] = [];

					for (const el of candidates) {
						if (el.closest && el.closest("#__cdp_recorder_hud__")) continue;
						const inner = el.innerText?.trim() ?? "";
						const content = el.textContent?.trim() ?? "";
						const val =
							"value" in el && typeof (el as any).value === "string"
								? (el as any).value.trim()
								: "";
						const aria = el.getAttribute("aria-label")?.trim() ?? "";
						const placeholder = el.getAttribute("placeholder")?.trim() ?? "";
						const title = el.getAttribute("title")?.trim() ?? "";

						let isMatch = false;
						let isDirectMatch = false;

						if (isStrict) {
							if (
								inner === targetNorm ||
								content === targetNorm ||
								val === targetNorm ||
								aria === targetNorm ||
								placeholder === targetNorm ||
								title === targetNorm
							) {
								isMatch = true;
								isDirectMatch = true;
							}
						} else {
							if (
								inner.includes(targetNorm) ||
								content.includes(targetNorm) ||
								val.includes(targetNorm) ||
								aria.includes(targetNorm) ||
								placeholder.includes(targetNorm) ||
								title.includes(targetNorm)
							) {
								isMatch = true;
								if (inner === targetNorm || content === targetNorm) {
									isDirectMatch = true;
								}
							}
						}

						if (isMatch) {
							let depth = 0;
							let p: HTMLElement | null = el;
							while (p) {
								depth++;
								p = p.parentElement;
							}
							const textLen = (content || inner || val).length;
							matched.push({ el, depth, textLen, isDirect: isDirectMatch });
						}
					}

					if (matched.length > 0) {
						matched.sort((a, b) => {
							if (a.isDirect !== b.isDirect) return a.isDirect ? -1 : 1;
							if (a.textLen !== b.textLen) return a.textLen - b.textLen;
							return b.depth - a.depth;
						});
						targetEl = matched[0]!.el;
					}
				} else if (candidates.length > 0) {
					targetEl = candidates[0]!;
				}

				if (!targetEl) return false;
				targetEl.scrollIntoView({ block: "center", inline: "center" });
				targetEl.click();
				return true;
			},
			selector,
			options.text,
			options.strictText,
		);

		if (!success) {
			throw new Error(
				`Could not click element: ${selector ? `"${selector}"` : ""}${options.text || options.strictText ? ` with text "${options.strictText || options.text}"` : ""}`,
			);
		}
	}

	async clickByText(
		text: string,
		options: { selector?: string; strictText?: boolean; timeout?: number } = {},
	): Promise<void> {
		return this.click(options.selector, {
			text,
			strictText: options.strictText ?? true,
			timeout: options.timeout,
		});
	}

	async type(
		selector?: string,
		text = "",
		options: {
			clearFirst?: boolean;
			timeout?: number;
			targetText?: string;
			strictText?: boolean | string;
		} = {},
	): Promise<void> {
		await this.init();
		await this.waitForSelector(selector, {
			text: options.targetText,
			strictText: options.strictText,
			timeout: options.timeout,
		});

		const success = await this.evaluate(
			(sel, val, clear, targetText, strictText) => {
				let targetTextNorm = targetText;
				let isStrict = false;

				if (typeof strictText === "string") {
					targetTextNorm = strictText;
					isStrict = true;
				} else if (strictText === true) {
					isStrict = true;
				}

				const s = sel?.trim() || "";
				let candidates: HTMLElement[] = [];
				if (s) {
					try {
						candidates = Array.from(
							document.querySelectorAll(s),
						) as HTMLElement[];
					} catch {}
				}

				if (candidates.length === 0) {
					candidates = Array.from(
						document.querySelectorAll(
							"input, textarea, [contenteditable='true']",
						),
					) as HTMLElement[];
				}

				let targetInput: HTMLElement | null = null;

				if (targetTextNorm) {
					const t = targetTextNorm.trim();
					for (const el of candidates) {
						const placeholder = el.getAttribute("placeholder")?.trim() ?? "";
						const aria = el.getAttribute("aria-label")?.trim() ?? "";
						const name = el.getAttribute("name")?.trim() ?? "";
						const id = el.id ?? "";

						if (isStrict) {
							if (placeholder === t || aria === t || name === t || id === t) {
								targetInput = el;
								break;
							}
						} else {
							if (
								placeholder.includes(t) ||
								aria.includes(t) ||
								name.includes(t) ||
								id.includes(t)
							) {
								targetInput = el;
								break;
							}
						}
					}
				}

				if (!targetInput && candidates.length > 0) {
					targetInput = candidates[0]!;
				}

				if (!targetInput) return false;

				targetInput.scrollIntoView({ block: "center", inline: "center" });
				targetInput.focus();

				if ("value" in targetInput) {
					(targetInput as HTMLInputElement).value = clear
						? val
						: ((targetInput as HTMLInputElement).value || "") + val;
				} else if (targetInput.isContentEditable) {
					targetInput.innerText = clear ? val : targetInput.innerText + val;
				}

				targetInput.dispatchEvent(new Event("input", { bubbles: true }));
				targetInput.dispatchEvent(new Event("change", { bubbles: true }));
				return true;
			},
			selector,
			text,
			options.clearFirst,
			options.targetText,
			options.strictText,
		);

		if (!success) {
			throw new Error(`Could not type into element: "${selector || text}"`);
		}
	}

	async clear(selector: string): Promise<void> {
		await this.init();
		await this.evaluate((sel) => {
			const el = document.querySelector(sel) as HTMLElement | null;
			if (!el) return;
			if ("value" in el) {
				(el as HTMLInputElement).value = "";
				el.dispatchEvent(new Event("input", { bubbles: true }));
				el.dispatchEvent(new Event("change", { bubbles: true }));
			} else if (el.isContentEditable) {
				el.innerText = "";
				el.dispatchEvent(new Event("input", { bubbles: true }));
			}
		}, selector);
	}

	async getMultipleText(
		selector: string,
		options: { text?: string; strictText?: boolean | string } = {},
	): Promise<string[]> {
		await this.init();
		return this.evaluate(
			(sel, targetText, isStrict) => {
				const elements = Array.from(document.querySelectorAll(sel));
				return elements
					.filter((el) => {
						if (targetText === undefined || targetText === "") return true;
						const text = (el.textContent || "").trim();
						return isStrict
							? text === String(targetText).trim()
							: text.includes(String(targetText).trim());
					})
					.map((el) => (el.textContent || "").trim());
			},
			selector,
			options.text,
			options.strictText,
		);
	}

	async getText(
		selector?: string,
		options: { text?: string; strictText?: boolean | string } = {},
	): Promise<string | null> {
		await this.init();
		return this.evaluate(
			(sel, text, strictText) => {
				let targetText = text;
				let isStrict = false;

				if (typeof strictText === "string") {
					targetText = strictText;
					isStrict = true;
				} else if (strictText === true) {
					isStrict = true;
				}

				let s = sel?.trim() || "";
				if (s) {
					const strictQuotedMatch = s.match(/^text\s*=\s*["']([^"']+)["']$/i);
					if (strictQuotedMatch) {
						targetText = strictQuotedMatch[1];
						isStrict = true;
						s = "";
					}
				}

				let candidates: HTMLElement[] = [];
				if (s) {
					try {
						candidates = Array.from(
							document.querySelectorAll(s),
						) as HTMLElement[];
					} catch {}
				}

				if (candidates.length === 0 && targetText) {
					candidates = Array.from(
						document.querySelectorAll(
							"button, a, input, label, h1, h2, h3, h4, h5, h6, p, span, div, li, td, th, *",
						),
					) as HTMLElement[];
				}

				if (targetText !== undefined && targetText !== "") {
					const targetNorm = targetText.trim();
					for (const el of candidates) {
						if (el.closest && el.closest("#__cdp_recorder_hud__")) continue;
						const inner = el.innerText?.trim() ?? "";
						const content = el.textContent?.trim() ?? "";
						if (isStrict) {
							if (inner === targetNorm || content === targetNorm) {
								return inner || content;
							}
						} else {
							if (inner.includes(targetNorm) || content.includes(targetNorm)) {
								return inner || content;
							}
						}
					}
				} else if (candidates.length > 0) {
					const el = candidates[0]!;
					return el.innerText?.trim() || el.textContent?.trim() || null;
				}

				return null;
			},
			selector,
			options.text,
			options.strictText,
		);
	}

	async getAttribute(
		selector: string | undefined,
		attributeName: string,
		options: { text?: string; strictText?: boolean | string } = {},
	): Promise<string | null> {
		await this.init();
		return this.evaluate(
			(sel, attr, text, strictText) => {
				let targetText = text;
				let isStrict = false;

				if (typeof strictText === "string") {
					targetText = strictText;
					isStrict = true;
				} else if (strictText === true) {
					isStrict = true;
				}

				const s = sel?.trim() || "";
				let candidates: HTMLElement[] = [];
				if (s) {
					try {
						candidates = Array.from(
							document.querySelectorAll(s),
						) as HTMLElement[];
					} catch {}
				}

				if (candidates.length === 0 && targetText) {
					candidates = Array.from(
						document.querySelectorAll(
							"button, a, input, img, label, h1, h2, h3, h4, h5, h6, p, span, div, *",
						),
					) as HTMLElement[];
				}

				if (targetText !== undefined && targetText !== "") {
					const targetNorm = targetText.trim();
					for (const el of candidates) {
						if (el.closest && el.closest("#__cdp_recorder_hud__")) continue;
						const inner = el.innerText?.trim() ?? "";
						const content = el.textContent?.trim() ?? "";
						if (isStrict) {
							if (inner === targetNorm || content === targetNorm) {
								return el.getAttribute(attr);
							}
						} else {
							if (inner.includes(targetNorm) || content.includes(targetNorm)) {
								return el.getAttribute(attr);
							}
						}
					}
				} else if (candidates.length > 0) {
					return candidates[0]!.getAttribute(attr);
				}

				return null;
			},
			selector,
			attributeName,
			options.text,
			options.strictText,
		);
	}

	async assertText(
		selector: string | undefined,
		options: {
			equals?: string;
			contains?: string;
			strictText?: boolean | string;
			text?: string;
			attribute?: string;
			timeout?: number;
		} = {},
	): Promise<string> {
		await this.init();
		const timeout = options.timeout || 10000;
		const startTime = Date.now();

		let lastActual: string | null = null;
		const expectedEquals =
			typeof options.strictText === "string"
				? options.strictText
				: options.equals;
		const expectedContains = options.contains;

		while (Date.now() - startTime < timeout) {
			const actual =
				options.attribute &&
				options.attribute !== "text" &&
				options.attribute !== "innerText"
					? await this.getAttribute(selector, options.attribute, {
							text: options.text,
						})
					: await this.getText(selector, {
							text: options.text,
						});

			lastActual = actual;

			if (actual !== null) {
				let pass = true;
				if (expectedEquals !== undefined && actual !== expectedEquals) {
					pass = false;
				}
				if (
					expectedContains !== undefined &&
					!actual.includes(expectedContains)
				) {
					pass = false;
				}
				if (pass) return actual;
			}
			await new Promise((r) => setTimeout(r, 50));
		}

		if (lastActual === null) {
			throw new Error(
				`Assertion failed: element "${selector || options.text}" not found`,
			);
		}
		if (expectedEquals !== undefined && lastActual !== expectedEquals) {
			throw new Error(
				`Assertion failed: Expected strict text "${expectedEquals}", but got "${lastActual}" at "${selector || options.text}"`,
			);
		}
		if (
			expectedContains !== undefined &&
			!lastActual.includes(expectedContains)
		) {
			throw new Error(
				`Assertion failed: Expected text containing "${expectedContains}", but got "${lastActual}" at "${selector || options.text}"`,
			);
		}
		return lastActual;
	}

	async blockResources(
		types: Array<"image" | "stylesheet" | "font" | "media" | "script">,
	): Promise<void> {
		await this.init();
		const urlPatterns: string[] = [];

		if (types.includes("image")) {
			urlPatterns.push(
				"*.png",
				"*.jpg",
				"*.jpeg",
				"*.gif",
				"*.webp",
				"*.svg",
				"*.ico",
				"*.bmp",
			);
		}
		if (types.includes("font")) {
			urlPatterns.push("*.woff", "*.woff2", "*.ttf", "*.otf", "*.eot");
		}
		if (types.includes("stylesheet")) {
			urlPatterns.push("*.css");
		}
		if (types.includes("media")) {
			urlPatterns.push("*.mp4", "*.webm", "*.mp3", "*.ogg", "*.wav");
		}

		await this.client.send("Network.setBlockedURLs", {
			urls: urlPatterns,
		});
	}

	async setViewport(options: ViewportOptions): Promise<void> {
		await this.init();
		await this.client.send("Emulation.setDeviceMetricsOverride", {
			width: options.width,
			height: options.height,
			deviceScaleFactor: options.deviceScaleFactor || 1,
			mobile: Boolean(options.isMobile),
		});
	}

	async screenshot(options: ScreenshotOptions = {}): Promise<Uint8Array> {
		await this.init();
		const format = options.format || "png";

		const params: any = { format };
		if (options.quality && (format === "jpeg" || format === "webp")) {
			params.quality = options.quality;
		}

		if (options.fullPage) {
			const metrics = await this.client.send("Page.getLayoutMetrics");
			const contentSize = metrics.contentSize || metrics.cssContentSize;
			if (contentSize) {
				await this.setViewport({
					width: Math.ceil(contentSize.width),
					height: Math.ceil(contentSize.height),
				});
			}
		}

		const res = await this.client.send("Page.captureScreenshot", params);
		const buffer = Buffer.from(res.data, "base64");

		if (options.path) {
			await Bun.write(options.path, buffer);
		}

		return new Uint8Array(buffer);
	}

	async pdf(options: PDFOptions = {}): Promise<Uint8Array> {
		await this.init();
		const res = await this.client.send("Page.printToPDF", {
			printBackground: options.printBackground ?? true,
		});
		const buffer = Buffer.from(res.data, "base64");

		if (options.path) {
			await Bun.write(options.path, buffer);
		}

		return new Uint8Array(buffer);
	}

	async getMetrics(): Promise<Record<string, number>> {
		await this.init();
		const res = await this.client.send("Performance.getMetrics");
		const metrics: Record<string, number> = {};
		for (const m of res.metrics || []) {
			metrics[m.name] = m.value;
		}
		return metrics;
	}

	async close(): Promise<void> {
		try {
			await this.client.send("Target.closeTarget", { targetId: this.targetId });
		} catch {}
		this.client.close();
	}
}
