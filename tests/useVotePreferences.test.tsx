// @vitest-environment jsdom
import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useVotePreferences } from '../src/modules/veDelegate/hooks/useVotePreferences';
afterEach(cleanup);
const id = '0x' + 'a'.repeat(64);
it('ignores a late response from the previous wallet', async () => {
  let finish!: (value: unknown) => void;
  const executeCall = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValue({ result: { plain: [[], []] } });
  const thor = { contracts: { executeCall } } as any;
  const view = renderHook(({ address }) => useVotePreferences(thor, address, 0), { initialProps: { address: 'old' } });
  view.rerender({ address: 'new' });
  await waitFor(() => expect(view.result.current.votesLoading).toBe(false));
  await act(async () => finish({ result: { plain: [[id], [100n]] } }));
  expect(view.result.current.votePreference).toEqual({ appIds: [], percentages: [] });
});
it('reports failed reads separately from empty preferences', async () => {
  const thor = { contracts: { executeCall: vi.fn().mockRejectedValue(new Error('offline')) } } as any;
  const view = renderHook(() => useVotePreferences(thor, 'wallet', 0));
  await waitFor(() => expect(view.result.current.votesError).toMatch(/retry/i));
  expect(view.result.current.votesLoading).toBe(false);
});
