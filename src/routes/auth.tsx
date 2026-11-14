import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Activity, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/components/account-provider";
import { AccountSignOut } from "@/components/account-sign-out";
import { canAccessLab } from "@/lib/account-access";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in & Register — SentinelLab" },
    { name: "description", content: "Register for SentinelLab SOC training or sign in to your approved account." },
    { property: "og:title", content: "Sign in — SentinelLab" },
    { property: "og:description", content: "Email sign-in and registration for SentinelLab." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { account, refresh } = useAccount();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim() } } });
        if (error) throw error;
        setMessage(data.session ? "Registration submitted. Your account is awaiting administrator approval." : "Check your email to confirm your account. Administrator approval is also required before access.");
        setPassword(""); if (data.session) await refresh();
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setMessage("If an account exists, a password reset link has been sent to your email.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError || !user.user) throw new Error("Please sign in again.");
        const approval = await supabase.from("account_approvals").select("status").eq("user_id", user.user.id).single();
        if (approval.error) throw new Error("Unable to check account approval. Please try again.");
        await refresh(); setPassword("");
        if (canAccessLab(approval.data.status)) await navigate({ to: "/dashboard", replace: true });
      }
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to continue. Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
    <div className="w-full max-w-sm">
      <div className="mb-8 flex items-center gap-3"><Activity className="size-8 text-primary" /><h1 className="font-mono text-3xl font-bold">SentinelLab</h1></div>
      {account ? <div className="space-y-5">
        <ShieldCheck className="size-9 text-primary" />
        <h2 className="text-xl font-semibold">{canAccessLab(account.status) ? "Your account is ready" : account.status === "rejected" ? "Account not approved" : "Awaiting admin approval"}</h2>
        <p className="break-words text-sm text-muted-foreground">{account.profile.email}</p>
        <p className="text-sm text-muted-foreground">{canAccessLab(account.status) ? `Welcome, ${account.profile.display_name || "analyst"}.` : account.status === "rejected" ? "Your registration was declined. Contact your administrator." : "Your registration has been received. You can access the lab after your administrator approves your account."}</p>
        <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={async () => { setBusy(true); try { await refresh(); if (canAccessLab(account.status)) await navigate({ to: "/dashboard" }); } finally { setBusy(false); } }}>{canAccessLab(account.status) ? "Open lab" : "Check approval"}</Button><AccountSignOut /></div>
      </div> : <>
        <h2 className="mb-5 text-xl font-semibold">{mode === "register" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Sign in"}</h2>
        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && <label className="block space-y-2 text-sm"><span>Display name</span><Input required maxLength={80} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>}
          <label className="block space-y-2 text-sm"><span>Email</span><Input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          {mode !== "forgot" && <label className="block space-y-2 text-sm"><span>Password</span><Input required type="password" minLength={mode === "register" ? 8 : undefined} autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} /></label>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {message && <p role="status" className="text-sm text-primary">{message}</p>}
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Please wait…" : mode === "register" ? "Register" : mode === "forgot" ? "Send reset link" : "Sign in"}</Button>
        </form>
        <div className="mt-4 flex flex-wrap justify-between gap-2">
          <Button variant="link" className="px-0" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setMessage(""); setPassword(""); }}>{mode === "login" ? "Create an account" : "Back to sign in"}</Button>
          {mode === "login" && <Button variant="link" className="px-0" onClick={() => { setMode("forgot"); setError(""); setMessage(""); }}>Forgot password?</Button>}
        </div>
        {mode === "register" && <p className="mt-4 text-sm text-muted-foreground">Email confirmation and administrator approval are required before you can access the lab.</p>}
      </>}
    </div>
  </div>;
}