---
title: Data Troubleshooting
description: Diagnose OAuth, schema, quota, and row execution failures.
---

# Data Troubleshooting

### Authentication fails

Confirm `GOOGLE_CLIENT_ID`, the OAuth consent configuration, redirect URI support for localhost, and the requested Sheets/Drive scopes. Run `bun sheets status`; use `bun sheets login` again after revocation.

### A sheet or column is missing

Run `bun sheets inspect <spreadsheet> --sheet=<tab> --range=A:E`. Check capitalization, the header row, URL `gid`, and the workflow's referenced paths.

### Quota or rate-limit errors

Reduce `--parallel` or `--batch-size`. The provider honors quota responses with exponential backoff and records `RATE_LIMIT_ERROR` when retries are exhausted.

### Sensitive data appears in output

Name sensitive columns clearly or add them to `data.sensitiveColumns`. Row executions redact matching values from summaries and errors and mask matching page content during workflow screenshots. Never put access or refresh tokens in workflow files.

Environment references such as `{{env.ACCOUNT_PASSWORD}}` keep the secret outside the workflow file. Google OAuth credentials are stored in macOS Keychain when available or an AES-256-GCM encrypted local vault elsewhere.
