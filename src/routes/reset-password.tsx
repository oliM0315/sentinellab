import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({ head: () => ({ meta: [
  { title: "Reset Password — SentinelLab" }, { name: "description", content: "Choose a new password for your SentinelLab account." },
  { property: "og:title", content: "Reset Password — SentinelLab" }, { property: "og:description", content: "Secure password recovery for SentinelLab." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: ResetPassword });
function ResetPassword() {
  const [valid, setValid] = useState(false); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { setValid(new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery" || new URLSearchParams(window.location.search).get("type") === "recovery"); }, []);
  return <div className="flex min-h-screen items-center justify-center px-5"><div className="w-full max-w-sm space-y-5"><h1 className="font-mono text-2xl font-bold">SentinelLab</h1><h2 className="text-xl">Reset password</h2>{valid ? <form className="space-y-4" onSubmit={async (e) => {
    e.preventDefault(); setError(""); if (password !== confirm) { setError("Passwords do not match."); return; } setBusy(true);
    const { error } = await supabase.auth.updateUser({ password }); setBusy(false);
    if (error) { setError(error.message); return; } await navigate({ to: "/auth", replace: true });
  }}><label className="block space-y-2"><span>New password</span><Input type="password" minLength={8} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label><label className="block space-y-2"><span>Confirm password</span><Input type="password" minLength={8} required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>{error && <p role="alert" className="text-destructive">{error}</p>}<Button disabled={busy}>Save password</Button></form> : <><p className="text-muted-foreground">Open the password recovery link from your email to reset your password.</p><Button onClick={() => navigate({ to: "/auth" })}>Back to sign in</Button></>}</div></div>;
}