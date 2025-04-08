import { VeDelegateProvider } from './components/VeDelegateProvider';
import { VeDelegateButton } from './components/VeDelegateButton';

interface VeDelegateButtonWrapperProps {
  className?: string;
  mode?: 'dark' | 'light';
  primaryColor?: string;
  appId: string;
}

/**
 * VeDelegateButtonWrapper Component
 * 
 * A lightweight button-based interface for veDelegate integration.
 * Shows a simple container with a "Manage" button that opens a modal dialog
 * for staking/unstaking B3TR tokens.
 * 
 * @param className Optional CSS class to apply to the component
 * @param mode Optional theme mode ('dark' | 'light'), defaults to 'dark'
 * @param primaryColor Optional primary color to use for buttons and highlights, defaults to '#ea580c'
 * @param appId Optional app ID for delegation, defaults to '0x9bc95bbe51b41d526e45466b32a95c2f170a79e74fe31a5782762f7a545e567a'
 * @returns A button-based veDelegate integration
 */
export default function VeDelegateButtonWrapper({ 
  className,
  mode = 'dark',
  primaryColor = '#ea580c',
  appId
}: VeDelegateButtonWrapperProps) {
  return (
    <VeDelegateProvider appId={appId}>
      <VeDelegateButton className={className} mode={mode} primaryColor={primaryColor} />
    </VeDelegateProvider>
  );
} 