import { ICONS } from "./hud-icons.js";

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

  <!-- Virtual Webcam Injection Modal -->
  <div id="modal-webcam-overlay" class="modal-overlay">
    <div class="modal-card">
      <div class="modal-title">${ICONS.camera} Virtual Webcam Feed & Video Source</div>
      <div class="modal-desc">Inject synthetic test streams, remote video URLs, or local video files into <code>navigator.mediaDevices</code>.</div>
      
      <!-- Video URL Input -->
      <div class="modal-row">
        <label class="modal-label">Stream from Video URL:</label>
        <div style="display: flex; gap: 8px;">
          <input id="input-webcam-url" class="modal-input" placeholder="https://example.com/stream.mp4" style="flex: 1; margin: 0;" />
          <button id="btn-webcam-url-apply" class="modal-btn" style="white-space: nowrap;">Load URL</button>
        </div>
      </div>

      <!-- Local Video File Picker -->
      <div class="modal-row">
        <label class="modal-label">Choose Video File (.mp4, .webm, .ogg):</label>
        <div style="display: flex; align-items: center; gap: 10px;">
          <input id="input-webcam-file" type="file" accept="video/*" style="display: none;" />
          <button type="button" class="modal-btn modal-btn-cancel" onclick="this.previousElementSibling.click()">Choose Video File</button>
          <span id="webcam-file-name" style="font-size: 11px; color: #a1a1aa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">No file selected</span>
        </div>
      </div>

      <!-- Synthetic Patterns -->
      <div class="modal-row">
        <label class="modal-label">Synthetic Feeds:</label>
        <div style="display: flex; gap: 8px;">
          <button id="btn-webcam-pattern" class="modal-btn" style="flex:1;">Test Pattern (30 FPS)</button>
          <button id="btn-webcam-solid" class="modal-btn modal-btn-cancel" style="flex:1;">Solid Slate Feed</button>
        </div>
      </div>

      <div class="modal-row">
        <label class="modal-label">Active Camera Status:</label>
        <div id="webcam-status-preview" class="modal-preview">Feed: None</div>
      </div>

      <div class="modal-actions">
        <button id="btn-webcam-reset" class="modal-btn modal-btn-cancel">${ICONS.trash} Disable Feed</button>
        <button id="btn-webcam-close" class="modal-btn">Done</button>
      </div>
    </div>
  </div>

  <!-- Variable / Collection Extraction Modal -->
  <div id="modal-overlay" class="modal-overlay">
    <div class="modal-card">
      <div id="modal-title" class="modal-title">${ICONS.extract} Save Extracted Variable</div>
      <div class="modal-desc">Targeted text value to save into workflow memory:</div>
      <div class="modal-row">
        <label class="modal-label">Preview:</label>
        <div id="modal-preview" class="modal-preview"></div>
      </div>
      <div class="modal-row">
        <label class="modal-label">Variable Name:</label>
        <input id="modal-var-input" class="modal-input" placeholder="e.g. orderNumber, pageTitle, userStatus" />
      </div>
      <div class="modal-actions">
        <button id="modal-cancel-btn" class="modal-btn modal-btn-cancel">Cancel</button>
        <button id="modal-save-btn" class="modal-btn">Save Variable</button>
      </div>
    </div>
  </div>

  <!-- Assertion Configuration Modal -->
  <div id="modal-assert-overlay" class="modal-overlay">
    <div class="modal-card">
      <div class="modal-title">${ICONS.check} Add Assertion on Element</div>
      <div class="modal-desc">Validate DOM state during test playback:</div>
      <div class="modal-row">
        <label class="modal-label">Target Preview:</label>
        <div id="modal-assert-preview" class="modal-preview"></div>
      </div>
      <div class="modal-row">
        <label class="modal-label">Assertion Type:</label>
        <select id="modal-assert-type" class="modal-select">
          <option value="strict">Strict Text Equal (exact match)</option>
          <option value="contains">Contains Substring</option>
          <option value="regex">Matches Regex Pattern</option>
          <option value="visible">Element Is Visible</option>
        </select>
      </div>
      <div class="modal-row">
        <label class="modal-label">Expected Value / Pattern:</label>
        <input id="modal-assert-val" class="modal-input" placeholder="Expected text value..." />
      </div>
      <div class="modal-actions">
        <button id="modal-assert-cancel" class="modal-btn modal-btn-cancel">Cancel</button>
        <button id="modal-assert-save" class="modal-btn">Save Assertion</button>
      </div>
    </div>
  </div>
`;
