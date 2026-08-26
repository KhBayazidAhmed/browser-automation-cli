export const HUD_STYLES_MODALS = `
  .modal-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    align-items: center;
    justify-content: center;
    pointer-events: auto;
    z-index: 2147483646;
  }
  .modal-overlay.open { display: flex; }
  .modal-card {
    background: #111113;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    width: 480px;
    max-width: 90vw;
    padding: 20px;
    color: #fafafa;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .modal-card-lg {
    width: 560px;
    max-height: 90vh;
    overflow-y: auto;
  }
  .modal-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
  .modal-desc { font-size: 11.5px; color: #71717a; margin-bottom: 16px; }
  .modal-row { margin-bottom: 12px; }
  .modal-label { display: block; font-size: 11.5px; font-weight: 500; color: #a1a1aa; margin-bottom: 4px; }
  .modal-input, .modal-select {
    width: 100%;
    background: #18181b;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fafafa;
    padding: 8px 10px;
    border-radius: 6px;
    font-size: 12px;
    outline: none;
    font-family: inherit;
    transition: border-color 0.1s ease;
  }
  .modal-input:focus, .modal-select:focus { border-color: rgba(255, 255, 255, 0.3); }
  .modal-preview {
    font-size: 11px;
    color: #a1a1aa;
    background: #18181b;
    border: 1px solid rgba(255, 255, 255, 0.06);
    padding: 8px 10px;
    border-radius: 6px;
    word-break: break-all;
    max-height: 80px;
    overflow-y: auto;
    margin-top: 4px;
    font-family: ui-monospace, SFMono-Regular, monospace;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
  }
  .modal-btn {
    background: #ffffff;
    border: 1px solid #ffffff;
    color: #111113;
    padding: 7px 14px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.1s ease, color 0.1s ease;
  }
  .modal-btn:hover { background: #e4e4e7; }
  .modal-btn-cancel {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #a1a1aa;
  }
  .modal-btn-cancel:hover { background: rgba(255, 255, 255, 0.12); color: #fafafa; }
  
  .fields-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11.5px;
    margin-top: 6px;
  }
  .fields-table th {
    text-align: left;
    color: #71717a;
    padding: 4px 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .fields-table td {
    padding: 4px 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  .badge-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10.5px;
    font-weight: 600;
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    border: 1px solid rgba(59, 130, 246, 0.25);
  }
  .badge-frame {
    background: rgba(168, 85, 247, 0.15);
    color: #c084fc;
    border: 1px solid rgba(168, 85, 247, 0.25);
  }
  .builder-row-2col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .hud-btn.active-pick {
    background: rgba(59, 130, 246, 0.2) !important;
    border-color: #3b82f6 !important;
    color: #60a5fa !important;
  }
`;
