import { useMemo } from "react";
import { useQuery, useQueryClient } from '@tanstack/react-query'

export const useCalculator = () => {
    const queryClient = useQueryClient()

    // Default amount to showcase APY in UI; callers can still request any amount via calculateReward
    const defaultAmount = 1000

    const fetchEstimate = async (amount: number) => {
        const res = await fetch(`https://vedelegate.vet/api/calculator/${amount}`)
        if (!res.ok) { throw new Error('Failed to fetch estimate') }
        return res.json() as Promise<{ estimate: number, apy: number }>
    }

    const { data, isFetching } = useQuery({
        queryKey: ['calculator', defaultAmount],
        queryFn: () => fetchEstimate(defaultAmount),
        staleTime: Infinity,
        gcTime: Infinity
    })

    const apy = Math.round(data?.apy ?? 0)

    const calculateReward = useMemo(() => async (amount: number) => {
        const result = await queryClient.fetchQuery({
            queryKey: ['calculator', amount],
            queryFn: () => fetchEstimate(amount),
            staleTime: Infinity,
            gcTime: Infinity
        })
        return result.estimate
    }, [queryClient])

    const calculateRewardApy = useMemo(() => () => apy, [apy])

    return {
        isLoading: isFetching,
        apy,
        calculateReward,
        calculateRewardApy
    };
};