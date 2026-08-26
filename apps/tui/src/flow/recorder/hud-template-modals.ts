import { ICONS } from "./hud-icons.js";

export const HUD_MODALS_HTML = `
  <!-- Step Builder Modal -->
  <div id="modal-step-builder-overlay" class="modal-overlay">
    <div class="modal-card modal-card-lg">
      <div class="modal-title">${ICONS.pointer} <span id="builder-title-text">Configure Step for Element</span></div>
      <div class="modal-desc">Build step using resilient selectors & frame detection:</div>
      <div class="modal-row">
        <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
          <span id="builder-tag-badge" class="badge-chip">&lt;button&gt;</span>
          <span id="builder-frame-badge" class="badge-chip badge-frame" style="display:none;">iFrame</span>
        </div>
        <div id="builder-element-preview" class="modal-preview"></div>
      </div>
      <div class="builder-row-2col">
        <div class="modal-row">
          <label class="modal-label">Action Type:</label>
          <select id="builder-action-type" class="modal-select">
            <option value="click">🖱️ Click Element</option>
            <option value="type">⌨️ Type / Fill Input</option>
            <option value="waitForSelector">⏱️ Wait For Selector</option>
            <option value="assert">🛡️ Assert Content</option>
            <option value="extract">📦 Extract to Variable</option>
            <option value="hover">👆 Hover Mouse</option>
            <option value="scrollIntoView">📜 Scroll Into View</option>
          </select>
        </div>
        <div class="modal-row">
          <label class="modal-label">Selector Strategy:</label>
          <select id="builder-strategy-select" class="modal-select"></select>
        </div>
      </div>
      <div class="modal-row">
        <label class="modal-label">Target Selector:</label>
        <input id="builder-target-selector" class="modal-input" placeholder="Selector" />
      </div>
      <div class="modal-row" id="builder-frame-row" style="display:none;">
        <label class="modal-label">Target Frame (Optional):</label>
        <input id="builder-frame-selector" class="modal-input" placeholder="iframe selector or name" />
      </div>
      <div id="builder-field-type" class="modal-row" style="display:none;">
        <label class="modal-label">Text to Type:</label>
        <input id="builder-type-text" class="modal-input" placeholder="Text value or {{variableName}}" style="margin-bottom: 6px;" />
        <label style="font-size: 11px; color: #a1a1aa; display: flex; align-items: center; gap: 6px;">
          <input id="builder-type-clear" type="checkbox" checked /> Clear field before typing
        </label>
      </div>
      <div id="builder-field-assert" class="modal-row" style="display:none;">
        <div class="builder-row-2col">
          <div>
            <label class="modal-label">Assert Mode:</label>
            <select id="builder-assert-mode" class="modal-select">
              <option value="strict">Strict Equal</option>
              <option value="contains">Contains Substring</option>
              <option value="startsWith">Starts With</option>
              <option value="regex">Matches Regex</option>
            </select>
          </div>
          <div>
            <label class="modal-label">Expected Value:</label>
            <input id="builder-assert-value" class="modal-input" placeholder="Expected text..." />
          </div>
        </div>
      </div>
      <div id="builder-field-extract" class="modal-row" style="display:none;">
        <div class="builder-row-2col">
          <div>
            <label class="modal-label">Variable Name:</label>
            <input id="builder-extract-var" class="modal-input" placeholder="e.g. pageTitle" />
          </div>
          <div>
            <label class="modal-label">Attribute (Optional):</label>
            <input id="builder-extract-attr" class="modal-input" placeholder="e.g. href (blank for text)" />
          </div>
        </div>
      </div>
      <div id="builder-field-timeout" class="modal-row" style="display:none;">
        <label class="modal-label">Timeout (ms, optional):</label>
        <input id="builder-timeout-val" class="modal-input" type="number" placeholder="5000" />
      </div>
      <div class="modal-actions">
        <button id="builder-cancel-btn" class="modal-btn modal-btn-cancel">Cancel</button>
        <button id="builder-save-btn" class="modal-btn">${ICONS.plus} Add Step to Flow</button>
      </div>
    </div>
  </div>

  <!-- Virtual Webcam Injection Modal -->
  <div id="modal-webcam-overlay" class="modal-overlay">
    <div class="modal-card">
      <div class="modal-title">${ICONS.camera} Virtual Webcam Feed & Video Source</div>
      <div class="modal-desc">Inject synthetic test streams or video sources.</div>
      <div class="modal-row">
        <label class="modal-label">Stream from Video URL:</label>
        <div style="display: flex; gap: 8px;">
          <input id="input-webcam-url" class="modal-input" placeholder="https://example.com/stream.mp4" style="flex: 1; margin: 0;" />
          <button id="btn-webcam-url-apply" class="modal-btn" style="white-space: nowrap;">Load URL</button>
        </div>
      </div>
      <div class="modal-row">
        <label class="modal-label">Choose Video File (.mp4, .webm, .ogg):</label>
        <div style="display: flex; align-items: center; gap: 10px;">
          <input id="input-webcam-file" type="file" accept="video/*" style="display: none;" />
          <button type="button" class="modal-btn modal-btn-cancel" onclick="this.previousElementSibling.click()">Choose Video File</button>
          <span id="webcam-file-name" style="font-size: 11px; color: #a1a1aa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">No file selected</span>
        </div>
      </div>
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

  <!-- Variable Extraction Modal -->
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
        <input id="modal-var-input" class="modal-input" placeholder="e.g. orderNumber, pageTitle" />
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
