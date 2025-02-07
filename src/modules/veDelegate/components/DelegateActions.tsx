import React from 'react';
import styled from 'styled-components';
import { useWallet, useConnex } from '@vechain/dapp-kit-react';
import { useVeDelegateContext } from './VeDelegateProvider';
import { Button } from './base/Button';
import { Card } from './base/Card';

const ActionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.medium};
`;

const ActionDescription = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: ${props => props.theme.spacing.medium};
`;

interface DelegateActionsProps {
  className?: string;
}

export function DelegateActions({ className }: DelegateActionsProps) {
  const { account } = useWallet();
  const connex = useConnex();
  const { theme, veDelegate } = useVeDelegateContext();
  const hasTokensToDeposit = (veDelegate.accountBalance.b3trAsNumber + veDelegate.accountBalance.vot3AsNumber) > 0;
  const hasTokensToWithdraw = (veDelegate.balance.b3trAsNumber + veDelegate.balance.vot3AsNumber) > 0;

  const handleDeposit = async () => {
    try {
      const clauses = await veDelegate.buildDepositClauses({
        b3tr: veDelegate.accountBalance.b3tr,
        vot3: veDelegate.accountBalance.vot3
      });
      
      await connex.vendor.sign('tx', clauses)
        .comment('Deposit VeBetterDAO Tokens')
        .request();
      
      await connex.thor.ticker().next();
      veDelegate.refetch();
    } catch (error) {
      console.error('Failed to deposit tokens:', error);
    }
  };

  const handleWithdraw = async () => {
    if (!account) return;
    
    try {
      const clauses = await veDelegate.buildWithdrawClauses({
        b3tr: veDelegate.balance.availableB3tr,
        vot3: veDelegate.balance.availableVot3,
        recipient: account,
      });
      
      await connex.vendor.sign('tx', clauses)
        .comment('Withdraw VeBetterDAO Tokens')
        .request();
      
      await connex.thor.ticker().next();
      veDelegate.refetch();
    } catch (error) {
      console.error('Failed to withdraw tokens:', error);
    }
  };

  if (!account) {
    return (
      <Card className={className}>
        <ActionsContainer theme={theme}>
          <ActionDescription theme={theme}>
            Please connect your wallet to manage your tokens.
          </ActionDescription>
        </ActionsContainer>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <ActionsContainer theme={theme}>
        {hasTokensToDeposit && (
          <>
            <ActionDescription theme={theme}>
              You have inactive tokens that can be deposited for staking.
            </ActionDescription>
            <Button
              variant="success"
              onClick={handleDeposit}
              disabled={!hasTokensToDeposit}
            >
              Activate Support & Staking
            </Button>
          </>
        )}

        {hasTokensToWithdraw && (
          <>
            <ActionDescription theme={theme}>
              You have active tokens that can be withdrawn from staking.
            </ActionDescription>
            <Button
              variant="error"
              onClick={handleWithdraw}
              disabled={!hasTokensToWithdraw}
            >
              Deactivate Support & Staking
            </Button>
          </>
        )}

        {!hasTokensToDeposit && !hasTokensToWithdraw && (
          <ActionDescription theme={theme}>
            You don't have any tokens to manage at the moment.
          </ActionDescription>
        )}
      </ActionsContainer>
    </Card>
  );
} 