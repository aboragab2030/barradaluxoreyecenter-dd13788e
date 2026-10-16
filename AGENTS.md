# Project rules
- Compose new printable record tables through `printReports.ts` before the existing sanitized print handler; untrusted record text must be escaped.
- Confirm InstaPay bookings through server-side submission approval, while preserving other payment flows; the server is authoritative.
- Keep the InstaPay review list independent of the general payment ledger; pending submissions are not yet ledger receipts.