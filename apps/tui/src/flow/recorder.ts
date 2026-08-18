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
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
};

export const INJECTED_ADVANCED_RECORDER_SCRIPT = `
(() => {
  if (window.__cdpRecorderInjected) {
    if (window.__cdpHydrate) window.__cdpHydrate();
    return;
  }
  window.__cdpRecorderInjected = true;

  // Persistent recording state
  let flowState = {
    name: "Recorded Flow",
    steps: [],
    variables: {},
    isPaused: false
  };

  try {
    const saved = sessionStorage.getItem("__cdp_flow_state__");
    if (saved) {
      flowState = { ...flowState, ...JSON.parse(saved) };
    }
  } catch {}

  let isExtractMode = false;
  let isListExtractMode = false;
  let isAssertMode = false;
  let isCollapsed = false;
  let isDrawerOpen = false;
  let extractCount = 0;
  let hoveredEl = null;

  function persistState() {
    try {
      sessionStorage.setItem("__cdp_flow_state__", JSON.stringify(flowState));
    } catch {}
  }

  function emitRecordEvent(event) {
    if (window.__cdpRecordEvent) {
      window.__cdpRecordEvent(JSON.stringify(event));
    }
  }

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
      
      /* High-performance GPU-accelerated Toolbar */
      .bar-wrapper {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translate3d(-50%, 0, 0);
        pointer-events: auto;
        cursor: default;
        z-index: 2147483647;
        will-change: transform;
        user-select: none;
      }
      
      .bar {
        display: flex;
        align-items: center;
        gap: 5px;
        background: #0f172a;
        padding: 5px 10px;
        border-radius: 9999px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.14);
        color: #fff;
        font-size: 12px;
        user-select: none;
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
        gap: 4px;
      }
      .collapsed .btn-group {
        display: none;
      }

      .btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.16);
        color: #f1f5f9;
        padding: 4px 9px;
        border-radius: 9999px;
        cursor: pointer;
        font-size: 11.5px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      }
      .btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      .btn.active {
        background: #10b981;
        border-color: #059669;
        color: white;
        font-weight: 600;
      }
      .btn.active-assert {
        background: #f59e0b;
        border-color: #d97706;
        color: black;
        font-weight: 700;
      }
      .btn-config {
        background: rgba(56, 189, 248, 0.15);
        border-color: rgba(56, 189, 248, 0.4);
        color: #38bdf8;
        font-weight: 600;
      }
      .btn-config:hover, .btn-config.active {
        background: #0284c7;
        color: white;
        border-color: #0284c7;
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

      /* Toasts & Tooltips (GPU Accelerated) */
      .toast {
        position: fixed;
        bottom: 74px;
        left: 50%;
        transform: translate3d(-50%, 8px, 0);
        background: #0f172a;
        color: #10b981;
        border: 1px solid #10b981;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 500;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
        opacity: 0;
        pointer-events: none;
        z-index: 2147483647;
        transition: opacity 0.15s ease, transform 0.15s ease;
      }
      .toast.show {
        opacity: 1;
        transform: translate3d(-50%, 0, 0);
      }

      .tooltip {
        position: fixed;
        top: 0;
        left: 0;
        transform: translate3d(0, 0, 0);
        will-change: transform;
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

      /* In-Page Interactive Live Config & Steps Inspector Drawer */
      .drawer-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.6);
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        z-index: 2147483646;
      }
      .drawer-overlay.open {
        display: flex;
      }
      .drawer-card {
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 16px;
        width: 760px;
        max-width: 94vw;
        height: 560px;
        max-height: 88vh;
        display: flex;
        flex-direction: column;
        color: #fff;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.85);
        overflow: hidden;
      }
      .drawer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        background: #1e293b;
        border-bottom: 1px solid #334155;
      }
      .drawer-title {
        font-size: 15px;
        font-weight: 700;
        color: #38bdf8;
      }
      .drawer-subtitle {
        font-size: 11.5px;
        color: #94a3b8;
        margin-top: 2px;
      }
      .drawer-close-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #cbd5e1;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
      }
      .drawer-close-btn:hover {
        background: #ef4444;
        border-color: #ef4444;
        color: white;
      }

      /* Tabs Bar */
      .drawer-tabs {
        display: flex;
        background: #0f172a;
        border-bottom: 1px solid #334155;
        padding: 0 16px;
        gap: 8px;
      }
      .drawer-tab {
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: #94a3b8;
        padding: 10px 14px;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
      }
      .drawer-tab:hover {
        color: #f1f5f9;
      }
      .drawer-tab.active {
        color: #38bdf8;
        border-bottom-color: #38bdf8;
      }

      /* Tab Panels */
      .drawer-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px 20px;
        background: #0b1120;
      }
      .tab-panel {
        display: none;
        height: 100%;
      }
      .tab-panel.active {
        display: block;
      }

      /* Steps List View */
      .steps-list-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #64748b;
        font-size: 13px;
      }
      .step-item {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 10px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .step-item:hover {
        border-color: #475569;
      }
      .step-item-left {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
        min-width: 0;
      }
      .step-index-badge {
        font-size: 11px;
        font-weight: 700;
        color: #94a3b8;
        background: #0f172a;
        padding: 3px 7px;
        border-radius: 6px;
      }
      .step-action-pill {
        font-size: 10px;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 9999px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .pill-goto { background: #0369a1; color: #e0f2fe; }
      .pill-click { background: #047857; color: #d1fae5; }
      .pill-type { background: #b45309; color: #fef3c7; }
      .pill-extract { background: #6d28d9; color: #ede9fe; }
      .pill-extractmultiple { background: #4338ca; color: #e0e7ff; }
      .pill-assert { background: #c2410c; color: #ffedd5; }
      .pill-wait { background: #1d4ed8; color: #dbeafe; }
      .pill-waitforselector { background: #0e7490; color: #cffafe; }
      .pill-eval { background: #0f766e; color: #ccfbf1; }
      .pill-screenshot { background: #a21caf; color: #fae8ff; }

      .step-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        min-width: 0;
      }
      .step-name {
        font-size: 12.5px;
        font-weight: 600;
        color: #f1f5f9;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .step-detail {
        font-size: 11px;
        color: #94a3b8;
        font-family: ui-monospace, monospace;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .step-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .btn-icon {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #cbd5e1;
        width: 26px;
        height: 26px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      }
      .btn-icon:hover {
        background: rgba(255, 255, 255, 0.16);
      }
      .btn-icon-del:hover {
        background: #ef4444;
        border-color: #ef4444;
        color: white;
      }

      /* JSON Config View */
      .json-actions-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      .json-info-text {
        font-size: 11.5px;
        color: #94a3b8;
      }
      .btn-sm {
        padding: 5px 12px;
        border-radius: 6px;
        font-size: 11.5px;
        font-weight: 600;
        cursor: pointer;
        border: none;
      }
      .btn-primary {
        background: #0284c7;
        color: white;
      }
      .btn-primary:hover {
        background: #0369a1;
      }
      .btn-success {
        background: #10b981;
        color: white;
      }
      .btn-success:hover {
        background: #059669;
      }
      .json-viewer {
        background: #030712;
        border: 1px solid #1e293b;
        border-radius: 8px;
        padding: 12px 14px;
        color: #38bdf8;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 11.5px;
        line-height: 1.5;
        overflow: auto;
        max-height: 380px;
        white-space: pre;
      }

      /* Variables Tab */
      .vars-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .add-var-row {
        display: flex;
        gap: 8px;
        background: #1e293b;
        padding: 12px;
        border-radius: 10px;
        border: 1px solid #334155;
      }
      .drawer-input {
        background: #0f172a;
        border: 1px solid #475569;
        color: #fff;
        padding: 7px 10px;
        border-radius: 6px;
        font-size: 12px;
        outline: none;
        flex: 1;
      }
      .drawer-input:focus {
        border-color: #38bdf8;
      }
      .drawer-textarea {
        background: #0f172a;
        border: 1px solid #475569;
        color: #fff;
        padding: 8px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-family: ui-monospace, monospace;
        outline: none;
        width: 100%;
        height: 60px;
        resize: vertical;
      }
      .drawer-textarea:focus {
        border-color: #38bdf8;
      }
      .vars-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .var-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12px;
      }
      .var-key {
        font-weight: 700;
        color: #38bdf8;
        font-family: ui-monospace, monospace;
      }
      .var-val {
        color: #94a3b8;
        font-family: ui-monospace, monospace;
      }

      /* Add Custom Step Grid */
      .add-step-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .add-step-card {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .add-step-card-title {
        font-size: 13px;
        font-weight: 700;
        color: #f1f5f9;
      }
      .add-step-card-desc {
        font-size: 11px;
        color: #94a3b8;
        margin-bottom: 4px;
      }
      .input-inline {
        display: flex;
        gap: 6px;
      }

      /* In-DOM Modals */
      .modal-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.7);
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
        padding: 20px;
        width: 440px;
        max-width: 90vw;
        color: #fff;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.85);
      }
      .modal-title {
        font-size: 15px;
        font-weight: 700;
        color: #38bdf8;
        margin-bottom: 10px;
      }
      .modal-preview {
        background: #1e293b;
        border-radius: 8px;
        padding: 9px 12px;
        font-size: 11.5px;
        color: #cbd5e1;
        margin-bottom: 12px;
        max-height: 75px;
        overflow: hidden;
        text-overflow: ellipsis;
        border-left: 3px solid #38bdf8;
      }
      .modal-label {
        font-size: 11px;
        color: #94a3b8;
        margin-bottom: 5px;
        font-weight: 600;
      }
      .modal-select {
        width: 100%;
        background: #1e293b;
        border: 1px solid #475569;
        color: #fff;
        padding: 8px 10px;
        border-radius: 8px;
        font-size: 12px;
        margin-bottom: 12px;
        outline: none;
      }
      .modal-input {
        width: 100%;
        background: #1e293b;
        border: 1px solid #475569;
        color: #fff;
        padding: 8px 10px;
        border-radius: 8px;
        font-size: 12.5px;
        margin-bottom: 14px;
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

    <!-- Main Toolbar -->
    <div id="bar-wrapper" class="bar-wrapper">
      <div id="bar" class="bar">
        <div id="drag-handle" class="drag-handle" title="Drag toolbar">⠿</div>
        <div id="badge" class="badge" title="Click to pause/resume"><div class="pulse"></div> <span id="badge-text">REC (0)</span></div>
        <div class="btn-group">
          <button id="btn-pause" class="btn" title="Pause / Resume recording">⏸️ Pause</button>
          <button id="btn-extract" class="btn" title="Click any element to extract text">🔍 Extract</button>
          <button id="btn-list" class="btn" title="Click a repeating card to extract a table/list">📊 List</button>
          <button id="btn-assert" class="btn" title="Click element to assert text/attribute">🔎 Assert</button>
          <button id="btn-wait" class="btn" title="Add wait delay">⏱️ Wait</button>
          <button id="btn-shot" class="btn" title="Capture a screenshot at this step">📸 Shot</button>
          <button id="btn-config" class="btn btn-config" title="Open live workflow config & step editor">⚙️ Config (0)</button>
          <button id="btn-undo" class="btn btn-undo" title="Undo the last recorded step">↩ Undo</button>
          <button id="btn-stop" class="btn btn-stop" title="Stop and save flow">🛑 Finish</button>
        </div>
        <button id="btn-toggle" class="btn-toggle" title="Collapse/Expand toolbar">◀</button>
      </div>
    </div>

    <div id="toast" class="toast"></div>
    <div id="tooltip" class="tooltip"></div>

    <!-- Live Config & Steps Inspector Drawer -->
    <div id="drawer-overlay" class="drawer-overlay">
      <div class="drawer-card">
        <div class="drawer-header">
          <div>
            <div class="drawer-title">⚡ Live Workflow Config Inspector</div>
            <div id="drawer-subtitle" class="drawer-subtitle">Flow: Recorded Flow • 0 steps • 0 variables</div>
          </div>
          <button id="btn-drawer-close" class="drawer-close-btn" title="Close Drawer">✕</button>
        </div>

        <div class="drawer-tabs">
          <button class="drawer-tab active" data-tab="steps">📝 Steps (<span id="tab-steps-count">0</span>)</button>
          <button class="drawer-tab" data-tab="json">⚙️ JSON Config</button>
          <button class="drawer-tab" data-tab="vars">🏷️ Variables (<span id="tab-vars-count">0</span>)</button>
          <button class="drawer-tab" data-tab="add">➕ Add Step</button>
        </div>

        <div class="drawer-body">
          <!-- Steps Tab -->
          <div id="panel-steps" class="tab-panel active">
            <div id="steps-list-container" class="steps-list-container">
              <div class="empty-state">No steps recorded yet. Click or type on the page to begin!</div>
            </div>
          </div>

          <!-- JSON Config Tab -->
          <div id="panel-json" class="tab-panel">
            <div class="json-actions-bar">
              <span class="json-info-text">Real-time declarative workflow JSON</span>
              <button id="btn-copy-json" class="btn-sm btn-primary">📋 Copy JSON</button>
            </div>
            <pre id="json-viewer" class="json-viewer"><code>{}</code></pre>
          </div>

          <!-- Variables Tab -->
          <div id="panel-vars" class="tab-panel">
            <div class="vars-container">
              <div class="add-var-row">
                <input id="new-var-key" class="drawer-input" placeholder="Variable Name (e.g. userEmail, query)" />
                <input id="new-var-val" class="drawer-input" placeholder="Default Value" />
                <button id="btn-add-var" class="btn-sm btn-success">➕ Add</button>
              </div>
              <div id="vars-list" class="vars-list">
                <div class="empty-state" style="padding: 20px;">No variables defined yet.</div>
              </div>
            </div>
          </div>

          <!-- Add Step Tab -->
          <div id="panel-add" class="tab-panel">
            <div class="add-step-grid">
              <div class="add-step-card">
                <div class="add-step-card-title">⏱️ Add Wait Delay</div>
                <div class="add-step-card-desc">Pause execution for a duration in milliseconds.</div>
                <div class="input-inline">
                  <input id="add-wait-ms" type="number" class="drawer-input" placeholder="Duration (ms)" value="1500" />
                  <button id="btn-submit-wait" class="btn-sm btn-primary">Add Wait</button>
                </div>
              </div>

              <div class="add-step-card">
                <div class="add-step-card-title">⏳ Wait for Selector</div>
                <div class="add-step-card-desc">Wait until an element appears.</div>
                <input id="add-waitfor-sel" class="drawer-input" placeholder="CSS Selector" />
                <div class="input-inline" style="margin-top: 4px;">
                  <input id="add-waitfor-text" class="drawer-input" placeholder="Optional text" />
                  <button id="btn-submit-waitfor" class="btn-sm btn-primary">Add</button>
                </div>
              </div>

              <div class="add-step-card">
                <div class="add-step-card-title">⚡ Custom JavaScript Eval</div>
                <div class="add-step-card-desc">Evaluate custom JS in the page.</div>
                <textarea id="add-eval-code" class="drawer-textarea" placeholder="return window.location.href;"></textarea>
                <div class="input-inline" style="margin-top: 4px;">
                  <input id="add-eval-var" class="drawer-input" placeholder="Save as variable (optional)" />
                  <button id="btn-submit-eval" class="btn-sm btn-primary">Add Eval</button>
                </div>
              </div>

              <div class="add-step-card">
                <div class="add-step-card-title">🌐 Manual Navigate</div>
                <div class="add-step-card-desc">Direct URL navigation step.</div>
                <div class="input-inline">
                  <input id="add-goto-url" class="drawer-input" placeholder="https://example.com" />
                  <button id="btn-submit-goto" class="btn-sm btn-primary">Add</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Extraction Modal -->
    <div id="modal-overlay" class="modal-overlay">
      <div class="modal-card">
        <div id="modal-title" class="modal-title">🔍 Save Extracted Variable</div>
        <div id="modal-preview" class="modal-preview">Preview text...</div>
        <div class="modal-label">Variable Name:</div>
        <input id="modal-var-input" class="modal-input" type="text" placeholder="e.g. pageTitle, productPrice" />
        <div class="modal-actions">
          <button id="modal-cancel-btn" class="modal-btn modal-btn-cancel">Cancel</button>
          <button id="modal-save-btn" class="modal-btn modal-btn-save">Save Step</button>
        </div>
      </div>
    </div>

    <!-- Assertion Modal -->
    <div id="modal-assert-overlay" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-title">🔎 Add Text Assertion</div>
        <div id="modal-assert-preview" class="modal-preview">Preview text...</div>
        <div class="modal-label">Assertion Type:</div>
        <select id="modal-assert-type" class="modal-select">
          <option value="strict">Strict Exact Match (equals)</option>
          <option value="contains">Contains Substring</option>
          <option value="regex">Matches Regex Pattern</option>
          <option value="startsWith">Starts With</option>
          <option value="endsWith">Ends With</option>
        </select>
        <div class="modal-label">Expected Value:</div>
        <input id="modal-assert-val" class="modal-input" type="text" placeholder="Expected text..." />
        <div class="modal-actions">
          <button id="modal-assert-cancel" class="modal-btn modal-btn-cancel">Cancel</button>
          <button id="modal-assert-save" class="modal-btn modal-btn-save">Add Assertion</button>
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
    setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function updateBadge() {
    const count = flowState.steps.length;
    const badgeText = shadow.getElementById("badge-text");
    const badge = shadow.getElementById("badge");
    const btnPause = shadow.getElementById("btn-pause");
    const btnConfig = shadow.getElementById("btn-config");
    const tabStepsCount = shadow.getElementById("tab-steps-count");
    const tabVarsCount = shadow.getElementById("tab-vars-count");
    const subtitle = shadow.getElementById("drawer-subtitle");

    if (badgeText) {
      badgeText.innerText = flowState.isPaused ? \`PAUSED (\${count})\` : \`REC (\${count})\`;
    }
    if (badge) {
      badge.classList.toggle("paused", flowState.isPaused);
    }
    if (btnPause) {
      btnPause.innerText = flowState.isPaused ? "▶️ Resume" : "⏸️ Pause";
      btnPause.classList.toggle("active", flowState.isPaused);
    }
    if (btnConfig) {
      btnConfig.innerText = \`⚙️ Config (\${count})\`;
      btnConfig.classList.toggle("active", isDrawerOpen);
    }
    if (tabStepsCount) tabStepsCount.innerText = String(count);
    if (tabVarsCount) tabVarsCount.innerText = String(Object.keys(flowState.variables).length);
    if (subtitle) {
      subtitle.innerText = \`Flow: \${flowState.name} • \${count} steps • \${Object.keys(flowState.variables).length} variables\`;
    }
  }

  function renderStepsList() {
    const container = shadow.getElementById("steps-list-container");
    if (!container) return;

    if (flowState.steps.length === 0) {
      container.innerHTML = '<div class="empty-state">No steps recorded yet. Click or type on the page to begin!</div>';
      return;
    }

    container.innerHTML = "";
    flowState.steps.forEach((step, idx) => {
      const card = document.createElement("div");
      card.className = "step-item";

      const action = step.action || "step";
      const pillClass = "pill-" + action.toLowerCase();
      const stepName = step.name || \`\${action.toUpperCase()} Step \${idx + 1}\`;

      let detail = "";
      if (step.action === "goto") detail = step.url;
      else if (step.action === "click") detail = step.selector + (step.text ? \` (strict: "\${step.text}")\` : "");
      else if (step.action === "type") detail = \`"\${step.text}" -> \${step.selector}\`;
      else if (step.action === "extract") detail = \`"\${step.as}" from \${step.selector}\`;
      else if (step.action === "extractMultiple") detail = \`"\${step.as}" from \${step.containerSelector}\`;
      else if (step.action === "assert") detail = \`\${step.selector} equals "\${step.equals || step.text}"\`;
      else if (step.action === "wait") detail = \`Duration: \${step.durationMs}ms\`;
      else if (step.action === "waitForSelector") detail = step.selector;
      else if (step.action === "eval") detail = step.code || step.script;
      else if (step.action === "screenshot") detail = step.path || "Screenshot";

      card.innerHTML = \`
        <div class="step-item-left">
          <div class="step-index-badge">#\${idx + 1}</div>
          <div class="step-action-pill \${pillClass}">\${action}</div>
          <div class="step-info">
            <div class="step-name">\${stepName}</div>
            <div class="step-detail">\${detail}</div>
          </div>
        </div>
        <div class="step-actions">
          <button class="btn-icon btn-icon-up" data-idx="\${idx}" title="Move Up" \${idx === 0 ? "disabled style='opacity:0.3;cursor:default;'" : ""}>↑</button>
          <button class="btn-icon btn-icon-down" data-idx="\${idx}" title="Move Down" \${idx === flowState.steps.length - 1 ? "disabled style='opacity:0.3;cursor:default;'" : ""}>↓</button>
          <button class="btn-icon btn-icon-del" data-idx="\${idx}" title="Delete Step">🗑️</button>
        </div>
      \`;

      card.querySelector(".btn-icon-up")?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (idx > 0) {
          const temp = flowState.steps[idx];
          flowState.steps[idx] = flowState.steps[idx - 1];
          flowState.steps[idx - 1] = temp;
          persistState();
          renderDrawer();
          emitRecordEvent({ type: "moveStep", fromIndex: idx, toIndex: idx - 1 });
          showToast(\`Moved step #\${idx + 1} up\`);
        }
      });

      card.querySelector(".btn-icon-down")?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (idx < flowState.steps.length - 1) {
          const temp = flowState.steps[idx];
          flowState.steps[idx] = flowState.steps[idx + 1];
          flowState.steps[idx + 1] = temp;
          persistState();
          renderDrawer();
          emitRecordEvent({ type: "moveStep", fromIndex: idx, toIndex: idx + 1 });
          showToast(\`Moved step #\${idx + 1} down\`);
        }
      });

      card.querySelector(".btn-icon-del")?.addEventListener("click", (e) => {
        e.stopPropagation();
        const removed = flowState.steps.splice(idx, 1)[0];
        persistState();
        renderDrawer();
        emitRecordEvent({ type: "deleteStep", index: idx });
        showToast(\`Deleted step #\${idx + 1} (\${removed?.action || "step"})\`, true);
      });

      container.appendChild(card);
    });
  }

  function renderJsonViewer() {
    const viewer = shadow.getElementById("json-viewer");
    if (!viewer) return;
    const flowDef = {
      name: flowState.name,
      description: \`Recorded workflow (\${flowState.steps.length} steps)\`,
      variables: flowState.variables,
      steps: flowState.steps
    };
    viewer.innerText = JSON.stringify(flowDef, null, 2);
  }

  function renderVarsList() {
    const container = shadow.getElementById("vars-list");
    if (!container) return;
    const keys = Object.keys(flowState.variables);
    if (keys.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding: 20px;">No variables defined yet.</div>';
      return;
    }
    container.innerHTML = "";
    keys.forEach((key) => {
      const row = document.createElement("div");
      row.className = "var-item";
      row.innerHTML = \`
        <div>
          <span class="var-key">\${key}</span>: <span class="var-val">"\${flowState.variables[key]}"</span>
        </div>
        <button class="btn-icon btn-icon-del" title="Delete Variable">🗑️</button>
      \`;
      row.querySelector(".btn-icon-del")?.addEventListener("click", () => {
        delete flowState.variables[key];
        persistState();
        renderDrawer();
        emitRecordEvent({ type: "setVariables", variables: flowState.variables });
        showToast(\`Deleted variable \${key}\`, true);
      });
      container.appendChild(row);
    });
  }

  function renderDrawer() {
    updateBadge();
    if (!isDrawerOpen) return;
    renderStepsList();
    renderJsonViewer();
    renderVarsList();
  }

  // Drawer Toggle & Tabs
  const drawerOverlay = shadow.getElementById("drawer-overlay");
  const btnConfig = shadow.getElementById("btn-config");
  const btnDrawerClose = shadow.getElementById("btn-drawer-close");

  function toggleDrawer(open) {
    isDrawerOpen = open !== undefined ? open : !isDrawerOpen;
    drawerOverlay?.classList.toggle("open", isDrawerOpen);
    if (isDrawerOpen) {
      renderDrawer();
    }
    updateBadge();
  }

  btnConfig?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDrawer();
  });

  btnDrawerClose?.addEventListener("click", () => toggleDrawer(false));
  drawerOverlay?.addEventListener("click", (e) => {
    if (e.target === drawerOverlay) toggleDrawer(false);
  });

  // Tab Switching
  shadow.querySelectorAll(".drawer-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      shadow.querySelectorAll(".drawer-tab").forEach((t) => t.classList.remove("active"));
      shadow.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      const tabKey = tab.getAttribute("data-tab");
      shadow.getElementById(\`panel-\${tabKey}\`)?.classList.add("active");
      if (tabKey === "json") renderJsonViewer();
      if (tabKey === "steps") renderStepsList();
      if (tabKey === "vars") renderVarsList();
    });
  });

  // Copy JSON Button
  shadow.getElementById("btn-copy-json")?.addEventListener("click", () => {
    const viewer = shadow.getElementById("json-viewer");
    if (viewer) {
      navigator.clipboard?.writeText(viewer.innerText);
      showToast("✓ Copied Workflow JSON to Clipboard!");
    }
  });

  // Add Variable Form
  shadow.getElementById("btn-add-var")?.addEventListener("click", () => {
    const keyInput = shadow.getElementById("new-var-key");
    const valInput = shadow.getElementById("new-var-val");
    const key = keyInput?.value?.trim();
    const val = valInput?.value?.trim() || "";
    if (key) {
      flowState.variables[key] = val;
      if (keyInput) keyInput.value = "";
      if (valInput) valInput.value = "";
      persistState();
      renderDrawer();
      emitRecordEvent({ type: "addVariable", key, value: val });
      showToast(\`Added variable "\${key}"\`);
    }
  });

  // Custom Step Creators in Drawer
  shadow.getElementById("btn-submit-wait")?.addEventListener("click", () => {
    const msInput = shadow.getElementById("add-wait-ms");
    const ms = Number(msInput?.value) || 1000;
    const step = {
      name: \`Wait \${ms}ms\`,
      action: "wait",
      durationMs: ms
    };
    flowState.steps.push(step);
    persistState();
    renderDrawer();
    emitRecordEvent({ type: "wait", durationMs: ms, name: step.name });
    showToast(\`Added Wait step (\${ms}ms)\`);
  });

  shadow.getElementById("btn-submit-waitfor")?.addEventListener("click", () => {
    const selInput = shadow.getElementById("add-waitfor-sel");
    const textInput = shadow.getElementById("add-waitfor-text");
    const sel = selInput?.value?.trim();
    const text = textInput?.value?.trim();
    if (!sel && !text) return;
    const step = {
      name: \`Wait for \${sel || text}\`,
      action: "waitForSelector",
      selector: sel || undefined,
      text: text || undefined,
      strictText: text ? true : undefined
    };
    flowState.steps.push(step);
    if (selInput) selInput.value = "";
    if (textInput) textInput.value = "";
    persistState();
    renderDrawer();
    emitRecordEvent({ type: "waitForSelector", selector: sel, text, strictText: Boolean(text), name: step.name });
    showToast(\`Added WaitForSelector step\`);
  });

  shadow.getElementById("btn-submit-eval")?.addEventListener("click", () => {
    const codeInput = shadow.getElementById("add-eval-code");
    const varInput = shadow.getElementById("add-eval-var");
    const code = codeInput?.value?.trim();
    const as = varInput?.value?.trim();
    if (!code) return;
    const step = {
      name: \`Eval JS\${as ? \` -> "\${as}"\` : ""}\`,
      action: "eval",
      code,
      as: as || undefined
    };
    flowState.steps.push(step);
    if (codeInput) codeInput.value = "";
    if (varInput) varInput.value = "";
    persistState();
    renderDrawer();
    emitRecordEvent({ type: "eval", code, as: as || undefined, name: step.name });
    showToast(\`Added Eval step\`);
  });

  shadow.getElementById("btn-submit-goto")?.addEventListener("click", () => {
    const urlInput = shadow.getElementById("add-goto-url");
    const url = urlInput?.value?.trim();
    if (!url) return;
    const step = {
      name: \`Navigate to \${url}\`,
      action: "goto",
      url
    };
    flowState.steps.push(step);
    if (urlInput) urlInput.value = "";
    persistState();
    renderDrawer();
    emitRecordEvent({ type: "goto", url, name: step.name });
    showToast(\`Added Goto step (\${url})\`);
  });

  // High-performance GPU Dragging with requestAnimationFrame
  const barWrapper = shadow.getElementById("bar-wrapper");
  const dragHandle = shadow.getElementById("drag-handle");
  let isDragging = false;
  let dragStartX = 0, dragStartY = 0, initialPosX = 0, initialPosY = 0;
  let curPosX = 0, curPosY = 0;
  let dragRafId = null;

  dragHandle?.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const rect = barWrapper.getBoundingClientRect();
    initialPosX = rect.left;
    initialPosY = rect.top;
    barWrapper.style.left = "0px";
    barWrapper.style.top = "0px";
    barWrapper.style.bottom = "auto";
    barWrapper.style.transform = \`translate3d(\${initialPosX}px, \${initialPosY}px, 0)\`;
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging || !barWrapper) return;
    curPosX = initialPosX + (e.clientX - dragStartX);
    curPosY = initialPosY + (e.clientY - dragStartY);
    if (!dragRafId) {
      dragRafId = requestAnimationFrame(() => {
        barWrapper.style.transform = \`translate3d(\${curPosX}px, \${curPosY}px, 0)\`;
        dragRafId = null;
      });
    }
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      if (dragRafId) {
        cancelAnimationFrame(dragRafId);
        dragRafId = null;
      }
      initialPosX = curPosX;
      initialPosY = curPosY;
    }
  });

  // Collapse / Expand toggle
  const btnToggle = shadow.getElementById("btn-toggle");
  const bar = shadow.getElementById("bar");
  btnToggle?.addEventListener("click", () => {
    isCollapsed = !isCollapsed;
    bar?.classList.toggle("collapsed", isCollapsed);
    if (btnToggle) btnToggle.innerText = isCollapsed ? "▶" : "◀";
  });

  // Modals management
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

  // Assertion Modal Handlers
  let assertCallback = null;
  function openAssertModal(selector, preview, onConfirm) {
    const modalOverlay = shadow.getElementById("modal-assert-overlay");
    const modalPreview = shadow.getElementById("modal-assert-preview");
    const modalVal = shadow.getElementById("modal-assert-val");

    if (modalPreview) modalPreview.innerText = \`Selector: \${selector}\\nText: "\${preview}"\`;
    if (modalVal) {
      modalVal.value = preview;
      setTimeout(() => modalVal.focus(), 50);
    }

    assertCallback = onConfirm;
    modalOverlay?.classList.add("open");
  }

  function closeAssertModal() {
    const modalOverlay = shadow.getElementById("modal-assert-overlay");
    modalOverlay?.classList.remove("open");
    assertCallback = null;
  }

  shadow.getElementById("modal-assert-cancel")?.addEventListener("click", () => {
    closeAssertModal();
    showToast("Assertion cancelled", true);
  });

  shadow.getElementById("modal-assert-save")?.addEventListener("click", () => {
    const typeSelect = shadow.getElementById("modal-assert-type");
    const valInput = shadow.getElementById("modal-assert-val");
    const type = typeSelect?.value || "strict";
    const val = valInput?.value ?? "";
    if (assertCallback) {
      assertCallback(type, val);
    }
    closeAssertModal();
  });

  function mountHud() {
    if (!document.getElementById("__cdp_recorder_hud__") && (document.body || document.documentElement)) {
      (document.body || document.documentElement).appendChild(hudContainer);
      updateBadge();
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
  const btnAssert = shadow.getElementById("btn-assert");
  const btnWait = shadow.getElementById("btn-wait");
  const btnShot = shadow.getElementById("btn-shot");
  const btnUndo = shadow.getElementById("btn-undo");
  const btnStop = shadow.getElementById("btn-stop");
  const tooltip = shadow.getElementById("tooltip");

  const togglePause = (e) => {
    e?.stopPropagation();
    flowState.isPaused = !flowState.isPaused;
    persistState();
    updateBadge();
    showToast(flowState.isPaused ? "⏸️ Recording paused" : "▶️ Recording resumed");
    emitRecordEvent({ type: flowState.isPaused ? "pause" : "resume" });
  };

  btnPause?.addEventListener("click", togglePause);
  shadow.getElementById("badge")?.addEventListener("click", togglePause);

  btnExtract?.addEventListener("click", (e) => {
    e.stopPropagation();
    isExtractMode = !isExtractMode;
    isListExtractMode = false;
    isAssertMode = false;
    btnExtract.classList.toggle("active", isExtractMode);
    btnList?.classList.remove("active");
    btnAssert?.classList.remove("active-assert");
    showToast(isExtractMode ? "🔍 Extract Mode ON: Click any element to capture" : "Extract Mode OFF");
  });

  btnList?.addEventListener("click", (e) => {
    e.stopPropagation();
    isListExtractMode = !isListExtractMode;
    isExtractMode = false;
    isAssertMode = false;
    btnList.classList.toggle("active", isListExtractMode);
    btnExtract?.classList.remove("active");
    btnAssert?.classList.remove("active-assert");
    showToast(isListExtractMode ? "📊 List Mode ON: Click one item card to extract all repeated items" : "List Mode OFF");
  });

  btnAssert?.addEventListener("click", (e) => {
    e.stopPropagation();
    isAssertMode = !isAssertMode;
    isExtractMode = false;
    isListExtractMode = false;
    btnAssert.classList.toggle("active-assert", isAssertMode);
    btnExtract?.classList.remove("active");
    btnList?.classList.remove("active");
    showToast(isAssertMode ? "🔎 Assert Mode ON: Click any element to assert" : "Assert Mode OFF");
  });

  btnWait?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDrawer(true);
    shadow.querySelectorAll(".drawer-tab").forEach((t) => t.classList.remove("active"));
    shadow.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    const addTab = shadow.querySelector('.drawer-tab[data-tab="add"]');
    addTab?.classList.add("active");
    shadow.getElementById("panel-add")?.classList.add("active");
    shadow.getElementById("add-wait-ms")?.focus();
  });

  btnShot?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (flowState.isPaused) return;
    const shotPath = \`{{outputDir}}/screenshot-\${Date.now()}.png\`;
    const step = {
      name: \`Capture Screenshot at Step \${flowState.steps.length + 1}\`,
      action: "screenshot",
      path: shotPath
    };
    flowState.steps.push(step);
    persistState();
    renderDrawer();
    emitRecordEvent({ type: "screenshot", path: shotPath, url: window.location.href });
    showToast("📸 Screenshot step added!");
  });

  btnUndo?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (flowState.steps.length > 0) {
      const removed = flowState.steps.pop();
      persistState();
      renderDrawer();
      emitRecordEvent({ type: "undo" });
      showToast(\`↩ Undone: \${removed?.name || removed?.action}\`, true);
    }
  });

  btnStop?.addEventListener("click", (e) => {
    e.stopPropagation();
    emitRecordEvent({ type: "finish" });
  });

  // Fast Selector Engine (No Expensive Global DOM Scans)
  function getBestSelector(el) {
    if (!el || el === document.body || el === document.documentElement) return "body";
    if (el.closest && el.closest("#__cdp_recorder_hud__")) return null;

    const clickableParent = el.closest("button, a, [role='button'], input[type='submit']");
    if (clickableParent && clickableParent !== el && !isExtractMode && !isListExtractMode && !isAssertMode) {
      el = clickableParent;
    }

    if (el.id) return '#' + CSS.escape(el.id);
    
    if (el.name) {
      return el.tagName.toLowerCase() + '[name="' + CSS.escape(el.name) + '"]';
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

    if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\\s+/).filter(c => c && !c.includes(':') && !c.includes('/'));
      if (classes.length > 0) {
        return el.tagName.toLowerCase() + '.' + CSS.escape(classes[0]);
      }
    }

    const path = [];
    let current = el;
    let depth = 0;
    while (current && current !== document.body && current !== document.documentElement && depth < 5) {
      depth++;
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        path.unshift('#' + CSS.escape(current.id));
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
    return path.join(' > ') || el.tagName.toLowerCase();
  }

  function findRepeatedContainer(el) {
    let current = el;
    let depth = 0;
    while (current && current !== document.body && depth < 4) {
      depth++;
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\\s+/).filter(c => c && !c.includes(':'));
        if (classes.length > 0) {
          const sel = current.tagName.toLowerCase() + '.' + classes[0];
          return { selector: sel, count: current.parentElement ? current.parentElement.children.length : 1 };
        }
      }
      if (current.tagName.toLowerCase() === 'tr') {
        const sel = current.className ? 'tr.' + current.className.split(' ')[0] : 'tr';
        return { selector: sel, count: current.parentElement ? current.parentElement.children.length : 1 };
      }
      current = current.parentElement;
    }
    return { selector: el.tagName.toLowerCase(), count: 1 };
  }

  // Lightweight Hover Inspector
  let tooltipRafId = null;
  document.addEventListener("mouseover", (e) => {
    if (flowState.isPaused || (!isExtractMode && !isListExtractMode && !isAssertMode && !e.shiftKey && !e.altKey)) return;
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
        tooltip.style.transform = \`translate3d(\${e.clientX + 12}px, \${e.clientY + 12}px, 0)\`;
        tooltip.innerText = \`📊 List: \${containerInfo.selector}\`;
      }
    } else if (isAssertMode || e.altKey) {
      hoveredEl.style.outline = "2px dashed #f59e0b";
      if (tooltip) {
        tooltip.style.display = "block";
        tooltip.style.transform = \`translate3d(\${e.clientX + 12}px, \${e.clientY + 12}px, 0)\`;
        const text = target.innerText?.trim() || target.textContent?.trim() || "";
        tooltip.innerText = \`🔎 Assert: "\${text.slice(0, 25)}"\`;
      }
    } else {
      hoveredEl.style.outline = "2px dashed #10b981";
      if (tooltip) {
        tooltip.style.display = "block";
        tooltip.style.transform = \`translate3d(\${e.clientX + 12}px, \${e.clientY + 12}px, 0)\`;
        const sel = getBestSelector(target);
        tooltip.innerText = \`🔍 Extract: \${sel}\`;
      }
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

  // Click Handler
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target || target.closest("#__cdp_recorder_hud__")) return;
    if (flowState.isPaused) {
      e.preventDefault();
      showToast("⏸️ Action ignored (recording is paused)", true);
      return;
    }

    const isExtract = isExtractMode || e.shiftKey;
    const isList = isListExtractMode;
    const isAssert = isAssertMode || e.altKey;
    const selector = getBestSelector(target);
    if (!selector) return;

    // List Extract Mode
    if (isList) {
      e.preventDefault();
      e.stopPropagation();
      const containerInfo = findRepeatedContainer(target);
      const defaultVar = "extractedList";
      
      openVariableModal(
        \`📊 Extract List\`,
        \`Container: \${containerInfo.selector}\`,
        defaultVar,
        (varName) => {
          const step = {
            name: \`Extract List "\${varName}" from \${containerInfo.selector}\`,
            action: 'extractMultiple',
            containerSelector: containerInfo.selector,
            as: varName,
            limit: 20,
            fields: {
              title: "a, h1, h2, h3, .title, p",
              link: "a@href"
            }
          };
          flowState.steps.push(step);
          persistState();
          renderDrawer();

          emitRecordEvent({
            type: 'extractMultiple',
            containerSelector: containerInfo.selector,
            as: varName,
            limit: 20,
            fields: {
              title: "a, h1, h2, h3, .title, p",
              link: "a@href"
            }
          });

          showToast(\`✓ Extract List: Saved to "\${varName}"\`);
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
          const step = {
            name: \`Extract "\${varName}" from \${selector}\`,
            action: 'extract',
            selector,
            as: varName,
            text: text.slice(0, 100) || undefined,
            strictText: true
          };
          flowState.steps.push(step);
          persistState();
          renderDrawer();

          emitRecordEvent({
            type: 'extract',
            selector,
            as: varName,
            sampleValue: text.slice(0, 40),
            text: text.slice(0, 100) || undefined,
            url: window.location.href
          });

          showToast(\`✓ Extracted "\${varName}": "\${text.slice(0, 20)}..."\`);
        }
      );

      if (hoveredEl) hoveredEl.style.outline = "";
      isExtractMode = false;
      btnExtract?.classList.remove("active");
      if (tooltip) tooltip.style.display = "none";
      return;
    }

    // Assertion Mode
    if (isAssert) {
      e.preventDefault();
      e.stopPropagation();
      const text = target.innerText?.trim() || target.textContent?.trim() || ('value' in target ? String(target.value).trim() : "") || "";
      
      if (isAssertMode) {
        openAssertModal(selector, text, (assertType, expectedVal) => {
          const step = {
            name: \`Assert \${selector} \${assertType === 'contains' ? 'contains' : 'equals'} "\${expectedVal.slice(0, 30)}"\`,
            action: 'assert',
            selector,
            text: expectedVal,
            strictText: assertType === 'strict',
            equals: assertType === 'strict' ? expectedVal : undefined,
            contains: assertType === 'contains' ? expectedVal : undefined,
            matches: assertType === 'regex' ? expectedVal : undefined,
            startsWith: assertType === 'startsWith' ? expectedVal : undefined,
            endsWith: assertType === 'endsWith' ? expectedVal : undefined
          };
          flowState.steps.push(step);
          persistState();
          renderDrawer();

          emitRecordEvent({
            type: 'assert',
            selector,
            text: expectedVal,
            equals: assertType === 'strict' ? expectedVal : undefined,
            contains: assertType === 'contains' ? expectedVal : undefined,
            matches: assertType === 'regex' ? expectedVal : undefined,
            startsWith: assertType === 'startsWith' ? expectedVal : undefined,
            endsWith: assertType === 'endsWith' ? expectedVal : undefined,
            strictText: assertType === 'strict',
            url: window.location.href
          });
          showToast(\`✓ Assert added: "\${expectedVal.slice(0, 20)}..."\`);
        });

        isAssertMode = false;
        btnAssert?.classList.remove("active-assert");
        if (hoveredEl) hoveredEl.style.outline = "";
        if (tooltip) tooltip.style.display = "none";
        return;
      }

      // Alt+Click instant strict assert
      const step = {
        name: \`Assert \${selector} strictly equals "\${text.slice(0, 40)}"\`,
        action: 'assert',
        selector,
        text: text.slice(0, 100),
        equals: text.slice(0, 100),
        strictText: true
      };
      flowState.steps.push(step);
      persistState();
      renderDrawer();

      emitRecordEvent({
        type: 'assert',
        selector,
        text: text.slice(0, 100),
        equals: text.slice(0, 100),
        strictText: true,
        url: window.location.href
      });
      showToast(\`✓ Strict Assert added: equals "\${text.slice(0, 20)}..."\`);
      return;
    }

    // Normal Click
    const text = target.innerText?.trim() || target.textContent?.trim() || ('value' in target ? String(target.value).trim() : '') || '';
    const stepName = text ? \`Click "\${text.slice(0, 40)}"\` : \`Click \${selector}\`;
    const step = {
      name: stepName,
      action: 'click',
      selector,
      text: text ? text.slice(0, 60) : undefined,
      strictText: text ? true : undefined
    };
    flowState.steps.push(step);
    persistState();
    renderDrawer();

    emitRecordEvent({
      type: 'click',
      selector,
      text: text.slice(0, 60),
      strictText: Boolean(text),
      url: window.location.href
    });
    showToast(\`✓ Click: \${selector}\${text ? \` ("\${text.slice(0, 15)}")\` : ''}\`);
  }, true);

  // Input / Change listener
  document.addEventListener('change', (e) => {
    const target = e.target;
    if (!target || !('value' in target) || target.closest("#__cdp_recorder_hud__")) return;
    if (flowState.isPaused) return;
    const selector = getBestSelector(target);
    if (!selector) return;

    const targetText = target.placeholder || target.getAttribute('aria-label') || target.name || target.id || '';
    const step = {
      name: \`Type into \${selector}\`,
      action: 'type',
      selector,
      text: target.value,
      targetText: targetText || undefined,
      strictText: true
    };
    flowState.steps.push(step);
    persistState();
    renderDrawer();

    emitRecordEvent({
      type: 'type',
      selector,
      value: target.value,
      targetText,
      strictText: true,
      url: window.location.href
    });
    showToast(\`✓ Input: "\${target.value}"\`);
  }, true);

  // Global State Synchronizer for Node process updates
  window.__cdpSyncState = (serializedState) => {
    try {
      const parsed = typeof serializedState === 'string' ? JSON.parse(serializedState) : serializedState;
      flowState = { ...flowState, ...parsed };
      persistState();
      renderDrawer();
    } catch {}
  };

  window.__cdpHydrate = () => {
    mountHud();
    renderDrawer();
  };
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

		const flowName =
			outputPath
				.split("/")
				.pop()
				?.replace(/\.json$/i, "")
				.replace(/[^a-z0-9]/gi, " ")
				.trim() || "Recorded Flow";

		console.log(
			`\n${colors.bold}${colors.red}🔴 Launching Browser in Advanced Recording Mode...${colors.reset}`,
		);
		console.log(
			`${colors.dim}═══════════════════════════════════════════════════════════════════════════════════════════${colors.reset}`,
		);
		console.log(
			`  🎯 ${colors.bold}Target Website${colors.reset}       : ${colors.cyan}${initialUrl}${colors.reset}`,
		);
		console.log(
			`  📁 ${colors.bold}Output Flow Path${colors.reset}     : ${colors.green}${outputPath}${colors.reset}`,
		);
		console.log(
			`${colors.dim}───────────────────────────────────────────────────────────────────────────────────────────${colors.reset}`,
		);
		console.log(
			`  🖱️  ${colors.bold}Normal Click${colors.reset}         : Records a smart click action`,
		);
		console.log(
			`  ⌨️  ${colors.bold}Type into Input${colors.reset}      : Records typed text with target label`,
		);
		console.log(
			`  🔍 ${colors.bold}Extract Text (HUD)${colors.reset}   : Extracts element text into a variable`,
		);
		console.log(
			`  📊 ${colors.bold}Extract List (HUD)${colors.reset}   : Extracts table rows / repeating item cards`,
		);
		console.log(
			`  🔎 ${colors.bold}Assert Text (HUD)${colors.reset}    : Asserts element text (Strict, Contains, Regex)`,
		);
		console.log(
			`  ⏱️  ${colors.bold}Add Wait Step (HUD)${colors.reset}  : Injects custom delay or wait for selector`,
		);
		console.log(
			`  ⚙️  ${colors.bold}Live Config (HUD)${colors.reset}    : ${colors.magenta}Open Live Steps & JSON Config Inspector${colors.reset}`,
		);
		console.log(
			`  ↩  ${colors.bold}Undo Step${colors.reset}             : Reverts the last recorded action`,
		);
		console.log(
			`  🛑 ${colors.bold}Finish & Save${colors.reset}         : Saves workflow and closes browser`,
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

			// Inject advanced recorder script on every navigation
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

			const syncStateToBrowser = async () => {
				try {
					await page.evaluate(
						(stateStr) => {
							if ((window as any).__cdpSyncState) {
								(window as any).__cdpSyncState(stateStr);
							}
						},
						JSON.stringify({ name: flowName, steps, variables, isPaused }),
					);
				} catch {}
			};

			// If user closes the browser window or disconnects
			page.client.on("close", triggerFinish);

			// Record navigation events
			page.client.on("Page.frameNavigated", async (params: any) => {
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
						const step: FlowStep = {
							name: `Navigate to ${new URL(frame.url).hostname || frame.url}`,
							action: "goto",
							url: frame.url,
						};
						steps.push(step);
						console.log(
							`  ${colors.cyan}🌐 [NAVIGATE]${colors.reset} ${frame.url} ${colors.dim}(Step ${steps.length})${colors.reset}`,
						);
						await syncStateToBrowser();
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
						} else if (event.type === "deleteStep") {
							const idx = event.index;
							if (typeof idx === "number" && idx >= 0 && idx < steps.length) {
								const removed = steps.splice(idx, 1)[0];
								console.log(
									`  ${colors.red}🗑️  [DELETE] Removed step #${idx + 1}: ${removed?.name || removed?.action}${colors.reset}`,
								);
							}
						} else if (event.type === "moveStep") {
							const { fromIndex, toIndex } = event;
							if (
								typeof fromIndex === "number" &&
								typeof toIndex === "number" &&
								steps[fromIndex] &&
								steps[toIndex]
							) {
								const item = steps.splice(fromIndex, 1)[0]!;
								steps.splice(toIndex, 0, item);
								console.log(
									`  ${colors.blue}↕️  [REORDER] Moved step from #${fromIndex + 1} to #${toIndex + 1}${colors.reset}`,
								);
							}
						} else if (event.type === "addVariable") {
							variables[event.key] = event.value;
							console.log(
								`  ${colors.magenta}🏷️  [VARIABLE] Added variable "${event.key}" = "${event.value}"${colors.reset}`,
							);
						} else if (event.type === "setVariables") {
							Object.keys(variables).forEach((k) => {
								delete variables[k];
							});
							Object.assign(variables, event.variables);
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
								`  ${colors.green}🖱️ [CLICK]${colors.reset} ${event.selector} ${event.text ? colors.dim + `(strict text: "${event.text}")` + colors.reset : ""} ${colors.dim}(Step ${steps.length})${colors.reset}`,
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
								`  ${colors.yellow}⌨️ [TYPE]${colors.reset} ${event.selector} -> "${event.value}" ${event.targetText ? colors.dim + `(target: "${event.targetText}")` + colors.reset : ""} ${colors.dim}(Step ${steps.length})${colors.reset}`,
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
								`  ${colors.magenta}🔍 [EXTRACT]${colors.reset} Saved ${event.selector} as "${event.as}" ${colors.dim}(strict text: "${event.text || event.sampleValue}")${colors.reset} ${colors.dim}(Step ${steps.length})${colors.reset}`,
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
								`  ${colors.cyan}📊 [EXTRACT LIST]${colors.reset} Saved repeated cards "${event.containerSelector}" as "${event.as}" ${colors.dim}(Step ${steps.length})${colors.reset}`,
							);
						} else if (event.type === "assert") {
							const assertVal =
								event.equals ||
								event.text ||
								event.contains ||
								event.matches ||
								event.startsWith ||
								event.endsWith;
							steps.push({
								name:
									event.name ||
									`Assert ${event.selector} strictly equals "${assertVal}"`,
								action: "assert",
								selector: event.selector,
								text: event.text || assertVal,
								equals:
									event.equals || (event.strictText ? assertVal : undefined),
								contains: event.contains || undefined,
								matches: event.matches || undefined,
								startsWith: event.startsWith || undefined,
								endsWith: event.endsWith || undefined,
								strictText: event.strictText ?? true,
							});
							console.log(
								`  ${colors.yellow}🔎 [ASSERT]${colors.reset} ${event.selector} -> "${assertVal}" ${colors.dim}(Step ${steps.length})${colors.reset}`,
							);
						} else if (event.type === "wait") {
							steps.push({
								name: event.name || `Wait ${event.durationMs}ms`,
								action: "wait",
								durationMs: event.durationMs || 1000,
							});
							console.log(
								`  ${colors.blue}⏱️  [WAIT]${colors.reset} Pause for ${event.durationMs}ms ${colors.dim}(Step ${steps.length})${colors.reset}`,
							);
						} else if (event.type === "waitForSelector") {
							steps.push({
								name: event.name || `Wait for ${event.selector || event.text}`,
								action: "waitForSelector",
								selector: event.selector || undefined,
								text: event.text || undefined,
								strictText: event.strictText || undefined,
							});
							console.log(
								`  ${colors.blue}⏳ [WAIT FOR SELECTOR]${colors.reset} ${event.selector || event.text} ${colors.dim}(Step ${steps.length})${colors.reset}`,
							);
						} else if (event.type === "eval") {
							steps.push({
								name: event.name || "Eval JavaScript",
								action: "eval",
								code: event.code,
								as: event.as || undefined,
							});
							console.log(
								`  ${colors.cyan}⚡ [EVAL]${colors.reset} JavaScript snippet ${colors.dim}(Step ${steps.length})${colors.reset}`,
							);
						} else if (event.type === "screenshot") {
							steps.push({
								name: `Capture Screenshot at Step ${steps.length + 1}`,
								action: "screenshot",
								path:
									event.path || `{{outputDir}}/screenshot-${Date.now()}.png`,
							});
							console.log(
								`  ${colors.cyan}📸 [SCREENSHOT]${colors.reset} Added screenshot step ${colors.dim}(Step ${steps.length})${colors.reset}`,
							);
						} else if (event.type === "goto") {
							steps.push({
								name: event.name || `Navigate to ${event.url}`,
								action: "goto",
								url: event.url,
							});
							console.log(
								`  ${colors.cyan}🌐 [GOTO]${colors.reset} ${event.url} ${colors.dim}(Step ${steps.length})${colors.reset}`,
							);
						} else if (event.type === "finish") {
							triggerFinish();
						}
					} catch {}
				}
			});

			// Navigate to initial URL
			await page.goto(initialUrl);
			await syncStateToBrowser();

			// Interactive Terminal CLI while Recording
			rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			});

			console.log(
				`\n${colors.bold}${colors.magenta}👉 Terminal Controls:${colors.reset}`,
			);
			console.log(
				`   ${colors.cyan}c${colors.reset} or ${colors.cyan}config${colors.reset}  : View live JSON workflow configuration`,
			);
			console.log(
				`   ${colors.cyan}s${colors.reset} or ${colors.cyan}steps${colors.reset}   : View step-by-step breakdown`,
			);
			console.log(
				`   ${colors.cyan}w <ms>${colors.reset}         : Insert wait delay (e.g. 'w 2000')`,
			);
			console.log(
				`   ${colors.cyan}u${colors.reset} or ${colors.cyan}undo${colors.reset}    : Undo last recorded step`,
			);
			console.log(
				`   ${colors.cyan}d <num>${colors.reset}        : Delete a specific step number (e.g. 'd 2')`,
			);
			console.log(
				`   ${colors.cyan}v <k>=<v>${colors.reset}      : Add workflow variable (e.g. 'v query=bun')`,
			);
			console.log(
				`   ${colors.cyan}p${colors.reset} or ${colors.cyan}pause${colors.reset}   : Toggle pause/resume`,
			);
			console.log(
				`   ${colors.cyan}f${colors.reset} or ${colors.cyan}[Enter]${colors.reset} : Finish and save flow\n`,
			);

			rl.on("line", async (line) => {
				const trimmed = line.trim();

				if (
					!trimmed ||
					trimmed === "f" ||
					trimmed === "finish" ||
					trimmed === "done" ||
					trimmed === "exit"
				) {
					rl?.close();
					triggerFinish();
					return;
				}

				const [cmd, ...cmdArgs] = trimmed.split(" ");
				const argStr = cmdArgs.join(" ");

				switch (cmd?.toLowerCase()) {
					case "c":
					case "config": {
						console.log(
							`\n${colors.bold}${colors.cyan}════════════════════ LIVE FLOW CONFIG ════════════════════${colors.reset}`,
						);
						console.log(
							JSON.stringify(
								{
									name: flowName,
									description: `Recorded workflow (${steps.length} steps)`,
									variables,
									steps,
								},
								null,
								2,
							),
						);
						console.log(
							`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`,
						);
						break;
					}

					case "s":
					case "steps": {
						console.log(
							`\n${colors.bold}${colors.cyan}Recorded Steps (${steps.length}):${colors.reset}`,
						);
						if (steps.length === 0) {
							console.log(
								`  ${colors.dim}(No steps recorded yet)${colors.reset}\n`,
							);
						} else {
							steps.forEach((st, idx) => {
								const s = st as any;
								const details = s.selector
									? `sel: ${s.selector}`
									: s.url
										? `url: ${s.url}`
										: s.durationMs
											? `duration: ${s.durationMs}ms`
											: s.text || "";
								console.log(
									`  ${colors.bold}[${idx + 1}] ${st.action.toUpperCase()}${colors.reset} - ${st.name || st.action} ${colors.dim}(${details})${colors.reset}`,
								);
							});
							console.log();
						}
						break;
					}

					case "w":
					case "wait": {
						const ms = Number(cmdArgs[0]) || 1000;
						steps.push({
							name: `Wait ${ms}ms`,
							action: "wait",
							durationMs: ms,
						});
						console.log(
							`  ${colors.green}✓ [WAIT]${colors.reset} Added ${ms}ms delay (Step ${steps.length})`,
						);
						await syncStateToBrowser();
						break;
					}

					case "u":
					case "undo": {
						const popped = steps.pop();
						if (popped) {
							console.log(
								`  ${colors.yellow}✓ [UNDO]${colors.reset} Removed: ${popped.name || popped.action}`,
							);
							await syncStateToBrowser();
						} else {
							console.log(`  ${colors.dim}No steps to undo${colors.reset}`);
						}
						break;
					}

					case "d":
					case "del":
					case "delete": {
						const num = Number(cmdArgs[0]);
						if (num >= 1 && num <= steps.length) {
							const removed = steps.splice(num - 1, 1)[0];
							console.log(
								`  ${colors.red}✓ [DELETE]${colors.reset} Removed step #${num}: ${removed?.name || removed?.action}`,
							);
							await syncStateToBrowser();
						} else {
							console.log(
								`  ${colors.red}Invalid step number. Choose 1 to ${steps.length}.${colors.reset}`,
							);
						}
						break;
					}

					case "v":
					case "var": {
						const [k, v] = argStr.split("=");
						if (k && v !== undefined) {
							variables[k.trim()] = v.trim();
							console.log(
								`  ${colors.magenta}✓ [VARIABLE]${colors.reset} Set "${k.trim()}" = "${v.trim()}"`,
							);
							await syncStateToBrowser();
						} else {
							console.log(
								`  ${colors.red}Usage: v <variable_name>=<default_value>${colors.reset}`,
							);
						}
						break;
					}

					case "p":
					case "pause": {
						isPaused = !isPaused;
						console.log(
							isPaused
								? `  ${colors.yellow}⏸️  [PAUSED] Recording suspended${colors.reset}`
								: `  ${colors.green}▶️  [RESUMED] Recording active${colors.reset}`,
						);
						await syncStateToBrowser();
						break;
					}

					case "h":
					case "help": {
						console.log(`\n${colors.bold}Available Commands:${colors.reset}`);
						console.log(
							"  c, config   - Print live JSON workflow configuration",
						);
						console.log("  s, steps    - Print step-by-step breakdown");
						console.log("  w <ms>      - Insert wait delay");
						console.log("  u, undo     - Undo last recorded step");
						console.log("  d <num>     - Delete step by index");
						console.log("  v <k>=<v>   - Set workflow variable");
						console.log("  p, pause    - Toggle pause / resume");
						console.log("  f, finish   - Save and exit\n");
						break;
					}

					default: {
						console.log(
							`${colors.dim}Unknown command "${cmd}". Type 'help' or press Enter to finish.${colors.reset}`,
						);
						break;
					}
				}
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
