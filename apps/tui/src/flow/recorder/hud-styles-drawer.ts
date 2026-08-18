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
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 16px;
    width: 760px;
    max-width: 94vw;
    height: 560px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    color: #fff;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.85);
    overflow: hidden;
  }
  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    background: #1e293b;
    border-bottom: 1px solid #334155;
  }
  .drawer-title { font-size: 15px; font-weight: 700; color: #38bdf8; }
  .drawer-subtitle { font-size: 11.5px; color: #94a3b8; margin-top: 2px; }
  .drawer-close-btn {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #cbd5e1;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
  }
  .drawer-close-btn:hover { background: #ef4444; border-color: #ef4444; color: white; }

  .drawer-tabs {
    display: flex;
    background: #0f172a;
    border-bottom: 1px solid #334155;
    padding: 0 16px;
    gap: 8px;
  }
  .drawer-tab {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: #94a3b8;
    padding: 10px 14px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
  }
  .drawer-tab:hover { color: #f1f5f9; }
  .drawer-tab.active { color: #38bdf8; border-bottom-color: #38bdf8; }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    background: #0b1120;
  }
  .tab-panel { display: none; height: 100%; }
  .tab-panel.active { display: block; }
  .steps-list-container { display: flex; flex-direction: column; gap: 8px; }
  .empty-state { text-align: center; padding: 40px 20px; color: #64748b; font-size: 13px; }
  
  .step-item {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 10px;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .step-item:hover { border-color: #475569; }
  .step-item-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
  .step-index-badge {
    font-size: 11px;
    font-weight: 700;
    color: #94a3b8;
    background: #0f172a;
    padding: 3px 7px;
    border-radius: 6px;
  }
  .step-action-pill {
    font-size: 10px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .pill-goto { background: #0369a1; color: #e0f2fe; }
  .pill-click { background: #047857; color: #d1fae5; }
  .pill-type { background: #b45309; color: #fef3c7; }
  .pill-extract { background: #6d28d9; color: #ede9fe; }
  .pill-extractmultiple { background: #4338ca; color: #e0e7ff; }
  .pill-assert { background: #c2410c; color: #ffedd5; }
  .pill-wait { background: #1d4ed8; color: #dbeafe; }
  .pill-waitforselector { background: #0e7490; color: #cffafe; }
  .pill-eval { background: #0f766e; color: #ccfbf1; }
  .pill-screenshot { background: #a21caf; color: #fae8ff; }

  .step-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
  .step-name {
    font-size: 12.5px;
    font-weight: 600;
    color: #f1f5f9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .step-detail {
    font-size: 11px;
    color: #94a3b8;
    font-family: ui-monospace, monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .step-actions { display: flex; align-items: center; gap: 4px; }
  .btn-icon {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    width: 26px;
    height: 26px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }
  .btn-icon:hover { background: rgba(255, 255, 255, 0.16); }
  .btn-icon-del:hover { background: #ef4444; border-color: #ef4444; color: white; }
`;
