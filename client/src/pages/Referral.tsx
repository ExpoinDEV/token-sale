"use client";

import { useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { useRoute } from 'wouter'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, Wallet, LogOut } from 'lucide-react'

// Prefer keeping addresses in a single place (same as TokenSale.tsx)
// You can move this into ../web-utils/constants later.
const REFERRAL_CONTRACT_ADDRESS =
  (import.meta as any)?.env?.VITE_REFERRAL_CONTRACT_ADDRESS ||
  (import.meta as any)?.env?.NEXT_PUBLIC_REFERRAL_CONTRACT_ADDRESS ||
  '0x0000000000000000000000000000000000000000'

const BSC_PUBLIC_RPC = 'https://bsc-dataseed.binance.org/'

const REFERRAL_ABI = [
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }]
  }
]

// ------------------ Referral capture (localStorage) ------------------

const REF_STORAGE_KEY = 'expoin-referrer'

function safeSetReferrer(addr: string) {
  try {
    localStorage.setItem(REF_STORAGE_KEY, addr)
  } catch {
    // ignore storage errors
  }
}

function safeGetReferrer(): string {
  try {
    return localStorage.getItem(REF_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

function safeClearReferrer() {
  try {
    localStorage.removeItem(REF_STORAGE_KEY)
  } catch {
    // ignore
  }
}

/**
 * Page component to mount at: /referral
 * Also accepts: /r/:address (wouter param route)
 *
 * Expected behavior:
 * - If wallet is not connected: show CTA + render UI without data
 * - Admin is determined from referralContract.owner()
 * - Uses the same wallet UX style as TokenSale (custom modal selection)
 */
export default function Referral() {
  const [storedReferrer, setStoredReferrer] = useState<string>('')

  // wouter route params for /r/:address
  const [, params] = useRoute('/r/:address')
  const paramAddress = (params as any)?.address as string | undefined

  // Capture referral from /r/:address and redirect to token sale /
  useEffect(() => {
    // If opened as /r/<address> route, we get address from params
    if (paramAddress) {
      if (!ethers.isAddress(paramAddress)) {
        toast.error('Invalid referral link')
        return
      }

      safeSetReferrer(paramAddress)
      setStoredReferrer(paramAddress)
      toast.success('Referral code saved')

      // Redirect to token sale homepage after capture
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

      return
    }

    // Otherwise we are on /referral: just load stored referrer
    setStoredReferrer(safeGetReferrer())
  }, [paramAddress])

  const clearStoredReferrer = () => {
    safeClearReferrer()
    setStoredReferrer('')
    toast.success('Referral code cleared')
  }

  const [account, setAccount] = useState<string>('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)

  const [owner, setOwner] = useState<string>('')
  const [isOwnerLoading, setIsOwnerLoading] = useState(false)

  const isAdmin = useMemo(() => {
    if (!account || !owner) return false
    return account.toLowerCase() === owner.toLowerCase()
  }, [account, owner])

  // -------- wallet: init / listeners (copied logic style from TokenSale) --------

  useEffect(() => {
    const init = async () => {
      // Always try to fetch owner from public RPC so role is ready ASAP
      await fetchOwnerWithPublicRpc()

      if (!window.ethereum) return
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts?.length) {
          setAccount(accounts[0])
          // After connect, re-fetch owner using same provider
          await fetchOwnerWithBrowserProvider()
        }
      } catch {
        // ignore
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!window.ethereum) return

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts?.length) {
        setAccount(accounts[0])
        await fetchOwnerWithBrowserProvider()
      } else {
        setAccount('')
        // keep owner cached (public RPC value)
      }
    }

    const handleChainChanged = () => window.location.reload()

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum?.removeListener('chainChanged', handleChainChanged)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showWalletSelection = () => setShowWalletModal(true)

  const connectWallet = async (
    _walletType:
      | 'metamask'
      | 'trustwallet'
      | 'rabby'
      | 'okx'
      | 'safepal'
      | 'binance' = 'metamask'
  ) => {
    setShowWalletModal(false)

    // Block Phantom wallet (same rule as TokenSale)
    if ((window as any).phantom?.ethereum) {
      toast.error(
        'Phantom wallet is not supported. Please use MetaMask, Rabby, OKX, SafePal, Binance Web3, or Trust Wallet.'
      )
      return
    }

    if (!window.ethereum) {
      toast.error('Please install a Web3 wallet!')
      return
    }

    try {
      setIsConnecting(true)
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      if (!accounts?.length) throw new Error('No accounts found')

      setAccount(accounts[0])
      toast.success('Wallet connected!')

      await fetchOwnerWithBrowserProvider()
    } catch (e: any) {
      if (e?.code === 4001) toast.error('Connection rejected by user')
      else if (e?.code === -32002) toast.error('Connection request already pending. Please check your wallet.')
      else toast.error(e?.message || 'Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = async () => {
    try {
      setAccount('')

      if (window.ethereum?.request) {
        try {
          await window.ethereum.request({
            method: 'wallet_revokePermissions',
            params: [{ eth_accounts: {} }]
          })
        } catch {
          // not supported in some wallets; ignore
        }
      }

      toast.success('Wallet disconnected')
    } catch {
      toast.success('Wallet disconnected')
    }
  }

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  // -------- owner() read --------

  const fetchOwnerWithPublicRpc = async () => {
    try {
      setIsOwnerLoading(true)
      const provider = new ethers.JsonRpcProvider(BSC_PUBLIC_RPC)
      const c = new ethers.Contract(REFERRAL_CONTRACT_ADDRESS, REFERRAL_ABI, provider)
      const o = await c.owner()
      setOwner(o)
    } catch {
      // keep owner empty if contract not deployed / address not set
    } finally {
      setIsOwnerLoading(false)
    }
  }

  const fetchOwnerWithBrowserProvider = async () => {
    if (!window.ethereum) return
    try {
      setIsOwnerLoading(true)
      const provider = new ethers.BrowserProvider(window.ethereum)
      const c = new ethers.Contract(REFERRAL_CONTRACT_ADDRESS, REFERRAL_ABI, provider)
      const o = await c.owner()
      setOwner(o)
    } catch {
      // fallback to public RPC
      await fetchOwnerWithPublicRpc()
    } finally {
      setIsOwnerLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#E8E4F3' }}>
      {/* Header (same style logic as TokenSale) */}
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
                <p className="text-xs text-gray-500">
                  {isOwnerLoading ? 'Checking role…' : isAdmin ? 'Admin' : 'User'}
                </p>
              </div>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #00D9FF 0%, #6B5DD3 100%)' }}
              >
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

      {/* Main */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">Referral Dashboard</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">Track your referral earnings and activity.</p>
        </div>

        <ReferrerBanner referrer={storedReferrer} onClear={clearStoredReferrer} />

        {!account ? (
          <WalletRequired onConnect={showWalletSelection} />
        ) : isAdmin ? (
          <AdminDashboard account={account} />
        ) : (
          <UserDashboard account={account} />
        )}

        {/* Wallet Selection Modal (same UX style as TokenSale) */}
        <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Connect Wallet</DialogTitle>
              <DialogDescription>Choose your preferred wallet to connect</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <WalletChoice label="MetaMask" onClick={() => connectWallet('metamask')} />
              <WalletChoice label="Rabby" onClick={() => connectWallet('rabby')} />
              <WalletChoice label="OKX Wallet" onClick={() => connectWallet('okx')} />
              <WalletChoice label="SafePal" onClick={() => connectWallet('safepal')} />
              <WalletChoice label="Binance Web3 Wallet" onClick={() => connectWallet('binance')} />
              <WalletChoice label="Trust Wallet" onClick={() => connectWallet('trustwallet')} />
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

// ------------------ User Dashboard ------------------

function UserDashboard({ account }: { account: string }) {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="rounded-3xl border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Your Referrals</CardTitle>
              <CardDescription>Direct referrals only (1 level)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ReferralStats />
              <ReferralLink account={account} />
              <ReferralList />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="rounded-3xl border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl">Referral Purchases</CardTitle>
              <CardDescription>History (placeholder)</CardDescription>
            </CardHeader>
            <CardContent>
              <ReferralHistory />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ReferralStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard title="Pending Rewards" value="—" />
      <StatCard title="Total Paid" value="—" />
      <StatCard title="Your Grade" value="—" />
    </div>
  )
}

function ReferralLink({ account }: { account: string }) {
  const fullLink = `https://token.expoin.io/r/${account}`
  const shortCode = `${account.slice(0, 6)}…${account.slice(-4)}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullLink)
      toast.success('Referral link copied')
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <div className="p-5 rounded-2xl" style={{ background: '#F3F4F6' }}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-gray-600 mb-1">Your referral link</p>
          <p className="font-semibold text-gray-900 truncate" title={fullLink}>
            {fullLink}
          </p>
          <p className="text-xs text-gray-500 mt-1">Code: {shortCode}</p>
        </div>
        <Button onClick={copy} className="rounded-full" style={{ background: '#000000' }}>
          Copy
        </Button>
      </div>
    </div>
  )
}

function ReferralList() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">Direct referrals (placeholder)</p>
      <div className="p-4 border rounded-2xl bg-white">
        <p className="text-sm text-gray-500">No referrals yet</p>
      </div>
    </div>
  )
}

function ReferralHistory() {
  return (
    <div className="text-center py-8 text-gray-500">
      <p className="text-sm">No referral purchases yet</p>
    </div>
  )
}

// ------------------ Admin Dashboard ------------------

function AdminDashboard({ account }: { account: string }) {
  return (
    <div className="max-w-7xl mx-auto">
      <Card className="rounded-3xl border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Admin Dashboard</CardTitle>
          <CardDescription>
            Owner: {account.slice(0, 6)}…{account.slice(-4)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AdminStats />
          <SetGrade />
          <ReferrersTable />
          <DailyPayouts />
        </CardContent>
      </Card>
    </div>
  )
}

function AdminStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard title="Total Pending" value="—" />
      <StatCard title="Total Paid" value="—" />
      <StatCard title="Active Referrers" value="—" />
    </div>
  )
}

function SetGrade() {
  return (
    <div className="p-5 rounded-2xl" style={{ background: '#F3F4F6' }}>
      <p className="font-semibold text-gray-900 mb-3">Set Referrer Grade</p>
      <div className="flex flex-col md:flex-row gap-3">
        <input className="flex-1 rounded-xl border px-3 py-2" placeholder="Wallet address" />
        <select className="rounded-xl border px-3 py-2" defaultValue="30">
          <option value="20">20%</option>
          <option value="30">30%</option>
          <option value="50">50%</option>
        </select>
        <Button className="rounded-full" style={{ background: '#000000' }}>
          Apply
        </Button>
      </div>
      <p className="text-xs text-gray-500 mt-2">Grade applies only to future purchases.</p>
    </div>
  )
}

function ReferrersTable() {
  return (
    <div className="p-5 rounded-2xl" style={{ background: '#F3F4F6' }}>
      <p className="font-semibold text-gray-900 mb-3">Referrers</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Wallet</th>
              <th className="py-2">Grade</th>
              <th className="py-2">Pending</th>
              <th className="py-2">Paid</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="py-3">0xAB…12</td>
              <td className="py-3">30%</td>
              <td className="py-3">—</td>
              <td className="py-3">—</td>
              <td className="py-3">
                <Button variant="outline" size="sm" className="rounded-full">
                  View
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DailyPayouts() {
  return (
    <div className="p-5 rounded-2xl" style={{ background: '#F3F4F6' }}>
      <p className="font-semibold text-gray-900 mb-2">Daily Payouts</p>
      <p className="text-sm text-gray-600 mb-4">Total to pay: —</p>
      <Button className="rounded-full" style={{ background: '#000000' }}>
        Mark as Paid
      </Button>
    </div>
  )
}

// ------------------ UI Primitives ------------------

function ReferrerBanner({ referrer, onClear }: { referrer: string; onClear: () => void }) {
  if (!referrer) return null

  return (
    <div className="max-w-3xl mx-auto mb-8">
      <Card className="rounded-3xl border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl">Active referral</CardTitle>
          <CardDescription>This wallet will receive cashback rewards for your purchases.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-gray-700 break-all">{referrer}</div>
          <Button onClick={onClear} variant="outline" className="rounded-full">
            Clear
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function WalletRequired({ onConnect }: { onConnect: () => void }) {
  return (
    <Card className="rounded-3xl border-0 shadow-xl max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Connect your wallet</CardTitle>
        <CardDescription>Connect a Web3 wallet to access your referral dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={onConnect}
          size="lg"
          className="rounded-full text-white font-semibold px-8"
          style={{ background: '#000000' }}
        >
          <Wallet className="w-4 h-4 mr-2" />
          Connect Wallet
        </Button>
        <p className="text-xs text-gray-500 mt-3">The page renders without data until you connect.</p>
      </CardContent>
    </Card>
  )
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div
      className="rounded-3xl shadow-lg overflow-hidden p-6"
      style={{ background: 'linear-gradient(135deg, #6B5DD3 0%, #9D8FE8 100%)' }}
    >
      <p className="text-sm font-medium text-white/80">{title}</p>
      <p className="text-3xl font-bold text-white mt-2">{value}</p>
    </div>
  )
}

function WalletChoice({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button onClick={onClick} variant="outline" className="w-full h-16 justify-start text-left hover:bg-gray-50">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
          <Wallet className="w-6 h-6 text-gray-700" />
        </div>
        <div>
          <div className="font-semibold">{label}</div>
          <div className="text-sm text-gray-500">Connect with {label}</div>
        </div>
      </div>
    </Button>
  )
}
