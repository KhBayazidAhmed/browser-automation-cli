import { ICONS } from "./hud-icons.js";
import { HUD_TEMPLATE_MODALS } from "./hud-template-modals.js";

export const HUD_HTML = `
  <div id="bar" class="hud-bar">
    <div id="drag-handle" class="hud-handle" title="Drag HUD toolbar">${ICONS.grip}</div>
    <div id="badge" class="hud-badge" title="Click to Pause/Resume recording">
      <span class="hud-dot"></span>
      <span id="badge-text">REC (0)</span>
    </div>
    <div class="hud-btn-group">
      <button id="btn-pause" class="hud-btn" title="Pause / Resume flow recording">${ICONS.pause} Pause</button>
      <button id="btn-extract" class="hud-btn" title="Extract text from single targeted element into workflow variable">${ICONS.extract} Extract</button>
      <button id="btn-list" class="hud-btn" title="Extract repeated card / table collection into array">${ICONS.list} Extract List</button>
      <button id="btn-assert" class="hud-btn" title="Add expectation / assertion on element text or attribute">${ICONS.assert} Assert</button>
      <button id="btn-wait" class="hud-btn" title="Insert explicit wait delay or wait condition">${ICONS.wait} Wait</button>
      <button id="btn-shot" class="hud-btn" title="Capture immediate step screenshot">${ICONS.screenshot} Shot</button>
      <button id="btn-webcam" class="hud-btn" title="Inject synthetic camera feed or custom video source">${ICONS.camera} Cam</button>
      <button id="btn-config" class="hud-btn" title="Open live interactive workflow JSON configuration drawer">${ICONS.sliders} Config (<span id="btn-config-count">0</span>)</button>
      <button id="btn-undo" class="hud-btn hud-btn-undo" title="Undo the previous recorded step action">${ICONS.undo} Undo</button>
      <button id="btn-stop" class="hud-btn hud-btn-stop" title="Complete and persist recording session">${ICONS.check} Finish</button>
    </div>
    <button id="btn-toggle" class="hud-btn hud-btn-toggle" style="padding: 0 4px; min-width: 24px;" title="Collapse / expand HUD">${ICONS.chevronLeft}</button>
  </div>

  <div id="tooltip" class="hud-tooltip"></div>
  <div id="toast" class="hud-toast"></div>

  <!-- Live Workflow Config Drawer Overlay -->
  <div id="drawer-overlay" class="drawer-overlay">
    <div class="drawer-card">
      <div class="drawer-header">
        <div>
          <div class="drawer-title">${ICONS.sliders} Recorded Flow Configuration</div>
          <div id="drawer-subtitle" class="drawer-subtitle">Flow: Recorded Flow • 0 steps • 0 variables</div>
        </div>
        <button id="btn-drawer-close" class="drawer-close-btn" title="Close Drawer">${ICONS.close}</button>
      </div>
      <div class="drawer-tabs">
        <button class="drawer-tab active" data-tab="steps">${ICONS.list} Steps (<span id="tab-steps-count">0</span>)</button>
        <button class="drawer-tab" data-tab="vars">${ICONS.variable} Variables (<span id="tab-vars-count">0</span>)</button>
        <button class="drawer-tab" data-tab="json">${ICONS.code} JSON Spec</button>
        <button class="drawer-tab" data-tab="add">${ICONS.plus} Insert Step</button>
      </div>
      <div class="drawer-body">
        <!-- Steps Panel -->
        <div id="panel-steps" class="tab-panel active">
          <div id="steps-list-container" class="steps-list-container"></div>
        </div>

        <!-- Variables Panel -->
        <div id="panel-vars" class="tab-panel">
          <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            <input id="new-var-key" class="form-input" placeholder="Variable Name (e.g. apiToken)" style="flex: 1;" />
            <input id="new-var-val" class="form-input" placeholder="Value (e.g. secret-123)" style="flex: 1;" />
            <button id="btn-add-var" class="form-btn form-btn-primary" style="white-space: nowrap;">Add Variable</button>
          </div>
          <div id="vars-list-container"></div>
        </div>

        <!-- JSON Spec Panel -->
        <div id="panel-json" class="tab-panel">
          <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
            <button id="btn-copy-json" class="modal-btn">Copy JSON</button>
          </div>
          <textarea id="drawer-json-viewer" class="json-viewer" readonly></textarea>
        </div>

        <!-- Add Step Panel -->
        <div id="panel-add" class="tab-panel">
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <!-- Custom Wait -->
            <div style="background: #18181b; padding: 14px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.06);">
              <div class="form-label">${ICONS.wait} Insert Explicit Wait Delay</div>
              <input id="add-wait-ms" class="form-input" type="number" placeholder="Milliseconds (e.g. 2000)" style="margin-bottom: 8px;" />
              <button id="btn-submit-wait" class="form-btn form-btn-primary">${ICONS.plus} Add Wait</button>
            </div>

            <!-- Custom WaitForSelector -->
            <div style="background: #18181b; padding: 14px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.06);">
              <div class="form-label">${ICONS.extract} Insert WaitFor Selector / Text</div>
              <input id="add-waitfor-sel" class="form-input" placeholder="CSS Selector (e.g. #dashboard)" style="margin-bottom: 6px;" />
              <input id="add-waitfor-text" class="form-input" placeholder="Or Text Content" style="margin-bottom: 8px;" />
              <button id="btn-submit-waitfor" class="form-btn form-btn-sec">${ICONS.plus} Add WaitFor</button>
            </div>

            <!-- Custom Eval -->
            <div style="background: #18181b; padding: 14px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.06);">
              <div class="form-label">${ICONS.code} Insert Custom JS Evaluation</div>
              <input id="add-eval-code" class="form-input" placeholder="e.g. return window.scrollY;" style="margin-bottom: 6px;" />
              <input id="add-eval-var" class="form-input" placeholder="Store in Variable (optional)" style="margin-bottom: 8px;" />
              <button id="btn-submit-eval" class="form-btn form-btn-sec">${ICONS.plus} Add Eval</button>
            </div>

            <!-- Custom Goto -->
            <div style="background: #18181b; padding: 14px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.06);">
              <div class="form-label">${ICONS.globe} Insert Navigation</div>
              <input id="add-goto-url" class="form-input" placeholder="https://example.com" style="margin-bottom: 8px;" />
              <button id="btn-submit-goto" class="form-btn form-btn-sec">${ICONS.plus} Add Goto</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  ${HUD_TEMPLATE_MODALS}
`;
