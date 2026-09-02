---
title: Google Sheets Provider
description: Authenticate, inspect, read, and use Google Sheets as workflow data.
---

# 📊 Google Sheets Provider

The **Google Sheets Provider** connects spreadsheets directly to Bflow as streaming data sources and result destinations.

---

## 🔑 Authentication & Setup

Set the OAuth Client ID configured in your Google Cloud console (OAuth consent screen with Google Sheets and Google Drive metadata scopes):

```bash
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-client-secret" # (Optional for installed desktop apps)
```

Log in using the interactive browser flow:

```bash
# Standalone CLI
bflow sheets login

# Monorepo development
bun sheets login
```

Verify authentication status:

```bash
bflow sheets status
bflow sheets accounts
```

> [!NOTE]
> OAuth tokens are securely stored in the system Keychain on macOS or in an AES-256-GCM encrypted local vault on Linux and Windows. Set `BROWSER_AUTOMATION_CREDENTIAL_KEY` to supply an explicit encryption key for headless environments.

---

## 🛠️ Complete Google Sheets CLI Commands

| Command | Description | Example |
| :--- | :--- | :--- |
| `bflow sheets login` | Initiates OAuth 2.0 loopback authentication. | `bflow sheets login --account=user@corp.com` |
| `bflow sheets status` | Validates token expiration and refresh capability for stored accounts. | `bflow sheets status` |
| `bflow sheets accounts` | Lists all authenticated Google accounts and token validity. | `bflow sheets accounts` |
| `bflow sheets list` | Lists all accessible Google Spreadsheets in your Drive. | `bflow sheets list` |
| `bflow sheets inspect <sheet>` | Discovers columns, types, sheet tabs, and dimensions without streaming data. | `bflow sheets inspect SPREADSHEET_ID --sheet=Users` |
| `bflow sheets preview <sheet>` | Displays a clean, redacted JSON preview of the first 10 rows. | `bflow sheets preview SPREADSHEET_ID --limit=5` |
| `bflow sheets read <sheet>` | Streams rows as JSON array with filtering and range options. | `bflow sheets read SPREADSHEET_ID --from-row=2 --to-row=50` |
| `bflow sheets write <sheet>` | Updates named columns on one specific absolute row. | `bflow sheets write SPREADSHEET_ID --row=2 --values='{"status":"done"}'` |
| `bflow sheets logout` | Revokes and deletes stored credentials for the account. | `bflow sheets logout --account=user@corp.com` |

---

## 🔗 URI Syntax & Tab Targeting

In workflow definitions or `--data` CLI flags, specify sheets using provider URIs:

```text
google-sheets://SPREADSHEET_ID/TabName?range=A:E&headerRow=1&gid=0
```

- **Spreadsheet Target**: Supply a raw Spreadsheet ID (`1BxiMVs0XRA5nFMdKvBdBZj...`) or a full Google Sheets URL.
- **`--sheet=<name>`**: Select a sheet tab by name (e.g. `--sheet=Leads`).
- **`--gid=<id>`**: Select a sheet tab by numeric GID (e.g. `--gid=0`).
- **`--range=<range>`**: Limit columns (e.g. `--range=A:F` or `A2:E50`).
- **`--header-row=<n>`**: 1-based index for the header row containing column labels (default: `1`).
- **`--from-row=<n>` / `--to-row=<n>`**: Absolute sheet row boundaries (inclusive of header).

---

## ⚡ Writing Workflow Outputs Back to Sheets

Configure automatic write-back in your workflow's `data.results` definition:

```json
{
  "data": {
    "source": "leads",
    "results": {
      "confirmation_code": "data.confirmationCode",
      "processed_at": "system.timestamp"
    }
  },
  "dataSources": {
    "leads": {
      "provider": "google-sheets",
      "uri": "google-sheets://SPREADSHEET_ID/Leads?range=A:H"
    }
  }
}
```

When the workflow runs (`bflow workflow run`), Bflow appends execution tracking columns (`__automation_status`, `__automation_completed_at`, `__automation_error`) and updates the mapped columns on each processed row without altering source inputs.

