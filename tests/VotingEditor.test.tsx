// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VotingEditor } from '../src/modules/veDelegate/components/VotingEditor';
afterEach(cleanup);
const a = '0x' + 'a'.repeat(64), b = '0x' + 'b'.repeat(64);
const apps = [{ id: a, name: 'Alpha', eligible: true }, { id: b, name: 'Beta', eligible: true }];
const preference = { appIds: [a], percentages: [100] };
const props = { apps, preference, appId: a, loading: false, error: null, onRetry: vi.fn(), onSave: vi.fn().mockResolvedValue(undefined) };
describe('VotingEditor', () => {
  it('loads saved values and protects edits from background refresh', () => {
    const view = render(<VotingEditor {...props} />);
    expect((screen.getByLabelText('Alpha (%)') as HTMLInputElement).value).toBe('100');
    fireEvent.change(screen.getByLabelText('Alpha (%)'), { target: { value: '40' } });
    view.rerender(<VotingEditor {...props} preference={{ appIds: [b], percentages: [100] }} />);
    expect((screen.getByLabelText('Alpha (%)') as HTMLInputElement).value).toBe('40');
    expect((screen.getByRole('button', { name: 'Save votes' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('shows empty preferences and applies the preset only as a draft', () => {
    const onSave = vi.fn();
    render(<VotingEditor {...props} preference={{ appIds: [], percentages: [] }} onSave={onSave} />);
    expect(screen.getByText('No voting preference saved.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '100% for Alpha' }));
    expect((screen.getByLabelText('Alpha (%)') as HTMLInputElement).value).toBe('100');
    expect(onSave).not.toHaveBeenCalled();
  });
  it('saves a valid changed allocation and preserves it after rejection', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Wallet rejected'));
    render(<VotingEditor {...props} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('Alpha (%)'), { target: { value: '25' } });
    fireEvent.change(screen.getByLabelText('Beta (%)'), { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save votes' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Wallet rejected'));
    expect(onSave).toHaveBeenCalledWith({ appIds: [a, b], percentages: [25, 75] });
    expect((screen.getByLabelText('Beta (%)') as HTMLInputElement).value).toBe('75');
  });
  it('requires unavailable allocations to be removed', () => {
    render(<VotingEditor {...props} apps={[{ ...apps[0], eligible: false }, apps[1]]} />);
    expect(screen.getByText('Not currently eligible')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Save votes' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Alpha (%)'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Beta (%)'), { target: { value: '100' } });
    expect((screen.getByRole('button', { name: 'Save votes' }) as HTMLButtonElement).disabled).toBe(false);
  });
  it('never offers a preset or editable values when reads fail', () => {
    render(<VotingEditor {...props} error="Unable to load votes" />);
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });
});
it('shows only actionable allocation feedback, with no total for valid allocations', () => {
  render(<VotingEditor {...props} />);
  expect(screen.queryByText(/Total:/)).toBeNull();
  fireEvent.change(screen.getByLabelText('Alpha (%)'), { target: { value: '75' } });
  expect(screen.getByText('Allocate 25% more to reach 100%.')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Beta (%)'), { target: { value: '50' } });
  expect(screen.getByText('Remove 25% to reach 100%.')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Beta (%)'), { target: { value: '25' } });
  expect(screen.queryByText(/to reach 100%/)).toBeNull();
});
