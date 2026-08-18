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

export interface TextMatchOptions {
	text?: string;
	strictText?: boolean | string;
	ignoreCase?: boolean;
	regex?: string | RegExp;
	startsWith?: string;
	endsWith?: string;
	matches?: string | RegExp;
	normalizeWhitespace?: boolean;
}

export interface SelectorOptions extends TextMatchOptions {
	timeout?: number;
	selector?: string;
}

export interface TypeOptions extends TextMatchOptions {
	clearFirst?: boolean;
	timeout?: number;
	targetText?: string;
}

export interface AssertOptions extends TextMatchOptions {
	equals?: string;
	contains?: string;
	startsWith?: string;
	endsWith?: string;
	matches?: string | RegExp;
	attribute?: string;
	timeout?: number;
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

	private serializeMatchOptions(
		options: TextMatchOptions = {},
	): Record<string, any> {
		const rawRegex = options.regex || options.matches;
		return {
			text: options.text,
			strictText: options.strictText,
			ignoreCase: options.ignoreCase,
			regex:
				rawRegex instanceof RegExp
					? rawRegex.source
					: typeof rawRegex === "string"
						? rawRegex
						: undefined,
			regexFlags: rawRegex instanceof RegExp ? rawRegex.flags : undefined,
			startsWith: options.startsWith,
			endsWith: options.endsWith,
			normalizeWhitespace: options.normalizeWhitespace,
		};
	}

	async waitForSelector(
		selector?: string,
		options: SelectorOptions = {},
	): Promise<boolean> {
		await this.init();
		const timeout = options.timeout || 10000;
		const startTime = Date.now();
		const matchOpts = this.serializeMatchOptions(options);

		while (Date.now() - startTime < timeout) {
			const exists = await this.evaluate(
				(sel, opts) => {
					let s = sel?.trim() || "";
					let targetText = opts.text;
					let isStrict = false;
					let ignoreCase = Boolean(opts.ignoreCase);
					let regex = opts.regex;
					let regexFlags = opts.regexFlags || "";
					let startsWith = opts.startsWith;
					let endsWith = opts.endsWith;
					const normalizeWhitespace = opts.normalizeWhitespace !== false;

					if (typeof opts.strictText === "string") {
						targetText = opts.strictText;
						isStrict = true;
					} else if (opts.strictText === true) {
						isStrict = true;
					} else if (opts.text && opts.strictText !== false) {
						isStrict = true;
					}

					if (s) {
						const flaggedStrictMatch = s.match(
							/^text\/([a-z]+)\s*=\s*["']([^"']+)["']$/i,
						);
						if (flaggedStrictMatch) {
							targetText = flaggedStrictMatch[2];
							isStrict = true;
							if (flaggedStrictMatch[1].toLowerCase().includes("i"))
								ignoreCase = true;
							s = "";
						} else {
							const strictQuotedMatch = s.match(
								/^text\s*=\s*["']([^"']+)["']$/i,
							);
							if (strictQuotedMatch) {
								targetText = strictQuotedMatch[1];
								isStrict = true;
								s = "";
							} else {
								const regexMatch = s.match(/^text\s*=\s*\/(.+)\/([a-z]*)$/i);
								if (regexMatch) {
									regex = regexMatch[1];
									regexFlags = regexMatch[2];
									s = "";
								} else {
									const textMatch = s.match(/^text\s*=\s*(.+)$/i);
									if (textMatch) {
										targetText = textMatch[1]?.trim();
										isStrict = opts.strictText !== false;
										s = "";
									} else {
										const textMatches = s.match(
											/^(.*?):text-matches\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']([a-z]*)["'])?\s*\)$/i,
										);
										if (textMatches) {
											s = textMatches[1]?.trim() || "";
											regex = textMatches[2];
											regexFlags = textMatches[3] || (ignoreCase ? "i" : "");
										} else {
											const textIsMatch = s.match(
												/^(.*?):text-is\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']?([a-z]*)["']?)?\s*\)$/i,
											);
											if (textIsMatch) {
												s = textIsMatch[1]?.trim() || "";
												targetText = textIsMatch[2];
												isStrict = true;
												if (textIsMatch[3]?.toLowerCase().includes("i"))
													ignoreCase = true;
											} else {
												const startsWithMatch = s.match(
													/^(.*?):starts-with\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']?([a-z]*)["']?)?\s*\)$/i,
												);
												if (startsWithMatch) {
													s = startsWithMatch[1]?.trim() || "";
													startsWith = startsWithMatch[2];
													if (startsWithMatch[3]?.toLowerCase().includes("i"))
														ignoreCase = true;
												} else {
													const endsWithMatch = s.match(
														/^(.*?):ends-with\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']?([a-z]*)["']?)?\s*\)$/i,
													);
													if (endsWithMatch) {
														s = endsWithMatch[1]?.trim() || "";
														endsWith = endsWithMatch[2];
														if (endsWithMatch[3]?.toLowerCase().includes("i"))
															ignoreCase = true;
													} else {
														const hasTextMatch = s.match(
															/^(.*?):(has-text|contains)\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']?([a-z]*)["']?)?\s*\)$/i,
														);
														if (hasTextMatch) {
															s = hasTextMatch[1]?.trim() || "";
															targetText = hasTextMatch[3];
															isStrict = false;
															if (hasTextMatch[4]?.toLowerCase().includes("i"))
																ignoreCase = true;
														}
													}
												}
											}
										}
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
							if (!targetText && !regex && !startsWith && !endsWith) {
								targetText = s;
								isStrict = opts.strictText !== false;
							}
						}
					}

					const hasTextCheck =
						Boolean(targetText !== undefined && targetText !== "") ||
						Boolean(regex) ||
						Boolean(startsWith) ||
						Boolean(endsWith);

					if (candidates.length === 0 && hasTextCheck) {
						candidates = Array.from(
							document.querySelectorAll(
								"button, a, input, textarea, select, label, summary, [role='button'], [role='link'], [role='tab'], [role='menuitem'], [role='option'], [tabindex], h1, h2, h3, h4, h5, h6, p, span, div, li, td, th, *",
							),
						) as HTMLElement[];
					}

					const normalize = (str: any) => {
						if (str === null || str === undefined) return "";
						let res = String(str);
						if (normalizeWhitespace) {
							res = res.replace(/\s+/g, " ");
						}
						return res.trim();
					};

					let regexObj: RegExp | null = null;
					if (regex) {
						try {
							regexObj = new RegExp(
								regex,
								regexFlags || (ignoreCase ? "i" : ""),
							);
						} catch {}
					}

					const targetNorm = normalize(targetText);
					const targetCased = ignoreCase
						? targetNorm.toLowerCase()
						: targetNorm;
					const startsWithNorm = startsWith ? normalize(startsWith) : null;
					const startsWithCased =
						startsWithNorm && ignoreCase
							? startsWithNorm.toLowerCase()
							: startsWithNorm;
					const endsWithNorm = endsWith ? normalize(endsWith) : null;
					const endsWithCased =
						endsWithNorm && ignoreCase
							? endsWithNorm.toLowerCase()
							: endsWithNorm;

					for (const el of candidates) {
						if (el.closest && el.closest("#__cdp_recorder_hud__")) continue;
						const inner = normalize(el.innerText);
						const content = normalize(el.textContent);
						const val =
							"value" in el && typeof (el as any).value === "string"
								? normalize((el as any).value)
								: "";
						const aria = normalize(el.getAttribute("aria-label"));
						const placeholder = normalize(el.getAttribute("placeholder"));
						const title = normalize(el.getAttribute("title"));
						const alt = normalize(el.getAttribute("alt"));

						const values = [
							inner,
							content,
							val,
							aria,
							placeholder,
							title,
							alt,
						].filter(Boolean);
						if (values.length === 0) {
							if (!hasTextCheck) return true;
							continue;
						}

						for (const rawV of values) {
							const v = ignoreCase ? rawV.toLowerCase() : rawV;
							if (regexObj) {
								if (regexObj.test(rawV)) return true;
							} else if (startsWithCased !== null) {
								if (v.startsWith(startsWithCased)) return true;
							} else if (endsWithCased !== null) {
								if (v.endsWith(endsWithCased)) return true;
							} else if (targetNorm !== "") {
								if (isStrict) {
									if (v === targetCased) return true;
								} else {
									if (v.includes(targetCased)) return true;
								}
							} else if (!hasTextCheck) {
								return true;
							}
						}
					}
					return false;
				},
				selector,
				matchOpts,
			);

			if (exists) return true;
			await new Promise((r) => setTimeout(r, 50));
		}

		throw new Error(
			`Timeout waiting for element${selector ? ` "${selector}"` : ""}${options.text || options.strictText ? ` with text "${options.strictText || options.text}"` : ""}${options.regex ? ` matching /${options.regex}/` : ""} (${timeout}ms)`,
		);
	}

	async waitForText(
		text: string,
		options: SelectorOptions = {},
	): Promise<boolean> {
		return this.waitForSelector(options.selector, {
			...options,
			text,
			strictText: options.strictText ?? true,
		});
	}

	async click(selector?: string, options: SelectorOptions = {}): Promise<void> {
		await this.init();
		await this.waitForSelector(selector, options);
		const matchOpts = this.serializeMatchOptions(options);

		const success = await this.evaluate(
			(sel, opts) => {
				let s = sel?.trim() || "";
				let targetText = opts.text;
				let isStrict = false;
				let ignoreCase = Boolean(opts.ignoreCase);
				let regex = opts.regex;
				let regexFlags = opts.regexFlags || "";
				let startsWith = opts.startsWith;
				let endsWith = opts.endsWith;
				const normalizeWhitespace = opts.normalizeWhitespace !== false;

				if (typeof opts.strictText === "string") {
					targetText = opts.strictText;
					isStrict = true;
				} else if (opts.strictText === true) {
					isStrict = true;
				} else if (opts.text && opts.strictText !== false) {
					isStrict = true;
				}

				if (s) {
					const flaggedStrictMatch = s.match(
						/^text\/([a-z]+)\s*=\s*["']([^"']+)["']$/i,
					);
					if (flaggedStrictMatch) {
						targetText = flaggedStrictMatch[2];
						isStrict = true;
						if (flaggedStrictMatch[1].toLowerCase().includes("i"))
							ignoreCase = true;
						s = "";
					} else {
						const strictQuotedMatch = s.match(/^text\s*=\s*["']([^"']+)["']$/i);
						if (strictQuotedMatch) {
							targetText = strictQuotedMatch[1];
							isStrict = true;
							s = "";
						} else {
							const regexMatch = s.match(/^text\s*=\s*\/(.+)\/([a-z]*)$/i);
							if (regexMatch) {
								regex = regexMatch[1];
								regexFlags = regexMatch[2];
								s = "";
							} else {
								const textMatch = s.match(/^text\s*=\s*(.+)$/i);
								if (textMatch) {
									targetText = textMatch[1]?.trim();
									isStrict = opts.strictText !== false;
									s = "";
								} else {
									const textMatches = s.match(
										/^(.*?):text-matches\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']([a-z]*)["'])?\s*\)$/i,
									);
									if (textMatches) {
										s = textMatches[1]?.trim() || "";
										regex = textMatches[2];
										regexFlags = textMatches[3] || (ignoreCase ? "i" : "");
									} else {
										const textIsMatch = s.match(
											/^(.*?):text-is\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']?([a-z]*)["']?)?\s*\)$/i,
										);
										if (textIsMatch) {
											s = textIsMatch[1]?.trim() || "";
											targetText = textIsMatch[2];
											isStrict = true;
											if (textIsMatch[3]?.toLowerCase().includes("i"))
												ignoreCase = true;
										} else {
											const startsWithMatch = s.match(
												/^(.*?):starts-with\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']?([a-z]*)["']?)?\s*\)$/i,
											);
											if (startsWithMatch) {
												s = startsWithMatch[1]?.trim() || "";
												startsWith = startsWithMatch[2];
												if (startsWithMatch[3]?.toLowerCase().includes("i"))
													ignoreCase = true;
											} else {
												const endsWithMatch = s.match(
													/^(.*?):ends-with\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']?([a-z]*)["']?)?\s*\)$/i,
												);
												if (endsWithMatch) {
													s = endsWithMatch[1]?.trim() || "";
													endsWith = endsWithMatch[2];
													if (endsWithMatch[3]?.toLowerCase().includes("i"))
														ignoreCase = true;
												} else {
													const hasTextMatch = s.match(
														/^(.*?):(has-text|contains)\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']?([a-z]*)["']?)?\s*\)$/i,
													);
													if (hasTextMatch) {
														s = hasTextMatch[1]?.trim() || "";
														targetText = hasTextMatch[3];
														isStrict = false;
														if (hasTextMatch[4]?.toLowerCase().includes("i"))
															ignoreCase = true;
													}
												}
											}
										}
									}
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
						if (!targetText && !regex && !startsWith && !endsWith) {
							targetText = s;
							isStrict = opts.strictText !== false;
						}
					}
				}

				const hasTextCheck =
					Boolean(targetText !== undefined && targetText !== "") ||
					Boolean(regex) ||
					Boolean(startsWith) ||
					Boolean(endsWith);

				if (candidates.length === 0 && hasTextCheck) {
					candidates = Array.from(
						document.querySelectorAll(
							"button, a, input, textarea, select, label, summary, [role='button'], [role='link'], [role='tab'], [role='menuitem'], [role='option'], [tabindex], h1, h2, h3, h4, h5, h6, p, span, div, li, td, th, *",
						),
					) as HTMLElement[];
				}

				const normalize = (str: any) => {
					if (str === null || str === undefined) return "";
					let res = String(str);
					if (normalizeWhitespace) {
						res = res.replace(/\s+/g, " ");
					}
					return res.trim();
				};

				let regexObj: RegExp | null = null;
				if (regex) {
					try {
						regexObj = new RegExp(regex, regexFlags || (ignoreCase ? "i" : ""));
					} catch {}
				}

				const targetNorm = normalize(targetText);
				const targetCased = ignoreCase ? targetNorm.toLowerCase() : targetNorm;
				const startsWithNorm = startsWith ? normalize(startsWith) : null;
				const startsWithCased =
					startsWithNorm && ignoreCase
						? startsWithNorm.toLowerCase()
						: startsWithNorm;
				const endsWithNorm = endsWith ? normalize(endsWith) : null;
				const endsWithCased =
					endsWithNorm && ignoreCase
						? endsWithNorm.toLowerCase()
						: endsWithNorm;

				let targetEl: HTMLElement | null = null;

				if (hasTextCheck) {
					const matched: {
						el: HTMLElement;
						depth: number;
						textLen: number;
						isDirect: boolean;
					}[] = [];

					for (const el of candidates) {
						if (el.closest && el.closest("#__cdp_recorder_hud__")) continue;
						const inner = normalize(el.innerText);
						const content = normalize(el.textContent);
						const val =
							"value" in el && typeof (el as any).value === "string"
								? normalize((el as any).value)
								: "";
						const aria = normalize(el.getAttribute("aria-label"));
						const placeholder = normalize(el.getAttribute("placeholder"));
						const title = normalize(el.getAttribute("title"));
						const alt = normalize(el.getAttribute("alt"));

						const values = [
							inner,
							content,
							val,
							aria,
							placeholder,
							title,
							alt,
						].filter(Boolean);
						let isMatch = false;
						let isDirectMatch = false;

						for (const rawV of values) {
							const v = ignoreCase ? rawV.toLowerCase() : rawV;
							if (regexObj) {
								if (regexObj.test(rawV)) {
									isMatch = true;
									isDirectMatch = true;
									break;
								}
							} else if (startsWithCased !== null) {
								if (v.startsWith(startsWithCased)) {
									isMatch = true;
									if (v === startsWithCased) isDirectMatch = true;
									break;
								}
							} else if (endsWithCased !== null) {
								if (v.endsWith(endsWithCased)) {
									isMatch = true;
									if (v === endsWithCased) isDirectMatch = true;
									break;
								}
							} else if (targetNorm !== "") {
								if (isStrict) {
									if (v === targetCased) {
										isMatch = true;
										isDirectMatch = true;
										break;
									}
								} else {
									if (v.includes(targetCased)) {
										isMatch = true;
										if (v === targetCased) isDirectMatch = true;
										break;
									}
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
			matchOpts,
		);

		if (!success) {
			throw new Error(
				`Could not click element: ${selector ? `"${selector}"` : ""}${options.text || options.strictText ? ` with text "${options.strictText || options.text}"` : ""}${options.regex ? ` matching /${options.regex}/` : ""}`,
			);
		}
	}

	async clickByText(
		text: string,
		options: SelectorOptions = {},
	): Promise<void> {
		return this.click(options.selector, {
			...options,
			text,
			strictText: options.strictText ?? true,
		});
	}

	async type(
		selector?: string,
		text = "",
		options: TypeOptions = {},
	): Promise<void> {
		await this.init();
		const matchOpts = this.serializeMatchOptions({
			...options,
			text: options.targetText || options.text,
		});

		await this.waitForSelector(selector, {
			...options,
			text: options.targetText || options.text,
		});

		const success = await this.evaluate(
			(sel, val, clear, opts) => {
				const s = sel?.trim() || "";
				let targetText = opts.text;
				let isStrict = false;
				const ignoreCase = Boolean(opts.ignoreCase);
				const regex = opts.regex;
				const regexFlags = opts.regexFlags || "";
				const startsWith = opts.startsWith;
				const endsWith = opts.endsWith;
				const normalizeWhitespace = opts.normalizeWhitespace !== false;

				if (typeof opts.strictText === "string") {
					targetText = opts.strictText;
					isStrict = true;
				} else if (opts.strictText === true) {
					isStrict = true;
				}

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

				const normalize = (str: any) => {
					if (str === null || str === undefined) return "";
					let res = String(str);
					if (normalizeWhitespace) {
						res = res.replace(/\s+/g, " ");
					}
					return res.trim();
				};

				let targetInput: HTMLElement | null = null;
				const hasTextCheck =
					Boolean(targetText !== undefined && targetText !== "") ||
					Boolean(regex) ||
					Boolean(startsWith) ||
					Boolean(endsWith);

				let regexObj: RegExp | null = null;
				if (regex) {
					try {
						regexObj = new RegExp(regex, regexFlags || (ignoreCase ? "i" : ""));
					} catch {}
				}

				const targetNorm = normalize(targetText);
				const targetCased = ignoreCase ? targetNorm.toLowerCase() : targetNorm;
				const startsWithNorm = startsWith ? normalize(startsWith) : null;
				const startsWithCased =
					startsWithNorm && ignoreCase
						? startsWithNorm.toLowerCase()
						: startsWithNorm;
				const endsWithNorm = endsWith ? normalize(endsWith) : null;
				const endsWithCased =
					endsWithNorm && ignoreCase
						? endsWithNorm.toLowerCase()
						: endsWithNorm;

				if (hasTextCheck) {
					for (const el of candidates) {
						const placeholder = normalize(el.getAttribute("placeholder"));
						const aria = normalize(el.getAttribute("aria-label"));
						const name = normalize(el.getAttribute("name"));
						const id = normalize(el.id);
						const label = normalize(el.getAttribute("title"));

						const values = [placeholder, aria, name, id, label].filter(Boolean);
						let isMatch = false;

						for (const rawV of values) {
							const v = ignoreCase ? rawV.toLowerCase() : rawV;
							if (regexObj) {
								if (regexObj.test(rawV)) {
									isMatch = true;
									break;
								}
							} else if (startsWithCased !== null) {
								if (v.startsWith(startsWithCased)) {
									isMatch = true;
									break;
								}
							} else if (endsWithCased !== null) {
								if (v.endsWith(endsWithCased)) {
									isMatch = true;
									break;
								}
							} else if (targetNorm !== "") {
								if (isStrict) {
									if (v === targetCased) {
										isMatch = true;
										break;
									}
								} else {
									if (v.includes(targetCased)) {
										isMatch = true;
										break;
									}
								}
							}
						}

						if (isMatch) {
							targetInput = el;
							break;
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
			matchOpts,
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
		options: TextMatchOptions = {},
	): Promise<string[]> {
		await this.init();
		const matchOpts = this.serializeMatchOptions(options);

		return this.evaluate(
			(sel, opts) => {
				const normalizeWhitespace = opts.normalizeWhitespace !== false;
				const normalize = (str: any) => {
					if (str === null || str === undefined) return "";
					let res = String(str);
					if (normalizeWhitespace) {
						res = res.replace(/\s+/g, " ");
					}
					return res.trim();
				};

				const elements = Array.from(document.querySelectorAll(sel));
				const ignoreCase = Boolean(opts.ignoreCase);
				const isStrict = opts.strictText !== false;
				const targetNorm = normalize(opts.text || opts.strictText);
				const targetCased = ignoreCase ? targetNorm.toLowerCase() : targetNorm;

				let regexObj: RegExp | null = null;
				if (opts.regex) {
					try {
						regexObj = new RegExp(
							opts.regex,
							opts.regexFlags || (ignoreCase ? "i" : ""),
						);
					} catch {}
				}

				return elements
					.filter((el) => {
						if (!targetNorm && !regexObj && !opts.startsWith && !opts.endsWith)
							return true;
						const rawTxt = normalize(el.textContent || el.innerText || "");
						const txt = ignoreCase ? rawTxt.toLowerCase() : rawTxt;

						if (regexObj) return regexObj.test(rawTxt);
						if (opts.startsWith) {
							const sw = ignoreCase
								? normalize(opts.startsWith).toLowerCase()
								: normalize(opts.startsWith);
							return txt.startsWith(sw);
						}
						if (opts.endsWith) {
							const ew = ignoreCase
								? normalize(opts.endsWith).toLowerCase()
								: normalize(opts.endsWith);
							return txt.endsWith(ew);
						}
						return isStrict ? txt === targetCased : txt.includes(targetCased);
					})
					.map((el) => normalize(el.textContent || el.innerText || ""));
			},
			selector,
			matchOpts,
		);
	}

	async getText(
		selector?: string,
		options: TextMatchOptions = {},
	): Promise<string | null> {
		await this.init();
		const matchOpts = this.serializeMatchOptions(options);

		return this.evaluate(
			(sel, opts) => {
				let s = sel?.trim() || "";
				let targetText = opts.text;
				let isStrict = false;
				const ignoreCase = Boolean(opts.ignoreCase);
				const regex = opts.regex;
				const regexFlags = opts.regexFlags || "";
				const startsWith = opts.startsWith;
				const endsWith = opts.endsWith;
				const normalizeWhitespace = opts.normalizeWhitespace !== false;

				if (typeof opts.strictText === "string") {
					targetText = opts.strictText;
					isStrict = true;
				} else if (opts.strictText === true) {
					isStrict = true;
				}

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

				const hasTextCheck =
					Boolean(targetText !== undefined && targetText !== "") ||
					Boolean(regex) ||
					Boolean(startsWith) ||
					Boolean(endsWith);

				if (candidates.length === 0 && hasTextCheck) {
					candidates = Array.from(
						document.querySelectorAll(
							"button, a, input, label, h1, h2, h3, h4, h5, h6, p, span, div, li, td, th, *",
						),
					) as HTMLElement[];
				}

				const normalize = (str: any) => {
					if (str === null || str === undefined) return "";
					let res = String(str);
					if (normalizeWhitespace) {
						res = res.replace(/\s+/g, " ");
					}
					return res.trim();
				};

				let regexObj: RegExp | null = null;
				if (regex) {
					try {
						regexObj = new RegExp(regex, regexFlags || (ignoreCase ? "i" : ""));
					} catch {}
				}

				const targetNorm = normalize(targetText);
				const targetCased = ignoreCase ? targetNorm.toLowerCase() : targetNorm;
				const startsWithNorm = startsWith ? normalize(startsWith) : null;
				const startsWithCased =
					startsWithNorm && ignoreCase
						? startsWithNorm.toLowerCase()
						: startsWithNorm;
				const endsWithNorm = endsWith ? normalize(endsWith) : null;
				const endsWithCased =
					endsWithNorm && ignoreCase
						? endsWithNorm.toLowerCase()
						: endsWithNorm;

				if (hasTextCheck) {
					for (const el of candidates) {
						if (el.closest && el.closest("#__cdp_recorder_hud__")) continue;
						const rawInner = normalize(el.innerText);
						const rawContent = normalize(el.textContent);
						const rawVal =
							"value" in el && typeof (el as any).value === "string"
								? normalize((el as any).value)
								: "";
						const rawAria = normalize(el.getAttribute("aria-label"));

						const values = [rawInner, rawContent, rawVal, rawAria].filter(
							Boolean,
						);
						for (const rawV of values) {
							const v = ignoreCase ? rawV.toLowerCase() : rawV;
							if (regexObj) {
								if (regexObj.test(rawV)) return rawInner || rawContent || rawV;
							} else if (startsWithCased !== null) {
								if (v.startsWith(startsWithCased))
									return rawInner || rawContent || rawV;
							} else if (endsWithCased !== null) {
								if (v.endsWith(endsWithCased))
									return rawInner || rawContent || rawV;
							} else if (targetNorm !== "") {
								if (isStrict) {
									if (v === targetCased) return rawInner || rawContent || rawV;
								} else {
									if (v.includes(targetCased))
										return rawInner || rawContent || rawV;
								}
							}
						}
					}
				} else if (candidates.length > 0) {
					const el = candidates[0]!;
					return normalize(el.innerText || el.textContent || "");
				}

				return null;
			},
			selector,
			matchOpts,
		);
	}

	async getAttribute(
		selector: string | undefined,
		attributeName: string,
		options: TextMatchOptions = {},
	): Promise<string | null> {
		await this.init();
		const matchOpts = this.serializeMatchOptions(options);

		return this.evaluate(
			(sel, attr, opts) => {
				const s = sel?.trim() || "";
				let targetText = opts.text;
				let isStrict = false;
				const ignoreCase = Boolean(opts.ignoreCase);
				const regex = opts.regex;
				const regexFlags = opts.regexFlags || "";
				const startsWith = opts.startsWith;
				const endsWith = opts.endsWith;
				const normalizeWhitespace = opts.normalizeWhitespace !== false;

				if (typeof opts.strictText === "string") {
					targetText = opts.strictText;
					isStrict = true;
				} else if (opts.strictText === true) {
					isStrict = true;
				}

				let candidates: HTMLElement[] = [];
				if (s) {
					try {
						candidates = Array.from(
							document.querySelectorAll(s),
						) as HTMLElement[];
					} catch {}
				}

				const hasTextCheck =
					Boolean(targetText !== undefined && targetText !== "") ||
					Boolean(regex) ||
					Boolean(startsWith) ||
					Boolean(endsWith);

				if (candidates.length === 0 && hasTextCheck) {
					candidates = Array.from(
						document.querySelectorAll(
							"button, a, input, img, label, h1, h2, h3, h4, h5, h6, p, span, div, *",
						),
					) as HTMLElement[];
				}

				const normalize = (str: any) => {
					if (str === null || str === undefined) return "";
					let res = String(str);
					if (normalizeWhitespace) {
						res = res.replace(/\s+/g, " ");
					}
					return res.trim();
				};

				let regexObj: RegExp | null = null;
				if (regex) {
					try {
						regexObj = new RegExp(regex, regexFlags || (ignoreCase ? "i" : ""));
					} catch {}
				}

				const targetNorm = normalize(targetText);
				const targetCased = ignoreCase ? targetNorm.toLowerCase() : targetNorm;
				const startsWithNorm = startsWith ? normalize(startsWith) : null;
				const startsWithCased =
					startsWithNorm && ignoreCase
						? startsWithNorm.toLowerCase()
						: startsWithNorm;
				const endsWithNorm = endsWith ? normalize(endsWith) : null;
				const endsWithCased =
					endsWithNorm && ignoreCase
						? endsWithNorm.toLowerCase()
						: endsWithNorm;

				if (hasTextCheck) {
					for (const el of candidates) {
						if (el.closest && el.closest("#__cdp_recorder_hud__")) continue;
						const rawInner = normalize(el.innerText);
						const rawContent = normalize(el.textContent);
						const rawVal =
							"value" in el && typeof (el as any).value === "string"
								? normalize((el as any).value)
								: "";
						const rawAria = normalize(el.getAttribute("aria-label"));

						const values = [rawInner, rawContent, rawVal, rawAria].filter(
							Boolean,
						);
						for (const rawV of values) {
							const v = ignoreCase ? rawV.toLowerCase() : rawV;
							if (regexObj) {
								if (regexObj.test(rawV)) return el.getAttribute(attr);
							} else if (startsWithCased !== null) {
								if (v.startsWith(startsWithCased)) return el.getAttribute(attr);
							} else if (endsWithCased !== null) {
								if (v.endsWith(endsWithCased)) return el.getAttribute(attr);
							} else if (targetNorm !== "") {
								if (isStrict) {
									if (v === targetCased) return el.getAttribute(attr);
								} else {
									if (v.includes(targetCased)) return el.getAttribute(attr);
								}
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
			matchOpts,
		);
	}

	async assertText(
		selector: string | undefined,
		options: AssertOptions = {},
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
		const expectedStartsWith = options.startsWith;
		const expectedEndsWith = options.endsWith;
		const expectedMatches = options.matches || options.regex;
		const ignoreCase = Boolean(options.ignoreCase);
		const normalizeWhitespace = options.normalizeWhitespace !== false;

		const normalize = (str: string | null) => {
			if (str === null || str === undefined) return null;
			let s = String(str);
			if (normalizeWhitespace) {
				s = s.replace(/\s+/g, " ");
			}
			return s.trim();
		};

		let regexObj: RegExp | null = null;
		if (expectedMatches) {
			if (expectedMatches instanceof RegExp) {
				regexObj = expectedMatches;
			} else {
				regexObj = new RegExp(expectedMatches, ignoreCase ? "i" : "");
			}
		}

		while (Date.now() - startTime < timeout) {
			const rawActual =
				options.attribute &&
				options.attribute !== "text" &&
				options.attribute !== "innerText"
					? await this.getAttribute(selector, options.attribute, options)
					: await this.getText(selector, options);

			const actual = normalize(rawActual);
			lastActual = actual;

			if (actual !== null) {
				let pass = true;
				const compActual = ignoreCase ? actual.toLowerCase() : actual;

				if (expectedEquals !== undefined) {
					const exp = ignoreCase
						? normalize(expectedEquals)!.toLowerCase()
						: normalize(expectedEquals)!;
					if (compActual !== exp) pass = false;
				}

				if (expectedContains !== undefined) {
					const exp = ignoreCase
						? normalize(expectedContains)!.toLowerCase()
						: normalize(expectedContains)!;
					if (!compActual.includes(exp)) pass = false;
				}

				if (expectedStartsWith !== undefined) {
					const exp = ignoreCase
						? normalize(expectedStartsWith)!.toLowerCase()
						: normalize(expectedStartsWith)!;
					if (!compActual.startsWith(exp)) pass = false;
				}

				if (expectedEndsWith !== undefined) {
					const exp = ignoreCase
						? normalize(expectedEndsWith)!.toLowerCase()
						: normalize(expectedEndsWith)!;
					if (!compActual.endsWith(exp)) pass = false;
				}

				if (regexObj !== null) {
					if (!regexObj.test(actual)) pass = false;
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
		if (expectedEquals !== undefined) {
			throw new Error(
				`Assertion failed: Expected strict text "${expectedEquals}" (ignoreCase=${ignoreCase}), but got "${lastActual}" at "${selector || options.text}"`,
			);
		}
		if (expectedContains !== undefined) {
			throw new Error(
				`Assertion failed: Expected text containing "${expectedContains}" (ignoreCase=${ignoreCase}), but got "${lastActual}" at "${selector || options.text}"`,
			);
		}
		if (expectedStartsWith !== undefined) {
			throw new Error(
				`Assertion failed: Expected text starting with "${expectedStartsWith}" (ignoreCase=${ignoreCase}), but got "${lastActual}" at "${selector || options.text}"`,
			);
		}
		if (expectedEndsWith !== undefined) {
			throw new Error(
				`Assertion failed: Expected text ending with "${expectedEndsWith}" (ignoreCase=${ignoreCase}), but got "${lastActual}" at "${selector || options.text}"`,
			);
		}
		if (regexObj !== null) {
			throw new Error(
				`Assertion failed: Expected text matching ${regexObj.toString()}, but got "${lastActual}" at "${selector || options.text}"`,
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
