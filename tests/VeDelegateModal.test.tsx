// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const fixture = vi.hoisted(() => ({
  send: vi.fn().mockResolvedValue('tx'),
  state: {
    account: '0x' + '1'.repeat(40), address: '0x' + '2'.repeat(40), chainId: 'main', hasPool: false,
    accountBalance: { b3trAsNumber: 100 }, balance: { convertedB3trAsNumber: 0 },
    appId: '0x' + 'a'.repeat(64), refetch: vi.fn(),
    buildDepositClauses: vi.fn().mockResolvedValue([{ to: 'deposit', value: '0', data: '0x' }]),
    buildWithdrawClauses: vi.fn(),
    buildSupportClauses: vi.fn().mockResolvedValue([{ to: 'votes', value: '0', data: '0x' }]),
  },
}));
vi.mock('../src/modules/veDelegate/components/VeDelegateProvider', () => ({ useVeDelegateContext: () => ({ veDelegateState: fixture.state }) }));
vi.mock('@vechain/dapp-kit-react', () => ({ useWallet: () => ({ signer: { sendTransaction: fixture.send } }) }));
import { VeDelegateModal } from '../src/modules/veDelegate/components/VeDelegateModal';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('keeps 100% platform voting bundled with the first deposit and hides Voting before staking', async () => {
  render(<VeDelegateModal isOpen onClose={() => {}} />);
  expect(screen.queryByRole('button', { name: 'Voting' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Stake', exact: true }));
  await waitFor(() => expect(fixture.send).toHaveBeenCalled());
  expect(fixture.state.buildSupportClauses).toHaveBeenCalledWith({ appIds: [fixture.state.appId], percentages: [100], signingCallback: undefined });
  expect(fixture.send.mock.calls[0][0].clauses).toEqual([{ to: 'deposit', value: '0', data: '0x' }, { to: 'votes', value: '0', data: '0x' }]);
});
