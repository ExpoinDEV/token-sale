// 🔴 FULL FILE — Referral.tsx (with admin dashboard)

import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  Wallet,
  LogOut,
  Users,
  TrendingUp,
  Clock,
  Copy,
  ShieldCheck,
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
  const [account, setAccount] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const walletLower = useMemo(() => account.toLowerCase(), [account]);

  // ======================
  // QUERIES
  // ======================

  const userDataQuery = trpc.referral.getUserData.useQuery(
    { wallet: walletLower },
    { enabled: !!walletLower }
  );

  const isAdminQuery = trpc.referral.isAdmin.useQuery(
    { wallet: walletLower },
    { enabled: !!walletLower }
  );

  const adminStatsQuery = trpc.referral.adminStats.useQuery(
    { wallet: walletLower },
    { enabled: isAdminQuery.data?.isAdmin === true }
  );

  const isAdmin = isAdminQuery.data?.isAdmin === true;

  // ======================
  // WALLET
  // ======================

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error("Please install a Web3 wallet");
      return;
    }

    try {
      setIsConnecting(true);
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0]);
      toast.success("Wallet connected");
    } catch (e: any) {
      toast.error(e?.message || "Failed to connect");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount("");
    toast.success("Wallet disconnected");
  };

  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.request({ method: "eth_accounts" }).then((acc: string[]) => {
      if (acc?.length) setAccount(acc[0]);
    });
  }, []);

  // ======================
  // UI
  // ======================

  return (
    <div className="min-h-screen" style={{ background: "#E8E4F3" }}>
      {/* HEADER */}
      <header className="border-b bg-white/60 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <img src="/expoin-logo.svg" className="h-8" />

          {account ? (
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium">{formatAddress(account)}</p>
              <Button onClick={disconnectWallet} variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={connectWallet} disabled={isConnecting}>
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 space-y-12">
        {/* USER DASHBOARD */}
        {account && (
          <>
            {/* USER STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                title="Total USDT"
                value={userDataQuery.data?.totals?.total_usdt}
                icon={<TrendingUp />}
              />
              <StatCard
                title="Total Tokens"
                value={userDataQuery.data?.totals?.total_tokens}
                icon={<Clock />}
              />
              <StatCard
                title="Referrals"
                value={String(userDataQuery.data?.referrals?.length ?? 0)}
                icon={<Users />}
              />
            </div>

            {/* ======================
                ADMIN DASHBOARD
            ====================== */}
            {isAdmin && (
              <Card className="rounded-3xl border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6" />
                    Admin – Referral overview
                  </CardTitle>
                  <CardDescription>Global referral performance</CardDescription>
                </CardHeader>

                <CardContent>
                  {adminStatsQuery.isLoading ? (
                    <div className="py-10 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading admin stats…
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {adminStatsQuery.data?.map((row: any) => (
                        <div
                          key={row.referrer_wallet}
                          className="p-4 border rounded-2xl flex flex-col md:flex-row md:justify-between gap-2"
                        >
                          <div>
                            <p className="font-medium">
                              {formatAddress(row.referrer_wallet)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Referrals: {row.referrals_count}
                            </p>
                          </div>

                          <div className="flex gap-6 text-sm">
                            <div>
                              <p className="text-xs text-gray-500">USDT</p>
                              <p className="font-semibold">{row.total_usdt}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Tokens</p>
                              <p className="font-semibold">{row.total_tokens}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Last activity</p>
                              <p className="font-semibold">
                                {row.last_activity
                                  ? new Date(row.last_activity).toLocaleString()
                                  : "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value?: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="rounded-3xl shadow-lg p-6 text-white"
      style={{ background: "linear-gradient(135deg, #6B5DD3, #00D9FF)" }}
    >
      <div className="flex items-center gap-2 mb-2 opacity-80">
        {icon}
        <span className="text-sm">{title}</span>
      </div>
      <p className="text-3xl font-bold">{value ?? "0"}</p>
    </div>
  );
}
