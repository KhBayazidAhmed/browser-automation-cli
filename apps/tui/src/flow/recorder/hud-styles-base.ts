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
    display: inline-flex; align-items: center; gap: 6px; max-width: calc(100vw - 24px); background: rgba(24, 24, 27, 0.94); backdrop-filter: blur(20px) saturate(160%); -webkit-backdrop-filter: blur(20px) saturate(160%); padding: 7px 9px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.48), 0 2px 8px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08); color: #fafafa; font-size: 12px; line-height: 1; transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .hud-bar:hover, .bar:hover { border-color: rgba(255, 255, 255, 0.18); box-shadow: 0 16px 44px rgba(0, 0, 0, 0.75), 0 6px 16px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.14); }
  .hud-handle, .drag-handle { cursor: grab; color: rgba(255, 255, 255, 0.34); padding: 3px 4px 3px 1px; display: flex; align-items: center; justify-content: center; transition: color 0.15s ease; }
  .hud-handle:hover, .drag-handle:hover { color: rgba(255, 255, 255, 0.85); }
  .hud-handle:active, .drag-handle:active { cursor: grabbing; color: #ffffff; }
  .hud-badge, .badge { display: inline-flex; align-items: center; gap: 6px; min-height: 30px; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(248, 113, 113, 0.3); color: #fca5a5; padding: 5px 8px; border-radius: 9px; font-weight: 700; font-size: 10.5px; letter-spacing: 0.45px; cursor: pointer; transition: all 0.15s ease; }
  .hud-badge:hover, .badge:hover { background: rgba(239, 68, 68, 0.22); border-color: rgba(239, 68, 68, 0.5); color: #ffffff; }
  .hud-badge.paused, .badge.paused { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.12); color: #a1a1aa; }
  .hud-badge.paused:hover, .badge.paused:hover { background: rgba(255, 255, 255, 0.1); color: #fafafa; }
  .hud-dot, .pulse { width: 6px; height: 6px; background: #ef4444; border-radius: 50%; animation: hud-pulse 2s infinite ease-in-out; }
  .hud-badge.paused .hud-dot, .badge.paused .pulse { background: #71717a; animation: none; box-shadow: none; }
  .hud-count { display: inline-flex; align-items: center; justify-content: center; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 5px; background: rgba(255, 255, 255, 0.1); color: #ffffff; font-size: 9.5px; letter-spacing: 0; }
  .hud-btn-group, .btn-group { display: inline-flex; align-items: center; gap: 4px; }
  .hud-bar.collapsed .hud-btn-group, .bar.collapsed .btn-group, .hud-bar.collapsed .hud-btn:not(#btn-toggle), .bar.collapsed .btn:not(.btn-toggle) { display: none; }
  .hud-btn, .btn {
    min-height: 30px; background: transparent; border: 1px solid transparent; color: #d4d4d8; padding: 5px 8px; border-radius: 9px; cursor: pointer; font-size: 11.5px; font-weight: 560; font-family: inherit; display: inline-flex; align-items: center; justify-content: center; gap: 5px; white-space: nowrap; outline: none; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
  }
  .hud-btn:hover, .btn:hover { background: rgba(255, 255, 255, 0.08); color: #ffffff; border-color: rgba(255, 255, 255, 0.08); }
  .hud-btn:active, .btn:active { transform: translateY(0); }
  .hud-btn.active, .btn.active { background: #3b82f6; border-color: #3b82f6; color: #ffffff; font-weight: 600; box-shadow: 0 0 12px rgba(59, 130, 246, 0.45); }
  .hud-btn.active .hud-icon, .btn.active .hud-icon { stroke: #ffffff; }
  .hud-btn.active-assert, .btn.active-assert { background: #8b5cf6; border-color: #8b5cf6; color: #ffffff; font-weight: 600; box-shadow: 0 0 12px rgba(139, 92, 246, 0.45); }
  .hud-btn.active-assert .hud-icon, .btn.active-assert .hud-icon { stroke: #ffffff; }
  .hud-btn.active-cam, .btn.active-cam { background: #10b981; border-color: #10b981; color: #ffffff; font-weight: 600; box-shadow: 0 0 12px rgba(16, 185, 129, 0.45); }
  .hud-btn.active-cam .hud-icon, .btn.active-cam .hud-icon { stroke: #ffffff; }
  .hud-divider { width: 1px; height: 20px; margin: 0 2px; background: rgba(255, 255, 255, 0.1); flex: 0 0 auto; }
  .hud-icon-btn { position: relative; width: 32px; padding: 5px; }
  .hud-control-count { position: absolute; top: -3px; right: -3px; min-width: 15px; height: 15px; padding: 0 3px; display: inline-flex; align-items: center; justify-content: center; border: 2px solid #18181b; border-radius: 9999px; background: #3b82f6; color: #ffffff; font-size: 8px; font-weight: 700; line-height: 1; }
  .hud-data-status { display: none; position: absolute; top: 2px; right: 2px; width: 7px; height: 7px; border: 2px solid #18181b; border-radius: 9999px; background: #22c55e; }
  .hud-btn-data.attached { color: #86efac; background: rgba(34, 197, 94, 0.12); border-color: rgba(74, 222, 128, 0.24); }
  .hud-btn-data.attached .hud-data-status { display: block; }
  .hud-btn-undo, .btn-undo { color: #a1a1aa; }
  .hud-btn-undo:hover, .btn-undo:hover { color: #fafafa; }
  .hud-btn-stop, .btn-stop { background: #ffffff; border-color: #ffffff; color: #111113; font-weight: 700; padding: 5px 11px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.24); }
  .hud-btn-stop .hud-icon, .btn-stop .hud-icon { stroke: #111113; }
  .hud-btn-stop:hover, .btn-stop:hover { background: #f4f4f5; border-color: #f4f4f5; color: #09090b; box-shadow: 0 4px 14px rgba(255, 255, 255, 0.3); }
  .hud-btn-toggle, .btn-toggle { background: transparent; border: none; color: #71717a; padding: 3px; min-width: 24px; min-height: 28px; border-radius: 8px; }
  .hud-btn-toggle:hover, .btn-toggle:hover { color: #fafafa; background: rgba(255, 255, 255, 0.08); transform: none; }
  .hud-menu { position: relative; }
  .hud-menu > summary { list-style: none; }
  .hud-menu > summary::-webkit-details-marker { display: none; }
  .hud-menu > summary .hud-icon:last-child { width: 11px; color: #71717a; transition: transform 0.15s ease; }
  .hud-menu[open] > summary { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.1); color: #ffffff; }
  .hud-menu[open] > summary .hud-icon:last-child { transform: rotate(180deg); }
  .hud-menu:has(.active, .active-assert, .active-cam) > summary { color: #ffffff; background: rgba(59, 130, 246, 0.2); border-color: rgba(96, 165, 250, 0.35); }
  .hud-menu-popover { position: absolute; left: 0; bottom: calc(100% + 12px); width: 244px; padding: 5px; display: grid; gap: 2px; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; background: rgba(24, 24, 27, 0.98); box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
  .hud-menu-popover::after { content: ""; position: absolute; left: 18px; bottom: -5px; width: 8px; height: 8px; border-right: 1px solid rgba(255, 255, 255, 0.12); border-bottom: 1px solid rgba(255, 255, 255, 0.12); background: #18181b; transform: rotate(45deg); }
  .hud-menu-item { width: 100%; padding: 9px 10px; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 8px; background: transparent; color: #e4e4e7; text-align: left; font: inherit; cursor: pointer; }
  .hud-menu-item:hover { background: rgba(255, 255, 255, 0.07); color: #ffffff; }
  .hud-menu-item.active, .hud-menu-item.active-assert, .hud-menu-item.active-cam { background: rgba(59, 130, 246, 0.16); color: #ffffff; }
  .hud-menu-item-icon { width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; border-radius: 7px; background: rgba(255, 255, 255, 0.07); color: #d4d4d8; }
  .hud-menu-item strong, .hud-menu-item small { display: block; }
  .hud-menu-item strong { margin-bottom: 3px; font-size: 11.5px; font-weight: 650; line-height: 1.1; }
  .hud-menu-item small { color: #a1a1aa; font-size: 10px; font-weight: 400; line-height: 1.2; }
  @media (max-width: 620px) { .hud-action-label { display: none; } .hud-menu-trigger { width: 32px; padding: 5px; } .hud-menu-trigger .hud-icon:last-child { display: none; } }
  @media (max-width: 430px) { .hud-bar, .bar { gap: 3px; padding: 6px; } .hud-handle, .drag-handle, .hud-divider { display: none; } .hud-btn-group, .btn-group { gap: 2px; } .hud-btn-stop, .btn-stop { width: 32px; padding: 5px; font-size: 0; } .hud-menu-popover { left: 50%; width: min(244px, calc(100vw - 24px)); transform: translateX(-50%); } }
  .hud-toast, .toast {
    position: fixed; bottom: 84px; left: 50%; transform: translate3d(-50%, 10px, 0); background: rgba(24, 24, 28, 0.95); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); color: #fafafa; border: 1px solid rgba(255, 255, 255, 0.15); padding: 8px 18px; border-radius: 9999px; font-size: 12px; font-weight: 500; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.65), 0 2px 6px rgba(0, 0, 0, 0.4); opacity: 0; pointer-events: none; z-index: 2147483647; transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .hud-toast.show, .toast.show { opacity: 1; transform: translate3d(-50%, 0, 0); }
  .hud-tooltip, .tooltip {
    position: fixed; top: 0; left: 0; transform: translate3d(0, 0, 0); will-change: transform; background: rgba(24, 24, 28, 0.95); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); color: #fafafa; border: 1px solid rgba(255, 255, 255, 0.15); padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 500; pointer-events: none; z-index: 2147483647; display: none; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
  }
`;
