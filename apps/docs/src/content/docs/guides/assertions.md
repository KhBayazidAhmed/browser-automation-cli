---
title: Assertions & Visual Validation
description: Create assertions during live recording and validate page state at runtime.
---

# 🔎 Assertions & Visual Validation

Assertions verify that pages reach expected milestones, forms submit cleanly, content loads correctly, and attributes match critical requirements.

---

## 🔴 Recording Assertions with Live HUD

There are two ways to add assertions during a recording session:

1. **Alt + Click Shortcut**: Hold `Alt` (or `Option` on macOS) and click any element on the page. In strict mode, this automatically inserts an exact equality check.
2. **HUD Menu**: Click **Add step ▾ → Assert element** on the floating toolbar, then click the target element.

An assertion modal will open, displaying the detected selector and preview text:
- **Assertion Type**: Choose between `strict` (exact match), `contains` (substring match), `startsWith`, `endsWith`, or `regex` pattern.
- **Expected Value**: Edit or parameterize the expected text.

---

## 🎯 Full Assertion Schema & Match Types

| Property | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `equals` | `string` | Requires exact string equality (after whitespace normalization). | `"equals": "Order Confirmed"` |
| `contains` | `string` | Checks if the element text or attribute contains the substring. | `"contains": "Welcome"` |
| `startsWith` | `string` | Checks if element text or attribute begins with the specified prefix. | `"startsWith": "Invoice #"` |
| `endsWith` | `string` | Checks if element text or attribute ends with the specified suffix. | `"endsWith": "items in cart"` |
| `matches` | `string` | Tests a regular expression pattern against the text or attribute. | `"matches": "^ORD-[0-9]{6}$"` |
| `strictText` | `boolean \| string` | When `true`, enforces strict string equality matching. | `"strictText": true` |
| `text` | `string` | Base target text used as default matcher when `contains`/`equals` are omitted. | `"text": "Dashboard"` |
| `attribute` | `string` | Inspects a specific HTML attribute (e.g. `value`, `href`, `src`, `aria-label`). If omitted, checks inner visible text. | `"attribute": "value"` |
| `ignoreCase` | `boolean` | Case-insensitive matching (default: `false`). | `"ignoreCase": true` |
| `normalizeWhitespace` | `boolean` | Collapses multiple spaces, tabs, and newlines into a single space (default: `true`). | `"normalizeWhitespace": true` |
| `frame` | `string` | Name, index, ID, or URL substring of target child iframe. | `"frame": "payment-frame"` |
| `timeout` | `number` | Maximum time in milliseconds to poll for the assertion to pass (default: `5000`). | `"timeout": 10000` |

---

## ⚙️ How Assertion Evaluation Works

When the flow runner evaluates an `assert` step:

1. **Context Resolution**: Resolves the target iframe or main frame.
2. **Element Waiting**: Polls the DOM until the selector appears (or until `timeout` expires).
3. **Value Extraction**: Reads the specified `attribute` (or `value` for input/textarea/select, or `innerText` / `textContent`).
4. **Normalization**: Applies whitespace normalization unless `normalizeWhitespace: false`.
5. **Pattern Check**: Evaluates `matches` regex, `startsWith`, `endsWith`, `contains`, `equals`, or `strictText` in that priority order.
6. **Pass / Fail**: If the condition succeeds, execution immediately proceeds. If the timeout expires without satisfying the condition, the step fails with a descriptive diff error.

---

## 📋 Comprehensive Assertion Examples

### Exact Title Verification
```json
{
  "name": "Verify page title",
  "action": "assert",
  "selector": "h1.page-heading",
  "equals": "Account Settings",
  "ignoreCase": true,
  "timeout": 5000
}
```

### Form Input Value Validation
```json
{
  "name": "Verify prepopulated email",
  "action": "assert",
  "selector": "input#email-input",
  "attribute": "value",
  "equals": "alice@example.com"
}
```

### Regex Pattern Match on Order ID
```json
{
  "name": "Verify generated tracking code",
  "action": "assert",
  "selector": "#tracking-badge",
  "matches": "TRACK-[A-Z0-9]{8}",
  "timeout": 8000
}
```

### Iframe Content Verification
```json
{
  "name": "Verify payment success inside iframe",
  "action": "assert",
  "frame": "stripe-checkout-frame",
  "selector": ".payment-status",
  "contains": "Payment Successful"
}
```

---

## 🤖 Agent Authoring Verification (`browser_verify`)

In agent authoring sessions (`bflow mcp` / `bun mcp`), assertions are first-class primitives. The AI agent must call `browser_verify` with an assertion step proving the goal was met before `browser_publish_flow` will allow publishing the workflow.

