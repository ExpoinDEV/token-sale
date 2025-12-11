import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Wallet, TrendingUp, Clock, CheckCircle2, XCircle, LogOut, ChevronDown } from 'lucide-react';
import TokenSaleABI from '../abi/TokenSaleContract.json';
import { TOKEN_SALE_CONTRACT_ADDRESS, USDT_ADDRESS, TOKEN_PRICE_USD } from '../web-utils/constants';

interface SaleInfo {
  totalSold: string;
  maxTokens: string;
  minPurchase: string;
  tokenPrice: string;
}

interface Transaction {
  hash: string;
  buyer: string;
  amount: string;
  paymentMethod: 'USDT';
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
}

export default function TokenSale() {
  const [account, setAccount] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [usdtAmount, setUsdtAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saleInfo, setSaleInfo] = useState<SaleInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [usdtBalance, setUsdtBalance] = useState('0');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Ключ для хранения транзакций конкретного кошелька
  const getStorageKey = () => `exn-transactions-${account?.toLowerCase() || 'temp'}`;

  // Загрузка транзакций при смене аккаунта
  useEffect(() => {
    if (account) {
      try {
        const saved = localStorage.getItem(getStorageKey());
        if (saved) {
          const parsed = JSON.parse(saved);
          setTransactions(Array.isArray(parsed) ? parsed : []);
        } else {
          setTransactions([]);
        }
      } catch (e) {
        setTransactions([]);
      }
    } else {
      setTransactions([]);
    }
  }, [account]);
  }, [account]);

  // Сохранение транзакций
  useEffect(() => {
    if (account && transactions.length > 0) {
      localStorage.setItem(getStorageKey(), JSON.stringify(transactions));
    }
  }, [transactions, account]);

  // Подключение кошелька (работает везде: Trust Wallet, MetaMask, OKX и т.д.)
  const connectWallet = async () => {
    setShowWalletModal(false);

    if ((window as any).phantom?.ethereum) {
      toast.error('Phantom not supported');
      return;
    }

    if (!window.ethereum) {
      if (isMobile) {
        window.location.href = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
      } else {
        toast.error('Install MetaMask or Trust Wallet');
      }
      return;
    }

    try {
      setIsConnecting(true);

      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== '0x38') {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x38' }],
          });
        } catch (e: any) {
          if (e.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x38',
                chainName: 'Binance Smart Chain',
                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com']
              }]
            });
          }
        }
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const addr = accounts[0];
      setAccount(addr);
      toast.success('Connected!');

      const provider = new ethers.BrowserProvider(window.ethereum);
      await fetchBalances(addr, provider);
      await fetchSaleInfo(provider);
    } catch (e: any) {
      toast.error(e.message || 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount('');
    setUsdtAmount('');
    setUsdtBalance('0');
    setSaleInfo(null);
    setTransactions([]);
    localStorage.removeItem(getStorageKey());
    toast.success('Disconnected');
  };

  const fetchBalances = async (address: string, provider: ethers.BrowserProvider) => {
    try {
      const usdt = new ethers.Contract(USDT_ADDRESS, ['function balanceOf(address) view returns (uint256)'], provider);
      const bal = await usdt.balanceOf(address);
      setUsdtBalance(ethers.formatUnits(bal, 18));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSaleInfo = async (provider: ethers.BrowserProvider) => {
    try {
      const contract = new ethers.Contract(TOKEN_SALE_CONTRACT_ADDRESS, TokenSaleABI, provider);
      const id = await contract.currentRoundId();
      const info = await contract.saleRounds(id);

      setSaleInfo({
        totalSold: ethers.formatUnits(info.sold, 18),
        maxTokens: ethers.formatUnits(info.allocation, 18),
        minPurchase: ethers.formatUnits(info.minPurchase, 18),
        tokenPrice: ethers.formatUnits(info.price, 18),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const calculateTokens = () => {
    if (!usdtAmount || !saleInfo) return '0';
    const usdt = parseFloat(usdtAmount);
    if (isNaN(usdt) || usdt <= 0) return '0';
    const price = parseFloat(saleInfo.tokenPrice) || TOKEN_PRICE_USD;
    return (usdt / price).toFixed(2);
  };

  const handleMax = () => {
    const bal = parseFloat(usdtBalance) || 0;
    const max = Math.min(10000, bal);
    setUsdtAmount(max >= 1 ? max.toString() : '');
  };

  const handlePurchase = async () => {
    if (!account) return toast.error('Connect wallet');
    if (!usdtAmount) return toast.error('Enter amount');

    const amount = parseFloat(usdtAmount);
    if (amount < 1) return toast.error('Min: 1 USDT');
    if (amount > 10000) return toast.error('Max: 10,000 USDT');

    try {
      setIsLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();

      const usdtContract = new ethers.Contract(
        USDT_ADDRESS,
        ['function approve(address,uint256) returns (bool)', 'function balanceOf(address) returns (uint256)'],
        signer
      );

      const amountWei = ethers.parseUnits(usdtAmount, 18);
      if ((await usdtContract.balanceOf(account)) < amountWei) {
        return toast.error('Not enough USDT');
      }

      await (await usdtContract.approve(TOKEN_SALE_CONTRACT_ADDRESS, amountWei)).wait();

      const contract = new ethers.Contract(TOKEN_SALE_CONTRACT_ADDRESS, TokenSaleABI, signer);
      const tx = await contract.buyTokens(amountWei);

      const tokens = calculateTokens();
      const newTx: Transaction = {
        hash: tx.hash,
        buyer: account,
        amount: tokens,
        paymentMethod: 'USDT',
        timestamp: Date.now(),
        status: 'pending'
      };

      setTransactions(p => [newTx, ...p]);
      toast.info('Transaction sent...');

      const receipt = await tx.wait();
      setTransactions(p => p.map(t => t.hash === tx.hash ? { ...t, status: receipt.status === 1 ? 'success' : 'failed' } : t));

      if (receipt.status === 1) {
        toast.success('Success!');
        setUsdtAmount('');
        await fetchBalances(account, provider);
        await fetchSaleInfo(provider);
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed');
      setTransactions(p => p.length > 0 && p[0].status === 'pending' ? [{ ...p[0], status: 'failed' }, ...p.slice(1)] : p);
    } finally {
      setIsLoading(false);
    }
  };

  const remaining = saleInfo
    ? (parseFloat(saleInfo.maxTokens) - parseFloat(saleInfo.totalSold)).toFixed(0)
    : '0';

  const formatNumber = (n: string) => parseFloat(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const formatAddress = (a: string) => a ? `${a.slice(0,6)}...${a.slice(-4)}` : '';

  // Автоподключение
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then((accs: string[]) => {
        if (accs.length > 0) {
          setAccount(accs[0]);
          const p = new ethers.BrowserProvider(window.ethereum);
          fetchBalances(accs[0], p);
          fetchSaleInfo(p);
        }
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#E8E4F3]">
      {/* Header */}
      <header className="border-b bg-white/60 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="/expoin-logo.svg" alt="Expoin" className="h-8" />
            <div className="hidden md:block text-sm text-gray-600 italic">All Your Crypto. One Reliable Tool.</div>
          </div>

          {account ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end text-sm">
                <div className="font-medium">{formatAddress(account)}</div>
                <div className="text-gray-500">{parseFloat(usdtBalance).toFixed(2)} USDT</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <Button onClick={disconnectWallet} variant="outline" size="sm" className="rounded-full">
                <LogOut className="w-4 h-4 mr-2" /> Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={() => setShowWalletModal(true)} disabled={isConnecting} className="bg-black text-white rounded-full px-8">
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">EXN Token Sale</h1>
          <p className="text-xl text-gray-600">Join the future of cross-chain trading</p>
        </div>

        {/* Только две карточки — без прогресс-бара */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          <div className="p-6 rounded-3xl shadow-lg text-white" style={{ background: 'linear-gradient(135deg, #00D9FF 0%, #6B5DD3 100%)' }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 opacity-80" />
              <p className="text-sm font-medium opacity-80">Tokens Remaining</p>
            </div>
            <p className="text-4xl font-bold">{formatNumber(remaining)}</p>
            <p className="text-sm opacity-80 mt-1">EXN</p>
          </div>

          <div className="p-6 rounded-3xl shadow-lg text-white" style={{ background: 'linear-gradient(135deg, #6B5DD3 0%, #9D8FE8 100%)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 opacity-80" />
              <p className="text-sm font-medium opacity-80">Token Price</p>
            </div>
            <p className="text-4xl font-bold">
              ${saleInfo ? parseFloat(saleInfo.tokenPrice).toFixed(4) : '0.0250'}
            </p>
            <p className="text-sm opacity-80 mt-1">per EXN</p>
          </div>
        </div>

        {/* Основная сетка */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Покупка */}
          <div className="lg:col-span-2">
            <Card className="rounded-3xl border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl">Purchase Tokens</CardTitle>
                <CardDescription>Buy EXN with USDT (BSC)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>USDT Amount</Label>
                  <div className="relative mt-2">
                    <Input
                      type="number"
                      placeholder="Min: 1"
                      value={usdtAmount}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v && parseFloat(v) > 10000) {
                          toast.error('Max 10,000 USDT');
                          return;
                        }
                        setUsdtAmount(v);
                      }}
                      disabled={!account}
                      className="h-12 pr-16"
                    />
                    <Button
                      onClick={handleMax}
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 font-bold"
                      disabled={!account}
                    >
                      MAX
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Balance: {parseFloat(usdtBalance).toFixed(2)} USDT
                  </p>
                </div>

                {usdtAmount && parseFloat(usdtAmount) > 0 && (
                  <div className="p-5 bg-gray-100 rounded-2xl">
                    <div className="flex justify-between"><span className="text-gray-600">You pay:</span><strong>{usdtAmount} USDT</strong></div>
                    <div className="flex justify-between"><span className="text-gray-600">You receive:</span><strong>{formatNumber(calculateTokens())} EXN</strong></div>
                  </div>
                )}

                <Button
                  onClick={handlePurchase}
                  disabled={!account || isLoading || !usdtAmount}
                  className="w-full h-14 text-lg font-bold bg-black text-white rounded-full"
                >
                  {isLoading ? 'Processing...' : 'Purchase with USDT'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* История транзакций */}
          <div>
            <Card className="rounded-3xl border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl">Recent Transactions</CardTitle>
                <CardDescription>Your purchases</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.slice(0, 6).map(tx) => (
                      <div key={tx.hash} className="flex justify-between items-center p-3 border rounded-2xl">
                        <div>
                          <p className="font-medium">{formatNumber(tx.amount)} EXN</p>
                          <p className="text-xs text-gray-500">{new Date(tx.timestamp).toLocaleDateString()}</p>
                        </div>
                        {tx.status === 'pending' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                        {tx.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                        {tx.status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ и футер — без изменений */}
        {/* ... */}
      </main>

      {/* Модалка кошелька */}
      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Wallet</DialogTitle>
          </DialogHeader>
          <Button onClick={connectWallet} className="h-16">
            <div className="flex items-center gap-4 w-full justify-start">
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex-center">
                <Wallet className="w-7 h-7 text-orange-600" />
              </div>
              <div className="text-left">
                <div className="font-bold">MetaMask / Trust Wallet</div>
                <div className="text-sm text-gray-500">Click to connect</div>
              </div>
            </div>
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
