---
title: Result Write-back
description: Map workflow outputs and execution state into spreadsheet columns.
---

# ✍️ Result Write-back

Bflow seamlessly writes extracted workflow data, execution statuses, and error diagnostics back into your spreadsheet. Updates are **sparse and non-destructive**, meaning existing source cell values are never overwritten.

---

## 🗺️ Custom Result Mapping (`data.results`)

Map variables extracted during workflow execution (from `extract`, `extractMultiple`, or `eval` steps) directly to destination column names:

```json
{
  "data": {
    "source": "users",
    "results": {
      "user_id": "data.createdUserId",
      "confirmation_code": "data.confirmationCode",
      "pricing_tier": "data.extractedPlan"
    }
  }
}
```

Values are resolved as dot-notation paths against the row's `FlowExecutionResult`. Extracted step values reside under the `data.<variableName>` namespace.

---

## 🏛️ Reserved Automation Columns

In addition to your custom mapped results, Bflow automatically maintains reserved execution columns in the spreadsheet:

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `__automation_status` | String | Status: `completed`, `failed`, or `skipped`. |
| `__automation_run_id` | UUID | Unique run ID identifying the execution batch. |
| `__automation_started_at` | Timestamp | ISO 8601 timestamp when row processing began. |
| `__automation_completed_at` | Timestamp | ISO 8601 timestamp when row processing ended. |
| `__automation_duration_ms` | Number | Execution time for the row in milliseconds. |
| `__automation_attempts` | Number | Total attempt count (initial run + retries). |
| `__automation_result` | JSON String | Complete stringified JSON object of all extracted variables for successful rows. |
| `__automation_error_type` | String | Error classification (e.g. `ASSERTION_ERROR`, `TIMEOUT_ERROR`, `RATE_LIMIT_ERROR`). |
| `__automation_error` | String | Redacted error message explaining failure reason. |

---

## ⚡ Sparse Update Guarantees

1. **Automatic Header Expansion**: If mapped or reserved columns do not exist in the spreadsheet header row, Bflow appends them automatically.
2. **Non-Destructive**: Only mapped result columns and reserved automation columns are updated; input columns remain pristine.
3. **Batched Submissions**: Updates are grouped according to `--batch-size` and written using exponential backoff to respect Google Sheets API rate limits.

