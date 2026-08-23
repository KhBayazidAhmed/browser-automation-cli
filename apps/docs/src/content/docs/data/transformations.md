---
title: Transformations
description: Transform provider-neutral variables during interpolation.
---

# Transformations

Chain transformations with pipes:

```json
{ "action": "type", "selector": "#email", "text": "{{row.email | trim | lowercase}}" }
```

Available transformations are `trim`, `lowercase`, `uppercase`, `replace(search,replacement)`, `default(value)`, `split(separator)`, `join(separator)`, `uuid`, `random(length)`, `date`, `formatDate(locale,options)`, `json`, and `urlEncode`.

```text
{{row.first_name | trim | replace(" ","-") | lowercase}}
{{row.tags | split(",") | join("|")}}
{{row.callback | urlEncode}}
```

Transformations run locally and do not depend on the active provider.

Pipelines are evaluated left-to-right. Transformation names are case-insensitive, quoted arguments may contain commas, and `formatDate(locale, options)` accepts an `Intl.DateTimeFormat` options object encoded as JSON.
