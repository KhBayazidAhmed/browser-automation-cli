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

export function serializeMatchOptions(
	options: AssertOptions | TextMatchOptions | SelectorOptions | TypeOptions = {},
): Record<string, unknown> {
	const rawRegex = options.regex || (options as AssertOptions).matches;
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
		equals: (options as AssertOptions).equals,
		contains: (options as AssertOptions).contains,
		matches:
			rawRegex instanceof RegExp
				? rawRegex.source
				: typeof rawRegex === "string"
					? rawRegex
					: undefined,
		attribute: (options as AssertOptions).attribute,
	};
}
