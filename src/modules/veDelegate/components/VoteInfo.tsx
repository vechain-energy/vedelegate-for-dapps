import React from 'react';
import styled from 'styled-components';
import { useVeDelegateContext } from './VeDelegateProvider';
import { Card } from './base/Card';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.large};
  position: relative;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.medium};
  position: relative;
  z-index: 1;
`;

const Title = styled.h3`
  color: ${props => props.theme.colors.primary.main};
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: ${props => props.theme.spacing.medium};
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -${props => props.theme.spacing.small};
    left: 0;
    width: 60px;
    height: 3px;
    background: linear-gradient(
      90deg,
      ${props => props.theme.colors.primary.main},
      ${props => props.theme.colors.primary.light}
    );
    border-radius: 2px;
  }
`;

const AddressRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.small};
  padding: ${props => props.theme.spacing.medium};
  border: 1px solid ${props => `${props.theme.colors.primary.main}15`};
  border-radius: ${props => props.theme.borderRadius.medium};
  background: ${props => `${props.theme.colors.background.paper}CC`};
  backdrop-filter: blur(8px);
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => `${props.theme.colors.primary.main}30`};
    box-shadow: 0 0 20px ${props => `${props.theme.colors.primary.main}20`};
    background: ${props => props.theme.colors.background.paper};
  }
`;

const Label = styled.span`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 0.9rem;
  font-weight: 500;
`;

const Address = styled.span`
  color: ${props => props.theme.colors.text.primary};
  font-family: monospace;
  font-size: 0.85rem;
  word-break: break-all;
  padding: ${props => props.theme.spacing.small};
  background: ${props => `${props.theme.colors.background.main}80`};
  border-radius: ${props => props.theme.borderRadius.small};
  border: 1px solid ${props => `${props.theme.colors.primary.main}10`};
`;

const VotePreferencesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.medium};
  padding: ${props => props.theme.spacing.medium};
  background: ${props => `${props.theme.colors.background.main}E6`};
  border-radius: ${props => props.theme.borderRadius.medium};
  border: 1px solid ${props => `${props.theme.colors.primary.main}15`};
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 20px ${props => `${props.theme.colors.primary.main}10`};
`;

const VotePreferenceRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${props => props.theme.spacing.small};
  padding: ${props => props.theme.spacing.small};
  border-bottom: 1px solid ${props => `${props.theme.colors.primary.main}10`};
  transition: all 0.2s ease;
  
  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${props => `${props.theme.colors.background.paper}50`};
  }
`;

const SmallText = styled.span`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 0.8rem;
  font-family: monospace;
`;

interface VoteInfoProps {
  className?: string;
}

function shortenAddress(address: string): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export function VoteInfo({ className }: VoteInfoProps) {
  const { theme, veDelegate } = useVeDelegateContext();

  return (
    <Card className={className}>
      <Container theme={theme}>
        <Section theme={theme}>
          <Title theme={theme}>veDelegate Information</Title>
          <AddressRow theme={theme}>
            <Label theme={theme}>Smart Account</Label>
            <Address theme={theme}>{veDelegate.address}</Address>
          </AddressRow>
          <AddressRow theme={theme}>
            <Label theme={theme}>Token ID</Label>
            <Address theme={theme}>{veDelegate.tokenId}</Address>
          </AddressRow>
          <AddressRow theme={theme}>
            <Label theme={theme}>Token Passport</Label>
            <Address theme={theme}>{veDelegate.passportAddress}</Address>
          </AddressRow>
        </Section>

        <Section theme={theme}>
          <Label theme={theme}>Vote Preferences</Label>
          <VotePreferencesContainer theme={theme}>
            {veDelegate.votePreference.appIds.map((appId, index) => (
              <VotePreferenceRow key={appId} theme={theme}>
                <SmallText theme={theme}>{shortenAddress(appId)}</SmallText>
                <SmallText theme={theme}>{veDelegate.votePreference.percentages[index]}%</SmallText>
              </VotePreferenceRow>
            ))}
            {veDelegate.votePreference.appIds.length === 0 && (
              <SmallText theme={theme}>No vote preferences set</SmallText>
            )}
          </VotePreferencesContainer>
        </Section>
      </Container>
    </Card>
  );
} 