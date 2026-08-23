import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod/v4";
import { AuthoringSessionManager } from "../authoring/manager.js";
import { listAuthoringProfiles, resolveAuthoringProfile } from "../authoring/profile-access.js";
import type { AssertStep, FlowStep } from "../flow/types.js";

const flowStepSchema = z
	.object({ action: z.string().min(1) })
	.passthrough()
	.describe("One deterministic workflow step from the browser automation flow schema");

function jsonResult(value: unknown) {
	return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function errorResult(error: unknown) {
	return {
		content: [
			{
				type: "text" as const,
				text: error instanceof Error ? error.message : String(error),
			},
		],
		isError: true,
	};
}

export function createBrowserAutomationMcpServer(manager: AuthoringSessionManager): McpServer {
	const server = new McpServer(
		{ name: "bflow-author", version: "1.0.0" },
		{
			instructions:
				"Author deterministic browser workflows. Start a bounded session, observe before acting, perform one FlowStep at a time, recover by observing again, verify the final state with an assertion, then publish. Failed actions are traced but not published. Never put secrets in tool arguments; use {{env.NAME}}. Set confirmed only after explicit user approval for the exact high-impact action.",
		},
	);

	server.registerTool(
		"browser_profiles_list",
		{
			description:
				"List safe browser profile identifiers for the user to choose from. Paths and account details are omitted; starting with one still requires explicit confirmation.",
			inputSchema: z.object({}),
			annotations: { readOnlyHint: true, destructiveHint: false },
		},
		async () => jsonResult(listAuthoringProfiles()),
	);

	server.registerTool(
		"browser_session_start",
		{
			description:
				"Start a persistent, bounded browser authoring session. Uses a clean profile unless the user explicitly authorizes a named profile.",
			inputSchema: z.object({
				goal: z.string().min(1),
				initialUrl: z.url(),
				headed: z.boolean().default(true),
				allowedDomains: z.array(z.string().min(1)).max(20).optional(),
				maxSteps: z.number().int().min(1).max(200).default(50),
				timeoutMs: z.number().int().min(1_000).max(3_600_000).default(900_000),
				profile: z.string().min(1).optional(),
				profileAccessConfirmed: z.boolean().default(false),
			}),
			annotations: { destructiveHint: false, readOnlyHint: false },
		},
		async (input) => {
			try {
				const profile = input.profile
					? resolveAuthoringProfile(input.profile, input.profileAccessConfirmed)
					: {};
				const session = await manager.start({
					goal: input.goal,
					initialUrl: input.initialUrl,
					headless: !input.headed,
					allowedDomains: input.allowedDomains,
					maxSteps: input.maxSteps,
					timeoutMs: input.timeoutMs,
					...profile,
				});
				return jsonResult({
					sessionId: session.id,
					allowedDomains: session.allowedDomains,
					tracePath: session.trace.path,
					observation: await session.observe(),
				});
			} catch (error) {
				return errorResult(error);
			}
		},
	);

	server.registerTool(
		"browser_observe",
		{
			description:
				"Inspect the current page as structured URL, title, visible text, frames, and resilient selectors. Call before choosing an action and after a failure.",
			inputSchema: z.object({ sessionId: z.string().uuid() }),
			annotations: { readOnlyHint: true, destructiveHint: false },
		},
		async ({ sessionId }) => {
			try {
				return jsonResult(await manager.get(sessionId).observe());
			} catch (error) {
				return errorResult(error);
			}
		},
	);

	server.registerTool(
		"browser_perform",
		{
			description:
				"Execute one deterministic FlowStep. Successful steps enter the draft; failed steps remain trace-only. confirmed may be true only after explicit user approval for this exact high-impact action.",
			inputSchema: z.object({
				sessionId: z.string().uuid(),
				step: flowStepSchema,
				variables: z.record(z.string(), z.unknown()).optional(),
				confirmed: z.boolean().default(false),
			}),
			annotations: { readOnlyHint: false, destructiveHint: true },
		},
		async ({ sessionId, step, variables, confirmed }) => {
			try {
				return jsonResult(
					await manager
						.get(sessionId)
						.perform(step as unknown as FlowStep, { variables, confirmed }),
				);
			} catch (error) {
				return errorResult(error);
			}
		},
	);

	server.registerTool(
		"browser_verify",
		{
			description:
				"Verify a final-state postcondition with an assert FlowStep. A successful assertion is included in the published workflow.",
			inputSchema: z.object({
				sessionId: z.string().uuid(),
				assertion: flowStepSchema,
			}),
			annotations: { readOnlyHint: false, destructiveHint: false },
		},
		async ({ sessionId, assertion }) => {
			try {
				return jsonResult(await manager.get(sessionId).verify(assertion as unknown as AssertStep));
			} catch (error) {
				return errorResult(error);
			}
		},
	);

	server.registerTool(
		"browser_publish_flow",
		{
			description:
				"Validate and write the successful draft as a normal agent-free JSON workflow. Requires at least one successful assertion.",
			inputSchema: z.object({
				sessionId: z.string().uuid(),
				path: z.string().min(1),
				name: z.string().min(1).optional(),
				description: z.string().optional(),
				variables: z.record(z.string(), z.unknown()).optional(),
			}),
			annotations: { readOnlyHint: false, destructiveHint: false },
		},
		async ({ sessionId, ...options }) => {
			try {
				return jsonResult(await manager.get(sessionId).publish(options));
			} catch (error) {
				return errorResult(error);
			}
		},
	);

	server.registerTool(
		"browser_trace_get",
		{
			description:
				"Read the structured action/observation trace. It contains no model reasoning and redacts typed and evaluated results.",
			inputSchema: z.object({ sessionId: z.string().uuid() }),
			annotations: { readOnlyHint: true, destructiveHint: false },
		},
		async ({ sessionId }) => {
			try {
				return jsonResult(await manager.get(sessionId).getTrace());
			} catch (error) {
				return errorResult(error);
			}
		},
	);

	server.registerTool(
		"browser_session_close",
		{
			description: "Close the browser and remove the authoring session from memory.",
			inputSchema: z.object({ sessionId: z.string().uuid() }),
			annotations: { readOnlyHint: false, destructiveHint: false },
		},
		async ({ sessionId }) => {
			try {
				await manager.close(sessionId);
				return jsonResult({ closed: true, sessionId });
			} catch (error) {
				return errorResult(error);
			}
		},
	);

	return server;
}

export function startMcpServer(): void {
	const manager = new AuthoringSessionManager();
	serveStdio(() => createBrowserAutomationMcpServer(manager), {
		onerror: (error) => console.error("MCP server error:", error),
	});
}
