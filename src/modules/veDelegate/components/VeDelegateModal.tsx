import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useVeDelegateContext } from './VeDelegateProvider';
import { Constants } from '../config';
import { useConnex } from '@vechain/dapp-kit-react';
import { getNextMonday, getNextMondayAfterNextMonday } from '../utils';
import { useApps } from '../hooks/useApps';

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
    votePreference,
    hasVotedForPlatform,
    appId
  } = veDelegateState;
  const connex = useConnex();

  // Fetch app data for all voted apps
  const { data: appData, isLoading: appsLoading } = useApps({
    appIds: [...votePreference.appIds, appId]
  });

  // Find platform app name if available
  const getPlatformAppData = () => {
    if (appData && appId in appData) {
      return appData[appId];
    }
    return null;
  };

  const platformApp = getPlatformAppData();
  const platformAppName = platformApp && platformApp.metadata?.title
    ? platformApp.metadata.title
    : platformApp?.name || 'this platform';

  const [activeTab, setActiveTab] = useState<'stake' | 'unstake'>('stake');
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  const [voteUpdateSuccess, setVoteUpdateSuccess] = useState(false);
  const [votePercentage, setVotePercentage] = useState<number>(20);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDropdownAnimating, setIsDropdownAnimating] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Function to handle dropdown opening and closing with animation
  const toggleDropdown = (open: boolean) => {
    // If explicitly setting to a state (open or closed)
    if (typeof open === 'boolean') {
      // If trying to close
      if (!open && isDropdownOpen) {
        if (!isDropdownAnimating) {
          setIsDropdownAnimating(true);
          if (dropdownRef.current) {
            dropdownRef.current.className = 'dropdown-exit';
            setTimeout(() => {
              setIsDropdownOpen(false);
              setIsDropdownAnimating(false);
            }, 200);
          } else {
            setIsDropdownOpen(false);
            setIsDropdownAnimating(false);
          }
        }
      } 
      // If trying to open and not already open
      else if (open && !isDropdownOpen) {
        setIsDropdownOpen(true);
      }
    }
  };

  // Click handler with animation - ensure this toggles the dropdown state
  const handleDropdownClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // When clicking the button, directly toggle the dropdown state without using the toggle function
    if (isDropdownOpen) {
      // Close the dropdown
      setIsDropdownAnimating(true);
      if (dropdownRef.current) {
        dropdownRef.current.className = 'dropdown-exit';
        setTimeout(() => {
          setIsDropdownOpen(false);
          setIsDropdownAnimating(false);
        }, 200);
      } else {
        setIsDropdownOpen(false);
        setIsDropdownAnimating(false);
      }
    } else {
      // Open the dropdown
      setIsDropdownOpen(true);
    }
  };

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

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isDropdownOpen && !target.closest('.percentage-dropdown-container')) {
        toggleDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

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

  // Close dropdown when modal closes
  useEffect(() => {
    if (!isOpen) {
      toggleDropdown(false);
    }
  }, [isOpen]);

  if (!isOpen || !modalRoot) return null;

  const handleTabChange = (tab: 'stake' | 'unstake') => {
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
        if (connex && connex.vendor) {
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
          const depositTx = await connex.vendor
            .sign('tx', clauses)
            .comment('Deposit B3TR tokens')
            .request();

          if (depositTx) {
            // Wait for the transaction to be processed
            await connex.thor.ticker().next();
            setTransactionSuccess(true);
            await refetch();
          }
        } else {
          throw new Error('Connex not available');
        }
      } else {
        // Create withdraw transaction
        if (connex && connex.vendor) {
          console.log('Executing withdrawal transaction...');

          const withdrawClauses = await buildWithdrawClauses({
            b3tr: amountWei,
            vot3: 0n,
            recipient: account
          })

          if (withdrawClauses) {
            const withdrawTx = await connex.vendor
              .sign('tx', withdrawClauses)
              .comment('Withdraw B3TR tokens')
              .request();

            if (withdrawTx) {
              // Wait for the transaction to be processed
              await connex.thor.ticker().next();
              setTransactionSuccess(true);
              await refetch();
            }
          } else {
            throw new Error('Failed to create withdrawal transaction');
          }
        } else {
          throw new Error('Connex not available');
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

  // Check if the user has votes but hasn't voted for the platform
  const showPlatformVoteNotification =
    hasPool &&
    votePreference.appIds.length > 0 &&
    !hasVotedForPlatform &&
    !voteUpdateSuccess &&
    !appsLoading;

  // Option selection with animation
  const handleOptionSelect = (percent: number) => {
    setVotePercentage(percent);
    toggleDropdown(false);
    // Call the handler directly when selecting a percentage
    // Using handleAddPlatformVote directly to avoid dependency issues
    if (!account || !connex || !connex.vendor || isLoading) return;

    setIsLoading(true);
    setError(null);

    const platformPercentage = percent;
    
    // We'll handle the vote update logic here directly
    (async () => {
      try {
        // Create a new set of appIds and percentages that includes the platform app
        // Allocate the selected percentage to the platform app and distribute the remaining proportionally
        const remainingPercentage = 100 - platformPercentage;
        const totalExistingPercentage = votePreference.percentages.reduce((sum, p) => sum + p, 0);
        const newPercentages: number[] = [];
        
        // Keep existing votes but reduce them proportionally
        for (let i = 0; i < votePreference.percentages.length; i++) {
          const currentPercentage = votePreference.percentages[i];
          const newPercentage = Math.floor((currentPercentage / totalExistingPercentage) * remainingPercentage);
          newPercentages.push(newPercentage);
        }
        
        // Add the platform app with selected percentage
        const newAppIds = [...votePreference.appIds, appId];
        newPercentages.push(platformPercentage);
        
        // Ensure percentages add up to 100%
        let sum = newPercentages.reduce((a, b) => a + b, 0);
        if (sum !== 100) {
          // Adjust the last existing vote to make sum = 100
          const diff = 100 - sum;
          if (newPercentages.length > 1) {
            newPercentages[0] += diff;
          }
        }
        
        // Build and execute the transaction to update votes
        const clauses = await buildSupportClauses({
          appIds: newAppIds,
          percentages: newPercentages,
          signingCallback: undefined
        });
        
        if (!clauses || clauses.length === 0) {
          throw new Error('Failed to create vote update transaction');
        }
        
        const voteTx = await connex.vendor
          .sign('tx', clauses)
          .comment(`Vote with ${platformPercentage}% for ${platformAppName}`)
          .request();
          
        if (voteTx) {
          // Wait for the transaction to be processed
          await connex.thor.ticker().next();
          setVoteUpdateSuccess(true);
          await refetch();
        }
      } catch (err) {
        console.error('Vote update error:', err);
        setError(err instanceof Error ? err.message : 'Vote update failed');
      } finally {
        setIsLoading(false);
      }
    })();
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

  // Helper function to convert hex to rgb
  const hexToRgb = (hex: string): string => {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse the hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Return RGB format
    return `${r}, ${g}, ${b}`;
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

  // Platform notification style with theme support
  const platformNotificationStyle: React.CSSProperties = {
    backgroundColor: mode === 'dark' 
      ? `rgba(${hexToRgb(primaryColor)}, 0.08)` 
      : `rgba(${hexToRgb(primaryColor)}, 0.12)`,
    border: `1px solid ${mode === 'dark' 
      ? `rgba(${hexToRgb(primaryColor)}, 0.2)` 
      : `rgba(${hexToRgb(primaryColor)}, 0.3)`}`,
    padding: '0.75rem',
    borderRadius: '6px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    fontSize: '0.8rem',
    letterSpacing: '0.25px',
    color: mode === 'dark' ? '#e5e7eb' : '#111827',
  };

  // Vote update success notification style with theme support
  const voteUpdateSuccessStyle: React.CSSProperties = {
    backgroundColor: mode === 'dark' ? 'rgba(75, 85, 99, 0.2)' : 'rgba(75, 85, 99, 0.1)',
    border: `1px solid ${mode === 'dark' ? 'rgba(156, 163, 175, 0.5)' : 'rgba(156, 163, 175, 0.2)'}`,
    padding: '0.75rem',
    borderRadius: '6px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    fontSize: '0.8rem',
    letterSpacing: '0.25px',
    color: mode === 'dark' ? '#e5e7eb' : '#111827',
  };

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
              Stake to earn
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
            </div>

            {/* Platform Vote Notification */}
            {showPlatformVoteNotification && (
              <div style={platformNotificationStyle}>
                <div style={{ width: '100%' }}>
                  <div>
                    <span style={{ fontWeight: '500' }}>Consider voting for {platformAppName}</span>
                    <span style={{ fontWeight: '300' }}>: Voting for {platformAppName} ensures continued development and improvements and increased rewards.</span>
                  </div>
                  
                  {/* Percentage dropdown container */}
                  <div style={{ position: 'relative', marginTop: '12px', width: '100%' }} className="percentage-dropdown-container">
                    {/* Dropdown toggle button */}
                    <button
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        background: mode === 'dark' ? '#374151' : '#d1d5db', // dark: bg-gray-700, light: darker gray for better contrast
                        color: mode === 'dark' ? 'white' : '#111827',
                        border: 'none',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        fontSize: '0.75rem', // smaller text
                        textTransform: 'uppercase',
                        height: '32px', // more compact height
                        transition: 'background-color 0.2s',
                      }}
                      onClick={handleDropdownClick}
                      disabled={isLoading}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = mode === 'dark' ? '#4b5563' : '#9ca3af'; // hover styles
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = mode === 'dark' ? '#374151' : '#d1d5db'; // default styles
                      }}
                      className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
                    >
                      <span>{isLoading ? 'Updating...' : `Vote with ${votePercentage}% for ${platformAppName}`}</span>
                      <span 
                        style={{ 
                          transition: 'transform 0.2s', 
                          transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          fontSize: '0.7rem',
                          marginLeft: '8px',
                          pointerEvents: 'none' // Ensure clicks pass through to the parent button
                        }}
                      >
                        ▼
                      </span>
                    </button>
                    
                    {/* Dropdown menu */}
                    {isDropdownOpen && (
                      <div
                        ref={dropdownRef}
                        className="dropdown-enter"
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: 0,
                          width: '100%',
                          background: mode === 'dark' ? '#1f2937' : '#f9fafb', 
                          borderRadius: '6px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          zIndex: 100,
                          overflow: 'hidden',
                          border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                          transformOrigin: 'top center'
                        }}
                      >
                        {[10, 20, 50, 100].map((percent) => (
                          <div
                            key={percent}
                            style={{
                              padding: '6px 10px',
                              cursor: 'pointer',
                              borderBottom: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)',
                              background: votePercentage === percent 
                                ? (mode === 'dark' ? 'rgba(75, 85, 99, 0.4)' : 'rgba(209, 213, 219, 0.4)') 
                                : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              fontSize: '0.75rem',
                              color: mode === 'dark' ? '#e5e7eb' : '#111827',
                              fontWeight: votePercentage === percent ? 500 : 400,
                              transition: 'background-color 0.2s'
                            }}
                            onClick={() => handleOptionSelect(percent)}
                            onMouseOver={(e) => {
                              if (votePercentage !== percent) {
                                e.currentTarget.style.background = mode === 'dark' 
                                  ? 'rgba(75, 85, 99, 0.2)' 
                                  : 'rgba(209, 213, 219, 0.2)';
                              }
                            }}
                            onMouseOut={(e) => {
                              if (votePercentage !== percent) {
                                e.currentTarget.style.background = 'transparent';
                              }
                            }}
                          >
                            <span style={{ 
                              width: '14px', 
                              height: '14px', 
                              borderRadius: '50%', 
                              border: '2px solid',
                              borderColor: votePercentage === percent 
                                ? (mode === 'dark' ? '#9ca3af' : '#6b7280') 
                                : (mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'),
                              marginRight: '8px',
                              display: 'inline-flex',
                              justifyContent: 'center',
                              alignItems: 'center'
                            }}>
                              {votePercentage === percent && (
                                <span style={{ 
                                  width: '6px', 
                                  height: '6px', 
                                  borderRadius: '50%', 
                                  background: mode === 'dark' ? '#9ca3af' : '#6b7280'
                                }}></span>
                              )}
                            </span>
                            <span>
                              {percent}% of voting power
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Vote Update Success Message */}
            {voteUpdateSuccess && (
              <div style={voteUpdateSuccessStyle}>
                <div>
                  <span style={{ fontWeight: '300' }}>
                    Your vote allocation has been updated to include {platformAppName}. Thank you for your support!
                  </span>
                </div>
              </div>
            )}

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
                  src="https://vechain.github.io/token-registry/assets/3d55edb42b09a634f7f2f26756a02571de901a5b.png"
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