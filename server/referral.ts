       import { z } from "zod";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { router, publicProcedure } from "./_core/trpc";

const wallet = z.string().min(3).max(80);

export const referralRouter = router({
  // =========================
  // CAPTURE REFERRAL
  // =========================
  capture: publicProcedure
    .input(
      z.object({
        referrer: wallet,
        buyer: wallet,
      })
    )
    .mutation(async ({ input }) => {
      const referrer = input.referrer.toLowerCase();
      const buyer = input.buyer.toLowerCase();

      if (referrer === buyer) {
        return { ok: true };
      }

      const db = await getDb();
      if (!db) return { ok: true };

      await db.execute(
        sql`
          INSERT IGNORE INTO referral_links
          (referrer_wallet, referral_wallet)
          VALUES (${referrer}, ${buyer})
        `
      );

      return { ok: true };
    }),

  // =========================
  // RECORD PURCHASE
  // =========================
  recordPurchase: publicProcedure
    .input(
      z.object({
        buyer: wallet,
        txHash: z.string().min(10),
        usdtAmount: z.string(),
        tokensAmount: z.string(),
        chainId: z.number().default(56),
        referrer: wallet.optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { ok: true };

      const buyer = input.buyer.toLowerCase();
      let referrer = input.referrer?.toLowerCase() || null;

      if (!referrer) {
        const [rows]: any = await db.execute(
          sql`
            SELECT referrer_wallet
            FROM referral_links
            WHERE referral_wallet = ${buyer}
            LIMIT 1
          `
        );
        referrer = rows?.[0]?.referrer_wallet || null;
      }

      await db.execute(
        sql`
          INSERT IGNORE INTO referral_purchases
          (
            buyer_wallet,
            referrer_wallet,
            usdt_amount,
            tokens_amount,
            tx_hash,
            chain_id
          )
          VALUES (
            ${buyer},
            ${referrer},
            ${input.usdtAmount},
            ${input.tokensAmount},
            ${input.txHash},
            ${input.chainId}
          )
        `
      );

      return { ok: true };
    }),

  // =========================
  // USER DASHBOARD DATA
  // =========================
  getUserData: publicProcedure
    .input(z.object({ wallet }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return {
          referrals: [],
          purchases: [],
          totals: { total_usdt: "0", total_tokens: "0" },
        };
      }

      const w = input.wallet.toLowerCase();

      const [refs]: any = await db.execute(
        sql`
          SELECT referral_wallet, created_at
          FROM referral_links
          WHERE referrer_wallet = ${w}
          ORDER BY created_at DESC
        `
      );

      const [purchases]: any = await db.execute(
        sql`
          SELECT
            buyer_wallet,
            usdt_amount,
            tokens_amount,
            tx_hash,
            created_at
          FROM referral_purchases
          WHERE referrer_wallet = ${w}
          ORDER BY created_at DESC
        `
      );

      const [totals]: any = await db.execute(
        sql`
          SELECT
            COALESCE(SUM(usdt_amount), 0) AS total_usdt,
            COALESCE(SUM(tokens_amount), 0) AS total_tokens
          FROM referral_purchases
          WHERE referrer_wallet = ${w}
        `
      );

      return {
        referrals: refs,
        purchases,
        totals: totals?.[0] ?? {
          total_usdt: "0",
          total_tokens: "0",
        },
      };
    }),

  // =========================
  // ADMIN CHECK
  // =========================
  isAdmin: publicProcedure
    .input(z.object({ wallet }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { isAdmin: false };

      const [rows]: any = await db.execute(
        sql`
          SELECT wallet
          FROM referral_admins
          WHERE wallet = ${input.wallet.toLowerCase()}
          LIMIT 1
        `
      );

      return { isAdmin: !!rows?.[0] };
    }),

  // =========================
  // ADMIN STATS (MUTATION!)
  // =========================
  adminStats: publicProcedure
    .input(z.object({ wallet }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const adminWallet = input.wallet.toLowerCase();

      // Проверка админа
      const [adminRows]: any = await db.execute(
        sql`
          SELECT wallet
          FROM referral_admins
          WHERE wallet = ${adminWallet}
          LIMIT 1
        `
      );

      if (!adminRows?.[0]) {
        throw new Error("Not authorized");
      }

      // Агрегированная статистика
      const [rows]: any = await db.execute(
        sql`
          SELECT
            rl.referrer_wallet                 AS referrer_wallet,
            COUNT(DISTINCT rl.referral_wallet) AS referrals_count,
            COALESCE(SUM(rp.usdt_amount), 0)   AS total_usdt,
            COALESCE(SUM(rp.tokens_amount), 0) AS total_tokens,
            MAX(rp.created_at)                 AS last_activity
          FROM referral_links rl
          LEFT JOIN referral_purchases rp
            ON rp.referrer_wallet = rl.referrer_wallet
          GROUP BY rl.referrer_wallet
          ORDER BY total_usdt DESC
        `
      );

      return rows;
    }),
});

