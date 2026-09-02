## General Rules

* Understand the project and existing code before making changes.
* Make the smallest change that correctly solves the problem.
* Reuse existing code, patterns, dependencies, and project conventions.
* Search before creating new functions, components, utilities, or files.
* Do not guess APIs, commands, configuration, or project behavior.

## Development Server

* Check whether a development server is already running before starting one.
* Reuse the existing server whenever possible.
* Do not start duplicate servers or unnecessarily restart/kill running processes.

## Validation

* Think about what could be affected before running checks.
* Run meaningful, targeted tests/checks first.
* Run lint, type checks, tests, or builds only when relevant to the change.
* Do not blindly run every check after every change.
* Do not repeatedly retry failed commands without investigating the cause.

## Code Quality

* Keep files around 250 lines or fewer when practical.
* Do not split files artificially just to meet the limit.
* Avoid unnecessary refactoring, abstractions, dependencies, or architecture changes.
* Do not modify unrelated code or formatting.
* Do not change tests just to make them pass; fix the actual problem.

## Safety

* Never expose or commit secrets, credentials, or tokens.
* Do not overwrite or revert unrelated user changes.
* Avoid destructive Git commands unless clearly necessary.
* Do not weaken security or validation just to make something work.

## Before Finishing

* Review the final diff.
* Remove debug code and temporary files.
* Confirm the requested behavior works.
* Report relevant checks performed and any known unrelated failures.

**Core principle: Understand first. Change minimally. Validate meaningfully. Review the diff.**
