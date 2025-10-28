import { useState, useEffect, useLayoutEffect } from 'react';
import { useVeDelegateContext } from './VeDelegateProvider';
import { VeDelegateModal } from './VeDelegateModal';
import { useCalculator } from '../hooks/useCalculator';

interface VeDelegateButtonProps {
  className?: string;
  mode?: 'dark' | 'light';
  primaryColor?: string;
}

export function VeDelegateButton({ className, mode = 'dark', primaryColor = '#ea580c' }: VeDelegateButtonProps) {
  const { veDelegateState } = useVeDelegateContext();
  const { account, hasPool, accountBalance, balance } = veDelegateState;
  const calculator = useCalculator();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataReady, setIsDataReady] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check initially
    checkIfMobile();

    // Add listener for window resize
    window.addEventListener('resize', checkIfMobile);

    // Clean up
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Check if data is ready
  useEffect(() => {
    const ready = !calculator.isLoading && Boolean(account) && !veDelegateState.isLoading
    setIsDataReady(ready);

    if (!ready) {
      setIsLoading(true);
    }
  }, [account, veDelegateState.isLoading, calculator.isLoading]);

  // Handle loading state after render
  useLayoutEffect(() => {
    if (isDataReady) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isDataReady]);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  // Theme-based styles
  const containerStyle: React.CSSProperties = {
    background: mode === 'dark'
      ? 'linear-gradient(145deg, rgba(17, 24, 39, 0.9) 0%, rgba(31, 41, 55, 0.9) 100%)'
      : 'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(243, 244, 246, 0.9) 100%)',
    borderRadius: '12px',
    boxShadow: mode === 'dark'
      ? '0 2px 4px rgba(0, 0, 0, 0.05)'
      : '0 2px 8px rgba(0, 0, 0, 0.05)',
    padding: '16px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.3s ease-in-out',
    border: mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.05)'
      : '1px solid rgba(0, 0, 0, 0.05)',
    position: 'relative',
  };

  const headerStyle: React.CSSProperties = {
    color: mode === 'dark' ? '#e5e7eb' : '#111827',
    fontSize: '1rem',
    fontWeight: '200',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.15em'
  };

  const statsContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    gap: isMobile ? '12px' : '16px',
    marginBottom: '16px'
  };

  const statBoxStyle: React.CSSProperties = {
    background: mode === 'dark'
      ? 'linear-gradient(145deg, rgba(31, 41, 55, 0.3) 0%, rgba(17, 24, 39, 0.3) 100%)'
      : 'linear-gradient(145deg, rgba(249, 250, 251, 0.8) 0%, rgba(243, 244, 246, 0.8) 100%)',
    padding: '10px 12px',
    borderRadius: '8px',
    flex: isMobile ? '1 1 auto' : 1,
    border: mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.03)'
      : '1px solid rgba(0, 0, 0, 0.05)',
    backdropFilter: 'blur(10px)',
  };

  const statLabelStyle: React.CSSProperties = {
    color: mode === 'dark' ? '#9ca3af' : '#6b7280',
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '2px'
  };

  const statValueStyle: React.CSSProperties = {
    color: mode === 'dark' ? '#e5e7eb' : '#111827',
    fontSize: '1.25rem',
    fontWeight: '500'
  };

  const stakedValueStyle: React.CSSProperties = {
    background: mode === 'dark'
      ? `linear-gradient(135deg, #a3e635 0%, #84cc16 100%)`
      : `linear-gradient(-45deg, #84cc16 0%, #65a30d 50%, #84cc16 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontSize: '1.25rem',
    fontWeight: '600',
    backgroundSize: '200% auto',
    animation: 'shine 2s ease-in-out infinite'
  };

  const tokenIconStyle: React.CSSProperties = {
    width: '24px',
    height: '24px',
    borderRadius: '50%'
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: primaryColor,
    color: 'white',
    borderRadius: '8px',
    border: 'none',
    padding: '8px',
    fontWeight: '600',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '16px',
    textAlign: 'center',
    opacity: 0.9
  };

  const infoContainerStyle: React.CSSProperties = {
    color: mode === 'dark' ? '#9ca3af' : '#6b7280',
    fontSize: '0.8rem',
    lineHeight: '1.4',
    marginTop: '4px',
    paddingLeft: '2px'
  };


  const highlightStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(primaryColor, -30)} 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: '500',
    display: 'inline-block',
    textShadow: 'none'
  };

  const loadingOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: mode === 'dark'
      ? 'rgba(17, 24, 39, 0.7)'
      : 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    borderRadius: '12px',
    zIndex: 10
  };

  const loadingTextStyle: React.CSSProperties = {
    color: mode === 'dark' ? '#e5e7eb' : '#111827',
    fontSize: '0.875rem',
    fontWeight: '500',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    opacity: 0.8,
    animation: 'pulse 2s ease-in-out infinite',
    margin: 0,
    padding: 0
  };

  const loadingLogoStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    animation: 'pulse 2s ease-in-out infinite',
    margin: 0
  };

  const shimmerStyle: React.CSSProperties = {
    width: '60%',
    height: '4px',
    background: mode === 'dark'
      ? 'linear-gradient(90deg, rgba(31, 41, 55, 0) 0%, rgba(31, 41, 55, 0.5) 50%, rgba(31, 41, 55, 0) 100%)'
      : 'linear-gradient(90deg, rgba(243, 244, 246, 0) 0%, rgba(243, 244, 246, 0.5) 50%, rgba(243, 244, 246, 0) 100%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    marginTop: '4px'
  };

  // Helper function to darken/lighten a color
  function adjustColor(color: string, amount: number): string {
    // Convert hex to RGB
    let hex = color.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    // Parse the hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Adjust the color
    const adjustR = Math.max(0, Math.min(255, r + amount));
    const adjustG = Math.max(0, Math.min(255, g + amount));
    const adjustB = Math.max(0, Math.min(255, b + amount));

    // Convert back to hex
    return `#${adjustR.toString(16).padStart(2, '0')}${adjustG.toString(16).padStart(2, '0')}${adjustB.toString(16).padStart(2, '0')}`;
  }

  // Not connected state
  if (!account) {
    return (
      <div
        style={containerStyle}
        className={`${className} hover:shadow-xl hover:-translate-y-1`}
        onClick={handleOpenModal}
        role="button"
        tabIndex={0}
      >
        <div style={headerStyle}>
          <span>Stake to Earn</span>
        </div>
        <div style={infoContainerStyle}>
          Connect your wallet to start earning <span style={highlightStyle}>~{calculator.apy}% APY</span> in VOT3 rewards
        </div>
        <div style={{ ...buttonStyle, opacity: 0.5 }}>Please Connect your Wallet first</div>
      </div >
    );
  }

  return (
    <>
      <style>
        {`
          @keyframes shine {
            0% { background-position: 0% center; }
            50% { background-position: 100% center; }
            100% { background-position: 0% center; }
          }

          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }

          @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
          }
        `}
      </style>
      <div
        style={containerStyle}
        className={`${className} hover:shadow-xl hover:-translate-y-1`}
        onClick={isLoading ? undefined : handleOpenModal}
        role="button"
        tabIndex={isLoading ? -1 : 0}
      >
        {isLoading && (
          <div style={loadingOverlayStyle}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              transform: 'translateY(-4px)'
            }}>
              <img
                src="https://vedelegate.vet/logo.svg"
                alt="veDelegate Logo"
                style={loadingLogoStyle}
              />
              <div style={loadingTextStyle}>Loading...</div>
              <div style={shimmerStyle}></div>
            </div>
          </div>
        )}

        <div style={headerStyle}>
          <span>Stake to Earn</span>
          <img
            src="https://vechain.github.io/token-registry/assets/5a9eb5e11751a649ca00298f3237c4624712af75.png"
            alt="B3TR Token"
            style={tokenIconStyle}
          />
        </div>

        <div style={statsContainerStyle}>
          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Staked Balance</div>
            <div style={stakedValueStyle}>{hasPool ? balance.convertedB3trAsNumber.toFixed(2) : '0'} B3TR</div>
          </div>
          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Available to Stake</div>
            <div style={statValueStyle}>{accountBalance.b3trAsNumber.toFixed(2)} B3TR</div>
          </div>
        </div>

        <div style={infoContainerStyle}>
          {hasPool && balance.convertedB3trAsNumber > 0 ? (
            <>
              Current APY is <span style={highlightStyle}>~{calculator.apy}%</span>
            </>
          ) : (
            <>
              Stake your rewards to earn <span style={highlightStyle}>~{calculator.apy}% APY</span>
            </>
          )}
        </div>

        <div style={buttonStyle}>Manage</div>
      </div>

      <VeDelegateModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        mode={mode}
        primaryColor={primaryColor}
      />
    </>
  );
} 