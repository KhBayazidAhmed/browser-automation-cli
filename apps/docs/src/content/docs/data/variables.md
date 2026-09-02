---
title: Row Variables & Interpolation
description: Resolve row fields and nested paths inside workflow steps.
---

# 🔤 Row Variables & Interpolation

In data-driven executions, row values are injected into workflow steps using template placeholders: `{{row.columnName}}`.

```json
{
  "name": "Submit Lead Form",
  "steps": [
    {
      "action": "type",
      "selector": "input#full-name",
      "text": "{{row.first_name}} {{row.last_name}}"
    },
    {
      "action": "type",
      "selector": "input#email",
      "text": "{{row.contact.email}}"
    }
  ]
}
```

---

## 🎯 Variable Precedence Hierarchy

When the same variable identifier exists across multiple layers, Bflow resolves values in the following strict order (highest priority wins):

| Priority | Scope | Example | Description |
| :--- | :--- | :--- | :--- |
| **1 (Highest)** | **System Variables** | `{{outputDir}}`, `{{__sensitiveValues}}` | Built-in runtime system paths and security collections. |
| **2** | **CLI Overrides** | `bflow flow ... --query="override"` | Values passed explicitly via command-line flags. |
| **3** | **Workflow Variables** | `variables: { query: "default" }` | Workflow-level variable definitions. |
| **4** | **Row Data** | `{{row.first_name}}`, `{{row.email}}` | Column values streaming from the external provider. |
| **5 (Lowest)** | **Step Variables** | `step.variables: { ... }` | Low-precedence step-local fallback values. |

---

## 🔐 Environment Secrets (`{{env.NAME}}`)

Never place passwords, API keys, or private tokens in workflow JSON files or spreadsheet cells. Use environment variable placeholders:

```json
{
  "action": "type",
  "selector": "input[type='password']",
  "text": "{{env.ACCOUNT_PASSWORD}}"
}
```

If an environment reference is missing from your system environment at runtime, execution halts with a validation error rather than typing the literal placeholder string into the browser.

---

## 🔍 Pre-Flight Schema Validation

Before launching any Chrome instances, Bflow discovers the provider schema and validates all referenced `{{row.column}}` variables. If a workflow references a non-existent column (e.g. `{{row.postal_code}}` when only `zip_code` exists), Bflow reports the mismatch immediately, saving time and compute resources.

