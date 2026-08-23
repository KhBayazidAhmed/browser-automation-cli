# Direct CDP Browser Automation CLI

A Bun CLI, guided terminal wizard, and visual recorder built directly on Chrome DevTools Protocol (CDP). It supports text-aware locators, frames, declarative JSON workflows, extraction, screenshots, PDFs, browser profiles, and programmatic tasks.

## Requirements

- Bun 1.3 or newer
- Google Chrome, Chromium, Brave, or Microsoft Edge

From this directory:

```bash
bun install
bun run dev
```

From the repository root, use `bun cli` to open only this app. The root `bun run dev` command starts every development workspace.

## Common commands

```bash
# Interactive wizard
bun run dev

# Record a workflow
bun run record workflows/my-flow.json https://example.com

# Run a workflow, headless by default
bun run flow workflows/hn-top-stories.json
bun run flow workflows/hn-top-stories.json --headed

# Override workflow variables
bun run flow workflows/search.json --query="browser automation" --limit=10

# Tasks and live REPL
bun run tasks
bun run task scrape-hn --limit=5
bun run repl

# Direct one-page operation
bun src/index.ts --url=https://example.com --screenshot=output/example.png

# Verification
bun run check-types
bun run test
```

Relative paths beginning with `workflows/` or `output/` resolve against this app directory, even when the command is launched from the repository root.

## Recorder

The recorder opens a visible browser and adds an in-page toolbar. It records navigation, clicks, typing, waits, assertions, extraction, list extraction, and screenshots. The terminal also accepts:

- `c` / `config` — print the current JSON
- `s` / `steps` — list recorded steps
- `w <ms>` — add a wait
- `u` / `undo` — remove the last step
- `d <index>` — delete a step
- `v <key>=<value>` — set a workflow variable
- `p` / `pause` — pause or resume recording
- `f` or an empty line — finish

The workflow draft is checkpointed throughout recording, so closing the browser still leaves the latest draft on disk.

### Secrets

Password, token, secret, and one-time-code inputs are never stored as literal values by the recorder. They become environment references such as:

```json
{
  "action": "type",
  "selector": "input[type=password]",
  "text": "{{env.LOGIN_PASSWORD}}"
}
```

Set the value only in the process environment:

```bash
LOGIN_PASSWORD='your-secret' bun run flow workflows/login.json
```

Navigation URLs containing common credential or session parameters are skipped by the recorder. Do not commit cookies, session URLs, passwords, or generated output containing private data.

## Workflow format

This is a complete, valid example:

```json
{
  "name": "Hacker News Top Stories",
  "description": "Extract the first ten story links",
  "headless": true,
  "blockMedia": true,
  "variables": {
    "siteUrl": "https://news.ycombinator.com"
  },
  "steps": [
    {
      "name": "Open Hacker News",
      "action": "goto",
      "url": "{{siteUrl}}",
      "waitUntil": "domcontentloaded"
    },
    {
      "name": "Verify the page",
      "action": "assert",
      "selector": "body",
      "contains": "Hacker News"
    },
    {
      "name": "Extract stories",
      "action": "extractMultiple",
      "containerSelector": "tr.athing",
      "limit": 10,
      "fields": {
        "title": ".titleline > a",
        "url": ".titleline > a@href"
      },
      "as": "topStories"
    },
    {
      "action": "screenshot",
      "path": "output/hn-top.png",
      "fullPage": true
    },
    {
      "action": "save",
      "path": "output/hn-top.csv",
      "format": "csv"
    }
  ]
}
```

Supported actions:

| Action | Required fields | Useful options |
| --- | --- | --- |
| `goto` | `url` | `waitUntil`, `timeout` |
| `click` | a selector or text matcher | `frame`, `strictText`, `ignoreCase`, `timeout` |
| `type` | `text` and `selector`/`targetText` | `clearFirst`, `frame`, `timeout` |
| `wait` | `durationMs` | — |
| `waitForSelector` | a selector or text matcher | `frame`, `timeout` |
| `extract` | `as` and a selector/text matcher | `attribute`, `all`, `frame`, `timeout` |
| `extractMultiple` | `as`, `containerSelector`, `fields` | `limit`, text/regex filters, `frame` |
| `screenshot` | — | `path`, `selector`, `fullPage`, `frame` |
| `pdf` | — | `path` |
| `block` | `types` | image, stylesheet, font, media, script |
| `eval` | `code` or `script` | `selector`, `frame`, `as` |
| `assert` | an assertion condition | `selector`, `attribute`, `frame`, `timeout` |
| `save` | — | `path`, `format` (`json` or `csv`) |

Text matching supports `text`, `strictText`, `regex`, `startsWith`, `endsWith`, `ignoreCase`, and `normalizeWhitespace` where applicable. An `eval` step with a selector exposes the matched DOM node as `element` to its script.

Each run writes a uniquely named full report to `output/`. Runs with extracted data also write a separate data file. A failed run includes completed-step details and the failure message.

## Browser profiles

```bash
bun src/index.ts profiles
bun run flow workflows/my-flow.json --profile=<profile-id>
```

By default, a selected browser profile is copied into a temporary isolated directory and removed after the run. `--direct-profile` uses the original profile directory and should only be used when that browser is closed.

## Test architecture

The browser tests use an ephemeral local HTTP fixture server and a real Chromium-based browser. The main suites cover CDP lifecycle, navigation, locators, clicks, forms, frames, recording, resource blocking, screenshots, assertions, workflows, and profile handling.

```bash
bun run test
bun run test:headed
bun run test:strict
bun run test:flows
```
