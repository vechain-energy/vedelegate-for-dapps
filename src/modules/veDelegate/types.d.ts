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
