---
title: Row Execution
description: Batches, parallel browser workers, filtering, and dry runs.
---

# 🚀 Row Execution

In data-driven workflows, Bflow assigns each selected row a stable identity and executes an isolated browser automation run. If an unexpected error occurs on one row, it is isolated and recorded without disrupting other concurrent workers.

```bash
# Standalone CLI
bflow workflow run workflows/signup.json \
  --data='google-sheets://SPREADSHEET_ID/Users?range=A:F' \
  --parallel=4 \
  --batch-size=25 \
  --from-row=2 \
  --to-row=250 \
  --where='status!=done'

# Monorepo development
bun workflow run workflows/signup.json \
  --data='google-sheets://SPREADSHEET_ID/Users?range=A:F' \
  --parallel=4
```

---

## 🚩 Complete Row Execution Flags

| Flag | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--data=<uri>` | String | *(None)* | Directly attaches a provider URI (e.g. `google-sheets://ID/Sheet1`). Overrides `data.source`. |
| `--data-source=<name>` | String | `data.source` | Selects a named configuration entry from the workflow's `dataSources` block. |
| `--parallel=<n>` | Number | `1` | Number of concurrent browser worker instances (1–100). |
| `--batch-size=<n>` | Number | `25` | Number of rows to stream per batch read and write-back update. |
| `--from-row=<n>` | Number | `2` | Absolute 1-based start row index (inclusive of header). |
| `--to-row=<n>` | Number | *(End of sheet)* | Absolute 1-based end row index. |
| `--where='<expr>'` | String | *(None)* | Pre-execution filter expression (e.g. `enabled=true`, `score>=80`). |
| `--dry-run` | Flag | `false` | Discovers schema, evaluates filters, and generates plan without launching Chrome or mutating rows. |
| `--resume` | Flag | `false` | Skips previously completed rows and resumes pending work. |
| `--retry-failed` | Flag | `false` | When used with `--resume`, re-attempts previously failed rows. |
| `--retry-count=<n>` | Number | `0` | Number of automatic retries for transient errors (rate limits, timeouts). |
| `--headed` | Flag | `false` | Runs worker browsers visibly on your desktop. |
| `--account=<email>` | String | *(Default)* | Selects an authenticated Google account. |

---

## 🔍 Row Filtering with `--where`

Filter rows before launching browser instances using comparison operators:

```bash
bflow workflow run workflows/process.json --where='country=US'
bflow workflow run workflows/process.json --where='priority>=5'
bflow workflow run workflows/process.json --where='email~@example.com'
```

### Supported Filter Operators

| Operator | Meaning | Example |
| :--- | :--- | :--- |
| `=`, `==` | Exact equality match | `status=pending` |
| `!=` | Inequality match | `status!=processed` |
| `>` | Greater than (numeric) | `score>75` |
| `>=` | Greater than or equal | `retries>=2` |
| `<` | Less than (numeric) | `age<30` |
| `<=` | Less than or equal | `cost<=100.50` |
| `~` | Case-insensitive substring contains | `title~engineer` |

---

## 👥 Concurrency & Browser Profile Rules

- **Isolated Automation Workers**: Each worker runs in a separate, isolated Chrome process with dedicated DevTools port allocation.
- **Profile Safety**: Chrome does not allow concurrent access to the same profile directory. When using `--profile` or `--user-data-dir`, always run with `--parallel=1`.
- **Resource Management**: High concurrency levels (`--parallel=10+`) scale with available RAM and CPU cores.

---

## 📊 Summary Reports and Checkpoints

Each data run produces two persistent files in `output/`:
1. `output/workflow-<run-id>-summary.json`: Comprehensive report containing total rows, counts of completed, failed, and skipped rows, duration, and error breakdowns.
2. `output/.automation-state-<workflow-id>.json`: Atomically maintained checkpoint tracking each row's completion status for seamless `--resume` recovery.

