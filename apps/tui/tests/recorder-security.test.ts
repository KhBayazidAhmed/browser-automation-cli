import { describe, expect, test } from "bun:test";
import {
	handleRecordedEvent,
	isSafeRecorderVariableKey,
	sanitizeRecorderValue,
} from "../src/flow/recorder/recorder-event-bridge.js";
import type { FlowStep } from "../src/flow/types.js";

describe("Recorder persistence security", () => {
	test("sanitizes sensitive page-binding events on the trusted backend", () => {
		const steps: FlowStep[] = [];
		handleRecordedEvent(
			{
				type: "type",
				selector: "#login-password",
				targetText: "Password",
				value: "literal-must-not-persist",
			},
			steps,
			{},
			() => undefined,
			() => undefined,
		);
		expect((steps[0] as Record<string, unknown>).text).toStartWith("{{env.");
		expect(JSON.stringify(steps)).not.toContain("literal-must-not-persist");
	});

	test("sanitizes sensitive variables and rejects unsafe variable keys", () => {
		expect(sanitizeRecorderValue("apiToken", "literal-token")).toBe("{{env.API_TOKEN}}");
		expect(sanitizeRecorderValue("query", "a=b=c")).toBe("a=b=c");
		expect(isSafeRecorderVariableKey("query.value")).toBe(true);
		expect(isSafeRecorderVariableKey("__proto__")).toBe(false);
	});
});
