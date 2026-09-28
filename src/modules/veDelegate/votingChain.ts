import { ABIItem, ABIFunction } from '@vechain/sdk-core';
import type { ThorClient } from '@vechain/sdk-network';
import { Addresses } from './config';
import type { VotePreference, VeDelegateState } from './types';
import { validateVotes, type VotingApp } from './voting';

export async function loadEligibleAppIds(thor: ThorClient): Promise<string[]> {
    const response = await thor.contracts.executeCall(Addresses.X2EarnApps,
        ABIItem.ofSignature(ABIFunction, 'function allEligibleApps() view returns (bytes32[])'), []);
    const ids = response.result.plain;
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !/^0x[0-9a-f]{64}$/i.test(id))) {
        throw new Error('Unable to load eligible apps. Please retry.');
    }
    return ids.map(id => String(id).toLowerCase());
}

export async function loadVotingApps(thor: ThorClient, savedIds: string[]): Promise<VotingApp[]> {
    const eligible = new Set(await loadEligibleAppIds(thor));
    const ids = [...new Set([...eligible, ...savedIds.map(id => id.toLowerCase())])];
    const apps: VotingApp[] = [];
    // Bound parallel RPC calls so the full list works with public nodes too.
    for (let offset = 0; offset < ids.length; offset += 8) {
        const batch = await Promise.all(ids.slice(offset, offset + 8).map(async id => {
            try {
                const response = await thor.contracts.executeCall(Addresses.X2EarnApps,
                    ABIItem.ofSignature(ABIFunction, 'function app(bytes32 appId) view returns ((bytes32,address,string,string,uint256,bool))'), [id]);
                const details = response.result.plain;
                if (!Array.isArray(details) || typeof details[2] !== 'string') throw new Error('Invalid app details');
                return { id, name: details[2] || id, eligible: eligible.has(id) };
            } catch {
                // A missing name must never hide an existing allocation.
                return { id, name: id, eligible: eligible.has(id) };
            }
        }));
        apps.push(...batch);
    }
    return apps;
}

type SendVotes = (transaction: { clauses: Awaited<ReturnType<VeDelegateState['buildSupportClauses']>>; comment: string }) => Promise<string>;
export async function submitVotes(
    thor: ThorClient,
    send: SendVotes,
    build: VeDelegateState['buildSupportClauses'],
    preference: VotePreference,
    refresh: () => Promise<unknown>,
    isCurrent: () => boolean = () => true,
): Promise<void> {
    const eligible = new Set(await loadEligibleAppIds(thor));
    const valid = validateVotes(preference, eligible);
    const clauses = await build(valid);
    if (!isCurrent()) throw new Error('Wallet changed. Please reopen Voting.');
    const id = await send({ clauses, comment: 'Update voting preferences' });
    if (!id) throw new Error('Transaction cancelled. Your draft is unchanged.');
    const receipt = await thor.transactions.waitForTransaction(id, { intervalMs: 3000, timeoutMs: 120000 });
    if (!receipt) throw new Error('Confirmation is still pending. Reload votes before trying again.');
    if (receipt.reverted) throw new Error('Transaction reverted. Your draft is unchanged.');
    if (!isCurrent()) return;
    await refresh();
}
