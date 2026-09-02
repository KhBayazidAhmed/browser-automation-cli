---
title: Workflow JSON Schema
description: Full reference for declarative JSON workflow structure, step actions, and locators.
---

# 📄 Workflow JSON Schema Reference

Every recorded or custom workflow in Bflow is defined as a clean, version-controllable JSON document adhering to the schema below.

---

## 🧱 Top-Level Workflow Structure

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
      "confirmation_code": "data.confirmationCode"
    },
    "sensitiveColumns": ["password", "ssn"]
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

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | Yes | Human-readable workflow name. |
| `steps` | Step[] | Yes | Ordered array of deterministic step objects. |
| `description` | String | No | Workflow summary and purpose. |
| `version` | String | No | Semantic version string (used with `name` to key state checkpoints). |
| `headless` | Boolean | No | Default browser execution mode (`true` by default). |
| `blockMedia` | Boolean | No | Automatically blocks images, media, and fonts when `true`. |
| `variables` | Record<string, any> | No | Workflow-level variable defaults. |
| `data` | Object | No | Data execution config (`source`, `results`, `sensitiveColumns`). |
| `dataSources` | Record<string, DataSource> | No | Named provider configurations (`provider`, `uri`, `account`, `options`). |

---

## ⚡ Complete Step Action Catalog

### 1. `goto` — Navigate to URL
```json
{
  "name": "Navigate to target page",
  "action": "goto",
  "url": "https://example.com",
  "waitUntil": "domcontentloaded",
  "timeout": 30000
}
```
- `waitUntil`: `"load"`, `"domcontentloaded"`, or `"networkidle"`.
- `timeout`: Navigation timeout in ms (default: `30000`).

---

### 2. `click` — Click Element
```json
{
  "name": "Click submit button",
  "action": "click",
  "selector": "button[type='submit']",
  "timeout": 5000
}
```
- Supports human text targeting: `"text": "Sign In"`, `"strictText": true`, `"ignoreCase": true`.
- `frame`: Target iframe context.

---

### 3. `type` — Type Text into Input
```json
{
  "name": "Enter account email",
  "action": "type",
  "selector": "input#email",
  "text": "{{row.email}}",
  "clearFirst": true,
  "timeout": 5000
}
```
- `clearFirst`: Automatically selects and erases existing text before typing (default: `true`).

---

### 4. `extract` — Extract Single Field or Attribute
```json
{
  "name": "Extract article headline",
  "action": "extract",
  "selector": "h1.entry-title",
  "as": "pageHeadline",
  "attribute": "text",
  "all": false,
  "timeout": 5000
}
```
- `attribute`: `"text"`, `"innerText"`, `"href"`, `"src"`, `"value"`, `"aria-label"`, or any HTML attribute.
- `all`: When `true`, returns `string[]` for all matching elements.

---

### 5. `extractMultiple` — Extract Structured Lists / Cards
```json
{
  "name": "Extract catalog products",
  "action": "extractMultiple",
  "containerSelector": ".product-item",
  "as": "products",
  "limit": 20,
  "fields": {
    "title": "h3.title",
    "price": ".price",
    "url": "a.product-link@href",
    "thumbnail": "img.photo@src"
  },
  "filterText": "In Stock",
  "filterIgnoreCase": true
}
```
- Use `@attribute` syntax in `fields` (e.g. `a@href`, `img@src`) to extract attributes.

---

### 6. `assert` — Verify DOM State & Content
```json
{
  "name": "Verify order confirmation",
  "action": "assert",
  "selector": ".confirmation-msg",
  "text": "Order Placed",
  "contains": "Order Placed",
  "ignoreCase": true,
  "timeout": 8000
}
```
- Match operators: `equals`, `contains`, `startsWith`, `endsWith`, `matches` (regex), `strictText`.

---

### 7. `wait` / `waitForSelector` — Delays & Synchronization
Fixed delay:
```json
{
  "name": "Pause 2 seconds",
  "action": "wait",
  "durationMs": 2000
}
```
Wait for element or text:
```json
{
  "name": "Wait for dashboard widget",
  "action": "waitForSelector",
  "selector": "#dashboard-ready",
  "timeout": 15000
}
```

---

### 8. `screenshot` — Capture Viewport or Element
```json
{
  "name": "Capture confirmation screenshot",
  "action": "screenshot",
  "path": "{{outputDir}}/receipt.png",
  "fullPage": true
}
```
- `selector`: When specified, captures only the bounding box of that element.

---

### 9. `pdf` — Export Page to PDF
```json
{
  "name": "Export invoice PDF",
  "action": "pdf",
  "path": "{{outputDir}}/invoice.pdf"
}
```

---

### 10. `block` — Block Network Requests
```json
{
  "name": "Block heavy media assets",
  "action": "block",
  "types": ["image", "media", "font"]
}
```
- Supported types: `image`, `media`, `font`, `stylesheet`, `script`.

---

### 11. `eval` — Execute In-Page JavaScript
```json
{
  "name": "Calculate total rows",
  "action": "eval",
  "script": "document.querySelectorAll('table.data tr').length",
  "as": "tableRowCount"
}
```

---

### 12. `save` — Export Extracted Variables to File
```json
{
  "name": "Export scraped dataset",
  "action": "save",
  "path": "output/dataset.json",
  "format": "json"
}
```
- `format`: `"json"` or `"csv"`.

---

## 🎯 Human-Centric Locator Attributes

Targeting steps (`click`, `type`, `waitForSelector`, `extract`, and `assert`) support expressive locator properties:

| Property | Type | Description |
| :--- | :--- | :--- |
| `selector` | String | Standard CSS selector (`#id`, `.class`, `button[name='btn']`). |
| `text` | String | Human-visible text or aria-label matching. |
| `strictText` | Boolean \| String | Forces exact string equality. |
| `ignoreCase` | Boolean | Case-insensitive matching. |
| `regex` | String | Regular expression pattern matching. |
| `startsWith` | String | Prefix matching. |
| `endsWith` | String | Suffix matching. |
| `normalizeWhitespace` | Boolean | Collapses multiple whitespace chars (default `true`). |
| `frame` | String | Child iframe name, index, ID, or URL substring. |

---

## 🔄 Variable Interpolation & Transformations

Workflow steps support template strings: `{{variableName}}` or `{{row.columnName}}`.
- **Precedence**: System > CLI Overrides > Workflow Variables > Row Data > Step-Local Defaults.
- **Pipes**: `{{row.email | trim | lowercase}}`.
- **Environment Secrets**: `{{env.API_KEY}}`.
- **Sensitive Redaction**: Fields in `data.sensitiveColumns` are masked during screenshots and redacted from summaries.

