import { describe, expect, test } from "bun:test";
import { PassThrough } from "node:stream";
import { FlowDebugger, resolveDebugCommand, type StepPromptContext } from "../src/flow/debugger.js";

function makeCtx(index = 2, total = 5): StepPromptContext {
	return {
		index,
		total,
		name: `Click Step ${index}`,
		step: { action: "click", selector: "#submit" },
	};
}

function makeDebugger(lines: string[]) {
	const input = new PassThrough();
	const output = new PassThrough();
	output.on("data", () => {});
	const debuggerInstance = new FlowDebugger(
		{
			pageSummary: async () => ({ url: "https://example.test/page", title: "Example" }),
			collectedData: () => ({ heading: "hello" }),
		},
		input,
		output,
	);
	for (const line of lines) input.write(`${line}\n`);
	return debuggerInstance;
}

describe("debug command resolution", () => {
	test("maps aliases to decisions", () => {
		expect(resolveDebugCommand("")).toBe("run");
		expect(resolveDebugCommand("\n")).toBe("run");
		expect(resolveDebugCommand("n")).toBe("run");
		expect(resolveDebugCommand("next")).toBe("run");
		expect(resolveDebugCommand("c")).toBe("continue");
		expect(resolveDebugCommand("CONTINUE")).toBe("continue");
		expect(resolveDebugCommand("b")).toBe("back");
		expect(resolveDebugCommand("s")).toBe("skip");
		expect(resolveDebugCommand("r")).toBe("retry");
		expect(resolveDebugCommand("v")).toBe("vars");
		expect(resolveDebugCommand("i")).toBe("inspect");
		expect(resolveDebugCommand("info")).toBe("inspect");
		expect(resolveDebugCommand("q")).toBe("abort");
		expect(resolveDebugCommand("abort")).toBe("abort");
	});

	test("unknown input resolves to unknown", () => {
		expect(resolveDebugCommand("wat")).toBe("unknown");
	});
});

describe("FlowDebugger sessions", () => {
	test("beforeStep pauses for vars then runs", async () => {
		const dbg = makeDebugger(["v", ""]);
		const decision = await dbg.beforeStep(makeCtx());
		dbg.close();
		expect(decision).toBe("run");
	});

	test("beforeStep rejects back on first step, accepts it later", async () => {
		const dbg = makeDebugger(["b", "", "b"]);
		expect(await dbg.beforeStep(makeCtx(1))).toBe("run");
		expect(await dbg.beforeStep(makeCtx(3))).toBe("back");
		dbg.close();
	});

	test("beforeStep skips a step", async () => {
		const dbg = makeDebugger(["s"]);
		expect(await dbg.beforeStep(makeCtx())).toBe("skip");
		dbg.close();
	});

	test("continue disables future pauses without input", async () => {
		const dbg = makeDebugger(["c"]);
		expect(await dbg.beforeStep(makeCtx(1))).toBe("run");
		expect(await dbg.beforeStep(makeCtx(2))).toBe("run");
		dbg.close();
	});

	test("beforeStep aborts on quit", async () => {
		const dbg = makeDebugger(["q"]);
		expect(await dbg.beforeStep(makeCtx())).toBe("abort");
		dbg.close();
	});

	test("onFailure supports retry, back, skip, and quit", async () => {
		const retryDbg = makeDebugger(["r"]);
		expect(await retryDbg.onFailure(makeCtx(), "boom")).toBe("retry");
		retryDbg.close();

		const backDbg = makeDebugger(["b"]);
		expect(await backDbg.onFailure(makeCtx(), "boom")).toBe("back");
		backDbg.close();

		const skipDbg = makeDebugger(["s"]);
		expect(await skipDbg.onFailure(makeCtx(), "boom")).toBe("skip");
		skipDbg.close();

		const quitDbg = makeDebugger(["q"]);
		expect(await quitDbg.onFailure(makeCtx(), "boom")).toBe("abort");
		quitDbg.close();
	});
});

describe("FlowDebugger.create guard", () => {
	test("returns null when stdin is not a TTY", () => {
		const dbg = FlowDebugger.create({
			pageSummary: async () => ({ url: "", title: "" }),
			collectedData: () => ({}),
		});
		if (process.stdin.isTTY) {
			expect(dbg).not.toBeNull();
			dbg?.close();
		} else {
			expect(dbg).toBeNull();
		}
	});
});
