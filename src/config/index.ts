// obtain on https://cloud.walletconnect.com/
// must be set to enable VeWorld mobile connections on Desktop
export const WALLET_CONNECT_PROJECT_ID = process.env.WALLET_CONNECT_PROJECT_ID ?? "";

// the network to use, based on the node to connect to
export const NODE_URL = process.env.NODE_URL ?? `https://mainnet.vechain.org`;
export const NETWORK = process.env.NETWORK ?? "main";

// if fee delegation will be used, the url to the delegation service
export const DELEGATION_URL = process.env.DELEGATION_URL

// app meta data, mainly used for wallet connect and html metadata
export const APP_TITLE = process.env.APP_TITLE ?? "veDelegate.vet for dApps";
export const APP_DESCRIPTION = process.env.APP_DESCRIPTION ?? "This is an example dApp showcasing management of veDelegate staking within VeBetterDAO dApps.";
export const APP_ICONS = (process.env.APP_ICONS ?? "").split(',');