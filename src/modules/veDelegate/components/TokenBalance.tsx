import React from 'react';
import styled from 'styled-components';
import { useVeDelegateContext } from './VeDelegateProvider';
import { Card } from './base/Card';

const BalanceContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.medium};
`;

const TokenRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${props => props.theme.spacing.small};
  border-bottom: 1px solid ${props => props.theme.colors.background.main};
  
  &:last-child {
    border-bottom: none;
  }
`;

const TokenLabel = styled.span`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 0.9rem;
`;

const TokenValue = styled.span`
  color: ${props => props.theme.colors.text.primary};
  font-family: monospace;
  font-size: 1rem;
  font-weight: 500;
`;

interface TokenBalanceProps {
  title?: string;
  showAvailable?: boolean;
  className?: string;
}

export function TokenBalance({ 
  title = 'Token Balance', 
  showAvailable = false,
  className 
}: TokenBalanceProps) {
  const { theme, veDelegate } = useVeDelegateContext();
  const balance = showAvailable ? veDelegate.balance : veDelegate.accountBalance;

  return (
    <Card className={className}>
      <BalanceContainer theme={theme}>
        <h3>{title}</h3>
        <TokenRow theme={theme}>
          <TokenLabel theme={theme}>B3TR</TokenLabel>
          <TokenValue theme={theme}>{balance.b3trAsNumber}</TokenValue>
        </TokenRow>
        <TokenRow theme={theme}>
          <TokenLabel theme={theme}>VOT3</TokenLabel>
          <TokenValue theme={theme}>{balance.vot3AsNumber}</TokenValue>
        </TokenRow>
        {showAvailable && (
          <>
            <TokenRow theme={theme}>
              <TokenLabel theme={theme}>Available B3TR</TokenLabel>
              <TokenValue theme={theme}>{balance.availableB3trAsNumber}</TokenValue>
            </TokenRow>
            <TokenRow theme={theme}>
              <TokenLabel theme={theme}>Available VOT3</TokenLabel>
              <TokenValue theme={theme}>{balance.availableVot3AsNumber}</TokenValue>
            </TokenRow>
          </>
        )}
      </BalanceContainer>
    </Card>
  );
} 