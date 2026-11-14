import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAccount } from "@/components/account-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account")({ head: () => ({ meta: [
  { title: "Your Profile — SentinelLab" }, { name: "description", content: "Manage your SentinelLab analyst profile." },
  { property: "og:title", content: "Your Profile — SentinelLab" }, { property: "og:description", content: "Your SentinelLab account profile." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: Profile });
function Profile() {
  const { account, refresh } = useAccount(); const [name, setName] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  return <div className="max-w-lg space-y-6"><h1 className="text-2xl font-semibold">Your profile</h1><p className="break-words text-muted-foreground">{account?.profile.email}</p><form className="space-y-4" onSubmit={async (e) => {
    e.preventDefault(); if (!account) return; setBusy(true);
    const { error } = await supabase.from("profiles").update({ display_name: (name ?? account.profile.display_name).trim() }).eq("id", account.profile.id);
    if (error) toast.error(error.message); else { await refresh(); toast.success("Profile saved."); } setBusy(false);
  }}><label className="block space-y-2 text-sm"><span>Display name</span><Input required maxLength={80} value={name ?? account?.profile.display_name ?? ""} onChange={(e) => setName(e.target.value)} /></label><Button disabled={busy || !account}>Save profile</Button></form></div>;
}