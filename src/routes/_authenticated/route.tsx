import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { canAccessLab } from "@/lib/account-access";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const approval = await supabase.from("account_approvals").select("status").eq("user_id", data.user.id).single();
    if (approval.error || !canAccessLab(approval.data?.status)) throw redirect({ to: "/auth" });
  },
  component: Outlet,
});