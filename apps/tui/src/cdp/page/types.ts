export interface TextMatchOptions {
	text?: string;
	strictText?: boolean | string;
	ignoreCase?: boolean;
	regex?: string | RegExp;
	startsWith?: string;
	endsWith?: string;
	normalizeWhitespace?: boolean;
	frame?: string;
}

export interface SelectorOptions extends TextMatchOptions {
	timeout?: number;
	selector?: string;
	frame?: string;
}

export interface TypeOptions extends TextMatchOptions {
	clearFirst?: boolean;
	timeout?: number;
	targetText?: string;
	frame?: string;
}

export interface AssertOptions extends TextMatchOptions {
	equals?: string;
	contains?: string;
	startsWith?: string;
	endsWith?: string;
	matches?: string | RegExp;
	attribute?: string;
	timeout?: number;
	frame?: string;
}

export interface GotoOptions {
	waitUntil?: "load" | "domcontentloaded" | "networkidle";
	timeout?: number;
}

export interface ScreenshotOptions {
	path?: string;
	fullPage?: boolean;
	format?: "png" | "jpeg" | "webp";
	quality?: number;
	clip?: {
		x: number;
		y: number;
		width: number;
		height: number;
		scale?: number;
	};
}

export interface PDFOptions {
	path?: string;
	paperWidth?: number;
	paperHeight?: number;
	marginTop?: number;
	marginBottom?: number;
	marginLeft?: number;
	marginRight?: number;
	pageRanges?: string;
	landscape?: boolean;
	printBackground?: boolean;
	scale?: number;
	displayHeaderFooter?: boolean;
	headerTemplate?: string;
	footerTemplate?: string;
}

export interface ViewportOptions {
	width: number;
	height: number;
	deviceScaleFactor?: number;
	isMobile?: boolean;
	hasTouch?: boolean;
	isLandscape?: boolean;
}

export function serializeMatchOptions(options: TextMatchOptions): Record<string, unknown> {
	const opts = options as Record<string, unknown>;
	return {
		text: options.text,
		strictText: options.strictText,
		ignoreCase: options.ignoreCase,
		regex: options.regex instanceof RegExp ? options.regex.source : options.regex,
		regexFlags: options.regex instanceof RegExp ? options.regex.flags : undefined,
		startsWith: options.startsWith,
		endsWith: options.endsWith,
		matches: opts.matches instanceof RegExp ? opts.matches.source : opts.matches,
		matchesFlags: opts.matches instanceof RegExp ? opts.matches.flags : undefined,
		normalizeWhitespace: options.normalizeWhitespace,
		attribute: opts.attribute,
		equals: opts.equals,
		contains: opts.contains,
		frame: options.frame,
	};
}
