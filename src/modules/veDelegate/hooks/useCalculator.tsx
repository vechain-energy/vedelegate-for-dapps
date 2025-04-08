import { useState, useEffect, useMemo } from "react";
import { Addresses } from "../config";
import { useConnex } from "@vechain/dapp-kit-react";
import { useRound } from "./useRound";

export const useCalculator = () => {
    const [currentRoundId, setCurrentRoundId] = useState(0);
    const [emission, setEmission] = useState(0n);
    const round = useRound({ roundId: currentRoundId - 1 })
    const [apy, setAPY] = useState(0)
    const [actionMultiplier, setActionMultiplier] = useState(1)
    const connex = useConnex()

    useEffect(() => {
        if (!round?.data) { return }
        const totalProposals = round.data.proposals.filter(({ depositAmount, thresholdAmount }) => depositAmount >= thresholdAmount).length ?? 0
        const multiplier = 1 + totalProposals
        setActionMultiplier(multiplier)
    }, [round])

    useEffect(() => {
        connex.thor
            .account(Addresses.AllocationVoting)
            .method({
                inputs: [],
                name: "currentRoundId",
                outputs: [{ name: "roundId", type: "uint256" }],
            })
            .call()
            .then(({ decoded: { roundId } }: { decoded: { roundId: string } }) => {
                setCurrentRoundId(Number(roundId));
            })
            .catch((error: Error) => {
                console.error(error);
            });
    }, [connex]);

    useEffect(() => {
        if (!currentRoundId) { return }
        const fetchEmission = async () => {
            const emissionResponse = await connex.thor.account(Addresses.Emission).method({
                "constant": true,
                "inputs": [
                    {
                        "name": "roundId",
                        "type": "uint256"
                    }
                ],
                "name": "getVote2EarnAmount",
                "outputs": [
                    {
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
            }).call(currentRoundId);
            setEmission(BigInt(emissionResponse.decoded[0]));
        };

        fetchEmission();
    }, [connex, currentRoundId])

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