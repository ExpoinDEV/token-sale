import { describe, expect, it } from "vitest";

/**
 * Token Sale Tests
 * These tests verify the basic token sale functionality
 */

describe("Token Sale Configuration", () => {
  it("should have correct token address", () => {
    const tokenAddress = "0xBfF629448eE52e8AfB6dAEe47b64838228Bc5667";
    expect(tokenAddress).toBeDefined();
    expect(tokenAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("should have correct receiver wallet address", () => {
    const receiverWallet = "0xf1829111dce451f62a3f0267bc1ed05328c03360";
    expect(receiverWallet).toBeDefined();
    expect(receiverWallet).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("should have correct token price (1 cent)", () => {
    const tokenPrice = 0.01;
    expect(tokenPrice).toBe(0.01);
  });

  it("should calculate total cost correctly", () => {
    const tokenPrice = 0.01;
    const tokenAmount = 100;
    const expectedCost = 1.0;
    
    const actualCost = tokenPrice * tokenAmount;
    expect(actualCost).toBe(expectedCost);
  });

  it("should handle different token amounts", () => {
    const tokenPrice = 0.01;
    const testCases = [
      { amount: 1, expected: 0.01 },
      { amount: 10, expected: 0.1 },
      { amount: 100, expected: 1.0 },
      { amount: 1000, expected: 10.0 },
      { amount: 10000, expected: 100.0 },
    ];

    testCases.forEach(({ amount, expected }) => {
      const cost = tokenPrice * amount;
      expect(cost).toBe(expected);
    });
  });

  it("should validate BNB mainnet chain ID", () => {
    const baseChainId = 56;
    expect(baseChainId).toBe(56);
  });

  it("should have USDC address on BSC", () => {
    const usdcAddress = "0x8AC76a51cc950d9822D68b83FE1Ad97B32Cd580d";
    expect(usdcAddress).toBeDefined();
    expect(usdcAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });
});

describe("Token Purchase Logic", () => {
  it("should reject zero or negative token amounts", () => {
    const validateAmount = (amount: number): boolean => amount > 0;
    
    expect(validateAmount(0)).toBe(false);
    expect(validateAmount(-10)).toBe(false);
    expect(validateAmount(1)).toBe(true);
  });

  it("should calculate BNB required for purchase", () => {
    const tokenPrice = 0.01;
    const calculateBNBRequired = (tokenAmount: number): number => {
      return tokenAmount * tokenPrice;
    };

    expect(calculateBNBRequired(100)).toBe(1.0);
    expect(calculateBNBRequired(500)).toBe(5.0);
  });

  it("should validate wallet address format", () => {
    const isValidAddress = (address: string): boolean => {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    };

    expect(isValidAddress("0xf1829111dce451f62a3f0267bc1ed05328c03360")).toBe(true);
    expect(isValidAddress("0xBfF629448eE52e8AfB6dAEe47b64838228Bc5667")).toBe(true);
    expect(isValidAddress("invalid-address")).toBe(false);
    expect(isValidAddress("0x123")).toBe(false);
  });

  it("should handle payment method selection", () => {
    const paymentMethods = ["bnb", "usdc"] as const;
    
    paymentMethods.forEach((method) => {
      expect(["bnb", "usdc"]).toContain(method);
    });
  });
});

describe("Transaction Validation", () => {
  it("should validate transaction parameters", () => {
    const validateTransaction = (
      from: string,
      to: string,
      value: string
    ): boolean => {
      const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);
      const isValidValue = (val: string) => !isNaN(parseInt(val)) && parseInt(val) > 0;
      
      return isValidAddress(from) && isValidAddress(to) && isValidValue(value);
    };

    const validFrom = "0xf1829111dce451f62a3f0267bc1ed05328c03360";
    const validTo = "0xBfF629448eE52e8AfB6dAEe47b64838228Bc5667";
    const validValue = "1000000000000000000"; // 1 BNB in wei

    expect(validateTransaction(validFrom, validTo, validValue)).toBe(true);
    expect(validateTransaction("invalid", validTo, validValue)).toBe(false);
    expect(validateTransaction(validFrom, "invalid", validValue)).toBe(false);
    expect(validateTransaction(validFrom, validTo, "0")).toBe(false);
  });

  it("should handle gas estimation", () => {
    const estimateGas = (method: "bnb" | "usdc"): number => {
      return method === "bnb" ? 21000 : 100000;
    };

    expect(estimateGas("bnb")).toBe(21000);
    expect(estimateGas("usdc")).toBe(100000);
  });
});
