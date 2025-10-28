import { useState, useEffect, useMemo } from "react";
import { Addresses } from "../config";
import { useThor } from "@vechain/dapp-kit-react";
import { useRound } from "./useRound";
import { Address, ABIItem, ABIFunction } from "@vechain/sdk-core";

export const useCalculator = () => {
    const [currentRoundId, setCurrentRoundId] = useState(0);
    const [emission, setEmission] = useState(0n);
    const round = useRound({ roundId: currentRoundId - 1 })
    const [apy, setAPY] = useState(0)
    const [actionMultiplier, setActionMultiplier] = useState(1)
    const thor = useThor()

    useEffect(() => {
        if (!round?.data) { return }
        const totalProposals = round.data.proposals.filter(({ depositAmount, thresholdAmount }) => depositAmount >= thresholdAmount).length ?? 0
        const multiplier = 1 + totalProposals
        setActionMultiplier(multiplier)
    }, [round])

    useEffect(() => {
        thor.contracts.executeCall(
            Addresses.AllocationVoting,
            ABIItem.ofSignature(ABIFunction, 'function currentRoundId() view returns (uint256)'),
            []
        )
            .then(({ result: { plain: roundId } }) => {
                setCurrentRoundId(Number(roundId));
            })
            .catch((error: Error) => {
                console.error(error);
            });
    }, [thor]);

    useEffect(() => {
        if (!currentRoundId) { return }
        const fetchEmission = async () => {
            const emissionResponse = await thor.contracts.executeCall(
                Addresses.Emission,
                ABIItem.ofSignature(ABIFunction, 'function getVote2EarnAmount(uint256 roundId) view returns (uint256)'),
                [currentRoundId]
            );
            setEmission(BigInt(emissionResponse.result.plain as bigint));
        };

        fetchEmission();
    }, [thor, currentRoundId])

    const calculateReward = useMemo(() => (amount: number, multiplier: number) => {
        if (!round.data) { return 0 }
        const totalWeight = Number(round.data.weightTotal / BigInt(1e18))
        return Math.floor((Number(emission / BigInt(1e18)) * amount) / totalWeight * Math.max(1, multiplier) * 100 * actionMultiplier) / 100
    }, [round.data?.votes, emission, actionMultiplier])

    const calculateRewardApy = useMemo(() => (votes: number, rewards: number) => {
        if (!votes) { return 0 }
        const weeklyRate = Number(rewards / votes)
        return (((1 + weeklyRate) ** 52) - 1) * 100
    }, [calculateReward]);


    useEffect(() => {
        const sampleAmount = 1000
        const sampleReward = calculateReward(sampleAmount, 1)
        const apy = calculateRewardApy(sampleAmount, sampleReward)
        setAPY(Math.round(apy))
    }, [emission, calculateRewardApy, calculateReward])


    return {
        isLoading: !currentRoundId || !emission || round.isLoading,
        apy,
        calculateReward,
        calculateRewardApy
    };
};