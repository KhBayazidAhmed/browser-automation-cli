---
title: Row Execution
description: Batches, parallel browser workers, filtering, and dry runs.
---

# Row Execution

Each selected row receives a stable ID and an isolated browser execution. One row failure does not terminate unrelated workers.

```bash
bun workflow run workflows/signup.json \
  --data=google-sheets://SPREADSHEET_ID/Users \
  --parallel=4 --batch-size=50 \
  --from-row=2 --to-row=500 \
  --where='enabled=true'
```

`--where` supports `=`, `==`, `!=`, `>`, `<`, `>=`, `<=`, and `~` (case-insensitive contains). Parallelism is bounded, provider reads are incremental, and write-back is serialized in batches.

Temporary browser workers are isolated automatically. A named or explicit browser profile cannot be shared safely by concurrent Chrome processes, so use `--parallel=1` with `--profile` or `--user-data-dir`.

Use `--dry-run` to authenticate, inspect, validate, filter, and preview without launching a browser or changing provider data. It still writes a redacted local run summary beneath `output/`.

The runner limits `--parallel` to 1–100 workers. `--batch-size` controls provider reads and queued write-back batches; it does not change browser isolation.

Each completed command writes `output/workflow-<run-id>-summary.json`. Resumable row state is keyed by the workflow definition and stored separately as `output/.automation-state-<workflow-id>.json`.
