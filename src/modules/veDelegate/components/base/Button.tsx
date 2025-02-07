import React from 'react';
import styled from 'styled-components';
import { useVeDelegateContext } from '../VeDelegateProvider';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'error';
  size?: 'small' | 'medium' | 'large';
}

const StyledButton = styled.button<{ theme: any; variant: string; size: string }>`
  background: ${props => props.theme.colors[props.variant].main};
  color: white;
  border: none;
  padding: ${props => {
    switch (props.size) {
      case 'small': return `${props.theme.spacing.small} ${props.theme.spacing.medium}`;
      case 'large': return `${props.theme.spacing.medium} ${props.theme.spacing.large}`;
      default: return `${props.theme.spacing.medium} ${props.theme.spacing.large}`;
    }
  }};
  border-radius: ${props => props.theme.borderRadius.medium};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${props => props.theme.shadows.button};

  &:hover {
    background: ${props => props.theme.colors[props.variant].light};
    transform: translateY(-1px);
  }

  &:disabled {
    background: ${props => props.theme.colors.text.secondary};
    cursor: not-allowed;
    transform: none;
  }
`;

export function Button({ 
  children, 
  variant = 'primary',
  size = 'medium',
  ...props 
}: ButtonProps) {
  const { theme } = useVeDelegateContext();
  
  return (
    <StyledButton 
      theme={theme} 
      variant={variant}
      size={size}
      {...props}
    >
      {children}
    </StyledButton>
  );
} 