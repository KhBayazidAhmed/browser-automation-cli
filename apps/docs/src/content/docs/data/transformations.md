---
title: Transformations Pipeline
description: Transform provider-neutral variables during interpolation.
---

# 🔄 Transformations Pipeline

Transformations allow you to sanitize, reformat, hash, or convert variable values in real time during template interpolation using Unix-style pipes (`|`).

```json
{
  "action": "type",
  "selector": "#username",
  "text": "{{row.first_name | trim | lowercase}}"
}
```

---

## 🛠️ Complete Transformations Reference

Bflow includes 13 built-in transformation functions:

| Transformation | Syntax | Description | Example |
| :--- | :--- | :--- | :--- |
| `trim` | `\| trim` | Removes leading and trailing whitespace. | `{{row.name \| trim}}` |
| `lowercase` | `\| lowercase` | Converts text to lowercase. | `{{row.email \| lowercase}}` |
| `uppercase` | `\| uppercase` | Converts text to uppercase. | `{{row.code \| uppercase}}` |
| `replace` | `\| replace("find", "rep")` | Replaces occurrences of a substring. | `{{row.phone \| replace("-", "")}}` |
| `default` | `\| default("fallback")` | Supplies a fallback value if variable is empty or undefined. | `{{row.country \| default("US")}}` |
| `split` | `\| split(",")` | Splits a delimited string into an array. | `{{row.tags \| split(",")}}` |
| `join` | `\| join(" - ")` | Joins array elements with a delimiter. | `{{row.tags \| join(", ")}}` |
| `uuid` | `\| uuid` | Generates a random UUIDv4 string. | `{{row.id \| uuid}}` |
| `random` | `\| random(8)` | Generates a random alphanumeric string of specified length. | `{{row.ref \| random(12)}}` |
| `date` | `\| date` | Outputs current ISO 8601 timestamp (`2026-08-28T...`). | `{{row.created_at \| date}}` |
| `formatDate` | `\| formatDate("en-US", '{"year":"numeric"}')` | Formats dates using standard `Intl.DateTimeFormat` options. | `{{row.dob \| formatDate("en-US")}}` |
| `json` | `\| json` | Serializes values into a valid JSON string. | `{{row.metadata \| json}}` |
| `urlEncode` | `\| urlEncode` | Encodes URL query component characters. | `{{row.search \| urlEncode}}` |

---

## 🔗 Chaining Transformation Pipelines

Pipelines evaluate strictly from left to right:

```text
{{row.name | trim | replace(" ", "-") | lowercase}}
{{row.tags | split(",") | join("|")}}
{{row.callback_url | trim | urlEncode}}
{{row.nickname | default(row.first_name) | trim | lowercase}}
```

Transformation names are case-insensitive. Quoted arguments cleanly support commas and escaped characters. Transformations execute entirely in memory and work across all registered data providers.

