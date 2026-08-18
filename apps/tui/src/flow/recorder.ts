import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import * as readline from "node:readline";
import { Browser } from "../cdp/browser.js";
import type { FlowDefinition, FlowStep } from "./types.js";

const colors = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	green: "\x1b[32m",
	red: "\x1b[31m",
	yellow: "\x1b[33m",
	cyan: "\x1b[36m",
	magenta: "\x1b[35m",
};

export const INJECTED_ADVANCED_RECORDER_SCRIPT = `
(() => {
  if (window.__cdpRecorderInjected) return;
  window.__cdpRecorderInjected = true;

  let isPaused = false;
  let isExtractMode = false;
  let isListExtractMode = false;
  let isAssertMode = false;
  let isCollapsed = false;
  let extractCount = 0;
  let stepCount = 0;
  let hoveredEl = null;

  // 1. Full-screen non-blocking Host Container
  const hudContainer = document.createElement("div");
  hudContainer.id = "__cdp_recorder_hud__";
  hudContainer.style.position = "fixed";
  hudContainer.style.top = "0";
  hudContainer.style.left = "0";
  hudContainer.style.width = "100vw";
  hudContainer.style.height = "100vh";
  hudContainer.style.pointerEvents = "none";
  hudContainer.style.zIndex = "2147483647";
  hudContainer.style.margin = "0";
  hudContainer.style.padding = "0";
  hudContainer.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  const shadow = hudContainer.attachShadow({ mode: "open" });
  shadow.innerHTML = \`
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      
      .bar-wrapper {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        pointer-events: auto;
        cursor: default;
        z-index: 2147483647;
      }
      
      .bar {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(14px);
        padding: 6px 12px;
        border-radius: 9999px;
        box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.15);
        color: #fff;
        font-size: 12px;
        user-select: none;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .drag-handle {
        cursor: grab;
        color: #64748b;
        font-size: 14px;
        padding: 0 4px;
        display: flex;
        align-items: center;
      }
      .drag-handle:active {
        cursor: grabbing;
      }

      .badge {
        display: flex;
        align-items: center;
        gap: 6px;
        background: #ef4444;
        color: white;
        padding: 4px 10px;
        border-radius: 9999px;
        font-weight: 700;
        font-size: 11px;
        letter-spacing: 0.5px;
        cursor: pointer;
      }
      .badge.paused {
        background: #64748b;
      }
      .pulse {
        width: 8px;
        height: 8px;
        background: white;
        border-radius: 50%;
        animation: pulse-dot 1.5s infinite;
      }
      @keyframes pulse-dot {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(0.8); }
      }

      .btn-group {
        display: flex;
        align-items: center;
        gap: 6px;
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      .collapsed .btn-group {
        display: none;
      }

      .btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.16);
        color: #f1f5f9;
        padding: 5px 10px;
        border-radius: 9999px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      }
      .btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
      }
      .btn.active {
        background: #10b981;
        border-color: #059669;
        color: white;
        font-weight: 600;
      }
      .btn-undo {
        color: #fbbf24;
      }
      .btn-stop {
        background: #dc2626;
        border-color: #b91c1c;
        font-weight: 600;
      }
      .btn-stop:hover {
        background: #ef4444;
      }
      .btn-toggle {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 14px;
        padding: 0 4px;
        cursor: pointer;
      }
      .btn-toggle:hover {
        color: #fff;
      }

      .toast {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%) translateY(8px);
        background: rgba(15, 23, 42, 0.96);
        color: #10b981;
        border: 1px solid #10b981;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 500;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        opacity: 0;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
        z-index: 2147483647;
      }
      .toast.show {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }

      .tooltip {
        position: fixed;
        background: #0284c7;
        color: white;
        padding: 5px 9px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        pointer-events: none;
        z-index: 2147483647;
        display: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
      }

      /* In-DOM Modal for Variable Extraction */
      .modal-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(6px);
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        z-index: 2147483647;
      }
      .modal-overlay.open {
        display: flex;
      }
      .modal-card {
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 14px;
        padding: 22px;
        width: 400px;
        color: #fff;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
      }
      .modal-title {
        font-size: 15px;
        font-weight: 700;
        color: #38bdf8;
        margin-bottom: 12px;
      }
      .modal-preview {
        background: #1e293b;
        border-radius: 8px;
        padding: 10px 12px;
        font-size: 12px;
        color: #94a3b8;
        margin-bottom: 14px;
        max-height: 80px;
        overflow: hidden;
        text-overflow: ellipsis;
        border-left: 3px solid #38bdf8;
      }
      .modal-input {
        width: 100%;
        background: #1e293b;
        border: 1px solid #475569;
        color: #fff;
        padding: 10px 12px;
        border-radius: 8px;
        font-size: 13px;
        margin-bottom: 18px;
        outline: none;
      }
      .modal-input:focus {
        border-color: #38bdf8;
      }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .modal-btn {
        padding: 7px 16px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        border: none;
      }
      .modal-btn-cancel {
        background: #334155;
        color: #cbd5e1;
      }
      .modal-btn-save {
        background: #10b981;
        color: white;
      }
    </style>

    <div id="bar-wrapper" class="bar-wrapper">
      <div id="bar" class="bar">
        <div id="drag-handle" class="drag-handle" title="Drag toolbar">⠿</div>
        <div id="badge" class="badge" title="Click to pause/resume"><div class="pulse"></div> <span id="badge-text">REC (0)</span></div>
        <div class="btn-group">
          <button id="btn-pause" class="btn" title="Pause recording">⏸️ Pause</button>
          <button id="btn-extract" class="btn" title="Click any element to extract text">🔍 Extract Text</button>
          <button id="btn-list" class="btn" title="Click a repeating card to extract a table/list">📊 Extract List</button>
          <button id="btn-shot" class="btn" title="Capture a screenshot at this step">📸 Screenshot</button>
          <button id="btn-undo" class="btn btn-undo" title="Undo the last recorded step">↩ Undo</button>
          <button id="btn-stop" class="btn btn-stop" title="Stop and save flow">🛑 Finish</button>
        </div>
        <button id="btn-toggle" class="btn-toggle" title="Collapse/Expand toolbar">◀</button>
      </div>
    </div>

    <div id="toast" class="toast"></div>
    <div id="tooltip" class="tooltip"></div>

    <div id="modal-overlay" class="modal-overlay">
      <div class="modal-card">
        <div id="modal-title" class="modal-title">🔍 Save Extracted Variable</div>
        <div id="modal-preview" class="modal-preview">Preview text...</div>
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;">Variable Name:</div>
        <input id="modal-var-input" class="modal-input" type="text" placeholder="e.g. pageTitle, productPrice" />
        <div class="modal-actions">
          <button id="modal-cancel-btn" class="modal-btn modal-btn-cancel">Cancel</button>
          <button id="modal-save-btn" class="modal-btn modal-btn-save">Save Step</button>
        </div>
      </div>
    </div>
  \`;

  function showToast(msg, isWarn = false) {
    const toast = shadow.getElementById("toast");
    if (!toast) return;
    toast.innerText = msg;
    toast.style.borderColor = isWarn ? "#fbbf24" : "#10b981";
    toast.style.color = isWarn ? "#fbbf24" : "#10b981";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
  }

  function updateBadge() {
    const badgeText = shadow.getElementById("badge-text");
    const badge = shadow.getElementById("badge");
    const btnPause = shadow.getElementById("btn-pause");
    if (badgeText) {
      badgeText.innerText = isPaused ? \`PAUSED (\${stepCount})\` : \`REC (\${stepCount})\`;
    }
    if (badge) {
      badge.classList.toggle("paused", isPaused);
    }
    if (btnPause) {
      btnPause.innerText = isPaused ? "▶️ Resume" : "⏸️ Pause";
      btnPause.classList.toggle("active", isPaused);
    }
  }

  // Draggable toolbar implementation
  const barWrapper = shadow.getElementById("bar-wrapper");
  const dragHandle = shadow.getElementById("drag-handle");
  let isDragging = false;
  let dragStartX, dragStartY, initialLeft, initialTop;

  dragHandle?.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const rect = barWrapper.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    barWrapper.style.left = initialLeft + "px";
    barWrapper.style.top = initialTop + "px";
    barWrapper.style.bottom = "auto";
    barWrapper.style.transform = "none";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging || !barWrapper) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    barWrapper.style.left = (initialLeft + dx) + "px";
    barWrapper.style.top = (initialTop + dy) + "px";
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // Collapse / Expand toggle
  const btnToggle = shadow.getElementById("btn-toggle");
  const bar = shadow.getElementById("bar");
  btnToggle?.addEventListener("click", () => {
    isCollapsed = !isCollapsed;
    bar?.classList.toggle("collapsed", isCollapsed);
    if (btnToggle) btnToggle.innerText = isCollapsed ? "▶" : "◀";
  });

  // Modal handler for in-page variable prompt
  let modalCallback = null;
  function openVariableModal(title, preview, defaultName, onConfirm) {
    const modalOverlay = shadow.getElementById("modal-overlay");
    const modalTitle = shadow.getElementById("modal-title");
    const modalPreview = shadow.getElementById("modal-preview");
    const modalInput = shadow.getElementById("modal-var-input");

    if (modalTitle) modalTitle.innerText = title;
    if (modalPreview) modalPreview.innerText = preview ? \`Preview: "\${preview}"\` : "No preview text";
    if (modalInput) {
      modalInput.value = defaultName;
      setTimeout(() => modalInput.focus(), 50);
    }

    modalCallback = onConfirm;
    modalOverlay?.classList.add("open");
  }

  function closeModal() {
    const modalOverlay = shadow.getElementById("modal-overlay");
    modalOverlay?.classList.remove("open");
    modalCallback = null;
  }

  shadow.getElementById("modal-cancel-btn")?.addEventListener("click", () => {
    closeModal();
    showToast("Extract cancelled", true);
  });

  shadow.getElementById("modal-save-btn")?.addEventListener("click", () => {
    const modalInput = shadow.getElementById("modal-var-input");
    const val = modalInput?.value?.trim();
    if (modalCallback && val) {
      modalCallback(val);
    }
    closeModal();
  });

  shadow.getElementById("modal-var-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const val = e.target?.value?.trim();
      if (modalCallback && val) {
        modalCallback(val);
      }
      closeModal();
    } else if (e.key === "Escape") {
      closeModal();
    }
  });

  function mountHud() {
    if (!document.getElementById("__cdp_recorder_hud__") && (document.body || document.documentElement)) {
      (document.body || document.documentElement).appendChild(hudContainer);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountHud);
  } else {
    mountHud();
  }

  // Toolbar Listeners
  const btnPause = shadow.getElementById("btn-pause");
  const btnExtract = shadow.getElementById("btn-extract");
  const btnList = shadow.getElementById("btn-list");
  const btnShot = shadow.getElementById("btn-shot");
  const btnUndo = shadow.getElementById("btn-undo");
  const btnStop = shadow.getElementById("btn-stop");
  const tooltip = shadow.getElementById("tooltip");

  const togglePause = (e) => {
    e?.stopPropagation();
    isPaused = !isPaused;
    updateBadge();
    showToast(isPaused ? "⏸️ Recording paused" : "▶️ Recording resumed");
    if (window.__cdpRecordEvent) {
      window.__cdpRecordEvent(JSON.stringify({ type: isPaused ? "pause" : "resume" }));
    }
  };

  btnPause?.addEventListener("click", togglePause);
  shadow.getElementById("badge")?.addEventListener("click", togglePause);

  btnExtract?.addEventListener("click", (e) => {
    e.stopPropagation();
    isExtractMode = !isExtractMode;
    isListExtractMode = false;
    btnExtract.classList.toggle("active", isExtractMode);
    btnList?.classList.remove("active");
    showToast(isExtractMode ? "🔍 Extract Mode ON: Click any element to capture" : "Extract Mode OFF");
  });

  btnList?.addEventListener("click", (e) => {
    e.stopPropagation();
    isListExtractMode = !isListExtractMode;
    isExtractMode = false;
    btnList.classList.toggle("active", isListExtractMode);
    btnExtract?.classList.remove("active");
    showToast(isListExtractMode ? "📊 List Mode ON: Click one item card to extract all repeated items" : "List Mode OFF");
  });

  btnShot?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isPaused) return;
    stepCount++;
    updateBadge();
    if (window.__cdpRecordEvent) {
      window.__cdpRecordEvent(JSON.stringify({
        type: "screenshot",
        url: window.location.href
      }));
      showToast("📸 Screenshot step added!");
    }
  });

  btnUndo?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (stepCount > 0) stepCount--;
    updateBadge();
    if (window.__cdpRecordEvent) {
      window.__cdpRecordEvent(JSON.stringify({ type: "undo" }));
    }
    showToast("↩ Last step undone", true);
  });

  btnStop?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (window.__cdpRecordEvent) {
      window.__cdpRecordEvent(JSON.stringify({ type: "finish" }));
    }
  });

  // 2. Smart Selector Engine
  function getBestSelector(el) {
    if (!el || el === document.body || el === document.documentElement) return "body";
    if (el.closest && el.closest("#__cdp_recorder_hud__")) return null;

    // Climb to nearest button or anchor if clicking an inner svg/icon/span
    const clickableParent = el.closest("button, a, [role='button'], input[type='submit']");
    if (clickableParent && clickableParent !== el && !isExtractMode && !isListExtractMode) {
      el = clickableParent;
    }

    if (el.id) return '#' + CSS.escape(el.id);
    
    if (el.name) {
      const tag = el.tagName.toLowerCase();
      return tag + '[name="' + CSS.escape(el.name) + '"]';
    }

    if (el.getAttribute('data-testid')) {
      return '[data-testid="' + CSS.escape(el.getAttribute('data-testid')) + '"]';
    }

    if (el.getAttribute('aria-label')) {
      return '[aria-label="' + CSS.escape(el.getAttribute('aria-label')) + '"]';
    }

    if (el.getAttribute('placeholder')) {
      return '[placeholder="' + CSS.escape(el.getAttribute('placeholder')) + '"]';
    }

    // Try clean class names
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\\s+/).filter(c => c && !c.includes(':') && !c.includes('/'));
      if (classes.length > 0) {
        const sel = el.tagName.toLowerCase() + '.' + classes.slice(0, 2).map(c => CSS.escape(c)).join('.');
        if (document.querySelectorAll(sel).length === 1) {
          return sel;
        }
      }
    }

    // Path fallback
    const path = [];
    let current = el;
    while (current && current !== document.body && current !== document.documentElement) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector = '#' + CSS.escape(current.id);
        path.unshift(selector);
        break;
      }
      let sibling = current;
      let nth = 1;
      while (sibling.previousElementSibling) {
        sibling = sibling.previousElementSibling;
        if (sibling.tagName === current.tagName) nth++;
      }
      if (nth > 1) selector += ':nth-of-type(' + nth + ')';
      path.unshift(selector);
      current = current.parentElement;
    }
    return path.join(' > ');
  }

  // Find common repeated container class for List Extraction
  function findRepeatedContainer(el) {
    let current = el;
    while (current && current !== document.body) {
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\\s+/).filter(c => c && !c.includes(':'));
        if (classes.length > 0) {
          const sel = current.tagName.toLowerCase() + '.' + classes[0];
          const matches = document.querySelectorAll(sel);
          if (matches.length > 1) {
            return { selector: sel, count: matches.length };
          }
        }
      }
      if (current.tagName.toLowerCase() === 'tr') {
        const sel = current.className ? 'tr.' + current.className.split(' ')[0] : 'tr';
        const matches = document.querySelectorAll(sel);
        if (matches.length > 1) {
          return { selector: sel, count: matches.length };
        }
      }
      current = current.parentElement;
    }
    return { selector: el.tagName.toLowerCase(), count: 1 };
  }

  // 3. Hover Inspector Outline & Floating Cursor Tooltip
  document.addEventListener("mouseover", (e) => {
    if (isPaused || (!isExtractMode && !isListExtractMode && !e.shiftKey)) return;
    const target = e.target;
    if (!target || target.closest("#__cdp_recorder_hud__")) return;

    if (hoveredEl && hoveredEl !== target) {
      hoveredEl.style.outline = "";
    }
    hoveredEl = target;

    if (isListExtractMode) {
      const containerInfo = findRepeatedContainer(target);
      hoveredEl.style.outline = "2px dashed #38bdf8";
      if (tooltip) {
        tooltip.style.display = "block";
        tooltip.style.left = (e.clientX + 12) + "px";
        tooltip.style.top = (e.clientY + 12) + "px";
        tooltip.innerText = \`📊 List Item: \${containerInfo.selector} (\${containerInfo.count} items)\`;
      }
    } else {
      hoveredEl.style.outline = "2px dashed #10b981";
      if (tooltip) {
        tooltip.style.display = "block";
        tooltip.style.left = (e.clientX + 12) + "px";
        tooltip.style.top = (e.clientY + 12) + "px";
        const sel = getBestSelector(target);
        tooltip.innerText = \`🔍 Extract: \${sel}\`;
      }
    }
    hoveredEl.style.cursor = "crosshair";
  }, true);

  document.addEventListener("mousemove", (e) => {
    if (tooltip && tooltip.style.display === "block") {
      tooltip.style.left = (e.clientX + 12) + "px";
      tooltip.style.top = (e.clientY + 12) + "px";
    }
  }, true);

  document.addEventListener("mouseout", (e) => {
    if (hoveredEl) {
      hoveredEl.style.outline = "";
      hoveredEl.style.cursor = "";
      hoveredEl = null;
    }
    if (tooltip) {
      tooltip.style.display = "none";
    }
  }, true);

  // 4. Click Handler (Interaction vs Extraction vs List Extraction)
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target || target.closest("#__cdp_recorder_hud__")) return;
    if (isPaused) {
      e.preventDefault();
      showToast("⏸️ Action ignored (recording is paused)", true);
      return;
    }

    const isExtract = isExtractMode || e.shiftKey;
    const isList = isListExtractMode;
    const isAssert = e.altKey;
    const selector = getBestSelector(target);
    if (!selector) return;

    // List Extract Mode
    if (isList) {
      e.preventDefault();
      e.stopPropagation();
      const containerInfo = findRepeatedContainer(target);
      const defaultVar = "extractedList";
      
      openVariableModal(
        \`📊 Extract List (\${containerInfo.count} items found)\`,
        \`Container: \${containerInfo.selector}\`,
        defaultVar,
        (varName) => {
          stepCount++;
          updateBadge();

          if (window.__cdpRecordEvent) {
            window.__cdpRecordEvent(JSON.stringify({
              type: 'extractMultiple',
              containerSelector: containerInfo.selector,
              as: varName,
              limit: 20,
              fields: {
                title: "a, h1, h2, h3, .title, p",
                link: "a@href"
              }
            }));
          }

          showToast(\`✓ Extract List: Saved \${containerInfo.count} items to "\${varName}"\`);
        }
      );

      if (hoveredEl) hoveredEl.style.outline = "";
      isListExtractMode = false;
      btnList?.classList.remove("active");
      if (tooltip) tooltip.style.display = "none";
      return;
    }

    // Single Extract Mode
    if (isExtract) {
      e.preventDefault();
      e.stopPropagation();
      extractCount++;
      const text = target.innerText?.trim() || target.textContent?.trim() || "";
      const defaultVar = "extracted_" + extractCount;

      openVariableModal(
        "🔍 Save Extracted Variable",
        text.slice(0, 80),
        defaultVar,
        (varName) => {
          stepCount++;
          updateBadge();

          if (window.__cdpRecordEvent) {
            window.__cdpRecordEvent(JSON.stringify({
              type: 'extract',
              selector,
              as: varName,
              sampleValue: text.slice(0, 40),
              url: window.location.href
            }));
          }

          showToast(\`✓ Extracted "\${varName}": "\${text.slice(0, 20)}..."\`);
        }
      );

      if (hoveredEl) hoveredEl.style.outline = "";
      isExtractMode = false;
      btnExtract?.classList.remove("active");
      if (tooltip) tooltip.style.display = "none";
      return;
    }

    // Assertion Mode (Alt+Click)
    if (isAssert) {
      e.preventDefault();
      e.stopPropagation();
      stepCount++;
      updateBadge();

      const text = target.innerText?.trim() || target.textContent?.trim() || ('value' in target ? String(target.value).trim() : "") || "";
      if (window.__cdpRecordEvent) {
        window.__cdpRecordEvent(JSON.stringify({
          type: 'assert',
          selector,
          text: text.slice(0, 100),
          equals: text.slice(0, 100),
          strictText: true,
          url: window.location.href
        }));
      }
      showToast(\`✓ Strict Assert added: equals "\${text.slice(0, 20)}..."\`);
      return;
    }

    // Normal Click
    stepCount++;
    updateBadge();

    const text = target.innerText?.trim() || target.textContent?.trim() || ('value' in target ? String(target.value).trim() : '') || '';
    if (window.__cdpRecordEvent) {
      window.__cdpRecordEvent(JSON.stringify({
        type: 'click',
        selector,
        text: text.slice(0, 60),
        strictText: Boolean(text),
        url: window.location.href
      }));
    }
    showToast(\`✓ Click: \${selector}\${text ? \` ("\${text.slice(0, 15)}")\` : ''}\`);
  }, true);

  // 5. Input / Change / Keydown recorder
  document.addEventListener('change', (e) => {
    const target = e.target;
    if (!target || !('value' in target) || target.closest("#__cdp_recorder_hud__")) return;
    if (isPaused) return;
    const selector = getBestSelector(target);
    if (!selector) return;

    stepCount++;
    updateBadge();
    
    const targetText = target.placeholder || target.getAttribute('aria-label') || target.name || target.id || '';
    if (window.__cdpRecordEvent) {
      window.__cdpRecordEvent(JSON.stringify({
        type: 'type',
        selector,
        value: target.value,
        targetText,
        strictText: true,
        url: window.location.href
      }));
    }
    showToast(\`✓ Input: "\${target.value}"\`);
  }, true);

  // Enter key press recorder
  document.addEventListener('keydown', (e) => {
    if (isPaused) return;
    if (e.key === 'Enter') {
      const target = e.target;
      if (target && ('value' in target) && !target.closest("#__cdp_recorder_hud__")) {
        const selector = getBestSelector(target);
        if (selector && window.__cdpRecordEvent) {
          window.__cdpRecordEvent(JSON.stringify({
            type: 'enterKey',
            selector,
            value: target.value,
            strictText: true
          }));
        }
      }
    }
  }, true);
})();
`;

export class FlowRecorder {
	static async record(
		outputPath: string,
		initialUrl = "https://news.ycombinator.com",
	): Promise<FlowDefinition> {
		const steps: FlowStep[] = [];
		const variables: Record<string, any> = {};
		let lastUrl = "";
		let isFinished = false;
		let isPaused = false;

		console.log(
			`\n${colors.bold}${colors.red}🔴 Launching Browser in Advanced Recording Mode...${colors.reset}`,
		);
		console.log(
			`${colors.dim}═══════════════════════════════════════════════════════════════════════════════════════════${colors.reset}`,
		);
		console.log(
			`  🖱️  ${colors.bold}Normal Click${colors.reset}       : Records a click action`,
		);
		console.log(
			`  ⌨️  ${colors.bold}Type into Input${colors.reset}    : Records input text on change/submit`,
		);
		console.log(
			`  🔍 ${colors.bold}Shift + Click${colors.reset}       : ${colors.green}Extracts single element text to a variable${colors.reset}`,
		);
		console.log(
			`  📊 ${colors.bold}Extract List HUD${colors.reset}    : ${colors.cyan}Extracts table rows / repeated item cards${colors.reset}`,
		);
		console.log(
			`  🔎 ${colors.bold}Alt + Click${colors.reset}         : ${colors.yellow}Asserts element text equals/contains value${colors.reset}`,
		);
		console.log(
			`  ⏸️  ${colors.bold}Pause / Resume${colors.reset}      : Pause recording anytime in HUD`,
		);
		console.log(
			`  ↩  ${colors.bold}Undo Step${colors.reset}           : Reverts the last recorded action`,
		);
		console.log(
			`  📸 ${colors.bold}Screenshot Button${colors.reset}   : Injects instant screenshot step`,
		);
		console.log(
			`${colors.dim}═══════════════════════════════════════════════════════════════════════════════════════════${colors.reset}\n`,
		);

		let browser: Browser | null = null;
		let rl: readline.Interface | null = null;

		try {
			browser = await Browser.launch({
				headless: false,
				args: ["--start-maximized"],
			});

			const page = await browser.newPage();
			await page.init();

			// Enable CDP domains
			await page.client.send("Runtime.enable");
			await page.client.send("Page.enable");

			// Expose binding to receive recorded events
			await page.client.send("Runtime.addBinding", {
				name: "__cdpRecordEvent",
			});

			// Inject advanced recorder script
			await page.client.send("Page.addScriptToEvaluateOnNewDocument", {
				source: INJECTED_ADVANCED_RECORDER_SCRIPT,
			});

			let finishResolver: (() => void) | null = null;
			const finishPromise = new Promise<void>((resolve) => {
				finishResolver = resolve;
			});

			const triggerFinish = () => {
				if (!isFinished) {
					isFinished = true;
					finishResolver?.();
				}
			};

			// If user closes the browser window or disconnects
			page.client.on("close", triggerFinish);

			// Record navigation events
			page.client.on("Page.frameNavigated", (params: any) => {
				if (isPaused) return;
				const frame = params?.frame;
				if (
					frame &&
					!frame.parentId &&
					frame.url &&
					frame.url !== "about:blank"
				) {
					if (frame.url !== lastUrl) {
						lastUrl = frame.url;
						steps.push({
							name: `Navigate to ${new URL(frame.url).hostname || frame.url}`,
							action: "goto",
							url: frame.url,
						});
						console.log(
							`  ${colors.cyan}🌐 [NAVIGATE]${colors.reset} ${frame.url}`,
						);
					}
				}
			});

			// Handle DOM events recorded by injected script
			page.client.on("Runtime.bindingCalled", (params: any) => {
				if (
					(params.name === "__cdpRecordEvent" ||
						params.name === "__cdpRecordEvent__") &&
					params.payload
				) {
					try {
						const event = JSON.parse(params.payload);

						if (event.type === "pause") {
							isPaused = true;
							console.log(
								`  ${colors.yellow}⏸️  [PAUSED] Recording suspended${colors.reset}`,
							);
						} else if (event.type === "resume") {
							isPaused = false;
							console.log(
								`  ${colors.green}▶️  [RESUMED] Recording active${colors.reset}`,
							);
						} else if (event.type === "undo") {
							const popped = steps.pop();
							if (popped) {
								console.log(
									`  ${colors.yellow}↩  [UNDO] Removed step: ${popped.name || popped.action}${colors.reset}`,
								);
							}
						} else if (event.type === "click") {
							const stepName = event.text
								? `Click "${event.text}"`
								: `Click ${event.selector}`;
							steps.push({
								name: stepName,
								action: "click",
								selector: event.selector,
								text: event.text || undefined,
								strictText: event.text ? true : undefined,
							});
							console.log(
								`  ${colors.green}🖱️ [CLICK]${colors.reset} ${event.selector} ${event.text ? colors.dim + `(strict text: "${event.text}")` + colors.reset : ""}`,
							);
						} else if (event.type === "type") {
							steps.push({
								name: `Type into ${event.selector}`,
								action: "type",
								selector: event.selector,
								text: event.value,
								targetText: event.targetText || undefined,
								strictText: true,
							});
							console.log(
								`  ${colors.yellow}⌨️ [TYPE]${colors.reset} ${event.selector} -> "${event.value}" ${event.targetText ? colors.dim + `(target: "${event.targetText}")` + colors.reset : ""}`,
							);
						} else if (event.type === "extract") {
							steps.push({
								name: `Extract "${event.as}" from ${event.selector}`,
								action: "extract",
								selector: event.selector,
								as: event.as,
								text: event.text || event.sampleValue || undefined,
								strictText: true,
							});
							console.log(
								`  ${colors.magenta}🔍 [EXTRACT]${colors.reset} Saved ${event.selector} as "${event.as}" ${colors.dim}(strict text: "${event.text || event.sampleValue}")${colors.reset}`,
							);
						} else if (event.type === "extractMultiple") {
							steps.push({
								name: `Extract List "${event.as}" from ${event.containerSelector}`,
								action: "extractMultiple",
								containerSelector: event.containerSelector,
								as: event.as,
								limit: event.limit || 20,
								fields: event.fields || { title: "a", link: "a@href" },
							});
							console.log(
								`  ${colors.cyan}📊 [EXTRACT LIST]${colors.reset} Saved repeated cards "${event.containerSelector}" as "${event.as}"`,
							);
						} else if (event.type === "assert") {
							const assertVal = event.equals || event.text || event.contains;
							steps.push({
								name: `Assert ${event.selector} strictly equals "${assertVal}"`,
								action: "assert",
								selector: event.selector,
								text: event.text || assertVal,
								equals: assertVal,
								strictText: true,
							});
							console.log(
								`  ${colors.yellow}🔎 [ASSERT]${colors.reset} ${event.selector} strictly equals "${assertVal}"`,
							);
						} else if (event.type === "screenshot") {
							steps.push({
								name: `Capture Screenshot at Step ${steps.length + 1}`,
								action: "screenshot",
								path: `{{outputDir}}/screenshot-${Date.now()}.png`,
							});
							console.log(
								`  ${colors.cyan}📸 [SCREENSHOT]${colors.reset} Added screenshot step`,
							);
						} else if (event.type === "finish") {
							triggerFinish();
						}
					} catch {}
				}
			});

			// Navigate to initial URL
			await page.goto(initialUrl);

			// Terminal enter key alternative
			rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			});

			console.log(
				`  ${colors.bold}${colors.magenta}👉 When done, press [ENTER] here or click "Finish" in the browser toolbar...${colors.reset}\n`,
			);

			rl.on("line", () => {
				rl?.close();
				triggerFinish();
			});

			await finishPromise;
		} finally {
			if (rl) {
				try {
					rl.close();
				} catch {}
			}
			if (browser) {
				await browser.close();
			}
		}

		const flowName =
			outputPath
				.split("/")
				.pop()
				?.replace(/\.json$/i, "")
				.replace(/[^a-z0-9]/gi, " ")
				.trim() || "Recorded Flow";

		const flowDefinition: FlowDefinition = {
			name: flowName,
			description: `Recorded on ${new Date().toLocaleString()}`,
			variables,
			steps,
		};

		const targetDir = dirname(outputPath);
		if (targetDir && !existsSync(targetDir)) {
			mkdirSync(targetDir, { recursive: true });
		}

		await Bun.write(outputPath, JSON.stringify(flowDefinition, null, 2));

		console.log(
			`\n${colors.bold}${colors.green}✓ Recording complete!${colors.reset}`,
		);
		console.log(
			`  📁 Saved ${steps.length} steps to: ${colors.bold}${outputPath}${colors.reset}`,
		);
		console.log(
			`  🚀 Replay anytime with: ${colors.cyan}bun run flow ${outputPath}${colors.reset}\n`,
		);

		return flowDefinition;
	}
}
