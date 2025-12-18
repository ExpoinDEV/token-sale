import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

function shortWallet(w: string) {
  return w.slice(0, 6) + "…" + w.slice(-4);
}

export default function AdminReferrals() {
  const [wallet, setWallet] = useState<string | null>(null);

  // Берём подключённый кошелёк напрямую из window.ethereum
  useEffect(() => {
    async function loadWallet() {
      if (!(window as any).ethereum) return;
      const accounts = await (window as any).ethereum.request({
        method: "eth_accounts",
      });
      if (accounts?.[0]) setWallet(accounts[0]);
    }
    loadWallet();
  }, []);

  const adminCheck = trpc.referral.isAdmin.useQuery(
    { wallet: wallet ?? "" },
    { enabled: !!wallet }
  );

  const statsQuery = trpc.referral.adminStats.useQuery(
    { wallet: wallet ?? "" },
    { enabled: adminCheck.data?.isAdmin === true }
  );

  if (!wallet) {
    return (
      <div className="p-10 text-center text-gray-600">
        Connect wallet to access admin panel
      </div>
    );
  }

  if (adminCheck.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!adminCheck.data?.isAdmin) {
    return (
      <div className="p-10 text-center text-red-600 font-semibold">
        Access denied
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Referral Admin Dashboard</CardTitle>
        </CardHeader>

        <CardContent>
          {statsQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Referrals</TableHead>
                  <TableHead>Total USDT</TableHead>
                  <TableHead>Total Tokens</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {statsQuery.data?.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{shortWallet(row.referrer_wallet)}</TableCell>
                    <TableCell>{row.referrals_count}</TableCell>
                    <TableCell>{row.total_usdt}</TableCell>
                    <TableCell>{row.total_tokens}</TableCell>
                    <TableCell>{row.last_activity ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

