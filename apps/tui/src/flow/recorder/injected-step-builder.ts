export const INJECTED_STEP_BUILDER_SRC = `
  let lastRecordedPointer = null;

  function resolveRecorderPointerTarget(target) {
    if (!target || target.nodeType !== Node.ELEMENT_NODE) return null;
    return (target.closest && target.closest("button, a, [role='button'], input[type='submit'], input[type='button'], [tabindex]")) || target;
  }

  function isDuplicateRecorderPointerEvent(event, target) {
    const now = Number(event.timeStamp) || Date.now();
    if (lastRecordedPointer && lastRecordedPointer.target === target && now - lastRecordedPointer.time < 1000) {
      if (event.type === 'mousedown' && lastRecordedPointer.type === 'pointerdown') return true;
      if (event.type === 'click' && (lastRecordedPointer.type === 'pointerdown' || lastRecordedPointer.type === 'mousedown')) return true;
    }
    lastRecordedPointer = { target, time: now, type: event.type };
    return false;
  }

  function buildPointerStepPayload(event, rawTarget) {
    const target = resolveRecorderPointerTarget(rawTarget);
    if (!target || target.closest?.("#__cdp_recorder_hud__")) return null;
    const tag = target.tagName?.toLowerCase();
    if (tag === 'iframe' || tag === 'frame') return null;
    if (typeof event.button === 'number' && event.button !== 0) return null;
    if (event.isPrimary === false) return null;
    if (isDuplicateRecorderPointerEvent(event, target)) return null;
    const selector = getBestSelector(target);
    if (!selector) return null;
    const text = getRecorderElementText(target).slice(0, 60);
    return {
      target,
      step: {
        name: text ? \`Click "\${text.slice(0, 40)}"\` : \`Click \${selector}\`,
        action: 'click',
        selector,
        text: text || undefined,
        strictText: text ? true : undefined,
      },
      recordEvent: {
        type: 'click',
        selector,
        text,
        strictText: Boolean(text),
        sourceEvent: event.type,
        pointerType: event.pointerType || (event.type === 'mousedown' ? 'mouse' : undefined),
        button: typeof event.button === 'number' ? event.button : 0,
        url: window.location.href,
      },
    };
  }

  function recordPointerStep(event, rawTarget) {
    const payload = buildPointerStepPayload(event, rawTarget);
    if (!payload) return false;
    flowState.steps.push(payload.step);
    persistState(); renderDrawer();
    emitRecordEvent(payload.recordEvent);
    showToast(\`✓ Click: \${payload.step.selector}\${payload.step.text ? \` ("\${payload.step.text.slice(0, 15)}")\` : ''}\`);
    return true;
  }
`;
