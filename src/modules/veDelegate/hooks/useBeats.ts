import React from 'react';
// subscriptions usage fails:
// TypeError: Class extends value undefined is not a constructor or null
// ..
// > 4140 | var JSONRPCEthersProvider = class extends vechain_sdk_core_ethers3.JsonRpcApiProvider {
// … skipping to 
// import { subscriptions } from '@vechain/sdk-network';
import useWebSocket from 'react-use-websocket';
import { NODE_URL } from '~/config';
import { BloomFilter, Hex } from "@vechain/sdk-core";

type Beat = {
  number: number;
  id: string;
  parentID: string;
  timestamp: number;
  txsFeatures: number;
  gasLimit: number;
  bloom: string;
  k: number;
  obsolete: boolean;
};

const DELAY = 100;

/**
 * Subscribe to blockchain updates and filter them based on provided addresses, transactions or data.
 *
 * @param {(string | `0x${string}` | null | undefined)[]} addressesOrData - An array of addresses, transaction ids or data to filter the incoming beats.
 * @returns {Beat | null} - The latest block that matches the filter criteria or null if no match is found.
 */
const useBeats = (addressesOrData: (string | `0x${string}` | null | undefined)[]) => {
  const [block, setBlock] = React.useState<Beat | null>(null);
  const { lastJsonMessage } = useWebSocket(
    `${NODE_URL}/subscriptions/beat2`.replace('http', 'ws'),
    // subscriptions.getBeatSubscriptionUrl(NODE_URL),
    {
      share: true,
      shouldReconnect: () => true,
    }
  );

  React.useEffect(() => {
    const newBlock = lastJsonMessage as Beat | null;
    if (!newBlock) { return }

    try {
      const bloomFilter = new BloomFilter(Hex.of(newBlock.bloom).bytes, newBlock.k);
      const dataInBlock = (data: string) => bloomFilter.contains(Hex.of(data))

      const isRelevantBlock = addressesOrData
        .filter((value): value is string => Boolean(value))
        .some(dataInBlock)

      if (isRelevantBlock) {
        setTimeout(() => setBlock(newBlock), DELAY);
      }

    } catch (error) {
      console.error("Error processing block:", error);
    }
  }, [lastJsonMessage, addressesOrData]);

  return block;
};

export { useBeats };
