---
title: Workflow JSON Schema
description: Full reference for declarative JSON workflow structure, step actions, and locators.
---

# 📄 Workflow JSON Schema Reference

Every recorded or custom workflow in Bflow is defined as a JSON object adhering to the schema below.

## 🧱 Top-Level Structure

```json
{
  "name": "My Automation Flow",
  "description": "Optional workflow description",
  "version": "1.0.0",
  "headless": true,
  "blockMedia": false,
  "variables": {
    "searchQuery": "Bun runtime",
    "itemLimit": 10
  },
  "data": {
    "source": "users",
    "results": {
      "confirmation": "data.confirmationText"
    },
    "sensitiveColumns": ["password"]
  },
  "dataSources": {
    "users": {
      "provider": "google-sheets",
      "uri": "google-sheets://SPREADSHEET_ID/Users?range=A:E"
    }
  },
  "steps": []
}
```

`data` and `dataSources` are optional. When present, `bun workflow run` streams rows from the logical source and makes fields available through `{{row.column}}`. Provider details never appear in individual workflow steps.

| Field | Required | Description |
| :--- | :--- | :--- |
| `name` | Yes | Human-readable workflow name. |
| `steps` | Yes | Ordered array of deterministic step objects. |
| `description`, `version` | No | Workflow metadata; `name` plus `version` also identifies resumable row state. |
| `headless` | No | Default browser visibility for normal replay. CLI flags can override it. |
| `blockMedia` | No | Enable the workflow's media-blocking behavior. |
| `variables` | No | Workflow-level interpolation defaults. |
| `data.source` | With configured data | Logical key selected from `dataSources`. |
| `data.results` | No | Maps destination columns to paths in each `FlowExecutionResult`. |
| `data.sensitiveColumns` | No | Additional row columns whose values must be redacted. |
| `dataSources` | No | Named provider configurations with `provider`, `uri`, optional `account`, and provider `options`. |

---

## ⚡ Supported Step Actions

### 1. `goto` — Navigate to URL
```json
{
  "action": "goto",
  "url": "https://example.com",
  "waitUntil": "domcontentloaded",
  "timeout": 30000
}
```

`waitUntil` accepts `load`, `domcontentloaded`, or `networkidle`.

---

### 2. `click` — Click Element
Locates and clicks an element via CSS selector or strict human text.
```json
{
  "action": "click",
  "selector": "button.submit",
  "timeout": 5000
}
```

Instead of `selector`, use a text matcher such as `"text": "Sign In"` with `"strictText": true`.

---

### 3. `type` — Enter Text into Input
```json
{
  "action": "type",
  "selector": "input[name='username']",
  "text": "{{userEmail}}",
  "clearFirst": true,
  "timeout": 5000
}
```

---

### 4. `extract` — Extract Single Value
Extracts text or attribute from an element into a workflow variable.
```json
{
  "action": "extract",
  "selector": "h1.title",
  "as": "pageTitle",
  "attribute": "text",
  "all": false
}
```

Use an attribute name such as `href`, `src`, or `value`; `text`/`innerText` extract visible content. Set `all` to return every match.

---

### 5. `extractMultiple` — Extract Lists / Grids
Extracts repeating structures (cards, table rows, lists) into an array of structured JSON objects.
```json
{
  "action": "extractMultiple",
  "containerSelector": ".product-card",
  "as": "products",
  "limit": 20,
  "fields": {
    "title": "h3.product-title",
    "price": ".price-tag",
    "url": "a.product-link@href"
  }
}
```

---

### 6. `assert` — Assert State & Content
Verifies that text or attribute conditions match expectations.
```json
{
  "action": "assert",
  "selector": ".status-message",
  "contains": "Welcome",
  "ignoreCase": true,
  "timeout": 5000
}
```

Choose an assertion condition such as `text`, `strictText`, `equals`, `contains`, `startsWith`, `endsWith`, or regex `matches`. Set `attribute` when the assertion should inspect an element attribute instead of its text.

---

### 7. `wait` / `waitForSelector` — Timing & Delays
Fixed duration:

```json
{
  "action": "wait",
  "durationMs": 2000
}
```

Wait for a selector or text matcher:

```json
{
  "action": "waitForSelector",
  "selector": "#dashboard-loaded",
  "timeout": 10000
}
```

---

### 8. `screenshot` — Capture Visual Artifact
```json
{
  "action": "screenshot",
  "path": "output/dashboard.png",
  "selector": "#dashboard",
  "fullPage": true
}
```

When `selector` is present, only that element is captured and `fullPage` is ignored.

---

### 9. `pdf` — Export Page to PDF
```json
{
  "action": "pdf",
  "path": "output/report.pdf"
}
```

---

### 10. `block` — Block Resource Requests
Block heavy network resources (images, stylesheets, fonts, media, scripts) to optimize performance.
```json
{
  "action": "block",
  "types": ["image", "font", "media"]
}
```

---

### 11. `eval` — Execute JavaScript
Run arbitrary JavaScript in the page context and optionally store the return value.
```json
{
  "action": "eval",
  "script": "document.querySelectorAll('a').length",
  "as": "totalLinkCount"
}
```

---

### 12. `save` — Save Extracted Data
Write all extracted variables and multiple extractions to disk as JSON or CSV.
```json
{
  "action": "save",
  "path": "output/results.json",
  "format": "json"
}
```

`format` accepts `json` or `csv`.

---

## 🎯 Human-Centric Locator Attributes

Element targeting steps (`click`, `type`, `waitForSelector`, `extract`, and `assert`) support human-centric matching properties. Applicable fields vary slightly by action:

| Property | Type | Description |
| :--- | :--- | :--- |
| `text` | String | Substring or strict text match. |
| `strictText` | Boolean | Forces exact string equality. |
| `ignoreCase` | Boolean | Case-insensitive matching. |
| `regex` | String | Regular expression pattern. |
| `startsWith` | String | Match elements starting with prefix. |
| `endsWith` | String | Match elements ending with suffix. |
| `normalizeWhitespace` | Boolean | Collapses multiple spaces and newlines (default `true`). |

Use `frame` on a step to target a matching child frame. A step can also declare a `variables` object for low-precedence, step-local defaults.

## 🔄 Variable Interpolation

Strings can reference workflow values, CLI overrides, extracted values, row columns, nested paths, and environment variables:

```json
{
  "action": "type",
  "selector": "#email",
  "text": "{{row.contact.email | trim | lowercase}}",
  "variables": {
    "fallbackDomain": "example.com"
  }
}
```

Use `{{env.ACCOUNT_PASSWORD}}` for secrets. Supported transformations are `trim`, `lowercase`, `uppercase`, `replace`, `default`, `split`, `join`, `uuid`, `random`, `date`, `formatDate`, `json`, and `urlEncode`. Transformations are evaluated left-to-right.

Variable precedence from highest to lowest is system, CLI, workflow, row, then step-local values.

## 🔐 Data-Driven Artifact Safety

During row execution, columns detected as sensitive—or named in `data.sensitiveColumns`—are redacted from errors, summaries, saved JSON/CSV data, screenshots, and PDFs. Screenshot/PDF masking is temporary and restored immediately after capture. Sensitive workflow inputs should remain environment references rather than literal workflow variables.
