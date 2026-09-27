import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  FileText, Sparkles, Plus, Download, Printer, Eye, Trash2,
  CheckCircle2, Clock, AlertTriangle, Calendar, Building2, MapPin,
  User, ImagePlus, Upload, Search, Filter, Share2, X, Save,
  ShieldCheck, ArrowUpRight, TrendingUp, TrendingDown, RefreshCw, FileCheck,
  ChevronRight, Phone, DollarSign, Layers, ArrowLeft, ArrowRight, FileSpreadsheet, FileDown,
  RotateCcw, FilterX, SlidersHorizontal, BarChart3, PieChart, Check, Map as MapIcon
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getStoredProjects, type Project, ANBAR_DISTRICTS, STATUS_LABEL } from "@/lib/mock-data";
import { formatDateDMY } from "@/components/AddProjectWizard";
import { AnbarWaterLogo } from "@/components/AnbarWaterLogo";
import {
  saveProgressReportToSupabase,
  getProgressReportsFromSupabase,
  getProjectsFromSupabase,
  saveMonthlyReportToSupabase,
  getMonthlyReportsFromSupabase,
  deleteMonthlyReportFromSupabase,
} from "@/lib/supabase-db";
import { ProjectSelectionDialog } from "@/components/ProjectSelectionDialog";
import { toEnglishDigits } from "@/lib/utils";
import { logActivity } from "@/lib/activity-logger";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});

const MONTHS_LIST = [
  "جميع الأشهر",
  "كانون الثاني (01)",
  "شباط (02)",
  "آذار (03)",
  "نيسان (04)",
  "أيار (05)",
  "حزيران (06)",
  "تموز (07)",
  "آب (08)",
  "أيلول (09)",
  "تشرين الأول (10)",
  "تشرين الثاني (11)",
  "كانون الأول (12)",
];

const YEARS_LIST = ["جميع السنوات", "2026", "2025", "2024", "2023"];

const FUNDING_SOURCES = [
  "جميع جهات التمويل",
  "الخطة الاستثمارية",
  "تنمية الأقاليم",
  "صندوق إعادة إعمار المناطق المتضررة",
  "القروض الدولية / البنك الدولي",
  "الموازنة التشغيلية",
];

const PROJECT_TYPES = [
  "جميع أنواع المشاريع",
  "استثماري",
  "غير استثماري",
];

export interface MonthlyReportItem {
  id: string;
  projectId: string;
  projectName: string;
  contractNo?: string;
  projectType?: string;
  centerName?: string;
  year: string;
  month: string;
  reportNo: string;
  date: string;
  residentEngineer: string;
  residentEngineerPhone?: string;
  selectedSupervisors?: string[];
  contractor: string;
  location: string;
  district: string;
  subDistrict?: string;
  fundingSource: string;
  referralMethod?: string;
  contractDate?: string;
  initialHandoverOrderNo?: string;
  initialHandoverOrderDate?: string;
  initialHandoverDate?: string;
  initialHandoverCommittee?: string[];
  initialHandoverNotes?: string;
  finalHandoverOrderNo?: string;
  finalHandoverOrderDate?: string;
  finalHandoverDate?: string;
  finalHandoverCommittee?: string[];
  finalHandoverNotes?: string;
  contractValue: number;
  changeOrdersCount?: number;
  changeOrdersTotalAmount?: number;
  workCost?: number;
  durationDays: number;
  startDate: string;
  additionalDuration?: string;
  completionDateAfterAdditional?: string;
  plannedProgress: number;
  actualProgress: number;
  labourCount?: number;
  weather?: string;
  executedWorks: string;
  materialsDelivered: string;
  obstaclesAndNotes: string;
  status: "approved" | "pending" | "draft" | "rejected";
  photos: { id: string; url: string; title: string }[];
  createdAt: string;
  lat?: number;
  lng?: number;
}

const LOCAL_REPORTS_KEY = "project_pulse_monthly_reports_v2";

function ReportsPage() {
  // Primary Tabs: archive (الأرشيف والفلترة) | create (إصدار تقرير) | preview (المعاينة الرسمية)
  const [activeTab, setActiveTab] = useState<"archive" | "create" | "preview">("archive");

  // View Mode for Archive: "all" (العرض الشامل) | "district" (تفصيل المنطقة/القضاء)
  const [viewMode, setViewMode] = useState<"all" | "district">("all");

  const [projects, setProjects] = useState<Project[]>([]);
  const [reports, setReports] = useState<MonthlyReportItem[]>([]);
  const [isProjectSelectOpen, setIsProjectSelectOpen] = useState<boolean>(false);

  // ─── Multi-Criteria Filter States ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [fundingFilter, setFundingFilter] = useState<string>("all");
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");

  // Form State for Creation
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedMonth, setSelectedMonth] = useState<string>("أيلول (09)");
  const [reportNo, setReportNo] = useState<string>(`REP/2026/09/${Math.floor(100 + Math.random() * 900)}`);
  const [contractNo, setContractNo] = useState<string>("");
  const [centerName, setCenterName] = useState<string>("");
  const [residentEngineer, setResidentEngineer] = useState<string>("");
  const [residentEngineerPhone, setResidentEngineerPhone] = useState<string>("");
  const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);
  const [contractor, setContractor] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [district, setDistrict] = useState<string>("");
  const [subDistrict, setSubDistrict] = useState<string>("");
  const [fundingSource, setFundingSource] = useState<string>("");
  const [contractValue, setContractValue] = useState<number>(0);
  const [changeOrdersCount, setChangeOrdersCount] = useState<number>(0);
  const [changeOrdersTotalAmount, setChangeOrdersTotalAmount] = useState<number>(0);
  const [workCost, setWorkCost] = useState<number>(0);
  const [durationDays, setDurationDays] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>("");
  const [additionalDuration, setAdditionalDuration] = useState<string>("");
  const [completionDateAfterAdditional, setCompletionDateAfterAdditional] = useState<string>("");
  const [plannedProgress, setPlannedProgress] = useState<number>(80);
  const [actualProgress, setActualProgress] = useState<number>(75);
  const [executedWorks, setExecutedWorks] = useState<string>("");
  const [materialsDelivered, setMaterialsDelivered] = useState<string>("");
  const [obstaclesAndNotes, setObstaclesAndNotes] = useState<string>("");
  const [reportPhotos, setReportPhotos] = useState<{ id: string; url: string; title: string }[]>([]);

  // Active Preview Report
  const [previewReport, setPreviewReport] = useState<MonthlyReportItem | null>(null);

  // Load Projects & Reports on Mount with Realtime Sync
  const loadAllProjects = async () => {
    const localList = getStoredProjects();
    setProjects(localList);

    if (localList.length > 0 && !selectedProjectId) {
      setSelectedProjectId(localList[0].id);
      populateFormFromProject(localList[0]);
    }

    try {
      const remoteList = await getProjectsFromSupabase();
      if (remoteList && remoteList.length > 0) {
        const map = new Map<string, Project>();
        remoteList.forEach((p) => map.set(p.id, p));
        localList.forEach((p) => map.set(p.id, p));
        const merged = Array.from(map.values());
        setProjects(merged);
        if (!selectedProjectId && merged.length > 0) {
          setSelectedProjectId(merged[0].id);
          populateFormFromProject(merged[0]);
        }
      }
    } catch (e) {
      console.warn("Could not sync projects from Supabase:", e);
    }
  };

  useEffect(() => {
    loadAllProjects();

    const isRealReport = (r: MonthlyReportItem) =>
      r &&
      r.id &&
      !r.id.startsWith("rep-101") &&
      !r.id.startsWith("rep-102") &&
      !r.id.startsWith("rep-103");

    const saved = localStorage.getItem(LOCAL_REPORTS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const cleaned = Array.isArray(parsed) ? parsed.filter(isRealReport) : [];
        setReports(cleaned);
        localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(cleaned));
      } catch {
        setReports([]);
      }
    } else {
      setReports([]);
      localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify([]));
    }

    const loadMonthlyReports = async () => {
      try {
        const remoteMonthly = await getMonthlyReportsFromSupabase();
        if (remoteMonthly && remoteMonthly.length > 0) {
          setReports((prev) => {
            const map = new Map<string, MonthlyReportItem>();
            remoteMonthly.forEach((r) => map.set(r.id, r));
            prev.forEach((r) => map.set(r.id, r));
            const merged = Array.from(map.values()).filter(isRealReport);
            localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(merged));
            return merged;
          });
        }
      } catch (e) {
        console.warn("Could not fetch remote monthly reports:", e);
      }
    };
    loadMonthlyReports();

    const handleUpdate = () => {
      loadAllProjects();
      loadMonthlyReports();
    };

    window.addEventListener("projects_updated", handleUpdate);
    window.addEventListener("focus", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("projects_updated", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const populateFormFromProject = (p: Project) => {
    setContractNo(p.contractNo || "");
    setCenterName(p.centerName || "");
    setResidentEngineer(p.residentEngineerName || "م. أحمد الجبوري");
    setResidentEngineerPhone(p.residentEngineerPhone || "");
    setSelectedSupervisors(p.selectedSupervisors || []);
    setContractor(p.contractor || "شركة المقاولات العامة");
    setLocation(p.location || "محافظة الأنبار");
    setDistrict(p.district || "");
    setSubDistrict(p.subDistrict || "");
    setFundingSource(p.fundingSource || "الخطة الاستثمارية");
    setContractValue(p.contractValue || 0);
    setChangeOrdersCount(p.changeOrdersCount || 0);
    setChangeOrdersTotalAmount(p.changeOrdersTotalAmount || 0);
    setWorkCost(p.workCost || (p.contractValue || 0) + (p.changeOrdersTotalAmount || 0));
    setDurationDays(p.durationDays || 360);
    setStartDate(p.startDate || "");
    setAdditionalDuration(p.additionalDuration || "");
    setCompletionDateAfterAdditional(p.completionDateAfterAdditional || "");
    setPlannedProgress(p.plannedProgress || 80);
    setActualProgress(p.actualProgress || 75);
  };

  const handleSelectProjectFromDialog = (p: Project) => {
    setSelectedProjectId(p.id);
    populateFormFromProject(p);
    setActiveTab("create");
    toast.success(`✨ تم اختيار المشروع بنجاح: ${p.name}`);
  };

  const handleSelectMultipleProjectsFromDialog = (selectedProjectsList: Project[]) => {
    if (!selectedProjectsList || selectedProjectsList.length === 0) return;

    if (selectedProjectsList.length === 1) {
      handleSelectProjectFromDialog(selectedProjectsList[0]);
      return;
    }

    const newBatchReports: MonthlyReportItem[] = selectedProjectsList.map((p, idx) => ({
      id: `rep-${Date.now()}-${idx}`,
      projectId: p.id,
      projectName: p.name,
      contractNo: p.contractNo,
      centerName: p.centerName,
      year: selectedYear,
      month: selectedMonth,
      reportNo: `REP/${selectedYear}/${selectedMonth.slice(0, 2)}/${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split("T")[0],
      residentEngineer: p.residentEngineerName || "المهندس المقيم",
      residentEngineerPhone: p.residentEngineerPhone,
      selectedSupervisors: p.selectedSupervisors,
      contractor: p.contractor || "الشركة المنفذة",
      location: p.location || "محافظة الأنبار",
      district: p.district || "الأنبار",
      subDistrict: p.subDistrict,
      fundingSource: p.fundingSource || "الخطة الاستثمارية",
      contractValue: p.contractValue || 0,
      changeOrdersCount: p.changeOrdersCount,
      changeOrdersTotalAmount: p.changeOrdersTotalAmount,
      workCost: p.workCost,
      durationDays: p.durationDays || 360,
      startDate: p.startDate || "",
      additionalDuration: p.additionalDuration,
      completionDateAfterAdditional: p.completionDateAfterAdditional,
      referralMethod: p.referralMethod,
      contractDate: p.contractDate,
      initialHandoverOrderNo: p.initialHandoverOrderNo,
      initialHandoverOrderDate: p.initialHandoverOrderDate,
      initialHandoverDate: p.initialHandoverDate,
      initialHandoverCommittee: p.initialHandoverCommittee,
      finalHandoverOrderNo: p.finalHandoverOrderNo,
      finalHandoverOrderDate: p.finalHandoverOrderDate,
      finalHandoverDate: p.finalHandoverDate,
      finalHandoverCommittee: p.finalHandoverCommittee,
      plannedProgress: p.plannedProgress || 80,
      actualProgress: p.actualProgress || 75,
      executedWorks: "تم تنفيذ الأنشطة والفقرات المعتمدة خلال الشهر الحالي وفق الجدول الزمني.",
      materialsDelivered: "وصول وتجهيز المواد المعتمدة للموقع.",
      obstaclesAndNotes: "لا توجد معوقات رئيسية.",
      status: "approved",
      photos: reportPhotos,
      createdAt: new Date().toISOString(),
    }));

    const updated = [...newBatchReports, ...reports];
    setReports(updated);
    localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(updated));

    newBatchReports.forEach((r) => {
      saveMonthlyReportToSupabase(r);
      saveProgressReportToSupabase({
        id: r.id,
        projectId: r.projectId,
        engineer: r.residentEngineer,
        actualProgress: r.actualProgress,
        status: r.status,
        completedWorks: r.executedWorks,
        weather: r.weather,
        labour: `${r.labourCount || 0} عامل`,
        notes: r.obstaclesAndNotes,
      });
    });

    toast.success(`🎉 تم اعتماد وإصدار التقارير الشهرية لـ ${newBatchReports.length} مشاريع بنجاح! 📜`);

    try {
      logActivity({
        actionType: "monthly_report_add",
        category: "reports",
        title: `إصدار تقارير شهرية مجمعة (${newBatchReports.length} مشاريع)`,
        description: `تم توليد واعتماد التقارير الشهرية تلقائياً لشهر ${selectedMonth} لسنة ${selectedYear}`,
        details: {
          "عدد التقارير": newBatchReports.length,
          "الشهر": selectedMonth,
          "السنة": selectedYear,
        },
      });
    } catch {}

    setPreviewReport(newBatchReports[0]);
    setActiveTab("archive");
  };

  const handleSaveReport = (status: "approved" | "pending" | "draft") => {
    const targetProject = projects.find((p) => p.id === selectedProjectId);
    if (!targetProject) {
      toast.error("يرجى اختيار المشروع أولاً");
      return;
    }

    const newReport: MonthlyReportItem = {
      id: `rep-${Date.now()}`,
      projectId: targetProject.id,
      projectName: targetProject.name,
      contractNo: contractNo || targetProject.contractNo,
      centerName: centerName || targetProject.centerName,
      year: selectedYear,
      month: selectedMonth,
      reportNo: reportNo || `REP/${selectedYear}/${selectedMonth.slice(0, 2)}/${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split("T")[0],
      residentEngineer: residentEngineer || targetProject.residentEngineerName || "المهندس المقيم",
      residentEngineerPhone: residentEngineerPhone || targetProject.residentEngineerPhone,
      selectedSupervisors: selectedSupervisors || targetProject.selectedSupervisors,
      contractor: contractor || targetProject.contractor || "الشركة المنفذة",
      location: location || targetProject.location || "محافظة الأنبار",
      district: district || targetProject.district || "الأنبار",
      subDistrict: subDistrict || targetProject.subDistrict,
      fundingSource: fundingSource || targetProject.fundingSource || "الخطة الاستثمارية",
      contractValue: contractValue || targetProject.contractValue || 0,
      changeOrdersCount: changeOrdersCount || targetProject.changeOrdersCount,
      changeOrdersTotalAmount: changeOrdersTotalAmount || targetProject.changeOrdersTotalAmount,
      workCost: workCost || targetProject.workCost,
      durationDays: durationDays || targetProject.durationDays || 360,
      startDate: startDate || targetProject.startDate || "",
      additionalDuration: additionalDuration || targetProject.additionalDuration,
      completionDateAfterAdditional: completionDateAfterAdditional || targetProject.completionDateAfterAdditional,
      referralMethod: targetProject.referralMethod,
      contractDate: targetProject.contractDate,
      initialHandoverOrderNo: targetProject.initialHandoverOrderNo,
      initialHandoverOrderDate: targetProject.initialHandoverOrderDate,
      initialHandoverDate: targetProject.initialHandoverDate,
      initialHandoverCommittee: targetProject.initialHandoverCommittee,
      finalHandoverOrderNo: targetProject.finalHandoverOrderNo,
      finalHandoverOrderDate: targetProject.finalHandoverOrderDate,
      finalHandoverDate: targetProject.finalHandoverDate,
      finalHandoverCommittee: targetProject.finalHandoverCommittee,
      plannedProgress,
      actualProgress,
      executedWorks: executedWorks || "تم تنفيذ الأنشطة والفقرات المعتمدة خلال الشهر الحالي وفق الجدول الزمني.",
      materialsDelivered: materialsDelivered || "وصول وتجهيز المواد المعتمدة للموقع.",
      obstaclesAndNotes: obstaclesAndNotes || "لا توجد معوقات رئيسية.",
      status,
      photos: reportPhotos,
      createdAt: new Date().toISOString(),
    };

    const updated = [newReport, ...reports];
    setReports(updated);
    localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(updated));

    saveMonthlyReportToSupabase(newReport);
    saveProgressReportToSupabase({
      id: newReport.id,
      projectId: newReport.projectId,
      engineer: newReport.residentEngineer,
      actualProgress: newReport.actualProgress,
      status: newReport.status,
      completedWorks: newReport.executedWorks,
      weather: newReport.weather,
      labour: `${newReport.labourCount || 0} عامل`,
      notes: newReport.obstaclesAndNotes,
    });

    toast.success(
      status === "approved"
        ? "تمت اعتماد وإصدار التقرير الشهري بنجاح! 📜"
        : "تم حفظ التقرير الشهري كمسودة بانتظار التوقيع والاعتماد."
    );

    try {
      logActivity({
        actionType: "monthly_report_add",
        category: "reports",
        title: `إصدار تقرير شهري: ${newReport.projectName || "مشروع"}`,
        description: `تقرير شهر ${newReport.month} لسنة ${newReport.year} (نسبة الإنجاز الفعلي: ${newReport.actualProgress}%)`,
        details: {
          "معرف التقرير": newReport.id,
          "اسم المشروع": newReport.projectName,
          "المهندس المقيم": newReport.residentEngineer,
          "نسبة الإنجاز": `${newReport.actualProgress}%`,
          "الحالة": status === "approved" ? "معتمد" : "مسودة",
        },
      });
    } catch {}

    setPreviewReport(newReport);
    setActiveTab("preview");
  };

  const handleDeleteReport = (id: string) => {
    const deletedRep = reports.find((r) => r.id !== id);
    const updated = reports.filter((r) => r.id !== id);
    setReports(updated);
    localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(updated));
    deleteMonthlyReportFromSupabase(id);

    try {
      logActivity({
        actionType: "monthly_report_del",
        category: "reports",
        title: `حذف تقرير شهري: ${deletedRep?.projectName || id}`,
        description: `تم حذف التقرير الشهري لشهر ${deletedRep?.month || "-"} لسنة ${deletedRep?.year || "-"} من الأرشيف`,
        details: {
          "معرف التقرير": id,
          "المشروع": deletedRep?.projectName,
        },
      });
    } catch {}

    toast.success("تم حذف التقرير الشهري من الأرشيف.");
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setDistrictFilter("all");
    setFundingFilter("all");
    setProjectTypeFilter("all");
    setStatusFilter("all");
    setMonthFilter("all");
    setYearFilter("all");
    toast.info("تمت إعادة ضبط جميع الفلاتر.");
  };

  // ─── Multi-Criteria Filter Engine ───────────────────────────────────────────
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // 1. Search Query
      const matchSearch =
        !searchQuery.trim() ||
        r.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.residentEngineer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.contractor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.contractNo && r.contractNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.reportNo && r.reportNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        r.district.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. District Filter
      const matchDistrict =
        districtFilter === "all" ||
        r.district.trim().toLowerCase() === districtFilter.trim().toLowerCase() ||
        r.location.toLowerCase().includes(districtFilter.toLowerCase());

      // 3. Funding Filter
      const matchFunding =
        fundingFilter === "all" ||
        r.fundingSource.trim().toLowerCase() === fundingFilter.trim().toLowerCase() ||
        (fundingFilter === "الخطة الاستثمارية" && r.fundingSource.includes("استثمار")) ||
        (fundingFilter === "تنمية الأقاليم" && r.fundingSource.includes("أقاليم"));

      // 4. Project Type Filter
      const matchProjectType =
        projectTypeFilter === "all" ||
        (projectTypeFilter === "استثماري" && (r.projectType === "investment" || r.fundingSource.includes("استثمار"))) ||
        (projectTypeFilter === "غير استثماري" && (r.projectType === "non_investment" || !r.fundingSource.includes("استثمار")));

      // 5. Status Filter
      const matchStatus = statusFilter === "all" || r.status === statusFilter;

      // 6. Month Filter
      const matchMonth = monthFilter === "all" || r.month === monthFilter;

      // 7. Year Filter
      const matchYear = yearFilter === "all" || r.year === yearFilter;

      return (
        matchSearch &&
        matchDistrict &&
        matchFunding &&
        matchProjectType &&
        matchStatus &&
        matchMonth &&
        matchYear
      );
    });
  }, [
    reports,
    searchQuery,
    districtFilter,
    fundingFilter,
    projectTypeFilter,
    statusFilter,
    monthFilter,
    yearFilter,
  ]);

  // Overall Statistics Calculation
  const stats = useMemo(() => {
    const total = reports.length;
    const approved = reports.filter((r) => r.status === "approved").length;
    const pending = reports.filter((r) => r.status === "pending").length;
    const draft = reports.filter((r) => r.status === "draft").length;
    const totalContractValue = filteredReports.reduce((acc, r) => acc + (r.contractValue || 0), 0);
    const avgProgress = filteredReports.length
      ? Math.round(filteredReports.reduce((acc, r) => acc + (r.actualProgress || 0), 0) / filteredReports.length)
      : 0;

    return { total, approved, pending, draft, totalContractValue, avgProgress };
  }, [reports, filteredReports]);

  // Single Region Statistics (for District Breakdown View Mode)
  const districtStats = useMemo(() => {
    if (districtFilter === "all") return null;

    const districtReports = filteredReports;
    const districtName = districtFilter;

    const totalVal = districtReports.reduce((sum, r) => sum + (r.contractValue || 0), 0);
    const avgProg = districtReports.length
      ? Math.round(districtReports.reduce((sum, r) => sum + (r.actualProgress || 0), 0) / districtReports.length)
      : 0;
    const contractors = Array.from(new Set(districtReports.map((r) => r.contractor).filter(Boolean)));
    const engineers = Array.from(new Set(districtReports.map((r) => r.residentEngineer).filter(Boolean)));

    return {
      districtName,
      count: districtReports.length,
      totalVal,
      avgProg,
      contractorsCount: contractors.length,
      engineersCount: engineers.length,
      reportsList: districtReports,
    };
  }, [districtFilter, filteredReports]);

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const variance = actualProgress - plannedProgress;

  const handleExportReportToExcel = (reportToExport?: MonthlyReportItem | null) => {
    const r = reportToExport || previewReport;
    if (!r) {
      toast.error("لا يوجد تقرير محدد للتصدير إلى Excel");
      return;
    }

    const cleanProjectName = (r.projectName || "مشروع").replace(/[\\/:*?"<>|]/g, "_");
    const filename = `التقرير_الشهري_${cleanProjectName}_${r.month || "شهر"}_${r.year || "2026"}.xls`;

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; text-align: right; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; font-size: 11pt; }
          th, td { border: 1px solid #CBD5E1; padding: 8px 12px; text-align: right; vertical-align: middle; }
          .header-title { background-color: #1E3A8A; color: #FFFFFF; font-size: 15pt; font-weight: bold; text-align: center; padding: 14px; }
          .section-header { background-color: #0284C7; color: #FFFFFF; font-size: 12pt; font-weight: bold; text-align: right; padding: 8px 12px; }
          .label-cell { background-color: #F8FAFC; color: #1E293B; font-weight: bold; width: 25%; }
          .value-cell { background-color: #FFFFFF; color: #0F172A; }
          .highlight-emerald { background-color: #ECFDF5; color: #047857; font-weight: bold; }
          .highlight-blue { background-color: #EFF6FF; color: #1D4ED8; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <th colspan="4" class="header-title">
              محافظة الأنبار - مديرية ماء محافظة الأنبار<br/>
              التقرير الشهري لمتابعة تقدم الأعمال (${r.month} ${r.year})
            </th>
          </tr>
          <tr>
            <td class="label-cell">اسم المشروع:</td>
            <td colspan="3" class="value-cell highlight-blue">${r.projectName || "—"}</td>
          </tr>
          <tr>
            <td class="label-cell">رقم التقرير المرجعي:</td>
            <td class="value-cell">${r.reportNo || "—"}</td>
            <td class="label-cell">تاريخ التقرير:</td>
            <td class="value-cell">${r.date || "—"}</td>
          </tr>
        </table>

        <table>
          <tr>
            <th colspan="4" class="section-header">1. البيانات التعاقدية والأساسية</th>
          </tr>
          <tr>
            <td class="label-cell">اسم المركز:</td>
            <td class="value-cell highlight-blue">${r.centerName || "—"}</td>
            <td class="label-cell">الموقع والحي:</td>
            <td class="value-cell">${r.location || "محافظة الأنبار"}</td>
          </tr>
          <tr>
            <td class="label-cell">القضاء والناحية:</td>
            <td class="value-cell">${r.district || "الأنبار"} ${r.subDistrict ? `/ ${r.subDistrict}` : ""}</td>
            <td class="label-cell">الشركة المنفذة (المقاول):</td>
            <td class="value-cell">${r.contractor || "—"}</td>
          </tr>
          <tr>
            <td class="label-cell">الجهة الممولة:</td>
            <td class="value-cell">${r.fundingSource || "—"}</td>
            <td class="label-cell">رقم العقد وتاريخه:</td>
            <td class="value-cell">${r.contractNo || "—"} (${r.contractDate ? formatDateDMY(r.contractDate) : "—"})</td>
          </tr>
          <tr>
            <td class="label-cell">المهندس المقيم المسؤول:</td>
            <td class="value-cell">${r.residentEngineer || "—"}</td>
            <td class="label-cell">هاتف المهندس المقيم:</td>
            <td class="value-cell">${r.residentEngineerPhone || "—"}</td>
          </tr>
        </table>

        <table>
          <tr>
            <th colspan="4" class="section-header">2. البيانات المالية وأوامر الغيار</th>
          </tr>
          <tr>
            <td class="label-cell">مبلغ العقد الأساسي:</td>
            <td class="value-cell highlight-emerald">${(r.contractValue || 0).toLocaleString("en-US")} د.ع</td>
            <td class="label-cell">عدد أوامر الغيار:</td>
            <td class="value-cell">${r.changeOrdersCount || 0} أمر</td>
          </tr>
          <tr>
            <td class="label-cell">مجموع مبالغ أوامر الغيار:</td>
            <td class="value-cell">${(r.changeOrdersTotalAmount || 0).toLocaleString("en-US")} د.ع</td>
            <td class="label-cell">كلفة العمل الإجمالية:</td>
            <td class="value-cell highlight-blue">${(r.workCost || r.contractValue || 0).toLocaleString("en-US")} د.ع</td>
          </tr>
        </table>

        <table>
          <tr>
            <th colspan="4" class="section-header">3. مؤشرات ونسب الإنجاز والتوقيتات الزمنيّة</th>
          </tr>
          <tr>
            <td class="label-cell">نسبة الإنجاز الفعلي:</td>
            <td colspan="3" class="value-cell highlight-emerald">${r.actualProgress || 0}%</td>
          </tr>
          <tr>
            <td class="label-cell">مدة العقد الأصلية:</td>
            <td class="value-cell">${r.durationDays || 0} يوم</td>
            <td class="label-cell">تاريخ المباشرة:</td>
            <td class="value-cell">${r.startDate ? formatDateDMY(r.startDate) : "—"}</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF" + excelHtml], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`📊 تم تصدير التقرير الشهري إلى ملف Excel بنجاح: ${filename}`);
  };

  const handlePrintReport = () => {
    const printEl = document.getElementById("printable-report-sheet");
    if (!printEl) {
      window.print();
      return;
    }

    const win = window.open("", "_blank", "width=960,height=1080");
    if (!win) {
      window.print();
      return;
    }

    const css = `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      @page {
        size: A4 portrait;
        margin: 6mm 8mm 6mm 8mm;
      }
      html, body {
        font-family: 'Cairo', Tahoma, Arial, sans-serif;
        direction: rtl;
        background: #ffffff !important;
        color: #0f172a !important;
        font-size: 10px;
        line-height: 1.35;
        width: 100%;
        max-width: 194mm;
        margin: 0 auto;
        padding: 0;
      }
      .flex { display: flex; }
      .flex-col { flex-direction: column; }
      .items-center { align-items: center; }
      .justify-between { justify-content: space-between; }
      .justify-center { justify-content: center; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .text-left { text-align: left; }
      .grid { display: grid; }
      .grid-cols-2 { grid-template-columns: 1fr 1fr; }
      .grid-cols-3 { grid-template-columns: 1fr 1fr 1fr; }
      .border { border: 1px solid #cbd5e1 !important; }
      .rounded-lg { border-radius: 4px; }
      .rounded-xl { border-radius: 6px; }
      .bg-white { background: #ffffff !important; }
      .bg-slate-50 { background: #f8fafc !important; }
      .bg-blue-50 { background: #eff6ff !important; }
      .bg-emerald-50 { background: #ecfdf5 !important; }
      .report-header-banner {
        background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%) !important;
        color: #ffffff !important;
        border: 1px solid #1e3a8a !important;
        border-radius: 6px !important;
        padding: 5px 10px !important;
        margin-bottom: 4px !important;
      }
      button, [role="button"], .no-print { display: none !important; }
      img { max-width: 100%; height: auto; }
    `;

    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>التقرير الشهري - ${previewReport?.projectName || "مديرية ماء الأنبار"}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" />
  <style>${css}</style>
</head>
<body>
  <div>${printEl.innerHTML}</div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.close();
      }, 350);
    };
  </script>
</body>
</html>`);
    win.document.close();
    win.focus();
  };

  return (
    <div className="space-y-6 pb-12 dir-rtl text-right">
      {/* ─── Executive Top Header & Action Banner ─────────────────────────────────── */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-sky-50/95 via-cyan-50/80 to-blue-50/70 border-2 border-cyan-200/80 dark:bg-slate-900 dark:border-slate-800 shadow-xs relative overflow-hidden text-slate-900 dark:text-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-600 border border-cyan-200/80 flex items-center justify-center shadow-2xs">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                نظام التقارير الشهرية الرسمية
              </h1>
              <p className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
                منظومة توثيق ومتابعة وتوزيع التقارير الشهرية لمشاريع ماء محافظة الأنبار وتفصيلها حسب المناطق والجهات
              </p>
            </div>
          </div>

          {/* Top Primary Actions & Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={() => setIsProjectSelectOpen(true)}
              className="gap-2 rounded-2xl text-xs md:text-sm font-black transition-all shadow-md bg-gradient-to-r from-cyan-500 via-sky-600 to-blue-700 hover:from-cyan-400 hover:to-blue-600 text-white shadow-cyan-500/25 active:scale-[0.98] py-5 px-5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> إصدار تقرير شهري جديد
            </Button>
            <Button
              onClick={() => setActiveTab("archive")}
              variant="outline"
              className={`gap-2 rounded-2xl text-xs md:text-sm font-bold transition-all py-5 px-4 cursor-pointer border-2 ${
                activeTab === "archive"
                  ? "bg-cyan-500/15 text-cyan-900 border-cyan-500 dark:text-cyan-200 font-black shadow-2xs"
                  : "bg-background hover:bg-cyan-50/50 text-slate-700 dark:text-slate-300 border-border/80"
              }`}
            >
              <FileCheck className="w-4 h-4" /> أرشيف التقارير ({reports.length})
            </Button>
          </div>
        </div>

        {/* Global KPI Summary Counter Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-cyan-200/80 dark:border-slate-800 relative z-10">
          <div className="bg-white/80 dark:bg-slate-800/80 border border-cyan-200/70 dark:border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block">إجمالي التقارير المفروضة</span>
              <span className="text-xl font-black text-cyan-950 dark:text-cyan-100 mt-0.5 block">{stats.total} تقرير</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center border border-cyan-200/80">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/80 border border-emerald-200/70 dark:border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block">معتمدة رسمياً</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">{stats.approved} تقرير</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-200/80">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/80 border border-blue-200/70 dark:border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block">متوسط نسبة الإنجاز</span>
              <span className="text-xl font-black text-blue-700 dark:text-blue-300 mt-0.5 block">{stats.avgProgress}%</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-200/80">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block">إجمالي كلفة التقارير</span>
              <span className="text-base font-black text-slate-900 dark:text-slate-100 mt-0.5 block truncate max-w-[140px]">
                {stats.totalContractValue.toLocaleString("en-US")} <span className="text-xs font-bold">د.ع</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: REPORTS ARCHIVE & MULTI-FILTER HUB ───────────────────────── */}
      {activeTab === "archive" && (
        <div className="space-y-6">
          {/* Universal Multi-Filter Control Hub Box */}
          <Card className="border-2 border-cyan-200/80 dark:border-slate-800 bg-card rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center border border-cyan-200/60">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground">مركز الفلترة المتقدم والشامل</h3>
                  <p className="text-xs text-muted-foreground">تصفية وتخصيص جميع التقارير حسب القضاء، التمويل، نوع المشروع، الحالة، والتاريخ</p>
                </div>
              </div>

              {/* View Mode Toggle Switch (عرض شامل VS عرض المنطقة) */}
              <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-2xl border border-border/60 self-stretch sm:self-auto justify-center">
                <button
                  type="button"
                  onClick={() => setViewMode("all")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "all"
                      ? "bg-background text-foreground shadow-xs border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> العرض الشامل
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("district")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "district"
                      ? "bg-cyan-600 text-white shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" /> تفصيل حسب المنطقة / القضاء
                </button>
              </div>
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* 1. Quick Keyword Search */}
              <div className="space-y-1 sm:col-span-2 md:col-span-2 lg:col-span-2">
                <Label className="text-[11px] font-bold text-muted-foreground">البحث السريع في التقارير</Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute right-3 top-3 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث باسم المشروع، المهندس، المقاول، العقد..."
                    className="pr-9 pl-8 text-xs rounded-xl bg-background border-border font-medium focus:ring-2 focus:ring-cyan-500/20"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute left-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* 2. District Filter */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-cyan-600" /> القضاء / المنطقة
                </Label>
                <select
                  value={districtFilter}
                  onChange={(e) => {
                    setDistrictFilter(e.target.value);
                    if (e.target.value !== "all") {
                      setViewMode("district");
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border border-border text-xs font-bold text-foreground bg-background focus:ring-2 focus:ring-cyan-500/20 dir-rtl cursor-pointer"
                >
                  <option value="all">جميع الأقضية والمناطق</option>
                  {ANBAR_DISTRICTS.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Funding Filter */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-600" /> جهة التمويل
                </Label>
                <select
                  value={fundingFilter}
                  onChange={(e) => setFundingFilter(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border text-xs font-bold text-foreground bg-background focus:ring-2 focus:ring-cyan-500/20 dir-rtl cursor-pointer"
                >
                  {FUNDING_SOURCES.map((f) => (
                    <option key={f} value={f === "جميع جهات التمويل" ? "all" : f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Project Type Filter */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-blue-600" /> نوع المشروع
                </Label>
                <select
                  value={projectTypeFilter}
                  onChange={(e) => setProjectTypeFilter(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border text-xs font-bold text-foreground bg-background focus:ring-2 focus:ring-cyan-500/20 dir-rtl cursor-pointer"
                >
                  {PROJECT_TYPES.map((pt) => (
                    <option key={pt} value={pt === "جميع أنواع المشاريع" ? "all" : pt}>
                      {pt}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Status Filter */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-amber-600" /> حالة الاعتماد
                </Label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border text-xs font-bold text-foreground bg-background focus:ring-2 focus:ring-cyan-500/20 dir-rtl cursor-pointer"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="approved">معتمد رسمياً</option>
                  <option value="pending">قيد الاعتماد والمراجعة</option>
                  <option value="draft">مسودة</option>
                </select>
              </div>
            </div>

            {/* Quick Filter Pill Buttons & Reset */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-muted-foreground">مناطق شائعة:</span>
                {["الرمادي", "الفلوجة", "هيت", "حديثة", "القائم"].map((distName) => (
                  <button
                    key={distName}
                    type="button"
                    onClick={() => {
                      setDistrictFilter(distName);
                      setViewMode("district");
                    }}
                    className={`text-[11px] font-bold px-3 py-1 rounded-xl border transition-all cursor-pointer ${
                      districtFilter === distName
                        ? "bg-cyan-600 text-white border-cyan-600 shadow-2xs"
                        : "bg-background text-muted-foreground border-border hover:border-cyan-500 hover:text-cyan-600"
                    }`}
                  >
                    📍 {distName}
                  </button>
                ))}
              </div>

              {(searchQuery || districtFilter !== "all" || fundingFilter !== "all" || projectTypeFilter !== "all" || statusFilter !== "all") && (
                <Button
                  onClick={handleResetFilters}
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> إعادة ضبط الفلاتر
                </Button>
              )}
            </div>
          </Card>

          {/* ─── SINGLE REGION / DISTRICT DETAILED BREAKDOWN DASHBOARD ─────────────── */}
          {viewMode === "district" && districtStats && (
            <Card className="border-2 border-cyan-500/40 bg-gradient-to-l from-slate-900 via-slate-950 to-blue-950 text-white rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-white">
                        التفصيل التحليلي والمالي لمنطقة / قضاء: {districtStats.districtName}
                      </h2>
                      <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-xs px-2.5 py-0.5">
                        تقرير منطقة منفصل
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      تفصيل شامـل لكافة التقارير وكلف المشاريع ونسب الإنجاز لقضاء {districtStats.districtName}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setDistrictFilter("all");
                    setViewMode("all");
                  }}
                  variant="outline"
                  className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-2xl text-xs font-bold py-2 px-4 cursor-pointer"
                >
                  <X className="w-4 h-4" /> العودة للعرض الشامل
                </Button>
              </div>

              {/* District KPI Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <span className="text-[11px] text-slate-400 font-bold block">مشاريع وتقارير المنطقة</span>
                  <span className="text-2xl font-black text-cyan-300 mt-1 block">{districtStats.count} تقرير</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <span className="text-[11px] text-slate-400 font-bold block">مجموع المبالغ المالية للمنطقة</span>
                  <span className="text-lg font-black text-emerald-400 mt-1 block truncate">
                    {districtStats.totalVal.toLocaleString("en-US")} <span className="text-xs font-bold">د.ع</span>
                  </span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <span className="text-[11px] text-slate-400 font-bold block">متوسط نسبة الإنجاز بالمنطقة</span>
                  <span className="text-2xl font-black text-blue-300 mt-1 block">{districtStats.avgProg}%</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <span className="text-[11px] text-slate-400 font-bold block">الشركات والمهندسون بالمنطقة</span>
                  <span className="text-base font-black text-amber-300 mt-1 block">
                    {districtStats.contractorsCount} مقاول / {districtStats.engineersCount} مهندس
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* ─── MASTER REPORTS GRID & CARDS LIST ───────────────────────────────── */}
          {filteredReports.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredReports.map((r) => (
                <Card
                  key={r.id}
                  className="border border-border/80 bg-card hover:border-cyan-500/50 rounded-3xl shadow-xs transition-all duration-200 hover:shadow-md group overflow-hidden flex flex-col justify-between"
                >
                  <CardHeader className="p-5 pb-3 border-b border-border/40 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={
                            r.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10.5px] font-bold"
                              : r.status === "pending"
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10.5px] font-bold"
                              : "bg-slate-100 text-slate-600 border border-slate-200 text-[10.5px] font-bold"
                          }
                        >
                          {r.status === "approved" ? "معتمد رسمياً" : r.status === "pending" ? "قيد المراجعة" : "مسودة"}
                        </Badge>
                        {r.district && (
                          <span className="text-[10.5px] font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {r.district}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                        {r.month} {r.year}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-foreground group-hover:text-cyan-600 transition-colors leading-snug line-clamp-2">
                      {r.projectName}
                    </h3>

                    <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1">
                      <span>رقم العقد: <strong>{r.contractNo || "—"}</strong></span>
                      <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{r.reportNo}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 pt-3 space-y-4 flex-1 flex flex-col justify-between">
                    {/* Execution Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-muted-foreground">نسبة الإنجاز الفعلي:</span>
                        <span className="text-emerald-600 font-mono text-sm">{r.actualProgress}%</span>
                      </div>
                      <Progress value={r.actualProgress} className="h-2 bg-muted rounded-full" />
                    </div>

                    {/* Details Summary Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-muted/40 p-3 rounded-2xl border border-border/40">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">الجهة الممولة</span>
                        <span className="font-bold text-foreground truncate block">{r.fundingSource || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">كلفة العقد</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono block">
                          {(r.contractValue || 0).toLocaleString("en-US")} د.ع
                        </span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-border/40 flex items-center justify-between">
                        <span className="text-muted-foreground">المهندس المقيم:</span>
                        <span className="font-bold text-foreground">{r.residentEngineer || "—"}</span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                      <Button
                        onClick={() => {
                          setPreviewReport(r);
                          setActiveTab("preview");
                        }}
                        className="flex-1 gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold py-2 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> المعاينة الرسمية
                      </Button>
                      <Button
                        onClick={() => handleExportReportToExcel(r)}
                        variant="outline"
                        size="icon"
                        className="rounded-xl hover:bg-emerald-50 text-emerald-700 border-emerald-200 cursor-pointer"
                        title="تصدير Excel"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteReport(r.id)}
                        variant="ghost"
                        size="icon"
                        className="rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                        title="حذف التقرير"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border border-dashed border-border bg-card rounded-3xl p-12 text-center space-y-4">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-base font-bold text-foreground">لا توجد تقارير مطابقة لمحددات الفلترة الحالية</h3>
                <p className="text-xs text-muted-foreground mt-1">جرّب تغيير خيارات الفلترة أو إعادة ضبط البحث لعرض التقارير</p>
              </div>
              <Button onClick={handleResetFilters} variant="outline" className="rounded-2xl gap-2 font-bold text-xs">
                <RotateCcw className="w-4 h-4" /> إعادة ضبط الفلاتر
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* ─── TAB 2: CREATE NEW MONTHLY REPORT FORM WIZARD ──────────────────────── */}
      {activeTab === "create" && (
        <div className="space-y-6">
          {activeProject ? (
            <Card className="border-2 border-blue-500/30 bg-gradient-to-l from-slate-900 via-blue-950/90 to-slate-900 text-white rounded-3xl shadow-xl overflow-hidden relative">
              <CardContent className="p-6 relative z-10">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-blue-500/20 text-blue-300 border border-blue-400/40 text-xs px-3 py-1 font-bold">
                        المشروع المحدد حالياً لإعداد التقرير
                      </Badge>
                      {activeProject.contractNo && (
                        <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-lg border border-slate-700">
                          عقد رقم: {activeProject.contractNo}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-white leading-snug">
                      {activeProject.name}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto">
                    <Button
                      onClick={() => setIsProjectSelectOpen(true)}
                      className="flex-1 lg:flex-none gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black py-4 px-5 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" /> تغيير المشروع / اختيار من القائمة
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-dashed border-slate-300 bg-slate-50 rounded-3xl p-8 text-center space-y-4">
              <Building2 className="w-12 h-12 text-slate-400 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-slate-800">لم يتم اختيار أي مشروع بعد</h3>
                <p className="text-xs text-slate-500 mt-1">اضغط على الزر أدناه لتحديد المشروع والبدء بإعداد تقريره الشهري</p>
              </div>
              <Button
                onClick={() => setIsProjectSelectOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs px-6 py-2.5 shadow-md gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> اختيار مشروع الآن
              </Button>
            </Card>
          )}

          {/* Form Wizard Controls */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border border-slate-200 rounded-3xl shadow-sm bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/80 py-4 px-6">
                  <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" /> فترة التقرير والبيانات التعاقدية الأساسية
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">الشهر المستهدف *</Label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500/20 dir-rtl"
                      >
                        {MONTHS_LIST.filter(m => m !== "جميع الأشهر").map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">السنة المالية *</Label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500/20 dir-rtl"
                      >
                        {YEARS_LIST.filter(y => y !== "جميع السنوات").map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">رقم التقرير المرجعي *</Label>
                      <Input
                        value={reportNo}
                        onChange={(e) => setReportNo(e.target.value)}
                        className="text-xs font-mono font-bold bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">المهندس المقيم المسؤول *</Label>
                      <Input
                        value={residentEngineer}
                        onChange={(e) => setResidentEngineer(e.target.value)}
                        className="text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">الشركة المنفذة (المقاول) *</Label>
                      <Input
                        value={contractor}
                        onChange={(e) => setContractor(e.target.value)}
                        className="text-xs font-bold"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 rounded-3xl shadow-sm bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/80 py-4 px-6">
                  <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" /> تفاصيل الأعمال المنفذة والتوريدات خلال الشهر
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">الأعمال المنجزة خلال الشهر *</Label>
                    <Textarea
                      rows={4}
                      value={executedWorks}
                      onChange={(e) => setExecutedWorks(e.target.value)}
                      placeholder="اذكر التفاصيل الفنية المنجزة بالكامل خلال هذا الشهر..."
                      className="text-xs text-right leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">المواد والتوريدات الواصلة للموقع</Label>
                    <Textarea
                      rows={2}
                      value={materialsDelivered}
                      onChange={(e) => setMaterialsDelivered(e.target.value)}
                      placeholder="المواد والآليات والمعدات الواصلة للموقع..."
                      className="text-xs text-right leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">المعوقات والملاحظات والمعالجات</Label>
                    <Textarea
                      rows={2}
                      value={obstaclesAndNotes}
                      onChange={(e) => setObstaclesAndNotes(e.target.value)}
                      placeholder="أية معوقات إدارية أو موقعية أو توصيات خاصة..."
                      className="text-xs text-right leading-relaxed"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Side Action Panel */}
            <div className="space-y-6">
              <Card className="border border-slate-200 rounded-3xl p-6 shadow-sm bg-white space-y-4">
                <h3 className="text-sm font-black text-slate-900 border-b pb-3">اعتماد وتصدير التقرير</h3>
                <div className="space-y-2.5">
                  <Button
                    onClick={() => handleSaveReport("approved")}
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs py-5 cursor-pointer shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" /> اعتماد وتصدير التقرير الشهري
                  </Button>
                  <Button
                    onClick={() => handleSaveReport("draft")}
                    variant="outline"
                    className="w-full gap-2 border-slate-300 text-slate-700 rounded-2xl font-bold text-xs py-5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> حفظ كمسودة مؤقتة
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: OFFICIAL A4 PRINTABLE PREVIEW & LETTERHEAD ──────────────────── */}
      {activeTab === "preview" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 text-white p-4 rounded-3xl shadow-md no-print">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setActiveTab("archive")}
                variant="ghost"
                className="text-white hover:bg-slate-800 rounded-xl text-xs gap-1.5"
              >
                <ArrowRight className="w-4 h-4" /> العودة للأرشيف
              </Button>
              <span className="text-xs font-bold text-slate-300">
                المعاينة الرسمية للتقرير الشهري A4
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handlePrintReport}
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> طباعة / تصدير PDF
              </Button>
              <Button
                onClick={() => handleExportReportToExcel(previewReport)}
                variant="outline"
                className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700 rounded-xl text-xs font-bold gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" /> تصدير Excel
              </Button>
            </div>
          </div>

          {/* Printable Official Sheet Container */}
          <div id="printable-report-sheet" className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-xl max-w-[194mm] mx-auto text-slate-900 dir-rtl text-right">
            {/* Letterhead Header */}
            <div className="report-header-banner grid grid-cols-3 items-center mb-4">
              <div className="text-right">
                <h2 className="text-sm md:text-base font-black text-white leading-tight">مديرية ماء الانبار</h2>
                <h3 className="text-xs font-bold text-blue-100 mt-0.5">قسم تكنلوجية المعلومات IT</h3>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-12 h-12 bg-white rounded-xl p-1 flex items-center justify-center shadow-xs">
                  <AnbarWaterLogo size={40} />
                </div>
              </div>
              <div className="text-left font-mono text-xs text-white">
                <div>العدد: {previewReport?.reportNo || "REP/2026/09/101"}</div>
                <div>التاريخ: {previewReport?.date ? formatDateDMY(previewReport.date) : "2026-09-17"}</div>
              </div>
            </div>

            {/* Official Report Title */}
            <div className="text-center py-2 border-b-2 border-blue-900 mb-4">
              <h1 className="text-base font-black text-blue-950">
                استمارة التقرير الشهري لمتابعة تقدم الأعمال الميدانية (${previewReport?.month || "أيلول"} ${previewReport?.year || "2026"})
              </h1>
            </div>

            {/* Section 1: Project Details */}
            <div className="section-box mb-4">
              <div className="section-header-blue">1. البيانات التعاقدية والأساسية للمشروع</div>
              <div className="section-body grid grid-cols-2 gap-2 p-3">
                <div>اسم المشروع: <strong>{previewReport?.projectName || "—"}</strong></div>
                <div>رقم العقد وتاريخه: <strong>{previewReport?.contractNo || "—"} ({previewReport?.contractDate ? formatDateDMY(previewReport.contractDate) : "—"})</strong></div>
                <div>القضاء / المنطقة: <strong>{previewReport?.district || "الأنبار"} {previewReport?.subDistrict ? `/ ${previewReport.subDistrict}` : ""}</strong></div>
                <div>اسم المركز: <strong>{previewReport?.centerName || "—"}</strong></div>
                <div>الشركة المنفذة (المقاول): <strong>{previewReport?.contractor || "—"}</strong></div>
                <div>الجهة الممولة: <strong>{previewReport?.fundingSource || "الخطة الاستثمارية"}</strong></div>
                <div>المهندس المقيم: <strong>{previewReport?.residentEngineer || "م. أحمد الجبوري"}</strong></div>
                <div>هاتف المهندس: <strong>{previewReport?.residentEngineerPhone || "—"}</strong></div>
              </div>
            </div>

            {/* Section 2: Financial Details */}
            <div className="section-box mb-4">
              <div className="section-header-emerald">2. البيانات المالية وأوامر الغيار</div>
              <div className="section-body grid grid-cols-3 gap-2 p-3">
                <div>قيمة العقد الأساسية: <strong>{(previewReport?.contractValue || 0).toLocaleString("en-US")} د.ع</strong></div>
                <div>عدد أوامر الغيار: <strong>{previewReport?.changeOrdersCount || 0} أمر</strong></div>
                <div>مجموع أوامر الغيار: <strong>{(previewReport?.changeOrdersTotalAmount || 0).toLocaleString("en-US")} د.ع</strong></div>
              </div>
            </div>

            {/* Section 3: Progress Indicators */}
            <div className="section-box mb-4">
              <div className="section-header-amber">3. مؤشرات ونسب الإنجاز والتوقيتات الزمنيّة</div>
              <div className="section-body grid grid-cols-3 gap-2 p-3">
                <div>نسبة الإنجاز الفعلي: <strong className="text-emerald-700 font-black">{previewReport?.actualProgress || 0}%</strong></div>
                <div>مدة التنفيذ (أيام): <strong>{previewReport?.durationDays || 360} يوم</strong></div>
                <div>تاريخ المباشرة: <strong>{previewReport?.startDate ? formatDateDMY(previewReport.startDate) : "—"}</strong></div>
              </div>
            </div>

            {/* Section 4: Executed Works */}
            <div className="section-box mb-6">
              <div className="section-header-slate">4. تفاصيل الأعمال والأنشطة المنفذة خلال الشهر والمعوقات</div>
              <div className="section-body space-y-2 p-3">
                <div>
                  <strong className="block text-blue-900 mb-0.5">الأعمال المنفذة ميدانياً:</strong>
                  <p className="whitespace-pre-line text-slate-800">{previewReport?.executedWorks || "تم تنفيذ الفقرات والفعاليات بنجاح وفق الجدول الزمني."}</p>
                </div>
                <div>
                  <strong className="block text-emerald-900 mb-0.5">المواد والتوريدات الواصلة للموقع:</strong>
                  <p className="whitespace-pre-line text-slate-800">{previewReport?.materialsDelivered || "وصول المواد المعتمدة للموقع."}</p>
                </div>
                <div>
                  <strong className="block text-amber-900 mb-0.5 font-bold">المعوقات والملاحظات:</strong>
                  <p className="whitespace-pre-line text-slate-800">{previewReport?.obstaclesAndNotes || "لا توجد معوقات رئيسية."}</p>
                </div>
              </div>
            </div>

            {/* Official Signatures Grid */}
            <div className="grid grid-cols-3 gap-4 text-center text-xs font-bold pt-6 border-t-2 border-slate-300">
              <div>
                <div>المهندس المقيم</div>
                <div className="mt-8 text-slate-500 font-normal">{previewReport?.residentEngineer || "التوقيع والاسم"}</div>
              </div>
              <div>
                <div>مسؤول شعبة المتابعة</div>
                <div className="mt-8 text-slate-500 font-normal">التوقيع والختم</div>
              </div>
              <div>
                <div>مدير ماء محافظة الأنبار</div>
                <div className="mt-8 text-slate-500 font-normal">المواادقة والاعتماد</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Selection Modal Dialog */}
      <ProjectSelectionDialog
        open={isProjectSelectOpen}
        onOpenChange={setIsProjectSelectOpen}
        onClose={() => setIsProjectSelectOpen(false)}
        onSelectProject={handleSelectProjectFromDialog}
        onSelectMultipleProjects={handleSelectMultipleProjectsFromDialog}
        projects={projects}
      />
    </div>
  );
}

// Ensure clean dynamic import module loading
export default ReportsPage;

