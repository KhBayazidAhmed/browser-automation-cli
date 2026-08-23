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
			try { el.scrollIntoView({ block: "center", inline: "center" }); } catch {}
			const rect = el.getBoundingClientRect();
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

			const baseEvt = { bubbles: true, cancelable: true, composed: true, view: window, clientX: cx, clientY: cy, screenX: cx, screenY: cy, detail: 1 };
			const downEvt = { ...baseEvt, button: 0, buttons: 1 };
			const upEvt = { ...baseEvt, button: 0, buttons: 0 };

			const interactive = (el.closest && el.closest("button, a, [role='button'], input[type='submit'], input[type='button'], [tabindex], lux-button, mam-button, nav-item, select, label")) || el;
			const shadowBtn = el.shadowRoot ? el.shadowRoot.querySelector("button, a, [role='button'], input") : null;
			const targets = [el];
			if (interactive && interactive !== el) targets.push(interactive);
			if (shadowBtn && !targets.includes(shadowBtn)) targets.push(shadowBtn);

			for (const t of targets) {
				try { if (typeof t.focus === "function") t.focus(); } catch {}
				try { t.dispatchEvent(new PointerEvent("pointerover", upEvt)); } catch {}
				try { t.dispatchEvent(new MouseEvent("mouseover", upEvt)); } catch {}
				try { t.dispatchEvent(new PointerEvent("pointerenter", upEvt)); } catch {}
				try { t.dispatchEvent(new MouseEvent("mouseenter", upEvt)); } catch {}
				try { t.dispatchEvent(new PointerEvent("pointerdown", downEvt)); } catch {}
				try { t.dispatchEvent(new MouseEvent("mousedown", downEvt)); } catch {}
				try { t.dispatchEvent(new PointerEvent("pointerup", upEvt)); } catch {}
				try { t.dispatchEvent(new MouseEvent("mouseup", upEvt)); } catch {}
				try { t.dispatchEvent(new MouseEvent("click", upEvt)); } catch {}
				try { if (typeof t.click === "function") t.click(); } catch {}
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
		} catch {}
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
			if (arguments[2] && "value" in el) {
				el.value = "";
				el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
				el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
			}
			if ("value" in el) {
				el.value = arguments[2] ? arguments[1] : (el.value || "") + arguments[1];
			} else {
				el.innerText = arguments[1];
			}
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
				el.value = "";
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
