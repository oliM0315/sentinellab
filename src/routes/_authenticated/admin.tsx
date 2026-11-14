import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import { listAccounts, reviewAccount } from "@/lib/accounts.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const accountOptions = { queryKey: ["admin-accounts"], queryFn: () => listAccounts() };
export const Route = createFileRoute("/_authenticated/admin")({
  loader: ({ context }) => context.queryClient.ensureQueryData(accountOptions),
  head: () => ({ meta: [
    { title: "Account Approvals — SentinelLab" }, { name: "description", content: "Administrator review of SentinelLab account registrations." },
    { property: "og:title", content: "Account Approvals — SentinelLab" }, { property: "og:description", content: "Review analyst registrations and approve access." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: AdminPage,
});
function AdminPage() {
  const { data, refetch, isFetching } = useSuspenseQuery(accountOptions); const review = useServerFn(reviewAccount); const [busy, setBusy] = useState<string | null>(null);
  async function decide(userId: string, status: "approved" | "rejected") {
    setBusy(userId); try { await review({ data: { userId, status } }); await refetch(); toast.success(status === "approved" ? "Account approved." : "Account rejected."); } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to review account."); } finally { setBusy(null); }
  }
  return <div><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-xs text-primary">ADMINISTRATION</p><h1 className="mt-2 text-2xl font-semibold">Account approvals</h1></div><Button variant="outline" disabled={isFetching} onClick={() => refetch()}><RefreshCw />Refresh</Button></div><div className="divide-y divide-border border-y border-border">{data.map((user) => {
    const status = user.account_approvals?.status ?? "pending";
    return <div key={user.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="font-medium">{user.display_name || "Analyst"}</p><p className="break-all text-sm text-muted-foreground">{user.email}</p><p className="mt-1 font-mono text-xs text-primary">{status.toUpperCase()}</p></div>{status !== "approved" && <div className="flex gap-2"><Button size="sm" disabled={busy !== null} onClick={() => decide(user.id, "approved")}><Check />Approve</Button>{status !== "rejected" && <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => decide(user.id, "rejected")}><X />Reject</Button>}</div>}</div>;
  })}</div></div>;
}