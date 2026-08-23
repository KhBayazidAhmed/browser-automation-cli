import { INJECTED_DOM_EVENTS_SRC } from "./injected-dom-events.js";
import { INJECTED_MODALS_SRC } from "./injected-modals.js";
import { INJECTED_SELECTOR_ENGINE_SRC } from "./injected-selector-engine.js";
import { INJECTED_STEP_BUILDER_SRC } from "./injected-step-builder.js";
import { INJECTED_WEBCAM_MODAL_SRC } from "./injected-webcam-modal.js";

export const INJECTED_EVENT_RECORDER_SRC = [
	INJECTED_MODALS_SRC,
	INJECTED_WEBCAM_MODAL_SRC,
	INJECTED_SELECTOR_ENGINE_SRC,
	INJECTED_STEP_BUILDER_SRC,
	INJECTED_DOM_EVENTS_SRC,
].join("\n");
