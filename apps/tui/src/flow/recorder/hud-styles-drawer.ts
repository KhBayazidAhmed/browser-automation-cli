export const HUD_STYLES_DRAWER = `
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
  .drawer-overlay.open { display: flex; }
  .drawer-card {
    background: #111113;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    width: 760px;
    max-width: 94vw;
    height: 560px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    color: #fafafa;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.8);
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    background: #141416;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .drawer-title { font-size: 14px; font-weight: 600; color: #fafafa; display: flex; align-items: center; gap: 6px; }
  .drawer-subtitle { font-size: 11.5px; color: #71717a; margin-top: 2px; }
  .drawer-close-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #a1a1aa;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    transition: background 0.1s ease, color 0.1s ease;
  }
  .drawer-close-btn:hover { background: rgba(255, 255, 255, 0.12); color: #fafafa; }

  .drawer-tabs {
    display: flex;
    background: #111113;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 0 16px;
    gap: 4px;
  }
  .drawer-tab {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: #71717a;
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: color 0.1s ease, border-color 0.1s ease;
  }
  .drawer-tab:hover { color: #a1a1aa; }
  .drawer-tab.active { color: #fafafa; border-bottom-color: #fafafa; font-weight: 600; }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    background: #111113;
  }
  .tab-panel { display: none; height: 100%; }
  .tab-panel.active { display: block; }
  .steps-list-container { display: flex; flex-direction: column; gap: 6px; }
  .empty-state { text-align: center; padding: 40px 20px; color: #71717a; font-size: 12.5px; }
  
  .step-item {
    background: #18181b;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    padding: 9px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    transition: border-color 0.1s ease;
  }
  .step-item:hover { border-color: rgba(255, 255, 255, 0.12); }
  .step-num {
    font-size: 11px;
    font-weight: 600;
    color: #71717a;
    background: #111113;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  .step-content { flex: 1; min-width: 0; }
  .step-title {
    font-size: 12px;
    font-weight: 500;
    color: #fafafa;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .step-meta {
    font-size: 11px;
    color: #71717a;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 1px;
  }
  .step-actions { display: flex; align-items: center; gap: 4px; }
  .btn-icon {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #a1a1aa;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    transition: background 0.1s ease, color 0.1s ease;
  }
  .btn-icon:hover { background: rgba(255, 255, 255, 0.12); color: #fafafa; }
  .btn-icon-del:hover { background: rgba(255, 255, 255, 0.12); color: #ef4444; border-color: rgba(239, 68, 68, 0.3); }

  .var-item {
    background: #18181b;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 12px;
  }
  .var-key { color: #fafafa; font-weight: 500; }
  .var-val { color: #a1a1aa; font-family: ui-monospace, monospace; }

  .form-group { margin-bottom: 12px; }
  .form-label { display: block; font-size: 11.5px; font-weight: 500; color: #a1a1aa; margin-bottom: 5px; }
  .form-input, .form-textarea {
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
  .form-input:focus, .form-textarea:focus { border-color: rgba(255, 255, 255, 0.3); }
  .form-textarea { height: 280px; font-family: ui-monospace, monospace; resize: vertical; line-height: 1.5; }
  .form-btn {
    background: #ffffff;
    border: 1px solid #ffffff;
    color: #111113;
    padding: 7px 14px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.1s ease;
  }
  .form-btn:hover { background: #e4e4e7; }
  .form-btn-sec {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    color: #fafafa;
  }
  .form-btn-sec:hover { background: rgba(255, 255, 255, 0.12); }
`;
