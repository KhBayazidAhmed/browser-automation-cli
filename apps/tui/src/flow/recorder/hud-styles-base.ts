export const HUD_STYLES_BASE = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes hud-pulse {
    0% { transform: scale(0.95); opacity: 0.8; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
    70% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
    100% { transform: scale(0.95); opacity: 0.8; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  }
  .hud-icon { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; display: inline-block; vertical-align: middle; flex-shrink: 0; }
  .hud-icon-grip { width: 9px; height: 14px; }
  .hud-bar, .bar {
    position: fixed; bottom: 24px; left: 50%; transform: translate3d(-50%, 0, 0); pointer-events: auto; cursor: default; z-index: 2147483647; will-change: transform; user-select: none; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    display: inline-flex; align-items: center; gap: 5px; background: rgba(18, 18, 22, 0.88); backdrop-filter: blur(16px) saturate(180%); -webkit-backdrop-filter: blur(16px) saturate(180%); padding: 6px 10px; border-radius: 9999px; border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 12px 36px rgba(0, 0, 0, 0.65), 0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1); color: #fafafa; font-size: 12px; line-height: 1; transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .hud-bar:hover, .bar:hover { border-color: rgba(255, 255, 255, 0.18); box-shadow: 0 16px 44px rgba(0, 0, 0, 0.75), 0 6px 16px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.14); }
  .hud-handle, .drag-handle { cursor: grab; color: rgba(255, 255, 255, 0.4); padding: 2px 5px 2px 2px; display: flex; align-items: center; justify-content: center; transition: color 0.15s ease; }
  .hud-handle:hover, .drag-handle:hover { color: rgba(255, 255, 255, 0.85); }
  .hud-handle:active, .drag-handle:active { cursor: grabbing; color: #ffffff; }
  .hud-badge, .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); color: #fca5a5; padding: 5px 10px; border-radius: 9999px; font-weight: 600; font-size: 11px; letter-spacing: 0.3px; cursor: pointer; transition: all 0.15s ease; }
  .hud-badge:hover, .badge:hover { background: rgba(239, 68, 68, 0.22); border-color: rgba(239, 68, 68, 0.5); color: #ffffff; }
  .hud-badge.paused, .badge.paused { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.12); color: #a1a1aa; }
  .hud-badge.paused:hover, .badge.paused:hover { background: rgba(255, 255, 255, 0.1); color: #fafafa; }
  .hud-dot, .pulse { width: 6px; height: 6px; background: #ef4444; border-radius: 50%; animation: hud-pulse 2s infinite ease-in-out; }
  .hud-badge.paused .hud-dot, .badge.paused .pulse { background: #71717a; animation: none; box-shadow: none; }
  .hud-btn-group, .btn-group { display: inline-flex; align-items: center; gap: 4px; }
  .hud-bar.collapsed .hud-btn-group, .bar.collapsed .btn-group, .hud-bar.collapsed .hud-btn:not(#btn-toggle), .bar.collapsed .btn:not(.btn-toggle) { display: none; }
  .hud-btn, .btn {
    background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); color: #d4d4d8; padding: 5px 9px; border-radius: 9999px; cursor: pointer; font-size: 11.5px; font-weight: 500; font-family: inherit; display: inline-flex; align-items: center; justify-content: center; gap: 5px; white-space: nowrap; outline: none; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
  }
  .hud-btn:hover, .btn:hover { background: rgba(255, 255, 255, 0.12); color: #ffffff; border-color: rgba(255, 255, 255, 0.16); transform: translateY(-1px); }
  .hud-btn:active, .btn:active { transform: translateY(0); }
  .hud-btn.active, .btn.active { background: #3b82f6; border-color: #3b82f6; color: #ffffff; font-weight: 600; box-shadow: 0 0 12px rgba(59, 130, 246, 0.45); }
  .hud-btn.active .hud-icon, .btn.active .hud-icon { stroke: #ffffff; }
  .hud-btn.active-assert, .btn.active-assert { background: #8b5cf6; border-color: #8b5cf6; color: #ffffff; font-weight: 600; box-shadow: 0 0 12px rgba(139, 92, 246, 0.45); }
  .hud-btn.active-assert .hud-icon, .btn.active-assert .hud-icon { stroke: #ffffff; }
  .hud-btn.active-cam, .btn.active-cam { background: #10b981; border-color: #10b981; color: #ffffff; font-weight: 600; box-shadow: 0 0 12px rgba(16, 185, 129, 0.45); }
  .hud-btn.active-cam .hud-icon, .btn.active-cam .hud-icon { stroke: #ffffff; }
  .hud-btn-undo, .btn-undo { color: #a1a1aa; }
  .hud-btn-undo:hover, .btn-undo:hover { color: #fafafa; }
  .hud-btn-stop, .btn-stop { background: #ffffff; border-color: #ffffff; color: #111113; font-weight: 600; padding: 5px 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); }
  .hud-btn-stop .hud-icon, .btn-stop .hud-icon { stroke: #111113; }
  .hud-btn-stop:hover, .btn-stop:hover { background: #f4f4f5; border-color: #f4f4f5; color: #09090b; box-shadow: 0 4px 14px rgba(255, 255, 255, 0.3); }
  .hud-btn-toggle, .btn-toggle { background: transparent; border: none; color: #71717a; padding: 2px 4px; min-width: 22px; height: 24px; border-radius: 9999px; }
  .hud-btn-toggle:hover, .btn-toggle:hover { color: #fafafa; background: rgba(255, 255, 255, 0.08); transform: none; }
  .hud-toast, .toast {
    position: fixed; bottom: 84px; left: 50%; transform: translate3d(-50%, 10px, 0); background: rgba(24, 24, 28, 0.95); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); color: #fafafa; border: 1px solid rgba(255, 255, 255, 0.15); padding: 8px 18px; border-radius: 9999px; font-size: 12px; font-weight: 500; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.65), 0 2px 6px rgba(0, 0, 0, 0.4); opacity: 0; pointer-events: none; z-index: 2147483647; transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .hud-toast.show, .toast.show { opacity: 1; transform: translate3d(-50%, 0, 0); }
  .hud-tooltip, .tooltip {
    position: fixed; top: 0; left: 0; transform: translate3d(0, 0, 0); will-change: transform; background: rgba(24, 24, 28, 0.95); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); color: #fafafa; border: 1px solid rgba(255, 255, 255, 0.15); padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 500; pointer-events: none; z-index: 2147483647; display: none; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
  }
`;
