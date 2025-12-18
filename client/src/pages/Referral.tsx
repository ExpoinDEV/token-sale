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
  Plus,
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

  // =========================
  // Wallet logic (unchanged)
  // =========================

  const connectWallet = async () => {
    setShowWalletModal(false);

    if ((window as any).phantom?.ethereum) {
      toast.error("Phantom wallet is not supported");
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
      if (accounts?.length) {
        setAccount(accounts[0]);
        toast.success("Wallet connected");
      }
    } catch (e: any) {
      if (e?.code === 4001) toast.error("Connection rejected");
      else toast.error("Failed to connect wallet");
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
    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accs: string[]) => accs?.length && setAccount(accs[0]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    const onAcc = (a: string[]) => setAccount(a?.[0] || "");
    window.ethereum.on("accountsChanged", onAcc);
    return () =>
      window.ethereum?.removeListener("accountsChanged", onAcc);
  }, []);

  // =========================
  // Data
  // =========================

  const walletLower = useMemo(
    () => account.toLowerCase(),
    [account]
  );

  const userData = trpc.referral.getUserData.useQuery(
    { wallet: walletLower },
    { enabled: !!walletLower }
  );

  const isAdminQuery = trpc.referral.isAdmin.useQuery(
    { wallet: walletLower },
    { enabled: !!walletLower }
  );

  const adminStatsQuery = trpc.referral.adminStats.useQuery(
    { wallet: walletLower },
    {
      enabled: !!walletLower && isAdminQuery.data?.isAdmin,
    }
  );

  const referralLink = walletLower
    ? `${window.location.origin}/r/${walletLower}`
    : "";

  const copyReferralLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied");
  };

  // =========================
  // Admin add wallet
  // =========================

  const [newAdmin, setNewAdmin] = useState("");

  const addAdminMutation =
    trpc.referral.addAdmin.useMutation({
      onSuccess() {
        toast.success("Admin added");
        setNewAdmin("");
        adminStatsQuery.refetch();
      },
      onError() {
        toast.error("Failed to add admin");
      },
    });

  // =========================
  // UI
  // =========================

  return (
    <div className="min-h-screen bg-[#E8E4F3]">
      {/* HEADER */}
      <header className="border-b bg-white/60 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between">
          <img src="/expoin-logo.svg" className="h-8" />

          {account ? (
            <div className="flex items-center gap-3">
              <span className="text-sm">
                {formatAddress(account)}
              </span>
              <Button
                onClick={disconnectWallet}
                variant="outline"
                size="sm"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={() => setShowWalletModal(true)}>
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>
          )}
        </div>
      </header>

      {/* MAIN */}
      <main className="container mx-auto px-4 py-12 space-y-12">
        <div className="text-center">
          <h1 className="text-5xl font-bold">
            Referral Program
          </h1>
          <p className="text-gray-600 mt-2">
            Share your link and track referrals
          </p>
        </div>

        {/* STATS */}
        {account && (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              <StatCard
                title="Total USDT"
                value={
                  userData.data?.totals?.total_usdt ?? "0"
                }
              />
              <StatCard
                title="Total Tokens"
                value={
                  userData.data?.totals?.total_tokens ?? "0"
                }
              />
              <StatCard
                title="Referrals"
                value={
                  userData.data?.referrals?.length ?? 0
                }
              />
            </div>

            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>Your referral link</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-3">
                <div className="flex-1 break-all">
                  {referralLink}
                </div>
                <Button onClick={copyReferralLink}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* ADMIN PANEL */}
        {isAdminQuery.data?.isAdmin && (
          <Card className="rounded-3xl border-2 border-purple-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Admin referral stats
              </CardTitle>
              <CardDescription>
                Aggregated referral performance
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* STATS TABLE */}
              {!adminStatsQuery.data?.length ? (
                <p className="text-gray-500">
                  No referral data yet
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th>Wallet</th>
                        <th>Referrals</th>
                        <th>USDT</th>
                        <th>Tokens</th>
                        <th>Last activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminStatsQuery.data.map((r: any) => (
                        <tr key={r.referrer_wallet}>
                          <td>
                            {formatAddress(
                              r.referrer_wallet
                            )}
                          </td>
                          <td>{r.referrals_count}</td>
                          <td>{r.total_usdt}</td>
                          <td>{r.total_tokens}</td>
                          <td>{r.last_activity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ADD ADMIN */}
              <div className="flex gap-3">
                <input
                  value={newAdmin}
                  onChange={(e) =>
                    setNewAdmin(e.target.value)
                  }
                  placeholder="0x..."
                  className="flex-1 border rounded-lg px-3"
                />
                <Button
                  onClick={() =>
                    addAdminMutation.mutate({
                      wallet: newAdmin,
                    })
                  }
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add admin
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* WALLET MODAL */}
      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect wallet</DialogTitle>
            <DialogDescription>
              Choose your wallet
            </DialogDescription>
          </DialogHeader>
          <Button onClick={connectWallet}>
            MetaMask / Web3
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: any;
}) {
  return (
    <div className="rounded-3xl p-6 bg-white shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
