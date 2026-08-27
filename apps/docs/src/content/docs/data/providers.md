---
title: Data Providers
description: Provider contracts, discovery, and source configuration.
---

# 🔌 Data Providers

Bflow's data engine is built on an extensible provider architecture. Providers abstract external data systems into streaming iterators and sparse updaters, allowing browser workflows to remain completely decoupled from data storage implementation details.

---

## 📋 Listing Installed Providers

List all data providers available in your installation:

```bash
# Standalone CLI
bflow data providers

# Monorepo development
bun data providers
```

The built-in registry includes:
- `google-sheets`: Full OAuth 2.0 loopback authentication, metadata inspection, schema discovery, streaming reads, and batched sparse write-back.

---

## 🧩 Provider Contract

Every data provider implements the `DataProvider` interface:

- `connect()`: Initializes client sessions and validates credentials.
- `discoverSchema()`: Discovers column headers, inferred types, and tab dimensions without reading entire tables.
- `rows(options)`: Asynchronously streams rows (`fromRow`, `toRow`, `batchSize`) with stable row IDs.
- `update(records)`: Performs batched, sparse column updates on specified rows.
- `disconnect()`: Flushes pending buffers and cleanly terminates network connections.

---

## 🔗 Provider URI Structure

Data source references follow a standard URI schema:

```text
provider://resource/path?option1=val1&option2=val2
```

### Google Sheets Example:
```text
google-sheets://1BxiMVs0XRA5nFMdKvBdBZj.../Users?range=A:E&headerRow=1&gid=0
```

- **`provider`**: Registered provider ID (`google-sheets`).
- **`resource`**: Target identifier (Spreadsheet ID or URL).
- **`path`**: Sub-resource or tab name (`Users`).
- **`params`**: Optional configuration (e.g. `range`, `gid`, `headerRow`).

---

## ⚙️ Declaring Data Sources in Workflows

Define named data sources in your workflow JSON:

```json
{
  "dataSources": {
    "customers": {
      "provider": "google-sheets",
      "uri": "google-sheets://SPREADSHEET_ID/Customers?range=A:G",
      "account": "ops@example.com"
    }
  }
}
```

