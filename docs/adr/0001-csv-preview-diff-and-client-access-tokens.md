# ADR 0001: Visual CSV Import Diffing and Scoped Passwordless Client Access

## Context
Solo freelancers cannot afford lost contact history during imports or lost client deals due to clunky portal logins.

## Decision
1. **Interactive CSV Diffing**: Parse and compare incoming CSV rows against existing database records in-browser.
2. **Passwordless Client Access**: Deliver proposals and invoices via signed token URLs.
3. **Anti-Spam Honeypots**: Neutralize bot submissions silently on public contact forms.

## Consequences
- **Positive**: Zero accidental data overwrites and fast client proposal turnaround.
- **Negative**: Requires temporary in-memory diff caching on large imports.
