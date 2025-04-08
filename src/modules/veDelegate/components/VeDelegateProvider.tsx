import React, { createContext, useContext } from 'react';
import { useVeDelegate } from '../hooks/useVeDelegate';
import { VeDelegateTheme, defaultTheme } from '../theme';
import { VeDelegateState } from '../types';

interface VeDelegateContextType {
  theme: VeDelegateTheme;
  veDelegateState: VeDelegateState;
}

const VeDelegateContext = createContext<VeDelegateContextType | undefined>(undefined);

export const useVeDelegateContext = () => {
  const context = useContext(VeDelegateContext);
  if (!context) {
    throw new Error('useVeDelegateContext must be used within a VeDelegateProvider');
  }
  return context;
};

interface VeDelegateProviderProps {
  children: React.ReactNode;
  theme?: VeDelegateTheme;
  appId: string;
}

export function VeDelegateProvider({ 
  children,
  theme = defaultTheme,
  appId
}: VeDelegateProviderProps) {
  const veDelegateState = useVeDelegate(appId);

  return (
    <VeDelegateContext.Provider value={{ theme, veDelegateState }}>
      {children}
    </VeDelegateContext.Provider>
  );
} 