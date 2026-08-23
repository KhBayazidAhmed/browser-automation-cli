---
title: Agent-Assisted Workflow Authoring
description: Let Codex, Claude, or another MCP agent create a deterministic workflow that replays without a model.
---

# Agent-Assisted Workflow Authoring

The local MCP server lets an existing AI agent operate a persistent browser, recover while teaching the flow, and publish the successful actions as an ordinary workflow JSON file. The published workflow runs through the existing deterministic runner; it does not need the authoring agent, an MCP connection, or a model API key.

```text
goal → agent → observe/perform/verify → workflow.json → bun flow
```

## Start the MCP server

From the repository root:

```bash
bun mcp
```

The server uses STDIO, so an MCP host normally launches it for you. Use an absolute repository path in host configuration.

If you use a standalone build instead of the repository, configure the MCP host to launch `bflow mcp`.

### Codex

```bash
codex mcp add bflow -- \
  bun --cwd /absolute/path/to/browser-automation-cli run mcp
```

### Claude Code

```bash
claude mcp add bflow --scope project -- \
  bun --cwd /absolute/path/to/browser-automation-cli run mcp
```

The reusable companion instructions are in `skills/browser-flow-author/SKILL.md`. Install or reference that skill in the agent environment when you want the authoring workflow to be discovered automatically.

## Available tools

| Tool | Purpose |
| :--- | :--- |
| `browser_profiles_list` | List safe profile identifiers before asking the user whether to clone one. |
| `browser_session_start` | Launch a bounded, persistent browser session and return its initial observation. |
| `browser_observe` | Read compact visible text, frames, interactive elements, and resilient selectors. |
| `browser_perform` | Execute one existing workflow step and add it to the draft only when successful. |
| `browser_verify` | Prove the final state with an assertion that becomes part of the workflow. |
| `browser_publish_flow` | Validate and write the deterministic JSON workflow. |
| `browser_trace_get` | Read action and observation records without model reasoning. |
| `browser_session_close` | Close Chrome and release the in-memory session. |

## Authoring lifecycle

1. Start a session with a plain-language goal and initial URL. A clean browser profile is used by default.
2. Observe the compact page state before selecting each deterministic workflow step.
3. Perform one step. Successful actions enter the draft; failed attempts remain trace-only.
4. Observe again after navigation or failure and recover using fresh page state.
5. Verify the goal with at least one successful `assert` step.
6. Publish the draft beneath the current project directory, close the session, and replay it with `bun flow`.

`browser_session_start` accepts an explicit domain allowlist, a 1–200 action budget, and a 1-second to 60-minute session timeout. Defaults are the initial domain, 50 attempted actions, and 15 minutes. Observations expose compact visible text, up to 120 interactive elements with resilient selectors, and frame metadata instead of raw page HTML.

## Safety boundaries

- Sessions default to the initial website's domain, 50 attempted actions, and 15 minutes.
- Add domains explicitly when a legitimate flow crosses origins.
- List browser profile IDs first. A selected profile is cloned only after explicit user confirmation; profile paths and account details are not exposed to the agent tool response.
- Sensitive steps reference environment values directly—for example, a type step whose `text` is `{{env.ACCOUNT_PASSWORD}}`; do not place secrets in workflow variables.
- Submit, send, purchase, delete, publish, transfer, and arbitrary evaluation actions require explicit confirmation.
- Failed actions remain in `output/authoring/<session-id>/trace.jsonl` and are excluded from the published workflow. Typed values, evaluation scripts, and evaluation results are redacted from traces.
- Publication requires at least one successful final-state assertion.
- The step budget counts attempted actions, including failures, and the timeout is enforced before observe, perform, and publish operations.

## Replay without the agent

After publication, stop the MCP server and run the flow normally:

```bash
bun flow workflows/my-flow.json
```

Pass normal variable overrides or environment values as required by the generated workflow.
