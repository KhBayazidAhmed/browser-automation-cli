---
title: Retry and Resume
description: Recover from transient failures and interrupted runs.
---

# Retry and Resume

```bash
bun workflow run workflows/signup.json --data=google-sheets://ID/Users \
  --resume --retry-failed --retry-count=3
```

`--resume` skips completed rows and continues pending work. Failed rows remain skipped unless `--retry-failed` is supplied. `--retry-count` controls transient retries for rate limits, timeouts, and browser failures.

Execution state is checkpointed atomically after transitions. Google writes use bounded batches and exponential backoff. `SIGINT` or `SIGTERM` stops scheduling new rows, allows active work to settle, flushes queued results, and leaves the run resumable.

Browser completion and provider write-back are checkpointed separately. If a process stops after a browser workflow finishes, `--resume` retries the pending write-back without repeating the browser actions.

Retries apply only to failures classified as transient. `--retry-count=3` means up to four total attempts for a row: the initial attempt plus three retries.
