// Local browser fixture: all reads and signatures stay in memory.
import { ABIItem, ABIFunction, Hex } from '@vechain/sdk-core';
export const alpha = '0x' + 'a'.repeat(64);
export const beta = '0x' + 'b'.repeat(64);
export const retired = '0x' + 'c'.repeat(64);
const account = '0x' + '1'.repeat(40);
const pool = '0x' + '2'.repeat(40);
const params = new URLSearchParams(location.search);
let votes: [string[], bigint[]] = params.has('empty') ? [[], []] : [[alpha, retired], [80n, 20n]];
const rpcCalls: string[] = [];
let pending: [string[], bigint[]] | null = null;
const execute = ABIItem.ofSignature(ABIFunction, 'function execute(address to, uint256 value, bytes data, uint256 operation)');
const cast = ABIItem.ofSignature(ABIFunction, 'function castVotes(bytes32[] appIds, uint8[] percentages)');
const signer = {
    async sendTransaction({ clauses }: { clauses: { data: string }[] }) {
        if (params.has('reject')) throw new Error('Wallet rejected the request.');
        const outer = execute.decodeData(Hex.of(clauses[0].data)).args!;
        const inner = cast.decodeData(Hex.of(String(outer[2]))).args!;
        pending = [Array.from(inner[0] as string[]), Array.from(inner[1] as bigint[])];
        return '0x' + 'f'.repeat(64);
    },
};
const thor = {
    contracts: {
        async executeCall(_address: string, abi: { signature: { name: string } }, args: unknown[]) {
            const name = abi.signature.name;
            rpcCalls.push(name);
            const readout = document.getElementById('rpc-calls');
            if (readout) readout.textContent = [...new Set(rpcCalls)].join(', ');
            if (params.has('error') && name === 'getVotes') throw new Error('RPC unavailable');
            const values: Record<string, unknown> = {
                tokenOfOwnerByIndex: 1n, getPoolAddress: pool, getChainId: 100009n, getDelegator: account,
                balanceOf: 100n * 10n ** 18n, convertedB3trOf: 100n * 10n ** 18n,
                getVotes: votes, allEligibleApps: [alpha, beta],
                app: [args[0], account, args[0] === alpha ? 'Alpha' : args[0] === beta ? 'Beta' : 'Retired App', '', 0n, args[0] !== retired],
            };
            if (!(name in values)) throw new Error(`Unexpected chain read: ${name}`);
            return { result: { plain: values[name] } };
        },
    },
    transactions: { async waitForTransaction() { if (params.has('revert')) return { reverted: true }; if (pending) votes = pending; return { reverted: false }; } },
};
export const useThor = () => thor;
export const useWallet = () => ({ account, signer });
export const useBeats = () => null;
