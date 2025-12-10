import { abi_token } from "@/abi/token_abi";

// BSC Mainnet Configuration
const baseChainId = 56;
const chainRPC = 'https://bsc-dataseed1.binance.org';

// Token Configuration
const tokenAddress = '0xBfF629448eE52e8AfB6dAEe47b64838228Bc5667';
const tokenPrice = 0.01; // 1 cent in USD
const receiverWallet = '0xf1829111dce451f62a3f0267bc1ed05328c03360';

// USDC BEP20 Configuration
const usdcAddress = '0x8AC76a51cc950d9822D68b83FE1Ad97B32Cd580d'; // USDC on BSC

const constants = {
  chainRPC,
  baseChainId,
  abiToken: abi_token,
  tokenAddress,
  tokenPrice,
  receiverWallet,
  usdcAddress,
};

export default constants;
