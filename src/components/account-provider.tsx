import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getAccount } from "@/lib/accounts.functions";
import { supabase } from "@/integrations/supabase/client";
import { actions } from "@/lib/sim/store";

type Account = Awaited<ReturnType<typeof getAccount>>;
const AccountContext = createContext<{ account: Account | null; refresh: () => Promise<void> }>({ account: null, refresh: async () => {} });
export const useAccount = () => useContext(AccountContext);

export function AccountProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const fetchAccount = useServerFn(getAccount);
  const [account, setAccount] = useState<Account | null>(null);
  async function refresh() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) { setAccount(null); return; }
    try { setAccount(await fetchAccount()); } catch { setAccount(null); }
  }
  useEffect(() => {
    void refresh();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      if (event === "SIGNED_OUT") { setAccount(null); actions.reset(); }
      else { void refresh(); router.options.context.queryClient.invalidateQueries(); }
      void router.invalidate();
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return <AccountContext.Provider value={{ account, refresh }}>{children}</AccountContext.Provider>;
}