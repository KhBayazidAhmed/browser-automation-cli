export const HUD_HTML = `
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
`;
