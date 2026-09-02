import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { AuthoringSessionManager } from "../src/authoring/manager.js";
import { setupTestContext, type TestContext, teardownTestContext } from "./fixtures/browser.js";

describe("MCP Agent Authoring Draft Mutation Tools (PR 3)", () => {
	let ctx: TestContext;
	let manager: AuthoringSessionManager;

	beforeAll(async () => {
		ctx = await setupTestContext();
		manager = new AuthoringSessionManager();
	});

	afterAll(async () => {
		await teardownTestContext();
	});

	test("1. records steps, inspects draft with getDraft, undoes step, and edits step", async () => {
		const session = await manager.start({
			goal: "Test MCP draft mutation tools",
			initialUrl: ctx.server.url("/forms"),
			headless: true,
			allowedDomains: ["127.0.0.1", "localhost"],
		});

		// 1. Perform Step 1: Type into email
		const step1 = await session.perform({
			action: "type",
			selector: "#user-email",
			text: "agent@corp.com",
			clearFirst: true,
		});
		expect(step1.success).toBe(true);

		// 2. Perform Step 2: Mistake action
		const step2 = await session.perform({
			action: "type",
			selector: "#quantity",
			text: "999",
		});
		expect(step2.success).toBe(true);

		// 3. Inspect Draft via getDraft()
		const draftBeforeUndo = session.getDraft();
		expect(draftBeforeUndo.stepCount).toBe(2);
		expect(draftBeforeUndo.steps.length).toBe(2);
		expect(draftBeforeUndo.hasAssertion).toBe(false);

		// 4. Undo Step 2 via undoLastStep()
		const undoResult = await session.undoLastStep();
		expect(undoResult.undone).toBe(true);
		expect(undoResult.remainingStepCount).toBe(1);

		const draftAfterUndo = session.getDraft();
		expect(draftAfterUndo.stepCount).toBe(1);

		// 5. Edit Step 1 via editStep()
		const editResult = await session.editStep(1, {
			action: "type",
			selector: "#user-email",
			text: "updated-agent@corp.com",
			clearFirst: true,
		});
		expect(editResult.edited).toBe(true);

		// 6. Verify and Publish
		const verifyResult = await session.verify({
			action: "assert",
			selector: "#status",
			contains: "UNSAVED",
		});
		expect(verifyResult.success).toBe(true);

		const finalDraft = session.getDraft();
		expect(finalDraft.stepCount).toBe(2);
		expect(finalDraft.hasAssertion).toBe(true);

		await session.close();
	});
});
