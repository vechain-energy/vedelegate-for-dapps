// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ABIItem, ABIFunction, Hex } from '@vechain/sdk-core';
const fixture = vi.hoisted(() => ({ account: '0x' + '1'.repeat(40), executeCall: vi.fn() }));
vi.mock('@vechain/dapp-kit-react', () => {
  const thor = { contracts: { executeCall: fixture.executeCall } };
  return { useWallet: () => ({ account: fixture.account }), useThor: () => thor };
});
vi.mock('../src/modules/veDelegate/hooks/useBeats', () => ({ useBeats: () => null }));
import { useVeDelegate } from '../src/modules/veDelegate/hooks/useVeDelegate';
import { Addresses } from '../src/modules/veDelegate/config';
const id = '0x' + 'a'.repeat(64), pool = '0x' + '2'.repeat(40);
afterEach(() => { cleanup(); vi.resetAllMocks(); fixture.account = '0x' + '1'.repeat(40); });
function reads(_address: string, abi: { signature: { name: string } }) {
  const values: Record<string, unknown> = { balanceOf: 0n, convertedB3trOf: 0n, tokenOfOwnerByIndex: 1n, getPoolAddress: pool, getVotes: [[id], [100n]], getChainId: 1n, getDelegator: fixture.account };
  return Promise.resolve({ result: { plain: values[abi.signature.name] } });
}
it('builds a real smart-account clause with normalized vote payload and validates before signing', async () => {
  fixture.executeCall.mockImplementation(reads);
  const view = renderHook(() => useVeDelegate(id));
  await waitFor(() => expect(view.result.current.address).toBe(pool));
  const clauses = await view.result.current.buildSupportClauses({ appIds: [id, '0x' + 'b'.repeat(64)], percentages: [100, 0] });
  expect(clauses).toHaveLength(1);
  expect(clauses[0].to.toLowerCase()).toBe(pool);
  const outer = ABIItem.ofSignature(ABIFunction, 'function execute(address to, uint256 value, bytes data, uint256 operation)').decodeData(Hex.of(clauses[0].data)).args!;
  expect(String(outer[0]).toLowerCase()).toBe(Addresses.VeDelegateVotes.toLowerCase());
  expect(outer[1]).toBe(0n);
  const inner = ABIItem.ofSignature(ABIFunction, 'function castVotes(bytes32[] appIds, uint8[] percentages)').decodeData(Hex.of(String(outer[2]))).args!;
  expect(inner).toEqual([[id], [100]]);
  await expect(view.result.current.buildSupportClauses({ appIds: [id], percentages: [99] })).rejects.toThrow(/100/);
});
it('clears the old pool immediately on wallet changes and ignores its late response', async () => {
  let finish!: (value: unknown) => void;
  fixture.executeCall.mockImplementation((address, abi) => abi.signature.name === 'getPoolAddress' ? new Promise(resolve => { finish = resolve; }) : reads(address, abi));
  const view = renderHook(() => useVeDelegate(id));
  await waitFor(() => expect(finish).toBeDefined());
  fixture.account = '0x' + '3'.repeat(40);
  fixture.executeCall.mockImplementation(reads);
  view.rerender();
  expect(view.result.current.address).toBe('');
  await waitFor(() => expect(view.result.current.address).toBe(pool));
  await act(async () => finish({ result: { plain: '0x' + '4'.repeat(40) } }));
  expect(view.result.current.address).toBe(pool);
});
