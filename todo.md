# Token Sale Page TODO

## Core Features
- [x] Wallet connection integration (MetaMask, WalletConnect)
- [x] Token sale page component with BNB/USDC payment options
- [x] Token purchase logic (1 cent per token)
- [x] Payment receiver wallet integration (0xf1829111dce451f62a3f0267bc1ed05328c03360)
- [ ] Smart contract interaction for token transfer
- [x] Price display and calculation
- [x] Transaction confirmation and status tracking

## UI/UX
- [x] Landing page design
- [x] Token sale card component
- [x] Payment method selection
- [x] Amount input and validation
- [x] Purchase button with loading states
- [x] Transaction status modal
- [x] Error handling and user feedback

## Smart Contract Integration
- [x] Token ABI integration (0xBfF629448eE52e8AfB6dAEe47b64838228Bc5667)
- [x] BNB payment handling
- [ ] USDC BEP20 payment handling (requires WalletConnect project ID)
- [ ] Approval flow for USDC
- [ ] Token transfer execution

## Testing & Deployment
- [ ] Test wallet connection
- [ ] Test token purchase flow
- [ ] Test payment processing
- [ ] Verify receiver wallet receives payments

## Smart Contract Integration (Contract: 0x0E49B6754Ec429D76284CED3925959dEb1FADF24)
- [x] Update contract address in frontend configuration
- [x] Add contract ABI to frontend
- [x] Update TokenSale page to use smart contract functions
- [x] Implement buyWithBNB function call
- [x] Implement buyWithUSDC function call with approval flow
- [x] Add getSaleInfo function to display sale statistics
- [x] Update price calculation to use contract functions
- [x] Test contract integration on dev server
- [ ] Deploy updated frontend to VPS
- [ ] Add contract as admin to token contract (CRITICAL - see IMPORTANT_NEXT_STEPS.md)


## UI Redesign
- [x] Remove landing page (Home.tsx)
- [x] Make TokenSale page the main route (/)
- [x] Add transaction history display
- [x] Add sales statistics (total sold, remaining, progress bar)
- [x] Add real-time sale info from contract
- [x] Improve visual design with better layout
- [x] Add purchase history for connected wallet
- [x] Add loading states and animations

## Bug Fixes
- [x] Fix /token-sale route 404 error - added route to App.tsx
