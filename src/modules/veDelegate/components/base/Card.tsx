import React from 'react';
import styled from 'styled-components';
import { useVeDelegateContext } from '../VeDelegateProvider';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const StyledCard = styled.div<{ theme: any }>`
  background: ${props => props.theme.colors.background.paper};
  border-radius: ${props => props.theme.borderRadius.large};
  padding: ${props => props.theme.spacing.large};
  box-shadow: ${props => props.theme.shadows.card};
`;

export function Card({ children, className }: CardProps) {
  const { theme } = useVeDelegateContext();
  
  return (
    <StyledCard theme={theme} className={className}>
      {children}
    </StyledCard>
  );
} 