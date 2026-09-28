import { useEffect, useRef } from 'react';
import { useThor, useWallet } from '@vechain/dapp-kit-react';
import { useQuery } from '@tanstack/react-query';
import { useVeDelegateContext } from './VeDelegateProvider';
import { VotingEditor } from './VotingEditor';
import { loadVotingApps, submitVotes } from '../votingChain';

export function VotingPanel({ mode, primaryColor }: { mode: 'dark' | 'light'; primaryColor: string }) {
    const { veDelegateState: state } = useVeDelegateContext();
    const { signer } = useWallet();
    const thor = useThor();
    const current = useRef(true);
    useEffect(() => { current.current = true; return () => { current.current = false; }; }, []);
    const ids = [...new Set(state.votePreference.appIds)].sort();
    const apps = useQuery({
        queryKey: ['voting-apps', state.chainId, state.address, ids],
        queryFn: () => loadVotingApps(thor, ids),
        retry: false,
    });
    return <VotingEditor apps={apps.data ?? []} preference={state.votePreference} appId={state.appId}
        loading={state.votesLoading || apps.isFetching} error={state.votesError || (apps.isError ? 'Unable to load voting apps. Please retry.' : null)}
        mode={mode} primaryColor={primaryColor}
        onRetry={() => { void state.refreshVotes().catch(() => {}); void apps.refetch(); }}
        onSave={async preference => {
            if (!signer) throw new Error('You need to connect your wallet.');
            try {
                await submitVotes(thor, transaction => signer.sendTransaction(transaction), state.buildSupportClauses,
                    preference, state.refreshVotes, () => current.current);
            } finally {
                if (current.current) void apps.refetch();
            }
        }} />;
}
