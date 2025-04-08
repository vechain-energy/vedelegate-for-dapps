# veDelegate Module

A React module for integrating VeBetter DAO staking and delegation capabilities into web applications.

## Overview

The veDelegate module provides components for staking and unstaking B3TR tokens, voting for platform apps, and viewing rewards. It offers a lightweight button-based interface that opens a modal dialog for managing token operations.

## Components

### VeDelegateButtonWrapper

The main entry point component that provides a button-based interface for staking/unstaking tokens.

```tsx
import VeDelegateButtonWrapper from "~/modules/veDelegate/ButtonWrapper";

// Example usage
<VeDelegateButtonWrapper 
  mode="light" 
  primaryColor="#dc2626" 
  appId="0x9bc95bbe51b41d526e45466b32a95c2f170a79e74fe31a5782762f7a545e567a" 
/>
```

#### Props

| Prop | Type | Description | Default |
|------|------|-------------|---------|
| `className` | `string?` | Optional CSS class to apply to the component | `undefined` |
| `mode` | `'dark' \| 'light'` | Theme mode for the component | `'dark'` |
| `primaryColor` | `string` | Primary color for buttons and highlights | `'#ea580c'` |
| `appId` | `string` | App ID for delegation | `'0x9bc95bbe51b41d526e45466b32a95c2f170a79e74fe31a5782762f7a545e567a'` |

### VeDelegateProvider

Context provider that manages state and connects to blockchain.

```tsx
import { VeDelegateProvider } from "~/modules/veDelegate/components/VeDelegateProvider";

// Example usage
<VeDelegateProvider appId="0x9bc95bbe51b41d526e45466b32a95c2f170a79e74fe31a5782762f7a545e567a">
  {/* Child components */}
</VeDelegateProvider>
```

#### Props

| Prop | Type | Description | Default |
|------|------|-------------|---------|
| `children` | `React.ReactNode` | Child components | Required |
| `theme` | `VeDelegateTheme` | Theme object | `defaultTheme` |
| `appId` | `string` | App ID for delegation | Required |

### VeDelegateButton

Button component that opens the staking modal.

```tsx
import { VeDelegateButton } from "~/modules/veDelegate/components/VeDelegateButton";

// Example usage (should be used within a VeDelegateProvider)
<VeDelegateButton 
  mode="light" 
  primaryColor="#dc2626" 
/>
```

#### Props

| Prop | Type | Description | Default |
|------|------|-------------|---------|
| `className` | `string?` | Optional CSS class to apply to the component | `undefined` |
| `mode` | `'dark' \| 'light'` | Theme mode for the component | `'dark'` |
| `primaryColor` | `string` | Primary color for buttons and highlights | `'#ea580c'` |

### VeDelegateModal

Modal component for staking/unstaking operations.

```tsx
import { VeDelegateModal } from "~/modules/veDelegate/components/VeDelegateModal";

// Example usage (should be used within a VeDelegateProvider)
<VeDelegateModal 
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  mode="light"
  primaryColor="#dc2626"
/>
```

#### Props

| Prop | Type | Description | Default |
|------|------|-------------|---------|
| `isOpen` | `boolean` | Whether the modal is open | Required |
| `onClose` | `() => void` | Function to close the modal | Required |
| `mode` | `'dark' \| 'light'` | Theme mode for the component | `'dark'` |
| `primaryColor` | `string` | Primary color for buttons and highlights | `'#ea580c'` |

## Hooks

### useVeDelegate

Core hook that connects to the VeChain blockchain to manage staking operations.

```tsx
import { useVeDelegate } from "~/modules/veDelegate/hooks/useVeDelegate";

// Example usage
const veDelegateState = useVeDelegate(appId);
```

#### Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `appId` | `string` | App ID for delegation | Required |

#### Returns

Returns a `VeDelegateState` object containing:
- Account info and balances
- Token staking functions
- Vote preferences
- Rewards information

### useVeDelegateContext

Hook to access the veDelegate context within child components.

```tsx
import { useVeDelegateContext } from "~/modules/veDelegate/components/VeDelegateProvider";

// Example usage
const { veDelegateState, theme } = useVeDelegateContext();
```

## Configuration

Configuration is managed in `config.ts`:

- `Addresses`: Contract addresses for veDelegate, B3TR, VOT3, etc.
- `Constants`: Configuration values like minimum stake amount
- `GRAPH_URL`: Subgraph URL for querying blockchain data

## Usage Example

```tsx
import VeDelegateButtonWrapper from "~/modules/veDelegate/ButtonWrapper";

function MyApp() {
  return (
    <div>
      <h1>My Staking App</h1>
      <VeDelegateButtonWrapper 
        mode="light"
        primaryColor="#3b82f6"
        appId="0x9bc95bbe51b41d526e45466b32a95c2f170a79e74fe31a5782762f7a545e567a"
      />
    </div>
  );
}
```

## Theme Customization

The module supports both light and dark themes, as well as custom primary colors for buttons and UI elements.

## Dependencies

- React
- @vechain/dapp-kit-react for blockchain connectivity 