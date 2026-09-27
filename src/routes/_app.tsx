import { useEffect } from "react";
import { createFileRoute, Navigate, Outlet, useRouterState, Link, useNavigate } from "@tanstack/react-router";
import { ShieldAlert, LogIn } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, useAuth } from "@/lib/auth-context";
import { getProjectsFromSupabase } from "@/lib/supabase-db";
import { saveStoredProjects } from "@/lib/mock-data";

import { toast } from "sonner";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  // Scroll to top on page navigation for smooth transition
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  // المزامنة العالمية التلقائية مع Supabase عند بدء التطبيق مع إشعار المستخدم
  useEffect(() => {
    if (!user) return;
    const syncGlobalData = async () => {
      try {
        const remoteProjects = await getProjectsFromSupabase();
        if (remoteProjects && remoteProjects.length > 0) {
          saveStoredProjects(remoteProjects, false); // triggers "projects_updated" for all active pages
        } else if (remoteProjects === null) {
          toast.warning("تعذر الاتصال بقاعدة بيانات Supabase، يتم العمل بالوضع المحلي المؤقت.", {
            id: "supabase-offline-warn",
            duration: 6000,
          });
        }
      } catch (err) {
        console.warn("Global Supabase fetch failed:", err);
        toast.warning("تعذر الاتصال بقاعدة بيانات Supabase، يتم العمل بالوضع المحلي المؤقت.", {
          id: "supabase-offline-warn",
          duration: 6000,
        });
      }
    };
    syncGlobalData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        جارٍ التحميل...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check page permission
  const isAllowed = (() => {
    if (user.role === "admin") return true;
    if (user.allowedPages && Array.isArray(user.allowedPages)) {
      return user.allowedPages.some((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p)));
    }
    // Allow all pages by default unless restricted
    return true;
  })();

  const handleLoginAsAdmin = () => {
    signOut();
    navigate({ to: "/auth" });
  };

  return (
    <SidebarProvider className="min-h-screen w-full">
      <div className="flex min-h-screen w-full max-w-full bg-muted/30">
        <AppSidebar />
        <SidebarInset className="max-w-full min-w-0 flex-1 min-h-screen flex flex-col bg-background">
          <AppTopbar />
          <div className="flex-1 w-full max-w-full p-3 sm:p-5 md:p-6 lg:p-8 pb-safe">
            {!isAllowed ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <ShieldAlert className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold">غير مخول بالوصول</h2>
                <p className="text-muted-foreground max-w-md text-sm">
                  عفواً، لا تملك الصلاحية الكافية لعرض هذه الصفحة ({pathname}).
                  <br />
                  أنت مسجل حالياً بحساب: <strong className="text-foreground font-bold">{user.name} ({ROLE_LABELS[user.role]})</strong>.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Button asChild variant="outline">
                    <Link to="/">العودة للوحة التحكم</Link>
                  </Button>

                  <Button onClick={handleLoginAsAdmin} className="gap-2">
                    <LogIn className="h-4 w-4" />
                    تسجيل الدخول كمدير النظام (Admin)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="w-full">
                <Outlet />
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}


