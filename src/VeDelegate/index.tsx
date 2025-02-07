import React from 'react';
import { VeDelegate } from '../modules/veDelegate/components/VeDelegate';
import { VeDelegateProvider } from '../modules/veDelegate/components/VeDelegateProvider';

export default function VeDelegateWrapper() {
  return (
    <VeDelegateProvider>
      <VeDelegate />
    </VeDelegateProvider>
  );
}