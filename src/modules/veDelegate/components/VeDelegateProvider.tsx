import React, { createContext, useContext } from 'react';
import { VeDelegateTheme, defaultTheme } from '../theme';
import { useVeDelegate } from '../useVeDelegate';

interface VeDelegateContextType {
  theme: VeDelegateTheme;
  veDelegate: ReturnType<typeof useVeDelegate>;
}

const VeDelegateContext = createContext<VeDelegateContextType | null>(null);

export interface VeDelegateProviderProps {
  children: React.ReactNode;
  theme?: Partial<VeDelegateTheme>;
}

export function VeDelegateProvider({ children, theme = {} }: VeDelegateProviderProps) {
  const veDelegate = useVeDelegate();
  const mergedTheme = {
    ...defaultTheme,
    ...theme,
    colors: {
      ...defaultTheme.colors,
      ...(theme.colors || {}),
    },
  };

  return (
    <VeDelegateContext.Provider value={{ theme: mergedTheme, veDelegate }}>
      {children}
    </VeDelegateContext.Provider>
  );
}

export function useVeDelegateContext() {
  const context = useContext(VeDelegateContext);
  if (!context) {
    throw new Error('useVeDelegateContext must be used within a VeDelegateProvider');
  }
  return context;
} 