// Smart Contract Addresses (BSC Mainnet)
export const TOKEN_ADDRESS = "0xAcc3975ca328FedE659D291168bbEBcfE4b69437"; // EXN Token (New)
export const TOKEN_SALE_CONTRACT_ADDRESS = "0x4580ce4209023ED68b1dA14A689d51906239b641"; // TokenSaleV3 Contract
export const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955"; // USDT on BSC
export const PAYMENT_RECEIVER = "0xf1829111dce451f62a3f0267bc1ed05328c03360"; // Payment Receiver Wallet

// Chain Configuration
export const BSC_CHAIN_ID = 56; // BSC Mainnet
export const BSC_RPC_URL = "https://bsc-dataseed.binance.org/";

// Token Sale Configuration
export const TOKEN_PRICE_USD = 0.025; // $0.025 per token
export const MIN_PURCHASE_TOKENS = 40; // Minimum 40 tokens ($1)
export const MAX_PURCHASE_TOKENS = 400000; // Maximum 400,000 tokens ($10,000)
export const MAX_TOKENS_FOR_SALE = 600000000; // 600 million tokens

// BSCScan Links
export const BSCSCAN_URL = "https://bscscan.com";
export const TOKEN_BSCSCAN_URL = `${BSCSCAN_URL}/token/${TOKEN_ADDRESS}`;
export const CONTRACT_BSCSCAN_URL = `${BSCSCAN_URL}/address/${TOKEN_SALE_CONTRACT_ADDRESS}`;
