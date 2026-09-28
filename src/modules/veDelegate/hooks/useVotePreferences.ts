import { useCallback, useEffect, useRef, useState } from 'react';
import { ABIItem, ABIFunction } from '@vechain/sdk-core';
import type { ThorClient } from '@vechain/sdk-network';
import { Addresses } from '../config';
import { readVotePreference } from '../voting';
import type { VotePreference } from '../types';

const empty: VotePreference = { appIds: [], percentages: [] };
export function useVotePreferences(thor: ThorClient, address: string, trigger: number) {
    const generation = useRef(0);
    const [state, setState] = useState({ thor, address: '', preference: empty, loading: true, error: null as string | null });
    const refreshVotes = useCallback(async () => {
        const request = ++generation.current;
        if (!address) return;
        setState(previous => ({ thor, address, preference: previous.address === address && previous.thor === thor ? previous.preference : empty, loading: true, error: null }));
        try {
            const response = await thor.contracts.executeCall(Addresses.VeDelegateVotes,
                ABIItem.ofSignature(ABIFunction, 'function getVotes(address voter) view returns ((bytes32[],uint8[]))'), [address]);
            const preference = readVotePreference(response.result.plain);
            if (generation.current === request) setState({ thor, address, preference, loading: false, error: null });
        } catch {
            if (generation.current === request) setState(previous => ({ ...previous, loading: false, error: 'Unable to load voting preferences. Please retry.' }));
            throw new Error('Unable to reload voting preferences. Please retry.');
        }
    }, [thor, address]);
    useEffect(() => {
        void refreshVotes().catch(() => {});
        return () => { generation.current++; };
    }, [refreshVotes, trigger]);
    const current = state.address === address && state.thor === thor && Boolean(address);
    return {
        votePreference: current ? state.preference : empty,
        votesLoading: !current || state.loading,
        votesError: current ? state.error : null,
        refreshVotes,
    };
}
