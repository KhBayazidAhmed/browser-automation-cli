export const INJECTED_SELECTOR_ENGINE_SRC = `
  function normalizeRecorderText(value) {
    return String(value || '').replace(/\\s+/g, ' ').trim();
  }

  function getRecorderElementText(el) {
    if (!el) return '';
    return normalizeRecorderText(
      el.innerText ||
      el.textContent ||
      (typeof el.value === 'string' ? el.value : '') ||
      el.getAttribute?.('aria-label') ||
      el.getAttribute?.('title') ||
      ''
    );
  }

  function escapeRecorderAttributeValue(value) {
    return String(value).replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"');
  }

  function quoteRecorderStrictText(text) {
    if (!text || text.includes('\\\\')) return null;
    if (!text.includes('"')) return '"' + text + '"';
    if (!text.includes("'")) return "'" + text + "'";
    return null;
  }

  function getStrictTextSelector(el) {
    const text = getRecorderElementText(el);
    if (!text || text.length > 120) return null;
    const quoted = quoteRecorderStrictText(text);
    if (!quoted) return null;
    const tag = el.tagName?.toLowerCase();
    if (!tag) return null;
    const interactiveSelector = "button, a, [role='button'], input[type='submit'], input[type='button'], [tabindex], label";
    const supportsTextLocator = el.matches?.(interactiveSelector);
    if (!supportsTextLocator) return null;
    let matches = [];
    try {
      matches = Array.from(document.querySelectorAll(tag)).filter((candidate) => candidate.matches?.(interactiveSelector) && getRecorderElementText(candidate) === text);
    } catch {}
    return matches.length === 1 ? tag + ':text-is(' + quoted + ')' : null;
  }

  function getBestSelector(inputEl) {
    if (!inputEl || inputEl === document.body || inputEl === document.documentElement) return "body";
    if (inputEl.closest && inputEl.closest("#__cdp_recorder_hud__")) return null;
    let el = inputEl;
    const initialTag = el.tagName?.toLowerCase();
    if (initialTag === "iframe" || initialTag === "frame") return null;
    const clickableParent = el.closest ? el.closest("button, a, [role='button'], input[type='submit'], input[type='button'], [tabindex]") : null;
    if (clickableParent && clickableParent !== el && !isExtractMode && !isListExtractMode && !isAssertMode) el = clickableParent;
    const tag = el.tagName.toLowerCase();
    if (el.id) return '#' + CSS.escape(el.id);
    if (el.name) return tag + '[name="' + escapeRecorderAttributeValue(el.name) + '"]';
    for (const attr of ['data-testid', 'data-action', 'data-qa']) {
      const value = el.getAttribute(attr);
      if (value) return '[' + attr + '="' + escapeRecorderAttributeValue(value) + '"]';
    }
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return '[aria-label="' + escapeRecorderAttributeValue(ariaLabel) + '"]';
    const placeholder = el.getAttribute('placeholder');
    if (placeholder) return '[placeholder="' + escapeRecorderAttributeValue(placeholder) + '"]';
    const strictTextSelector = getStrictTextSelector(el);
    if (strictTextSelector) return strictTextSelector;
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\\s+/).filter(c => c && !c.includes(':') && !c.includes('/') && !['active', 'hover', 'focus', 'selected', 'disabled', 'open'].includes(c));
      if (classes.length > 0) return tag + '.' + CSS.escape(classes[0]);
    }
    const path = []; let current = el, depth = 0;
    while (current && current !== document.body && current !== document.documentElement && depth < 5) {
      depth++;
      if (current.id) { path.unshift('#' + CSS.escape(current.id)); break; }
      let sibling = current, nth = 1;
      while (sibling.previousElementSibling) { sibling = sibling.previousElementSibling; if (sibling.tagName === current.tagName) nth++; }
      path.unshift(current.tagName.toLowerCase() + (nth > 1 ? ':nth-of-type(' + nth + ')' : ''));
      current = current.parentElement;
    }
    return path.join(' > ') || tag;
  }
`;
