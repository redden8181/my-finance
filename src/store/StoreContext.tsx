import { createContext, useContext, type ReactNode } from "react";
import { useStore, type Store } from "./useStore";

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useAppStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useAppStore должен использоваться внутри StoreProvider");
  return ctx;
}
