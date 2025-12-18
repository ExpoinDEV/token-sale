import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  Wallet,
  LogOut,
  Users,
  TrendingUp,
  Clock,
  Copy,
  Shield,
} from "lucide-react";

declare global {
  interface Window {
    ethereum?: any;
  }
}

function formatAddress(address: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Referral() {
  const [account, setAccount] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // ===== Stored referrer (from /r/:address) =====
  const storedReferrer = useMemo(() => {
    try {
      return localStorage.getItem("expoin-referrer") || "";
    } catch {
      return "";
    }
  }, [account]);

  // ===== Wallet connect =====
  const showWalletSelection = () => setShowWalletModal(true);

  const connectWallet = async () => {
    setShowWalletModal(false);

    if ((window as any).phantom?.ethereum) {
      toast.error("Phantom wallet is not supported.");
      return;
    }

    if (!window.ethereum) {
      toast.error("Please install a Web3 wallet");
      return;
    }

    try {
      setIsConnecting(true);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (!accounts?.length) throw new Error("No accounts");
      setAccount(accounts[0]);
      toast.success("Wallet connected");
    } catch (e: any) {
      if (e?.code === 4001) toast.error("Connection rejected");
      else toast.error(e?.message || "Failed to connect");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    setAccount("");
    toast.success("Wallet disconnected");
  };

  // auto-connect
  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accounts: string[]) => {
        if (accounts?.length) setAccount(accounts[0]);
      })
      .catch(() => {});
  }, []);

  // ===== Wallet lower =====
  const walletLower = useMemo(
    () => (account ? account.toLowerCase() : ""),
    [account]
  );

  // ===== User data =====
  const userDataQuery = trpc.referral.getUserData.useQuery(
    { wallet: walletLower },
    { enabled: !!walletLower }
  );

  // ===== Admin check =====
  const isAdminQuery = trpc.referral.isAdmin.useQuery(
    { wallet: walletLower },
    { enabled: !!walletLower }
  );

  const isAdmin = !!isAdminQuery.data?.isAdmin;

  // ===== Admin stats =====
  const adminStatsQuery = trpc.referral.adminStats.useQuery(
    { wallet: walletLower },
    { enabled: isAdmin }
  );

  // ===== Referral link =====
  const referralLink = useMemo(() => {
    if (!walletLower) return "";
    return `${window.location.origin}/r/${walletLower}`;
  }, [walletLower]);

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const clearStoredReferrer = () => {
    localStorage.removeItem("expoin-referrer");
    toast.success("Referral cleared");
    window.location.reload();
  };

  const data = userDataQuery.data;
  const isLoading = userDataQuery.isLoading;

  // ===== UI =====
  return (
    <div className="min-h-screen" style={{ background: "#E8E4F3" }}>
      {/* HEADER */}
      <header className="border-b bg-white/60 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="/expoin-logo.svg" className="h-8" />
            <p className="hidden md:block text-sm italic text-gray-600">
              All Your Crypto. One Reliable Tool.
            </p>
          </div>

          {account ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium">
                  {formatAddress(account)}
                </p>
                <p className="text-xs text-gray-500">
                  Referral dashboard
                </p>
              </div>
              <Button
                onClick={disconnectWallet}
                variant="outline"
                size="sm"
                className="rounded-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={showWalletSelection}
              size="lg"
              className="rounded-full bg-black text-white"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>
          )}
        </div>
      </header>

      {/* MAIN */}
      <main className="container mx-auto px-4 py-12 space-y-12">
        {/* HERO */}
        <div className="text-center">
          <h1 className="text-5xl font-bold">Referral Program</h1>
          <p className="text-xl text-gray-600 mt-2">
            Share your link and track referrals and purchases.
          </p>
        </div>

        {/* STORED REFERRER */}
        {storedReferrer && (
          <Card className="max-w-4xl mx-auto rounded-3xl shadow-xl">
            <CardHeader>
              <CardTitle>Active referral</CardTitle>
              <CardDescription>
                This wallet will receive cashback rewards
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <span className="text-sm break-all">{storedReferrer}</span>
              <Button variant="outline" onClick={clearStoredReferrer}>
                Clear
              </Button>
            </CardContent>
          </Card>
        )}

        {/* USER DASHBOARD */}
        {account && (
          <>
            {/* STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                title="Total USDT Volume"
                value={data?.totals?.total_usdt ?? "0"}
                icon={<TrendingUp />}
              />
              <StatCard
                title="Total Tokens"
                value={data?.totals?.total_tokens ?? "0"}
                icon={<Clock />}
              />
              <StatCard
                title="Referrals"
                value={String(data?.referrals?.length ?? 0)}
                icon={<Users />}
              />
            </div>

            {/* LINK */}
            <Card className="rounded-3xl shadow-xl">
              <CardHeader>
                <CardTitle>Your referral link</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-between items-center gap-3">
                <p className="break-all font-semibold">{referralLink}</p>
                <Button onClick={copyReferralLink} className="bg-black text-white">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </CardContent>
            </Card>

            {/* LISTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <ReferralList
                title="Your referrals"
                items={data?.referrals}
                empty="No referrals yet"
                render={(r: any) => (
                  <>
                    <p className="font-medium">
                      {formatAddress(r.referral_wallet)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </>
                )}
              />

              <ReferralList
                title="Referral purchases"
                className="lg:col-span-2"
                items={data?.purchases}
                empty="No purchases yet"
                render={(p: any) => (
                  <>
                    <p className="font-medium">
                      Buyer: {formatAddress(p.buyer_wallet)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {p.usdt_amount} USDT · {p.tokens_amount} tokens
                    </p>
                  </>
                )}
              />
            </div>
          </>
        )}

        {/* ADMIN PANEL */}
        {isAdmin && (
          <Card className="rounded-3xl shadow-xl border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Admin referral stats
              </CardTitle>
              <CardDescription>
                Aggregated referral performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {adminStatsQuery.isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <div className="space-y-3">
                  {adminStatsQuery.data?.map((row: any) => (
                    <div
                      key={row.referrer_wallet}
                      className="p-4 border rounded-2xl flex justify-between"
                    >
                      <span>{formatAddress(row.referrer_wallet)}</span>
                      <span>{row.referrals_count} refs</span>
                      <span>{row.total_usdt} USDT</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* WALLET MODAL */}
        <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Wallet</DialogTitle>
              <DialogDescription>Select your wallet</DialogDescription>
            </DialogHeader>
            <Button onClick={connectWallet}>Connect MetaMask</Button>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

// ===== Small components =====

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: any;
}) {
  return (
    <div className="rounded-3xl p-6 shadow-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
      <div className="flex items-center gap-2 text-sm opacity-80">
        {icon}
        {title}
      </div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}

function ReferralList({
  title,
  items,
  empty,
  render,
  className = "",
}: {
  title: string;
  items?: any[];
  empty: string;
  render: (item: any) => JSX.Element;
  className?: string;
}) {
  return (
    <Card className={`rounded-3xl shadow-xl ${className}`}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!items?.length ? (
          <p className="text-gray-500 text-sm">{empty}</p>
        ) : (
          items.slice(0, 20).map((i, idx) => (
            <div key={idx} className="p-3 border rounded-2xl">
              {render(i)}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
