export const INJECTED_DOM_EVENTS_SRC = `
  function getSensitiveInputReference(el) {
    if (!el) return null;
    const hint = [el.id, el.name, el.getAttribute?.('aria-label'), el.getAttribute?.('autocomplete')]
      .filter(Boolean).join(' ');
    const isSensitive = String(el.type || '').toLowerCase() === 'password' || /(password|passwd|secret|token|api.?key|credential|otp|one.?time)/i.test(hint);
    if (!isSensitive) return null;
    const keyBase = (el.id || el.name || el.getAttribute?.('aria-label') || 'RECORDED_SECRET')
      .toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return '{{env.' + (keyBase || 'RECORDED_SECRET') + '}}';
  }

  function findRepeatedContainer(el) {
    let current = el, depth = 0;
    while (current && current !== document.body && depth < 4) {
      depth++;
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\\s+/).filter(c => c && !c.includes(':'));
        if (classes.length > 0) return { selector: current.tagName.toLowerCase() + '.' + classes[0], count: current.parentElement ? current.parentElement.children.length : 1 };
      }
      if (current.tagName.toLowerCase() === 'tr') return { selector: current.className ? 'tr.' + current.className.split(' ')[0] : 'tr', count: current.parentElement ? current.parentElement.children.length : 1 };
      current = current.parentElement;
    }
    return { selector: el.tagName.toLowerCase(), count: 1 };
  }

  let tooltipRafId = null;
  document.addEventListener("mouseover", (e) => {
    if (!isWaitTargetMode && (flowState.isPaused || (!isExtractMode && !isListExtractMode && !isAssertMode && !e.shiftKey && !e.altKey))) return;
    const target = e.target;
    if (!target || target.closest("#__cdp_recorder_hud__")) return;
    if (target.tagName && (target.tagName.toLowerCase() === "iframe" || target.tagName.toLowerCase() === "frame")) return;
    if (hoveredEl && hoveredEl !== target) hoveredEl.style.outline = "";
    hoveredEl = target;
    if (isWaitTargetMode) {
      const selector = getBestSelector(target);
      hoveredEl.style.outline = "2px solid #60a5fa";
      if (tooltip) { tooltip.style.display = "block"; tooltip.style.transform = \`translate3d(\${e.clientX + 12}px, \${e.clientY + 12}px, 0)\`; tooltip.innerText = \`Target: \${selector}\`; }
    } else if (isListExtractMode) {
      const containerInfo = findRepeatedContainer(target);
      hoveredEl.style.outline = "2px dashed #38bdf8";
      if (tooltip) { tooltip.style.display = "block"; tooltip.style.transform = \`translate3d(\${e.clientX + 12}px, \${e.clientY + 12}px, 0)\`; tooltip.innerText = \`📊 List: \${containerInfo.selector}\`; }
    } else if (isAssertMode || e.altKey) {
      hoveredEl.style.outline = "2px dashed #f59e0b";
      if (tooltip) { tooltip.style.display = "block"; tooltip.style.transform = \`translate3d(\${e.clientX + 12}px, \${e.clientY + 12}px, 0)\`; const text = target.innerText?.trim() || target.textContent?.trim() || ""; tooltip.innerText = \`🔎 Assert: "\${text.slice(0, 25)}"\`; }
    } else {
      hoveredEl.style.outline = "2px dashed #10b981";
      if (tooltip) { tooltip.style.display = "block"; tooltip.style.transform = \`translate3d(\${e.clientX + 12}px, \${e.clientY + 12}px, 0)\`; const sel = getBestSelector(target); tooltip.innerText = \`🔍 Extract: \${sel}\`; }
    }
    hoveredEl.style.cursor = "crosshair";
  }, true);

  document.addEventListener("mousemove", (e) => {
    if (tooltip && tooltip.style.display === "block" && !tooltipRafId) {
      tooltipRafId = requestAnimationFrame(() => {
        tooltip.style.transform = \`translate3d(\${e.clientX + 12}px, \${e.clientY + 12}px, 0)\`;
        tooltipRafId = null;
      });
    }
  }, true);

  document.addEventListener("mouseout", () => {
    if (hoveredEl) { hoveredEl.style.outline = ""; hoveredEl.style.cursor = ""; hoveredEl = null; }
    if (tooltip) tooltip.style.display = "none";
  }, true);

  const recordPointerActivation = (e) => {
    if (flowState.isPaused || isWaitTargetMode || isExtractMode || isListExtractMode || isAssertMode || e.shiftKey || e.altKey) return;
    recordPointerStep(e, e.target);
  };
  document.addEventListener('pointerdown', recordPointerActivation, true);
  document.addEventListener('mousedown', recordPointerActivation, true);

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target || target.closest("#__cdp_recorder_hud__")) return;
    if (target.tagName && (target.tagName.toLowerCase() === "iframe" || target.tagName.toLowerCase() === "frame")) return;
    if (isWaitTargetMode) {
      const targetSelector = getBestSelector(target);
      if (!targetSelector) return;
      e.preventDefault(); e.stopPropagation();
      submitWaitTargetSelection(targetSelector);
      return;
    }
    if (flowState.isPaused) { e.preventDefault(); showToast("⏸️ Action ignored (recording is paused)", true); return; }
    const isExtract = isExtractMode || e.shiftKey;
    const isList = isListExtractMode;
    const isAssert = isAssertMode || e.altKey;
    const selector = getBestSelector(target);
    if (!selector) return;

    if (isList) {
      e.preventDefault(); e.stopPropagation();
      const containerInfo = findRepeatedContainer(target);
      openVariableModal("📊 Extract List", \`Container: \${containerInfo.selector}\`, "extractedList", (varName) => {
        const step = { name: \`Extract List "\${varName}" from \${containerInfo.selector}\`, action: 'extractMultiple', containerSelector: containerInfo.selector, as: varName, limit: 20, fields: { title: "a, h1, h2, h3, .title, p", link: "a@href" } };
        flowState.steps.push(step); persistState(); renderDrawer();
        emitRecordEvent({ type: 'extractMultiple', containerSelector: containerInfo.selector, as: varName, limit: 20, fields: { title: "a, h1, h2, h3, .title, p", link: "a@href" } });
        showToast(\`✓ Extract List: Saved to "\${varName}"\`);
      });
      if (hoveredEl) hoveredEl.style.outline = ""; isListExtractMode = false; btnList?.classList.remove("active"); if (tooltip) tooltip.style.display = "none";
      return;
    }

    if (isExtract) {
      e.preventDefault(); e.stopPropagation(); extractCount++;
      const text = target.innerText?.trim() || target.textContent?.trim() || "";
      const defaultVar = "extracted_" + extractCount;
      openVariableModal("🔍 Save Extracted Variable", text.slice(0, 80), defaultVar, (varName) => {
        const step = { name: \`Extract "\${varName}" from \${selector}\`, action: 'extract', selector, as: varName };
        flowState.steps.push(step); persistState(); renderDrawer();
        emitRecordEvent({ type: 'extract', selector, as: varName, sampleValue: text.slice(0, 40), url: window.location.href });
        showToast(\`✓ Extracted "\${varName}": "\${text.slice(0, 20)}..."\`);
      });
      if (hoveredEl) hoveredEl.style.outline = ""; isExtractMode = false; btnExtract?.classList.remove("active"); if (tooltip) tooltip.style.display = "none";
      return;
    }

    if (isAssert) {
      e.preventDefault(); e.stopPropagation();
      const text = target.innerText?.trim() || target.textContent?.trim() || ('value' in target ? String(target.value).trim() : "") || "";
      if (isAssertMode) {
        openAssertModal(selector, text, (assertType, expectedVal) => {
          const step = { name: \`Assert \${selector} \${assertType === 'contains' ? 'contains' : 'equals'} "\${expectedVal.slice(0, 30)}"\`, action: 'assert', selector, text: expectedVal, strictText: assertType === 'strict', equals: assertType === 'strict' ? expectedVal : undefined, contains: assertType === 'contains' ? expectedVal : undefined, matches: assertType === 'regex' ? expectedVal : undefined, startsWith: assertType === 'startsWith' ? expectedVal : undefined, endsWith: assertType === 'endsWith' ? expectedVal : undefined };
          flowState.steps.push(step); persistState(); renderDrawer();
          emitRecordEvent({ type: 'assert', selector, text: expectedVal, equals: assertType === 'strict' ? expectedVal : undefined, contains: assertType === 'contains' ? expectedVal : undefined, matches: assertType === 'regex' ? expectedVal : undefined, startsWith: assertType === 'startsWith' ? expectedVal : undefined, endsWith: assertType === 'endsWith' ? expectedVal : undefined, strictText: assertType === 'strict', url: window.location.href });
          showToast(\`✓ Assert added: "\${expectedVal.slice(0, 20)}..."\`);
        });
        isAssertMode = false; btnAssert?.classList.remove("active-assert"); if (hoveredEl) hoveredEl.style.outline = ""; if (tooltip) tooltip.style.display = "none";
        return;
      }
      const step = { name: \`Assert \${selector} strictly equals "\${text.slice(0, 40)}"\`, action: 'assert', selector, text: text.slice(0, 100), equals: text.slice(0, 100), strictText: true };
      flowState.steps.push(step); persistState(); renderDrawer();
      emitRecordEvent({ type: 'assert', selector, text: text.slice(0, 100), equals: text.slice(0, 100), strictText: true, url: window.location.href });
      showToast(\`✓ Strict Assert added: equals "\${text.slice(0, 20)}..."\`);
      return;
    }

    recordPointerStep(e, target);
    flushPendingPointerStep();
  }, true);

  window.addEventListener('pagehide', () => flushPendingPointerStep(), true);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isWaitTargetMode) {
      e.preventDefault();
      requestWaitTargetCancel();
    }
  }, true);

  document.addEventListener('change', (e) => {
    const target = e.target;
    if (!target || !('value' in target) || target.closest("#__cdp_recorder_hud__")) return;
    if (flowState.isPaused) return;
    const selector = getBestSelector(target);
    if (!selector) return;
    const targetText = target.placeholder || target.getAttribute('aria-label') || target.name || target.id || '';
    const secretRef = getSensitiveInputReference(target);
    const recordedValue = secretRef || target.value;
    const step = { name: \`Type into \${selector}\`, action: 'type', selector, text: recordedValue, targetText: targetText || undefined, strictText: true };
    flowState.steps.push(step); persistState(); renderDrawer();
    emitRecordEvent({ type: 'type', selector, value: recordedValue, targetText, strictText: true, sensitive: Boolean(secretRef), url: window.location.href });
    showToast(secretRef ? \`✓ Sensitive input saved as \${secretRef}\` : \`✓ Input: "\${target.value}"\`);
  }, true);
`;
