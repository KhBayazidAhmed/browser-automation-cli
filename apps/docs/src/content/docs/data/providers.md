---
title: Data Providers
description: Provider contracts, discovery, and source configuration.
---

# Data Providers

List installed providers with:

```bash
bun data providers
```

A provider exposes schema discovery, asynchronous row streaming, stable row identity, and optional update operations. Workflows select a logical source name; connection details live under `dataSources` or in the `--data` URI.

The built-in registry currently exposes `google-sheets`, with streaming reads, schema discovery, append/update support, and sparse write-back. `bun data providers` reflects the providers installed in the current build.

Provider URIs use `provider://resource/path?options`. For example:

```text
google-sheets://SPREADSHEET_ID/Users?range=A:E&headerRow=1
```

The runner reads incrementally with bounded queues. It does not load an entire remote dataset before starting work.
