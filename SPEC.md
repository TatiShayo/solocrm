# SPEC 001: Freelancer CRM, Visual CSV Diff & Client Portal

## Problem Statement
Freelancers waste hours managing client spreadsheets and lose proposals when clients are forced through cumbersome login barriers.

## Solution
A lightweight CRM with visual CSV diff previews, passwordless proposal review, and automated milestone invoicing.

## User Stories
1. As a freelancer, I want to preview spreadsheet changes before importing, so that I never wipe out my client notes.
2. As a client, I want to review and approve proposals via a direct secure link, without creating a password.
3. As a freelancer, I want to convert accepted proposals to invoices in one click, so that I get paid faster.

## Implementation Decisions
- CSV diff calculation in `src/lib/csv-preview.ts`.
- Scoped token verification in `src/lib/tokens.ts`.
- Proposal status progression in `src/lib/proposals.ts`.

## Testing Decisions
- Seam: `src/lib/__tests__/csv-preview-diff.test.ts`.
- Verify detection of new, updated, and identical rows across messy CSV uploads.
