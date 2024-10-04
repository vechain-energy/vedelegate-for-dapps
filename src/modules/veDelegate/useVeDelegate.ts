import { useState, useEffect, useCallback } from "react";
import { useConnex, useWallet } from "@vechain/dapp-kit-react";
import { Addresses } from "./config";
import type { SigningCallbackFunc, Domain, ExecuteWithAuthorizationTypes, ExecuteWithAuthorizationMessage } from "./types";

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

export function useVeDelegate() {
    const { account } = useWallet()
    const connex = useConnex()

    const [updateTrigger, setUpdateTrigger] = useState(0)
    const [hasPool, setHasPool] = useState(false)
    const [tokenId, setTokenId] = useState("")
    const [address, setAddress] = useState("")
    const [accountBalance, setAccountBalance] = useState(getEmptyBalance())
    const [balance, setBalance] = useState(getEmptyBalance())
    const [chainId, setChainId] = useState('')

    const refetch = useCallback(() => setUpdateTrigger(Date.now()), [])


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

            return connex.thor
                .account(address)
                .method({
                    inputs: [
                        { name: "to", type: "address" },
                        { name: "value", type: "uint256" },
                        { name: "data", type: "bytes" },
                        { name: "validAfter", type: "uint256" },
                        { name: "validBefore", type: "uint256" },
                        { name: "nonce", type: "bytes32" },
                        { name: "signature", type: "bytes" }
                    ],
                    name: "executeWithAuthorization",
                    outputs: [{ name: "result", type: "bytes" }]
                })
                .asClause(
                    signedData.to,
                    signedData.value,
                    signedData.data,
                    signedData.validAfter,
                    signedData.validBefore,
                    signedData.nonce,
                    signedData.signature
                );
        } else {
            return connex.thor
                .account(address)
                .method({
                    inputs: [
                        { name: "to", type: "address" },
                        { name: "value", type: "uint256" },
                        { name: "data", type: "bytes" },
                        { name: "operation", type: "uint256" }
                    ],
                    name: "execute",
                    outputs: []
                })
                .asClause(to, value, data, operation);
        }
    }, [connex, address, buildSmartAccountSignature]);

    /**
     * load the balance of an address and return some token insights
     */
    const getVeBetterBalance = useCallback(async (address: string) => {
        const balance = getEmptyBalance()
        const b3tr = await connex.thor
            .account(Addresses.B3TR)
            .method({
                inputs: [{ name: "account", type: "address" }],
                name: "balanceOf",
                outputs: [{ name: "balance", type: "uint256" }],
            })
            .call(address);
        balance.b3tr = BigInt(b3tr.decoded.balance)

        const convertedB3tr = await connex.thor
            .account(Addresses.VOT3)
            .method({
                inputs: [{ name: "account", type: "address" }],
                name: "convertedB3trOf",
                outputs: [{ name: "balance", type: "uint256" }],
            })
            .call(address);

        balance.convertedB3tr = BigInt(convertedB3tr.decoded.balance)

        const vot3 = await connex.thor
            .account(Addresses.VOT3)
            .method({
                inputs: [{ name: "account", type: "address" }],
                name: "balanceOf",
                outputs: [{ name: "balance", type: "uint256" }],
            })
            .call(address);
        balance.vot3 = BigInt(vot3.decoded.balance)

        balance.availableB3tr = balance.b3tr + balance.convertedB3tr
        balance.availableVot3 = balance.vot3 - balance.convertedB3tr

        balance.b3trAsNumber = Number(balance.b3tr / BigInt(1e18))
        balance.convertedB3trAsNumber = Number(balance.convertedB3tr / BigInt(1e18))
        balance.vot3AsNumber = Number(balance.vot3 / BigInt(1e18))
        balance.availableB3trAsNumber = Number(balance.availableB3tr / BigInt(1e18))
        balance.availableVot3AsNumber = Number(balance.availableVot3 / BigInt(1e18))

        return balance
    }, [connex, updateTrigger])

    /**
     *  build clauses for seperate transactions, for the given amount of B3TR and VOT3
     */
    const buildDepositClauses = useCallback(async ({ b3tr, vot3, signingCallback }: { b3tr: bigint, vot3: bigint, signingCallback?: SigningCallbackFunc }) => {
        // collect clauses for transaction
        const clauses = []

        // if staking wallet does not exist yet, add a creation clause
        const { hasCode } = await connex.thor.account(address).get()
        if (!hasCode) {
            clauses.push(
                connex.thor.account(Addresses.VeDelegate)
                    .method({
                        inputs: [
                            { name: "tokenId", type: "uint256" },
                            { name: "to", type: "address" },
                            { name: "tokenURI", type: "string" }
                        ],
                        name: "createPool",
                        outputs: []
                    })
                    .asClause(tokenId, account, '')
            )
        }

        // VOT3 is transferred to the staking smart account
        if (vot3 > 0n) {
            clauses.push(
                connex.thor
                    .account(Addresses.VOT3)
                    .method({
                        inputs: [
                            { name: "recipient", type: "address" },
                            { name: "amount", type: "uint256" }
                        ],
                        name: "transfer",
                        outputs: []
                    })
                    .asClause(address, String(vot3))
            )
        }

        // B3TR is transferred to the staking smart account
        // and converted to VOT3 within the staking wallet too
        if (b3tr > 0n) {
            clauses.push(
                connex.thor
                    .account(Addresses.B3TR)
                    .method({
                        inputs: [
                            { name: "recipient", type: "address" },
                            { name: "amount", type: "uint256" }
                        ],
                        name: "transfer",
                        outputs: []
                    })
                    .asClause(address, String(b3tr)),

                // Approve B3TR for conversion to VOT3
                await executeOnSmartAccount(
                    Addresses.B3TR,
                    "0",
                    connex.thor.account(Addresses.B3TR).method({
                        inputs: [
                            { name: "spender", type: "address" },
                            { name: "amount", type: "uint256" }
                        ],
                        name: "approve",
                        outputs: [{ type: "bool" }]
                    }).asClause(Addresses.VOT3, String(b3tr)).data,
                    0,
                    signingCallback
                ),

                // Convert B3TR to VOT3
                await executeOnSmartAccount(
                    Addresses.VOT3,
                    "0",
                    connex.thor.account(Addresses.VOT3).method({
                        inputs: [
                            { name: "amount", type: "uint256" }
                        ],
                        name: "convertToVOT3",
                        outputs: []
                    }).asClause(String(b3tr)).data,
                    0,
                    signingCallback
                )
            )
        }
        return clauses
    }, [connex, tokenId, address, account, executeOnSmartAccount])

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
                    connex.thor.account(Addresses.VOT3).method({
                        inputs: [
                            { name: "recipient", type: "address" },
                            { name: "amount", type: "uint256" }
                        ],
                        name: "transfer",
                        outputs: []
                    }).asClause(recipient, String(vot3)).data,
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
                    connex.thor.account(Addresses.VOT3).method({
                        inputs: [
                            { name: "amount", type: "uint256" }
                        ],
                        name: "convertToB3TR",
                        outputs: []
                    }).asClause(String(b3tr > balance.convertedB3tr ? balance.convertedB3tr : b3tr)).data,
                    0,
                    signingCallback
                ),

                // Transfer the converted B3TR to the recipient
                await executeOnSmartAccount(
                    Addresses.B3TR,
                    "0",
                    connex.thor.account(Addresses.B3TR).method({
                        inputs: [
                            { name: "recipient", type: "address" },
                            { name: "amount", type: "uint256" }
                        ],
                        name: "transfer",
                        outputs: []
                    }).asClause(recipient, String(b3tr)).data,
                    0,
                    signingCallback
                )
            )
        }
        return clauses
    }, [connex, address, balance, executeOnSmartAccount])

    /**
     * build voting support
     * if this is not used or an empty list, all votes will be equally split over all apps
     */
    const buildSupportClauses = useCallback(async ({ appIds, percentages, signingCallback }: { appIds: string[], percentages: number[], signingCallback?: SigningCallbackFunc }) => {
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

        const data = connex.thor.account(Addresses.VeDelegateVotes).method({
            inputs: [
                { name: "appIds", type: "bytes32[]" },
                { name: "percentages", type: "uint8[]" }
            ],
            name: "castVotes",
            outputs: []
        }).asClause(appIds, uint8Percentages).data;

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
    }, [connex, address, executeOnSmartAccount])

    /**
     * detect account changes
     */
    useEffect(() => {
        if (!account || !connex) {
            setHasPool(false)
            setAccountBalance(getEmptyBalance())
        }
        else {
            getVeBetterBalance(account)
                .then(setAccountBalance)
                .catch(() => { /* ignore */ })
        }
    }, [account, connex, getVeBetterBalance])

    /**
     * get first token owned, will fail if there is none
     * directly using tokenOfOwnerByIndex without using balanceOf first
     * will save one network call
     */
    useEffect(() => {
        if (!account) { return }

        connex.thor
            .account(Addresses.VeDelegate)
            .method({
                inputs: [
                    { name: "owner", type: "address" },
                    { name: "tokenIndex", type: "uint256" },
                ],
                name: "tokenOfOwnerByIndex",
                outputs: [{ name: "tokenId", type: "uint256" }],
            })
            .call(account, 0)
            .then(({ decoded: { tokenId }, reverted }: { decoded: { tokenId: string }, reverted: true }) => {
                if (reverted) { throw new Error('No Token Found') }
                setTokenId(tokenId);
                setHasPool(true)
            })
            .catch(() => {
                setTokenId(BigInt(account).toString())
                setHasPool(false)
            });
    }, [account, connex])

    /**
     * get the smart accounts wallet address
     * this is always available, even even if the tokenId has not been minted yet
     */
    useEffect(() => {
        if (!tokenId) { return }

        connex.thor
            .account(Addresses.VeDelegate)
            .method({
                inputs: [{ name: "tokenId", type: "uint256" }],
                name: "getPoolAddress",
                outputs: [{ name: "tbaAddress", type: "address" }],
            })
            .call(tokenId)
            .then(({ decoded: { tbaAddress } }: { decoded: { tbaAddress: string } }) => {
                setAddress(tbaAddress);
            })
            .catch((error: Error) => {
                setAddress('')
                console.error(error);
            });
    }, [tokenId, connex])

    /**
     * Get the chain ID for the smart account
     */
    useEffect(() => {
        if (!address) {
            setChainId('');
            return;
        }

        connex.thor
            .account(address)
            .method({
                inputs: [],
                name: "getChainId",
                outputs: [{ type: "uint256" }]
            })
            .call()
            .then(({ decoded }: { decoded: [BigInt] }) => {
                setChainId(decoded[0].toString());
            })
            .catch(() => {
                setChainId('');
            });
    }, [address, connex]);

    /**
     * get balance of the staking wallet
     */
    useEffect(() => {
        if (!address) {
            setBalance(getEmptyBalance())
        }
        else {
            getVeBetterBalance(address)
                .then(setBalance)
                .catch(() => { /* ignore */ })
        }
    }, [address, getVeBetterBalance])


    return {
        hasPool,
        tokenId,
        address,

        getVeBetterBalance,
        accountBalance,
        balance,

        buildDepositClauses,
        buildWithdrawClauses,
        buildSupportClauses,

        refetch
    }
};
