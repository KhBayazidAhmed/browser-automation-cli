export const HUD_STYLES_BASE = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
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
  }
  
  .bar {
    display: flex;
    align-items: center;
    gap: 5px;
    background: #0f172a;
    padding: 5px 10px;
    border-radius: 9999px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.14);
    color: #fff;
    font-size: 12px;
    user-select: none;
  }

  .drag-handle {
    cursor: grab;
    color: #64748b;
    font-size: 14px;
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
    background: #ef4444;
    color: white;
    padding: 4px 10px;
    border-radius: 9999px;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0.5px;
    cursor: pointer;
  }
  .badge.paused {
    background: #64748b;
  }
  .pulse {
    width: 8px;
    height: 8px;
    background: white;
    border-radius: 50%;
    animation: pulse-dot 1.5s infinite;
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.8); }
  }

  .btn-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .collapsed .btn-group {
    display: none;
  }

  .btn {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.16);
    color: #f1f5f9;
    padding: 4px 9px;
    border-radius: 9999px;
    cursor: pointer;
    font-size: 11.5px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }
  .btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  .btn.active {
    background: #10b981;
    border-color: #059669;
    color: white;
    font-weight: 600;
  }
  .btn.active-assert {
    background: #f59e0b;
    border-color: #d97706;
    color: black;
    font-weight: 700;
  }
  .btn-config {
    background: rgba(56, 189, 248, 0.15);
    border-color: rgba(56, 189, 248, 0.4);
    color: #38bdf8;
    font-weight: 600;
  }
  .btn-config:hover, .btn-config.active {
    background: #0284c7;
    color: white;
    border-color: #0284c7;
  }
  .btn-undo { color: #fbbf24; }
  .btn-stop {
    background: #dc2626;
    border-color: #b91c1c;
    font-weight: 600;
  }
  .btn-stop:hover { background: #ef4444; }
  .btn-toggle {
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 14px;
    padding: 0 4px;
    cursor: pointer;
  }
  .btn-toggle:hover { color: #fff; }

  .toast {
    position: fixed;
    bottom: 74px;
    left: 50%;
    transform: translate3d(-50%, 8px, 0);
    background: #0f172a;
    color: #10b981;
    border: 1px solid #10b981;
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
    background: #0284c7;
    color: white;
    padding: 5px 9px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    pointer-events: none;
    z-index: 2147483647;
    display: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.35);
  }
`;
