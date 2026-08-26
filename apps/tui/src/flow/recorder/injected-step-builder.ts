export const INJECTED_STEP_BUILDER_SRC = `
  let stepBuilderCallback = null;
  let currentBuilderInfo = null;

  function updateBuilderFormVisibility(action) {
    const fieldType = shadow.getElementById("builder-field-type");
    const fieldAssert = shadow.getElementById("builder-field-assert");
    const fieldExtract = shadow.getElementById("builder-field-extract");
    const fieldTimeout = shadow.getElementById("builder-field-timeout");

    if (fieldType) fieldType.style.display = action === "type" ? "block" : "none";
    if (fieldAssert) fieldAssert.style.display = action === "assert" ? "block" : "none";
    if (fieldExtract) fieldExtract.style.display = action === "extract" ? "block" : "none";
    if (fieldTimeout) fieldTimeout.style.display = ["waitForSelector", "click"].includes(action) ? "block" : "none";
  }

  function openStepBuilderModal(info, onConfirm) {
    currentBuilderInfo = info || {};
    const modal = shadow.getElementById("modal-step-builder-overlay");
    const tagBadge = shadow.getElementById("builder-tag-badge");
    const frameBadge = shadow.getElementById("builder-frame-badge");
    const frameRow = shadow.getElementById("builder-frame-row");
    const frameInput = shadow.getElementById("builder-frame-selector");
    const previewEl = shadow.getElementById("builder-element-preview");
    const strategySelect = shadow.getElementById("builder-strategy-select");
    const targetInput = shadow.getElementById("builder-target-selector");
    const actionSelect = shadow.getElementById("builder-action-type");

    const tag = (info.tagName || info.tag || "element").toLowerCase();
    if (tagBadge) tagBadge.innerText = "<" + tag + ">";

    const frameId = info.frame || info.frameIdentifier || (info.frameContext && info.frameContext.frameIdentifier);
    if (frameId) {
      if (frameBadge) { frameBadge.style.display = "inline-flex"; frameBadge.innerText = "iFrame: " + frameId; }
      if (frameRow) frameRow.style.display = "block";
      if (frameInput) frameInput.value = frameId;
    } else {
      if (frameBadge) frameBadge.style.display = "none";
      if (frameRow) frameRow.style.display = "none";
      if (frameInput) frameInput.value = "";
    }

    if (previewEl) {
      const txt = info.text || "";
      previewEl.innerText = (txt ? ('Text: "' + txt.slice(0, 70) + '"' + String.fromCharCode(10)) : "") + "Target: " + (info.recommended || tag);
    }

    if (strategySelect) {
      strategySelect.innerHTML = "";
      const candidates = info.candidates || [];
      candidates.forEach((cand, idx) => {
        const opt = document.createElement("option");
        opt.value = cand.selector;
        opt.innerText = cand.label + ": " + cand.selector;
        if (cand.selector === info.recommended || idx === 0) opt.selected = true;
        strategySelect.appendChild(opt);
      });
      const customOpt = document.createElement("option");
      customOpt.value = "__custom__";
      customOpt.innerText = "✏️ Custom Selector...";
      strategySelect.appendChild(customOpt);
    }

    if (targetInput) targetInput.value = info.recommended || (info.candidates && info.candidates[0] ? info.candidates[0].selector : tag);

    let defaultAction = "click";
    if (["input", "textarea", "select"].includes(tag)) defaultAction = "type";
    if (actionSelect) actionSelect.value = defaultAction;
    updateBuilderFormVisibility(defaultAction);

    const typeText = shadow.getElementById("builder-type-text");
    if (typeText) typeText.value = info.value || "";

    const assertVal = shadow.getElementById("builder-assert-value");
    if (assertVal) assertVal.value = info.text || "";

    const extractVar = shadow.getElementById("builder-extract-var");
    if (extractVar) extractVar.value = "extracted_" + (tag || "val") + "_" + (flowState.steps.length + 1);

    stepBuilderCallback = onConfirm || null;
    modal?.classList.add("open");
  }

  function closeStepBuilderModal() {
    shadow.getElementById("modal-step-builder-overlay")?.classList.remove("open");
    stepBuilderCallback = null;
    currentBuilderInfo = null;
  }

  shadow.getElementById("builder-action-type")?.addEventListener("change", (e) => {
    updateBuilderFormVisibility(e.target.value);
  });

  shadow.getElementById("builder-strategy-select")?.addEventListener("change", (e) => {
    const val = e.target.value;
    const targetInput = shadow.getElementById("builder-target-selector");
    if (targetInput && val !== "__custom__") {
      targetInput.value = val;
    }
  });

  shadow.getElementById("builder-cancel-btn")?.addEventListener("click", () => {
    closeStepBuilderModal();
    showToast("Step creation cancelled", true);
  });

  shadow.getElementById("builder-save-btn")?.addEventListener("click", () => {
    const action = shadow.getElementById("builder-action-type")?.value || "click";
    const selector = shadow.getElementById("builder-target-selector")?.value?.trim() || "";
    const frame = shadow.getElementById("builder-frame-selector")?.value?.trim() || undefined;
    const timeoutVal = Number(shadow.getElementById("builder-timeout-val")?.value) || undefined;

    let step = null;
    let recordEvent = null;

    if (action === "click") {
      const text = currentBuilderInfo?.text ? currentBuilderInfo.text.slice(0, 60) : undefined;
      step = {
        name: text ? ('Click "' + text.slice(0, 30) + '"') : ('Click ' + selector),
        action: "click",
        selector,
        frame,
        text: selector.includes(":text-is") ? undefined : text,
        timeout: timeoutVal
      };
      recordEvent = { type: "click", selector, frame, text: step.text, timeout: timeoutVal, url: window.location.href };
    } else if (action === "type") {
      const textToType = shadow.getElementById("builder-type-text")?.value || "";
      const clearFirst = Boolean(shadow.getElementById("builder-type-clear")?.checked);
      step = {
        name: 'Type into ' + selector,
        action: "type",
        selector,
        frame,
        text: textToType,
        clearFirst,
        strictText: true,
        timeout: timeoutVal
      };
      recordEvent = { type: "type", selector, frame, value: textToType, clearFirst, strictText: true, url: window.location.href };
    } else if (action === "waitForSelector") {
      step = {
        name: 'Wait for ' + selector,
        action: "waitForSelector",
        selector,
        frame,
        timeout: timeoutVal
      };
      recordEvent = { type: "waitForSelector", selector, frame, timeout: timeoutVal, name: step.name };
    } else if (action === "assert") {
      const mode = shadow.getElementById("builder-assert-mode")?.value || "strict";
      const val = shadow.getElementById("builder-assert-value")?.value ?? "";
      step = {
        name: 'Assert ' + selector + ' ' + (mode === "strict" ? "equals" : mode) + ' "' + val.slice(0, 25) + '"',
        action: "assert",
        selector,
        frame,
        text: val,
        strictText: mode === "strict",
        equals: mode === "strict" ? val : undefined,
        contains: mode === "contains" ? val : undefined,
        matches: mode === "regex" ? val : undefined,
        startsWith: mode === "startsWith" ? val : undefined
      };
      recordEvent = { type: "assert", selector, frame, text: val, equals: step.equals, contains: step.contains, matches: step.matches, startsWith: step.startsWith, strictText: step.strictText, url: window.location.href };
    } else if (action === "extract") {
      const varName = shadow.getElementById("builder-extract-var")?.value?.trim() || ("extracted_" + Date.now());
      const attr = shadow.getElementById("builder-extract-attr")?.value?.trim() || undefined;
      step = {
        name: 'Extract "' + varName + '" from ' + selector,
        action: "extract",
        selector,
        frame,
        as: varName,
        attribute: attr,
        text: currentBuilderInfo?.text ? currentBuilderInfo.text.slice(0, 80) : undefined,
        strictText: true
      };
      recordEvent = { type: "extract", selector, frame, as: varName, attribute: attr, sampleValue: step.text, url: window.location.href };
    } else if (action === "hover") {
      step = { name: 'Hover ' + selector, action: "hover", selector, frame };
      recordEvent = { type: "hover", selector, frame, url: window.location.href };
    } else if (action === "scrollIntoView") {
      step = { name: 'Scroll ' + selector + ' into view', action: "scrollIntoView", selector, frame };
      recordEvent = { type: "scrollIntoView", selector, frame, url: window.location.href };
    }

    if (step) {
      flowState.steps.push(step);
      persistState();
      renderDrawer();
      updateBadge();
      if (recordEvent) emitRecordEvent(recordEvent);
      if (stepBuilderCallback) stepBuilderCallback(step);
      showToast("✓ Added step: " + step.name);
    }
    closeStepBuilderModal();
  });
`;
