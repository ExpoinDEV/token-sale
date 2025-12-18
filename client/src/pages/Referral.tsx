import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Wallet, LogOut, Users, TrendingUp, Clock, Copy } from "lucide-react";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const REF_STORAGE_KEY = "expoin-referrer";

function formatAddress(address: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function safeGetReferrer(): string {
  try {
    return localStorage.getItem(REF_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function safeClearReferrer() {
  try {
    localStorage.removeItem(REF_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default function Referral() {
  const [account, setAccount] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // чтобы баннер "Active referral" обновлялся без перезагрузки
  const [storedReferrer, setStoredReferrer] = useState<string>("");

  useEffect(() => {
    setStoredReferrer(safeGetReferrer());
  }, [account]);

  // ===== Wallet UX (как в TokenSale): кнопка открывает выбор кошелька =====
  const showWalletSelection = () => setShowWalletModal(true);

  const connectWallet = async (
    _walletType: "metamask" | "trustwallet" | "rabby" | "okx" | "safepal" | "binance" = "metamask"
  ) => {
    setShowWalletModal(false);

    // Block Phantom wallet (как у вас было)
    if ((window as any).phantom?.ethereum) {
      toast.error(
        "Phantom wallet is not supported. Please use MetaMask, Rabby, OKX, SafePal, Binance Web3, or Trust Wallet."
      );
      return;
    }

    if (!window.ethereum) {
      toast.error("Please install a Web3 wallet!");
      return;
    }

    try {
      setIsConnecting(true);

      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) throw new Error("No accounts found");

      setAccount(accounts[0]);
      toast.success("Wallet connected!");
    } catch (error: any) {
      console.error("Error connecting wallet:", error);

      if (error?.code === 4001) toast.error("Connection rejected by user");
      else if (error?.code === -32002) toast.error("Connection request already pending. Please check your wallet.");
      else toast.error(error?.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      setAccount("");

      if (window.ethereum?.request) {
        try {
          await window.ethereum.request({
            method: "wallet_revokePermissions",
            params: [{ eth_accounts: {} }],
          });
        } catch {
          // ignore
        }
      }

      toast.success("Wallet disconnected");
    } catch {
      toast.success("Wallet disconnected");
    }
  };

  // автоподключение (как в TokenSale)
  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) return;
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts?.length) setAccount(accounts[0]);
      } catch {
        // ignore
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts?.length) setAccount(accounts[0]);
      else setAccount("");
    };
    const handleChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  // ===== Data =====
  const walletLower = useMemo(() => (account ? account.toLowerCase() : ""), [account]);

  const userDataQuery = trpc.referral.getUserData.useQuery({ wallet: walletLower }, { enabled: !!walletLower });
  const data = userDataQuery.data;
  const isLoading = userDataQuery.isLoading;

  const referralLink = useMemo(() => {
    if (!walletLower) return "";
    // важно: origin доступен только в браузере
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/r/${walletLower}`;
  }, [walletLower]);

  const copyReferralLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("Referral link copied");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const clearStoredReferrer = () => {
    safeClearReferrer();
    setStoredReferrer("");
    toast.success("Referral code cleared");
  };

  // ===== UI =====
  return (
    <div className="min-h-screen" style={{ background: "#E8E4F3" }}>
      {/* Header — в стиле TokenSale */}
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
                <p className="text-xs text-gray-500">Referral dashboard</p>
              </div>

              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #00D9FF 0%, #6B5DD3 100%)" }}
              >
                <Wallet className="w-5 h-5 text-white" />
              </div>

              <Button onClick={disconnectWallet} variant="outline" size="sm" className="rounded-full border-2 hover:bg-gray-50">
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
              style={{ background: "#000000" }}
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

      <main className="container mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">Referral Program</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">Share your link and track referrals and purchases.</p>
        </div>

        {/* Active referral banner */}
        {storedReferrer ? (
          <div className="max-w-4xl mx-auto mb-10">
            <Card className="rounded-3xl border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl">Active referral</CardTitle>
                <CardDescription>This wallet will receive cashback rewards for your purchases.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm text-gray-700 break-all">{storedReferrer}</div>
                <Button onClick={clearStoredReferrer} variant="outline" className="rounded-full">
                  Clear
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {!account ? (
          <div className="max-w-4xl mx-auto">
            <Card className="rounded-3xl border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl">Connect your wallet</CardTitle>
                <CardDescription>Connect a Web3 wallet to view your referral stats.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={showWalletSelection}
                  size="lg"
                  className="rounded-full text-white font-semibold px-8"
                  style={{ background: "#000000" }}
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
                <p className="text-xs text-gray-500 mt-3">The page renders without data until you connect.</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-3xl shadow-lg overflow-hidden p-6" style={{ background: "linear-gradient(135deg, #00D9FF 0%, #6B5DD3 100%)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-white/80" />
                  <p className="text-sm font-medium text-white/80">Total USDT Volume</p>
                </div>
                <p className="text-4xl font-bold text-white">{isLoading ? "…" : (data?.totals?.total_usdt ?? "0")}</p>
                <p className="text-sm text-white/80 mt-1">Across referral purchases</p>
              </div>

              <div className="rounded-3xl shadow-lg overflow-hidden p-6" style={{ background: "linear-gradient(135deg, #6B5DD3 0%, #9D8FE8 100%)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-white/80" />
                  <p className="text-sm font-medium text-white/80">Total Tokens</p>
                </div>
                <p className="text-4xl font-bold text-white">{isLoading ? "…" : (data?.totals?.total_tokens ?? "0")}</p>
                <p className="text-sm text-white/80 mt-1">Bought by referrals</p>
              </div>

              <div className="rounded-3xl shadow-lg overflow-hidden p-6" style={{ background: "linear-gradient(135deg, #111827 0%, #000000 100%)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-white/80" />
                  <p className="text-sm font-medium text-white/80">Referrals</p>
                </div>
                <p className="text-4xl font-bold text-white">{isLoading ? "…" : String(data?.referrals?.length ?? 0)}</p>
                <p className="text-sm text-white/80 mt-1">Direct (1 level)</p>
              </div>
            </div>

            {/* Referral link */}
            <Card className="rounded-3xl border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl">Your referral link</CardTitle>
                <CardDescription>Share this link to invite users.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 mb-1">Link</p>
                  <p className="font-semibold text-gray-900 break-all">{referralLink}</p>
                  <p className="text-xs text-gray-500 mt-1">Code: {formatAddress(walletLower)}</p>
                </div>
                <Button onClick={copyReferralLink} className="rounded-full text-white" style={{ background: "#000000" }}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </CardContent>
            </Card>

            {/* Tree + Purchases */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Tree / Referrals */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="rounded-3xl border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl">Referral tree</CardTitle>
                    <CardDescription>Direct referrals only (1 level)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 border rounded-2xl bg-white space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        <p className="text-sm font-semibold text-gray-900">You</p>
                      </div>

                      <div className="pl-6 space-y-2">
                        {isLoading ? (
                          <div className="flex items-center gap-3 text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <p className="text-sm">Loading…</p>
                          </div>
                        ) : !data?.referrals?.length ? (
                          <div className="flex items-center gap-3 text-gray-500">
                            <div className="w-2 h-2 rounded-full bg-gray-300" />
                            <p className="text-sm">No referrals yet</p>
                          </div>
                        ) : (
                          data.referrals.slice(0, 50).map((r: any) => (
                            <div key={r.referral_wallet} className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-gray-400" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{formatAddress(r.referral_wallet)}</p>
                                <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl" style={{ background: "#F3F4F6" }}>
                      <p className="text-sm font-semibold text-gray-900 mb-1">Your referrals (list)</p>
                      {isLoading ? (
                        <div className="text-gray-500 text-sm flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                        </div>
                      ) : !data?.referrals?.length ? (
                        <p className="text-sm text-gray-500">No referrals yet</p>
                      ) : (
                        <div className="space-y-2">
                          {data.referrals.slice(0, 20).map((r: any) => (
                            <div key={r.referral_wallet} className="flex items-center justify-between p-3 border rounded-2xl bg-white">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{formatAddress(r.referral_wallet)}</p>
                                <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Purchases */}
              <div className="lg:col-span-2">
                <Card className="rounded-3xl border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl">Referral purchases</CardTitle>
                    <CardDescription>Latest purchases made by your referrals</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-10 text-gray-500">
                        <Loader2 className="w-6 h-6 mx-auto mb-3 animate-spin" />
                        <p className="text-sm">Loading…</p>
                      </div>
                    ) : !data?.purchases?.length ? (
                      <div className="text-center py-10 text-gray-500">
                        <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No purchases yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {data.purchases.slice(0, 30).map((p: any) => (
                          <div key={p.tx_hash} className="p-4 border rounded-2xl hover:bg-gray-50 transition-colors">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900">Buyer: {formatAddress(p.buyer_wallet)}</p>
                                <p className="text-xs text-gray-500">{new Date(p.created_at).toLocaleString()}</p>
                              </div>
                              <div className="flex gap-6 text-sm">
                                <div>
                                  <p className="text-xs text-gray-500">USDT</p>
                                  <p className="font-semibold text-gray-900">{p.usdt_amount}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Tokens</p>
                                  <p className="font-semibold text-gray-900">{p.tokens_amount}</p>
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 break-all">Tx: {p.tx_hash}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Selection Modal — выбор кошелька */}
        <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Connect Wallet</DialogTitle>
              <DialogDescription>Choose your preferred wallet to connect</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-4">
              <WalletChoice label="MetaMask" onClick={() => connectWallet("metamask")} />
              <WalletChoice label="Rabby" onClick={() => connectWallet("rabby")} />
              <WalletChoice label="OKX Wallet" onClick={() => connectWallet("okx")} />
              <WalletChoice label="SafePal" onClick={() => connectWallet("safepal")} />
              <WalletChoice label="Binance Web3 Wallet" onClick={() => connectWallet("binance")} />
              <WalletChoice label="Trust Wallet" onClick={() => connectWallet("trustwallet")} />
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
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
  );
}
