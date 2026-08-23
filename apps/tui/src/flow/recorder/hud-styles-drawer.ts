export const HUD_STYLES_DRAWER = `
  .drawer-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(9, 9, 11, 0.72);
    align-items: center;
    justify-content: center;
    padding: 20px 20px 88px;
    pointer-events: auto;
    z-index: 2147483646;
  }
  .drawer-overlay.open { display: flex; }
  .drawer-card {
    background: #111113;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    width: min(720px, 100%);
    height: min(520px, 100%);
    display: flex;
    flex-direction: column;
    color: #fafafa;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05);
    overflow: hidden;
    contain: layout paint;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 66px;
    padding: 13px 18px;
    background: #141416;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .drawer-title { font-size: 14px; font-weight: 650; color: #fafafa; display: flex; align-items: center; gap: 7px; }
  .drawer-subtitle { max-width: 560px; margin-top: 3px; overflow: hidden; color: #71717a; font-size: 11.5px; text-overflow: ellipsis; white-space: nowrap; }
  .drawer-close-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #a1a1aa;
    width: 32px;
    height: 32px;
    border-radius: 8px;
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
    overflow-x: auto;
    scrollbar-width: none;
  }
  .drawer-tabs::-webkit-scrollbar { display: none; }
  .drawer-tab {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: #71717a;
    min-height: 44px;
    padding: 9px 11px;
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
  .drawer-tab-count { min-width: 17px; height: 17px; padding: 0 5px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: rgba(255, 255, 255, 0.08); font-size: 9.5px; color: #a1a1aa; }
  .drawer-tab.active .drawer-tab-count { background: rgba(255, 255, 255, 0.14); color: #fafafa; }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 18px 18px;
    background: #111113;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
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

  .json-viewer {
    width: 100%;
    height: 380px;
    background: #141416;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    color: #a1a1aa;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11.5px;
    line-height: 1.6;
    padding: 12px 14px;
    outline: none;
    resize: none;
  }

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
  .drawer-inline-form { display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px; margin-bottom: 12px; }
  .drawer-inline-form .form-btn { white-space: nowrap; }
  .drawer-panel-toolbar { display: flex; justify-content: flex-end; margin-bottom: 8px; }
  .insert-step-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .insert-step-card { min-width: 0; padding: 12px; display: flex; flex-direction: column; gap: 7px; background: #18181b; border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 10px; }
  .insert-step-card:focus-within { border-color: rgba(255, 255, 255, 0.16); }
  .insert-step-title { display: flex; align-items: center; gap: 7px; color: #e4e4e7; font-size: 12px; font-weight: 650; }
  .insert-step-description { min-height: 24px; color: #71717a; font-size: 10.5px; line-height: 1.3; }
  .insert-step-card .form-btn { align-self: flex-start; margin-top: auto; }
  .form-input-action { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px; }
  .form-target-btn { padding: 0 10px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid rgba(96, 165, 250, 0.34); border-radius: 6px; background: rgba(59, 130, 246, 0.12); color: #bfdbfe; font: inherit; font-size: 11px; font-weight: 600; white-space: nowrap; cursor: pointer; }
  .form-target-btn:hover { border-color: rgba(96, 165, 250, 0.55); background: rgba(59, 130, 246, 0.2); color: #ffffff; }
  .form-target-btn:focus-visible { outline: 2px solid rgba(96, 165, 250, 0.65); outline-offset: 2px; }
  @media (max-width: 620px) { .drawer-overlay { padding: 10px 10px 78px; } .drawer-card { height: 100%; border-radius: 12px; } .drawer-tabs { padding: 0 8px; } .drawer-tab { padding-inline: 9px; } .drawer-body { padding: 12px; } .insert-step-grid, .drawer-inline-form { grid-template-columns: 1fr; } }
`;
