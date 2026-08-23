---
title: Row Variables
description: Resolve row fields and nested paths inside workflow steps.
---

# Row Variables

Reference columns directly or through the explicit `row` object:

```json
{
  "action": "type",
  "selector": "#email",
  "text": "{{row.user.email}}"
}
```

Nested paths are supported. Required references are checked against the discovered schema before Chrome launches, and missing columns are reported by name.

Top-level columns can also be referenced without the `row.` prefix, but the explicit form is recommended when a name could overlap workflow or CLI variables.

Variable precedence, highest first, is: system, CLI, workflow, row, and step-local. Environment secrets remain available as `{{env.SECRET_NAME}}`; a missing environment reference fails validation instead of being typed literally.
