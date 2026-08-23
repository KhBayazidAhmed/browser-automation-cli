import { ICONS } from "./hud-icons.js";

export const HUD_TEMPLATE_MODALS = `
  <!-- Virtual Webcam Injection Modal -->
  <div id="modal-webcam-overlay" class="modal-overlay">
    <div class="modal-card">
      <div class="modal-title">${ICONS.camera} Virtual Webcam Feed & Video Source</div>
      <div class="modal-desc">Inject synthetic test streams, remote video URLs, or local video files into <code>navigator.mediaDevices</code>.</div>

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
