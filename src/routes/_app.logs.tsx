import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  History,
  Search,
  RotateCw,
  Trash2,
  Printer,
  PlusCircle,
  FileEdit,
  Trash,
  FileText,
  UserPlus,
  Users,
  ShieldCheck,
  MapPin,
  Clock,
  User,
  Filter,
  Layers,
  Sparkles,
  ArrowUpDown,
  FileCheck2,
  AlertCircle,
  FolderKanban,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import {
  type ActivityItem,
  type ActivityActionType,
  type ActivityCategory,
  getStoredActivities,
  clearStoredActivities,
  syncActivitiesWithSupabase,
  getRelativeTimeArabic,
  getActivityCategoryLabel,
  formatArabicDateTime,
} from "@/lib/activity-logger";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/logs")({
  component: ActivityLogsPage,
});

export function ActivityLogsPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedActionType, setSelectedActionType] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<ActivityItem | null>(null);

  // Load activities from local storage and sync with Supabase
  const loadData = async (showToast = false) => {
    setIsSyncing(true);
    const local = getStoredActivities();
    setActivities(local);
    try {
      const synced = await syncActivitiesWithSupabase();
      if (synced && synced.length > 0) {
        setActivities(synced);
      }
      if (showToast) {
        toast.success("تم تحديث ومزامنة سجل العمليات بنجاح!");
      }
    } catch {
      // fallback to local
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      setActivities(getStoredActivities());
    };

    window.addEventListener("activities_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("activities_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Filter activities
  const filteredActivities = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    return activities.filter((act) => {
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (act.title || "").toLowerCase().includes(q);
        const matchDesc = (act.description || "").toLowerCase().includes(q);
        const matchUser = (act.userName || "").toLowerCase().includes(q);
        const matchRole = (act.userRole || "").toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchUser && !matchRole) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== "all" && act.category !== selectedCategory) {
        return false;
      }

      // Action type filter
      if (selectedActionType !== "all") {
        if (selectedActionType === "creates" && !act.actionType.includes("create") && !act.actionType.includes("add")) {
          return false;
        }
        if (selectedActionType === "updates" && !act.actionType.includes("update") && !act.actionType.includes("status")) {
          return false;
        }
        if (selectedActionType === "deletes" && !act.actionType.includes("delete") && !act.actionType.includes("del")) {
          return false;
        }
        if (selectedActionType === "reports" && act.category !== "reports" && !act.actionType.includes("report")) {
          return false;
        }
        if (selectedActionType === "auth" && !act.actionType.startsWith("auth_")) {
          return false;
        }
      }

      // Time filter
      if (timeFilter !== "all") {
        const actTime = new Date(act.timestamp).getTime();
        if (timeFilter === "today" && actTime < startOfToday) return false;
        if (timeFilter === "week" && actTime < sevenDaysAgo) return false;
        if (timeFilter === "month" && actTime < thirtyDaysAgo) return false;
      }

      return true;
    });
  }, [activities, searchQuery, selectedCategory, selectedActionType, timeFilter]);

  // Statistics
  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const todayCount = activities.filter(
      (a) => new Date(a.timestamp).getTime() >= startOfToday
    ).length;

    const projectActions = activities.filter((a) => a.category === "projects").length;
    const reportActions = activities.filter((a) => a.category === "reports").length;
    const userActions = activities.filter(
      (a) => a.category === "users" || a.category === "system"
    ).length;

    return {
      total: activities.length,
      today: todayCount,
      projects: projectActions,
      reports: reportActions,
      users: userActions,
    };
  }, [activities]);

  // Handle clear log
  const handleConfirmClear = () => {
    clearStoredActivities();
    setShowClearDialog(false);
    toast.success("تم مسح سجل العمليات بنجاح.");
  };

  // Helper to render action type visual badges and icons
  const getActionMeta = (actionType: ActivityActionType) => {
    switch (actionType) {
      case "project_create":
        return {
          label: "إضافة مشروع",
          color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          icon: PlusCircle,
          iconColor: "text-emerald-500",
          bgGradient: "from-emerald-500/10 to-teal-500/5",
        };
      case "project_update":
      case "progress_update":
        return {
          label: actionType === "progress_update" ? "تحديث إنجاز" : "تعديل مشروع",
          color: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
          icon: FileEdit,
          iconColor: "text-sky-500",
          bgGradient: "from-sky-500/10 to-blue-500/5",
        };
      case "change_order_add":
        return {
          label: "أمر غيار",
          color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
          icon: FolderKanban,
          iconColor: "text-amber-500",
          bgGradient: "from-amber-500/10 to-orange-500/5",
        };
      case "project_delete":
        return {
          label: "حذف مشروع",
          color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
          icon: Trash,
          iconColor: "text-rose-500",
          bgGradient: "from-rose-500/10 to-red-500/5",
        };
      case "monthly_report_add":
        return {
          label: "تقرير شهري",
          color: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
          icon: FileText,
          iconColor: "text-indigo-500",
          bgGradient: "from-indigo-500/10 to-purple-500/5",
        };
      case "monthly_report_del":
        return {
          label: "حذف تقرير",
          color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
          icon: Trash2,
          iconColor: "text-rose-500",
          bgGradient: "from-rose-500/10 to-pink-500/5",
        };
      case "user_create":
        return {
          label: "إضافة مستخدم",
          color: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
          icon: UserPlus,
          iconColor: "text-violet-500",
          bgGradient: "from-violet-500/10 to-purple-500/5",
        };
      case "user_update":
      case "user_status":
        return {
          label: "صلاحيات وحسابات",
          color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
          icon: Users,
          iconColor: "text-blue-500",
          bgGradient: "from-blue-500/10 to-cyan-500/5",
        };
      case "user_delete":
        return {
          label: "حذف مستخدم",
          color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
          icon: Trash2,
          iconColor: "text-rose-500",
          bgGradient: "from-rose-500/10 to-red-500/5",
        };
      case "auth_login":
        return {
          label: "تسجيل دخول",
          color: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30",
          icon: ShieldCheck,
          iconColor: "text-teal-500",
          bgGradient: "from-teal-500/10 to-emerald-500/5",
        };
      case "auth_logout":
        return {
          label: "تسجيل خروج",
          color: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
          icon: ShieldCheck,
          iconColor: "text-slate-500",
          bgGradient: "from-slate-500/10 to-gray-500/5",
        };
      case "gis_update":
        return {
          label: "تحديث GIS",
          color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
          icon: MapPin,
          iconColor: "text-cyan-500",
          bgGradient: "from-cyan-500/10 to-teal-500/5",
        };
      default:
        return {
          label: "عملية نظام",
          color: "bg-muted text-muted-foreground border-border",
          icon: History,
          iconColor: "text-primary",
          bgGradient: "from-muted/20 to-transparent",
        };
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 dir-rtl select-none pb-12">
      {/* ─── 1) رأس الصفحة (Page Header) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                سجل العمليات والنشاطات
                <Badge variant="outline" className="text-[11px] font-bold px-2 py-0.5 bg-primary/5 text-primary border-primary/20">
                  مباشر
                </Badge>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                تتبع فوري ومفصل لكافة الإضافات، التعديلات، وعمليات النظام بالوقت واسم المنفذ
              </p>
            </div>
          </div>
        </div>

        {/* أزرار الإجراءات السريعة */}
        <div className="flex items-center flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={isSyncing}
            className="h-9 gap-2 rounded-xl text-xs font-bold border-border/70 hover:bg-accent"
          >
            <RotateCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin text-primary")} />
            <span>تحديث</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-9 gap-2 rounded-xl text-xs font-bold border-border/70 hover:bg-accent print:hidden"
          >
            <Printer className="h-3.5 w-3.5 text-muted-foreground" />
            <span>طباعة السجل</span>
          </Button>

          {user?.role === "admin" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearDialog(true)}
              className="h-9 gap-2 rounded-xl text-xs font-bold border-rose-500/30 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400 print:hidden"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>مسح السجل</span>
            </Button>
          )}
        </div>
      </div>

      {/* ─── 2) بطاقات المؤشرات الإحصائية السريعة ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
        <Card className="rounded-2xl border-border bg-card/60 shadow-xs hover:border-primary/40 transition-all">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground">إجمالي الحركات</span>
              <div className="text-2xl font-black text-foreground">{stats.total}</div>
              <span className="text-[11px] text-muted-foreground font-semibold">حركة مسجلة</span>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card/60 shadow-xs hover:border-emerald-500/40 transition-all">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground">حركات اليوم</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {stats.today}
              </div>
              <span className="text-[11px] text-muted-foreground font-semibold">خلال 24 ساعة</span>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card/60 shadow-xs hover:border-sky-500/40 transition-all">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground">عمليات المشاريع</span>
              <div className="text-2xl font-black text-sky-600 dark:text-sky-400">
                {stats.projects}
              </div>
              <span className="text-[11px] text-muted-foreground font-semibold">إضافة، تعديل، إنجاز</span>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center border border-sky-500/20">
              <FolderKanban className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card/60 shadow-xs hover:border-violet-500/40 transition-all">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground">التقارير والمستخدمين</span>
              <div className="text-2xl font-black text-violet-600 dark:text-violet-400">
                {stats.reports + stats.users}
              </div>
              <span className="text-[11px] text-muted-foreground font-semibold">تقارير، حسابات، دخول</span>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center border border-violet-500/20">
              <FileCheck2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── 3) شريط أدوات البحث والفلاتر ─── */}
      <Card className="rounded-2xl border-border bg-card/60 shadow-xs p-4 sm:p-5 space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* حقل البحث الذكي */}
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم المشروع، عنوان الحركة، أو اسم المستخدم..."
              className="pr-10 h-10 rounded-xl bg-background/80 border-border text-xs sm:text-sm font-semibold"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-bold px-1"
              >
                مسح
              </button>
            )}
          </div>

          {/* فلتر النطاق الزمني */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/50 shrink-0 self-start md:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setTimeFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                timeFilter === "all"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              الكل
            </button>
            <button
              onClick={() => setTimeFilter("today")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                timeFilter === "today"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              اليوم
            </button>
            <button
              onClick={() => setTimeFilter("week")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                timeFilter === "week"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              آخر أسبوع
            </button>
            <button
              onClick={() => setTimeFilter("month")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                timeFilter === "month"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              هذا الشهر
            </button>
          </div>
        </div>

        {/* أزرار التصفية السريعة بالنوع */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <span className="text-xs font-bold text-muted-foreground shrink-0 ml-1">
            نوع الحركة:
          </span>

          <Button
            variant={selectedActionType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedActionType("all")}
            className="h-8 rounded-xl text-xs font-bold shrink-0"
          >
            الكل ({activities.length})
          </Button>

          <Button
            variant={selectedActionType === "creates" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedActionType("creates")}
            className="h-8 rounded-xl text-xs font-bold shrink-0 gap-1.5"
          >
            <PlusCircle className="h-3.5 w-3.5 text-emerald-500" />
            <span>➕ إضافات جديدة</span>
          </Button>

          <Button
            variant={selectedActionType === "updates" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedActionType("updates")}
            className="h-8 rounded-xl text-xs font-bold shrink-0 gap-1.5"
          >
            <FileEdit className="h-3.5 w-3.5 text-sky-500" />
            <span>✏️ تعديلات وتحديثات</span>
          </Button>

          <Button
            variant={selectedActionType === "reports" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedActionType("reports")}
            className="h-8 rounded-xl text-xs font-bold shrink-0 gap-1.5"
          >
            <FileText className="h-3.5 w-3.5 text-indigo-500" />
            <span>📊 تقارير</span>
          </Button>

          <Button
            variant={selectedActionType === "deletes" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedActionType("deletes")}
            className="h-8 rounded-xl text-xs font-bold shrink-0 gap-1.5"
          >
            <Trash className="h-3.5 w-3.5 text-rose-500" />
            <span>🗑️ عمليات حذف</span>
          </Button>

          <Button
            variant={selectedActionType === "auth" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedActionType("auth")}
            className="h-8 rounded-xl text-xs font-bold shrink-0 gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-teal-500" />
            <span>🔐 تسجيل الدخول</span>
          </Button>
        </div>
      </Card>

      {/* ─── 4) قائمة الحركات والعمليات (Activities Feed) ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
            <span>سجل الحركات المعروض:</span>
            <span className="font-mono text-foreground font-black px-2 py-0.5 rounded-md bg-muted">
              {filteredActivities.length}
            </span>
          </div>
          {filteredActivities.length !== activities.length && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedActionType("all");
                setSelectedCategory("all");
                setTimeFilter("all");
              }}
              className="text-xs text-primary font-bold hover:underline"
            >
              إعادة تعيين الفلاتر
            </button>
          )}
        </div>

        {activities.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-border/80 bg-card/40 p-10 sm:p-14 text-center">
            <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3.5">
              <div className="h-16 w-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
                <History className="h-8 w-8" />
              </div>
              <h3 className="font-black text-lg text-foreground">السجل نظيف وجاهز لتسجيل الحركات 🛡️</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                تم تصفير الحركات القديمة بنجاح. من الآن فصاعداً، سيتم تسجيل وتوثيق أي حركة أو إضافة أو تعديل أو عملية تحدث داخل النظام هنا فورياً ببيانات حقيقية.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground font-semibold">
                <span className="px-2.5 py-1 rounded-lg bg-muted border border-border">➕ إضافة مشاريع</span>
                <span className="px-2.5 py-1 rounded-lg bg-muted border border-border">✏️ تعديل بيانات</span>
                <span className="px-2.5 py-1 rounded-lg bg-muted border border-border">📊 نسب إنجاز وتقارير</span>
                <span className="px-2.5 py-1 rounded-lg bg-muted border border-border">🔐 دخول وخروج</span>
              </div>
            </div>
          </Card>
        ) : filteredActivities.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-border/80 bg-card/40 p-12 text-center">
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-muted/80 flex items-center justify-center text-muted-foreground">
                <History className="h-7 w-7 opacity-60" />
              </div>
              <h3 className="font-bold text-base text-foreground">لا توجد حركات مطابقة</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                لم يتم العثور على أي حركات أو عمليات تطابق شروط البحث أو التصفية الحالية.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedActionType("all");
                  setSelectedCategory("all");
                  setTimeFilter("all");
                }}
                className="mt-2 text-xs font-bold rounded-xl"
              >
                عرض كل الحركات
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredActivities.map((item) => {
              const meta = getActionMeta(item.actionType);
              const ActionIcon = meta.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => item.details && setSelectedItemForDetails(item)}
                  className={cn(
                    "group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-4.5 rounded-2xl border border-border/80 bg-card/70 hover:bg-card hover:border-primary/30 transition-all duration-200 shadow-xs",
                    item.details && "cursor-pointer hover:shadow-md"
                  )}
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    {/* أيقونة الحركة الملونة */}
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-transform duration-200 group-hover:scale-105 shadow-xs",
                        meta.color
                      )}
                    >
                      <ActionIcon className={cn("h-5 w-5", meta.iconColor)} />
                    </div>

                    {/* تفاصيل الحركة */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className={cn("text-[11px] font-bold px-2 py-0.5 rounded-lg border", meta.color)}
                        >
                          {meta.label}
                        </Badge>
                        <span className="text-xs sm:text-sm font-black text-foreground truncate">
                          {item.title}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* معلومات المستخدم والتوقيت */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 gap-1 text-xs">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 border border-border">
                        <AvatarFallback className="text-[10px] font-black bg-primary/10 text-primary">
                          {item.userName ? item.userName.slice(0, 2) : "ن"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-bold text-foreground text-xs">{item.userName}</span>
                      {item.userRole && (
                        <span className="text-[10.5px] text-muted-foreground hidden md:inline">
                          ({item.userRole})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-muted-foreground font-semibold text-[11px]">
                      <Clock className="h-3 w-3 text-muted-foreground/70" />
                      <span className="text-primary font-bold">{getRelativeTimeArabic(item.timestamp)}</span>
                      <span className="text-muted-foreground/50">•</span>
                      <span className="font-mono text-[10.5px]">{formatArabicDateTime(item.timestamp)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 5) نافذة استعراض تفاصيل الحركة الإضافية ─── */}
      <Dialog
        open={Boolean(selectedItemForDetails)}
        onOpenChange={(open) => !open && setSelectedItemForDetails(null)}
      >
        <DialogContent className="max-w-md dir-rtl rounded-2xl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              تفاصيل حركة السجل
            </DialogTitle>
            <DialogDescription className="text-xs">
              البيانات والملاحظات المسجلة مع هذه العملية
            </DialogDescription>
          </DialogHeader>

          {selectedItemForDetails && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-xl bg-muted/60 space-y-1.5 border border-border/60">
                <div className="font-black text-sm text-foreground">
                  {selectedItemForDetails.title}
                </div>
                <div className="text-muted-foreground leading-relaxed">
                  {selectedItemForDetails.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-card border border-border">
                  <span className="text-[10.5px] text-muted-foreground block font-bold">المنفذ:</span>
                  <span className="font-black text-foreground">{selectedItemForDetails.userName}</span>
                  <span className="text-[10px] text-muted-foreground block">
                    {selectedItemForDetails.userRole}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-card border border-border">
                  <span className="text-[10.5px] text-muted-foreground block font-bold">التوقيت:</span>
                  <span className="font-bold text-foreground block">{getRelativeTimeArabic(selectedItemForDetails.timestamp)}</span>
                  <span className="text-[10px] font-mono text-muted-foreground block">
                    {formatArabicDateTime(selectedItemForDetails.timestamp)}
                  </span>
                </div>
              </div>

              {selectedItemForDetails.details && Object.keys(selectedItemForDetails.details).length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-bold text-foreground">بيانات إضافية:</span>
                  <div className="p-3 rounded-xl bg-background border border-border/80 font-mono text-[11px] max-h-48 overflow-y-auto space-y-1 dir-ltr text-left">
                    {Object.entries(selectedItemForDetails.details).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between border-b border-border/40 pb-1">
                        <span className="text-muted-foreground font-semibold">{k}:</span>
                        <span className="text-foreground font-bold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedItemForDetails(null)}
              className="w-full rounded-xl text-xs font-bold"
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── 6) حوار تأكيد مسح السجل (للمدير) ─── */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="max-w-sm dir-rtl rounded-2xl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base font-black text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              تأكيد مسح سجل العمليات
            </DialogTitle>
            <DialogDescription className="text-xs">
              هل أنت متأكد من رغبتك في مسح كافة الحركات المسجلة في السجل؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearDialog(false)}
              className="rounded-xl text-xs font-bold"
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmClear}
              className="rounded-xl text-xs font-bold gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>نعم، مسح السجل</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
