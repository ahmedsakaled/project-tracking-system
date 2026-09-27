import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Map,
  LogOut,
  CheckCircle2,
  Users,
  History,
  Sparkles,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, useAuth } from "@/lib/auth-context";
import { AnbarWaterLogo } from "./AnbarWaterLogo";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "لوحة التحكم", url: "/", icon: LayoutDashboard },
  { title: "إدارة المشاريع قيد التنفيذ", url: "/projects", icon: FolderKanban },
  { title: "مشاريع المنفذة", url: "/projects-completed", icon: CheckCircle2 },
  { title: "التقارير الشهرية", url: "/reports", icon: FileText },
  { title: "تقارير Pro", url: "/reports-pro", icon: Sparkles },
  { title: "الخرائط GIS", url: "/gis", icon: Map },
  { title: "سجل", url: "/logs", icon: History },
  { title: "المستخدمون", url: "/admin", icon: Users },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();

  const visibleNavItems = navItems.filter((item) => {
    if (!user) return true;
    if (user.role === "admin") return true;
    if (user.allowedPages && Array.isArray(user.allowedPages)) {
      return user.allowedPages.includes(item.url);
    }
    return true;
  });

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar side="right" collapsible="offcanvas" className="border-l border-white/[0.08] bg-sidebar dir-rtl select-none">
      {/* ─── 1) الهيدر: شريط علوي مع حواف شفافة وإشارات الحركة وتوافق iOS safe-area-inset-top ─── */}
      <SidebarHeader className="border-b border-white/[0.08] px-5 py-4.5 sm:px-6 sm:py-5 pt-[max(1.125rem,env(safe-area-inset-top))] bg-sidebar/95 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-1 shadow-lg shadow-black/20 backdrop-blur-md">
            <AnbarWaterLogo size={38} />
            {/* مؤشر اتصال ذكي مع حركة pulse خفيفة */}
            <span className="absolute -bottom-0.5 -left-0.5 flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-950" />
            </span>
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-black text-white tracking-wide">
              إدارة المشاريع
            </div>
            <div className="truncate text-[11px] font-semibold text-sidebar-foreground/70 mt-0.5">
              مديرية ماء الأنبار
            </div>
          </div>
        </div>
      </SidebarHeader>

      {/* ─── 2 & 3) عناصر القائمة والتمرير السلس ─── */}
      <SidebarContent
        className="px-3 py-3.5 no-scrollbar overflow-y-auto"
        style={
          {
            "--nav-item-gap": "0.5rem",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          } as React.CSSProperties
        }
      >
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] text-sidebar-foreground/50 font-bold px-3 py-1.5 uppercase tracking-wider flex items-center justify-between">
            <span>القائمة الرئيسية</span>
            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full border border-white/10 text-sidebar-foreground/60 font-mono">
              {visibleNavItems.length}
            </span>
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-1.5">
            <SidebarMenu className="gap-[var(--nav-item-gap,0.5rem)]">
              {visibleNavItems.map((item) => {
                const isActive =
                  item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <Link
                      to={item.url}
                      preload="intent"
                      onClick={handleNavClick}
                      data-sidebar="menu-button"
                      data-active={isActive}
                      className={cn(
                        "group relative flex w-full items-center gap-3.5 overflow-hidden rounded-xl px-3.5 py-3 text-xs sm:text-sm outline-none cursor-pointer transition-all duration-200 ease-out min-h-[48px] sm:min-h-[46px] font-bold touch-manipulation select-none active:scale-[0.985] [-webkit-tap-highlight-color:transparent]",
                        isActive
                          ? "bg-gradient-to-l from-sky-500/25 via-blue-600/15 to-transparent text-white font-black shadow-md shadow-sky-500/10 ring-1 ring-sky-400/20"
                          : "text-sidebar-foreground/80 hover:text-white hover:bg-white/[0.06] hover:translate-x-[-2px]"
                      )}
                    >
                      {/* خط رأسي متدرج رفيع 3.5px على اليمين للعنصر النشط */}
                      {isActive && (
                        <span className="absolute right-0 top-1.5 bottom-1.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-cyan-400 via-sky-400 to-blue-500 shadow-[0_0_10px_#38bdf8]" />
                      )}

                      {/* حاوية الأيقونة الموحدة icon-sm */}
                      <div
                        className={cn(
                          "flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                          isActive
                            ? "bg-gradient-to-br from-sky-400/30 to-blue-600/30 text-cyan-300 shadow-xs border border-cyan-400/30 scale-105"
                            : "bg-white/[0.04] text-sidebar-foreground/70 group-hover:bg-white/10 group-hover:text-white group-hover:scale-105 border border-white/[0.05]"
                        )}
                      >
                        <item.icon className="icon-sm shrink-0 transition-transform duration-200 group-hover:scale-110" />
                      </div>

                      <span className="truncate flex-1 leading-normal">{item.title}</span>

                      {isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] shrink-0" />
                      )}
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ─── 4) الفوتر: بطاقة المستخدِم المستقلة، زر الخروج الأحمر المُميز وتوافق iOS safe-area-inset-bottom ─── */}
      <SidebarFooter className="border-t border-white/[0.08] p-3.5 gap-2.5 bg-sidebar/95 backdrop-blur-md pb-[max(1rem,env(safe-area-inset-bottom))] mt-auto shrink-0 overflow-visible">
        {user && (
          <div className="flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] shadow-xs backdrop-blur-md transition-all hover:bg-white/[0.07] hover:border-white/15">
            <div className="relative shrink-0">
              <Avatar className="h-9.5 w-9.5 border border-white/20 ring-2 ring-sky-500/20">
                <AvatarFallback className="bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 text-white font-black text-xs">
                  {user.name.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 left-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-xs font-black text-white">
                {user.name}
              </div>
              <div className="truncate text-[10.5px] font-semibold text-sidebar-foreground/60 mt-0.5">
                {ROLE_LABELS[user.role]}
              </div>
            </div>
          </div>
        )}

        {/* زر تسجيل الخروج بلون تمييز أحمر عند التحويم */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 min-h-[46px] text-xs sm:text-sm font-bold text-sidebar-foreground/80 hover:text-rose-300 hover:bg-rose-500/15 hover:border-rose-500/30 border border-transparent rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.985] touch-manipulation [-webkit-tap-highlight-color:transparent]"
          onClick={() => {
            signOut();
            navigate({ to: "/auth" });
          }}
        >
          <LogOut className="icon-sm text-rose-400 shrink-0 transition-transform group-hover:translate-x-1" />
          <span>تسجيل الخروج</span>
        </Button>

        <div className="pt-0.5 text-center">
          <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-mono font-black text-sidebar-foreground/50 bg-white/[0.03] border border-white/[0.06] dir-ltr">
            v0.7 Pro
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
