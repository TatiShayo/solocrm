# CONTEXT.md — Ubiquitous Domain Language (SoloCRM)

## Core Entities
- **SoloClient**: A client business or individual maintaining active projects, proposals, and invoices.
- **CsvPreviewDiff**: Visual diff generator computing added, modified, and unchanged contact rows before import.
- **ScopedMagicToken**: Single-purpose authorization token allowing clients to view and approve deliverables.
- **ProposalDocument**: Contractual statement of work with interactive sign-off and milestone billing.

## Domain Invariants
- Contact imports must never overwrite client phone or email without explicit user diff approval.
- Magic access tokens expire in 14 days and only grant read/approval rights to designated client records.

## Forbidden Terminology
- Do not call contacts "leads" after they have signed an agreement; use "Client".
- Do not call freelance proposals "estimates"; use "Proposal".
