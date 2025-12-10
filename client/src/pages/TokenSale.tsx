import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Wallet, TrendingUp, Users, Clock, CheckCircle2, XCircle, LogOut, ChevronDown } from 'lucide-react';
import TokenSaleABI from '../abi/TokenSaleContract.json';
import { TOKEN_SALE_CONTRACT_ADDRESS, USDT_ADDRESS, TOKEN_PRICE_USD } from '../web-utils/constants';

interface SaleInfo {
  totalSold: string;
  maxTokens: string;
  minPurchase: string;
  tokenPrice: string;
  bnbPrice: string;
}

interface Transaction {
  hash: string;
  buyer: string;
  amount: string;
  paymentMethod: 'BNB' | 'USDT';
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
}

export default function TokenSale() {
  const [account, setAccount] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [tokenAmount, setTokenAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'BNB' | 'USDT'>('BNB');
  const [isLoading, setIsLoading] = useState(false);
  const [saleInfo, setSaleInfo] = useState<SaleInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bnbBalance, setBnbBalance] = useState('0');
  const [usdtBalance, setUsdtBalance] = useState('0');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [liveBnbPrice, setLiveBnbPrice] = useState<number>(0);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Fetch BNB price from CoinGecko
  const fetchBnbPrice = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd');
      if (!response.ok) throw new Error('API error');
      
      const data = await response.json();
      
      // Validate price data
      if (data.binancecoin?.usd && data.binancecoin.usd > 0) {
        setLiveBnbPrice(data.binancecoin.usd);
      } else {
        throw new Error('Invalid price data');
      }
    } catch (error) {
      console.error('Error fetching BNB price:', error);
      // Use fallback from contract if available, otherwise use default
      if (saleInfo?.bnbPrice && parseFloat(saleInfo.bnbPrice) > 0) {
        setLiveBnbPrice(parseFloat(saleInfo.bnbPrice));
      } else {
        setLiveBnbPrice(650);
      }
    }
  };

  // Fetch BNB price on mount and every 30 seconds
  useEffect(() => {
    fetchBnbPrice();
    const interval = setInterval(fetchBnbPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen for account and network changes
  useEffect(() => {
    if (window.ethereum) {
      // Account change listener
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const provider = new ethers.BrowserProvider(window.ethereum!);
          await fetchBalances(accounts[0], provider);
          await fetchSaleInfo(provider);
        } else {
          // User disconnected wallet
          setAccount('');
          setBnbBalance('0');
          setUsdtBalance('0');
          setSaleInfo(null);
        }
      };
      
      // Network change listener
      const handleChainChanged = () => {
        window.location.reload();
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  // Show wallet selection modal
  const showWalletSelection = () => {
    setShowWalletModal(true);
  };

  // Connect wallet with specific provider
  const connectWallet = async (walletType: 'metamask' | 'trustwallet' | 'rabby' | 'okx' | 'safepal' | 'binance' = 'metamask') => {
    setShowWalletModal(false);
    
    // Block Phantom wallet
    if ((window as any).phantom?.ethereum) {
      toast.error('Phantom wallet is not supported. Please use MetaMask, Rabby, OKX, SafePal, Binance Web3, or Trust Wallet.');
      return;
    }
    
    if (!window.ethereum) {
      toast.error('Please install a Web3 wallet!');
      return;
    }

    try {
      setIsConnecting(true);
      
      // Check and switch to BSC network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== '0x38') { // BSC Mainnet: 0x38 (56 decimal)
        toast.error('Switching to Binance Smart Chain...');
        
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x38' }],
          });
        } catch (switchError: any) {
          // If network not added, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x38',
                chainName: 'Binance Smart Chain Mainnet',
                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com/']
              }]
            });
          } else {
            throw switchError;
          }
        }
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Request accounts - this will open wallet popup to select account
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      setAccount(accounts[0]);
      toast.success('Wallet connected!');
      
      // Fetch balances
      await fetchBalances(accounts[0], provider);
      
      // Fetch sale info
      await fetchSaleInfo(provider);
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = async () => {
    try {
      // Clear local state
      setAccount('');
      setTokenAmount('');
      setBnbBalance('0');
      setUsdtBalance('0');
      setSaleInfo(null);
      setTransactions([]);
      
      // Request MetaMask to disconnect (revoke permissions)
      // This allows user to select different account on next connect
      if (window.ethereum && window.ethereum.request) {
        try {
          await window.ethereum.request({
            method: 'wallet_revokePermissions',
            params: [{
              eth_accounts: {},
            }],
          });
        } catch (revokeError) {
          // wallet_revokePermissions might not be supported in older MetaMask versions
          // Fallback: just clear local state (already done above)
          console.log('Permission revoke not supported, using fallback');
        }
      }
      
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.success('Wallet disconnected');
    }
  };

  // Fetch balances
  const fetchBalances = async (address: string, provider: ethers.BrowserProvider) => {
    try {
      const bnb = await provider.getBalance(address);
      setBnbBalance(ethers.formatEther(bnb));

      const usdtContract = new ethers.Contract(
        USDT_ADDRESS,
        ['function balanceOf(address) view returns (uint256)'],
        provider
      );
      const usdt = await usdtContract.balanceOf(address);
      setUsdtBalance(ethers.formatUnits(usdt, 18));
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  // Fetch sale info from contract
  const fetchSaleInfo = async (provider: ethers.BrowserProvider) => {
    try {
      const contract = new ethers.Contract(
        TOKEN_SALE_CONTRACT_ADDRESS,
        TokenSaleABI,
        provider
      );

      const [totalSold, maxTokens, minPurchase, tokenPrice, bnbPrice] = await Promise.all([
        contract.totalSold(),
        contract.maxTokens(),
        contract.minPurchase(),
        contract.tokenPrice(),
        contract.bnbPrice(),
      ]);

      setSaleInfo({
        totalSold: ethers.formatUnits(totalSold, 18),
        maxTokens: ethers.formatUnits(maxTokens, 18),
        minPurchase: ethers.formatUnits(minPurchase, 18),
        tokenPrice: ethers.formatUnits(tokenPrice, 6),
        bnbPrice: ethers.formatUnits(bnbPrice, 6),
      });
    } catch (error) {
      console.error('Error fetching sale info:', error);
    }
  };

  // Calculate cost based on token amount
  const calculateCost = () => {
    if (!tokenAmount) return '0';
    
    const tokens = parseFloat(tokenAmount);
    if (isNaN(tokens) || tokens <= 0) return '0';
    
    // Use token price from constants or contract
    const price = saleInfo ? parseFloat(saleInfo.tokenPrice) : TOKEN_PRICE_USD;
    
    if (paymentMethod === 'BNB') {
      // Use live BNB price from CoinGecko
      if (liveBnbPrice <= 0) return '0';
      const costInBnb = (tokens * price) / liveBnbPrice;
      return costInBnb.toFixed(6);
    } else {
      const costInUsdt = tokens * price;
      return costInUsdt.toFixed(2);
    }
  };

  // Handle purchase
  const handlePurchase = async () => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (!tokenAmount) {
      toast.error('Please enter token amount');
      return;
    }

    const tokens = parseFloat(tokenAmount);
    const minPurchase = saleInfo ? parseFloat(saleInfo.minPurchase) : 250;

    if (tokens < minPurchase) {
      toast.error(`Minimum purchase is ${minPurchase} tokens`);
      return;
    }

    try {
      setIsLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        TOKEN_SALE_CONTRACT_ADDRESS,
        TokenSaleABI,
        signer
      );

      let tx;
      const tokenAmountWei = ethers.parseUnits(tokenAmount, 18);

      if (paymentMethod === 'BNB') {
        // Get exact BNB amount needed from contract
        const bnbNeeded = await contract.getBNBForTokens(tokenAmountWei);
        
        toast.info(`Purchasing ${tokenAmount} EXN for ${ethers.formatEther(bnbNeeded)} BNB...`);
        
        // buyWithBNB() doesn't take parameters - it calculates tokens from BNB sent
        tx = await contract.buyWithBNB({ value: bnbNeeded });
      } else {
        // USDT purchase
        const usdtContract = new ethers.Contract(
          USDT_ADDRESS,
          ['function approve(address spender, uint256 amount) returns (bool)', 'function balanceOf(address) view returns (uint256)'],
          signer
        );
        
        const costInUsdt = calculateCost();
        const usdtAmountWei = ethers.parseUnits(costInUsdt, 18);
        
        // Check USDT balance
        const usdtBalance = await usdtContract.balanceOf(account);
        if (usdtBalance < usdtAmountWei) {
          toast.error(`Insufficient USDT balance. You need ${costInUsdt} USDT (Tether USD on BSC, not USDC).`);
          return;
        }
        
        toast.info('Approving USDT (Tether USD)...');
        const approveTx = await usdtContract.approve(TOKEN_SALE_CONTRACT_ADDRESS, usdtAmountWei);
        await approveTx.wait();
        
        toast.info('Purchasing tokens with USDT...');
        // buyWithUSDC takes USDT amount (contract method name is historical)
        tx = await contract.buyTokens(usdtAmountWei);
      }

      // Add to transactions
      setTransactions(prev => [{
        hash: tx.hash,
        buyer: account,
        amount: tokenAmount,
        paymentMethod,
        timestamp: Date.now(),
        status: 'pending'
      }, ...prev]);

      toast.info('Transaction submitted...');

      // Wait for confirmation
      const receipt = await tx.wait();
      
      // Update transaction status
      setTransactions(prev =>
        prev.map(t =>
          t.hash === tx.hash ? { ...t, status: receipt.status === 1 ? 'success' : 'failed' } : t
        )
      );

      if (receipt.status === 1) {
        toast.success('Purchase successful!');
        setTokenAmount('');
        
        // Refresh data
        await fetchBalances(account, provider);
        await fetchSaleInfo(provider);
      } else {
        toast.error('Transaction failed');
      }
    } catch (error: any) {
      console.error('Error purchasing tokens:', error);
      toast.error(error.message || 'Failed to purchase tokens');
      
      // Update last transaction as failed
      setTransactions(prev =>
        prev.map((t, i) => (i === 0 ? { ...t, status: 'failed' } : t))
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate progress percentage
  const getProgress = () => {
    if (!saleInfo) return 0;
    const sold = parseFloat(saleInfo.totalSold);
    const max = parseFloat(saleInfo.maxTokens);
    return (sold / max) * 100;
  };

  // Format number with commas
  const formatNumber = (num: string) => {
    return parseFloat(num).toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  // Format address
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Auto-connect on load
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const provider = new ethers.BrowserProvider(window.ethereum!);
          fetchBalances(accounts[0], provider);
          fetchSaleInfo(provider);
        }
      });
    }
  }, []);

  const faqItems = [
    {
      question: "What is the EXN Token Sale?",
      answer: "The EXN Token Sale is the initial offering of Expoin's native token (EXN) to early supporters and investors. EXN powers the Expoin ecosystem, a multi-chain DEX and wallet platform connecting over 50 cross-chain bridges."
    },
    {
      question: "What is Expoin?",
      answer: "Expoin is a comprehensive crypto platform featuring a multi-chain wallet and DEX (decentralized exchange). We support 99% of blockchains and tokens, enabling truly cross-chain trading with atomic swaps technology. Our platform provides secure, decentralized, and non-custodial asset management."
    },
    {
      question: "Which network should I use?",
      answer: "The token sale operates on Binance Smart Chain (BSC) mainnet. Make sure your wallet is connected to BSC network (Chain ID: 56) before purchasing."
    },
    {
      question: "What payment methods are accepted?",
      answer: "We accept BNB (Binance Coin) and USDT (Tether) on the BSC network. You can switch between payment methods using the tabs in the purchase form."
    },
    {
      question: "How do I participate in the token sale?",
      answer: "1) Connect your MetaMask or compatible Web3 wallet, 2) Ensure you're on BSC network, 3) Choose your payment method (BNB or USDT), 4) Enter the amount of EXN tokens you want to purchase (minimum 250 tokens), 5) Click 'Purchase' and confirm the transaction in your wallet."
    },
    {
      question: "What is the current token price?",
      answer: "The current price is $0.025 per EXN token. This represents the best value for early supporters."
    },
    {
      question: "What is the minimum purchase amount?",
      answer: "The minimum purchase amount is 250 EXN tokens. This ensures meaningful participation while keeping the sale accessible to a wide range of supporters."
    },
    {
      question: "Is there a vesting period?",
      answer: "Purchased tokens have a 12-month lockup period followed by 18-month linear vesting. This means tokens will be locked for 1 year, then gradually released over the next 18 months to ensure long-term alignment."
    },
    {
      question: "Is there a whitelist?",
      answer: "No whitelist is required. The sale is open to all participants on a first-come, first-served basis until the allocation is sold out."
    },
    {
      question: "When will I receive my tokens?",
      answer: "Tokens are minted immediately upon purchase, but will be subject to the vesting schedule. You'll be able to claim your vested tokens according to the release schedule through our token dashboard (coming soon)."
    },
    {
      question: "Where can I trade EXN tokens after purchase?",
      answer: "EXN tokens will be listed on major DEXs and CEXs following the public sale rounds. Trading will begin after the Launchpad round concludes. Announcements will be made on our official channels."
    },
    {
      question: "What are the risks?",
      answer: "Cryptocurrency investments carry inherent risks including price volatility, regulatory changes, and technology risks. The token sale is subject to our terms and conditions. Please only invest what you can afford to lose and conduct your own research (DYOR) before participating."
    }
  ];

  return (
    <div className="min-h-screen" style={{ background: '#E8E4F3' }}>
      {/* Header */}
      <header className="border-b bg-white/60 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="/expoin-logo.svg" alt="Expoin" className="h-8" />
            <div className="hidden md:block">
              <p className="text-sm text-gray-600 italic">All Your Crypto. One Reliable Tool.</p>
            </div>
          </div>
          
          {account ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end">
                <p className="text-sm font-medium text-gray-900">{formatAddress(account)}</p>
                <p className="text-xs text-gray-500">{parseFloat(bnbBalance).toFixed(4)} BNB</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00D9FF 0%, #6B5DD3 100%)' }}>
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <Button 
                onClick={disconnectWallet} 
                variant="outline" 
                size="sm"
                className="rounded-full border-2 hover:bg-gray-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </div>
          ) : (
            <Button 
              onClick={showWalletSelection} 
              disabled={isConnecting} 
              size="lg"
              className="rounded-full text-white font-semibold px-8"
              style={{ background: '#000000' }}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </>
              )}
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
            EXN Token Sale
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join the future of cross-chain trading. Get EXN tokens now.
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-4xl mx-auto">
          <div className="rounded-3xl shadow-lg overflow-hidden p-6" style={{ background: 'linear-gradient(135deg, #00D9FF 0%, #6B5DD3 100%)' }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-white/80" />
              <p className="text-sm font-medium text-white/80">Total Sold</p>
            </div>
            <p className="text-4xl font-bold text-white">
              {saleInfo ? formatNumber(saleInfo.totalSold) : '0'}
            </p>
            <p className="text-sm text-white/80 mt-1">EXN Tokens</p>
          </div>

          <div className="rounded-3xl shadow-lg overflow-hidden p-6" style={{ background: 'linear-gradient(135deg, #6B5DD3 0%, #9D8FE8 100%)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-white/80" />
              <p className="text-sm font-medium text-white/80">Token Price</p>
            </div>
            <p className="text-4xl font-bold text-white">
              ${saleInfo ? parseFloat(saleInfo.tokenPrice).toFixed(4) : '0.0250'}
            </p>
            <p className="text-sm text-white/80 mt-1">per EXN</p>
          </div>
        </div>

        {/* Progress Bar */}
        {saleInfo && (
          <Card className="mb-12 max-w-4xl mx-auto rounded-3xl border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Sale Progress</CardTitle>
              <CardDescription className="text-base">
                {formatNumber(saleInfo.totalSold)} / {formatNumber(saleInfo.maxTokens)} tokens sold
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={getProgress()} className="h-4 rounded-full" />
              <p className="text-sm text-gray-600 mt-3 text-center font-medium">
                {getProgress().toFixed(2)}% Complete
              </p>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Purchase Card */}
          <div className="lg:col-span-2">
            <Card className="rounded-3xl border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl">Purchase Tokens</CardTitle>
                <CardDescription className="text-base">
                  Buy EXN tokens using BNB or USDT on BSC network
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'BNB' | 'USDT')}>
                  <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1 h-auto">
                    <TabsTrigger value="BNB" className="rounded-xl py-3 text-base font-medium">Pay with BNB</TabsTrigger>
                    <TabsTrigger value="USDT" className="rounded-xl py-3 text-base font-medium">Pay with USDT (Tether)</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="BNB" className="space-y-4 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="token-amount" className="text-base font-medium">Token Amount</Label>
                      <Input
                        id="token-amount"
                        type="number"
                        placeholder={`Min: ${saleInfo?.minPurchase || '250'}`}
                        value={tokenAmount}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value && parseFloat(value) > 1000000) {
                            toast.error('Maximum purchase is 1,000,000 tokens');
                            return;
                          }
                          setTokenAmount(value);
                        }}
                        min="250"
                        disabled={!account}
                        className="rounded-2xl h-12 text-base"
                      />
                      <p className="text-sm text-gray-600">
                        Available: {parseFloat(bnbBalance).toFixed(4)} BNB
                      </p>
                    </div>

                    {tokenAmount && (
                      <div className="p-5 rounded-2xl space-y-3" style={{ background: '#F3F4F6' }}>
                        <div className="flex justify-between text-base">
                          <span className="text-gray-600">You pay:</span>
                          <span className="font-bold text-gray-900">{calculateCost()} BNB</span>
                        </div>
                        <div className="flex justify-between text-base">
                          <span className="text-gray-600">You receive:</span>
                          <span className="font-bold text-gray-900">{formatNumber(tokenAmount)} EXN</span>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="USDT" className="space-y-4 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="token-amount-usdt" className="text-base font-medium">Token Amount</Label>
                      <Input
                        id="token-amount-usdt"
                        type="number"
                        placeholder={`Min: ${saleInfo?.minPurchase || '250'}`}
                        value={tokenAmount}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value && parseFloat(value) > 1000000) {
                            toast.error('Maximum purchase is 1,000,000 tokens');
                            return;
                          }
                          setTokenAmount(value);
                        }}
                        min="250"
                        disabled={!account}
                        className="rounded-2xl h-12 text-base"
                      />
                      <p className="text-sm text-gray-600">
                        Available: {parseFloat(usdtBalance).toFixed(2)} USDT
                      </p>
                    </div>

                    {tokenAmount && (
                      <div className="p-5 rounded-2xl space-y-3" style={{ background: '#F3F4F6' }}>
                        <div className="flex justify-between text-base">
                          <span className="text-gray-600">You pay:</span>
                          <span className="font-bold text-gray-900">{calculateCost()} USDT</span>
                        </div>
                        <div className="flex justify-between text-base">
                          <span className="text-gray-600">You receive:</span>
                          <span className="font-bold text-gray-900">{formatNumber(tokenAmount)} EXN</span>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                <Button
                  onClick={handlePurchase}
                  disabled={!account || isLoading || !tokenAmount}
                  className="w-full rounded-full h-14 text-lg font-bold text-white"
                  style={{ background: '#000000' }}
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Purchase with ${paymentMethod}`
                  )}
                </Button>

                {saleInfo && (
                  <p className="text-sm text-center text-gray-600">
                    Minimum purchase: {formatNumber(saleInfo.minPurchase)} EXN tokens
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Transaction History */}
          <div>
            <Card className="rounded-3xl border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl">Recent Transactions</CardTitle>
                <CardDescription>Your purchase history</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.slice(0, 5).map((tx) => (
                      <div
                        key={tx.hash}
                        className="flex items-center justify-between p-3 border rounded-2xl hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {formatNumber(tx.amount)} EXN
                          </p>
                          <p className="text-xs text-gray-500">
                            {tx.paymentMethod} • {new Date(tx.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          {tx.status === 'pending' && (
                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                          )}
                          {tx.status === 'success' && (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          )}
                          {tx.status === 'failed' && (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>



        {/* FAQ Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to know about the EXN token sale
            </p>
          </div>
          
          <Card className="rounded-3xl border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="space-y-2">
                {faqItems.map((item, index) => (
                  <Collapsible
                    key={index}
                    open={openFaqIndex === index}
                    onOpenChange={(open) => setOpenFaqIndex(open ? index : null)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer border border-gray-200">
                        <h3 className="text-left font-semibold text-gray-900 text-base">
                          {item.question}
                        </h3>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-500 transition-transform ${
                            openFaqIndex === index ? 'transform rotate-180' : ''
                          }`}
                        />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 pt-2 text-gray-600 text-base leading-relaxed">
                        {item.answer}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-600 pb-8">
          <p className="text-sm">
            © 2024 Expoin. All rights reserved. |{' '}
            <a href="https://expoin.io" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 underline">
              expoin.io
            </a>
          </p>
        </footer>
      </main>

      {/* Wallet Selection Modal */}
      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Connect Wallet</DialogTitle>
            <DialogDescription>
              Choose your preferred wallet to connect
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {/* MetaMask */}
            <Button
              onClick={() => connectWallet('metamask')}
              variant="outline"
              className="w-full h-16 justify-start text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <div className="font-semibold">MetaMask</div>
                  <div className="text-sm text-gray-500">Connect with MetaMask</div>
                </div>
              </div>
            </Button>

            {/* Rabby */}
            <Button
              onClick={() => connectWallet('rabby')}
              variant="outline"
              className="w-full h-16 justify-start text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold">Rabby</div>
                  <div className="text-sm text-gray-500">Connect with Rabby Wallet</div>
                </div>
              </div>
            </Button>

            {/* OKX */}
            <Button
              onClick={() => connectWallet('okx')}
              variant="outline"
              className="w-full h-16 justify-start text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-semibold">OKX Wallet</div>
                  <div className="text-sm text-gray-500">Connect with OKX Wallet</div>
                </div>
              </div>
            </Button>

            {/* SafePal */}
            <Button
              onClick={() => connectWallet('safepal')}
              variant="outline"
              className="w-full h-16 justify-start text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="font-semibold">SafePal</div>
                  <div className="text-sm text-gray-500">Connect with SafePal Wallet</div>
                </div>
              </div>
            </Button>

            {/* Binance Web3 */}
            <Button
              onClick={() => connectWallet('binance')}
              variant="outline"
              className="w-full h-16 justify-start text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <div className="font-semibold">Binance Web3 Wallet</div>
                  <div className="text-sm text-gray-500">Connect with Binance Web3</div>
                </div>
              </div>
            </Button>

            {/* Trust Wallet */}
            <Button
              onClick={() => connectWallet('trustwallet')}
              variant="outline"
              className="w-full h-16 justify-start text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold">Trust Wallet</div>
                  <div className="text-sm text-gray-500">Connect with Trust Wallet</div>
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
