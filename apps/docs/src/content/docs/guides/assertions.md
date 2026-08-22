---
title: Assertions & Visual Validation
description: Create assertions during live recording and validate page state at runtime.
---

# 🔎 Assertions & Visual Validation

Assertions ensure your workflows behave reliably and verify expected page states, successful form submissions, or specific content changes.

---

## 🔴 Recording Assertions with Live HUD

There are two easy ways to add assertions during a recording session:

1. **Alt + Click Shortcut**: Hold `Alt` (or `Option` on macOS) and click any element on the page.
2. **HUD Button**: Click **🔎 Assert** on the in-page floating toolbar and click the target element.

An assertion configuration modal will open with pre-populated values from the selected element.

---

## 🎯 Match Types & Assertion Rules

| Match Type | JSON Property | Description | Example |
| :--- | :--- | :--- | :--- |
| **Strict Equals** | `"equals": "..."` | Requires exact string equality. | `"equals": "Order Confirmed"` |
| **Contains Substring** | `"contains": "..."` | Checks if element text contains the substring. | `"contains": "Welcome"` |
| **Starts With** | `"startsWith": "..."` | Element text must start with prefix. | `"startsWith": "Invoice #"` |
| **Ends With** | `"endsWith": "..."` | Element text must end with suffix. | `"endsWith": "items in cart"` |
| **Regex Match** | `"matches": "..."` | Evaluates a regular expression pattern against the text. | `"matches": "^Total: \\$[0-9]+"` |

---

## ⚙️ Advanced Assertion Options

### Case Sensitivity (`ignoreCase`)
By default, matching is case-sensitive. Set `"ignoreCase": true` to match text regardless of capitalization.

### Whitespace Normalization (`normalizeWhitespace`)
Web pages frequently contain multiple tabs, line breaks, or irregular whitespace. By default, whitespace normalization is **enabled** (`normalizeWhitespace: true`), collapsing consecutive whitespace characters into a single space and trimming edges.

### Target Specific Attributes (`attribute`)
You can assert against HTML attributes instead of inner text:
```json
{
  "action": "assert",
  "selector": "input#email",
  "attribute": "value",
  "equals": "alice@example.com"
}
```

---

## 📋 Example Assertion Steps

```json
[
  {
    "name": "Verify successful login message",
    "action": "assert",
    "selector": ".dashboard-welcome",
    "text": "Welcome back, Admin!",
    "contains": "Welcome back",
    "ignoreCase": true,
    "timeout": 5000
  },
  {
    "name": "Verify order ID format",
    "action": "assert",
    "selector": "#order-confirmation-code",
    "matches": "ORD-[0-9]{6}-[A-Z]{2}",
    "timeout": 5000
  }
]
```

> [!NOTE]
> If an assertion condition is not met before the `timeout` expires (default: 5000ms), the flow runner marks the step as failed, logs a descriptive error, and stops execution.
