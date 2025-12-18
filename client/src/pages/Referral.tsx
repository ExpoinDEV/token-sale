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

  // роль (пункт 4). если бекенд не отдаёт — считаем read (безопасно)
  const adminRole = (isAdminQuery.data as any)?.role as "read" | "write" | undefined;
  const effectiveRole: "read" | "write" = adminRole ?? "read";
  const canWrite = isAdmin && effectiveRole === "write";

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

  // ===== ADMIN CRUD (пункт 1) =====
  const [adminTargetWallet, setAdminTargetWallet] = useState("");
  const [adminRoleToSet, setAdminRoleToSet] = useState<"read" | "write">("read");

  // через any, чтобы TS не падал если процедур пока нет
  const setAdminMutation = (trpc as any).referral?.setAdmin?.useMutation?.();
  const revokeAdminMutation = (trpc as any).referral?.revokeAdmin?.useMutation?.();

  const doSetAdmin = async () => {
    const w = adminTargetWallet.trim().toLowerCase();
    if (!w) {
      toast.error("Enter wallet");
      return;
    }
    if (!w.startsWith("0x") || w.length < 42) {
      toast.error("Invalid wallet");
      return;
    }
    if (!setAdminMutation) {
      toast.error("Backend: referral.setAdmin is not implemented yet");
      return;
    }

    try {
      await setAdminMutation.mutateAsync({ wallet: w, role: adminRoleToSet });
      toast.success(`Admin updated: ${adminRoleToSet}`);
      setAdminTargetWallet("");
      // обновим админ-статы чтобы сразу видеть изменения
      await adminStatsQuery.refetch();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  };

  const doRevokeAdmin = async () => {
    const w = adminTargetWallet.trim().toLowerCase();
    if (!w) {
      toast.error("Enter wallet");
      return;
    }
    if (!w.startsWith("0x") || w.length < 42) {
      toast.error("Invalid wallet");
      return;
    }
    if (!revokeAdminMutation) {
      toast.error("Backend: referral.revokeAdmin is not implemented yet");
      return;
    }

    try {
      await revokeAdminMutation.mutateAsync({ wallet: w });
      toast.success("Admin revoked");
      setAdminTargetWallet("");
      await adminStatsQuery.refetch();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  };

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
                <p className="text-sm font-medium">{formatAddress(account)}</p>
                <p className="text-xs text-gray-500">Referral dashboard</p>
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
              disabled={isConnecting}
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
                value={isLoading ? "…" : data?.totals?.total_usdt ?? "0"}
                icon={<TrendingUp />}
              />
              <StatCard
                title="Total Tokens"
                value={isLoading ? "…" : data?.totals?.total_tokens ?? "0"}
                icon={<Clock />}
              />
              <StatCard
                title="Referrals"
                value={isLoading ? "…" : String(data?.referrals?.length ?? 0)}
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
                <Button
                  onClick={copyReferralLink}
                  className="bg-black text-white"
                >
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
                Aggregated referral performance{" "}
                <span className="ml-2 text-xs text-gray-500">
                  (role: {effectiveRole})
                </span>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* ADMIN CRUD (пункт 1) — показываем только write */}
              {canWrite ? (
                <div className="p-4 border rounded-2xl bg-white/70">
                  <p className="font-medium mb-3">Admin management</p>

                  <div className="flex flex-col md:flex-row gap-3">
                    <input
                      value={adminTargetWallet}
                      onChange={(e) => setAdminTargetWallet(e.target.value)}
                      placeholder="Wallet address (0x...)"
                      className="flex-1 rounded-xl border px-3 py-2 text-sm"
                    />

                    <select
                      value={adminRoleToSet}
                      onChange={(e) => setAdminRoleToSet(e.target.value as any)}
                      className="rounded-xl border px-3 py-2 text-sm"
                    >
                      <option value="read">read</option>
                      <option value="write">write</option>
                    </select>

                    <Button
                      onClick={doSetAdmin}
                      className="bg-black text-white"
                      disabled={setAdminMutation?.isPending}
                    >
                      {setAdminMutation?.isPending ? "Saving..." : "Set admin"}
                    </Button>

                    <Button
                      onClick={doRevokeAdmin}
                      variant="outline"
                      disabled={revokeAdminMutation?.isPending}
                    >
                      {revokeAdminMutation?.isPending
                        ? "Removing..."
                        : "Revoke"}
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    read = view stats only · write = manage admins
                  </p>
                </div>
              ) : (
                <div className="p-4 border rounded-2xl bg-white/50">
                  <p className="text-sm text-gray-600">
                    You have <b>read</b> access. Admin management is available
                    only for <b>write</b> admins.
                  </p>
                </div>
              )}

              {/* STATS (как было) */}
              {adminStatsQuery.isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <div className="space-y-3">
                  {!adminStatsQuery.data?.length ? (
                    <p className="text-sm text-gray-500">
                      No referral data yet.
                    </p>
                  ) : (
                    adminStatsQuery.data?.map((row: any) => (
                      <div
                        key={row.referrer_wallet}
                        className="p-4 border rounded-2xl flex justify-between"
                      >
                        <span>{formatAddress(row.referrer_wallet)}</span>
                        <span>{row.referrals_count} refs</span>
                        <span>{row.total_usdt} USDT</span>
                      </div>
                    ))
                  )}
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
