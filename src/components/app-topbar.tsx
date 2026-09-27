import { useRouterState, Link, useNavigate } from "@tanstack/react-router";
import {
  Search,
  Download,
  Wifi,
  WifiOff,
  Settings,
  User,
  SlidersHorizontal,
  LogOut,
  Sparkles,
  Command,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, useAuth } from "@/lib/auth-context";

const titles: Record<string, string> = {
  "/": "لوحة التحكم الرئيسية",
  "/projects": "إدارة المشاريع قيد التنفيذ",
  "/projects-completed": "المشاريع المنفذة",
  "/reports": "التقارير الشهرية الرسمية",
  "/gis": "الخرائط التفاعلية GIS",
  "/admin": "المستخدمون والإعدادات",
};

export function AppTopbar({ children }: { children?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = titles[pathname] ?? "منصة المشاريع";
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [isOnline, setIsOnline] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("تم استعادة الاتصال بالإنترنت");
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("أنت تعمل حالياً في وضع عدم الاتصال (Offline)");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between gap-2 border-b border-border/50 bg-background/90 px-2.5 sm:px-4 md:px-6 backdrop-blur-xl">
      {/* Right Side: Sidebar Toggle + Logo & System Name + Page Title */}
      <div className="flex items-center gap-2 min-w-0">
        <SidebarTrigger className="h-9 w-9 shrink-0 rounded-xl hover:bg-muted/80 transition-colors touch-target" />

        {/* System Logo & Badge */}
        <div className="hidden items-center gap-2 lg:flex border-l border-border/60 pl-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-2xs font-bold text-xs">
            م
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold leading-none tracking-wide text-foreground">إدارة المشاريع</span>
            <span className="text-[9px] text-muted-foreground">مديرية ماء الأنبار</span>
          </div>
        </div>

        {/* Current Page Title */}
        <div className="min-w-0">
          <h1 className="truncate text-xs font-bold text-foreground sm:text-sm md:text-base">{title}</h1>
        </div>
      </div>

      {/* Center: Quick Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-xs lg:max-w-md mx-2">
        <div className="relative w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="بحث سريع بالمشاريع، رقم الإحالة/العقد، التقارير..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) {
                navigate({ to: "/projects", search: { q: searchQuery.trim() } as any });
              }
            }}
            className="w-full pr-9 pl-12 h-9 text-xs rounded-xl border-border/60 bg-muted/40 focus:bg-background transition-all"
          />
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded border border-border/80 bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-2xs">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Left Side Actions: Status, Notifications, Settings, User Avatar */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Network status indicator */}
        {!isOnline ? (
          <Badge variant="destructive" className="flex items-center gap-1 text-[10px] sm:text-[11px] py-1 px-2">
            <WifiOff className="h-3 w-3" />
            <span className="hidden sm:inline">غير متصل</span>
          </Badge>
        ) : (
          <Badge variant="outline" className="hidden xl:flex items-center gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] py-0.5 px-2 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>متصل</span>
          </Badge>
        )}

        {/* Settings Button */}
        <Button
          asChild
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-xl border-border/60 hover:bg-muted/60 transition-colors"
          title="الإعدادات"
        >
          <Link to="/admin">
            <Settings className="h-4 w-4 text-foreground/80" />
          </Link>
        </Button>

        {/* User Profile Avatar & Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 p-1 pl-2.5 h-9 rounded-xl hover:bg-muted/60 transition-colors"
            >
              <Avatar className="h-7 w-7 border border-border/80">
                {user?.avatar ? (
                  <AvatarImage src={user.avatar} alt={user?.name ?? "مستخدم"} />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-[11px] font-bold text-white">
                  {user?.name?.slice(0, 2) ?? "مد"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold leading-tight text-foreground truncate max-w-[100px]">
                  {user?.name ?? "م. أحمد علي"}
                </span>
                <span className="text-[10px] text-muted-foreground leading-none">
                  {user?.role ? ROLE_LABELS[user.role] : "مدير النظام"}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-xl border-border/80">
            <DropdownMenuLabel className="font-normal p-2">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-bold leading-none">{user?.name ?? "م. أحمد علي"}</p>
                <p className="text-[11px] leading-none text-muted-foreground">{user?.email ?? "admin@anbar-water.gov.iq"}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs">
              <Link to="/admin" className="flex items-center gap-2 w-full">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>الملف الشخصي والأنشطة</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs">
              <Link to="/admin" className="flex items-center gap-2 w-full">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                <span>إعدادات النظام والحساب</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="rounded-xl cursor-pointer text-xs text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5 ml-2" />
              <span>تسجيل الخروج</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {children}
      </div>
    </header>
  );
}


