import { initializeConnector } from '@web3-react/core'
import { WalletConnect as WalletConnectV2 } from '@web3-react/walletconnect-v2'

export const [walletConnect, hooks] = initializeConnector<WalletConnectV2>(
  (actions) =>
    new WalletConnectV2({
      actions,
      options: {
        projectId: 'YOUR_PROJECT_ID', // Get from WalletConnect Cloud
        chains: [56], // BSC Mainnet
        optionalChains: [1, 137], // Optional: Ethereum, Polygon
        showQrModal: true,
      },
    })
)
