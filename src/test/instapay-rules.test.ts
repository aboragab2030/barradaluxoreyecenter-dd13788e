import { describe, it, expect } from 'vitest';
import { computeAmountDue, reviewOutcome, duplicateTransactionRefs, isDuplicateRef, initialBookingStatus, instapayDoctorOptions, filterInstapaySubmissions, canDeleteInstapayReview, visibleInstapayReviews } from '@/barada/instapayRules';

describe('administrator-only InstaPay review deletion', () => {
  it('allows deletion only for a server-confirmed administrator, not staff or unknown users', () => {
    expect(canDeleteInstapayReview(true)).toBe(true);
    expect(canDeleteInstapayReview(false)).toBe(false);
    expect(canDeleteInstapayReview(null)).toBe(false);
  });
  it('removes deleted review entries from the list without hiding retained confirmed entries', () => {
    const rows = [
      { id: 'deleted', status: 'PAID', deleted_at: '2026-10-17T07:16:00Z' },
      { id: 'confirmed', status: 'PAID', deleted_at: null },
      { id: 'pending', status: 'PENDING_REVIEW', deleted_at: null },
    ];
    expect(visibleInstapayReviews(rows).map(row => row.id)).toEqual(['confirmed', 'pending']);
    expect(rows).toHaveLength(3);
  });
});

describe('InstaPay booking confirmation', () => {
  it('leaves a new InstaPay booking pending until review', () => {
    expect(initialBookingStatus('instapay')).toBe('pending');
  });
  it('preserves immediate cash confirmation', () => {
    expect(initialBookingStatus('cash')).toBe('confirmed');
  });
});

describe('InstaPay amount due', () => {
  it('adds service price and doctor fee', () => {
    expect(computeAmountDue('كشف', 100, 150)).toBe(250);
  });
  it('skips doctor fee for follow-up visits', () => {
    expect(computeAmountDue('متابعة كشف', 50, 150)).toBe(50);
  });
});

describe('InstaPay review rules', () => {
  it('marks PAID only when the verified amount equals the full amount due', () => {
    expect(reviewOutcome('PENDING_REVIEW', 'approve', 250, 250, '')).toEqual({ status: 'PAID' });
    expect(reviewOutcome('PENDING_REVIEW', 'approve', 250, 200, '')).toEqual({ status: 'MISMATCH' });
    expect(reviewOutcome('PENDING_REVIEW', 'approve', 250, 300, '')).toEqual({ status: 'MISMATCH' });
  });
  it('requires a reason to reject', () => {
    expect(reviewOutcome('PENDING_REVIEW', 'reject', 250, null, '  ')).toHaveProperty('error');
    expect(reviewOutcome('PENDING_REVIEW', 'reject', 250, null, 'لم يصل المبلغ')).toEqual({ status: 'REJECTED' });
  });
  it('refuses a second decision after approval', () => {
    expect(reviewOutcome('PAID', 'approve', 250, 250, '')).toHaveProperty('error');
  });
});

describe('duplicate transfer detection', () => {
  it('flags a transfer number used on two bookings, ignoring case and spaces', () => {
    const d = duplicateTransactionRefs([{ transaction_ref: 'ABC123' }, { transaction_ref: ' abc123 ' }, { transaction_ref: 'X9' }]);
    expect(isDuplicateRef(d, 'Abc123')).toBe(true);
    expect(isDuplicateRef(d, 'X9')).toBe(false);
  });
});

const SUBS = [
  { booking_ref: 'BR-AAA', transaction_ref: 'T1', status: 'PENDING_REVIEW', created_at: '2026-10-10T09:00:00Z' },
  { booking_ref: 'BR-BBB', transaction_ref: 'T2', status: 'PAID', created_at: '2026-10-12T09:00:00Z' },
  { booking_ref: 'BR-CCC', transaction_ref: 'T3', status: 'PENDING_REVIEW', created_at: '2026-10-15T09:00:00Z' },
];
const doctorOf = (r: typeof SUBS[number]) => ({ 'BR-AAA': 'د. محمد سمير', 'BR-BBB': 'د. محمد سمير', 'BR-CCC': 'د. هالة فؤاد' } as Record<string, string>)[r.booking_ref];

describe('InstaPay review doctor filter', () => {
  it('lists each doctor once, skipping submissions without a doctor', () => {
    const opts = instapayDoctorOptions([...SUBS, { booking_ref: 'BR-DDD', transaction_ref: 'T4', status: 'PAID', created_at: '2026-10-16T09:00:00Z' }], doctorOf);
    expect(opts).toHaveLength(2);
    expect(opts).toContain('د. هالة فؤاد');
  });
  it('keeps only the submissions of the chosen doctor', () => {
    const out = filterInstapaySubmissions(SUBS, { search: '', status: '', from: '', to: '', doctor: 'د. محمد سمير' }, doctorOf);
    expect(out.map(r => r.booking_ref)).toEqual(['BR-AAA', 'BR-BBB']);
  });
  it('combines the doctor filter with status and date range', () => {
    const out = filterInstapaySubmissions(SUBS, { search: '', status: 'PENDING_REVIEW', from: '2026-10-11', to: '', doctor: 'د. محمد سمير' }, doctorOf);
    expect(out).toHaveLength(0);
    expect(filterInstapaySubmissions(SUBS, { search: '', status: '', from: '2026-10-11', to: '', doctor: 'د. محمد سمير' }, doctorOf).map(r => r.booking_ref)).toEqual(['BR-BBB']);
  });
  it('shows everything when no doctor is selected', () => {
    expect(filterInstapaySubmissions(SUBS, { search: '', status: '', from: '', to: '', doctor: '' }, doctorOf)).toHaveLength(3);
  });
});
