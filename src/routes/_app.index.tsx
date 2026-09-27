import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  FolderKanban,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
  ChevronLeft,
  UserPlus,
  FileText,
  Layers,
  PieChart as PieIcon,
  Flame,
  UserCheck,
  Building2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PERIODIC_PROGRESS,
  RECENT_ACTIVITIES,
  STATUS_LABEL,
  getStoredProjects,
  saveStoredProjects,
  type Project,
  type ProjectStatus,
} from "@/lib/mock-data";
import { getProjectsFromSupabase } from "@/lib/supabase-db";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

// Bespoke Luxury Restrained Palette
const statusColors: Record<ProjectStatus, string> = {
  ongoing: "#0D9488",   // Refined Petrol Teal
  completed: "#10B981", // Emerald Success
  delayed: "#F43F5E",   // Crimson Coral
  stopped: "#E11D48",   // Deep Crimson
  not_started: "#64748B", // Slate Muted
};

function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [timePeriod, setTimePeriod] = useState<"weekly" | "monthly" | "quarterly" | "yearly">("monthly");

  useEffect(() => {
    const load = async () => {
      // 1. القراءة الفورية من الذاكرة المحلية
      setProjects(getStoredProjects());
      // 2. الجلب المباشر والحي من قاعدة بيانات Supabase
      try {
        const remote = await getProjectsFromSupabase();
        if (remote && remote.length > 0) {
          setProjects(remote);
          saveStoredProjects(remote, true);
        }
      } catch (err) {
        console.warn("Dashboard sync from Supabase failed:", err);
      }
    };
    load();
    window.addEventListener("projects_updated", load);
    window.addEventListener("focus", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("projects_updated", load);
      window.removeEventListener("focus", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  // Compute live statistics
  const s = useMemo(() => {
    if (projects.length === 0) {
      return {
        total: 0,
        ongoing: 0,
        completed: 0,
        delayed: 0,
        stopped: 0,
        not_started: 0,
        avgProgress: 0,
        totalValueIQD: 0,
        totalValueUSD: 0,
      };
    }
    return {
      total: projects.length,
      ongoing: projects.filter((p) => p.status === "ongoing" && !((Number(p.plannedProgress || 0) - Number(p.actualProgress || 0) > 5))).length,
      completed: projects.filter((p) => p.status === "completed" || Number(p.actualProgress || 0) >= 100).length,
      delayed: projects.filter((p) => p.status === "delayed" || p.status === "stopped" || (Number(p.plannedProgress || 0) - Number(p.actualProgress || 0) > 5 && p.status !== "completed")).length,
      stopped: projects.filter((p) => p.status === "stopped").length,
      not_started: projects.filter((p) => p.status === "not_started").length,
      avgProgress: Math.round(
        projects.reduce((sum, p) => sum + (Number(p.actualProgress) || 0), 0) / projects.length
      ),
      totalValueIQD: projects
        .filter((p) => (p.currency || "IQD") === "IQD")
        .reduce((sum, p) => sum + (Number(p.contractValue) || 0), 0),
      totalValueUSD: projects
        .filter((p) => p.currency === "USD")
        .reduce((sum, p) => sum + (Number(p.contractValue) || 0), 0),
    };
  }, [projects]);

  // Donut chart status data
  const statusData = useMemo(
    () => [
      { name: STATUS_LABEL.completed, key: "completed", value: s.completed },
      { name: STATUS_LABEL.ongoing, key: "ongoing", value: s.ongoing },
      { name: "متلكئة ومتوقفة", key: "delayed", value: s.delayed },
      { name: STATUS_LABEL.not_started, key: "not_started", value: s.not_started },
    ],
    [s]
  );

  // Dynamic periodic progress data computed from projects
  const periodicChartData = useMemo(() => {
    if (projects.length === 0) return [];
    return [
      { period: "الربع الأول", planned: Math.min(100, Math.round(s.avgProgress * 0.35)), actual: Math.min(100, Math.round(s.avgProgress * 0.3)) },
      { period: "الربع الثاني", planned: Math.min(100, Math.round(s.avgProgress * 0.65)), actual: Math.min(100, Math.round(s.avgProgress * 0.6)) },
      { period: "الربع الثالث", planned: Math.min(100, Math.round(s.avgProgress * 0.9)), actual: Math.min(100, Math.round(s.avgProgress * 0.85)) },
      { period: "المعدل الحالي", planned: Math.min(100, Math.round(s.avgProgress * 1.05)), actual: s.avgProgress },
    ];
  }, [projects, s]);

  // Performance comparison data (Planned vs Actual)
  const performanceData = useMemo(() => {
    return projects.slice(0, 5).map((p) => ({
      name: p.name.length > 20 ? p.name.slice(0, 18) + "..." : p.name,
      planned: Number(p.plannedProgress) || 0,
      actual: Number(p.actualProgress) || 0,
    }));
  }, [projects]);

  // Projects needing attention
  const attentionProjects = useMemo(() => {
    return projects.filter((p) => p.status === "delayed" || p.status === "stopped" || (Number(p.plannedProgress || 0) - Number(p.actualProgress || 0) > 5 && p.status !== "completed"));
  }, [projects]);

  // 6 Minimalist Luxury KPI Cards
  const kpis = [
    {
      id: "total",
      label: "إجمالي المشاريع",
      value: s.total,
      unit: "عقد قائم",
      change: "+12.4%",
      isPositive: true,
      hint: `إجمالي مشاريع المديرية`,
      icon: FolderKanban,
      link: "/projects",
    },
    {
      id: "ongoing",
      label: "قيد التنفيذ المستمر",
      value: s.ongoing,
      unit: "مشروع فعال",
      change: "+5.0%",
      isPositive: true,
      hint: "م مواقع العمل الجارية",
      icon: Clock,
      link: "/projects",
    },
    {
      id: "completed",
      label: "المشاريع المكتملة",
      value: s.completed,
      unit: "مشروع مسلّم",
      change: "+15.2%",
      isPositive: true,
      hint: "مكتملة بالكامل",
      icon: CheckCircle2,
      link: "/projects-completed",
    },
    {
      id: "delayed",
      label: "المشاريع المتلكئة",
      value: s.delayed,
      unit: "عقد متلكئ",
      change: s.delayed > 0 ? `-${s.delayed}` : "0",
      isPositive: false,
      hint: "متأخرة ومتوقفة",
      icon: AlertCircle,
      link: "/projects",
    },
    {
      id: "value_iqd",
      label: "عقود بالدينار (د.ع)",
      value: `${(s.totalValueIQD || 0).toLocaleString("en-US")}`,
      unit: "د.ع",
      change: "+8.7%",
      isPositive: true,
      hint: "إجمالي عقود بالدينار العراقي",
      icon: CircleDollarSign,
      link: "/projects",
    },
    {
      id: "value_usd",
      label: "عقود بالدولار ($)",
      value: `${(s.totalValueUSD || 0).toLocaleString("en-US")}`,
      unit: "$",
      change: "+4.2%",
      isPositive: true,
      hint: "إجمالي عقود بالدولار الأمريكي",
      icon: CircleDollarSign,
      link: "/projects",
    },
  ];

  return (
    <div className="space-y-6 pb-12 dir-rtl font-sans text-slate-900 dark:text-slate-100">
      {/* Luminous Light Page Header */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-sky-50/90 via-cyan-50/70 to-blue-50/60 border border-cyan-200/80 dark:bg-slate-900 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 border border-cyan-200/80 shadow-2xs">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              لوحة متابعة المشاريع والإنجاز
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              المنظومة الإلكترونية الموحدة لإدارة ومتابعة المشاريع بمديرية ماء الأنبار
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <Button asChild variant="outline" size="sm" className="h-10 text-xs font-extrabold rounded-xl border-2">
            <Link to="/reports">تصدير التقرير التنفيذي</Link>
          </Button>
          <Button asChild variant="default" size="sm" className="h-10 text-xs font-black rounded-xl">
            <Link to="/projects">عرض جميع المشاريع</Link>
          </Button>
        </div>
      </div>

      {/* 2. 6 Minimalist Bespoke KPI Cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <Link key={k.id} to={k.link} className="block group">
            <div className="bespoke-card p-4 h-full flex flex-col justify-between transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">{k.label}</span>
                <k.icon className="h-4 w-4 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
              </div>

              <div className="mt-3 space-y-0.5">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black tabular-nums tracking-tight text-foreground">
                    {k.value}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground">{k.unit}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
                <span className="text-muted-foreground/80 truncate max-w-[90px]">{k.hint}</span>
                <span className={`inline-flex items-center gap-0.5 font-bold ${
                  k.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}>
                  {k.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {k.change}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 3 & 4. Main Area Chart + Donut Chart */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* 3. Main Chart: تقدم المشاريع (Clean Stroke Area Chart) */}
        <Card className="lg:col-span-2 bespoke-card">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-accent" />
                <span>منحنى تقدم المشاريع (المخطط مقابل الفعلي)</span>
              </CardTitle>
            </div>

            {/* Segmented Control Filter */}
            <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/60 text-xs overflow-x-auto max-w-full">
              {(["weekly", "monthly", "quarterly", "yearly"] as const).map((period) => {
                const labels = {
                  weekly: "أسبوعي",
                  monthly: "شهري",
                  quarterly: "ربع سنوي",
                  yearly: "سنوي",
                };
                return (
                  <button
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                      timePeriod === period
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {labels[period]}
                  </button>
                );
              })}
            </div>
          </CardHeader>

          <CardContent className="pt-5">
            <div className="h-72 w-full">
              {periodicChartData.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
                  <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
                  <span>لا توجد مشاريع مضافة حتى الآن لعرض منحنى التقدم</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={periodicChartData}>
                    <defs>
                      <linearGradient id="plannedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} opacity={0.5} />
                    <XAxis
                      dataKey="period"
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      unit="%"
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.18 0.04 250)",
                        borderColor: "oklch(0.28 0.05 255)",
                        color: "#FFFFFF",
                        borderRadius: 12,
                        fontSize: 11,
                        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                      }}
                      formatter={(value: number) => [`${value}%`, ""]}
                    />
                    <Area
                      type="monotone"
                      dataKey="planned"
                      name="الإنجاز المخطط"
                      stroke="var(--color-primary)"
                      fill="url(#plannedGradient)"
                      strokeWidth={2}
                      activeDot={{ r: 5 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      name="الإنجاز الفعلي"
                      stroke="var(--color-accent)"
                      fill="url(#actualGradient)"
                      strokeWidth={2.5}
                      activeDot={{ r: 6, fill: "var(--color-accent)" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-3 flex items-center justify-center gap-6 border-t border-border/40 pt-3 text-[11px] font-semibold text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                <span>الإنجاز المخطط التعاقدي</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                <span className="text-foreground">الإنجاز الفعلي المتحقق</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Donut Chart: توزيع المشاريع حسب الحالة */}
        <Card className="bespoke-card">
          <CardHeader className="pb-2 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieIcon className="h-4.5 w-4.5 text-primary" />
              <span>توزيع المشاريع حسب الحالة</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="relative h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={68}
                    outerRadius={88}
                    paddingAngle={3}
                    cornerRadius={4}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.key} fill={statusColors[entry.key as ProjectStatus]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      borderColor: "var(--color-border)",
                      borderRadius: 10,
                      fontSize: 11,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Minimalist Center Count */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-foreground tabular-nums">{s.total}</span>
                <span className="text-[10px] font-medium text-muted-foreground">مشروع كلي</span>
              </div>
            </div>

            {/* Status Legend */}
            <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
              {statusData.map((d) => (
                <div key={d.key} className="flex items-center justify-between rounded-lg bg-muted/30 px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: statusColors[d.key as ProjectStatus] }}
                    />
                    <span className="text-[11px] text-muted-foreground">{d.name}</span>
                  </div>
                  <span className="font-bold tabular-nums text-foreground">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5 & 9. Projects Performance Chart + Overall Completion Gauge */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* 5. Bar Chart: أداء المشاريع (المخطط مقابل الفعلي) */}
        <Card className="lg:col-span-2 bespoke-card">
          <CardHeader className="pb-2 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-indigo-500" />
              <span>مقارنة أداء العقود (المخطط مقابل الفعلي)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="h-60 w-full">
              {performanceData.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
                  <Layers className="h-8 w-8 text-muted-foreground/30" />
                  <span>لا توجد مشاريع لعرض المقارنة</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData} barGap={4}>
                    <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} opacity={0.4} />
                    <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={10} unit="%" domain={[0, 100]} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-card)",
                        borderColor: "var(--color-border)",
                        borderRadius: 10,
                        fontSize: 11,
                      }}
                    />
                    <Bar dataKey="planned" name="المخطط (%)" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={14} />
                    <Bar dataKey="actual" name="الفعلي (%)" fill="var(--color-accent)" radius={[4, 4, 0, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 9. Circular Gauge: نسبة الإنجاز الإجمالية */}
        <Card className="bespoke-card flex flex-col justify-between">
          <CardHeader className="pb-2 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Flame className="h-4.5 w-4.5 text-amber-500" />
              <span>نسبة الإنجاز الإجمالية</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col items-center justify-center py-5 text-center">
            {/* Sleek Minimal Gauge */}
            <div className="relative flex items-center justify-center">
              <svg className="h-40 w-40 transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="64"
                  stroke="var(--color-muted)"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="64"
                  stroke="var(--color-accent)"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={402}
                  strokeDashoffset={402 - (402 * s.avgProgress) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-black tracking-tight tabular-nums text-foreground">
                  {s.avgProgress}%
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">الإنجاز التراكمي</span>
              </div>
            </div>

            <div className="mt-3 w-full space-y-1.5 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">مستوى الأداء المستهدف</span>
                <span className="font-bold text-foreground">85.0%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 6. قسم "آخر المشاريع" (Clean List Layout) */}
      <Card className="bespoke-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-4.5 w-4.5 text-accent" />
              <span>آخر المشاريع النشطة</span>
            </CardTitle>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1 text-accent hover:bg-accent/10">
            <Link to="/projects">
              <span>عرض الكل</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="pt-2 divide-y divide-border/40">
          {projects.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              لا توجد مشاريع مسجلة في المنظومة حتى الآن. يمكنك إنشاء مشروع جديد من صفحة "إدارة المشاريع".
            </div>
          ) : (
            projects.slice(0, 5).map((p) => {
              const deviation = (Number(p.plannedProgress) || 0) - (Number(p.actualProgress) || 0);
              const isDelayed = deviation > 5;

              return (
                <div key={p.id} className="py-3 group transition-colors hover:bg-muted/30 px-2 rounded-lg">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Name + Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground group-hover:text-accent transition-colors">
                          {p.name}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {p.id}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0 rounded-full font-medium"
                          style={{
                            borderColor: statusColors[p.status],
                            color: statusColors[p.status],
                          }}
                        >
                          {STATUS_LABEL[p.status] || p.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 text-xs text-muted-foreground">
                        <span>📍 {p.location}</span>
                        <span>🏗️ {p.contractor}</span>
                        <span>👤 {p.residentEngineerName ?? "م. مقيم موقعي"}</span>
                        <span>🗓️ التسليم: {p.expectedEndDate || p.plannedEndDate || "غير محدد"}</span>
                      </div>
                    </div>

                    {/* Progress + Value */}
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="w-32 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold tabular-nums text-foreground">{p.actualProgress}%</span>
                          <span className={`text-[10px] ${isDelayed ? "text-rose-500 font-semibold" : "text-emerald-600"}`}>
                            {isDelayed ? `−${deviation}%` : "ضمن الخطة"}
                          </span>
                        </div>
                        <Progress value={p.actualProgress} className="h-1.5 rounded-full" />
                      </div>

                      <div className="text-left font-bold text-xs tabular-nums text-foreground w-24">
                        {(Number(p.contractValue) || 0).toLocaleString("en-US")} د.ع
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* 7 & 8. Projects Needing Follow-up + Activity Timeline */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* 7. قسم "المشاريع التي تحتاج إلى متابعة" */}
        <Card className="bespoke-card border-rose-500/20 bg-rose-500/[0.02]">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4.5 w-4.5" />
              <span>المشاريع المتلكئة التي تحتاج إلى متابعة عاجلة</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-3 space-y-2.5">
            {attentionProjects.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">لا توجد مشاريع بها انحراف عاجل.</div>
            ) : (
              attentionProjects.map((p) => {
                const deviation = (Number(p.plannedProgress) || 0) - (Number(p.actualProgress) || 0);
                return (
                  <div
                    key={p.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-background p-3.5 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-xs">{p.name}</span>
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          انحراف {deviation}%
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {p.delayReasons ? p.delayReasons : `نسبة الإنجاز الفعلية ${p.actualProgress}% مقابل مخططة ${p.plannedProgress}%`}
                      </p>
                    </div>

                    <Button asChild variant="outline" size="sm" className="h-7 text-xs border-rose-500/30 text-rose-600 hover:bg-rose-50 rounded-lg shrink-0">
                      <Link to="/projects">متابعة المشروع</Link>
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* 8. قسم "النشاط الأخير" (Activity Feed Timeline) */}
        <Card className="bespoke-card">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-accent" />
              <span>النشاط الأخير في المنظومة</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-4">
            {RECENT_ACTIVITIES.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                لا توجد سجلات نشاط حديثة حالياً.
              </div>
            ) : (
              <div className="relative space-y-3.5 pr-3 before:absolute before:right-1.5 before:top-2 before:bottom-2 before:w-px before:bg-border/60">
                {RECENT_ACTIVITIES.map((act) => (
                  <div key={act.id} className="relative flex items-start gap-3 text-xs">
                    <span className="h-2 w-2 rounded-full bg-accent mt-1.5 shrink-0 ring-4 ring-background" />

                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{act.title}</span>
                        <span className="text-[10px] text-muted-foreground">{act.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{act.description}</p>
                      <div className="text-[10px] text-accent font-mono pt-0.5">
                        {act.user.name} — {act.user.role}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
