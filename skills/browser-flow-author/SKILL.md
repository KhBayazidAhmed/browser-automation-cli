---
name: browser-flow-author
description: Author deterministic Bflow workflows from natural-language goals through the local MCP tools. Use when a user wants Codex, Claude, or another MCP agent to teach a browser flow that will later replay without an agent.
---

# Browser Flow Author

Create a reviewed JSON workflow that runs through `bun flow` without a model or MCP connection.

## Authoring loop

1. Call `browser_session_start` with the user's goal, initial URL, and the smallest suitable domain allowlist.
2. Use the returned observation to choose one deterministic workflow step. Observe again whenever page state is uncertain.
3. Call `browser_perform` with one ordinary `FlowStep`. Failed steps are trace-only; inspect their returned observation and recover with another deterministic step.
4. Express ordinary reusable inputs as workflow variables. In sensitive steps, reference passwords, tokens, OTPs, and credentials directly as `{{env.NAME}}`; do not put them in workflow variables or send literal secrets to a tool.
5. Before setting `confirmed: true`, obtain explicit user approval for the exact submit, send, purchase, delete, publish, transfer, or arbitrary-evaluation action.
6. Call `browser_verify` with an assertion that proves the requested final state.
7. Call `browser_publish_flow` to write the flow within the current project, then close the session.

## Quality bar

- Prefer stable IDs, names, `data-testid`, ARIA labels, placeholders, and exact visible text over positional selectors.
- Record the minimum steps needed to reproduce the outcome.
- Do not publish a workflow containing agent-only instructions or unresolved goals.
- Treat element `ref` values as observation-local hints; put the returned selector or text locator in the workflow step.
- Tell the user the workflow path, required variables or environment values, and the `bun flow` command to replay it.
