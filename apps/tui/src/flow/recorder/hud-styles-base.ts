export const HUD_STYLES_BASE = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  .hud-icon {
    width: 13px;
    height: 13px;
    stroke: currentColor;
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    display: inline-block;
    vertical-align: middle;
    flex-shrink: 0;
  }
  .hud-icon-grip {
    width: 8px;
    height: 13px;
  }

  .bar-wrapper {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translate3d(-50%, 0, 0);
    pointer-events: auto;
    cursor: default;
    z-index: 2147483647;
    will-change: transform;
    user-select: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  
  .bar {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #111113;
    padding: 4px 8px;
    border-radius: 9999px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
    color: #fafafa;
    font-size: 12px;
    user-select: none;
  }

  .drag-handle {
    cursor: grab;
    color: #71717a;
    padding: 0 4px;
    display: flex;
    align-items: center;
  }
  .drag-handle:active {
    cursor: grabbing;
  }

  .badge {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fafafa;
    padding: 4px 9px;
    border-radius: 9999px;
    font-weight: 600;
    font-size: 11px;
    cursor: pointer;
  }
  .badge.paused {
    background: rgba(255, 255, 255, 0.03);
    color: #71717a;
  }
  .pulse {
    width: 6px;
    height: 6px;
    background: #ef4444;
    border-radius: 50%;
  }
  .badge.paused .pulse {
    background: #71717a;
  }

  .btn-group {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .collapsed .btn-group {
    display: none;
  }

  .btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #a1a1aa;
    padding: 4px 8px;
    border-radius: 9999px;
    cursor: pointer;
    font-size: 11.5px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
    transition: background 0.1s ease, color 0.1s ease, border-color 0.1s ease;
  }
  .btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fafafa;
    border-color: rgba(255, 255, 255, 0.15);
  }
  .btn.active {
    background: #ffffff;
    border-color: #ffffff;
    color: #111113;
    font-weight: 600;
  }
  .btn.active .hud-icon {
    stroke: #111113;
  }
  .btn.active-assert {
    background: #ffffff;
    border-color: #ffffff;
    color: #111113;
    font-weight: 600;
  }
  .btn.active-assert .hud-icon {
    stroke: #111113;
  }
  .btn-config {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.08);
    color: #a1a1aa;
  }
  .btn-config:hover, .btn-config.active {
    background: rgba(255, 255, 255, 0.15);
    color: #fafafa;
    border-color: rgba(255, 255, 255, 0.2);
  }
  .btn-undo {
    color: #a1a1aa;
  }
  .btn-undo:hover {
    color: #fafafa;
  }
  .btn-stop {
    background: #ffffff;
    border-color: #ffffff;
    color: #111113;
    font-weight: 600;
  }
  .btn-stop .hud-icon {
    stroke: #111113;
  }
  .btn-stop:hover {
    background: #e4e4e7;
    border-color: #e4e4e7;
  }
  .btn-toggle {
    background: transparent;
    border: none;
    color: #71717a;
    font-size: 13px;
    padding: 0 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .btn-toggle:hover {
    color: #fafafa;
  }

  .toast {
    position: fixed;
    bottom: 74px;
    left: 50%;
    transform: translate3d(-50%, 8px, 0);
    background: #18181b;
    color: #fafafa;
    border: 1px solid rgba(255, 255, 255, 0.12);
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
    opacity: 0;
    pointer-events: none;
    z-index: 2147483647;
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
  .toast.show {
    opacity: 1;
    transform: translate3d(-50%, 0, 0);
  }

  .tooltip {
    position: fixed;
    top: 0;
    left: 0;
    transform: translate3d(0, 0, 0);
    will-change: transform;
    background: #18181b;
    color: #fafafa;
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: 5px 9px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    pointer-events: none;
    z-index: 2147483647;
    display: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  }
`;
