export const HUD_STYLES_MODALS = `
  .json-actions-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .json-info-text { font-size: 11.5px; color: #94a3b8; }
  .btn-sm {
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    border: none;
  }
  .btn-primary { background: #0284c7; color: white; }
  .btn-primary:hover { background: #0369a1; }
  .btn-success { background: #10b981; color: white; }
  .btn-success:hover { background: #059669; }
  .json-viewer {
    background: #030712;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 12px 14px;
    color: #38bdf8;
    font-family: ui-monospace, monospace;
    font-size: 11.5px;
    line-height: 1.5;
    overflow: auto;
    max-height: 380px;
    white-space: pre;
  }

  .vars-container { display: flex; flex-direction: column; gap: 12px; }
  .add-var-row { display: flex; gap: 8px; background: #1e293b; padding: 12px; border-radius: 10px; border: 1px solid #334155; }
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
  .drawer-input:focus { border-color: #38bdf8; }
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
  .drawer-textarea:focus { border-color: #38bdf8; }
  .vars-list { display: flex; flex-direction: column; gap: 6px; }
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
  .var-key { font-weight: 700; color: #38bdf8; font-family: ui-monospace, monospace; }
  .var-val { color: #94a3b8; font-family: ui-monospace, monospace; }

  .add-step-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .add-step-card {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .add-step-card-title { font-size: 13px; font-weight: 700; color: #f1f5f9; }
  .add-step-card-desc { font-size: 11px; color: #94a3b8; margin-bottom: 4px; }
  .input-inline { display: flex; gap: 6px; }

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
  .modal-overlay.open { display: flex; }
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
  .modal-title { font-size: 15px; font-weight: 700; color: #38bdf8; margin-bottom: 10px; }
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
  .modal-label { font-size: 11px; color: #94a3b8; margin-bottom: 5px; font-weight: 600; }
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
  .modal-input:focus { border-color: #38bdf8; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
  .modal-btn {
    padding: 7px 16px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: none;
  }
  .modal-btn-cancel { background: #334155; color: #cbd5e1; }
  .modal-btn-save { background: #10b981; color: white; }
`;
