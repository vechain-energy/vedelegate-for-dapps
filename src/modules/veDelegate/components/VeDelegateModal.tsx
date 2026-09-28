import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useVeDelegateContext } from './VeDelegateProvider';
import { Constants } from '../config';
import { useWallet } from '@vechain/dapp-kit-react';
import { getNextMonday, getNextMondayAfterNextMonday } from '../utils';
import { VotingPanel } from './VotingPanel';

interface VeDelegateModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'dark' | 'light';
  primaryColor?: string;
}

export function VeDelegateModal({ isOpen, onClose, mode = 'dark', primaryColor = '#ea580c' }: VeDelegateModalProps) {
  const { veDelegateState } = useVeDelegateContext();
  const {
    account,
    hasPool,
    accountBalance,
    balance,
    refetch,
    buildDepositClauses,
    buildWithdrawClauses,
    buildSupportClauses,
    appId
  } = veDelegateState;
  const { signer } = useWallet();
  const [activeTab, setActiveTab] = useState<'stake' | 'unstake' | 'voting'>('stake');
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  // Auto-fill 100% of user's balance when the modal opens
  useEffect(() => {
    if (isOpen && account) {
      const maxAmount = activeTab === 'stake'
        ? accountBalance.b3trAsNumber
        : balance.convertedB3trAsNumber;

      if (maxAmount > 0) {
        setAmount(maxAmount.toFixed(2));
        setError(null);
      }
    }
  }, [isOpen, account, activeTab, accountBalance.b3trAsNumber, balance.convertedB3trAsNumber]);

  // Check if the device is mobile based on screen width
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

  // Find or create the modal root element
  useEffect(() => {
    let element = document.getElementById('modal-root');
    if (!element) {
      element = document.createElement('div');
      element.id = 'modal-root';
      document.body.appendChild(element);
    }
    setModalRoot(element);

    return () => {
      // Clean up if this component created the element
      if (element && element.parentNode && element.childNodes.length === 0) {
        element.parentNode.removeChild(element);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen, isMobile]);

  useEffect(() => {
    if (!hasPool) setActiveTab('stake');
  }, [hasPool, account]);

  if (!isOpen || !modalRoot) return null;

  const handleTabChange = (tab: 'stake' | 'unstake' | 'voting') => {
    setActiveTab(tab);
    setTransactionSuccess(false);

    // Auto-fill with 100% of the new tab's balance
    const maxAmount = tab === 'stake'
      ? accountBalance.b3trAsNumber
      : balance.convertedB3trAsNumber;

    if (maxAmount > 0) {
      setAmount(maxAmount.toFixed(2));
      setError(null);
    } else {
      setAmount('');
      setError(null); // Don't show error immediately
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    setTransactionSuccess(false);

    // Validate amount
    if (parseFloat(value) <= 0) {
      setError('');
    } else if (activeTab === 'stake' && parseFloat(value) > accountBalance.b3trAsNumber) {
      setError('Amount exceeds available balance');
    } else if (activeTab === 'stake' && getFutureStakedBalance() < Constants.MINIMUM_STAKE_AMOUNT && !hasPool) {
      setError(`Minimum stake amount is ${Constants.MINIMUM_STAKE_AMOUNT} B3TR`);
    } else if (activeTab === 'unstake' && parseFloat(value) > balance.convertedB3trAsNumber) {
      setError('Amount exceeds staked balance');
    } else {
      setError(null);
    }
  };

  const handlePercentageClick = (percentage: number) => {
    const maxAmount = activeTab === 'stake'
      ? accountBalance.b3trAsNumber
      : balance.convertedB3trAsNumber;
    const calculatedAmount = (maxAmount * percentage / 100).toFixed(2);
    setAmount(calculatedAmount);
    setTransactionSuccess(false);

    // Validate the calculated amount
    if (parseFloat(calculatedAmount) <= 0) {
      setError('');
    } else if (activeTab === 'stake' && getFutureStakedBalance() < Constants.MINIMUM_STAKE_AMOUNT && !hasPool) {
      setError(`Minimum stake amount is ${Constants.MINIMUM_STAKE_AMOUNT} B3TR`);
    } else {
      setError(null);
    }
  };

  const handleStakeAction = async () => {
    if (error || !amount || parseFloat(amount) <= 0) return;

    // Additional validation for staking minimum
    if (activeTab === 'stake' && getFutureStakedBalance() < Constants.MINIMUM_STAKE_AMOUNT && !hasPool) {
      setError(`Minimum stake amount is ${Constants.MINIMUM_STAKE_AMOUNT} B3TR`);
      return;
    }

    if (!account) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const amountValue = parseFloat(amount);
      const amountWei = BigInt(Math.floor(amountValue * 1e18)); // Convert to wei (18 decimals)

      if (activeTab === 'stake') {
        // Create deposit transaction
        if (signer) {
          console.log('Executing deposit transaction...');

          // Get all clauses needed for the deposit
          const clauses = await buildDepositClauses({
            b3tr: amountWei,
            vot3: 0n,
            signingCallback: undefined
          });

          // if pool is being created, set voting to 100% platform app
          if (!hasPool) {
            clauses.push(...(await buildSupportClauses({
              appIds: [appId],
              percentages: [100],
              signingCallback: undefined
            }))
            )
          }

          if (!clauses || clauses.length === 0) {
            throw new Error('Failed to create deposit transaction');
          }

          // Execute all clauses in a single transaction
          const depositTx = await signer.sendTransaction({
            clauses,
            comment: 'Deposit B3TR tokens'
          });

          if (depositTx) {
            setTransactionSuccess(true);
            await refetch();
          }
        } else {
          throw new Error('Signer not available');
        }
      } else {
        // Create withdraw transaction
        if (signer) {
          console.log('Executing withdrawal transaction...');

          const withdrawClauses = await buildWithdrawClauses({
            b3tr: amountWei,
            vot3: 0n,
            recipient: account
          })

          if (withdrawClauses) {
            const withdrawTx = await signer.sendTransaction({
              clauses: withdrawClauses,
              comment: 'Withdraw B3TR tokens'
            });

            if (withdrawTx) {
              setTransactionSuccess(true);
              await refetch();
            }
          } else {
            throw new Error('Failed to create withdrawal transaction');
          }
        } else {
          throw new Error('Signer not available');
        }
      }
    } catch (err) {
      console.error('Transaction error:', err);
      setError(err instanceof Error ? err.message : 'Transaction failed');
      setTransactionSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Get the future staked balance after the operation
  const getFutureStakedBalance = () => {
    if (!amount || parseFloat(amount) <= 0) return hasPool ? balance.convertedB3trAsNumber : 0;

    const amountValue = parseFloat(amount);

    if (activeTab === 'stake') {
      // Add the new stake amount to the existing balance
      return (hasPool ? balance.convertedB3trAsNumber : 0) + amountValue;
    } else {
      // Subtract the unstake amount from the existing balance
      return Math.max(0, balance.convertedB3trAsNumber - amountValue);
    }
  };

  // Helper function to adjust color brightness (simple implementation)
  const adjustColorBrightness = (color: string, percent: number): string => {
    // For simplicity, we'll just return a slightly different color for hover states
    // In a real implementation, this would properly lighten/darken the color
    if (percent > 0) {
      // Lighten for hover (for example)
      return color === '#ea580c' ? '#f97316' : color; // Default fallback if it's the original orange
    }
    return color;
  };

  // Check if unstaking would result in a balance below the minimum
  const willUnstakeBelowMinimum = () => {
    if (activeTab !== 'unstake' || !amount) return false;

    const futureBalance = getFutureStakedBalance();
    return futureBalance > 0 && futureBalance < Constants.MINIMUM_STAKE_AMOUNT;
  };

  // Check if stake button should be disabled
  const isStakeButtonDisabled = () => {
    if (error || !amount || parseFloat(amount) <= 0 || isLoading) return true;

    if (activeTab === 'stake' && getFutureStakedBalance() < Constants.MINIMUM_STAKE_AMOUNT) {
      return true;
    }

    return false;
  };

  // Modal styles
  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: mode === 'dark' ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.45)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: isMobile ? 'flex-end' : 'center',
    zIndex: 9999,
    overflowY: isMobile ? 'auto' : 'hidden',
    WebkitOverflowScrolling: 'touch',
    transition: 'backdrop-filter 0.3s ease-in-out, background-color 0.3s ease-in-out'
  };

  const modalContentStyle: React.CSSProperties = {
    backgroundColor: mode === 'dark' ? '#111827' : '#ffffff', // dark: bg-gray-900, light: white
    color: mode === 'dark' ? '#e5e7eb' : '#111827', // dark: text-gray-200, light: text-gray-900
    borderRadius: isMobile ? '16px 16px 0 0' : '16px',
    width: isMobile ? '100%' : '90%',
    maxWidth: isMobile ? '100%' : '500px',
    maxHeight: isMobile ? '85vh' : '90vh',
    overflowY: 'hidden',
    position: 'relative',
    animation: isMobile ? 'slideUp 0.3s ease-out' : 'fadeIn 0.2s ease-out',
    transition: 'all 0.3s ease-in-out',
    display: 'flex',
    flexDirection: 'column',
    minHeight: isMobile ? 'min-content' : 'auto',
    boxShadow: mode === 'dark' 
      ? '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)' 
      : '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)'
  };

  const headerContainerStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    backgroundColor: mode === 'dark' ? '#111827' : '#ffffff',
    zIndex: 20,
    padding: '24px 24px 0',
    borderTopLeftRadius: isMobile ? '16px' : '16px',
    borderTopRightRadius: isMobile ? '16px' : '16px',
  };

  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '24px',
    right: '24px',
    backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: 'none',
    cursor: 'pointer',
    color: mode === 'dark' ? '#e5e7eb' : '#111827',
    fontSize: '24px',
    lineHeight: '1',
    padding: '0',
    zIndex: 1
  };

  const closeButtonContentStyle: React.CSSProperties = {
    display: 'inline-block',
    marginTop: '-2px', // Slight adjustment to vertically center the × character
    width: '24px',
    height: '24px',
    textAlign: 'center'
  };

  const contentContainerStyle: React.CSSProperties = {
    overflowY: 'auto',
    padding: '0 24px 24px',
    flex: 1,
  };

  const tabsContainerStyle: React.CSSProperties = {
    display: 'flex',
    borderBottom: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
    marginBottom: '24px',
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '12px',
    textAlign: 'center',
    cursor: 'pointer',
    fontWeight: isActive ? 'bold' : 'normal',
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: isActive 
      ? (mode === 'dark' ? '#e5e7eb' : '#111827') 
      : (mode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'),
    borderBottom: isActive 
      ? (mode === 'dark' ? `2px solid ${primaryColor}` : `3px solid ${primaryColor}`) 
      : (mode === 'dark' ? 'none' : '1px solid rgba(0, 0, 0, 0.05)'),
    transition: 'all 0.2s ease',
  });

  const headlineStyle: React.CSSProperties = {
    background: mode === 'dark'
      ? 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)'
      : 'linear-gradient(135deg, #000000 0%, #111827 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontSize: '1.25rem',
    fontWeight: '200',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    marginBottom: '8px'
  };

  const inputContainerStyle: React.CSSProperties = {
    marginBottom: '20px'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    border: error 
      ? '1px solid #ef4444' 
      : mode === 'dark' ? '1px solid transparent' : '1px solid rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    padding: '16px',
    color: mode === 'dark' ? '#e5e7eb' : '#111827',
    fontSize: '24px',
    marginTop: '10px'
  };

  const balanceStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    color: mode === 'dark' ? '#e5e7eb' : '#374151',
    marginBottom: '16px',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: '500'
  };

  const b3trLogoStyle: React.CSSProperties = {
    width: '24px',
    height: '24px',
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: '8px',
    borderRadius: '50%',
    overflow: 'hidden'
  };

  const percentageContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '10px',
    marginBottom: '24px'
  };

  const percentageButtonStyle = (isActive: boolean): React.CSSProperties => {
    const maxAmount = activeTab === 'stake' ? accountBalance.b3trAsNumber : balance.convertedB3trAsNumber;
    const isDisabled = maxAmount <= 0;

    return {
      flex: 1,
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: isDisabled 
        ? (mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)') 
        : isActive 
          ? primaryColor 
          : (mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'),
      color: isDisabled 
        ? (mode === 'dark' ? '#6b7280' : '#9ca3af') 
        : (mode === 'dark' || isActive) ? '#ffffff' : '#111827',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      fontWeight: isActive ? '500' : 'normal',
      transition: 'all 300ms ease-in-out',
      opacity: isDisabled ? 0.5 : 1,
      boxShadow: isActive && !isDisabled ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
    };
  };

  const finelineStyle: React.CSSProperties = {
    color: mode === 'dark' ? '#9ca3af' : '#4b5563',
    padding: '0.5rem',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    fontSize: '0.8rem',
    letterSpacing: '0.25px',
  };

  const warningStyle: React.CSSProperties = {
    backgroundColor: mode === 'dark' ? 'rgba(234, 88, 12, 0.2)' : 'rgba(234, 88, 12, 0.15)',
    border: `1px solid ${mode === 'dark' ? 'rgba(234, 88, 12, 0.5)' : 'rgba(234, 88, 12, 0.3)'}`,
    padding: '0.5rem',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    fontSize: '0.8rem',
    letterSpacing: '0.25px',
    color: mode === 'dark' ? '#e5e7eb' : '#111827',
  };

  const infoStyle: React.CSSProperties = {
    backgroundColor: mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
    border: `1px solid ${mode === 'dark' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.3)'}`,
    padding: '0.5rem',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    fontSize: '0.8rem',
    letterSpacing: '0.25px',
    color: mode === 'dark' ? '#e5e7eb' : '#111827',
  };

  const successStyle: React.CSSProperties = {
    backgroundColor: mode === 'dark' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
    border: `1px solid ${mode === 'dark' ? 'rgba(134, 239, 172, 0.5)' : 'rgba(34, 197, 94, 0.2)'}`,
    padding: '0.5rem',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    fontSize: '0.8rem',
    letterSpacing: '0.25px',
    color: mode === 'dark' ? '#e5e7eb' : '#111827',
  };

  const errorStyle: React.CSSProperties = {
    color: '#ef4444', // red-500 for both themes
    marginBottom: '16px',
    fontSize: '14px'
  };

  const footerStyle: React.CSSProperties = {
    textAlign: 'center',
    color: mode === 'dark' ? '#6b7280' : '#4b5563',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    marginTop: '0px',
    padding: '8px 0'
  };

  const logoStyle: React.CSSProperties = {
    height: '16px',
    width: 'auto',
    marginLeft: '2px'
  };

  const calculatePercentageButtonStyle = (percent: number) => {
    const maxAmount = activeTab === 'stake' ? accountBalance.b3trAsNumber : balance.convertedB3trAsNumber;
    const calculatedAmount = (maxAmount * percent / 100).toFixed(2);
    const isCurrentSelection = amount === calculatedAmount;
    return percentageButtonStyle(isCurrentSelection);
  };

  // Create a style element for animations with theme support
  const styleElement = (
    <style>
      {`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes blurIn {
          from { 
            backdrop-filter: blur(0px);
            -webkit-backdrop-filter: blur(0px);
            background-color: ${mode === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.2)'};
          }
          to { 
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            background-color: ${mode === 'dark' ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.45)'};
          }
        }
        
        .modal-overlay {
          animation: blurIn 0.3s ease-out forwards;
        }
        
        @keyframes dropdownSlideIn {
          from { 
            opacity: 0;
            transform: translateY(-10px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes dropdownSlideOut {
          from { 
            opacity: 1;
            transform: translateY(0);
          }
          to { 
            opacity: 0;
            transform: translateY(-10px);
          }
        }
        
        .btn-primary {
          width: 100%;
          color: white;
          padding-top: 0.75rem;
          padding-bottom: 0.75rem;
          padding-left: 1rem;
          padding-right: 1rem;
          transition-property: all;
          transition-duration: 300ms;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 0.5rem;
          background-color: ${primaryColor};
          margin-bottom: 1rem;
        }
        
        .btn-primary:hover {
          background-color: ${adjustColorBrightness(primaryColor, 10)};
        }
        
        .btn-primary:focus-visible {
          outline: 2px solid ${primaryColor};
          outline-offset: 2px;
        }
        
        .btn-primary:disabled {
          background-color: ${mode === 'dark' ? '#374151' : '#d1d5db'};
          color: ${mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'};
          opacity: 0.7;
        }
        
        .dropdown-enter {
          animation: dropdownSlideIn 0.2s ease forwards;
        }
        
        .dropdown-exit {
          animation: dropdownSlideOut 0.2s ease forwards;
        }
        
        .modal-content {
          transition: height 0.3s ease-in-out;
        }

        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        input[type=number] {
          -moz-appearance: textfield;
        }

        @media (max-width: 768px) {
          .modal-content {
            max-height: 85vh;
            margin-bottom: env(safe-area-inset-bottom);
          }
          
          body.modal-open {
            overflow: hidden;
            position: fixed;
            width: 100%;
          }
        }
      `}
    </style>
  );

  // Button styles for the primary action button
  const actionButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    border: 'none',
    backgroundColor: isStakeButtonDisabled() ? (mode === 'dark' ? '#374151' : '#d1d5db') : primaryColor,
    color: isStakeButtonDisabled()
      ? (mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)')
      : '#ffffff',
    cursor: isStakeButtonDisabled() ? 'not-allowed' : 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    transition: 'all 0.3s ease',
    opacity: isStakeButtonDisabled() ? 0.7 : 1,
    marginBottom: '1rem'
  };

  // Use createPortal to render the modal outside the normal DOM hierarchy
  return createPortal(
    <>
      {styleElement}
      <div className="modal-overlay" style={modalOverlayStyle} onClick={isMobile ? onClose : undefined}>
        <div
          className="modal-content"
          style={modalContentStyle}
          onClick={e => e.stopPropagation()} // Prevent closing when clicking inside
        >
          <div style={headerContainerStyle}>
            <button style={closeButtonStyle} onClick={onClose}>
              <span style={closeButtonContentStyle}>×</span>
            </button>
            <h2 style={headlineStyle}>
              {activeTab === 'voting' ? 'Voting preferences' : 'Stake to earn'}
            </h2>
          </div>

          <div style={contentContainerStyle}>
            <div style={tabsContainerStyle}>
              <div
                style={tabStyle(activeTab === 'stake')}
                onClick={() => handleTabChange('stake')}
              >
                Stake
              </div>
              <div
                style={tabStyle(activeTab === 'unstake')}
                onClick={() => handleTabChange('unstake')}
              >
                Unstake
              </div>
              {hasPool && <button type="button" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'transparent', fontFamily: 'inherit', ...tabStyle(activeTab === 'voting') }} onClick={() => handleTabChange('voting')}>Voting</button>}
            </div>

            {hasPool && activeTab === 'voting' && <VotingPanel key={`${account}:${veDelegateState.address}`} mode={mode} primaryColor={primaryColor} />}
            {activeTab !== 'voting' && <>
            {/* Transaction success message */}
            {transactionSuccess && (
              <div style={successStyle}>
                <div>
                  <span style={{ fontWeight: '300' }}>
                    {activeTab === 'stake'
                      ? `You have successfully staked ${amount} B3TR.`
                      : `You have successfully unstaked ${amount} B3TR.`}
                  </span>
                </div>
              </div>
            )}

            {/* Minimum stake amount info message - shown when resulting balance would be below minimum */}
            {amount && (
              (activeTab === 'stake' && getFutureStakedBalance() < Constants.MINIMUM_STAKE_AMOUNT)
            ) && (
                <div style={infoStyle}>
                  <div>
                    <span style={{ fontWeight: '300' }}>A minimum of </span>
                    <span style={{ fontWeight: '600' }}>{Constants.MINIMUM_STAKE_AMOUNT} B3TR</span>
                    <span style={{ fontWeight: '300' }}> {activeTab === 'stake' ? 'is required to start staking' : 'must remain staked to keep earning'}.</span>
                  </div>
                </div>
              )}

            <div style={inputContainerStyle}>
              <input
                type="number"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0"
                style={inputStyle}
              />
            </div>

            <div style={balanceStyle}>
              <span>Balance: {activeTab === 'stake' ? accountBalance.b3trAsNumber : balance.convertedB3trAsNumber}</span>
              <span style={b3trLogoStyle}>
                <img
                  src="https://vechain.github.io/token-registry/assets/5a9eb5e11751a649ca00298f3237c4624712af75.png"
                  alt="B3TR Token"
                  width="24"
                  height="24"
                />
              </span>
            </div>

            <div style={percentageContainerStyle}>
              <button
                style={calculatePercentageButtonStyle(25)}
                onClick={() => handlePercentageClick(25)}
                disabled={activeTab === 'stake' ? accountBalance.b3trAsNumber <= 0 : balance.convertedB3trAsNumber <= 0}
              >
                25%
              </button>
              <button
                style={calculatePercentageButtonStyle(50)}
                onClick={() => handlePercentageClick(50)}
                disabled={activeTab === 'stake' ? accountBalance.b3trAsNumber <= 0 : balance.convertedB3trAsNumber <= 0}
              >
                50%
              </button>
              <button
                style={calculatePercentageButtonStyle(75)}
                onClick={() => handlePercentageClick(75)}
                disabled={activeTab === 'stake' ? accountBalance.b3trAsNumber <= 0 : balance.convertedB3trAsNumber <= 0}
              >
                75%
              </button>
              <button
                style={calculatePercentageButtonStyle(100)}
                onClick={() => handlePercentageClick(100)}
                disabled={activeTab === 'stake' ? accountBalance.b3trAsNumber <= 0 : balance.convertedB3trAsNumber <= 0}
              >
                100%
              </button>
            </div>

            {/* Warning about unstaking below minimum */}
            {willUnstakeBelowMinimum() && (
              <div style={warningStyle}>
                <div>
                  <span style={{ fontWeight: '300' }}>Unstaking this amount will leave you with less than </span>
                  <span style={{ fontWeight: '600' }}>{Constants.MINIMUM_STAKE_AMOUNT} B3TR</span>
                  <span style={{ fontWeight: '300' }}> staked. No further rewards will be generated.</span>
                </div>
              </div>
            )}

            {error && (
              <div style={errorStyle}>
                {error}
              </div>
            )}

            <button
              className={`btn-primary ${isStakeButtonDisabled() ? 'disabled' : ''}`}
              onClick={handleStakeAction}
              disabled={isStakeButtonDisabled()}
              style={actionButtonStyle}
            >
              {isLoading
                ? (activeTab === 'stake' ? 'Staking...' : 'Unstaking...')
                : activeTab === 'stake'
                  ? 'Stake'
                  : 'Unstake'
              }
            </button>

            {/* Warning about not being able to vote manually */}
            {activeTab === 'stake' && (
              <div style={finelineStyle}>
                <div>
                  <span style={{ fontWeight: '300' }}>When staking, you </span>
                  <span style={{ fontWeight: '600' }}>won't be able to manually vote</span>
                  <span style={{ fontWeight: '300' }}> on VeBetterDAO as the staking wallet will do it for you.</span>
                  <span style={{ fontWeight: '300' }}> Your new deposit will earn rewards starting on {getNextMonday().toISOString().slice(0, 10)}. Rewards will be claimable after {getNextMondayAfterNextMonday().toISOString().slice(0, 10)}.</span>
                </div>
              </div>
            )}

            </>}
            <div style={footerStyle}>
              Powered by <a href="https://vedelegate.vet" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>veDelegate.vet</a>
              <img
                src="https://vedelegate.vet/logo.svg"
                alt="veDelegate Logo"
                style={logoStyle}
              />
            </div>
          </div>
        </div>
      </div>
    </>,
    modalRoot
  );
} 