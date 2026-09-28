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
### Voting preferences

After the first stake, the modal includes a **Voting** tab. The first stake still
sets 100% for the configured app. Existing preferences are read from
`VeDelegateVotes.getVotes` and are never replaced by this preset automatically.
An empty on-chain preference is shown as empty.

The app list uses `X2EarnApps.allEligibleApps()` and `app(appId)` through the
configured Thor client; no Graph or metadata endpoint is used for voting.
Eligibility refers to the registry's current eligibility for upcoming rounds.
Saved allocations to ineligible apps remain visible and must be moved before
saving. Names unavailable from the registry fall back to the app ID.

Users enter whole percentages totaling 100%; the `%` suffix is inside each
field. **100% for this app** changes only the draft. **Save votes** rechecks
eligibility, requests the wallet transaction, waits for a successful receipt,
and reloads the preference. Zero allocations are omitted. Failed reads,
rejected signatures, reverts, and confirmation timeouts do not report success.

`VeDelegateState` additionally exposes `votesLoading`, `votesError`, and
`refreshVotes(): Promise<void>`. The vote clause builder rejects duplicate app
IDs, invalid percentages, and totals other than 100%.

### Verification

Use a current Node.js version supported by Vite/Vitest (Node 22.13+ or 24+).
Run `npm test`, `npm run typecheck`, and `npm run build`.

For a local browser fixture, run
`npx vite --config tests/browser/vite.config.mts` and open
`http://127.0.0.1:4173/tests/browser/index.html`.
It renders the real provider, modal, editor and clause builder with in-memory
chain and wallet adapters. No real transaction can be sent. Query parameters
`mode=light`, `empty`, `error`, `reject`, and `revert` exercise alternate states.
