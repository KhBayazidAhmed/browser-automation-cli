import type { Page } from "../page.js";
import { INJECTED_FIND_ELEMENT_SRC } from "./injected-element-finder.js";
import { type SelectorOptions, serializeMatchOptions, type TypeOptions } from "./types.js";

async function getContextId(
	page: Page,
	selector?: string,
	options?: SelectorOptions,
	explicitCtx?: number,
): Promise<number | undefined> {
	if (explicitCtx !== undefined) return explicitCtx;
	if (options?.frame) {
		const f = await page.frameManager.resolveFrame(options.frame);
		return f.ensureContextId();
	}
	const targetFrame = await page.frameManager.findFrameWithElement(selector, options);
	return (
		(await targetFrame?.ensureContextId()) ??
		(await page.frameManager.mainFrame().ensureContextId())
	);
}

export async function clickElement(
	page: Page,
	selector?: string,
	options: SelectorOptions = {},
	contextId?: number,
): Promise<void> {
	await page.init();
	const ctxId = await getContextId(page, selector, options, contextId);
	await page.waitForSelectorInContext(ctxId, selector, options);
	const matchOpts = serializeMatchOptions(options);

	const clickResult = await page.evaluateInContext<{
		success: boolean;
		x?: number;
		y?: number;
		hasParentOffset?: boolean;
	}>(
		ctxId,
		`${INJECTED_FIND_ELEMENT_SRC}
			const el = __cdpFindElement(arguments[0], arguments[1]);
			if (el) {
				const interactive = (el.closest && el.closest("button, a, [role='button'], input[type='submit'], input[type='button'], [tabindex], lux-button, mam-button, nav-item, select, label")) || el;
				const shadowTarget = el.shadowRoot ? el.shadowRoot.querySelector("button, a, [role='button'], input") : null;
				const target = shadowTarget || interactive;
				try { target.scrollIntoView({ block: "center", inline: "center" }); } catch {}
				const rect = target.getBoundingClientRect();
				const cx = rect.left + rect.width / 2;
				const cy = rect.top + rect.height / 2;
			let ax = cx, ay = cy, curWin = window, hasParentOffset = false;
			while (curWin !== curWin.top) {
				try {
					if (curWin.frameElement) {
						const fr = curWin.frameElement.getBoundingClientRect();
						ax += fr.left; ay += fr.top;
						hasParentOffset = true;
					}
					curWin = curWin.parent;
				} catch (_) { break; }
			}
				return { success: true, x: Math.round(ax), y: Math.round(ay), hasParentOffset };
		}
		return { success: false };`,
		selector,
		matchOpts,
	);

	if (!clickResult?.success) {
		throw new Error(
			`Could not click element: ${selector ? `"${selector}"` : ""}${options.text || options.strictText ? ` with text "${options.strictText || options.text}"` : ""}${options.regex ? ` matching /${options.regex}/` : ""}`,
		);
	}

	let hardwareClicked = false;
	if (
		clickResult.x !== undefined &&
		clickResult.y !== undefined &&
		clickResult.x >= 0 &&
		clickResult.y >= 0
	) {
		let finalX = clickResult.x;
		let finalY = clickResult.y;
		if (options.frame && !clickResult.hasParentOffset) {
			try {
				const frameOffset = await page.evaluateInContext<{ left: number; top: number } | null>(
					page.frameManager.mainFrame().contextId,
					`(() => {
						const sel = ${JSON.stringify(typeof options.frame === "string" ? options.frame : "")};
						const iframes = Array.from(document.querySelectorAll("iframe, frame"));
						for (const f of iframes) {
							if (f.name === sel || f.id === sel || f.src.includes(sel) || (f.matches && f.matches(sel))) {
								const r = f.getBoundingClientRect();
								return { left: r.left, top: r.top };
							}
						}
						return null;
					})()`,
				);
				if (frameOffset) {
					finalX += Math.round(frameOffset.left);
					finalY += Math.round(frameOffset.top);
				}
			} catch {}
		}
		try {
			await page.client.send("Input.dispatchMouseEvent", {
				type: "mouseMoved",
				x: finalX,
				y: finalY,
			});
			await page.client.send("Input.dispatchMouseEvent", {
				type: "mousePressed",
				x: finalX,
				y: finalY,
				button: "left",
				clickCount: 1,
			});
			await page.client.send("Input.dispatchMouseEvent", {
				type: "mouseReleased",
				x: finalX,
				y: finalY,
				button: "left",
				clickCount: 1,
			});
			hardwareClicked = true;
		} catch {}
	}

	if (!hardwareClicked) {
		const fallbackClicked = await page.evaluateInContext<boolean>(
			ctxId,
			`${INJECTED_FIND_ELEMENT_SRC}
			const el = __cdpFindElement(arguments[0], arguments[1]);
			if (!el) return false;
			const interactive = (el.closest && el.closest("button, a, [role='button'], input[type='submit'], input[type='button'], [tabindex], select, label")) || el;
			const target = (el.shadowRoot && el.shadowRoot.querySelector("button, a, [role='button'], input")) || interactive;
			if (typeof target.click !== "function") return false;
			target.click();
			return true;`,
			selector,
			matchOpts,
		);
		if (!fallbackClicked)
			throw new Error("CDP hardware click failed and no DOM fallback was available");
	}
}

export async function typeIntoElement(
	page: Page,
	selector?: string,
	text = "",
	options: TypeOptions = {},
	contextId?: number,
): Promise<void> {
	await page.init();
	const ctxId = await getContextId(page, selector, options, contextId);
	const matchOpts = serializeMatchOptions({ ...options, text: options.targetText || options.text });
	await page.waitForSelectorInContext(ctxId, selector, {
		...options,
		text: options.targetText || options.text,
	});

	const success = await page.evaluateInContext<boolean>(
		ctxId,
		`${INJECTED_FIND_ELEMENT_SRC}
			const el = __cdpFindElement(arguments[0], arguments[3]);
			if (el) {
				try { el.scrollIntoView({ block: "center", inline: "center" }); } catch {}
				try { el.focus(); } catch {}
				if ("value" in el) {
					const nextValue = arguments[2] ? arguments[1] : (el.value || "") + arguments[1];
					const prototype = el instanceof HTMLTextAreaElement
						? HTMLTextAreaElement.prototype
						: el instanceof HTMLSelectElement
							? HTMLSelectElement.prototype
							: HTMLInputElement.prototype;
					const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
					if (setter) setter.call(el, nextValue);
					else el.value = nextValue;
				} else {
					el.innerText = arguments[1];
				}
				try { el.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, composed: true, inputType: "insertText", data: arguments[1] })); } catch {}
				el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
			el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
			return true;
		}
		return false;`,
		selector,
		text,
		options.clearFirst ?? false,
		matchOpts,
	);

	if (!success) {
		throw new Error(
			`Could not type into element: ${selector ? `"${selector}"` : ""}${options.targetText ? ` (target: "${options.targetText}")` : ""}`,
		);
	}
}

export async function clearElement(
	page: Page,
	selector?: string,
	options: SelectorOptions = {},
	contextId?: number,
): Promise<void> {
	await page.init();
	const ctxId = await getContextId(page, selector, options, contextId);
	await page.waitForSelectorInContext(ctxId, selector, options);
	const matchOpts = serializeMatchOptions(options);

	const success = await page.evaluateInContext<boolean>(
		ctxId,
		`${INJECTED_FIND_ELEMENT_SRC}
		const el = __cdpFindElement(arguments[0], arguments[1]);
			if (el) {
				try { el.focus(); } catch {}
				if ("value" in el) {
					const prototype = el instanceof HTMLTextAreaElement
						? HTMLTextAreaElement.prototype
						: el instanceof HTMLSelectElement
							? HTMLSelectElement.prototype
							: HTMLInputElement.prototype;
					const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
					if (setter) setter.call(el, "");
					else el.value = "";
				el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
				el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
			} else {
				el.innerText = "";
			}
			return true;
		}
		return false;`,
		selector,
		matchOpts,
	);

	if (!success) throw new Error(`Could not clear element: ${selector ? `"${selector}"` : ""}`);
}
