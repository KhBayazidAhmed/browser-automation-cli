---
title: Google Sheets
description: Authenticate, inspect, read, and use Google Sheets as workflow data.
---

# Google Sheets

Set the OAuth client ID supplied by your Google Cloud project. Installed-app clients can omit the secret.

```bash
export GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="..." # when required by the client
bun sheets login
bun sheets status
```

The login uses an authorization-code callback on localhost, validates OAuth state, supports refresh tokens, and requests Sheets plus Drive metadata access. On macOS credentials are stored in Keychain. Other environments use an AES-GCM encrypted local vault; set `BROWSER_AUTOMATION_CREDENTIAL_KEY` to provide its key explicitly.

```bash
bun sheets accounts
bun sheets list
bun sheets inspect SPREADSHEET_ID --sheet=Users --range=A:E
bun sheets preview SPREADSHEET_ID --sheet=Users --limit=10
bun sheets read SPREADSHEET_ID --from-row=2 --to-row=100
bun sheets write SPREADSHEET_ID --sheet=Users --row=2 --values='{"status":"ready"}'
bun sheets logout --account=user@example.com
```

Spreadsheet URLs and IDs are accepted. Select a tab/range with `--sheet`, `--gid`, `--range`, and `--header-row`; provider URIs use equivalent `gid`, `range`, and `headerRow` query parameters.

`preview` defaults to 10 rows, while `read` defaults to at most 1,000 CLI-output rows unless `--limit` is supplied. `--from-row` and `--to-row` are absolute spreadsheet row numbers, including the header row in their numbering.

Use `--account=user@example.com` on Sheets and workflow commands when more than one account is stored.

`sheets logout` revokes one account at a time. Pass `--account` to select it; without the flag, only the current default account is logged out.
