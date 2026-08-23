import { ICONS } from "./hud-icons.js";
import { HUD_TEMPLATE_MODALS } from "./hud-template-modals.js";

export const HUD_HTML = `
  <div id="bar" class="hud-bar">
    <div id="drag-handle" class="hud-handle" title="Drag recorder toolbar" aria-label="Drag recorder toolbar">${ICONS.grip}</div>
    <div id="badge" class="hud-badge" title="Pause or resume recording" role="button" tabindex="0">
      <span class="hud-dot"></span>
      <span id="badge-text">REC</span>
      <span id="badge-count" class="hud-count">0</span>
    </div>
    <div class="hud-btn-group">
      <button id="btn-pause" class="hud-btn hud-btn-pause" title="Pause recording">${ICONS.pause}<span class="hud-action-label">Pause</span></button>

      <span class="hud-divider" aria-hidden="true"></span>

      <details id="menu-step" class="hud-menu">
        <summary class="hud-btn hud-menu-trigger" title="Add a workflow step">${ICONS.plus}<span class="hud-action-label">Add step</span>${ICONS.chevronDown}</summary>
        <div class="hud-menu-popover" role="menu" aria-label="Add workflow step">
          <button id="btn-extract" class="hud-menu-item" role="menuitem" title="Select one element and save its text">
            <span class="hud-menu-item-icon">${ICONS.extract}</span><span><strong>Extract value</strong><small>Save text from one element</small></span>
          </button>
          <button id="btn-list" class="hud-menu-item" role="menuitem" title="Select a repeated collection">
            <span class="hud-menu-item-icon">${ICONS.list}</span><span><strong>Extract list</strong><small>Save cards or rows as an array</small></span>
          </button>
          <button id="btn-assert" class="hud-menu-item" role="menuitem" title="Add an expectation for an element">
            <span class="hud-menu-item-icon">${ICONS.assert}</span><span><strong>Assert element</strong><small>Check text, attributes, or visibility</small></span>
          </button>
          <button id="btn-wait" class="hud-menu-item" role="menuitem" title="Add a delay or wait condition">
            <span class="hud-menu-item-icon">${ICONS.wait}</span><span><strong>Wait</strong><small>Add a delay or condition</small></span>
          </button>
        </div>
      </details>

      <details id="menu-capture" class="hud-menu">
        <summary class="hud-btn hud-menu-trigger" title="Open capture tools">${ICONS.screenshot}<span class="hud-action-label">Capture</span>${ICONS.chevronDown}</summary>
        <div class="hud-menu-popover" role="menu" aria-label="Capture tools">
          <button id="btn-shot" class="hud-menu-item" role="menuitem" title="Add a screenshot step">
            <span class="hud-menu-item-icon">${ICONS.screenshot}</span><span><strong>Screenshot</strong><small>Capture the current page</small></span>
          </button>
          <button id="btn-webcam" class="hud-menu-item" role="menuitem" title="Configure a virtual camera feed">
            <span class="hud-menu-item-icon">${ICONS.camera}</span><span><strong id="btn-webcam-label">Virtual camera</strong><small id="btn-webcam-status">Use a video or test feed</small></span>
          </button>
        </div>
      </details>

      <span class="hud-divider" aria-hidden="true"></span>

      <button id="btn-data" class="hud-btn hud-icon-btn hud-btn-data" title="Attach a Google Sheet" aria-label="Attach a Google Sheet">${ICONS.sheets}<span id="btn-data-status" class="hud-data-status" aria-hidden="true"></span></button>
      <button id="btn-config" class="hud-btn hud-icon-btn" title="Open recorded flow configuration" aria-label="Open recorded flow configuration">${ICONS.sliders}<span id="btn-config-count" class="hud-control-count">0</span></button>
      <button id="btn-undo" class="hud-btn hud-icon-btn hud-btn-undo" title="Undo previous step" aria-label="Undo previous step">${ICONS.undo}</button>

      <span class="hud-divider" aria-hidden="true"></span>

      <button id="btn-stop" class="hud-btn hud-btn-stop" title="Complete and persist recording session">${ICONS.check} Finish</button>
    </div>
    <button id="btn-toggle" class="hud-btn hud-btn-toggle" title="Collapse recorder toolbar" aria-label="Collapse recorder toolbar">${ICONS.chevronLeft}</button>
  </div>

  <div id="tooltip" class="hud-tooltip"></div>
  <div id="toast" class="hud-toast"></div>

  <!-- Live Workflow Config Drawer Overlay -->
  <div id="drawer-overlay" class="drawer-overlay" role="dialog" aria-modal="true" aria-labelledby="drawer-title" aria-hidden="true">
    <div class="drawer-card">
      <div class="drawer-header">
        <div>
          <div id="drawer-title" class="drawer-title">${ICONS.sliders} Recorded flow</div>
          <div id="drawer-subtitle" class="drawer-subtitle">Flow: Recorded Flow • 0 steps • 0 variables</div>
        </div>
        <button id="btn-drawer-close" class="drawer-close-btn" title="Close recorded flow" aria-label="Close recorded flow">${ICONS.close}</button>
      </div>
      <div class="drawer-tabs" role="tablist" aria-label="Recorded flow sections">
        <button class="drawer-tab active" data-tab="steps" role="tab" aria-selected="true" aria-controls="panel-steps">${ICONS.list} Steps <span id="tab-steps-count" class="drawer-tab-count">0</span></button>
        <button class="drawer-tab" data-tab="vars" role="tab" aria-selected="false" aria-controls="panel-vars">${ICONS.variable} Variables <span id="tab-vars-count" class="drawer-tab-count">0</span></button>
        <button class="drawer-tab" data-tab="json" role="tab" aria-selected="false" aria-controls="panel-json">${ICONS.code} JSON</button>
        <button class="drawer-tab" data-tab="add" role="tab" aria-selected="false" aria-controls="panel-add">${ICONS.plus} Insert step</button>
      </div>
      <div class="drawer-body">
        <!-- Steps Panel -->
        <div id="panel-steps" class="tab-panel active" role="tabpanel">
          <div id="steps-list-container" class="steps-list-container"></div>
        </div>

        <!-- Variables Panel -->
        <div id="panel-vars" class="tab-panel" role="tabpanel">
          <div class="drawer-inline-form">
            <input id="new-var-key" class="form-input" placeholder="Variable name (e.g. apiToken)" />
            <input id="new-var-val" class="form-input" placeholder="Value (e.g. secret-123)" />
            <button id="btn-add-var" class="form-btn form-btn-primary">Add variable</button>
          </div>
          <div id="vars-list-container"></div>
        </div>

        <!-- JSON Spec Panel -->
        <div id="panel-json" class="tab-panel" role="tabpanel">
          <div class="drawer-panel-toolbar">
            <button id="btn-copy-json" class="modal-btn">Copy JSON</button>
          </div>
          <textarea id="drawer-json-viewer" class="json-viewer" readonly></textarea>
        </div>

        <!-- Add Step Panel -->
        <div id="panel-add" class="tab-panel" role="tabpanel">
          <div class="insert-step-grid">
            <!-- Custom Wait -->
            <div class="insert-step-card">
              <div class="insert-step-title">${ICONS.wait} Wait</div>
              <div class="insert-step-description">Pause the workflow for a fixed duration.</div>
              <input id="add-wait-ms" class="form-input" type="number" placeholder="Milliseconds (e.g. 2000)" />
              <button id="btn-submit-wait" class="form-btn form-btn-primary">${ICONS.plus} Add wait</button>
            </div>

            <!-- Custom WaitForSelector -->
            <div class="insert-step-card">
              <div class="insert-step-title">${ICONS.extract} Wait for element</div>
              <div class="insert-step-description">Continue when a selector or text appears.</div>
              <div class="form-input-action">
                <input id="add-waitfor-sel" class="form-input" placeholder="CSS selector (e.g. #dashboard)" />
                <button id="btn-target-waitfor" class="form-target-btn" title="Pick an element from the page">${ICONS.extract}<span>Target</span></button>
              </div>
              <input id="add-waitfor-text" class="form-input" placeholder="Or text content" />
              <button id="btn-submit-waitfor" class="form-btn form-btn-sec">${ICONS.plus} Add wait condition</button>
            </div>

            <!-- Custom Eval -->
            <div class="insert-step-card">
              <div class="insert-step-title">${ICONS.code} Run JavaScript</div>
              <div class="insert-step-description">Evaluate code and optionally store its result.</div>
              <input id="add-eval-code" class="form-input" placeholder="e.g. return window.scrollY;" />
              <input id="add-eval-var" class="form-input" placeholder="Store in variable (optional)" />
              <button id="btn-submit-eval" class="form-btn form-btn-sec">${ICONS.plus} Add evaluation</button>
            </div>

            <!-- Custom Goto -->
            <div class="insert-step-card">
              <div class="insert-step-title">${ICONS.globe} Navigate</div>
              <div class="insert-step-description">Open a URL as the next workflow step.</div>
              <input id="add-goto-url" class="form-input" placeholder="https://example.com" />
              <button id="btn-submit-goto" class="form-btn form-btn-sec">${ICONS.plus} Add navigation</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  ${HUD_TEMPLATE_MODALS}
`;
