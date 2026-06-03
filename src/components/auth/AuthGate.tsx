import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AuthModal } from "./AuthModal";
import { SearchOverlay } from "@/components/books/SearchOverlay";
import { OnboardingModal } from "./OnboardingModal";
import { useAuth } from "@/lib/auth-context";

interface GateCtx {
  openAuth: () => void;
  openSearch: () => void;
  /** Runs cb if signed in; otherwise opens the auth modal. */
  requireAuth: (cb: () => void) => void;
}
const Ctx = createContext<GateCtx>({ openAuth: () => {}, openSearch: () => {}, requireAuth: () => {} });

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user } = useAuth();

  const openAuth = useCallback(() => setAuthOpen(true), []);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const requireAuth = useCallback(
    (cb: () => void) => {
      if (user) {
        cb();
      } else {
        setAuthOpen(true);
      }
    },
    [user]
  );

  return (
    <Ctx.Provider value={{ openAuth, openSearch, requireAuth }}>
      {children}
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      <SearchOverlay
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onRequireAuth={() => { setSearchOpen(false); setAuthOpen(true); }}
      />
      <OnboardingModal />
    </Ctx.Provider>
  );
}

export const useGate = () => useContext(Ctx);
