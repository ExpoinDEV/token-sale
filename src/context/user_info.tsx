import { createContext } from "react";

export const UserInfoContext = createContext<any>({
  balance: undefined,
  setBalance: (value: string) => {},
  walletType: undefined,
  setWalletType: (value: string) => {},
  isConnected: false,
  setIsConnected: (value: boolean) => {},
});
