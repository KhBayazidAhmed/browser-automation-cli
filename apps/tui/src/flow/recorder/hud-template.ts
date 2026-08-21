import { ICONS } from "./hud-icons.js";

export const HUD_HTML = `
  <div id="bar-wrapper" class="bar-wrapper">
    <div id="bar" class="bar">
      <div id="drag-handle" class="drag-handle" title="Drag toolbar">${ICONS.grip}</div>
      <div id="badge" class="badge" title="Click to pause/resume"><div class="pulse"></div> <span id="badge-text">REC (0)</span></div>
      <div class="btn-group">
        <button id="btn-pause" class="btn" title="Pause / Resume recording">${ICONS.pause} Pause</button>
        <button id="btn-extract" class="btn" title="Click any element to extract text">${ICONS.extract} Extract</button>
        <button id="btn-list" class="btn" title="Click a repeating card to extract a table/list">${ICONS.list} List</button>
        <button id="btn-assert" class="btn" title="Click element to assert text/attribute">${ICONS.assert} Assert</button>
        <button id="btn-wait" class="btn" title="Add wait delay">${ICONS.wait} Wait</button>
        <button id="btn-shot" class="btn" title="Capture a screenshot at this step">${ICONS.screenshot} Shot</button>
        <button id="btn-webcam" class="btn btn-webcam" title="Toggle Virtual Webcam feed / test pattern">${ICONS.camera} Cam</button>
        <button id="btn-config" class="btn btn-config" title="Open live workflow config & step editor">${ICONS.sliders} Config (<span id="btn-config-count">0</span>)</button>
        <button id="btn-undo" class="btn btn-undo" title="Undo the last recorded step">${ICONS.undo} Undo</button>
        <button id="btn-stop" class="btn btn-stop" title="Stop and save flow">${ICONS.check} Finish</button>
      </div>
      <button id="btn-toggle" class="btn-toggle" title="Collapse/Expand toolbar">${ICONS.chevronLeft}</button>
    </div>
  </div>

  <div id="toast" class="toast"></div>
  <div id="tooltip" class="tooltip"></div>

  <!-- Live Config & Steps Inspector Drawer -->
  <div id="drawer-overlay" class="drawer-overlay">
    <div class="drawer-card">
      <div class="drawer-header">
        <div>
          <div class="drawer-title">${ICONS.sliders} Live Workflow Config Inspector</div>
          <div id="drawer-subtitle" class="drawer-subtitle">Flow: Recorded Flow • 0 steps • 0 variables</div>
        </div>
        <button id="btn-drawer-close" class="drawer-close-btn" title="Close Drawer">${ICONS.close}</button>
      </div>

      <div class="drawer-tabs">
        <button class="drawer-tab active" data-tab="steps">${ICONS.steps} Steps (<span id="tab-steps-count">0</span>)</button>
        <button class="drawer-tab" data-tab="json">${ICONS.code} JSON Config</button>
        <button class="drawer-tab" data-tab="vars">${ICONS.variable} Variables (<span id="tab-vars-count">0</span>)</button>
        <button class="drawer-tab" data-tab="add">${ICONS.plus} Add Step</button>
      </div>

      <div class="drawer-body">
        <!-- Panel: Steps -->
        <div id="panel-steps" class="tab-panel active">
          <div id="steps-list-container" class="steps-list-container">
            <div class="empty-state">No steps recorded yet. Click or type on the page to begin!</div>
          </div>
        </div>

        <!-- Panel: JSON -->
        <div id="panel-json" class="tab-panel">
          <div class="form-group">
            <textarea id="drawer-json-viewer" class="form-textarea" spellcheck="false"></textarea>
          </div>
          <button id="btn-copy-json" class="form-btn form-btn-sec">${ICONS.copy} Copy JSON</button>
        </div>

        <!-- Panel: Variables -->
        <div id="panel-vars" class="tab-panel">
          <div id="vars-list-container">
            <div class="empty-state">No custom variables declared.</div>
          </div>
          <div style="margin-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 14px;">
            <div class="form-label">Add Custom Flow Variable</div>
            <div style="display: flex; gap: 8px;">
              <input id="new-var-key" class="form-input" placeholder="Variable Name (e.g. userEmail)" style="flex: 1;" />
              <input id="new-var-val" class="form-input" placeholder="Default Value" style="flex: 1;" />
              <button id="btn-add-var" class="form-btn">${ICONS.plus} Add</button>
            </div>
          </div>
        </div>

        <!-- Panel: Add Step -->
        <div id="panel-add" class="tab-panel">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <!-- Wait Step -->
            <div style="background: #18181b; padding: 14px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.06);">
              <div class="form-label">${ICONS.wait} Insert Wait Delay</div>
              <input id="add-wait-ms" class="form-input" type="number" placeholder="Milliseconds (e.g. 2000)" value="1000" style="margin-bottom: 8px;" />
              <button id="btn-submit-wait" class="form-btn form-btn-sec">${ICONS.plus} Add Wait</button>
            </div>

            <!-- Wait For Selector -->
            <div style="background: #18181b; padding: 14px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.06);">
              <div class="form-label">${ICONS.extract} Insert Wait for Selector / Text</div>
              <input id="add-waitfor-sel" class="form-input" placeholder="CSS Selector (optional)" style="margin-bottom: 6px;" />
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
      <div class="modal-title">${ICONS.camera} Virtual Webcam Feed & Pattern Generator</div>
      <div class="modal-desc">Inject synthetic test video streams or customize virtual camera resolution without requiring real physical webcam hardware.</div>
      <div class="modal-row">
        <label class="modal-label">Virtual Camera Mode:</label>
        <div style="display: flex; gap: 8px;">
          <button id="btn-webcam-pattern" class="modal-btn" style="flex:1;">Synthetic Test Pattern</button>
          <button id="btn-webcam-solid" class="modal-btn modal-btn-cancel" style="flex:1;">Solid Slate Feed</button>
        </div>
      </div>
      <div class="modal-row">
        <label class="modal-label">Virtual Camera Status:</label>
        <div id="webcam-status-preview" class="modal-preview">Feed: Test Pattern Active (640x480 @ 30fps)</div>
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
        <button id="modal-save-btn" class="modal-btn">${ICONS.check} Save Variable</button>
      </div>
    </div>
  </div>

  <!-- Text & State Assertion Modal -->
  <div id="modal-assert-overlay" class="modal-overlay">
    <div class="modal-card">
      <div class="modal-title">${ICONS.assert} Configure Strict Assertion</div>
      <div class="modal-desc">Verify that the element text or attribute matches the expected condition:</div>
      <div class="modal-row">
        <label class="modal-label">Target Details:</label>
        <div id="modal-assert-preview" class="modal-preview" style="color: #a1a1aa;"></div>
      </div>
      <div class="modal-row">
        <label class="modal-label">Assertion Mode:</label>
        <select id="modal-assert-type" class="modal-input" style="margin-bottom: 8px;">
          <option value="strict">Exact Text (Strict)</option>
          <option value="contains">Contains Substring</option>
          <option value="regex">Regex Pattern</option>
        </select>
      </div>
      <div class="modal-row">
        <label class="modal-label">Expected Value:</label>
        <input id="modal-assert-val" class="modal-input" placeholder="Expected text content or regex pattern" />
      </div>
      <div class="modal-actions">
        <button id="modal-assert-cancel" class="modal-btn modal-btn-cancel">Cancel</button>
        <button id="modal-assert-save" class="modal-btn">${ICONS.check} Save Assertion</button>
      </div>
    </div>
  </div>
`;
