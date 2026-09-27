import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  FileText, Sparkles, Printer, Eye, CheckCircle2, Clock, AlertTriangle,
  Calendar, Building2, MapPin, User, Search, Filter, Share2,
  DollarSign, Layers, FileSpreadsheet, RotateCcw,
  SlidersHorizontal, Check, MessageCircle, Copy, Grid, List,
  ArrowUpDown, TrendingUp, HelpCircle, HardHat,
  ChevronLeft, X, ExternalLink, BookmarkCheck
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getStoredProjects, type Project, type ProjectStatus, ANBAR_DISTRICTS, STATUS_LABEL } from "@/lib/mock-data";
import { formatDateDMY } from "@/components/AddProjectWizard";
import { AnbarWaterLogo } from "@/components/AnbarWaterLogo";
import { getProjectsFromSupabase } from "@/lib/supabase-db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/reports-pro")({
  component: ReportsProPage,
});

export function ReportsProPage() {
  // ─── State Management ─────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedFunding, setSelectedFunding] = useState<string>("all");
  const [selectedContractor, setSelectedContractor] = useState<string>("all");
  const [selectedEngineer, setSelectedEngineer] = useState<string>("all");
  const [selectedProgressRange, setSelectedProgressRange] = useState<string>("all");
  const [selectedBudgetRange, setSelectedBudgetRange] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"progress_desc" | "progress_asc" | "budget_desc" | "budget_asc" | "date_desc" | "name_asc">("progress_desc");
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Active Preview Project for Official A4 Modal
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // ─── Load Projects ────────────────────────────────────────────────────────────
  const loadProjects = async () => {
    setLoading(true);
    const localList = getStoredProjects();
    setProjects(localList);

    try {
      const remoteList = await getProjectsFromSupabase();
      if (remoteList && remoteList.length > 0) {
        const map = new Map<string, Project>();
        remoteList.forEach((p) => map.set(p.id, p));
        localList.forEach((p) => map.set(p.id, p));
        setProjects(Array.from(map.values()));
      }
    } catch (e) {
      console.warn("Could not sync projects from Supabase in Reports Pro:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // ─── Dynamic Dropdown Options ─────────────────────────────────────────────────
  const distinctFundingSources = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.fundingSource?.trim()) set.add(p.fundingSource.trim());
    });
    return Array.from(set);
  }, [projects]);

  const distinctContractors = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.contractor?.trim()) set.add(p.contractor.trim());
    });
    return Array.from(set);
  }, [projects]);

  const distinctEngineers = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.residentEngineerName?.trim()) set.add(p.residentEngineerName.trim());
    });
    return Array.from(set);
  }, [projects]);

  // ─── Filter & Sort Logic ──────────────────────────────────────────────────────
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const normalizeDigits = (str: string) =>
          str.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
        const normQ = normalizeDigits(q);
        const matchField = (val?: string | number | null) => {
          if (!val) return false;
          const str = String(val).toLowerCase();
          return str.includes(q) || normalizeDigits(str).includes(normQ);
        };
        const matchName = matchField(p.name);
        const matchContractNo = matchField(p.contractNo);
        const matchReferralNo = matchField(p.referralNo);
        const matchContractor = matchField(p.contractor);
        const matchLocation = matchField(p.location);
        const matchDistrict = matchField(p.district);
        const matchEngineer = matchField(p.residentEngineerName);
        const matchCenter = matchField(p.centerName);
        if (!matchName && !matchContractNo && !matchReferralNo && !matchContractor && !matchLocation && !matchDistrict && !matchEngineer && !matchCenter) {
          return false;
        }
      }

      // 2. Status
      if (selectedStatus !== "all") {
        if (p.status !== selectedStatus) return false;
      }

      // 3. District
      if (selectedDistrict !== "all") {
        if (p.district !== selectedDistrict) return false;
      }

      // 4. Project Type
      if (selectedType !== "all") {
        if (p.type !== selectedType) return false;
      }

      // 5. Funding Source
      if (selectedFunding !== "all") {
        if (p.fundingSource !== selectedFunding) return false;
      }

      // 6. Contractor
      if (selectedContractor !== "all") {
        if (p.contractor !== selectedContractor) return false;
      }

      // 7. Resident Engineer
      if (selectedEngineer !== "all") {
        if (p.residentEngineerName !== selectedEngineer) return false;
      }

      // 8. Progress Range
      if (selectedProgressRange !== "all") {
        const prog = Number(p.actualProgress || 0);
        if (selectedProgressRange === "0-25" && (prog < 0 || prog > 25)) return false;
        if (selectedProgressRange === "26-50" && (prog <= 25 || prog > 50)) return false;
        if (selectedProgressRange === "51-75" && (prog <= 50 || prog > 75)) return false;
        if (selectedProgressRange === "76-99" && (prog <= 75 || prog >= 100)) return false;
        if (selectedProgressRange === "100" && prog < 100) return false;
      }

      // 9. Budget Range
      if (selectedBudgetRange !== "all") {
        const val = Number(p.contractValue || 0);
        if (selectedBudgetRange === "under500m" && val >= 500_000_000) return false;
        if (selectedBudgetRange === "500m-1b" && (val < 500_000_000 || val > 1_000_000_000)) return false;
        if (selectedBudgetRange === "1b-5b" && (val < 1_000_000_000 || val > 5_000_000_000)) return false;
        if (selectedBudgetRange === "over5b" && val <= 5_000_000_000) return false;
      }

      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case "progress_desc":
          return (Number(b.actualProgress || 0) - Number(a.actualProgress || 0));
        case "progress_asc":
          return (Number(a.actualProgress || 0) - Number(b.actualProgress || 0));
        case "budget_desc":
          return (Number(b.contractValue || 0) - Number(a.contractValue || 0));
        case "budget_asc":
          return (Number(a.contractValue || 0) - Number(b.contractValue || 0));
        case "date_desc":
          return (new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime());
        case "name_asc":
          return (a.name || "").localeCompare(b.name || "", "ar");
        default:
          return 0;
      }
    });
  }, [
    projects, searchQuery, selectedStatus, selectedDistrict, selectedType,
    selectedFunding, selectedContractor, selectedEngineer, selectedProgressRange,
    selectedBudgetRange, sortBy
  ]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedStatus !== "all") count++;
    if (selectedDistrict !== "all") count++;
    if (selectedType !== "all") count++;
    if (selectedFunding !== "all") count++;
    if (selectedContractor !== "all") count++;
    if (selectedEngineer !== "all") count++;
    if (selectedProgressRange !== "all") count++;
    if (selectedBudgetRange !== "all") count++;
    return count;
  }, [
    searchQuery, selectedStatus, selectedDistrict, selectedType,
    selectedFunding, selectedContractor, selectedEngineer, selectedProgressRange,
    selectedBudgetRange
  ]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedStatus("all");
    setSelectedDistrict("all");
    setSelectedType("all");
    setSelectedFunding("all");
    setSelectedContractor("all");
    setSelectedEngineer("all");
    setSelectedProgressRange("all");
    setSelectedBudgetRange("all");
    setSortBy("progress_desc");
    toast.info("تمت إعادة ضبط جميع الفلاتر");
  };

  // ─── Statistics Summary ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = filteredProjects.length;
    const ongoing = filteredProjects.filter((p) => p.status === "ongoing").length;
    const delayed = filteredProjects.filter((p) => p.status === "delayed" || p.status === "stopped").length;
    const completed = filteredProjects.filter((p) => p.status === "completed" || Number(p.actualProgress || 0) >= 100).length;
    const totalBudget = filteredProjects.reduce((acc, p) => acc + Number(p.contractValue || 0), 0);
    const avgProgress = total > 0
      ? Math.round(filteredProjects.reduce((acc, p) => acc + Number(p.actualProgress || 0), 0) / total)
      : 0;

    return { total, ongoing, delayed, completed, totalBudget, avgProgress };
  }, [filteredProjects]);

  // ─── Action: WhatsApp Share Text Builder ──────────────────────────────────────
  const generateWhatsAppText = (project: Project): string => {
    const isComp = project.status === "completed" || Number(project.actualProgress || 0) >= 100;
    const statusText = STATUS_LABEL[project.status] || (isComp ? "منجز بالكامل" : "قيد التنفيذ");
    const contractVal = Number(project.contractValue || 0).toLocaleString("en-US");
    const changeOrdersCount = Array.isArray(project.changeOrdersList) ? project.changeOrdersList.length : 0;
    const changeOrdersTotal = Number(project.changeOrdersTotalAmount || 0).toLocaleString("en-US");

    return [
      `🏛️ *جمهورية العراق*`,
      `💧 *مديرية ماء الانبار*`,
      `💻 *قسم تكنلوجية المعلومات*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📋 *تقرير مشروع رسمي: ${project.name}*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📍 *الموقع:* ${project.district || "الأنبار"} - ${project.location || "مركز المشروع"}`,
      `🔢 *رقم العقد:* ${project.contractNo || "—"}`,
      `📅 *تاريخ العقد:* ${project.contractDate ? formatDateDMY(project.contractDate) : "—"}`,
      `🏢 *الشركة المنفذة (المقاول):* ${project.contractor || "—"}`,
      `👷‍♂️ *المهندس المقيم:* ${project.residentEngineerName || "—"}`,
      `🏛️ *الجهة الممولة:* ${project.fundingSource || "خطة المحافظة"}`,
      `📊 *حالة المشروع:* ${statusText}`,
      `📈 *نسبة الإنجاز الفعلي:* ${project.actualProgress || 0}% (المخطط: ${project.plannedProgress || 0}%)`,
      `💰 *قيمة العقد الأساسية:* ${contractVal} د.ع`,
      ...(changeOrdersCount > 0 ? [`📑 *أوامر الغيار:* ${changeOrdersCount} أمر (المجموع: ${changeOrdersTotal} د.ع)`] : []),
      `⏱️ *تاريخ المباشرة:* ${project.startDate ? formatDateDMY(project.startDate) : "—"}`,
      `⏳ *المدة التعاقدية:* ${project.durationDays || 0} يوم`,
      ...(project.additionalDuration ? [`➕ *المدد الإضافية:* ${project.additionalDuration}`] : []),
      `🎯 *تاريخ الإنجاز التعاقدي:* ${project.contractualCompletionDate || project.plannedEndDate ? formatDateDMY(project.contractualCompletionDate || project.plannedEndDate) : "—"}`,
      ...(project.notes ? [`📝 *ملاحظات:* ${project.notes}`] : []),
      `━━━━━━━━━━━━━━━━━━━━`,
      `✅ *صادر عن منظومة تقارير Pro - مديرية ماء محافظة الأنبار*`,
    ].join("\n");
  };

  const handleShareWhatsApp = (project: Project) => {
    const text = generateWhatsAppText(project);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    toast.success("تم فتح تطبيق واتساب للمشاركة");
  };

  // ─── Action: Web Share / Copy ─────────────────────────────────────────────────
  const handleShareGeneric = async (project: Project) => {
    const text = generateWhatsAppText(project);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `تقرير مشروع: ${project.name}`,
          text: text,
        });
        toast.success("تمت المشاركة بنجاح");
        return;
      } catch (err) {
        // Fallback to clipboard if user canceled or rejected
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success("تم نسخ ملخص التقرير إلى الحافظة بنجاح!");
    } catch {
      toast.error("تعذر نسخ التقرير تلقائياً");
    }
  };

  // ─── Action: Excel Export (Single or Multi) ───────────────────────────────────
  const handleExportToExcel = (specificProject?: Project) => {
    const listToExport = specificProject ? [specificProject] : filteredProjects;

    if (listToExport.length === 0) {
      toast.error("لا توجد مشاريع مجهّزة للتصدير إلى Excel");
      return;
    }

    const cleanName = specificProject
      ? specificProject.name.replace(/[\\/:*?"<>|]/g, "_")
      : `قائمة_${listToExport.length}_مشاريع`;
    const filename = specificProject
      ? `تقرير_مشروع_${cleanName}.xls`
      : `تقرير_Pro_مشاريع_ماء_الانبار_${new Date().toISOString().split("T")[0]}.xls`;

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>تقارير Pro - مديرية ماء الأنبار</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayRightToLeft/>
                  <x:DoNotDisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; text-align: right; }
          table { border-collapse: collapse; width: 100%; font-size: 10pt; }
          .header-main { background-color: #1E3A8A; color: #FFFFFF; font-size: 13pt; font-weight: bold; text-align: center; padding: 12px; }
          .sub-header { background-color: #0284C7; color: #FFFFFF; font-size: 11pt; font-weight: bold; text-align: center; padding: 8px; }
          th { background-color: #0F172A; color: #FFFFFF; font-weight: bold; border: 1px solid #CBD5E1; padding: 10px; text-align: center; }
          td { border: 1px solid #CBD5E1; padding: 8px; text-align: right; vertical-align: middle; }
          .highlight-emerald { background-color: #ECFDF5; color: #047857; font-weight: bold; text-align: center; }
          .highlight-blue { background-color: #EFF6FF; color: #1D4ED8; font-weight: bold; }
          .highlight-amber { background-color: #FFFBEB; color: #B45309; }
          .center-cell { text-align: center; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <th colspan="13" class="header-main">
              جمهورية العراق - مديرية ماء الانبار - قسم تكنلوجية المعلومات
            </th>
          </tr>
          <tr>
            <th colspan="13" class="sub-header">
              ${specificProject ? `تقرير مشروع رسمي مفصل: ${specificProject.name}` : `منظومة تقارير Pro لمتابعة المشاريع (${listToExport.length} مشروع)`}
            </th>
          </tr>
          <tr>
            <th>ت</th>
            <th>اسم المشروع</th>
            <th>رقم العقد</th>
            <th>تاريخ العقد</th>
            <th>القضاء / الموقع</th>
            <th>الشركة المنفذة (المقاول)</th>
            <th>المهندس المقيم</th>
            <th>الجهة الممولة</th>
            <th>حالة المشروع</th>
            <th>الإنجاز الفعلي</th>
            <th>الإنجاز المخطط</th>
            <th>قيمة العقد (د.ع)</th>
            <th>تاريخ المباشرة</th>
          </tr>
          ${listToExport
            .map((p, idx) => {
              const isComp = p.status === "completed" || Number(p.actualProgress || 0) >= 100;
              const statusText = STATUS_LABEL[p.status] || (isComp ? "منجز" : p.status);
              const formattedContractDate = p.contractDate ? formatDateDMY(p.contractDate) : "—";
              const formattedStartDate = p.startDate ? formatDateDMY(p.startDate) : "—";
              return `
            <tr>
              <td class="center-cell">${idx + 1}</td>
              <td class="highlight-blue">${p.name || "—"}</td>
              <td class="center-cell">${p.contractNo || "—"}</td>
              <td class="center-cell">${formattedContractDate}</td>
              <td>${p.district || "الأنبار"} (${p.location || "—"})</td>
              <td>${p.contractor || "—"}</td>
              <td>${p.residentEngineerName || "—"}</td>
              <td>${p.fundingSource || "—"}</td>
              <td class="center-cell">${statusText}</td>
              <td class="highlight-emerald">${p.actualProgress || 0}%</td>
              <td class="center-cell">${p.plannedProgress || 0}%</td>
              <td>${(Number(p.contractValue) || 0).toLocaleString("en-US")} د.ع</td>
              <td class="center-cell">${formattedStartDate}</td>
            </tr>`;
            })
            .join("")}
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
    toast.success(specificProject ? "تم تصدير ملف Excel للمشروع بنجاح" : `تم تصدير ${listToExport.length} مشروع إلى Excel`);
  };

  // ─── Action: Print / PDF Dedicated Official Engine (A4 Format) ────────────────
  const handlePrintOfficialSheet = (project: Project) => {
    const isComp = project.status === "completed" || Number(project.actualProgress || 0) >= 100;
    const statusText = STATUS_LABEL[project.status] || (isComp ? "منجز بالكامل" : "قيد التنفيذ");
    const contractVal = Number(project.contractValue || 0).toLocaleString("en-US");
    const changeOrdersCount = Array.isArray(project.changeOrdersList) ? project.changeOrdersList.length : 0;
    const changeOrdersTotal = Number(project.changeOrdersTotalAmount || 0).toLocaleString("en-US");
    const totalCost = Number(project.workCost || (Number(project.contractValue || 0) + Number(project.changeOrdersTotalAmount || 0))).toLocaleString("en-US");
    const reportDate = new Date().toISOString().split("T")[0];
    const reportNo = `REP-PRO/${new Date().getFullYear()}/${project.id.slice(0, 6).toUpperCase()}`;

    const printWin = window.open("", "_blank", "width=960,height=1080");
    if (!printWin) {
      toast.error("يرجى السماح بالنوافذ المنبثقة للطباعة");
      return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>تقرير مشروع رسمي A4 - ${project.name}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" />
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @page {
      size: A4 portrait;
      margin: 6mm 8mm 6mm 8mm;
    }
    body {
      font-family: 'Cairo', Tahoma, Arial, sans-serif;
      direction: rtl;
      background: #ffffff !important;
      color: #0f172a !important;
      font-size: 11px;
      line-height: 1.4;
      width: 100%;
      max-width: 194mm;
      margin: 0 auto;
      padding: 10px;
    }
    /* ─── EXACT REQUESTED HEADER ─── */
    .official-header {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      align-items: center;
      background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%) !important;
      color: #ffffff !important;
      border: 1px solid #1e3a8a !important;
      border-radius: 8px !important;
      padding: 8px 14px !important;
      margin-bottom: 12px !important;
    }
    .official-header .header-right {
      text-align: right;
    }
    .official-header .header-right .country-title {
      font-size: 14px;
      font-weight: 900;
      color: #ffffff;
      line-height: 1.2;
    }
    .official-header .header-right .dir-title {
      font-size: 12px;
      font-weight: 800;
      color: #e0f2fe;
      margin-top: 2px;
    }
    .official-header .header-right .dept-title {
      font-size: 11px;
      font-weight: 700;
      color: #bae6fd;
      margin-top: 1px;
    }
    .official-header .header-center {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .official-header .header-center .logo-wrapper {
      width: 52px;
      height: 52px;
      background: #ffffff;
      border-radius: 12px;
      padding: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }
    .official-header .header-center img {
      width: 46px;
      height: 46px;
      object-fit: contain;
      border-radius: 50%;
    }
    .official-header .header-left {
      text-align: left;
      font-family: monospace, Tahoma, sans-serif;
      font-size: 10px;
      color: #ffffff;
      line-height: 1.5;
    }

    /* ─── REPORT TITLE BANNER ─── */
    .report-title-banner {
      text-align: center;
      padding: 8px;
      background: #f8fafc;
      border-bottom: 2px solid #1e3a8a;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .report-title-banner h1 {
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
    }
    .report-title-banner .project-name {
      font-size: 13px;
      font-weight: 800;
      color: #0284c7;
      margin-top: 3px;
    }

    /* ─── SECTION STYLING ─── */
    .section-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      margin-bottom: 10px;
      overflow: hidden;
    }
    .section-header {
      font-size: 11px;
      font-weight: 800;
      padding: 5px 10px;
      color: #ffffff;
    }
    .header-blue { background: #1e3a8a !important; }
    .header-emerald { background: #059669 !important; }
    .header-amber { background: #d97706 !important; }
    .header-slate { background: #334155 !important; }

    .section-body {
      padding: 8px 10px;
      background: #ffffff;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 12px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px 12px;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 3px;
    }
    .info-item .label {
      color: #64748b;
      font-weight: 600;
    }
    .info-item .val {
      font-weight: 700;
      color: #0f172a;
    }
    .badge-status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 800;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }

    /* ─── PROGRESS BAR ─── */
    .progress-bar-container {
      background: #e2e8f0;
      border-radius: 6px;
      height: 12px;
      width: 100%;
      overflow: hidden;
      margin-top: 4px;
    }
    .progress-bar-fill {
      background: #059669;
      height: 100%;
      border-radius: 6px;
    }

    /* ─── SIGNATURES ─── */
    .signatures-block {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      text-align: center;
      margin-top: 24px;
      padding-top: 10px;
      border-top: 2px solid #cbd5e1;
      font-weight: 800;
      font-size: 11px;
    }
    .sign-title { color: #1e3a8a; }
    .sign-space { height: 45px; }
    .sign-name { color: #64748b; font-weight: 600; font-size: 10px; }

    /* ─── FOOTER ─── */
    .official-footer {
      text-align: center;
      margin-top: 14px;
      font-size: 9px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 4px;
    }
  </style>
</head>
<body>
  <!-- 1. OFFICIAL LETTERHEAD HEADER -->
  <div class="official-header">
    <div class="header-right">
      <div class="country-title">جمهورية العراق</div>
      <div class="dir-title">مديرية ماء الانبار</div>
      <div class="dept-title">قسم تكنلوجية المعلومات</div>
    </div>
    <div class="header-center">
      <div class="logo-wrapper">
        <img src="/anbar-water-logo.jpg" alt="شعار مديرية ماء الأنبار" />
      </div>
    </div>
    <div class="header-left">
      <div>العدد: ${reportNo}</div>
      <div>التاريخ: ${reportDate}</div>
      <div>نظام: تقارير Pro المعتمد</div>
    </div>
  </div>

  <!-- 2. REPORT TITLE BANNER -->
  <div class="report-title-banner">
    <h1>استمارة التوثيق والتقرير الفني الرسمي للمشروع (A4)</h1>
    <div class="project-name">${project.name}</div>
  </div>

  <!-- 3. BASIC CONTRACTUAL DATA -->
  <div class="section-card">
    <div class="section-header header-blue">1. البيانات التعاقدية والأساسية للمشروع</div>
    <div class="section-body grid-2">
      <div class="info-item"><span class="label">اسم المشروع:</span><span class="val">${project.name}</span></div>
      <div class="info-item"><span class="label">رقم العقد:</span><span class="val">${project.contractNo || "—"}</span></div>
      <div class="info-item"><span class="label">تاريخ العقد:</span><span class="val">${project.contractDate ? formatDateDMY(project.contractDate) : "—"}</span></div>
      <div class="info-item"><span class="label">القضاء / الناحية:</span><span class="val">${project.district || "الأنبار"}${project.subDistrict ? ` / ${project.subDistrict}` : ""}</span></div>
      <div class="info-item"><span class="label">اسم المركز:</span><span class="val">${project.centerName || "—"}</span></div>
      <div class="info-item"><span class="label">الشركة المنفذة (المقاول):</span><span class="val">${project.contractor || "—"}</span></div>
      <div class="info-item"><span class="label">المهندس المقيم:</span><span class="val">${project.residentEngineerName || "—"}</span></div>
      <div class="info-item"><span class="label">الجهة الممولة:</span><span class="val">${project.fundingSource || "خطة المحافظة"}</span></div>
      <div class="info-item"><span class="label">طريقة الإحالة:</span><span class="val">${project.referralMethod || "مناقصة عامة"}</span></div>
      <div class="info-item"><span class="label">نوع المشروع:</span><span class="val">${project.type === "investment" ? "استثماري" : project.type === "non_investment" ? "تشغيلي" : (project.type || "مشروع ماء")}</span></div>
    </div>
  </div>

  <!-- 4. FINANCIAL DATA -->
  <div class="section-card">
    <div class="section-header header-emerald">2. البيانات المالية وأوامر الغيار التعاقدية</div>
    <div class="section-body grid-3">
      <div class="info-item"><span class="label">قيمة العقد الأساسية:</span><span class="val">${contractVal} د.ع</span></div>
      <div class="info-item"><span class="label">عدد أوامر الغيار:</span><span class="val">${changeOrdersCount} أمر</span></div>
      <div class="info-item"><span class="label">مجموع أوامر الغيار:</span><span class="val">${changeOrdersTotal} د.ع</span></div>
      <div class="info-item" style="grid-column: span 3;"><span class="label">الكلفة الكلية المعتمدة للعمل:</span><span class="val" style="color:#059669; font-size:12px;">${totalCost} د.ع</span></div>
    </div>
  </div>

  <!-- 5. PROGRESS & TIMING -->
  <div class="section-card">
    <div class="section-header header-amber">3. مؤشرات الإنجاز الفعلي والمخطط والتوقيتات</div>
    <div class="section-body">
      <div class="grid-3" style="margin-bottom: 8px;">
        <div class="info-item"><span class="label">نسبة الإنجاز الفعلي:</span><span class="val" style="color:#059669; font-size:13px;">${project.actualProgress || 0}%</span></div>
        <div class="info-item"><span class="label">نسبة الإنجاز المخطط:</span><span class="val">${project.plannedProgress || 0}%</span></div>
        <div class="info-item"><span class="label">حالة المشروع:</span><span class="badge-status">${statusText}</span></div>
        <div class="info-item"><span class="label">تاريخ المباشرة:</span><span class="val">${project.startDate ? formatDateDMY(project.startDate) : "—"}</span></div>
        <div class="info-item"><span class="label">مدة العقد (يوم):</span><span class="val">${project.durationDays || 0} يوم</span></div>
        <div class="info-item"><span class="label">تاريخ الإنجاز التعاقدي:</span><span class="val">${project.contractualCompletionDate || project.plannedEndDate ? formatDateDMY(project.contractualCompletionDate || project.plannedEndDate) : "—"}</span></div>
      </div>
      <div>
        <div style="display:flex; justify-content:space-between; font-weight:700; font-size:10px; color:#475569;">
          <span>تقدم الإنجاز الفعلي:</span>
          <span>${project.actualProgress || 0}%</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${Math.min(100, Math.max(0, Number(project.actualProgress || 0)))}%;"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- 6. WORKS & NOTES -->
  <div class="section-card">
    <div class="section-header header-slate">4. تفاصيل العمل والملاحظات الميدانية</div>
    <div class="section-body">
      <div style="margin-bottom: 4px;">
        <strong style="color:#1e3a8a;">الموقع الجغرافي والإحداثيات:</strong>
        <span>${project.location || "محافظة الأنبار"} ${project.lat && project.lng ? `(N: ${project.lat.toFixed(4)}, E: ${project.lng.toFixed(4)})` : ""}</span>
      </div>
      <div>
        <strong style="color:#1e3a8a;">الملاحظات والتوصيات:</strong>
        <p style="margin-top: 2px; color:#334155;">${project.notes || "تم تنفيذ الأعمال وفق المواصفات الفنية المعتمدة وبإشراف دائرة المهندس المقيم."}</p>
      </div>
    </div>
  </div>

  <!-- 7. OFFICIAL SIGNATURES -->
  <div class="signatures-block">
    <div>
      <div class="sign-title">المهندس المقيم المشرف</div>
      <div class="sign-space"></div>
      <div class="sign-name">${project.residentEngineerName || "التوقيع والاسم"}</div>
    </div>
    <div>
      <div class="sign-title">مسؤول شعبة المتابعة</div>
      <div class="sign-space"></div>
      <div class="sign-name">التوقيع والختم</div>
    </div>
    <div>
      <div class="sign-title">مدير ماء محافظة الأنبار</div>
      <div class="sign-space"></div>
      <div class="sign-name">المصادقة والاعتماد</div>
    </div>
  </div>

  <!-- 8. OFFICIAL FOOTER -->
  <div class="official-footer">
    صادر رسمياً عن منظومة تقارير Pro - مديرية ماء محافظة الأنبار - قسم تكنلوجية المعلومات - وثيقة فنية معتمدة
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
    printWin.focus();
    toast.success("تم فتح أمر الطباعة / حفظ PDF للتقرير");
  };

  // ─── Action: Open Preview Modal ───────────────────────────────────────────────
  const handleOpenPreview = (project: Project) => {
    setPreviewProject(project);
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-6 pb-16 dir-rtl text-right">
      {/* ─── 1) Executive Header & Pro Badge ───────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-900 via-blue-900 to-indigo-950 p-6 md:p-8 text-white shadow-xl border border-sky-500/20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-2xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center p-3 shadow-lg shadow-cyan-500/30 border border-white/20 shrink-0">
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                  تقارير Pro
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-xs uppercase">
                  النسخة الذكية
                </span>
              </div>
              <p className="text-xs md:text-sm font-semibold text-sky-200 mt-1 max-w-2xl leading-relaxed">
                منظومة التقارير المتقدمة السريعة والمبسّطة: معاينة، مشاركة عبر واتساب، تصدير إكسل، وطباعة رسمية A4 لكل مشروع مع فلترة تفصيلية ودقيقة.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <Button
              onClick={() => handleExportToExcel()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs gap-2 cursor-pointer shadow-md shadow-emerald-700/20 flex-1 sm:flex-initial"
            >
              <FileSpreadsheet className="w-4 h-4" />
              تصدير المفلتر ({filteredProjects.length}) إلى Excel
            </Button>
            <Button
              onClick={() => {
                if (filteredProjects.length > 0) {
                  handleOpenPreview(filteredProjects[0]);
                } else {
                  toast.error("لا توجد مشاريع مفلترة للمعاينة");
                }
              }}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold rounded-xl text-xs gap-2 cursor-pointer flex-1 sm:flex-initial"
            >
              <Eye className="w-4 h-4" />
              معاينة أول مشروع
            </Button>
          </div>
        </div>

        {/* Quick KPI Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-white/10 relative z-10">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <div className="text-[11px] font-bold text-sky-200">إجمالي المشاريع</div>
            <div className="text-xl font-black text-white mt-0.5">{stats.total}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <div className="text-[11px] font-bold text-sky-200">قيد التنفيذ</div>
            <div className="text-xl font-black text-cyan-300 mt-0.5">{stats.ongoing}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <div className="text-[11px] font-bold text-sky-200">المتلكئة والمتوقفة</div>
            <div className="text-xl font-black text-rose-300 mt-0.5">{stats.delayed}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <div className="text-[11px] font-bold text-sky-200">المنجزة بالكامل</div>
            <div className="text-xl font-black text-emerald-300 mt-0.5">{stats.completed}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <div className="text-[11px] font-bold text-sky-200">متوسط الإنجاز</div>
            <div className="text-xl font-black text-amber-300 mt-0.5">{stats.avgProgress}%</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <div className="text-[11px] font-bold text-sky-200">إجمالي المبالغ</div>
            <div className="text-sm font-black text-white mt-1 truncate" title={`${stats.totalBudget.toLocaleString()} د.ع`}>
              {(stats.totalBudget / 1_000_000_000).toFixed(1)} مليار د.ع
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2) Advanced Search & Comprehensive Filters Bar ─────────────────────── */}
      <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <CardContent className="p-4 md:p-6 space-y-4">
          {/* Main Search Row */}
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، رقم الإحالة، رقم العقد، الشركة المنفذة، القضاء، المهندس، المركز..."
                className="pr-10 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-xs font-semibold h-11"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className={cn(
                "rounded-2xl h-11 px-4 text-xs font-bold gap-2 cursor-pointer transition-all shrink-0 w-full md:w-auto",
                showFilters || activeFiltersCount > 0
                  ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>فلاتر تفصيلية</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-black">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 rounded-xl transition-all cursor-pointer",
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-700 text-blue-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                )}
                title="عرض شبكي (بطاقات)"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "p-2 rounded-xl transition-all cursor-pointer",
                  viewMode === "table"
                    ? "bg-white dark:bg-slate-700 text-blue-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                )}
                title="عرض جدولي"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Reset Button */}
            {activeFiltersCount > 0 && (
              <Button
                onClick={resetFilters}
                variant="ghost"
                className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-2xl h-11 text-xs font-bold gap-1.5 cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" /> مسح الفلاتر
              </Button>
            )}
          </div>

          {/* Collapsible Detailed Filters Grid */}
          {showFilters && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* 1. Status Filter */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                  حالة المشروع
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">جميع الحالات ({projects.length})</option>
                  <option value="ongoing">قيد التنفيذ</option>
                  <option value="delayed">متلكئ</option>
                  <option value="stopped">متوقف</option>
                  <option value="completed">منجز</option>
                  <option value="not_started">لم يبدأ</option>
                </select>
              </div>

              {/* 2. District Filter */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                  القضاء / المنطقة
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">كافة الأقضية</option>
                  {ANBAR_DISTRICTS.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Progress Range */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                  نسبة الإنجاز الفعلي
                </label>
                <select
                  value={selectedProgressRange}
                  onChange={(e) => setSelectedProgressRange(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">جميع النسب (0% - 100%)</option>
                  <option value="0-25">مرحلة أولى (0% - 25%)</option>
                  <option value="26-50">مرحلة متوسطة (26% - 50%)</option>
                  <option value="51-75">مرحلة متقدمة (51% - 75%)</option>
                  <option value="76-99">أوشك على الإنجاز (76% - 99%)</option>
                  <option value="100">منجز بالكامل (100%)</option>
                </select>
              </div>

              {/* 4. Funding Source */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                  الجهة الممولة
                </label>
                <select
                  value={selectedFunding}
                  onChange={(e) => setSelectedFunding(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">كافة الجهات الممولة</option>
                  {distinctFundingSources.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Contractor Filter */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                  الشركة المنفذة (المقاول)
                </label>
                <select
                  value={selectedContractor}
                  onChange={(e) => setSelectedContractor(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">كافة الشركات المنفذة</option>
                  {distinctContractors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6. Resident Engineer Filter */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                  المهندس المقيم
                </label>
                <select
                  value={selectedEngineer}
                  onChange={(e) => setSelectedEngineer(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">كافة المهندسين المقيمين</option>
                  {distinctEngineers.map((eng) => (
                    <option key={eng} value={eng}>
                      {eng}
                    </option>
                  ))}
                </select>
              </div>

              {/* 7. Budget Range */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                  قيمة العقد / الميزانية
                </label>
                <select
                  value={selectedBudgetRange}
                  onChange={(e) => setSelectedBudgetRange(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">كافة المبالغ</option>
                  <option value="under500m">أقل من 500 مليون د.ع</option>
                  <option value="500m-1b">500 مليون إلى 1 مليار د.ع</option>
                  <option value="1b-5b">1 مليار إلى 5 مليار د.ع</option>
                  <option value="over5b">أكثر من 5 مليار د.ع</option>
                </select>
              </div>

              {/* 8. Sorting Criteria */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                  ترتيب النتائج حسب
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="progress_desc">نسبة الإنجاز (الأعلى أولاً)</option>
                  <option value="progress_asc">نسبة الإنجاز (الأقل أولاً)</option>
                  <option value="budget_desc">مبلغ العقد (الأكبر أولاً)</option>
                  <option value="budget_asc">مبلغ العقد (الأصغر أولاً)</option>
                  <option value="date_desc">تاريخ المباشرة (الأحدث أولاً)</option>
                  <option value="name_asc">اسم المشروع (أبجدياً)</option>
                </select>
              </div>
            </div>
          )}

          {/* Results Counter & Active Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs font-bold text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60">
            <div>
              تم العثور على <span className="text-blue-600 dark:text-blue-400 font-black">{filteredProjects.length}</span> من أصل <span className="font-semibold">{projects.length}</span> مشروع
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedStatus !== "all" && (
                <Badge variant="secondary" className="gap-1 rounded-lg text-[10px]">
                  حالة: {STATUS_LABEL[selectedStatus as ProjectStatus] || selectedStatus}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedStatus("all")} />
                </Badge>
              )}
              {selectedDistrict !== "all" && (
                <Badge variant="secondary" className="gap-1 rounded-lg text-[10px]">
                  قضاء: {selectedDistrict}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedDistrict("all")} />
                </Badge>
              )}
              {selectedProgressRange !== "all" && (
                <Badge variant="secondary" className="gap-1 rounded-lg text-[10px]">
                  إنجاز: {selectedProgressRange}%
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedProgressRange("all")} />
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 3) Content: Projects Cards / Table ─────────────────────────────────── */}
      {filteredProjects.length === 0 ? (
        <Card className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-white/50 dark:bg-slate-900/50">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
            لا توجد مشاريع مطابقة للفلاتر المحددة
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            يرجى تجربة البحث بكلمات أخرى أو الضغط على مسح الفلاتر لعرض كافة مشاريع المديرية.
          </p>
          <Button
            onClick={resetFilters}
            className="mt-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold gap-2"
          >
            <RotateCcw className="w-4 h-4" /> إعادة تعيين الفلاتر
          </Button>
        </Card>
      ) : viewMode === "grid" ? (
        /* ─── Grid View (Modern Cards) ───────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProjects.map((p) => {
            const isComp = p.status === "completed" || Number(p.actualProgress || 0) >= 100;
            const statusLabel = STATUS_LABEL[p.status] || (isComp ? "منجز" : p.status);
            const actualProg = Number(p.actualProgress || 0);
            const plannedProg = Number(p.plannedProgress || 0);

            return (
              <Card
                key={p.id}
                className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 bg-white dark:bg-slate-900 flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Header & Status */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <Badge
                      className={cn(
                        "rounded-xl px-2.5 py-1 text-[11px] font-black border",
                        isComp
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                          : p.status === "delayed" || p.status === "stopped"
                          ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                          : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                      )}
                    >
                      {statusLabel}
                    </Badge>
                    <span className="text-[11px] font-mono text-slate-400 font-bold">
                      {p.contractNo || "عقد بدون رقم"}
                    </span>
                  </div>

                  {/* Project Name */}
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mt-2.5 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {p.name}
                  </h3>

                  {/* Meta Chips */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400 mt-3 font-semibold">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-sky-500" />
                      <span>{p.district || "الأنبار"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-amber-500" />
                      <span className="truncate max-w-[140px]">{p.contractor || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="truncate max-w-[140px]">{p.residentEngineerName || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Progress & Financial Overview */}
                <div className="px-5 py-3 bg-slate-50/70 dark:bg-slate-800/40 border-y border-slate-100 dark:border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600 dark:text-slate-400">نسبة الإنجاز الفعلي:</span>
                    <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                      {actualProg}%
                      <span className="text-[10px] font-normal text-slate-400 mr-1.5">
                        (المخطط: {plannedProg}%)
                      </span>
                    </span>
                  </div>
                  <Progress
                    value={actualProg}
                    className="h-2 rounded-full bg-slate-200 dark:bg-slate-700"
                  />

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">مبلغ العقد:</span>
                    <span className="font-black text-slate-900 dark:text-slate-100 font-mono">
                      {(Number(p.contractValue) || 0).toLocaleString("en-US")} د.ع
                    </span>
                  </div>
                </div>

                {/* Project Action Buttons (WhatsApp, Excel, PDF/Print, Share, Preview) */}
                <div className="p-4 bg-white dark:bg-slate-900 grid grid-cols-5 gap-1.5 border-t border-slate-100 dark:border-slate-800">
                  {/* 1. WhatsApp Button */}
                  <Button
                    onClick={() => handleShareWhatsApp(p)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-bold p-2 h-9 flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs"
                    title="مشاركة فورية عبر واتساب"
                  >
                    <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">واتساب</span>
                  </Button>

                  {/* 2. Excel Button */}
                  <Button
                    onClick={() => handleExportToExcel(p)}
                    variant="outline"
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300 rounded-xl text-[11px] font-bold p-2 h-9 flex items-center justify-center gap-1 cursor-pointer"
                    title="تصدير بيانات المشروع إلى ملف Excel رسمي"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">إكسل</span>
                  </Button>

                  {/* 3. Print / PDF Button */}
                  <Button
                    onClick={() => handlePrintOfficialSheet(p)}
                    variant="outline"
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300 rounded-xl text-[11px] font-bold p-2 h-9 flex items-center justify-center gap-1 cursor-pointer"
                    title="طباعة التقرير الرسمي A4 / حفظ كـ PDF"
                  >
                    <Printer className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">طباعة</span>
                  </Button>

                  {/* 4. Share / Copy Link Button */}
                  <Button
                    onClick={() => handleShareGeneric(p)}
                    variant="outline"
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 rounded-xl text-[11px] font-bold p-2 h-9 flex items-center justify-center gap-1 cursor-pointer"
                    title="مشاركة أو نسخ ملخص التقرير"
                  >
                    <Share2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">مشاركة</span>
                  </Button>

                  {/* 5. Preview Modal Button */}
                  <Button
                    onClick={() => handleOpenPreview(p)}
                    variant="default"
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold p-2 h-9 flex items-center justify-center gap-1 cursor-pointer dark:bg-slate-100 dark:text-slate-900"
                    title="معاينة التقرير الرسمي A4 كاملاً"
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">معاينة</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ─── Table View (Comprehensive Detailed Table) ───────────────────────── */
        <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-black">
                  <th className="p-3.5 text-center w-12">#</th>
                  <th className="p-3.5 min-w-[220px]">اسم المشروع</th>
                  <th className="p-3.5 min-w-[110px]">رقم العقد</th>
                  <th className="p-3.5 min-w-[100px]">القضاء</th>
                  <th className="p-3.5 min-w-[140px]">الشركة المنفذة</th>
                  <th className="p-3.5 min-w-[130px]">المهندس المقيم</th>
                  <th className="p-3.5 text-center min-w-[90px]">الحالة</th>
                  <th className="p-3.5 text-center min-w-[120px]">الإنجاز الفعلي</th>
                  <th className="p-3.5 min-w-[130px]">قيمة العقد</th>
                  <th className="p-3.5 text-center min-w-[190px]">إجراءات المشروع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProjects.map((p, idx) => {
                  const isComp = p.status === "completed" || Number(p.actualProgress || 0) >= 100;
                  const statusLabel = STATUS_LABEL[p.status] || (isComp ? "منجز" : p.status);
                  const actualProg = Number(p.actualProgress || 0);

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors font-semibold"
                    >
                      <td className="p-3.5 text-center text-slate-400 font-mono font-bold">{idx + 1}</td>
                      <td className="p-3.5">
                        <div className="font-black text-slate-900 dark:text-slate-100 line-clamp-1">{p.name}</div>
                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">{p.fundingSource || "خطة المحافظة"}</div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">{p.contractNo || "—"}</td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300">{p.district || "الأنبار"}</td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{p.contractor || "—"}</td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300 truncate max-w-[130px]">{p.residentEngineerName || "—"}</td>
                      <td className="p-3.5 text-center">
                        <Badge
                          className={cn(
                            "rounded-lg px-2 py-0.5 text-[10px] font-black border",
                            isComp
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : p.status === "delayed" || p.status === "stopped"
                              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                              : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                          )}
                        >
                          {statusLabel}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="font-black text-emerald-600 dark:text-emerald-400">{actualProg}%</div>
                        <Progress value={actualProg} className="h-1.5 w-16 mx-auto mt-1" />
                      </td>
                      <td className="p-3.5 font-mono text-slate-800 dark:text-slate-200">
                        {(Number(p.contractValue) || 0).toLocaleString("en-US")} د.ع
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            onClick={() => handleShareWhatsApp(p)}
                            size="icon"
                            className="w-7 h-7 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer"
                            title="واتساب"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            onClick={() => handleExportToExcel(p)}
                            size="icon"
                            variant="outline"
                            className="w-7 h-7 text-emerald-600 border-emerald-300 hover:bg-emerald-50 rounded-lg cursor-pointer"
                            title="تصدير Excel"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            onClick={() => handlePrintOfficialSheet(p)}
                            size="icon"
                            variant="outline"
                            className="w-7 h-7 text-blue-600 border-blue-300 hover:bg-blue-50 rounded-lg cursor-pointer"
                            title="طباعة / PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            onClick={() => handleOpenPreview(p)}
                            size="icon"
                            variant="secondary"
                            className="w-7 h-7 rounded-lg cursor-pointer"
                            title="معاينة"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── 4) Official A4 Preview & Print Modal ───────────────────────────────── */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 md:p-8 dir-rtl text-right">
          <DialogHeader className="border-b pb-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 dark:text-slate-100">
                  المعاينة الرسمية المعتمدة للتقرير (A4)
                </DialogTitle>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  وثيقة التقرير الفني جاهزة للتصدير والطباعة بالترويسة المعتمدة.
                </p>
              </div>

              {previewProject && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handlePrintOfficialSheet(previewProject)}
                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" /> طباعة / حفظ PDF
                  </Button>
                  <Button
                    onClick={() => handleExportToExcel(previewProject)}
                    variant="outline"
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 rounded-xl text-xs font-bold gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> تصدير Excel
                  </Button>
                  <Button
                    onClick={() => handleShareWhatsApp(previewProject)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" /> واتساب
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {previewProject && (
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-300 text-slate-900 shadow-sm max-w-[194mm] mx-auto text-xs">
              {/* ─── EXACT TOP HEADER AS REQUESTED ───────────────────────────── */}
              <div className="grid grid-cols-3 items-center bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white p-3 md:p-4 rounded-xl mb-4 border border-blue-950">
                {/* Right: Only the 3 requested lines */}
                <div className="text-right space-y-0.5">
                  <div className="text-sm md:text-base font-black text-white leading-tight">
                    جمهورية العراق
                  </div>
                  <div className="text-xs md:text-sm font-bold text-sky-200">
                    مديرية ماء الانبار
                  </div>
                  <div className="text-[11px] md:text-xs font-semibold text-blue-100">
                    قسم تكنلوجية المعلومات
                  </div>
                </div>

                {/* Center: Logo Centered */}
                <div className="flex justify-center items-center">
                  <div className="w-13 h-13 bg-white rounded-2xl p-1 flex items-center justify-center shadow-md">
                    <AnbarWaterLogo size={46} />
                  </div>
                </div>

                {/* Left: Metadata / Number & Date */}
                <div className="text-left font-mono text-[11px] text-white/95 space-y-0.5">
                  <div>العدد: REP-PRO/{previewProject.id.slice(0, 6).toUpperCase()}</div>
                  <div>التاريخ: {new Date().toISOString().split("T")[0]}</div>
                  <div>نظام: تقارير Pro المعتمد</div>
                </div>
              </div>

              {/* Report Title */}
              <div className="text-center py-2.5 bg-slate-50 border-b-2 border-blue-900 rounded-lg mb-4">
                <h2 className="text-sm md:text-base font-black text-slate-900">
                  استمارة التقرير والتوثيق الميداني المعتمد للمشروع (A4)
                </h2>
                <div className="text-xs md:text-sm font-bold text-blue-700 mt-1">
                  {previewProject.name}
                </div>
              </div>

              {/* 1. Contractual Data */}
              <div className="border border-slate-300 rounded-xl overflow-hidden mb-3.5">
                <div className="bg-blue-900 text-white font-black px-3 py-1.5 text-xs">
                  1. البيانات الأساسية والتعاقدية
                </div>
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div>اسم المشروع: <strong>{previewProject.name}</strong></div>
                  <div>رقم العقد: <strong>{previewProject.contractNo || "—"}</strong></div>
                  <div>تاريخ العقد: <strong>{previewProject.contractDate ? formatDateDMY(previewProject.contractDate) : "—"}</strong></div>
                  <div>القضاء والناحية: <strong>{previewProject.district || "الأنبار"} {previewProject.subDistrict ? ` / ${previewProject.subDistrict}` : ""}</strong></div>
                  <div>الشركة المنفذة (المقاول): <strong>{previewProject.contractor || "—"}</strong></div>
                  <div>المهندس المقيم: <strong>{previewProject.residentEngineerName || "—"}</strong></div>
                  <div>الجهة الممولة: <strong>{previewProject.fundingSource || "خطة المحافظة"}</strong></div>
                  <div>طريقة الإحالة: <strong>{previewProject.referralMethod || "مناقصة عامة"}</strong></div>
                </div>
              </div>

              {/* 2. Financial & Change Orders */}
              <div className="border border-slate-300 rounded-xl overflow-hidden mb-3.5">
                <div className="bg-emerald-700 text-white font-black px-3 py-1.5 text-xs">
                  2. البيانات المالية وأوامر الغيار
                </div>
                <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div>قيمة العقد الأساسية: <strong>{(Number(previewProject.contractValue) || 0).toLocaleString("en-US")} د.ع</strong></div>
                  <div>عدد أوامر الغيار: <strong>{Array.isArray(previewProject.changeOrdersList) ? previewProject.changeOrdersList.length : 0} أمر</strong></div>
                  <div>مجموع أوامر الغيار: <strong>{(Number(previewProject.changeOrdersTotalAmount) || 0).toLocaleString("en-US")} د.ع</strong></div>
                </div>
              </div>

              {/* 3. Progress Indicators */}
              <div className="border border-slate-300 rounded-xl overflow-hidden mb-4">
                <div className="bg-amber-600 text-white font-black px-3 py-1.5 text-xs">
                  3. نسب ومؤشرات تقدم العمل الميداني
                </div>
                <div className="p-3 space-y-2 text-[11px]">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>نسبة الإنجاز الفعلي: <strong className="text-emerald-700 text-xs font-black">{previewProject.actualProgress || 0}%</strong></div>
                    <div>نسبة الإنجاز المخطط: <strong>{previewProject.plannedProgress || 0}%</strong></div>
                    <div>حالة المشروع: <strong>{STATUS_LABEL[previewProject.status] || previewProject.status}</strong></div>
                    <div>تاريخ المباشرة: <strong>{previewProject.startDate ? formatDateDMY(previewProject.startDate) : "—"}</strong></div>
                    <div>مدة العقد: <strong>{previewProject.durationDays || 0} يوم</strong></div>
                    <div>تاريخ الإنجاز التعاقدي: <strong>{previewProject.contractualCompletionDate || previewProject.plannedEndDate ? formatDateDMY(previewProject.contractualCompletionDate || previewProject.plannedEndDate) : "—"}</strong></div>
                  </div>
                  <Progress value={Number(previewProject.actualProgress || 0)} className="h-2" />
                </div>
              </div>

              {/* Signatures Block */}
              <div className="grid grid-cols-3 gap-4 text-center text-xs font-bold pt-6 border-t-2 border-slate-300 mt-6">
                <div>
                  <div className="text-blue-900">المهندس المقيم المشرف</div>
                  <div className="mt-10 text-slate-500 font-normal">{previewProject.residentEngineerName || "التوقيع والاسم"}</div>
                </div>
                <div>
                  <div className="text-blue-900">مسؤول شعبة المتابعة</div>
                  <div className="mt-10 text-slate-500 font-normal">التوقيع والختم</div>
                </div>
                <div>
                  <div className="text-blue-900">مدير ماء محافظة الأنبار</div>
                  <div className="mt-10 text-slate-500 font-normal">المصادقة والاعتماد</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 pt-3 border-t">
            <Button
              onClick={() => setIsPreviewOpen(false)}
              variant="outline"
              className="rounded-xl text-xs font-bold"
            >
              إغلاق النافذة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ReportsProPage;
