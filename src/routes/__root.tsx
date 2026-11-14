import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Activity, FileText, GraduationCap, LayoutDashboard, ScrollText, ShieldAlert, SlidersHorizontal } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { actions, startTicker, useSim } from "@/lib/sim/store";
import { AccountProvider, useAccount } from "@/components/account-provider";
import { AccountSignOut } from "@/components/account-sign-out";
import { Button } from "@/components/ui/button";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-mono text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Back to SOC
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try refreshing or head back home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SentinelLab — SOC Training Simulator" },
      { name: "description", content: "Blue team incident detection and response simulator." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const NAV = [
  { to: "/dashboard", label: "SOC Dashboard", icon: LayoutDashboard },
  { to: "/logs", label: "Log Analysis", icon: ScrollText },
  { to: "/rules", label: "Detection Rules", icon: SlidersHorizontal },
  { to: "/incidents", label: "Investigations", icon: ShieldAlert },
  { to: "/training", label: "Training & CTF", icon: GraduationCap },
  { to: "/reports", label: "Reports", icon: FileText },
] as const;

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return <QueryClientProvider client={queryClient}><AccountProvider><AppLayout /><Toaster /></AccountProvider></QueryClientProvider>;
}

function AppLayout() {
  const path = useLocation({ select: (location) => location.pathname });
  const { account } = useAccount();
  if (path === "/" || path === "/auth" || path === "/reset-password") return <Outlet />;
  return <SocLayout account={account} />;
}

function SocLayout({ account }: { account: ReturnType<typeof useAccount>["account"] }) {
  useEffect(() => startTicker(), []);
  const running = useSim((s) => s.running);
  const critical = useSim((s) => s.engine.incidents.filter((i) => i.state === "INCIDENT_CRITICAL" && i.status !== "closed").length);
  const clock = useSim((s) => s.engine.simClock);

  return (
      <div className="flex min-h-screen">
        <aside className="no-print sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
          <div className="border-b border-sidebar-border px-5 py-5">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <span className="font-mono text-lg font-bold tracking-tight">SentinelLab</span>
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Blue Team SOC Simulator</p>
          </div>
          <nav className="flex-1 space-y-0.5 p-3">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/dashboard" }}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                activeProps={{ className: "bg-sidebar-accent text-foreground border-l-2 border-primary" }}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
                {n.to === "/incidents" && critical > 0 && (
                  <span className="ml-auto rounded-sm bg-sev-critical px-1.5 font-mono text-[10px] text-primary-foreground">{critical}</span>
                )}
              </Link>
            ))}
          </nav>
          <div className="space-y-2 border-t border-sidebar-border p-4 font-mono text-[11px] text-muted-foreground">
            {account?.isAdmin && <Button asChild variant="outline" size="sm" className="w-full"><Link to="/admin">Account approvals</Link></Button>}
            <Button asChild variant="ghost" size="sm" className="w-full"><Link to="/account">{account?.profile.display_name || "Your profile"}</Link></Button>
            <AccountSignOut />
            <div className="flex items-center justify-between">
              <span>SIM CLOCK</span>
              <span className="text-foreground">{new Date(clock).toISOString().slice(11, 19)}Z</span>
            </div>
            <button onClick={actions.toggleRunning} className="flex w-full items-center justify-between rounded border border-border px-2 py-1.5 hover:bg-sidebar-accent">
              <span>FEED</span>
              <span className={running ? "text-primary" : "text-sev-medium"}>{running ? "● LIVE" : "❚❚ PAUSED"}</span>
            </button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-8 py-7">
          <Outlet />
        </main>
      </div>
  );
}
