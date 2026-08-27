---
title: Data Troubleshooting
description: Diagnose OAuth, schema, quota, and row execution failures.
---

# 🩺 Data Troubleshooting & Diagnostics

Quick solutions for common authentication, schema validation, rate limit, and data execution issues.

---

## 🔍 Common Issues & Resolutions

### 1. Google OAuth Authentication Fails
- **Symptoms**: `Invalid OAuth state`, `redirect_uri_mismatch`, or `Token expired`.
- **Resolution**:
  1. Ensure `GOOGLE_CLIENT_ID` (and `GOOGLE_CLIENT_SECRET` if configured) matches your Google Cloud Console OAuth 2.0 Client ID.
  2. Verify that `http://localhost:<port>` is authorized as a redirect URI in your Google Cloud OAuth consent settings.
  3. Verify token status:
     ```bash
     bflow sheets status
     ```
  4. If expired or revoked, re-authenticate:
     ```bash
     bflow sheets login
     ```

---

### 2. Column or Tab Not Found
- **Symptoms**: `Column "first_name" not found in sheet schema` or `Sheet tab was not found`.
- **Resolution**:
  1. Inspect the spreadsheet schema to verify exact column names and sheet tab titles:
     ```bash
     bflow sheets inspect SPREADSHEET_ID --sheet=Users
     ```
  2. If the header row is not the first row, specify `--header-row=N` (or `headerRow=N` in provider URI).
  3. Ensure the `--range` parameter covers all required columns (e.g. `--range=A:Z`).

---

### 3. Google API Rate Limits & Quotas (`RATE_LIMIT_ERROR`)
- **Symptoms**: `429 Too Many Requests` or `Quota exceeded for quota metric 'Read requests'`.
- **Resolution**:
  1. Reduce concurrency: `--parallel=2` or `--parallel=1`.
  2. Reduce batch frequency by increasing `--batch-size=50` to group write-backs.
  3. Enable automated retries for transient rate limit recovery:
     ```bash
     bflow workflow run workflows/flow.json --retry-count=3
     ```

---

### 4. Preventing Sensitive Data Leakage
- **Symptoms**: Sensitive personal info or secrets appear in summaries or logs.
- **Resolution**:
  1. Add sensitive column headers to `data.sensitiveColumns` in your workflow JSON:
     ```json
     {
       "data": {
         "source": "users",
         "sensitiveColumns": ["password", "ssn", "secret_key"]
       }
     }
     ```
  2. Reference authentication secrets as environment variables: `{{env.ACCOUNT_PASSWORD}}`.
  3. During workflow execution, Bflow automatically redacts these values from summaries, errors, logs, screenshots, and PDFs.

