import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InstapayReviewPanel } from '@/barada/InstapayFeature';

const mock = vi.hoisted(() => ({ admin: true, roleError: false, deleted: false, deleteError: false, rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'test-user' } } }) },
    rpc: mock.rpc,
    from: mock.from,
  },
}));

const row = { id: 'submission-1', booking_id: 'booking-1', booking_ref: 'BR-TEST', transaction_ref: 'TEST-REF', status: 'REJECTED', amount_due: 250, declared_amount: 250, verified_amount: null, created_at: '2026-10-18T05:00:00Z' };
const mount = () => render(<InstapayReviewPanel cardClass="" inputClass="" onPrint={vi.fn()} onReviewed={vi.fn()} />);

beforeEach(() => {
  mock.admin = true;
  mock.roleError = false;
  mock.deleted = false;
  mock.deleteError = false;
  mock.rpc.mockReset();
  mock.from.mockReset();
  mock.rpc.mockImplementation(async (name: string) => {
    if (name === 'has_role') return { data: mock.admin, error: mock.roleError ? { message: 'failed' } : null };
    if (name === 'delete_instapay_submission') {
      if (mock.deleteError) return { error: { code: '42501' } };
      mock.deleted = true;
      return { error: null };
    }
    return { data: true, error: null };
  });
  mock.from.mockImplementation((table: string) => ({
    select: () => ({
      is: (column: string, value: unknown) => {
        expect(column).toBe('deleted_at');
        expect(value).toBeNull();
        return { order: async () => ({ data: mock.deleted ? [] : [row], error: null }) };
      },
      in: async () => ({ data: table === 'bookings' ? [{ id: 'booking-1', patient_name: 'Test', doctor_name: 'Doctor' }] : [] }),
    }),
  }));
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('InstaPay admin-only deletion', () => {
  it('hides deletion from a reviewer without the admin role', async () => {
    mock.admin = false;
    mount();
    await screen.findByText('BR-TEST');
    expect(screen.queryByRole('button', { name: 'حذف التحويل BR-TEST' })).not.toBeInTheDocument();
    expect(mock.rpc).toHaveBeenCalledWith('has_role', { _user_id: 'test-user', _role: 'admin' });
  });
  it('fails closed when the role check fails', async () => {
    mock.roleError = true;
    mount();
    await screen.findByText('BR-TEST');
    expect(screen.queryByRole('button', { name: 'حذف التحويل BR-TEST' })).not.toBeInTheDocument();
  });
  it('does not delete when confirmation is cancelled', async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'حذف التحويل BR-TEST' }));
    expect(mock.rpc).not.toHaveBeenCalledWith('delete_instapay_submission', expect.anything());
    expect(screen.getByText('BR-TEST')).toBeInTheDocument();
  });
  it('uses only the soft-delete RPC and removes the entry after confirmation', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'حذف التحويل BR-TEST' }));
    await waitFor(() => expect(screen.queryByText('BR-TEST')).not.toBeInTheDocument());
    expect(mock.rpc).toHaveBeenCalledWith('delete_instapay_submission', { _submission_id: 'submission-1' });
    expect(mock.from.mock.calls.every(([table]) => ['instapay_submissions', 'bookings'].includes(table))).toBe(true);
  });
  it('keeps the entry when the server denies deletion', async () => {
    mock.deleteError = true;
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'حذف التحويل BR-TEST' }));
    await screen.findByText('الحذف متاح لمدير النظام فقط.');
    expect(screen.getByText('BR-TEST')).toBeInTheDocument();
  });
});