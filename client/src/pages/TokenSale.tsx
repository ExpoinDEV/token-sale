import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Loader2,
  Wallet,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  LogOut,
  ChevronDown
} from 'lucide-react'
import TokenSaleABI from '../abi/TokenSaleContract.json'
import {
  TOKEN_SALE_CONTRACT_ADDRESS,
  USDT_ADDRESS,
  TOKEN_PRICE_USD,
  BSC_CHAIN_ID
} from '../web-utils/constants'

/* =======================
   REFERRAL (SILENT)
   ======================= */

const REF_STORAGE_KEY = 'expoin-referrer'

const parseRefFromPath = (pathname: string) => {
  const m = pathname.match(/^\/r\/(0x[a-fA-F0-9]{40})$/)
  return m ? m[1] : null
}

const saveReferrer = (addr: string) => {
  try {
    localStorage.setItem(REF_STORAGE_KEY, addr)
  } catch {}
}

const getReferrer = () => {
  try {
    return localStorage.getItem(REF_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

/* =======================
   COMPONENT
   ======================= */

export default function TokenSale() {
  const [account, setAccount] = useState<string>('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [usdtAmount, setUsdtAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [saleInfo, setSaleInfo] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [usdtBalance, setUsdtBalance] = useState('0')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  const [showWalletModal, setShowWalletModal] = useState(false)

  /* =======================
     REFERRAL CAPTURE
     ======================= */
  useEffect(() => {
    const ref = parseRefFromPath(window.location.pathname)
    if (!ref) return
    if (!ethers.isAddress(ref)) return

    saveReferrer(ref)

    try {
      window.history.replaceState(null, '', '/')
    } catch {}

    setTimeout(() => {
      try {
        window.location.replace('/')
      } catch {
        window.location.href = '/'
      }
    }, 50)
  }, [])

  /* =======================
     WALLET INIT
     ======================= */
  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) return
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts.length) {
        setAccount(accounts[0])
        const provider = new ethers.BrowserProvider(window.ethereum)
        fetchBalances(accounts[0], provider)
        fetchSaleInfo(provider)
      } else {
        const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/')
        fetchSaleInfo(provider as any)
      }
    }
    init()
  }, [])

  /* =======================
     WALLET CONNECT
     ======================= */
  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error('Please install a Web3 wallet')
      return
    }
    try {
      setIsConnecting(true)
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      setAccount(accounts[0])
      const provider = new ethers.BrowserProvider(window.ethereum)
      fetchBalances(accounts[0], provider)
      fetchSaleInfo(provider)
    } catch {
      toast.error('Wallet connection failed')
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setAccount('')
    setUsdtBalance('0')
    toast.success('Wallet disconnected')
  }

  /* =======================
     DATA
     ======================= */
  const fetchBalances = async (address: string, provider: ethers.BrowserProvider) => {
    const usdtContract = new ethers.Contract(
      USDT_ADDRESS,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    )
    const bal = await usdtContract.balanceOf(address)
    setUsdtBalance(ethers.formatUnits(bal, 18))
  }

  const fetchSaleInfo = async (provider: any) => {
    const contract = new ethers.Contract(
      TOKEN_SALE_CONTRACT_ADDRESS,
      TokenSaleABI,
      provider
    )
    const roundId = await contract.currentRoundId()
    const round = await contract.saleRounds(roundId)
    setSaleInfo({
      totalSold: ethers.formatUnits(round.sold, 18),
      maxTokens: ethers.formatUnits(round.allocation, 18),
      tokenPrice: ethers.formatUnits(round.price, 18)
    })
  }

  /* =======================
     PURCHASE
     ======================= */
  const handlePurchase = async () => {
    if (!account || !usdtAmount) return

    try {
      setIsLoading(true)
      const provider = new ethers.BrowserProvider(window.ethereum!)
      const signer = await provider.getSigner()

      const usdtContract = new ethers.Contract(
        USDT_ADDRESS,
        ['function approve(address,uint256) returns(bool)', 'function balanceOf(address) view returns(uint256)'],
        signer
      )

      const amountWei = ethers.parseUnits(usdtAmount, 18)
      await (await usdtContract.approve(TOKEN_SALE_CONTRACT_ADDRESS, amountWei)).wait()

      const saleContract = new ethers.Contract(
        TOKEN_SALE_CONTRACT_ADDRESS,
        TokenSaleABI,
        signer
      )

      const tx = await saleContract.buyTokens(amountWei)
      const receipt = await tx.wait()

      if (receipt.status === 1) {
        toast.success('Purchase successful')

        const referrer = getReferrer()
        if (referrer) {
          console.log('[REFERRAL]', {
            referrer,
            buyer: account,
            usdt: usdtAmount
          })
        }

        setUsdtAmount('')
        fetchBalances(account, provider)
      }
    } catch (e: any) {
      toast.error('Transaction failed')
    } finally {
      setIsLoading(false)
    }
  }

  /* =======================
     UI (НЕ МЕНЯЛ)
     ======================= */

  return (
    <div className="min-h-screen" style={{ background: '#E8E4F3' }}>
      {/* HEADER */}
      <header className="border-b bg-white/60 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <img src="/expoin-logo.svg" className="h-8" />
          {account ? (
            <Button onClick={disconnectWallet} variant="outline">
              Disconnect
            </Button>
          ) : (
            <Button onClick={connectWallet}>
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          )}
        </div>
      </header>

      {/* MAIN */}
      <main className="container mx-auto px-4 py-12">
        <Card className="max-w-xl mx-auto rounded-3xl shadow-xl">
          <CardHeader>
            <CardTitle>Purchase Tokens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label>USDT Amount</Label>
            <Input
              value={usdtAmount}
              onChange={(e) => setUsdtAmount(e.target.value)}
              disabled={!account}
            />
            <Button
              onClick={handlePurchase}
              disabled={!account || isLoading}
              className="w-full"
            >
              {isLoading ? 'Processing...' : 'Buy'}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
