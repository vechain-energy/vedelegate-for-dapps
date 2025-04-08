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

export interface App {
    id: string;
    metadata: AppMetadata;
    name: string;
}

export interface AppMap {
    [appId: string]: App;
}

interface AppsQuery {
    apps: App[];
}

const AppsQueryDocument = gql`
    query AppsQuery($appIds: [String!]) {
        apps (where: { id_in: $appIds }) {
            id
            metadata {
                title
                logoUrl
            }
            name
        }
    }
`

type OptionsParams = {
    appIds: string[];
    filters?: Record<string, unknown>;
}

/**
 * Hook to fetch information about multiple apps by their IDs
 */
export function useApps({ appIds, filters, ...options }: OptionsParams) {
    return useQuery<AppMap>({
        queryKey: ['apps', JSON.stringify(appIds), JSON.stringify(options), JSON.stringify(filters)],
        queryFn: async () => {
            // Skip if no app IDs are provided
            if (!appIds.length) {
                return {} as AppMap;
            }
            
            const { apps } = await request<AppsQuery>(
                GRAPH_URL,
                AppsQueryDocument,
                {
                    appIds,
                    ...{ ...options },
                    ...filters
                }
            )
            
            // Return the apps in a map format for easy lookup
            return apps.reduce((acc, app) => {
                acc[app.id] = app;
                return acc;
            }, {} as AppMap);
        },
        placeholderData: (previousData) => previousData,
        retry: false
    })
} 