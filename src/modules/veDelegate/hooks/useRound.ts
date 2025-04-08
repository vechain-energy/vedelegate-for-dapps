import { useQuery } from '@tanstack/react-query'
import { request, gql } from 'graphql-request'
import { GRAPH_URL } from "../config"

type RoundResult = {
    round: {
        id: string
        number: string
        votes: number
        veDelegateVotes: number
        voters: number
        veDelegateVoters: number
        weight: number
        veDelegateWeight: number
        voteStart: string
        voteEnd: string
        statistic: {
            votesCast: string
            voters: string
            weightExact: string
            weightTotalExact: string
        }
        veDelegateStatistic: {
            votesCast: string
            voters: string
            weightExact: string
        }
        proposals: {
            proposalId: string;
            description: {
                title: string;
                shortDescription: string;
            };
            depositAmount: string;
            thresholdAmount: string;
        }[]
    }
}

type ProcessedRound = {
    id: string
    voteStart: number
    voteEnd: number
    votes: number
    veDelegateVotes: number
    voters: number
    veDelegateVoters: number
    weight: bigint
    weightTotal: bigint
    veDelegateWeight: bigint
    proposals: {
        proposalId: bigint;
        description: {
            title: string;
            shortDescription: string;
        };
        depositAmount: bigint;
        thresholdAmount: bigint;
    }[]
}

const RoundQueryDocument = gql`
    query Round($roundId: String!) {
        round(id: $roundId) {
            id
            number
            voteStart
            voteEnd
            statistic {
                votesCast
                voters
                weightExact
                weightTotalExact
            }
            veDelegateStatistic {
                voters
                votesCast
                weightExact
            }
            proposals (where: {canceled: false}) {
                proposalId
                description {
                    title
                    shortDescription
                }
                depositAmount
                thresholdAmount
            }
        }
    }
`

type OptionsParams = {
    roundId: string | number | BigInt
    filters?: Record<string, unknown>
}

export function useRound({ roundId, filters, ...options }: OptionsParams) {

    return useQuery<ProcessedRound>({
        queryKey: ['stats', 'round', String(roundId), JSON.stringify(options), JSON.stringify(filters)],
        queryFn: async () => {
            const result = await request<RoundResult>(
                GRAPH_URL,
                RoundQueryDocument,
                {
                    roundId: String(Number(roundId)),
                    ...options,
                    ...filters
                }
            )

            const round = result.round
            return {
                id: round.id,
                voteStart: Number(round.voteStart),
                voteEnd: Number(round.voteEnd),
                votes: Number(round.statistic.votesCast),
                veDelegateVotes: Number(round.veDelegateStatistic.votesCast),
                voters: Number(round.statistic.voters),
                veDelegateVoters: Number(round.veDelegateStatistic.voters),
                weight: BigInt(round.statistic.weightExact),
                weightTotal: BigInt(round.statistic.weightTotalExact),
                veDelegateWeight: BigInt(round.veDelegateStatistic.weightExact),
                proposals: (
                    round.proposals || []
                ).map((proposal) => ({
                    proposalId: BigInt(proposal.proposalId),
                    description: {
                        title: proposal.description.title,
                        shortDescription: proposal.description.shortDescription,
                    },
                    depositAmount: BigInt(proposal.depositAmount),
                    thresholdAmount: BigInt(proposal.thresholdAmount),
                })),
            }
        },
        placeholderData: (previousData) => previousData,
        enabled: Number(roundId) >= 0,
        staleTime: 30 * 1000, // 30 seconds
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        retry: false
    })
}