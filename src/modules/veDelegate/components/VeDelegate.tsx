import React from 'react';
import styled from 'styled-components';
import { useVeDelegateContext } from './VeDelegateProvider';
import { TokenBalance } from './TokenBalance';
import { DelegateActions } from './DelegateActions';
import { VoteInfo } from './VoteInfo';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.large};
  max-width: 1200px;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.large};
  position: relative;
`;

const Background = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  background: ${props => props.theme.colors.background.paper};
  overflow: hidden;

  &::before, &::after {
    content: '';
    position: absolute;
    width: 200%;
    height: 200%;
    top: -50%;
    left: -50%;
    z-index: 0;
    background: linear-gradient(
      45deg,
      ${props => `${props.theme.colors.primary.main}15`} 0%,
      transparent 45%,
      transparent 55%,
      ${props => `${props.theme.colors.secondary.main}15`} 100%
    );
    animation: gradientMove 15s ease-in-out infinite alternate;
  }

  &::after {
    background: linear-gradient(
      -45deg,
      ${props => `${props.theme.colors.secondary.main}15`} 0%,
      transparent 45%,
      transparent 55%,
      ${props => `${props.theme.colors.primary.main}15`} 100%
    );
    animation: gradientMove 20s ease-in-out infinite alternate-reverse;
  }

  @keyframes gradientMove {
    0% {
      transform: translate(-5%, -5%) rotate(-2deg);
    }
    100% {
      transform: translate(5%, 5%) rotate(2deg);
    }
  }
`;

const Title = styled.h1`
  color: ${props => props.theme.colors.primary.main};
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.large};
  font-size: 2.5rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${props => props.theme.spacing.large};

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const BalanceSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.large};
`;

interface VeDelegateProps {
  title?: string;
  className?: string;
}

export function VeDelegate({ 
  title = 'veDelegate.vet Dashboard',
  className 
}: VeDelegateProps) {
  const { theme } = useVeDelegateContext();

  return (
    <>
      <Background theme={theme} />
      <Container theme={theme} className={className}>
        <Title theme={theme}>{title}</Title>
        
        <Grid theme={theme}>
          <BalanceSection theme={theme}>
            <TokenBalance title="Wallet Balance" />
            <TokenBalance title="Staking Balance" showAvailable />
            <DelegateActions />
          </BalanceSection>
          
          <VoteInfo />
        </Grid>
      </Container>
    </>
  );
} 