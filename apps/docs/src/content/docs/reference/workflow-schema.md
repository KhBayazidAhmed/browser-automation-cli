---
title: Workflow JSON Schema
description: Full reference for declarative JSON workflow structure, step actions, and locators.
---

# 📄 Workflow JSON Schema Reference

Every recorded or custom workflow in Browser Automation CLI is defined as a JSON object adhering to the schema below.

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
  "steps": [
    // Array of Step Objects
  ]
}
```

---

## ⚡ Supported Step Actions

### 1. `goto` — Navigate to URL
```json
{
  "action": "goto",
  "url": "https://example.com",
  "waitUntil": "domcontentloaded", // "load" | "domcontentloaded"
  "timeout": 30000
}
```

---

### 2. `click` — Click Element
Locates and clicks an element via CSS selector or strict human text.
```json
{
  "action": "click",
  "selector": "button.submit", // or text locator
  "text": "Sign In",           // Optional: text matching
  "strictText": true,          // Exact case-sensitive match
  "timeout": 5000
}
```

---

### 3. `type` — Enter Text into Input
```json
{
  "action": "type",
  "selector": "input[name='username']",
  "text": "{{userEmail}}",     // Supports variable substitution
  "clearFirst": true,          // Clear existing text before typing
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
  "attribute": "text",         // "text" | "innerText" | "href" | "src" | "value"
  "all": false
}
```

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
  "text": "Welcome back",
  "contains": "Welcome",       // Substring check
  "equals": "Welcome back!",   // Exact equality check
  "matches": "^Welcome.*!$",   // Regex check
  "ignoreCase": true,
  "timeout": 5000
}
```

---

### 7. `wait` / `waitForSelector` — Timing & Delays
```json
// Fixed duration wait
{
  "action": "wait",
  "durationMs": 2000
}

// Wait for an element to appear in the DOM
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
  "fullPage": true
}
```

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
  "format": "json" // "json" | "csv"
}
```

---

## 🎯 Human-Centric Locator Attributes

All element interactions (`click`, `type`, `extract`, `assert`) support human-centric matching properties:

| Property | Type | Description |
| :--- | :--- | :--- |
| `text` | String | Substring or strict text match. |
| `strictText` | Boolean | Forces exact string equality. |
| `ignoreCase` | Boolean | Case-insensitive matching. |
| `regex` | String | Regular expression pattern. |
| `startsWith` | String | Match elements starting with prefix. |
| `endsWith` | String | Match elements ending with suffix. |
| `normalizeWhitespace` | Boolean | Collapses multiple spaces and newlines (default `true`). |
