---
title: Retry and Resume
description: Recover from transient failures and interrupted runs.
---

# 🔁 Retry and Resume

Large automation batches across hundreds of rows face network fluctuations, temporary rate limits, and occasional page timeouts. Bflow includes atomic checkpointing and automated transient retry capabilities to ensure jobs finish reliably.

```bash
# Standalone CLI
bflow workflow run workflows/signup.json \
  --data='google-sheets://SPREADSHEET_ID/Users' \
  --resume \
  --retry-failed \
  --retry-count=3

# Monorepo development
bun workflow run workflows/signup.json \
  --data='google-sheets://SPREADSHEET_ID/Users' \
  --resume
```

---

## ⚡ Key Recovery Flags

| Flag | Description |
| :--- | :--- |
| `--resume` | Reads `output/.automation-state-<workflow-id>.json` and skips rows already marked `completed`. Pending rows continue execution immediately. |
| `--retry-failed` | When used alongside `--resume`, re-attempts rows that previously resulted in a failure. |
| `--retry-count=<n>` | Specifies max automatic retries for transient errors during execution (default: `0`). For example, `--retry-count=3` permits up to 4 total attempts per row (1 initial + 3 retries). |

---

## 🛡️ Atomic Checkpoint State

Execution state is checkpointed atomically to disk (`output/.automation-state-<id>.json`) after every row transition.
- **Independent Tracking**: Browser action completion and provider write-back are tracked as distinct checkpoint stages. If the process is halted after browser actions finish but before write-back completes, `--resume` completes the write-back without repeating the browser steps.
- **Workflow Keying**: State files are keyed to the workflow definition and spreadsheet resource, preventing accidental cross-contamination.

---

## 🛑 Graceful Interruption Handling

When Bflow receives a termination signal (`Ctrl + C` / `SIGINT` or `SIGTERM`):
1. Immediately stops dispatching new rows.
2. Allows active browser workers to complete their current in-flight step.
3. Flushes all pending write-back updates to Google Sheets.
4. Saves the atomic checkpoint so you can resume later with `--resume`.

