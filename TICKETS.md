# TICKETS — SoloCRM Contact & Portal Pipeline

## [TICKET-001] Visual CSV Import Diff Engine
- **Blocked by**: None
- **Delivers**: Client spreadsheet diff analyzer comparing imported fields against existing database state.
- **Verification**: `src/lib/__tests__/csv-preview-diff.test.ts`

## [TICKET-002] Scoped Magic Token Client Portal
- **Blocked by**: TICKET-001
- **Delivers**: Passwordless proposal viewer with HMAC token expiration and signature checks.
- **Verification**: Token validation tests asserting authorization boundaries.

## [TICKET-003] Proposal-to-Invoice Milestone Transformer
- **Blocked by**: TICKET-002
- **Delivers**: One-click converter turning approved proposal milestones into payable invoices.
- **Verification**: State transition unit tests asserting data parity.
