import Web3 from 'web3';
import constants from './constants';

/**
 * Purchase tokens with BNB
 */
export async function purchaseWithBNB(
  userAddress: string,
  tokenAmount: number,
  provider: any
): Promise<boolean> {
  if (!provider) {
    console.error('Provider not available');
    return false;
  }

  try {
    const web3 = new Web3(provider);
    const bnbAmount = web3.utils.toWei((tokenAmount * constants.tokenPrice).toString(), 'ether');

    // Send BNB to receiver wallet
    const tx = {
      from: userAddress,
      to: constants.receiverWallet,
      value: bnbAmount,
      gas: 21000,
    };

    const receipt = await web3.eth.sendTransaction(tx);
    console.log('BNB transaction successful:', receipt);

    // Transfer tokens to user
    await transferTokens(userAddress, tokenAmount, provider);

    return true;
  } catch (error) {
    console.error('Error purchasing with BNB:', error);
    return false;
  }
}

/**
 * Purchase tokens with USDC
 */
export async function purchaseWithUSDC(
  userAddress: string,
  tokenAmount: number,
  provider: any
): Promise<boolean> {
  if (!provider) {
    console.error('Provider not available');
    return false;
  }

  try {
    const web3 = new Web3(provider);
    const usdcAmount = web3.utils.toWei((tokenAmount * constants.tokenPrice).toString(), 'mwei'); // USDC has 6 decimals

    // First, approve USDC transfer
    const approvalSuccess = await approveUSDC(userAddress, usdcAmount, provider);
    if (!approvalSuccess) {
      console.error('USDC approval failed');
      return false;
    }

    // Transfer USDC to receiver wallet
    const usdcContract = new web3.eth.Contract(
      JSON.parse(JSON.stringify(constants.abiToken.data)),
      constants.usdcAddress
    );

    await usdcContract.methods
      .transfer(constants.receiverWallet, usdcAmount)
      .send({ from: userAddress });

    console.log('USDC transfer successful');

    // Transfer tokens to user
    await transferTokens(userAddress, tokenAmount, provider);

    return true;
  } catch (error) {
    console.error('Error purchasing with USDC:', error);
    return false;
  }
}

/**
 * Approve USDC spending
 */
export async function approveUSDC(
  userAddress: string,
  amount: string,
  provider: any
): Promise<boolean> {
  if (!provider) {
    console.error('Provider not available');
    return false;
  }

  try {
    const web3 = new Web3(provider);
    const usdcContract = new web3.eth.Contract(
      JSON.parse(JSON.stringify(constants.abiToken.data)),
      constants.usdcAddress
    );

    await usdcContract.methods
      .approve(constants.receiverWallet, amount)
      .send({ from: userAddress });

    console.log('USDC approval successful');
    return true;
  } catch (error) {
    console.error('Error approving USDC:', error);
    return false;
  }
}

/**
 * Transfer tokens to user
 */
export async function transferTokens(
  userAddress: string,
  tokenAmount: number,
  provider: any
): Promise<boolean> {
  if (!provider) {
    console.error('Provider not available');
    return false;
  }

  try {
    const web3 = new Web3(provider);
    const tokenContract = new web3.eth.Contract(
      JSON.parse(JSON.stringify(constants.abiToken.data)),
      constants.tokenAddress
    );

    // Get token decimals
    const decimals = await tokenContract.methods.decimals().call();
    const amount = web3.utils.toWei(tokenAmount.toString(), 'ether');

    // Note: This assumes the contract owner has approved the transfer
    // In production, you would need proper authorization
    await tokenContract.methods
      .transfer(userAddress, amount)
      .send({ from: constants.receiverWallet });

    console.log('Token transfer successful');
    return true;
  } catch (error) {
    console.error('Error transferring tokens:', error);
    return false;
  }
}

/**
 * Get token balance for user
 */
export async function getTokenBalance(userAddress: string, provider: any): Promise<number> {
  if (!provider) {
    console.error('Provider not available');
    return 0;
  }

  try {
    const web3 = new Web3(provider);
    const tokenContract = new web3.eth.Contract(
      JSON.parse(JSON.stringify(constants.abiToken.data)),
      constants.tokenAddress
    );

    const balance = await tokenContract.methods.balanceOf(userAddress).call();
    const decimals = await tokenContract.methods.decimals().call();

    return parseFloat(web3.utils.fromWei(balance, 'ether'));
  } catch (error) {
    console.error('Error getting token balance:', error);
    return 0;
  }
}

/**
 * Get BNB balance for user
 */
export async function getBNBBalance(userAddress: string, provider: any): Promise<number> {
  if (!provider) {
    console.error('Provider not available');
    return 0;
  }

  try {
    const web3 = new Web3(provider);
    const balance = await web3.eth.getBalance(userAddress);
    return parseFloat(web3.utils.fromWei(balance, 'ether'));
  } catch (error) {
    console.error('Error getting BNB balance:', error);
    return 0;
  }
}
