import { BrandLogo } from "@/components/brand-logo";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import {
  BadgeIndianRupee,
  FileSignature,
  FileText,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Settings,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useProfile, useRoles } from "@/hooks/use-auth";

const GoldenTunnelBackground = lazy(() => import("@/components/GoldenTunnelBackground"));

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardLayout,
});

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true, staffOnly: false },
  { to: "/dashboard/scenarios", label: "Saved scenarios", icon: Layers, exact: false, staffOnly: false },
  { to: "/dashboard/contract-roi", label: "Contract ROI", icon: FileText, exact: false, staffOnly: false },
  { to: "/dashboard/pipeline", label: "Pipeline & deals", icon: KanbanSquare, exact: false, staffOnly: false },
  { to: "/dashboard/contracts", label: "Contracts", icon: FileSignature, exact: false, staffOnly: false },
  { to: "/dashboard/payments", label: "Payments", icon: BadgeIndianRupee, exact: false, staffOnly: true },
  { to: "/dashboard/settings", label: "Settings", icon: Settings, exact: false, staffOnly: false },
] as const;

function DashboardLayout() {
  const navigate = useNavigate();
  const { user } = useSession();

  const { data: profile } = useProfile(user);
  const { data: roles } = useRoles(user);
  const isStaff = (roles ?? []).some((r) => r === "admin" || r === "sales_manager");
  // Payments hold other people's financial records; only platform staff can read them.
  const nav = NAV.filter((item) => !item.staffOnly || isStaff);
  const roleLabel = profile?.company_role ?? (isStaff ? (roles ?? []).find((r) => r === "admin" || r === "sales_manager") : null) ?? "personal";

  const queryClient = useQueryClient();
  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="dashboard-tunnel relative min-h-screen">
      <Suspense fallback={null}><GoldenTunnelBackground /></Suspense>

      <div className="relative z-10 mx-auto flex max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="glass-panel sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col rounded-3xl p-4 lg:flex">
          <Link to="/" className="press mb-6 flex items-center px-2">
            <BrandLogo />
          </Link>

          <nav className="flex flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                activeProps={{ className: "bg-primary/12 text-primary ring-1 ring-primary/20" }}
                inactiveProps={{ className: "text-muted-foreground hover:bg-accent/60" }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto space-y-3 border-t border-border/60 pt-4">
            <div className="px-2">
              <div className="truncate text-sm font-medium">
                {profile?.full_name || profile?.email || "Your account"}
              </div>
              <div className="text-xs capitalize text-muted-foreground">
                {roleLabel.replace("_", " ")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" size="sm" className="press flex-1" onClick={signOut}>
                <LogOut className="size-4" /> Sign out
              </Button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="glass-panel mb-4 flex items-center gap-1 overflow-x-auto rounded-2xl p-1.5 lg:hidden">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                activeProps={{ className: "bg-primary text-primary-foreground" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
