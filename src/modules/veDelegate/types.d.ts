export type SigningCallbackFunc = (domain: Domain, types: ExecuteWithAuthorizationTypes, message: ExecuteWithAuthorizationMessage) => Promise<string>

export interface Domain {
    name: "vedelegate.vet";
    version: "1";
    chainId: string;
    verifyingContract: string;
}

export interface ExecuteWithAuthorizationTypes {
    ExecuteWithAuthorization: Array<{
        name: string;
        type: string;
    }>;
}

export interface ExecuteWithAuthorizationMessage {
    to: string;
    value: number | string;
    data: string;
    validAfter: number;
    validBefore: number;
    nonce: string;
}

export interface SignatureData {
    domain: Domain;
    types: ExecuteWithAuthorizationTypes;
    primaryType: "ExecuteWithAuthorization";
    message: ExecuteWithAuthorizationMessage;
}

export interface VotePreference {
    appIds: string[]
    percentages: number[]
}

export interface VoteMapping {
    [appId: string]: number;
}

export interface Balance {
    b3tr: bigint;
    b3trAsNumber: number;
    vot3: bigint;
    vot3AsNumber: number;
    convertedB3tr: bigint;
    convertedB3trAsNumber: number;
    availableB3tr: bigint;
    availableB3trAsNumber: number;
    availableVot3: bigint;
    availableVot3AsNumber: number;
}

export interface VeDelegateState {
    account: string | null;
    chainId: string;
    hasPool: boolean;
    tokenId: string;
    address: string;
    passportAddress: string;
    votePreference: VotePreference;
    voteMapping: VoteMapping;
    hasVotedForPlatform: boolean;
    accountBalance: Balance;
    balance: Balance;
    isLoading: boolean;
    appId: string;
    refetch: () => void;
    executeOnSmartAccount: (to: string, value: string, data: string, operation?: number, signingCallback?: SigningCallbackFunc) => Promise<any>;
    buildSmartAccountSignature: (to: string, value: string, data: string, validAfter: number, validBefore: number, nonce: string, signCallback: SigningCallbackFunc) => Promise<any>;
    getVeBetterBalance: (address: string) => Promise<Balance>;
    buildDepositClauses: (params: { b3tr: bigint, vot3: bigint, signingCallback?: SigningCallbackFunc }) => Promise<any[]>;
    buildWithdrawClauses: (params: { b3tr: bigint, vot3: bigint, recipient: string, signingCallback?: SigningCallbackFunc }) => Promise<any[]>;
    buildSupportClauses: (params: { appIds: string[], percentages: number[], signingCallback?: SigningCallbackFunc }) => Promise<any[]>;
} 