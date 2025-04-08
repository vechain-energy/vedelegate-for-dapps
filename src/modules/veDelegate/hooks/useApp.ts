import { useQuery } from '@tanstack/react-query'
import { request, gql } from 'graphql-request'
import { GRAPH_URL } from "../config"

// We'll simplify the App type since we don't have direct access to the graphclient type
interface AppMetadata {
    bannerUrl: string;
    description: string;
    externalUrl: string;
    id: string;
    logoUrl: string;
    title: string;
}

interface App {
    id: string;
    metadata: AppMetadata;
    metadataURI: string;
    name: string;
    participantsCount: number;
    poolAllocations: string;
    poolAllocationsExact: string;
    poolBalance: string;
    poolBalanceExact: string;
    poolDeposits: string;
    poolDepositsExact: string;
    poolDistributionsExact: string;
    poolDistributions: string;
    poolWithdrawals: string;
    poolWithdrawalsExact: string;
    updatedAtBlockNumber: number;
    votingEligibility: boolean;
    endorsed: boolean;
    isBlacklisted: boolean;
    createdAt: string;
    createdAtBlockNumber: number;
}

interface AppQuery {
    app: App;
}

const AppQueryDocument = gql`
    query AppQuery($appId: String = "") {
        app (id: $appId) {
            id
            metadata {
                bannerUrl
                description
                externalUrl
                id
                logoUrl
                title
            }
            metadataURI
            name
            participantsCount
            poolAllocations
            poolAllocationsExact
            poolBalance
            poolBalanceExact
            poolDeposits
            poolDepositsExact
            poolDistributionsExact
            poolDistributions
            poolWithdrawals
            poolWithdrawalsExact
            updatedAtBlockNumber
            votingEligibility
            endorsed
            isBlacklisted
            createdAt
            createdAtBlockNumber
        }
    }
`

type OptionsParams = {
    appId: string;
    filters?: Record<string, unknown>;
}

export function useApp({ appId, filters, ...options }: OptionsParams) {
    return useQuery({
        queryKey: ['app', appId, JSON.stringify(options), JSON.stringify(filters)],
        queryFn: async () => {
            const { app } = await request<AppQuery>(
                GRAPH_URL,
                AppQueryDocument,
                {
                    appId,
                    ...{ ...options },
                    ...filters
                }
            )
            return app
        },
        placeholderData: (previousData) => previousData,
        retry: false
    })
} 