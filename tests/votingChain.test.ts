import { expect, it, vi } from 'vitest';
import { loadVotingApps, submitVotes } from '../src/modules/veDelegate/votingChain';
const a = '0x' + 'a'.repeat(64), b = '0x' + 'b'.repeat(64);
it('loads eligible and saved unavailable app names entirely from contracts', async () => {
  const executeCall = vi.fn().mockResolvedValueOnce({ result: { plain: [a] } })
    .mockResolvedValueOnce({ result: { plain: [a, '0x' + '1'.repeat(40), 'Alpha', '', 0n, true] } })
    .mockResolvedValueOnce({ result: { plain: [b, '0x' + '1'.repeat(40), 'Beta', '', 0n, false] } });
  const apps = await loadVotingApps({ contracts: { executeCall } } as any, [b]);
  expect(apps).toEqual([{ id: a, name: 'Alpha', eligible: true }, { id: b, name: 'Beta', eligible: false }]);
});
it.each([true, false])('only confirms successful receipts (reverted=%s)', async reverted => {
  const refresh = vi.fn();
  const build = vi.fn().mockResolvedValue([{ to: 'wallet', value: '0', data: '0x1234' }]);
  const send = vi.fn().mockResolvedValue('txid');
  const thor = { contracts: { executeCall: vi.fn().mockResolvedValue({ result: { plain: [a] } }) }, transactions: { waitForTransaction: vi.fn().mockResolvedValue({ reverted }) } };
  const operation = submitVotes(thor as any, send, build, { appIds: [a], percentages: [100] }, refresh);
  if (reverted) { await expect(operation).rejects.toThrow(/reverted/i); expect(refresh).not.toHaveBeenCalled(); }
  else { await operation; expect(refresh).toHaveBeenCalledOnce(); expect(send).toHaveBeenCalledWith({ clauses: [{ to: 'wallet', value: '0', data: '0x1234' }], comment: 'Update voting preferences' }); }
});
it('rechecks eligibility before requesting a signature', async () => {
  const send = vi.fn(), build = vi.fn(), refresh = vi.fn();
  const thor = { contracts: { executeCall: vi.fn().mockResolvedValue({ result: { plain: [b] } }) } };
  await expect(submitVotes(thor as any, send, build, { appIds: [a], percentages: [100] }, refresh)).rejects.toThrow(/eligible/i);
  expect(send).not.toHaveBeenCalled();
});
it('preserves the saved preference when the wallet rejects', async () => {
  const refresh = vi.fn();
  const thor = { contracts: { executeCall: vi.fn().mockResolvedValue({ result: { plain: [a] } }) }, transactions: { waitForTransaction: vi.fn() } };
  await expect(submitVotes(thor as any, vi.fn().mockRejectedValue(new Error('Rejected')), vi.fn().mockResolvedValue([]), { appIds: [a], percentages: [100] }, refresh)).rejects.toThrow('Rejected');
  expect(refresh).not.toHaveBeenCalled();
  expect(thor.transactions.waitForTransaction).not.toHaveBeenCalled();
});
it('does not report success when a receipt times out', async () => {
  const refresh = vi.fn();
  const thor = { contracts: { executeCall: vi.fn().mockResolvedValue({ result: { plain: [a] } }) }, transactions: { waitForTransaction: vi.fn().mockResolvedValue(null) } };
  await expect(submitVotes(thor as any, vi.fn().mockResolvedValue('tx'), vi.fn().mockResolvedValue([]), { appIds: [a], percentages: [100] }, refresh)).rejects.toThrow(/pending/i);
  expect(refresh).not.toHaveBeenCalled();
});
it('does not open the signer after the wallet changes during eligibility reads', async () => {
  const thor = { contracts: { executeCall: vi.fn().mockResolvedValue({ result: { plain: [a] } }) } };
  const send = vi.fn();
  await expect(submitVotes(thor as any, send, vi.fn().mockResolvedValue([]), { appIds: [a], percentages: [100] }, vi.fn(), () => false)).rejects.toThrow(/wallet changed/i);
  expect(send).not.toHaveBeenCalled();
});
