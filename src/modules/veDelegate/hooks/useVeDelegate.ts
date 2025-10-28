import { useState, useEffect, useCallback } from "react";
import { useThor, useWallet } from "@vechain/dapp-kit-react";
import { Addresses } from "../config";
import type { SigningCallbackFunc, Domain, ExecuteWithAuthorizationTypes, ExecuteWithAuthorizationMessage, VotePreference, VoteMapping } from "../types";
import { useBeats } from "./useBeats";
import { Address, ABIItem, ABIFunction, Clause } from "@vechain/sdk-core";

const getEmptyBalance = () => ({
    b3tr: 0n,
    b3trAsNumber: 0,

    vot3: 0n,
    vot3AsNumber: 0,

    convertedB3tr: 0n,
    convertedB3trAsNumber: 0,

    availableB3tr: 0n,
    availableB3trAsNumber: 0,

    availableVot3: 0n,
    availableVot3AsNumber: 0,
})

export function useVeDelegate(appId: string) {
    const { account } = useWallet()
    const thor = useThor()

    const [updateTrigger, setUpdateTrigger] = useState(0)
    const [hasPool, setHasPool] = useState(false)
    const [tokenId, setTokenId] = useState("")
    const [address, setAddress] = useState("")
    const [passportAddress, setPassportAddress] = useState("")
    const [accountBalance, setAccountBalance] = useState(getEmptyBalance())
    const [rewardsReceived, setRewardsReceived] = useState(0)
    const [votePreference, setVotePreference] = useState<VotePreference>({ appIds: [], percentages: [] })
    const [voteMapping, setVoteMapping] = useState<VoteMapping>({})
    const [balance, setBalance] = useState(getEmptyBalance())
    const [chainId, setChainId] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [hasVotedForPlatform, setHasVotedForPlatform] = useState(false)

    const refetch = useCallback(() => setUpdateTrigger(Date.now()), [])

    const beats = useBeats([address])
    useEffect(() => {
        if (beats) { refetch() }
    }, [beats, refetch])


    /**
     * Helper function to build signed data for smart account instructions
     */
    const buildSmartAccountSignature = useCallback(async (
        to: string,
        value: string,
        data: string,
        validAfter: number,
        validBefore: number,
        nonce: string,
        signCallback: SigningCallbackFunc
    ) => {
        const domain: Domain = {
            name: 'vedelegate.vet',
            version: '1',
            chainId,
            verifyingContract: address
        }

        const types: ExecuteWithAuthorizationTypes = {
            ExecuteWithAuthorization: [
                { name: "to", type: "address" },
                { name: "value", type: "uint256" },
                { name: "data", type: "bytes" },
                { name: "validAfter", type: "uint256" },
                { name: "validBefore", type: "uint256" },
                { name: "nonce", type: "bytes32" },
            ],
        }

        const message: ExecuteWithAuthorizationMessage = {
            to: to,
            value: value,
            data: data,
            validAfter: validAfter,
            validBefore: validBefore,
            nonce: nonce
        }

        const signature = await signCallback(domain, types, message);

        return {
            to: message.to,
            value: message.value,
            data: message.data,
            validAfter: message.validAfter,
            validBefore: message.validBefore,
            nonce: message.nonce,
            signature: signature
        };
    }, [chainId, address]);


    /**
     * Helper function to wrap smart account instructions
     */
    const executeOnSmartAccount = useCallback(async (
        to: string,
        value: string,
        data: string,
        operation: number = 0,
        signingCallback?: SigningCallbackFunc
    ) => {
        if (signingCallback) {
            const validAfter = Math.floor(Date.now() / 1000) - 10; // valid after previous block
            const validBefore = Math.floor(Date.now() / 1000) + 3600; // validBefore: 1 hour from now
            const nonce = String(Date.now());

            const signedData = await buildSmartAccountSignature(
                to,
                value,
                data,
                validAfter,
                validBefore,
                nonce,
                signingCallback
            );

            return Clause.callFunction(
                Address.of(address),
                ABIItem.ofSignature(ABIFunction, 'function executeWithAuthorization(address to, uint256 value, bytes data, uint256 validAfter, uint256 validBefore, bytes32 nonce, bytes signature) returns (bytes result)'),
                [
                    signedData.to,
                    signedData.value,
                    signedData.data,
                    signedData.validAfter,
                    signedData.validBefore,
                    signedData.nonce,
                    signedData.signature
                ]
            );
        } else {
            return Clause.callFunction(
                Address.of(address),
                ABIItem.ofSignature(ABIFunction, 'function execute(address to, uint256 value, bytes data, uint256 operation)'),
                [to, value, data, operation]
            );
        }
    }, [thor, address, buildSmartAccountSignature]);

    /**
     * load the balance of an address and return some token insights
     */
    const getVeBetterBalance = useCallback(async (address: string) => {
        const balance = getEmptyBalance()
        const b3tr = await thor.contracts.executeCall(
            Addresses.B3TR,
            ABIItem.ofSignature(ABIFunction, 'function balanceOf(address account) view returns (uint256)'),
            [address]
        );
        balance.b3tr = BigInt(b3tr.result.plain as bigint)

        const convertedB3tr = await thor.contracts.executeCall(
            Addresses.VOT3,
            ABIItem.ofSignature(ABIFunction, 'function convertedB3trOf(address account) view returns (uint256)'),
            [address]
        );

        balance.convertedB3tr = BigInt(convertedB3tr.result.plain as bigint)

        const vot3 = await thor.contracts.executeCall(
            Addresses.VOT3,
            ABIItem.ofSignature(ABIFunction, 'function balanceOf(address account) view returns (uint256)'),
            [address]
        );
        balance.vot3 = BigInt(vot3.result.plain as bigint)

        balance.availableB3tr = balance.b3tr + balance.convertedB3tr
        balance.availableVot3 = balance.vot3 - balance.convertedB3tr

        balance.b3trAsNumber = Number(balance.b3tr / BigInt(1e18))
        balance.convertedB3trAsNumber = Number(balance.convertedB3tr / BigInt(1e18))
        balance.vot3AsNumber = Number(balance.vot3 / BigInt(1e18))
        balance.availableB3trAsNumber = Number(balance.availableB3tr / BigInt(1e18))
        balance.availableVot3AsNumber = Number(balance.availableVot3 / BigInt(1e18))

        return balance
    }, [thor, updateTrigger])

    /**
     *  build clauses for seperate transactions, for the given amount of B3TR and VOT3
     */
    const buildDepositClauses = useCallback(async ({ b3tr, vot3, signingCallback }: { b3tr: bigint, vot3: bigint, signingCallback?: SigningCallbackFunc }) => {
        // collect clauses for transaction
        const clauses = []

        // if staking wallet does not exist yet, add a creation clause
        try {
            const accountInfo = await thor.accounts.getAccount(Address.of(address))
            if (!accountInfo.hasCode) {
                clauses.push(
                    Clause.callFunction(
                        Address.of(Addresses.VeDelegate),
                        ABIItem.ofSignature(ABIFunction, 'function createPool(uint256 tokenId, address to, string tokenURI)'),
                        [tokenId, account, `embed:${appId}`]
                    )
                )
            }
        } catch (error) {
            // If we can't check the account, assume it doesn't exist and create it
            clauses.push(
                Clause.callFunction(
                    Address.of(Addresses.VeDelegate),
                    ABIItem.ofSignature(ABIFunction, 'function createPool(uint256 tokenId, address to, string tokenURI)'),
                    [tokenId, account, `embed:${appId}`]
                )
            )
        }

        // VOT3 is transferred to the staking smart account
        if (vot3 > 0n) {
            clauses.push(
                Clause.callFunction(
                    Address.of(Addresses.VOT3),
                    ABIItem.ofSignature(ABIFunction, 'function transfer(address recipient, uint256 amount) returns (bool)'),
                    [address, String(vot3)]
                )
            )
        }

        // B3TR is transferred to the staking smart account
        // and converted to VOT3 within the staking wallet too
        if (b3tr > 0n) {
            clauses.push(
                Clause.callFunction(
                    Address.of(Addresses.B3TR),
                    ABIItem.ofSignature(ABIFunction, 'function transfer(address recipient, uint256 amount) returns (bool)'),
                    [address, String(b3tr)]
                ),

                // Approve B3TR for conversion to VOT3
                await executeOnSmartAccount(
                    Addresses.B3TR,
                    "0",
                    Clause.callFunction(
                        Address.of(Addresses.B3TR),
                        ABIItem.ofSignature(ABIFunction, 'function approve(address spender, uint256 amount) returns (bool)'),
                        [Addresses.VOT3, String(b3tr)]
                    ).data,
                    0,
                    signingCallback
                ),

                // Convert B3TR to VOT3
                await executeOnSmartAccount(
                    Addresses.VOT3,
                    "0",
                    Clause.callFunction(
                        Address.of(Addresses.VOT3),
                        ABIItem.ofSignature(ABIFunction, 'function convertToVOT3(uint256 amount)'),
                        [String(b3tr)]
                    ).data,
                    0,
                    signingCallback
                )
            )
        }


        // active passport if user is not already delegating their passport to the smart wallet
        if (passportAddress.toLowerCase() !== account?.toLowerCase()) {
            // Delegate the Passport
            clauses.push(
                Clause.callFunction(
                    Address.of(Addresses.VePassport),
                    ABIItem.ofSignature(ABIFunction, 'function delegatePassport(address delegatee)'),
                    [address]
                )
            )

            // Accept the Passport on the Smart Wallet
            clauses.push(
                await executeOnSmartAccount(
                    Addresses.VePassport,
                    "0",
                    Clause.callFunction(
                        Address.of(Addresses.VOT3),
                        ABIItem.ofSignature(ABIFunction, 'function acceptDelegation(address user)'),
                        [account]
                    ).data,
                    0,
                    signingCallback
                )
            )
        }

        return clauses
    }, [thor, tokenId, address, passportAddress, account, executeOnSmartAccount, appId])

    /**
    *  build clauses for seperate transactions, for the given amount of B3TR and VOT3
    *  the funds will be sent to the given recipient
    */
    const buildWithdrawClauses = useCallback(async ({ b3tr, vot3, recipient, signingCallback }: { b3tr: bigint, vot3: bigint, recipient: string, signingCallback?: SigningCallbackFunc }) => {
        // collect clauses for transaction
        const clauses = []

        // VOT3 is transferred directly
        if (vot3 > 0n) {
            clauses.push(
                await executeOnSmartAccount(
                    Addresses.VOT3,
                    "0",
                    Clause.callFunction(
                        Address.of(Addresses.VOT3),
                        ABIItem.ofSignature(ABIFunction, 'function transfer(address recipient, uint256 amount) returns (bool)'),
                        [recipient, String(vot3)]
                    ).data,
                    0,
                    signingCallback
                )
            )
        }

        // B3TR is received by converting VOT3
        // and then transferring to the user
        if (b3tr > 0n) {
            clauses.push(
                // Convert VOT3 to B3TR
                await executeOnSmartAccount(
                    Addresses.VOT3,
                    "0",
                    Clause.callFunction(
                        Address.of(Addresses.VOT3),
                        ABIItem.ofSignature(ABIFunction, 'function convertToB3TR(uint256 amount)'),
                        [String(b3tr > balance.convertedB3tr ? balance.convertedB3tr : b3tr)]
                    ).data,
                    0,
                    signingCallback
                ),

                // Transfer the converted B3TR to the recipient
                await executeOnSmartAccount(
                    Addresses.B3TR,
                    "0",
                    Clause.callFunction(
                        Address.of(Addresses.B3TR),
                        ABIItem.ofSignature(ABIFunction, 'function transfer(address recipient, uint256 amount) returns (bool)'),
                        [recipient, String(b3tr)]
                    ).data,
                    0,
                    signingCallback
                )
            )
        }

        // deactive passport if the future balance will be zero
        if ((balance.b3tr + balance.vot3) - (b3tr + vot3) === 0n) {

            // Revoke the Passport on the Smart Wallet
            clauses.push(
                await executeOnSmartAccount(
                    Addresses.VePassport,
                    "0",
                    Clause.callFunction(
                        Address.of(Addresses.VOT3),
                        ABIItem.ofSignature(ABIFunction, 'function revokeDelegation()'),
                        []
                    ).data,
                    0,
                    signingCallback
                )
            )
        }

        return clauses
    }, [thor, address, balance, executeOnSmartAccount])


    /**
     * Check if the user has a vote for the platform app
     */
    const checkHasVotedForPlatform = useCallback(() => {
        return votePreference.appIds.some(
            currentAppId => currentAppId.toLowerCase() === appId.toLowerCase()
        );
    }, [votePreference, appId]);

    /**
     * Update the hasVotedForPlatform state whenever votePreference changes
     */
    useEffect(() => {
        setHasVotedForPlatform(checkHasVotedForPlatform());
    }, [votePreference, checkHasVotedForPlatform]);

    /**
     * Create vote mapping from appIds and percentages
     */
    useEffect(() => {
        const mapping: VoteMapping = {};
        
        if (votePreference.appIds && votePreference.percentages) {
            votePreference.appIds.forEach((appId, index) => {
                if (index < votePreference.percentages.length) {
                    mapping[appId] = votePreference.percentages[index];
                }
            });
        }
        
        setVoteMapping(mapping);
    }, [votePreference]);

    /**
     * Load the vote information from the VeDelegateVotes contract
     */
    useEffect(() => {
        if (!address) { return }

        thor.contracts.executeCall(
            Addresses.VeDelegateVotes,
            ABIItem.ofSignature(ABIFunction, 'function getVotes(address voter) view returns ((bytes32[],uint8[]))'),
            [address]
        )
            .then(({ result: { plain: voteData } }) => {
                if (voteData && Array.isArray(voteData) && voteData.length >= 2) {
                    setVotePreference({
                        appIds: voteData[0] || [],
                        percentages: voteData[1]?.map((p: any) => Number(p)) || []
                    });
                } else {
                    setVotePreference({ appIds: [], percentages: [] });
                }
            })
            .catch((error) => {
                console.error("Error loading vote data:", error);
                setVotePreference({ appIds: [], percentages: [] });
            });
    }, [address, thor, updateTrigger]);

    /**
     * build voting support
     * if this is not used or an empty list, all votes will be equally split over all apps
     */
    const buildSupportClauses = useCallback(async ({ appIds, percentages, signingCallback }: VotePreference & { signingCallback?: SigningCallbackFunc }) => {
        // Ensure appIds and percentages are valid
        if (appIds.length !== percentages.length || appIds.length === 0) {
            throw new Error('Invalid input: appIds and percentages must be non-empty arrays of the same length');
        }

        // Convert percentages to uint8 array
        const uint8Percentages = percentages.map(p => {
            if (p < 0 || p > 100) {
                throw new Error('Percentages must be between 0 and 100');
            }
            return Math.floor(p);
        });

        const data = Clause.callFunction(
            Address.of(Addresses.VeDelegateVotes),
            ABIItem.ofSignature(ABIFunction, 'function castVotes(bytes32[] appIds, uint8[] percentages)'),
            [appIds, uint8Percentages]
        ).data;

        // Create the clause for casting votes
        const clauses = []
        clauses.push(
            await executeOnSmartAccount(
                Addresses.VeDelegateVotes,
                "0",
                data,
                0,
                signingCallback
            )
        )

        return clauses
    }, [thor, executeOnSmartAccount])

    /**
     * detect account changes
     */
    useEffect(() => {
        if (!account || !thor) {
            setHasPool(false)
            setAccountBalance(getEmptyBalance())
            setIsLoading(false)
        }
        else {
            setIsLoading(true)
            getVeBetterBalance(account)
                .then(setAccountBalance)
                .catch(() => { /* ignore */ })
                .finally(() => setIsLoading(false))
        }
    }, [account, thor, getVeBetterBalance])

    /**
     * get first token owned, will fail if there is none
     * directly using tokenOfOwnerByIndex without using balanceOf first
     * will save one network call
     */
    useEffect(() => {
        if (!account) { return }

        thor.contracts.executeCall(
            Addresses.VeDelegate,
            ABIItem.ofSignature(ABIFunction, 'function tokenOfOwnerByIndex(address owner, uint256 tokenIndex) view returns (uint256)'),
            [account, 0]
        )
            .then(({ result: { plain: tokenId } }) => {
                setTokenId(String(tokenId));
                setHasPool(true)
            })
            .catch(() => {
                setTokenId(BigInt(account).toString())
                setHasPool(false)
            });
    }, [account, thor])

    /**
     * get the smart accounts wallet address
     * this is always available, even even if the tokenId has not been minted yet
     */
    useEffect(() => {
        if (!tokenId) { return }

        thor.contracts.executeCall(
            Addresses.VeDelegate,
            ABIItem.ofSignature(ABIFunction, 'function getPoolAddress(uint256 tokenId) view returns (address)'),
            [tokenId]
        )
            .then(({ result: { plain: tbaAddress } }) => {
                setAddress(String(tbaAddress));
            })
            .catch((error: Error) => {
                setAddress('')
                console.error(error);
            });
    }, [tokenId, thor])

    /**
    * get the passport currently delegated to the smart accounts wallet address
    * if this is address zero, there is no passport
    */
    useEffect(() => {
        if (!address) { return }

        thor.contracts.executeCall(
            Addresses.VePassport,
            ABIItem.ofSignature(ABIFunction, 'function getDelegator(address delegatee) view returns (address)'),
            [address]
        )
            .then(({ result: { plain: user } }) => {
                setPassportAddress(String(user));
            })
            .catch((error: Error) => {
                setPassportAddress('')
                console.error(error);
            });
    }, [address, thor, updateTrigger])


    /**
     * Get the chain ID for the smart account
     */
    useEffect(() => {
        if (!address) {
            setChainId('');
            return;
        }

        thor.contracts.executeCall(
            address,
            ABIItem.ofSignature(ABIFunction, 'function getChainId() view returns (uint256)'),
            []
        )
            .then(({ result: { plain: chainId } }) => {
                setChainId(String(chainId));
            })
            .catch(() => {
                setChainId('');
            });
    }, [address, thor]);

    /**
     * get balance of the staking wallet
     */
    useEffect(() => {
        if (!address) {
            setBalance(getEmptyBalance())
            setIsLoading(false)
        }
        else {
            setIsLoading(true)
            getVeBetterBalance(address)
                .then(setBalance)
                .catch(() => { /* ignore */ })
                .finally(() => setIsLoading(false))
        }
    }, [address, getVeBetterBalance])

    /**
    * get the past rewards received by the staking wallet
    */
    useEffect(() => {
        if (!address) { return }


        // For now, we'll skip the rewards fetching as it requires updating the fetchAllEvents utility
        // TODO: Update fetchAllEvents to work with SDK v2
        setRewardsReceived(0);

    }, [address, thor])


    return {
        account,
        hasPool,
        tokenId,
        address,
        passportAddress,
        votePreference,
        voteMapping,
        hasVotedForPlatform,
        accountBalance,
        balance,
        rewardsReceived,
        chainId,
        isLoading,
        appId,
        refetch,
        executeOnSmartAccount,
        buildSmartAccountSignature,
        getVeBetterBalance,
        buildDepositClauses,
        buildWithdrawClauses,
        buildSupportClauses
    }
};
