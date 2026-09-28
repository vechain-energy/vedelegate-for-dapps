import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VeDelegateProvider } from '../../src/modules/veDelegate/components/VeDelegateProvider';
import { VeDelegateModal } from '../../src/modules/veDelegate/components/VeDelegateModal';
import { alpha } from './wallet';
const mode = new URLSearchParams(location.search).get('mode') === 'light' ? 'light' : 'dark';
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient()}><VeDelegateProvider appId={alpha}><VeDelegateModal isOpen onClose={() => {}} mode={mode} /></VeDelegateProvider></QueryClientProvider>);
