import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Construction, Clock, AlertTriangle, TrendingUp,
  Plus, Calendar, MapPin, CheckCircle2, AlertCircle,
  FileText, Activity, ShieldAlert, Loader2, Save, X,
  User, Check, ChevronDown, Wrench, Thermometer,
  CloudSun, FileUp, Image, Trash2, Users, Sparkles, Eye, Printer, MessageCircle, Share2, FileDown, Trophy,
  Copy, ExternalLink, MessageSquare, Download, ArrowRight, ZoomIn, ChevronLeft, ChevronRight, Layers, ImageIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { type Project, type ProjectStatus, getStoredProjects, saveStoredProjects } from "@/lib/mock-data";
import { getProjectsFromSupabase, getProgressReportsFromSupabase, saveProgressReportToSupabase, saveProjectToSupabase, deleteProjectFromSupabase, deleteProgressReportFromSupabase } from "@/lib/supabase-db";
import { useAuth } from "@/lib/auth-context";
import { AnbarWaterLogo } from "@/components/AnbarWaterLogo";
import { AddProjectWizard, formatDateDMY } from "@/components/AddProjectWizard";
import { ANBAR_WATER_LOGO_BASE64 } from "@/assets/anbar-water-logo-data";
import { ProjectShareDialog } from "./_app.projects";

export const Route = createFileRoute("/_app/projects-ongoing")({
  component: () => <Navigate to="/projects" replace />,
});

// ─── Single Field Progress Report Print (Official A4 Format) ─────────────────
export function printSingleFieldReport(report: ProgressReport, project?: Partial<Project> | null, reportNumber?: number) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("يرجى السماح بالنوافذ المنبثقة للطباعة");
    return;
  }

  const projName = project?.name || "مشروع ماء في محافظة الأنبار";
  const contractNo = project?.contractNo || "—";
  const contractor = project?.contractor || "—";
  const residentEng = report.engineer || (project as any)?.residentEngineerName || "المهندس المقيم";
  const location = project?.location || project?.district || "محافظة الأنبار";
  const reportDate = formatDateDMY(report.date) || report.date || new Date().toISOString().split("T")[0];
  const refNo = `م.م.أ / ${contractNo !== "—" ? contractNo : "متابعة"} / ${reportNumber ? `تق-${reportNumber}` : "ميداني"} / ${new Date().getFullYear()}`;
  const pStatus = project?.status;
  const isComp = pStatus === "completed" || Number(project?.actualProgress || 0) >= 100;
  const isStop = pStatus === "stopped";
  const isDel = pStatus === "delayed";
  const statusEn = isComp
    ? "COMPLETED (100%)"
    : isStop
    ? `STOPPED (${project?.actualProgress || 0}%)`
    : isDel
    ? `DELAYED (${project?.actualProgress || 0}%)`
    : `ONGOING (${project?.actualProgress || 0}%)`;
  const statusColor = isComp ? "#15803d" : isStop ? "#e11d48" : isDel ? "#d97706" : "#0284c7";

  const workers = report.labour?.workers ?? 0;
  const techs = report.labour?.techs ?? 0;
  const engs = report.labour?.engineers ?? 0;
  const equipStr = Array.isArray(report.equipment) && report.equipment.length > 0 ? report.equipment.join(" ، ") : "—";

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير تقدم عمل ميداني ${reportNumber ? `(رقم ${reportNumber})` : ""} - ${projName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: #fff;
      color: #0f172a;
      direction: rtl;
      font-size: 12px;
      line-height: 1.5;
    }
    @media print {
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    }
    .page-container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
    }
    .header-table {
      width: 100%;
      border-bottom: 2.5px solid #0c2340;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .header-table td {
      vertical-align: middle;
    }
    .gov-title {
      font-size: 16px;
      font-weight: 900;
      color: #0c2340;
      line-height: 1.3;
    }
    .logo-img {
      width: 60px;
      height: 60px;
      object-fit: contain;
      border-radius: 50%;
      border: 1px solid #cbd5e1;
      padding: 2px;
      background: #ffffff;
    }
    .doc-banner {
      background: #ecfdf5;
      border: 1.5px solid #10b981;
      border-radius: 8px;
      padding: 8px 12px;
      text-align: center;
      margin-bottom: 12px;
    }
    .doc-banner h1 {
      margin: 0;
      font-size: 15px;
      font-weight: 900;
      color: #064e3b;
    }
    .doc-banner p {
      margin: 2px 0 0 0;
      font-size: 12px;
      font-weight: 800;
      color: #047857;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      color: #1e3a8a;
      border-right: 4px solid #2563eb;
      padding-right: 6px;
      margin: 10px 0 6px 0;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    .info-table th, .info-table td {
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
      font-size: 11px;
      text-align: right;
    }
    .info-table th {
      background-color: #f1f5f9;
      font-weight: 800;
      color: #1e293b;
      width: 18%;
    }
    .info-table td {
      font-weight: 600;
      color: #0f172a;
    }
    .progress-badge {
      display: inline-block;
      background: #059669;
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 11px;
    }
    .content-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      background: #fafafa;
      margin-bottom: 10px;
      font-size: 11px;
      line-height: 1.6;
    }
    .sig-table {
      width: 100%;
      margin-top: 20px;
      border-collapse: collapse;
      page-break-inside: avoid;
    }
    .sig-table td {
      width: 33.33%;
      text-align: center;
      vertical-align: top;
      padding: 10px 5px;
      font-size: 11px;
    }
    .sig-line {
      margin-top: 35px;
      border-top: 1px dashed #94a3b8;
      padding-top: 4px;
      font-weight: 700;
      color: #475569;
    }
    .footer-bar {
      margin-top: 20px;
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      font-size: 10px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <table class="header-table">
      <thead>
        <tr>
          <td style="width: 35%; text-align: right; vertical-align: middle;">
            <div class="gov-title">مديرية ماء محافظة الأنبار</div>
          </td>
          <td style="width: 30%; text-align: center; vertical-align: middle;">
            <img src="${ANBAR_WATER_LOGO_BASE64}" class="logo-img" alt="شعار مديرية ماء الأنبار" />
          </td>
          <td style="width: 35%; text-align: left; vertical-align: middle; font-size: 11px; font-weight: 700; color: #1e293b;" dir="ltr">
            <div>Ref: ${contractNo !== "—" ? contractNo : "ANB-PROJ"}</div>
            <div>Date: ${reportDate}</div>
            <div style="color: ${statusColor}; font-weight: 800;">Status: ${statusEn}</div>
          </td>
        </tr>
      </thead>
    </table>

    <div class="doc-banner">
      <h1>استمارة تقرير تقدم العمل الميداني ${reportNumber ? `(تقرير رقم ${reportNumber})` : "الدوري"}</h1>
      <p>${projName}</p>
    </div>

    <div class="section-title">أولاً: البيانات الأساسية للمشروع والتعاقد</div>
    <table class="info-table">
      <tr>
        <th>اسم المشروع</th>
        <td colspan="3"><strong>${projName}</strong></td>
      </tr>
      <tr>
        <th>رقم العقد</th>
        <td>${contractNo}</td>
        <th>الشركة المنفذة</th>
        <td>${contractor}</td>
      </tr>
      <tr>
        <th>موقع العمل</th>
        <td>${location}</td>
        <th>المهندس المقيم</th>
        <td>${residentEng}</td>
      </tr>
      <tr>
        <th>تاريخ المباشرة</th>
        <td>${formatDateDMY((project as any)?.startDate || (project as any)?.actualStartDate) || "—"}</td>
        <th>تاريخ إعداد التقرير</th>
        <td>${reportDate}</td>
      </tr>
    </table>

    <div class="section-title">ثانياً: الموقف التنفيذي والكوادر الميدانية</div>
    <table class="info-table">
      <tr>
        <th>نسبة الإنجاز الفعلي</th>
        <td>
          <span class="progress-badge">${report.actualProgress}%</span>
        </td>
        <th>الكوادر الميدانية</th>
        <td>مهندسون (${engs}) · فنيون (${techs}) · عمال (${workers})</td>
      </tr>
      <tr>
        <th>الآليات العاملة</th>
        <td colspan="3">${equipStr}</td>
      </tr>
    </table>

    <div class="section-title">ثالثاً: الأعمال المنفذة والمتحققة خلال الفترة</div>
    <div class="content-box" style="background: #f0fdf4; border-color: #bbf7d0; color: #14532d; font-weight: 600;">
      ${report.completedWorks || "تم تنفيذ الأعمال وفق المواصفات وجداول الكميات المعتمدة."}
    </div>

    ${report.upcomingWorks ? `
    <div class="section-title">رابعاً: الأعمال المخططة للفترة القادمة</div>
    <div class="content-box" style="background: #f8fafc; border-color: #e2e8f0; color: #1e293b;">
      ${report.upcomingWorks}
    </div>` : ""}

    ${report.obstaclesText ? `
    <div class="section-title" style="color: #b91c1c; border-right-color: #ef4444;">خامساً: المشاكل والمعوقات الميدانية</div>
    <div class="content-box" style="background: #fef2f2; border-color: #fecaca; color: #991b1b;">
      ${report.obstaclesText}
    </div>` : ""}

    ${report.notes ? `
    <div class="section-title">ملاحظات وتوصيات دائرة المهندس المقيم</div>
    <div class="content-box" style="background: #eff6ff; border-color: #bfdbfe; color: #1e3a8a;">
      ${report.notes}
    </div>` : ""}

    <table class="signatures-table">
      <tr>
        <td>
          <div style="font-weight: 800; color: #334155;">المهندس المقيم المشرف</div>
          <div style="font-size: 11px; font-weight: 700; color: #0284c7; margin-top: 3px;">${residentEng}</div>
          <div class="sig-line">التوقيع والتاريخ</div>
        </td>
        <td>
          <div style="font-weight: 800; color: #334155;">مسؤول شعبة المتابعة الفنية</div>
          <div class="sig-line">التوقيع والتاريخ</div>
        </td>
        <td>
          <div style="font-weight: 800; color: #334155;">مدير ماء محافظة الأنبار</div>
          <div style="font-size: 11px; font-weight: 700; color: #0284c7; margin-top: 3px;">(الختم والمصادقة الرسمية)</div>
          <div class="sig-line">التوقيع والختم</div>
        </td>
      </tr>
    </table>

    <div class="footer-bar">
      <div>منظومة إدارة ومتابعة مشاريع مديرية ماء محافظة الأنبار - تقرير ميداني معتمد</div>
      <div>طبع بتاريخ: ${new Date().toISOString().split("T")[0]}</div>
    </div>
  </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

// ─── Single Field Progress Report WhatsApp Share ─────────────────────────────
export function shareSingleFieldReportWhatsApp(
  report: ProgressReport,
  project?: Partial<Project> | null,
  reportNumber?: number
) {
  const projName = project?.name || "مشروع ماء في محافظة الأنبار";
  const contractNo = project?.contractNo || "—";
  const contractor = project?.contractor || "—";
  const residentEng = report.engineer || (project as any)?.residentEngineerName || "المهندس المقيم";
  const location = project?.location || project?.district || "محافظة الأنبار";
  const reportDate = formatDateDMY(report.date) || report.date || new Date().toISOString().split("T")[0];

  const workers = report.labour?.workers ?? 0;
  const techs = report.labour?.techs ?? 0;
  const engs = report.labour?.engineers ?? 0;
  const equipStr = Array.isArray(report.equipment) && report.equipment.length > 0 ? report.equipment.join(" ، ") : "";

  const reportHeaderTitle = reportNumber
    ? `📋 *تقرير تقدم عمل ميداني - رقم (${reportNumber})*`
    : `📋 *تقرير تقدم عمل ميداني معتمد*`;

  const lines = [
    `🏛️ *جمهورية العراق - مديرية ماء محافظة الأنبار*`,
    `قسم التخطيط والمتابعة - دائرة المهندس المقيم`,
    `━━━━━━━━━━━━━━━━━━━━`,
    reportHeaderTitle,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🏗️ *اسم المشروع:* ${projName}`,
    `📄 *رقم العقد:* ${contractNo}`,
    `📍 *الموقع:* ${location}`,
    `🏢 *الشركة المنفذة:* ${contractor}`,
    `👷‍♂️ *المهندس المقيم المشرف:* ${residentEng}`,
    `📅 *تاريخ إعداد التقرير:* ${reportDate}`,
    `📊 *نسبة الإنجاز الفعلي:* ${report.actualProgress}%`,
  ];

  if (project?.plannedProgress !== undefined && project.plannedProgress !== null) {
    lines.push(`🎯 *نسبة الإنجاز المخطط المستهدف:* ${project.plannedProgress}%`);
  }

  if (workers > 0 || techs > 0 || engs > 0) {
    lines.push(
      ``,
      `👥 *الكوادر الميدانية العاملة بالموقع:*`,
      `• مهندسون: (${engs})  • فنيون: (${techs})  • عمال: (${workers})`
    );
  }

  if (equipStr) {
    lines.push(`🚜 *الآليات والمعدات العاملة:* ${equipStr}`);
  }

  lines.push(
    ``,
    `🔨 *الأعمال والفقرات المنجزة والمتحققة:*`,
    `${report.completedWorks || "تم تنفيذ الأعمال وفق المواصفات وجدول تقدم العمل المعتمد."}`
  );

  if (report.upcomingWorks) {
    lines.push(
      ``,
      `🔮 *الأعمال المخططة للمرحلة القادمة:*`,
      `${report.upcomingWorks}`
    );
  }

  if (report.obstaclesText) {
    lines.push(
      ``,
      `⚠️ *المشاكل والمعوقات الميدانية:*`,
      `${report.obstaclesText}`
    );
  }

  if (report.notes) {
    lines.push(
      ``,
      `📝 *ملاحظات وتوصيات المهندس المقيم:*`,
      `${report.notes}`
    );
  }

  if (report.photos && report.photos.length > 0) {
    lines.push(
      ``,
      `📸 *الصور الميدانية المرفقة:* تم توثيق وإرفاق (${report.photos.length}) صور ميدانية في النظام.`
    );
  }

  lines.push(
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `✅ *صادر رسمياً عن منظومة متابعة المشاريع - مديرية ماء الأنبار*`
  );

  const text = lines.join("\n");
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

// ─── Single Field Progress Report Copy to Clipboard ──────────────────────────
export async function copySingleFieldReportText(
  report: ProgressReport,
  project?: Partial<Project> | null,
  reportNumber?: number
) {
  const projName = project?.name || "مشروع ماء في محافظة الأنبار";
  const contractNo = project?.contractNo || "—";
  const contractor = project?.contractor || "—";
  const residentEng = report.engineer || (project as any)?.residentEngineerName || "المهندس المقيم";
  const location = project?.location || project?.district || "محافظة الأنبار";
  const reportDate = formatDateDMY(report.date) || report.date || new Date().toISOString().split("T")[0];

  const workers = report.labour?.workers ?? 0;
  const techs = report.labour?.techs ?? 0;
  const engs = report.labour?.engineers ?? 0;
  const equipStr = Array.isArray(report.equipment) && report.equipment.length > 0 ? report.equipment.join(" ، ") : "";

  const repNumStr = reportNumber ? `رقم (${reportNumber})` : "";

  const lines = [
    `جمهورية العراق - مديرية ماء محافظة الأنبار`,
    `تقرير تقدم عمل ميداني ${repNumStr}`,
    `----------------------------------------`,
    `المشروع: ${projName}`,
    `رقم العقد: ${contractNo}`,
    `الموقع: ${location}`,
    `الشركة المنفذة: ${contractor}`,
    `المهندس المقيم: ${residentEng}`,
    `تاريخ التقرير: ${reportDate}`,
    `نسبة الإنجاز الفعلي: ${report.actualProgress}%`,
  ];

  if (workers > 0 || techs > 0 || engs > 0) {
    lines.push(`الكوادر: مهندسون (${engs}) | فنيون (${techs}) | عمال (${workers})`);
  }

  if (equipStr) {
    lines.push(`الآليات: ${equipStr}`);
  }

  lines.push(
    ``,
    `الأعمال المنجزة:`,
    `${report.completedWorks || "—"}`
  );

  if (report.upcomingWorks) lines.push(``, `الأعمال القادمة:`, `${report.upcomingWorks}`);
  if (report.obstaclesText) lines.push(``, `المعوقات:`, `${report.obstaclesText}`);
  if (report.notes) lines.push(``, `ملاحظات المهندس المقيم:`, `${report.notes}`);

  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    toast.success("تم نسخ نص التقرير الميداني بالكامل إلى الحافظة!");
  } catch {
    toast.error("تعذر النسخ إلى الحافظة");
  }
}

// ─── Interfaces ──────────────────────────────────────────────────────────────
export interface ProgressReport {
  id: string;
  projectId: string;
  date: string;
  engineer: string;
  actualProgress: number;
  status: string;
  completedWorks: string;
  upcomingWorks?: string;
  weather?: string;
  labour?: { workers: number; techs: number; engineers: number };
  equipment?: string[];
  obstacles?: { title: string; desc: string; risk: string; approval: boolean }[];
  obstaclesText?: string;
  materials?: { item: string; qty: number; unit: string; reason: string; date: string; received: boolean; notes: string }[];
  lat?: number;
  lng?: number;
  notes?: string;
  photos?: string[];
  files?: string[];
}

// ─── Default Progress History ────────────────────────────────────────────────
const DEFAULT_REPORTS: ProgressReport[] = [];

// Helper to determine if a project is strictly ongoing (< 100% and not completed or stopped)
export const isProjectOngoing = (p: Project): boolean => {
  if (!p) return false;
  if (p.status === "completed" || p.status === "stopped") return false;
  if (Number(p.actualProgress || 0) >= 100) return false;
  return true;
};

export function OngoingProjectsPage() {
  const { user } = useAuth();
  // Synchronous immediate initialization (0ms delay)
  const [projects, setProjects] = useState<Project[]>(() => {
    return getStoredProjects().filter(isProjectOngoing);
  });
  const [reports, setReports] = useState<ProgressReport[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("wms.progress_reports");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed.filter((r) => r && r.id && r.projectId);
          }
        } catch {}
      }
    }
    return [];
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [projectToShare, setProjectToShare] = useState<Project | null>(null);
  const [selectedReportDetails, setSelectedReportDetails] = useState<{
    report: ProgressReport;
    reportNumber: number;
    projectName: string;
  } | null>(null);
  const [selectedCombinedReport, setSelectedCombinedReport] = useState<{
    project: Project;
    reports: ProgressReport[];
  } | null>(null);
  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState<Project | null>(null);
  const [projectDetailsTab, setProjectDetailsTab] = useState<"reports" | "photos" | "contract" | "map">("reports");
  const [activePhotoViewer, setActivePhotoViewer] = useState<{
    photos: string[];
    activeIndex: number;
    title?: string;
  } | null>(null);
  const [isAddWizardOpen, setIsAddWizardOpen] = useState(false);

  // Complete Project State
  const [projectToComplete, setProjectToComplete] = useState<Project | null>(null);
  const [completeHandoverDate, setCompleteHandoverDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [completeCommittee1, setCompleteCommittee1] = useState("");
  const [completeCommittee2, setCompleteCommittee2] = useState("");
  const [completeCommittee3, setCompleteCommittee3] = useState("");
  const [completeNotes, setCompleteNotes] = useState("");
  
  // Dialog & Report Form State
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progressVal, setProgressVal] = useState(50);
  const [statusVal, setStatusVal] = useState("ongoing");
  const [completedWorks, setCompletedWorks] = useState("");
  const [upcomingWorks, setUpcomingWorks] = useState("");
  const [notes, setNotes] = useState("");

  // Labour
  const [workers, setWorkers] = useState(5);
  const [techs, setTechs] = useState(2);
  const [engineersCount, setEngineersCount] = useState(1);

  // Equipment selection
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const EQUIP_OPTIONS = ["حفارة", "رافعة", "قلاب", "مولدة", "صهريج"];

  // Obstacles
  const [obstacles, setObstacles] = useState<{ title: string; desc: string; risk: string; approval: boolean }[]>([]);
  const [obstaclesText, setObstaclesText] = useState("");
  const [obsTitle, setObsTitle] = useState("");
  const [obsDesc, setObsDesc] = useState("");
  const [obsRisk, setObsRisk] = useState("متوسط");
  const [obsApproval, setObsApproval] = useState(false);

  // Materials
  const [materials, setMaterials] = useState<ProgressReport["materials"]>([]);
  const [matItem, setMatItem] = useState("");
  const [matQty, setMatQty] = useState(0);
  const [matUnit, setMatUnit] = useState("");
  const [matReason, setMatReason] = useState("");
  const [matReceived, setMatReceived] = useState(false);
  const [matNotes, setMatNotes] = useState("");

  // Map Coordinates (Mock GPS detection)
  const [gpsLat, setGpsLat] = useState(33.34);
  const [gpsLng, setGpsLng] = useState(44.41);

  // Simulated uploads
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  // Load and auto-heal ongoing projects with complete local+remote merger
  const loadOngoingData = async () => {
    // 1. Immediately read from localStorage and show in UI
    const localList = getStoredProjects();
    setProjects(localList.filter(isProjectOngoing));

    // 2. Fetch from Supabase as single source of truth
    try {
      setIsSyncing(true);
      const remoteProjects = await getProjectsFromSupabase();
      if (remoteProjects && remoteProjects.length > 0) {
        // Merge remote projects with any locally stored projects so offline/new projects are never lost
        const remoteIds = new Set(remoteProjects.map((p) => p.id));
        const localList = getStoredProjects();
        const localOnly = localList.filter((p) => p && p.id && !remoteIds.has(p.id));
        const combined = [...remoteProjects, ...localOnly];

        // Auto-synchronize any project with 100% progress to 'completed'
        const synced = combined.map((p) => {
          if (Number(p.actualProgress || 0) >= 100 && p.status !== "completed") {
            return { ...p, status: "completed" as ProjectStatus, actualProgress: 100 };
          }
          return p;
        });
        setProjects(synced.filter(isProjectOngoing));
        saveStoredProjects(synced, true); // silent=true: don't dispatch projects_updated during load
      }
    } catch (e) {
      console.warn("Could not fetch remote projects in ongoing:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Save new project from Wizard
  const handleWizardSave = async (newProject: Project) => {
    const actProg = (newProject.actualProgress === undefined || newProject.actualProgress === null || isNaN(Number(newProject.actualProgress)))
      ? 0
      : Number(newProject.actualProgress);
    const planProg = (newProject.plannedProgress === undefined || newProject.plannedProgress === null || isNaN(Number(newProject.plannedProgress)))
      ? 0
      : Number(newProject.plannedProgress);

    const cleanProject: Project = {
      ...newProject,
      actualProgress: actProg,
      plannedProgress: planProg,
      status: actProg >= 100 ? "completed" : (newProject.status || "ongoing"),
    };

    const currentList = getStoredProjects();
    const updatedList = [
      cleanProject,
      ...currentList.filter(
        p => p.id !== cleanProject.id &&
        !(p.name && cleanProject.name && p.name.trim().toLowerCase() === cleanProject.name.trim().toLowerCase())
      )
    ];
    saveStoredProjects(updatedList);
    setProjects(updatedList.filter(isProjectOngoing));
    await saveProjectToSupabase(cleanProject);
    window.dispatchEvent(new Event("projects_updated"));
  };

  // Supabase & Local storage initialization
  useEffect(() => {
    loadOngoingData();

    // Load Reports
    async function loadReports() {
      const isRealReport = (r: ProgressReport) => Boolean(r && r.id && r.projectId);

      const storedRaw = localStorage.getItem("wms.progress_reports");
      let storedReports: ProgressReport[] = [];
      if (storedRaw) {
        try {
          const parsed = JSON.parse(storedRaw);
          if (Array.isArray(parsed)) {
            storedReports = parsed.filter(isRealReport);
          }
        } catch {}
      }

      const remoteReports = await getProgressReportsFromSupabase();
      if (remoteReports && remoteReports.length > 0) {
        const cleanedRemote = remoteReports.filter(isRealReport);
        const map = new Map<string, ProgressReport>();
        // Add stored first, then remote to prioritize/merge
        storedReports.forEach((r) => map.set(r.id, r));
        cleanedRemote.forEach((r) => map.set(r.id, r));
        const merged = Array.from(map.values());
        setReports(merged);
        localStorage.setItem("wms.progress_reports", JSON.stringify(merged));
      } else {
        setReports(storedReports);
      }
    }
    loadReports();

    const handleUpdate = () => {
      const local = getStoredProjects();
      setProjects(local.filter(isProjectOngoing));
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

  const saveReports = (list: ProgressReport[]) => {
    setReports(list);
    localStorage.setItem("wms.progress_reports", JSON.stringify(list));
  };

  // Stats calculators
  const stats = useMemo(() => {
    const totalVal = projects.reduce((sum, p) => sum + (p.contractValue || 0), 0);
    const avgProgress = projects.length ? Math.round(projects.reduce((sum, p) => sum + (p.actualProgress || 0), 0) / projects.length) : 0;
    
    // Delayed & stopped projects count based on end dates
    const today = new Date().toISOString().split("T")[0];
    const delayedCount = projects.filter(p => p.plannedEndDate && p.plannedEndDate < today).length;
    const stoppedCount = projects.filter(p => p.status === "stopped").length;

    // Obstacles count
    const activeObstacles = reports.reduce((sum, r) => sum + (r.obstacles?.length || 0), 0);

    return {
      total: projects.length,
      delayed: delayedCount,
      stopped: stoppedCount,
      totalValue: totalVal,
      avgProgress: isNaN(avgProgress) ? 0 : avgProgress,
      activeObstacles: isNaN(activeObstacles) ? 0 : activeObstacles,
      changeOrders: projects.reduce((sum, p) => sum + (p.changeOrdersCount || 0), 0)
    };
  }, [projects, reports]);

  // Determine Project Health
  const getProjectHealth = (project: Project) => {
    const today = new Date().toISOString().split("T")[0];
    const isOverdue = project.plannedEndDate && project.plannedEndDate < today;
    const planned = Number(project.plannedProgress ?? 0);
    const actual  = Number(project.actualProgress  ?? 0);
    const dev = (isNaN(planned) ? 0 : planned) - (isNaN(actual) ? 0 : actual);

    if (isOverdue || dev > 15) return { label: "حرج", color: "bg-red-500/10 text-red-500 border-red-500/20" };
    if (dev > 5) return { label: "متأخر", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" };
    if (dev > 0) return { label: "يحتاج متابعة", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" };
    return { label: "ممتاز", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
  };

  // Print combined report in a new window - auto-scales to fit one A4 page
  const printReport = () => {
    const printDiv = document.getElementById("combined-report-print-area");
    if (!printDiv) return;
    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) return;
    const css = [
      "*{box-sizing:border-box;margin:0;padding:0;}",
      "@page{size:A4 portrait;margin:6mm 8mm;}",
      "html{-webkit-print-color-adjust:exact;print-color-adjust:exact;}",
      "body{font-family:'Cairo',Arial,sans-serif;direction:rtl;background:#fff;color:#111;font-size:8.5px;line-height:1.35;width:190mm;margin:0 auto;}",
      "#combined-report-print-area{width:190mm;transform-origin:top right;}",
      ".flex{display:flex;}.flex-col{flex-direction:column;}.flex-wrap{flex-wrap:wrap;}",
      ".items-center{align-items:center;}.justify-between{justify-content:space-between;}.justify-center{justify-content:center;}",
      ".text-right{text-align:right;}.text-left{text-align:left;}.text-center{text-align:center;}",
      ".gap-1{gap:2px;}.gap-2{gap:4px;}.gap-3{gap:6px;}.gap-4{gap:9px;}.gap-6{gap:13px;}",
      ".space-y-1>*+*{margin-top:2px;}.space-y-2>*+*{margin-top:4px;}.space-y-3>*+*{margin-top:5px;}",
      ".space-y-4>*+*{margin-top:7px;}.space-y-6>*+*{margin-top:9px;}.space-y-8>*+*{margin-top:12px;}",
      ".grid{display:grid;}.grid-cols-2{grid-template-columns:1fr 1fr;}.grid-cols-3{grid-template-columns:1fr 1fr 1fr;}",
      ".grid-cols-4{grid-template-columns:1fr 1fr 1fr 1fr;}",
      ".p-2{padding:3px;}.p-3{padding:5px;}.p-4{padding:7px;}",
      ".py-1{padding-top:2px;padding-bottom:2px;}.py-2{padding-top:3px;padding-bottom:3px;}",
      ".pt-2{padding-top:3px;}.pt-8{padding-top:12px;}.pb-2{padding-bottom:4px;}.pr-2{padding-right:4px;}",
      ".mt-0{margin-top:0;}.mt-2{margin-top:4px;}.mt-4{margin-top:7px;}.mt-6{margin-top:9px;}",
      ".mb-3{margin-bottom:5px;}.mb-4{margin-bottom:7px;}",
      ".border{border:1px solid #e2e8f0;}.border-b{border-bottom:1px solid #e2e8f0;}",
      ".border-b-2{border-bottom:2px solid #a5b4fc;}.border-t-2{border-top:2px solid #e2e8f0;}.border-t{border-top:1px solid #e2e8f0;}",
      ".rounded{border-radius:3px;}.rounded-lg{border-radius:5px;}.rounded-xl{border-radius:7px;}.rounded-2xl{border-radius:9px;}",
      ".bg-card{background:#fff;}",
      ".text-primary{color:#1e40af;}.text-foreground{color:#111827;}.text-muted-foreground{color:#6b7280;}",
      ".text-emerald-600,.text-emerald-700{color:#059669;}.text-blue-700{color:#1d4ed8;}",
      ".text-rose-700,.text-rose-900{color:#be123c;}",
      ".font-black{font-weight:900;}.font-extrabold{font-weight:800;}.font-bold{font-weight:700;}.font-semibold{font-weight:600;}",
      "h2{font-size:12px;}h3{font-size:10px;}h4{font-size:9px;}",
      ".text-sm{font-size:10px;}.text-xs{font-size:8.5px;}.text-lg{font-size:12px;}",
      ".italic{font-style:italic;}.uppercase{text-transform:uppercase;}",
      ".tracking-widest{letter-spacing:0.1em;}.leading-relaxed{line-height:1.4;}",
      ".block{display:block;}.inline{display:inline;}.w-full{width:100%;}",
      "button,[role=button],.no-print{display:none !important;}",
      "svg{width:10px;height:10px;display:inline-block;vertical-align:middle;}",
      "img{max-width:55px;height:auto;}",
      ".bg-primary{background:#1e40af;color:#fff;border-radius:3px;padding:1px 5px;font-size:8px;display:inline-block;}",
      ".text-white{color:#fff;}"
    ].join("");
    const scaleScript = "window.onload=function(){var el=document.getElementById('combined-report-print-area')||document.body;var avail=265*3.7795;var act=el.scrollHeight;if(act>avail){var s=avail/act;el.style.transform='scale('+s+')';el.style.transformOrigin='top right';document.body.style.height=(act*s)+'px';document.body.style.overflow='hidden';}setTimeout(function(){window.print();window.close();},500);};";
    win.document.open();
    win.document.write("<!DOCTYPE html><html dir='rtl' lang='ar'><head><meta charset='UTF-8'/><title>\u062a\u0642\u0631\u064a\u0631 \u062a\u0631\u0627\u0643\u0645\u064a</title><link rel='stylesheet' href='https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap'/><style>" + css + "</style></head><body><script>" + scaleScript + "<\/script>" + printDiv.innerHTML + "</body></html>");
    win.document.close();
    win.focus();
  };

  // Save combined report as PDF via native browser print-to-PDF engine
  const savePDF = () => {
    toast.info("تم فتح النافذة — اختر 'حفظ بتنسيق PDF' (Save as PDF) لحفظ الملف على جهازك", { duration: 4000 });
    printReport();
  };

  // Share report summary via WhatsApp
  const shareWhatsApp = () => {
    if (!selectedCombinedReport) return;
    const p = selectedCombinedReport.project;
    const reportsCount = selectedCombinedReport.reports.length;
    const lastReport = selectedCombinedReport.reports[0];

    let text = `*مديرية ماء محافظة الأنبار*\n`;
    text += `*دائرة المهندس المقيم*\n\n`;
    text += `📋 *التقرير التراكمي الشامل لمتابعة تقدم أعمال المشروع*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🏗 *اسم المشروع:* ${p.name}\n`;
    if (p.contractNo) text += `📜 *رقم العقد:* ${p.contractNo}\n`;
    if (p.contractor) text += `🏢 *الشركة المنفذة:* ${p.contractor}\n`;
    text += `👷‍♂️ *المهندس المقيم:* ${(p as any).residentEngineerName || "م. أحمد الجبوري"}\n`;
    text += `📊 *نسبة الإنجاز الفعلي:* ${p.actualProgress}%\n`;
    text += `📑 *عدد التقارير الميدانية:* ${reportsCount} تقارير\n`;
    if (lastReport) {
      text += `📅 *أحدث تقرير بتاريخ:* ${lastReport.date}\n`;
      if (lastReport.completedWorks) {
        const worksSnippet = lastReport.completedWorks.length > 140 
          ? lastReport.completedWorks.substring(0, 140) + "..." 
          : lastReport.completedWorks;
        text += `✅ *أبرز الأعمال المنجزة:* ${worksSnippet}\n`;
      }
    }
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📱 *تم الإرسال عبر برنامج متابعة المشاريع*`;

    const encodedText = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, "_blank");
  };

  // Determine Stage Progress label based on percentage
  const getProgressStage = (pct: number) => {
    if (pct === 0) return "لم يبدأ";
    if (pct <= 25) return "بدء التنفيذ";
    if (pct <= 50) return "قيد التنفيذ";
    if (pct <= 75) return "في المراحل المتقدمة";
    if (pct <= 99) return "قارب على الإنجاز";
    return "مكتمل";
  };

  // Obstacle actions
  const addObstacle = () => {
    if (obsTitle.trim()) {
      setObstacles([...obstacles, { title: obsTitle.trim(), desc: obsDesc.trim(), risk: obsRisk, approval: obsApproval }]);
      setObsTitle("");
      setObsDesc("");
      setObsRisk("متوسط");
      setObsApproval(false);
    }
  };

  const removeObstacle = (idx: number) => {
    setObstacles(obstacles.filter((_, i) => i !== idx));
  };

  // Material actions
  const addMaterial = () => {
    if (matItem.trim() && matQty > 0) {
      setMaterials([...(materials || []), {
        item: matItem.trim(),
        qty: matQty,
        unit: matUnit || "عدد",
        reason: matReason,
        date: new Date().toISOString().split("T")[0],
        received: matReceived,
        notes: matNotes
      }]);
      setMatItem("");
      setMatQty(0);
      setMatUnit("");
      setMatReason("");
      setMatReceived(false);
      setMatNotes("");
    }
  };

  const removeMaterial = (idx: number) => {
    setMaterials(materials?.filter((_, i) => i !== idx) || []);
  };

  // Simulated GPS locator
  const detectLocation = () => {
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 800)),
      {
        loading: "جاري التقاط إحداثيات الموقع الحالي...",
        success: () => {
          setGpsLat(33.4248 + (Math.random() - 0.5) * 0.05);
          setGpsLng(43.3023 + (Math.random() - 0.5) * 0.05);
          return "تم كشف إحداثيات الموقع GPS بنجاح.";
        },
        error: "فشل في كشف الموقع الجغرافي."
      }
    );
  };

  const handleDeleteProject = (pId: string) => {
    setProjectToDelete(pId);
  };

  const executeDeleteProject = async () => {
    if (!projectToDelete) return;
    const targetId = projectToDelete;
    const allStoredProjects = JSON.parse(localStorage.getItem("projects") || "[]");
    const updatedProjects = allStoredProjects.filter((p: Project) => p.id !== targetId);
    
    localStorage.setItem("projects", JSON.stringify(updatedProjects));
    saveStoredProjects(updatedProjects);
    setProjects(updatedProjects.filter((p: Project) => p.status === "ongoing" || p.status === "delayed"));
    
    // Sync delete with Supabase REST API
    await deleteProjectFromSupabase(targetId);

    // Notify other components/tabs
    window.dispatchEvent(new Event("projects_updated"));

    toast.success("تم حذف المشروع بنجاح 🗑️");
    setProjectToDelete(null);
  };

  const handleDeleteReport = (rId: string) => {
    setReportToDelete(rId);
  };

  const executeDeleteReport = async () => {
    if (!reportToDelete) return;
    const targetId = reportToDelete;
    const stored = localStorage.getItem("wms.progress_reports");
    const rawList: ProgressReport[] = stored ? JSON.parse(stored) : [];
    const updatedReports = rawList.filter((r) => r.id !== targetId);

    localStorage.setItem("wms.progress_reports", JSON.stringify(updatedReports));
    setReports(updatedReports);

    // Sync delete report with Supabase
    await deleteProgressReportFromSupabase(targetId);

    if (selectedReportDetails?.report.id === targetId) {
      setSelectedReportDetails(null);
    }
    if (selectedCombinedReport) {
      setSelectedCombinedReport(prev => prev ? {
        ...prev,
        reports: prev.reports.filter(r => r.id !== targetId)
      } : null);
    }

    window.dispatchEvent(new Event("projects_updated"));
    toast.success("تم حذف تقرير المتابعة الميدانية بنجاح 🗑️");
    setReportToDelete(null);
  };

  const handleOpenReportForm = (pId: string) => {
    const proj = projects.find(p => p.id === pId);
    if (!proj) return;
    
    setSelectedProjectId(pId);
    setProgressVal(proj.actualProgress || 0);
    
    // Clear lists
    setCompletedWorks("");
    setObstaclesText("");
    setNotes("");
    setUploadedPhotos([]);
    setIsReportOpen(true);
  };

  const handleSaveReport = async () => {
    if (!completedWorks.trim()) {
      toast.error("يرجى ملء تفاصيل العمل لتسجيل التقرير.");
      return;
    }

    setSaving(true);

    const proj = projects.find(p => p.id === selectedProjectId);
    const originalStatus = proj?.status || "ongoing";

    const newReport: ProgressReport = {
      id: `REP-${Date.now()}`,
      projectId: selectedProjectId!,
      date: new Date().toISOString().split("T")[0],
      engineer: user?.name || (proj as any)?.residentEngineerName || "المهندس المشرف",
      actualProgress: progressVal,
      status: progressVal === 100 ? "completed" : (originalStatus === "completed" ? "ongoing" : originalStatus),
      completedWorks,
      upcomingWorks: upcomingWorks || undefined,
      labour: {
        workers,
        techs,
        engineers: engineersCount,
      },
      equipment: selectedEquipment.length ? selectedEquipment : undefined,
      obstaclesText: obstaclesText || undefined,
      notes: notes || undefined,
      photos: uploadedPhotos.length ? uploadedPhotos : undefined
    };

    // Update ongoing reports list
    const updatedReports = [newReport, ...reports];
    saveReports(updatedReports);

    // Update actual progress of the project itself in storage
    const allStoredProjects = JSON.parse(localStorage.getItem("projects") || "[]");
    let targetProj: Project | null = null;
const updatedProjects = allStoredProjects.map((p: Project) => {
      if (p.id === selectedProjectId) {
        targetProj = {
          ...p,
          actualProgress: progressVal,
          status: progressVal === 100 ? ("completed" as ProjectStatus) : (p.status === "completed" ? ("ongoing" as ProjectStatus) : p.status)
        };
        return targetProj;
      }
      return p;
    });
    localStorage.setItem("projects", JSON.stringify(updatedProjects));
    saveStoredProjects(updatedProjects);
    
    // Update local state by removing completed project immediately
    setProjects(updatedProjects.filter(isProjectOngoing));

    // Realtime broadcast and sync
    if (targetProj) {
      saveProjectToSupabase(targetProj);
    }
    await saveProgressReportToSupabase(newReport);
    window.dispatchEvent(new Event("projects_updated"));

    setSaving(false);
    setIsReportOpen(false);

    toast.success(
      progressVal === 100
        ? "🎉 تم إنجاز المشروع بالكامل (100%) ونقله تلقائياً إلى صفحة المشاريع المنفذة والخرائط GIS!"
        : "تم حفظ واعتماد تقرير التقدم الميداني بنجاح! 🚀"
    );
  };

  const handleConfirmComplete = async () => {
    if (!projectToComplete) return;

    const allStoredProjects = JSON.parse(localStorage.getItem("projects") || "[]");
    let completedProj: Project | null = null;

    const updatedProjects = allStoredProjects.map((p: Project) => {
      if (p.id === projectToComplete.id) {
        completedProj = {
          ...p,
          status: "completed" as ProjectStatus,
          actualProgress: 100,
          initialHandoverDate: completeHandoverDate,
          initialHandoverCommittee: [completeCommittee1, completeCommittee2, completeCommittee3].filter(Boolean),
          initialHandoverNotes: completeNotes || undefined,
          notes: completeNotes ? `${p.notes ? p.notes + "\n" : ""}إنجاز المشروع: ${completeNotes}` : p.notes,
        };
        return completedProj;
      }
      return p;
    });

    localStorage.setItem("projects", JSON.stringify(updatedProjects));
    saveStoredProjects(updatedProjects);
    setProjects(updatedProjects.filter(isProjectOngoing));

    if (completedProj) {
      await saveProjectToSupabase(completedProj);
    }

    window.dispatchEvent(new Event("projects_updated"));

    toast.success(
      `🎉 تم اعتماد إنجاز مشروع "${projectToComplete.name}" بنجاح! تم نقله تلقائياً إلى قائمة "المشاريع المنفذة" وتمييزه في "خرائط الأنبار GIS".`,
      { duration: 6000 }
    );

    setProjectToComplete(null);
    setCompleteNotes("");
  };

  // Resolve active project in real-time
  const activeProject = selectedProjectForDetails
    ? projects.find((p) => p.id === selectedProjectForDetails.id) || selectedProjectForDetails
    : null;

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto animate-fadeIn" dir="rtl">
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* ─── CASE 1: FULL DEDICATED PROJECT DETAILS PAGE (WITH BACK BUTTON) ───── */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeProject ? (
        (() => {
          const proj = activeProject;
          const health = getProjectHealth(proj);
          const stage = getProgressStage(proj.actualProgress);
          const projectReports = reports.filter((r) => r.projectId === proj.id);

          // Collect all photos attached across all reports of this project
          const allProjectPhotos: {
            url: string;
            reportNumber: number;
            date: string;
            engineer: string;
            completedWorks: string;
          }[] = [];

          projectReports.forEach((rep, rIdx) => {
            const repNo = projectReports.length - rIdx;
            if (rep.photos && Array.isArray(rep.photos) && rep.photos.length > 0) {
              rep.photos.forEach((photoUrl) => {
                allProjectPhotos.push({
                  url: photoUrl,
                  reportNumber: repNo,
                  date: rep.date,
                  engineer: rep.engineer,
                  completedWorks: rep.completedWorks,
                });
              });
            }
          });

          return (
            <div className="space-y-6 animate-fadeIn">
              {/* ─── Top Sticky Navigation & Action Header ─── */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border/80 p-4 rounded-3xl shadow-xs">
                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedProjectForDetails(null);
                      setProjectDetailsTab("reports");
                    }}
                    className="gap-2 font-black rounded-2xl bg-background hover:bg-muted text-foreground border-border shadow-xs hover:border-primary/40 text-xs sm:text-sm h-10 px-4 cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4 text-primary" />
                    العودة إلى قائمة مشاريع قيد التنفيذ
                  </Button>
                  <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <span>مشاريع قيد التنفيذ</span>
                    <span>/</span>
                    <span className="text-foreground font-bold">{proj.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => setProjectToShare(proj)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300 font-extrabold text-xs shadow-xs gap-1.5 rounded-2xl h-10 px-4 cursor-pointer"
                    title="مشاركة استمارة ووثيقة المشروع كصورة أو PDF أو عبر واتساب"
                  >
                    <Share2 className="h-4 w-4 text-blue-600" />
                    مشاركة وثيقة المشروع
                  </Button>
                  <Button
                    onClick={() => {
                      setProjectToComplete(proj);
                      setCompleteHandoverDate(new Date().toISOString().split("T")[0]);
                      setCompleteCommittee1("");
                      setCompleteCommittee2("");
                      setCompleteCommittee3("");
                      setCompleteNotes("");
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-black shadow-sm rounded-2xl h-10 px-4 cursor-pointer"
                    title="اعتماد إنجاز المشروع بالكامل ونقله إلى المشاريع المنفذة"
                  >
                    <Trophy className="h-4 w-4" /> إنجاز المشروع (100%)
                  </Button>
                  <Button
                    onClick={() => handleOpenReportForm(proj.id)}
                    className="bg-primary hover:bg-primary/95 text-white gap-1.5 text-xs font-black shadow-md rounded-2xl h-10 px-4 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" /> إضافة تقرير تقدم ميداني
                  </Button>
                </div>
              </div>

              {/* ─── Master Project Executive Information Card ─── */}
              <Card className="border border-border/80 shadow-md bg-gradient-to-b from-card to-card/60 overflow-hidden rounded-3xl">
                <CardHeader className="p-6 pb-4 border-b border-border/60">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20">
                          رقم العقد: {proj.contractNo || "—"}
                        </span>
                        <Badge variant="outline" className={`${health.color} font-bold px-3 py-1 text-xs rounded-xl`}>
                          صحة المشروع: {health.label}
                        </Badge>
                        <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 font-bold px-3 py-1 text-xs rounded-xl">
                          📍 {proj.location}
                        </Badge>
                        <Badge className="bg-indigo-600 text-white font-bold px-3 py-1 text-xs rounded-xl">
                          المرحلة التنفيذية: {stage}
                        </Badge>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{proj.name}</h1>
                      <p className="text-xs text-muted-foreground font-medium">
                        معرّف المشروع في النظام: <span className="font-mono text-foreground font-bold">{proj.id}</span> · المقاول: <span className="font-bold text-foreground">{proj.contractor || "—"}</span>
                      </p>
                    </div>

                    {/* Progress Gauge */}
                    <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-3xl border border-border/60">
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block font-medium">نسبة الإنجاز الفعلي</span>
                        <span className="text-3xl font-black text-emerald-600 font-mono">{proj.actualProgress || 0}%</span>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* Progress Bar with Target Marker */}
                  <div className="space-y-2 bg-muted/20 p-4 rounded-2xl border border-border/40">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-muted-foreground">التقدم الفعلي مقابل المخطط المستهدف</span>
                      <span className="text-primary font-mono">{proj.actualProgress || 0}% فعلي / {proj.plannedProgress || 0}% مخطط</span>
                    </div>
                    <div className="relative">
                      <Progress value={proj.actualProgress} className="h-3 rounded-full" />
                      <div
                        style={{ right: `${proj.plannedProgress}%` }}
                        className="absolute top-1/2 -translate-y-1/2 w-1.5 h-6 bg-orange-500 rounded-full shadow-xs"
                        title={`المخطط المستهدف: ${proj.plannedProgress}%`}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground font-semibold">
                      <span>المخطط المستهدف: {proj.plannedProgress}%</span>
                      <span>تاريخ التحديث الميداني: {new Date().toISOString().split("T")[0]}</span>
                    </div>
                  </div>

                  {/* 4 Financial & Execution Stats Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-1">
                      <span className="text-muted-foreground block text-[11px]">قيمة العقد الأصلية</span>
                      <span className="font-black font-mono text-primary text-base sm:text-lg block">
                        {(proj.contractValue || 0).toLocaleString("en-US")} <span className="text-xs font-normal">د.ع</span>
                      </span>
                    </div>
                    <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10 space-y-1">
                      <span className="text-muted-foreground block text-[11px]">أوامر الغيار ({proj.changeOrdersCount || 0})</span>
                      <span className="font-black font-mono text-amber-700 text-base sm:text-lg block">
                        {(proj.changeOrdersTotalAmount || 0).toLocaleString("en-US")} <span className="text-xs font-normal">د.ع</span>
                      </span>
                    </div>
                    <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 space-y-1">
                      <span className="text-muted-foreground block text-[11px]">كلفة العمل الكلية</span>
                      <span className="font-black font-mono text-emerald-700 text-base sm:text-lg block">
                        {(proj.workCost || (proj.contractValue || 0) + (proj.changeOrdersTotalAmount || 0)).toLocaleString("en-US")} <span className="text-xs font-normal">د.ع</span>
                      </span>
                    </div>
                    <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10 space-y-1">
                      <span className="text-muted-foreground block text-[11px]">المصروف الكلي</span>
                      <span className="font-black font-mono text-blue-700 text-base sm:text-lg block">
                        {(proj.disbursedWork || proj.totalDisbursed || 0).toLocaleString("en-US")} <span className="text-xs font-normal">د.ع</span>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ─── Ultra-Organized Segmented Navigation Tabs Bar ─── */}
              <div className="flex items-center gap-2 p-1.5 bg-muted/40 rounded-2xl border border-border/80 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setProjectDetailsTab("reports")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    projectDetailsTab === "reports"
                      ? "bg-primary text-white shadow-md shadow-primary/20 scale-102"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/80"
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>سجل التقارير الميدانية ({projectReports.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProjectDetailsTab("photos")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    projectDetailsTab === "photos"
                      ? "bg-primary text-white shadow-md shadow-primary/20 scale-102"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/80"
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>معرض الصور الميدانية ({allProjectPhotos.length})</span>
                  {allProjectPhotos.length > 0 && (
                    <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                      {allProjectPhotos.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setProjectDetailsTab("contract")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    projectDetailsTab === "contract"
                      ? "bg-primary text-white shadow-md shadow-primary/20 scale-102"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/80"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>البيانات والمدد التعاقدية</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProjectDetailsTab("map")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    projectDetailsTab === "map"
                      ? "bg-primary text-white shadow-md shadow-primary/20 scale-102"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/80"
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>الموقع الجغرافي وخريطة الأنبار</span>
                </button>
              </div>

              {/* ─── TAB 1: FIELD PROGRESS REPORTS TIMELINE WITH PHOTOS & ACTIONS ─── */}
              {projectDetailsTab === "reports" && (
                <Card className="border border-border/80 shadow-md rounded-3xl overflow-hidden bg-card">
                  <CardHeader className="p-5 sm:p-6 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent border-b flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shadow-inner">
                        <Activity className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-black text-foreground">
                          سجل تقارير التقدم الميداني ({projectReports.length})
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          كافة الزيارات والتقارير الفنية اليومية والدورية المعتمدة لمتابعة تقدم العمل
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {projectReports.length > 0 && (
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs gap-1.5 shadow-sm px-4 py-2 rounded-xl cursor-pointer"
                          onClick={() => setSelectedCombinedReport({ project: proj, reports: projectReports })}
                        >
                          <FileText className="h-4 w-4" /> التقرير التراكمي المجمع ({projectReports.length} تقارير)
                        </Button>
                      )}

                    </div>
                  </CardHeader>

                  {projectReports.length > 0 && (
                    <CardContent className="p-5 sm:p-6 space-y-4">
                      <div className="space-y-4">
                        {projectReports.map((rep, rIdx) => {
                          const repNo = projectReports.length - rIdx;
                          const isLatest = rIdx === 0;

                          return (
                            <div
                              key={rep.id}
                              className={`border rounded-3xl p-5 sm:p-6 bg-background hover:shadow-md transition-all space-y-4 ${
                                isLatest ? "border-primary/50 ring-1 ring-primary/20 bg-gradient-to-r from-primary/[0.02] to-transparent" : "border-border/80"
                              }`}
                            >
                              {/* Report Header Row */}
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <span className="bg-gradient-to-r from-primary to-indigo-600 text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-xs">
                                    تقرير رقم {repNo}
                                  </span>
                                  {isLatest && (
                                    <Badge className="bg-emerald-600 text-white text-xs font-black px-3 py-1 rounded-xl shadow-xs">
                                      الأحدث ⭐
                                    </Badge>
                                  )}
                                  <div className="flex items-center gap-1.5 text-foreground font-bold bg-muted/60 px-3 py-1.5 rounded-xl border border-border/60 text-xs">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    <span>{formatDateDMY(rep.date) || rep.date}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-muted-foreground font-semibold px-2 py-1 text-xs">
                                    <User className="w-4 h-4 text-primary" />
                                    <span>المهندس المقيم: <strong className="text-foreground">{rep.engineer}</strong></span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className="bg-emerald-600 text-white font-mono text-sm px-3.5 py-1 rounded-xl">
                                    الإنجاز: {rep.actualProgress}%
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-1.5 text-xs font-black text-blue-800 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300 dark:border-blue-800 rounded-xl shadow-2xs cursor-pointer"
                                    title="طباعة تقرير تقدم العمل الرسمي (A4)"
                                    onClick={() => printSingleFieldReport(rep, proj, repNo)}
                                  >
                                    <Printer className="h-4 w-4 text-blue-600 dark:text-blue-400" /> طباعة PDF
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-1.5 text-xs font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 rounded-xl shadow-2xs cursor-pointer"
                                    title="مشاركة التقرير الميداني عبر واتساب"
                                    onClick={() => shareSingleFieldReportWhatsApp(rep, proj, repNo)}
                                  >
                                    <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> مشاركة واتساب
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-xs cursor-pointer"
                                    onClick={() => setSelectedReportDetails({ report: rep, reportNumber: repNo, projectName: proj.name })}
                                  >
                                    <Eye className="h-4 w-4" /> عرض التفاصيل
                                  </Button>
                                </div>
                              </div>

                              {/* Content Blocks */}
                              <div className="space-y-3 text-xs">
                                <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-4 space-y-1">
                                  <strong className="text-emerald-950 dark:text-emerald-300 font-black block text-xs flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> الأعمال والفقرات المنجزة:
                                  </strong>
                                  <p className="text-emerald-950 dark:text-emerald-200 leading-relaxed font-medium">
                                    {rep.completedWorks}
                                  </p>
                                </div>

                                {rep.upcomingWorks && (
                                  <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-2xl p-4 space-y-1">
                                    <strong className="text-indigo-950 dark:text-indigo-300 font-black block text-xs flex items-center gap-1.5">
                                      <TrendingUp className="w-4 h-4 text-indigo-600" /> الأعمال المخططة للفترة القادمة:
                                    </strong>
                                    <p className="text-indigo-950 dark:text-indigo-200 leading-relaxed font-medium">
                                      {rep.upcomingWorks}
                                    </p>
                                  </div>
                                )}

                                {rep.obstaclesText && (
                                  <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-4 space-y-1">
                                    <strong className="text-rose-950 dark:text-rose-300 font-black block text-xs flex items-center gap-1.5">
                                      <AlertTriangle className="w-4 h-4 text-rose-600" /> المشاكل والمعوقات الميدانية:
                                    </strong>
                                    <p className="text-rose-950 dark:text-rose-200 leading-relaxed font-medium">
                                      {rep.obstaclesText}
                                    </p>
                                  </div>
                                )}

                                {/* Report Labour & Equipment Tags */}
                                {(rep.labour || (rep.equipment && rep.equipment.length > 0)) && (
                                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                                    {rep.labour && (
                                      <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-xl border border-border/60">
                                        <Users className="w-3.5 h-3.5 text-primary" />
                                        <span>عمال: <strong>{rep.labour.workers}</strong></span>
                                        <span>•</span>
                                        <span>فنيون: <strong>{rep.labour.techs}</strong></span>
                                        <span>•</span>
                                        <span>مهندسون: <strong>{rep.labour.engineers}</strong></span>
                                      </div>
                                    )}
                                    {rep.equipment && rep.equipment.length > 0 && (
                                      <div className="flex items-center gap-1.5 bg-muted/40 px-3 py-1.5 rounded-xl border border-border/60">
                                        <Wrench className="w-3.5 h-3.5 text-primary" />
                                        <span>الآليات: <strong>{rep.equipment.join(" ، ")}</strong></span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Attached Photos Gallery inside the Report Card */}
                                {rep.photos && Array.isArray(rep.photos) && rep.photos.length > 0 && (
                                  <div className="pt-3 border-t border-border/60 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-black text-foreground flex items-center gap-1.5">
                                        <ImageIcon className="w-4 h-4 text-primary" />
                                        الصور الميدانية المرفقة بالتقرير ({rep.photos.length} صور):
                                      </span>
                                      <span className="text-[11px] text-muted-foreground font-medium">
                                        انقر على أي صورة لتكبيرها واستعراضها
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                                      {rep.photos.map((photo, pIdx) => (
                                        <div
                                          key={pIdx}
                                          className="group relative rounded-2xl overflow-hidden border border-border/80 aspect-video shadow-2xs hover:shadow-md cursor-pointer transition-all bg-muted/30"
                                          onClick={() => setActivePhotoViewer({
                                            photos: rep.photos!,
                                            activeIndex: pIdx,
                                            title: `صور تقرير رقم ${repNo} (${formatDateDMY(rep.date)}) - ${proj.name}`
                                          })}
                                        >
                                          <img
                                            src={photo}
                                            alt={`صورة ${pIdx + 1} لتقرير ${repNo}`}
                                            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                                            loading="lazy"
                                          />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1 text-[11px] font-bold">
                                            <ZoomIn className="w-4 h-4" />
                                            <span>تكبير</span>
                                          </div>
                                          <span className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                                            {pIdx + 1}/{rep.photos.length}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}

              {/* ─── TAB 2: COMPREHENSIVE FIELD PHOTO GALLERY ─── */}
              {projectDetailsTab === "photos" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-5 rounded-3xl border border-border/80 shadow-xs">
                    <div>
                      <h3 className="text-base font-black text-foreground flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-primary" />
                        معرض الصور الميدانية والأعمال الموثقة ({allProjectPhotos.length} صورة)
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        توثيق مرئي شامل لكافة مراحل تنفيذ المشروع والأعمال المنجزة على أرض الواقع
                      </p>
                    </div>

                  </div>

                  {allProjectPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                      {allProjectPhotos.map((item, idx) => (
                        <div
                          key={idx}
                          className="group relative rounded-3xl overflow-hidden border border-border bg-card shadow-xs hover:shadow-xl hover:border-primary/50 transition-all cursor-pointer flex flex-col"
                          onClick={() => setActivePhotoViewer({
                            photos: allProjectPhotos.map((p) => p.url),
                            activeIndex: idx,
                            title: `صور مشروع ${proj.name}`
                          })}
                        >
                          <div className="aspect-video w-full overflow-hidden bg-muted/40 relative">
                            <img
                              src={item.url}
                              alt={`صورة ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <div className="bg-primary/90 text-white rounded-xl px-3 py-1 text-xs font-black flex items-center gap-1.5 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                <ZoomIn className="w-4 h-4" /> تكبير وعرض
                              </div>
                            </div>
                            <Badge className="absolute top-2 right-2 bg-primary/90 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded-lg">
                              تقرير {item.reportNumber}
                            </Badge>
                          </div>
                          <div className="p-3 space-y-1 bg-card border-t text-[11px]">
                            <div className="flex justify-between items-center text-muted-foreground font-semibold">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-primary" />
                                {formatDateDMY(item.date) || item.date}
                              </span>
                              <span className="font-mono text-primary font-bold">#{idx + 1}</span>
                            </div>
                            <p className="text-foreground font-medium line-clamp-1 text-[10px]">
                              {item.completedWorks || item.engineer}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-muted/10 border-2 border-dashed border-border rounded-3xl p-12 text-center space-y-3">
                      <div className="w-16 h-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto border border-primary/20">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                      <h4 className="text-sm font-black text-foreground">لا توجد صور مرفقة في تقارير هذا المشروع بعد</h4>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        عند إضافة تقرير تقدم ميداني جديد، قم بإرفاق الصور الميدانية لتظهر تلقائياً في هذا المعرض.
                      </p>

                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB 3: CONTRACT DETAILS & DATES ─── */}
              {projectDetailsTab === "contract" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Contract Info */}
                  <Card className="border shadow-xs rounded-3xl">
                    <CardHeader className="py-3 px-5 bg-muted/20 border-b">
                      <CardTitle className="text-xs font-black text-primary flex items-center gap-1.5">
                        <FileText className="h-4 w-4" /> البيانات التعاقدية والأولية
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-3 text-xs">
                      <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">اسم المشروع:</span><span className="font-bold">{proj.name}</span></div>
                      <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">موقع المشروع بالأنبار:</span><span className="font-bold text-primary">{proj.location}</span></div>
                      <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">رقم العقد:</span><span className="font-mono font-bold">{proj.contractNo || "—"}</span></div>
                      <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">تاريخ العقد:</span><span className="font-mono">{formatDateDMY(proj.contractDate) || "—"}</span></div>
                      <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">الجهة المنفذة (المقاول):</span><span className="font-bold text-foreground">{proj.contractor || "—"}</span></div>
                      <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">المهندس المقيم المشرف:</span><span className="font-bold text-primary">{(proj as any).residentEngineerName || "—"}</span></div>
                      <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">المشرفون المرافقون:</span><span className="font-bold">{proj.selectedSupervisors?.length ? proj.selectedSupervisors.join(" ، ") : "—"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">حالة المشروع:</span><span className="font-bold">{proj.status === "ongoing" ? "قيد التنفيذ" : proj.status === "delayed" ? "متأخر" : proj.status}</span></div>
                    </CardContent>
                  </Card>

                  {/* Timeline & Durations */}
                  <Card className="border shadow-xs rounded-3xl">
                    <CardHeader className="py-3 px-5 bg-muted/20 border-b">
                      <CardTitle className="text-xs font-black text-primary flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" /> التواريخ والمدد الزمنية
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-3 text-xs">
                      <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">مدة العقد الأصلية:</span><span className="font-bold">{proj.durationDays || "—"} يوم</span></div>
                      <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">تاريخ المباشرة:</span><span>{formatDateDMY(proj.startDate) || "—"}</span></div>
                      <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">تاريخ الإنجاز التعاقدي:</span><span className="font-bold text-primary">{formatDateDMY(proj.plannedEndDate) || "—"}</span></div>
                      <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">المدد الإضافية الممنوحة:</span><span>{proj.additionalDuration || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">أمر المباشرة:</span><span>{proj.commencementOrderDate ? formatDateDMY(proj.commencementOrderDate) : "—"}</span></div>
                    </CardContent>
                  </Card>

                  {/* Delay Reasons if any */}
                  {proj.delayReasons && (
                    <div className="md:col-span-2 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-900 text-xs leading-relaxed space-y-1">
                      <strong className="block text-amber-800 font-black mb-0.5">أسباب التأخير المسجلة:</strong>
                      <p>{proj.delayReasons}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB 4: GIS MAP & GEOGRAPHIC LOCATION ─── */}
              {projectDetailsTab === "map" && (
                <Card className="border shadow-xs rounded-3xl overflow-hidden">
                  <CardHeader className="py-3 px-5 bg-muted/20 border-b flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-black text-primary flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-red-500" /> الموقع الجغرافي بالأنبار والإحداثيات
                    </CardTitle>
                    <a
                      href={`https://www.google.com/maps?q=${proj.lat || 33.4248},${proj.lng || 43.3023}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary underline font-bold flex items-center gap-1"
                    >
                      فتح في Google Maps 🗺️
                    </a>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex justify-between items-center text-xs flex-wrap gap-2">
                      <span className="text-muted-foreground">العنوان: <strong className="text-foreground">{proj.location}</strong></span>
                      <span className="font-mono text-primary font-bold">الإحداثيات: {proj.lat || 33.4248}°N, {proj.lng || 43.3023}°E</span>
                    </div>
                    <div className="rounded-2xl overflow-hidden border border-border h-80 relative shadow-inner">
                      <iframe
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${(proj.lng || 43.3023) - 0.05},${(proj.lat || 33.4248) - 0.05},${(proj.lng || 43.3023) + 0.05},${(proj.lat || 33.4248) + 0.05}&layer=mapnik&marker=${proj.lat || 33.4248},${proj.lng || 43.3023}`}
                        title="موقع المشروع بالأنبار"
                        className="w-full h-full border-none"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          );
        })()
      ) : (
        /* ──────────────────────────────────────────────────────────────────────── */
        /* ─── CASE 2: ONGOING PROJECTS LIST MONITORING VIEW ────────────────────── */
        /* ──────────────────────────────────────────────────────────────────────── */
        <>
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2 flex-wrap">
                <div className="p-2 rounded-2xl bg-primary/10 text-primary">
                  <Construction className="h-6 w-6" />
                </div>
                مشاريع قيد التنفيذ والمتابعة الميدانية
                {isSyncing && (
                  <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground bg-primary/5 text-primary px-2.5 py-0.5 rounded-full border border-primary/20 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                    تحديث ومزامنة البيانات...
                  </span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground mr-1">
                مراقبة المشاريع الجارية، تسجيل نسب الإنجاز الفنية اليومية، وإدارة العقبات
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "المشاريع النشطة", val: stats.total, icon: Construction, color: "text-primary bg-primary/5" },
              { label: "المشاريع المتأخرة والمتلكئة", val: (stats.delayed || 0) + (stats.stopped || 0), icon: Clock, color: "text-orange-500 bg-orange-500/5 border-orange-500/10" },
              { label: "نسبة متوسط الإنجاز", val: `${stats.avgProgress || 0}%`, icon: TrendingUp, color: "text-emerald-500 bg-emerald-500/5" },
              { label: "إجمالي العقبات النشطة", val: stats.activeObstacles || 0, icon: AlertTriangle, color: "text-red-500 bg-red-500/5" },
            ].map((s, idx) => (
              <Card key={idx} className="border border-border/80 shadow-sm rounded-2xl">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">{s.label}</span>
                    <span className="text-xl font-black text-foreground block">{String(s.val ?? 0)}</span>
                  </div>
                  <div className={`p-3 rounded-xl ${s.color}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Projects Monitoring Area */}
          <div className="space-y-4">
            {projects.map((proj) => {
              const health = getProjectHealth(proj);
              const stage = getProgressStage(proj.actualProgress);
              const projectReports = reports.filter((r) => r.projectId === proj.id);

              return (
                <Card
                  key={proj.id}
                  onClick={() => setSelectedProjectForDetails(proj)}
                  className="border border-border shadow-md overflow-hidden hover:shadow-xl hover:border-primary/50 transition-all duration-200 cursor-pointer group rounded-3xl"
                >
                  <CardHeader className="bg-card/50 pb-4 border-b border-border/60">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-lg border border-border">
                            {proj.contractNo}
                          </span>
                          <Badge variant="outline" className={`${health.color} font-bold px-2.5 py-0.5 rounded-lg`}>
                            صحة المشروع: {health.label}
                          </Badge>
                          <span className="text-[11px] font-bold text-primary flex items-center gap-1 bg-primary/10 px-2.5 py-0.5 rounded-lg border border-primary/20 opacity-90 group-hover:opacity-100 transition-opacity">
                            <Eye className="h-3 w-3" /> انقر لفتح صفحة المشروع الكاملة
                          </span>
                        </div>
                        <h2 className="text-lg font-bold text-primary group-hover:text-primary/90 transition-colors">{proj.name}</h2>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectToShare(proj);
                          }}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300 font-extrabold text-xs shadow-xs gap-1.5 rounded-xl cursor-pointer"
                          title="مشاركة استمارة ووثيقة المشروع كصورة أو PDF أو عبر واتساب"
                        >
                          <Share2 className="h-3.5 w-3.5 text-blue-600" />
                          مشاركة المشروع
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectToComplete(proj);
                            setCompleteHandoverDate(new Date().toISOString().split("T")[0]);
                            setCompleteCommittee1("");
                            setCompleteCommittee2("");
                            setCompleteCommittee3("");
                            setCompleteNotes("");
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-black shadow-sm rounded-xl cursor-pointer"
                          title="اعتماد إنجاز المشروع بالكامل ونقله إلى المشاريع المنفذة"
                        >
                          <Trophy className="h-3.5 w-3.5" /> إنجاز المشروع (100%)
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProjectForDetails(proj);
                          }}
                          className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 gap-1.5 text-xs font-extrabold rounded-xl cursor-pointer"
                          title="فتح صفحة تفاصيل المشروع بالكامل"
                        >
                          <Eye className="h-3.5 w-3.5" /> تفاصيل المشروع
                        </Button>

                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(proj.id);
                          }}
                          variant="destructive"
                          className="gap-1.5 text-xs font-bold rounded-xl cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> حذف
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-6">
                    {/* Project parameters layout */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground block mb-0.5">الجهة المنفذة (المقاول)</span>
                        <span className="font-semibold text-foreground">{proj.contractor || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">المهندس المسؤول</span>
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-primary" />
                          {(proj as any).residentEngineerName || "أحمد الجبوري"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">تاريخ الإنجاز التعاقدي</span>
                        <span className="font-semibold text-foreground">{proj.plannedEndDate || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">حالة التقدم الحالية</span>
                        <span className="font-semibold text-primary block">{stage}</span>
                      </div>
                    </div>

                    {/* Progress bar and timeline */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">نسبة الإنجاز المالي والعملي</span>
                        <span className="font-bold text-primary font-mono">{proj.actualProgress}%</span>
                      </div>
                      <div className="relative">
                        <Progress value={proj.actualProgress} className="h-2.5" />
                        <div
                          style={{ right: `${proj.plannedProgress}%` }}
                          className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-orange-500"
                          title={`المخطط: ${proj.plannedProgress}%`}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>نسبة المخطط المستهدفة: {proj.plannedProgress}%</span>
                        <span>التقدم الفعلي: {proj.actualProgress}%</span>
                      </div>
                    </div>

                    {/* Project Photos Strip Preview on Card */}
                    {projectReports.some((r) => r.photos && r.photos.length > 0) && (
                      <div className="flex items-center gap-2 pt-1 overflow-x-auto" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] font-bold text-muted-foreground shrink-0 flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5 text-primary" /> الصور الميدانية:
                        </span>
                        {projectReports.flatMap((r) => r.photos || []).slice(0, 5).map((photo, pIdx, arr) => (
                          <div
                            key={pIdx}
                            className="w-12 h-12 rounded-xl overflow-hidden border border-border/80 shrink-0 hover:scale-108 hover:border-primary transition-all cursor-pointer relative group bg-muted/40"
                            onClick={() => setActivePhotoViewer({
                              photos: projectReports.flatMap((r) => r.photos || []),
                              activeIndex: pIdx,
                              title: `صور مشروع ${proj.name}`
                            })}
                          >
                            <img src={photo} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <ZoomIn className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ))}
                        {projectReports.flatMap((r) => r.photos || []).length > 5 && (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-xl border border-primary/20 shrink-0">
                            +{projectReports.flatMap((r) => r.photos || []).length - 5} صور
                          </span>
                        )}
                      </div>
                    )}

                    {/* Enhanced Reports history section in card */}
                    {projectReports.length > 0 && (
                      <div className="border-t border-border/80 pt-5 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                              <Activity className="h-4 w-4 animate-pulse" />
                            </div>
                            <h3 className="text-sm font-black text-foreground">
                              سجل كافة التقارير الميدانية للمشروع
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs font-extrabold px-3 py-1 bg-primary/10 text-primary border border-primary/20">
                              {projectReports.length} {projectReports.length === 1 ? "تقرير مسجل" : "تقارير مسجلة"}
                            </Badge>
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs gap-1.5 shadow-sm px-3.5 py-1 rounded-xl transition-all hover:scale-102 cursor-pointer"
                              onClick={() => setSelectedCombinedReport({ project: proj, reports: projectReports })}
                            >
                              <FileText className="h-4 w-4" /> التقرير التراكمي المجمع ({projectReports.length} تقارير)
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {projectReports.map((rep, rIndex) => {
                            const reportNumber = projectReports.length - rIndex;
                            const isLatest = rIndex === 0;
                            const isFirst = rIndex === projectReports.length - 1;

                            return (
                              <div
                                key={rep.id}
                                onClick={() => setSelectedReportDetails({ report: rep, reportNumber, projectName: proj.name })}
                                className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-card hover:shadow-md cursor-pointer group ${
                                  isLatest
                                    ? "border-primary/50 ring-1 ring-primary/20 bg-gradient-to-r from-primary/[0.03] to-transparent"
                                    : "border-border/80 hover:border-primary/40"
                                }`}
                              >
                                <div className="px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                                  {/* Left / Info side */}
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    <span className="bg-gradient-to-r from-primary to-indigo-600 text-white font-black text-xs px-3 py-1 rounded-xl shadow-xs">
                                      تقرير رقم {reportNumber}
                                    </span>

                                    {isLatest && (
                                      <Badge className="bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg shadow-xs">
                                        الأحدث ⭐
                                      </Badge>
                                    )}

                                    {isFirst && !isLatest && (
                                      <Badge variant="outline" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                        التقرير الأولي 🚀
                                      </Badge>
                                    )}

                                    <div className="flex items-center gap-1.5 text-foreground font-bold bg-muted/60 px-2.5 py-1 rounded-xl border border-border/60">
                                      <Calendar className="h-3.5 w-3.5 text-primary" />
                                      <span>{formatDateDMY(rep.date) || rep.date}</span>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-muted-foreground font-semibold px-2 py-1">
                                      <User className="h-3.5 w-3.5 text-primary" />
                                      <span>{rep.engineer}</span>
                                    </div>

                                    {/* Photos badge if report has photos */}
                                    {rep.photos && rep.photos.length > 0 && (
                                      <Badge variant="outline" className="bg-violet-500/10 text-violet-700 border-violet-500/30 text-[10px] font-bold flex items-center gap-1 rounded-lg">
                                        <ImageIcon className="w-3 h-3 text-violet-600" /> {rep.photos.length} صور
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Right / Progress & Actions side */}
                                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                    {rep.actualProgress !== undefined && (
                                      <div className="flex items-center gap-1.5 bg-background px-3 py-1 rounded-xl border border-primary/30 shadow-2xs">
                                        <span className="text-[11px] text-muted-foreground">الإنجاز:</span>
                                        <span className="font-mono font-black text-xs text-primary">{rep.actualProgress}%</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1.5">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 w-8 p-0 text-blue-700 bg-blue-50/50 hover:bg-blue-100 hover:text-blue-900 border-blue-200 rounded-xl cursor-pointer"
                                        title="طباعة التقرير كـ PDF (A4 معتمد)"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          printSingleFieldReport(rep, proj);
                                        }}
                                      >
                                        <Printer className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 w-8 p-0 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-900 border-emerald-200 rounded-xl cursor-pointer"
                                        title="مشاركة التقرير عبر واتساب"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          shareSingleFieldReportWhatsApp(rep, proj);
                                        }}
                                      >
                                        <MessageSquare className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="h-8 gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-xs group-hover:scale-102 transition-transform rounded-xl cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedReportDetails({ report: rep, reportNumber, projectName: proj.name });
                                        }}
                                      >
                                        <Eye className="h-3.5 w-3.5" /> التفاصيل
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Empty reports interactive state */}
                    {projectReports.length === 0 && (
                      <div className="border-t border-border/80 pt-4" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-foreground">لا توجد تقارير تقدم ميداني مسجلة لهذا المشروع بعد</h4>
                              <p className="text-[11px] text-muted-foreground">انقر على الزر لإضافة أول تقرير فني وميداني لتوثيق نسب الإنجاز والأعمال</p>
                            </div>
                          </div>

                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {projects.length === 0 && (
              <Card className="border border-dashed border-border bg-card/50 rounded-3xl p-10 text-center shadow-xs">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
                  <Construction className="w-8 h-8" />
                </div>
                <h3 className="text-base font-black text-foreground mb-1">لا توجد مشاريع قيد التنفيذ حالياً</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  يمكنك استخدام زر "مشروع جديد" بالأعلى لبدء إضافة مشروع ومتابعته ميدانياً.
                </p>
              </Card>
            )}
          </div>
        </>
      )}

      {/* ─── ADD PROGRESS REPORT DIALOG FORM ─────────────────────────────── */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-2xl w-[95vw] h-[90vh] max-h-[850px] p-0 flex flex-col overflow-hidden rounded-3xl border border-border shadow-2xl bg-card" dir="rtl">
          {/* Header */}
          <div className="bg-primary text-white p-5 flex items-center justify-between border-b border-primary/20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-white border border-white/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-white">
                  إضافة تقرير تقدم ميداني
                </DialogTitle>
                <p className="text-xs text-white/80 mt-0.5">
                  توثيق سير الأعمال ونسب الإنجاز الفعلي والمعوقات بالموقع
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsReportOpen(false)}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/10">
            {/* 1. نسبة العمل المنجز */}
            <div className="bg-card border-r-4 border-r-emerald-500 rounded-2xl p-5 shadow-xs space-y-4 border border-border/60">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs flex items-center justify-center border border-emerald-500/20">1</span>
                  <Label className="font-bold text-foreground text-sm">نسبة العمل المنجز الفعلي</Label>
                </div>
                <Badge className="bg-emerald-600 text-white font-mono text-sm px-3 py-1 rounded-full">
                  {progressVal}%
                </Badge>
              </div>
              
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progressVal}
                  onChange={e => setProgressVal(Number(e.target.value))}
                  className="flex-1 h-2 bg-muted border border-border rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
              
              {/* Preset quick buttons */}
              <div className="flex gap-2 justify-end">
                {[25, 50, 75, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setProgressVal(val)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                      progressVal === val
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : "bg-background text-muted-foreground hover:text-foreground border-border hover:bg-accent"
                    }`}
                  >
                    {val === 100 ? "مكتمل 100%" : `${val}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. تفاصيل العمل */}
            <div className="bg-card border-r-4 border-r-blue-500 rounded-2xl p-5 shadow-xs space-y-2 border border-border/60">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-6 w-6 rounded-full bg-blue-500/10 text-blue-600 font-bold text-xs flex items-center justify-center border border-blue-500/20">2</span>
                <Label className="font-bold text-foreground text-sm flex items-center gap-1">
                  تفاصيل العمل المنجز <span className="text-red-500">*</span>
                </Label>
              </div>
              <textarea
                value={completedWorks}
                onChange={e => setCompletedWorks(e.target.value)}
                rows={3}
                placeholder="ما هي الأعمال والفقرات التي تم إنجازها ميدانياً بدقة؟..."
                className="w-full border border-border rounded-xl p-3 bg-background text-foreground outline-none text-right text-xs leading-relaxed focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
              />
            </div>

            {/* 3. الأعمال القادمة */}
            <div className="bg-card border-r-4 border-r-indigo-500 rounded-2xl p-5 shadow-xs space-y-2 border border-border/60">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-6 w-6 rounded-full bg-indigo-500/10 text-indigo-600 font-bold text-xs flex items-center justify-center border border-indigo-500/20">3</span>
                <Label className="font-bold text-foreground text-sm">الأعمال المخططة للفترة القادمة</Label>
              </div>
              <textarea
                value={upcomingWorks}
                onChange={e => setUpcomingWorks(e.target.value)}
                rows={2}
                placeholder="الأعمال والفقرات المخطط تنفيذها خلال الفترة القادمة..."
                className="w-full border border-border rounded-xl p-3 bg-background text-foreground outline-none text-right text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* 4. المشاكل والمعوقات */}
            <div className="bg-card border-r-4 border-r-rose-500 rounded-2xl p-5 shadow-xs space-y-2 border border-border/60">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-6 w-6 rounded-full bg-rose-500/10 text-rose-600 font-bold text-xs flex items-center justify-center border border-rose-500/20">4</span>
                <Label className="font-bold text-foreground text-sm">المشاكل والمعوقات (إن وجدت)</Label>
              </div>
              <textarea
                value={obstaclesText}
                onChange={e => setObstaclesText(e.target.value)}
                rows={2}
                placeholder="أي عقبات فنية، إدارية تعيق تقدم العمل بالموقع..."
                className="w-full border border-border rounded-xl p-3 bg-background text-foreground outline-none text-right text-xs leading-relaxed focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
            </div>

            {/* 5. الملاحظات */}
            <div className="bg-card border-r-4 border-r-amber-500 rounded-2xl p-5 shadow-xs space-y-2 border border-border/60">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-6 w-6 rounded-full bg-amber-500/10 text-amber-600 font-bold text-xs flex items-center justify-center border border-amber-500/20">5</span>
                <Label className="font-bold text-foreground text-sm">الملاحظات والتوصيات الإضافية</Label>
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="أي توجيهات أو ملاحظات إضافية من المهندس المقيم..."
                className="w-full border border-border rounded-xl p-3 bg-background text-foreground outline-none text-right text-xs leading-relaxed focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
            </div>

            {/* 6. ارفاق صور */}
            <div className="bg-card border-r-4 border-r-violet-500 rounded-2xl p-5 shadow-xs space-y-3 border border-border/60">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-violet-500/10 text-violet-600 font-bold text-xs flex items-center justify-center border border-violet-500/20">6</span>
                  <Label className="font-bold text-foreground text-sm flex items-center gap-1.5">
                    <Image className="h-4 w-4 text-violet-500" /> إرفاق صور الموقع والعمل
                  </Label>
                </div>
                {uploadedPhotos.length > 0 && (
                  <Badge className="bg-violet-500 text-white text-[10px]">
                    {uploadedPhotos.length} صور مرفقة
                  </Badge>
                )}
              </div>

              <div className="border-2 border-dashed border-border hover:border-violet-500/50 rounded-xl p-5 flex flex-col items-center justify-center bg-muted/30 hover:bg-violet-500/5 transition-all cursor-pointer relative group">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files) return;
                    Array.from(files).forEach((file) => {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        if (typeof reader.result === "string") {
                          setUploadedPhotos((prev) => [...prev, reader.result as string]);
                        }
                      };
                      reader.readAsDataURL(file);
                    });
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <FileUp className="h-8 w-8 text-muted-foreground group-hover:text-violet-500 transition-colors mb-2" />
                <span className="text-xs font-bold text-foreground">انقر هنا أو اسحب الصور لإرفاقها</span>
                <span className="text-[10px] text-muted-foreground mt-1">يدعم جميع صيغ الصور (PNG, JPG, JPEG)</span>
              </div>

              {/* Preview thumbnails */}
              {uploadedPhotos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {uploadedPhotos.map((photo, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-border aspect-square">
                      <img src={photo} alt={`مرفق ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setUploadedPhotos((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer with action buttons */}
          <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-between gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReportOpen(false)}
              className="text-xs font-bold rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleSaveReport}
              disabled={saving}
              className="bg-primary hover:bg-primary/95 text-white gap-2 text-xs font-bold px-6 shadow-md rounded-xl"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  إرسال واعتماد التقرير
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── VIEW REPORT DETAILS DIALOG ──────────────────────────────────── */}
      <Dialog open={!!selectedReportDetails} onOpenChange={(open) => !open && setSelectedReportDetails(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto border-border shadow-2xl rounded-3xl p-6" dir="rtl">
          {selectedReportDetails && (
            <>
              <DialogHeader className="text-right border-b pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary text-white font-mono text-xs px-2.5 py-0.5">
                      تقرير رقم {selectedReportDetails.reportNumber}
                    </Badge>
                    <DialogTitle className="text-lg font-black text-foreground">
                      تفاصيل تقرير المتابعة الميدانية
                    </DialogTitle>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold">
                    نسبة الإنجاز: {selectedReportDetails.report.actualProgress}%
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground pt-1">
                  المشروع: <strong>{selectedReportDetails.projectName}</strong>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2 text-xs">
                {/* Metadata Summary */}
                <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-2xl border border-border/60">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">تاريخ التقرير</span>
                    <span className="font-bold text-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      {formatDateDMY(selectedReportDetails.report.date) || selectedReportDetails.report.date}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">المهندس المقيم</span>
                    <span className="font-bold text-foreground flex items-center gap-1 mt-0.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                      {selectedReportDetails.report.engineer}
                    </span>
                  </div>
                </div>

                {/* 1. Completed Works */}
                <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 space-y-1.5">
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    الأعمال المنجزة والتقدم الفعلي
                  </span>
                  <p className="text-foreground leading-relaxed font-medium">
                    {selectedReportDetails.report.completedWorks}
                  </p>
                </div>

                {/* 2. Upcoming Works */}
                {selectedReportDetails.report.upcomingWorks && (
                  <div className="bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-4 space-y-1.5">
                    <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      الأعمال المخططة للفترة القادمة
                    </span>
                    <p className="text-foreground leading-relaxed">
                      {selectedReportDetails.report.upcomingWorks}
                    </p>
                  </div>
                )}

                {/* 3. Obstacles */}
                {selectedReportDetails.report.obstaclesText && (
                  <div className="bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20 rounded-2xl p-4 space-y-1.5">
                    <span className="text-xs font-black text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      المشاكل والمعوقات الميدانية
                    </span>
                    <p className="text-foreground leading-relaxed">
                      {selectedReportDetails.report.obstaclesText}
                    </p>
                  </div>
                )}

                {/* 4. Labour & Equipment */}
                {(selectedReportDetails.report.labour || (selectedReportDetails.report.equipment && selectedReportDetails.report.equipment.length > 0)) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedReportDetails.report.labour && (
                      <div className="bg-muted/40 p-3 rounded-2xl border border-border/60 space-y-1">
                        <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
                          <Users className="h-3.5 w-3.5 text-primary" /> الكوادر العاملة بالموقع
                        </span>
                        <div className="flex gap-3 text-muted-foreground text-[11px] pt-1">
                          <span>عمال: <strong className="text-foreground">{selectedReportDetails.report.labour.workers}</strong></span>
                          <span>فنيون: <strong className="text-foreground">{selectedReportDetails.report.labour.techs}</strong></span>
                          <span>مهندسون: <strong className="text-foreground">{selectedReportDetails.report.labour.engineers}</strong></span>
                        </div>
                      </div>
                    )}
                    {selectedReportDetails.report.equipment && selectedReportDetails.report.equipment.length > 0 && (
                      <div className="bg-muted/40 p-3 rounded-2xl border border-border/60 space-y-1">
                        <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
                          <Wrench className="h-3.5 w-3.5 text-primary" /> الآليات والمعدات المستخدمة
                        </span>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {selectedReportDetails.report.equipment.map((eq, eqIdx) => (
                            <Badge key={eqIdx} variant="secondary" className="text-[10px]">
                              🚜 {eq}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Engineer Notes */}
                {selectedReportDetails.report.notes && (
                  <div className="bg-blue-500/5 dark:bg-blue-950/20 border border-blue-500/20 rounded-2xl p-4 space-y-1">
                    <span className="text-xs font-black text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      ملاحظات وتوصيات المهندس المقيم
                    </span>
                    <p className="text-foreground/90 italic leading-relaxed">
                      "{selectedReportDetails.report.notes}"
                    </p>
                  </div>
                )}

                {/* 6. Photos Gallery */}
                {selectedReportDetails.report.photos && selectedReportDetails.report.photos.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="font-bold text-foreground block text-xs flex items-center gap-1.5">
                      <Image className="h-4 w-4 text-primary" /> الصور الميدانية المرفقة ({selectedReportDetails.report.photos.length})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedReportDetails.report.photos.map((photo, pIdx) => (
                        <img
                          key={pIdx}
                          src={photo}
                          alt={`صورة ${pIdx + 1}`}
                          className="w-full h-28 object-cover rounded-xl border border-border shadow-xs hover:scale-105 transition-transform cursor-pointer"
                          onClick={() => {
                            const w = window.open();
                            if (w) w.document.write(`<body style="margin:0; background:#000; display:flex; justify-content:center; align-items:center; min-height:100vh;"><img src="${photo}" style="max-width:95vw; max-height:95vh; object-fit:contain; border-radius:8px;" /></body>`);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-4 flex justify-between items-center border-t border-border flex-wrap gap-2">
                <Button variant="outline" onClick={() => setSelectedReportDetails(null)} className="rounded-xl">
                  إغلاق
                </Button>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const proj = projects.find(p => p.id === selectedReportDetails.report.projectId) || { name: selectedReportDetails.projectName } as Project;
                      copySingleFieldReportText(selectedReportDetails.report, proj, selectedReportDetails.reportNumber);
                    }}
                    className="gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200 rounded-xl"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    نسخ النص
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const proj = projects.find(p => p.id === selectedReportDetails.report.projectId) || { name: selectedReportDetails.projectName } as Project;
                      printSingleFieldReport(selectedReportDetails.report, proj, selectedReportDetails.reportNumber);
                    }}
                    className="gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs rounded-xl"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    طباعة PDF (A4)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const proj = projects.find(p => p.id === selectedReportDetails.report.projectId) || { name: selectedReportDetails.projectName } as Project;
                      shareSingleFieldReportWhatsApp(selectedReportDetails.report, proj, selectedReportDetails.reportNumber);
                    }}
                    className="gap-1.5 text-xs font-black bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md cursor-pointer rounded-xl"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    مشاركة عبر واتساب
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteReport(selectedReportDetails.report.id)}
                    className="gap-1.5 text-xs font-bold shadow-xs cursor-pointer rounded-xl"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف التقرير
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>



      {/* ─── COMBINED REPORT MODAL DIALOG ─────────────────────────────────── */}
      <Dialog open={!!selectedCombinedReport} onOpenChange={(open) => !open && setSelectedCombinedReport(null)}>
        <DialogContent className="w-screen h-screen max-w-none max-h-none rounded-none overflow-y-auto p-6" dir="rtl">
          {selectedCombinedReport && (
            <>
              {/* Print area wrapper */}
              <div id="combined-report-print-area">
                {/* Official Header Block */}
                <div className="border-b-2 border-primary/40 pb-4 mb-3">
                  <div className="flex items-center justify-between gap-4">
                    {/* Right side */}
                    <div className="text-right space-y-0.5 text-xs text-foreground">
                      <div className="font-extrabold text-sm text-primary">مديرية ماء محافظة الأنبار</div>
                      <div className="text-muted-foreground font-semibold text-[10px]">دائرة المهندس المقيم</div>
                    </div>

                    {/* Center Logo */}
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <AnbarWaterLogo size="lg" />
                      <span className="text-[10px] font-black text-primary tracking-wider mt-1">مديرية ماء الأنبار</span>
                    </div>

                    {/* Left side */}
                    <div className="text-left space-y-0.5 text-xs text-muted-foreground font-mono" dir="ltr">
                      <div>Ref: WMS-REP-{selectedCombinedReport.project.id.slice(0, 8)}</div>
                      <div>Date: {new Date().toISOString().split("T")[0]}</div>
                      <div className="font-bold text-foreground">Status: Official Technical Report</div>
                    </div>
                  </div>
                </div>

                {/* Main Report Header Title Block */}
                <div className="bg-primary/10 border-2 border-primary/30 rounded-2xl p-4 text-center mb-4">
                  <DialogTitle className="text-lg font-black text-primary tracking-wide">
                    التقرير الفني التراكمي الشامل لتقدم العمل الميداني
                  </DialogTitle>
                  <DialogDescription className="text-xs font-bold text-muted-foreground mt-0.5">
                    مشروع: {selectedCombinedReport.project.name}
                  </DialogDescription>
                  <div className="flex items-center justify-center gap-4 mt-2 text-xs font-semibold text-foreground/80 flex-wrap">
                    <span>رقم العقد: <strong className="font-mono text-primary">{selectedCombinedReport.project.contractNo}</strong></span>
                    <span>•</span>
                    <span>الموقع: <strong>{selectedCombinedReport.project.location}</strong></span>
                    <span>•</span>
                    <span>الجهة المنفذة: <strong>{selectedCombinedReport.project.contractor}</strong></span>
                  </div>
                </div>

                {/* Document Body */}
                <div className="space-y-4">
                  {/* Overview bar */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/40 p-3 rounded-2xl border border-border text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">الجهة المنفذة (المقاول)</span>
                      <span className="font-extrabold text-foreground text-xs mt-0.5 block">{selectedCombinedReport.project.contractor || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">المهندس المقيم المسؤول</span>
                      <span className="font-extrabold text-foreground text-xs mt-0.5 block flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-primary" />
                        {(selectedCombinedReport.project as any).residentEngineerName || "م. أحمد الجبوري"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">عدد التقارير التراكمية</span>
                      <span className="font-black text-primary text-xs mt-0.5 block">{selectedCombinedReport.reports.length} تقارير ميدانية</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">التقدم الفعلي الحالي</span>
                      <span className="font-black text-emerald-600 text-xs mt-0.5 block">{selectedCombinedReport.project.actualProgress}%</span>
                    </div>
                  </div>

                  {/* Reports list */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-foreground flex items-center gap-2 border-b border-border/60 pb-2">
                      <Activity className="h-4 w-4 text-primary" />
                      سجل كافة التقارير الميدانية المتسلسلة
                    </h4>

                    <div className="space-y-4">
                      {selectedCombinedReport.reports.map((rep, idx) => {
                        const repNo = selectedCombinedReport.reports.length - idx;
                        return (
                          <div key={rep.id} className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-xs">
                            {/* Banner */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/50">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className="bg-primary text-white font-black text-xs px-2.5 py-0.5">
                                  تقرير رقم {repNo}
                                </Badge>
                                <span className="font-bold text-foreground flex items-center gap-1 text-xs">
                                  <Calendar className="h-3.5 w-3.5 text-primary" /> {formatDateDMY(rep.date) || rep.date}
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground text-xs">المهندس المقيم: <strong>{rep.engineer}</strong></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-xs font-bold bg-primary/10 text-primary border-primary/30">
                                  نسبة الإنجاز: {rep.actualProgress}%
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteReport(rep.id)}
                                  className="h-7 px-2 text-[11px] gap-1 font-bold rounded-lg cursor-pointer"
                                  title="حذف هذا التقرير الميداني"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> حذف
                                </Button>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 space-y-1">
                                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> الأعمال المنجزة والتقدم الفعلي:
                                </span>
                                <p className="text-foreground leading-relaxed">{rep.completedWorks}</p>
                              </div>

                              <div className="bg-blue-500/5 dark:bg-blue-950/20 border border-blue-500/20 rounded-xl p-3 space-y-1">
                                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                                  <FileText className="h-3.5 w-3.5 text-blue-600" /> الملاحظات والمعوقات الميدانية:
                                </span>
                                <p className="text-foreground leading-relaxed">
                                  {rep.obstaclesText || rep.notes || "لا توجد ملاحظات إضافية في هذا التقرير"}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Obstacles */}
                  {selectedCombinedReport.reports.some(r => r.obstaclesText || (r.obstacles && r.obstacles.length > 0)) && (
                    <div className="bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20 rounded-2xl p-4 space-y-2">
                      <span className="text-xs font-black text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                        سجل كافة المعوقات والمشاكل التراكمية بالمشروع
                      </span>
                      <div className="space-y-2 pr-2 text-xs">
                        {selectedCombinedReport.reports.map((r, rIdx) => {
                          if (!r.obstaclesText && (!r.obstacles || r.obstacles.length === 0)) return null;
                          const repNo = selectedCombinedReport.reports.length - rIdx;
                          return (
                            <div key={rIdx} className="bg-background/80 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50">
                              <span className="font-bold text-rose-900 dark:text-rose-200 block mb-1">
                                [تقرير رقم {repNo} — {formatDateDMY(r.date) || r.date}]:
                              </span>
                              <p className="text-rose-900 dark:text-rose-200">{r.obstaclesText || r.obstacles?.map(o => o.title).join(" ، ")}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Signatures */}
                  <div className="pt-8 mt-6 border-t-2 border-border/80 grid grid-cols-3 gap-6 text-center text-xs font-bold text-foreground">
                    <div className="space-y-8">
                      <span>دائرة المهندس المقيم</span>
                      <div className="text-muted-foreground font-semibold">
                        <div>{(selectedCombinedReport.project as any).residentEngineerName || "م. أحمد الجبوري"}</div>
                        <div className="text-[10px] text-muted-foreground mt-6">التوقيع: ..........................</div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <span>مسؤول قسم المتابعة الفنية</span>
                      <div className="text-muted-foreground font-semibold">
                        <div>م. رئيس المهندسين</div>
                        <div className="text-[10px] text-muted-foreground mt-6">التوقيع: ..........................</div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <span>مدير عام مديرية ماء الأنبار</span>
                      <div className="text-muted-foreground font-semibold">
                        <div>المصادقة الاعتمادية</div>
                        <div className="text-[10px] text-muted-foreground mt-6">التوقيع والختم الرسمي: ........</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 flex justify-between items-center border-t border-border">
                <Button variant="outline" onClick={() => setSelectedCombinedReport(null)} className="rounded-xl">
                  إغلاق التقرير المجمع
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-1.5 shadow-sm rounded-xl"
                    onClick={shareWhatsApp}
                  >
                    <MessageCircle className="h-4 w-4" /> مشاركة عبر واتساب
                  </Button>
                  <Button
                    className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs gap-1.5 shadow-sm rounded-xl"
                    onClick={savePDF}
                  >
                    <FileDown className="h-4 w-4" /> حفظ PDF
                  </Button>
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs gap-1.5 shadow-sm rounded-xl"
                    onClick={printReport}
                  >
                    <Printer className="h-4 w-4" /> طباعة التقرير التراكمي
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── COMPLETE PROJECT CONFIRMATION DIALOG ───────────────────────── */}
      <Dialog
        open={Boolean(projectToComplete)}
        onOpenChange={(open) => {
          if (!open) {
            setProjectToComplete(null);
            setCompleteNotes("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[540px] text-right rounded-3xl border border-emerald-200 p-0 overflow-hidden shadow-2xl bg-white" dir="rtl">
          <DialogHeader className="p-6 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100 border-b border-emerald-200 text-right">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-emerald-950">
                  اعتماد إنجاز المشروع بالكامل (100%)
                </DialogTitle>
                <DialogDescription className="text-xs text-emerald-700 font-bold mt-0.5">
                  {projectToComplete?.name} ({projectToComplete?.contractNo})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4 text-right text-xs">
            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 leading-relaxed font-medium">
              عند تأكيد الإنجاز، سيتم تعيين نسبة التقدم الفعلي إلى <strong>100%</strong> ونقل المشروع تلقائياً إلى صفحة <strong>"المشاريع المنفذة"</strong> والظهور بشارة الإنجاز 🏆 في <strong>"خرائط الأنبار GIS"</strong>.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  تاريخ الاستلام الأولي *
                </Label>
                <Input
                  type="date"
                  value={completeHandoverDate}
                  onChange={(e) => setCompleteHandoverDate(e.target.value)}
                  className="rounded-xl font-bold text-xs border-slate-300"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">
                  الشركة المنفذة (المقاول)
                </Label>
                <Input
                  disabled
                  value={projectToComplete?.contractor || "—"}
                  className="rounded-xl font-bold text-xs bg-slate-100 border-slate-200"
                />
              </div>
            </div>

            {/* Handover Committee */}
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <Label className="text-xs font-bold text-slate-900 block">
                أعضاء لجنة الاستلام الأولي (اختياري)
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  placeholder="عضو اللجنة 1"
                  value={completeCommittee1}
                  onChange={(e) => setCompleteCommittee1(e.target.value)}
                  className="rounded-xl text-xs bg-white"
                />
                <Input
                  placeholder="عضو اللجنة 2"
                  value={completeCommittee2}
                  onChange={(e) => setCompleteCommittee2(e.target.value)}
                  className="rounded-xl text-xs bg-white"
                />
                <Input
                  placeholder="عضو اللجنة 3"
                  value={completeCommittee3}
                  onChange={(e) => setCompleteCommittee3(e.target.value)}
                  className="rounded-xl text-xs bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">
                ملاحظات أو توصيات ختامية عند الإنجاز
              </Label>
              <Input
                placeholder="أدخل أي ملاحظات حول تشغيل المشروع أو استلامه..."
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                className="rounded-xl text-xs border-slate-300"
              />
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5" dir="rtl">
            <Button
              variant="outline"
              onClick={() => {
                setProjectToComplete(null);
                setCompleteNotes("");
              }}
              className="rounded-xl text-xs font-bold px-4"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleConfirmComplete}
              className="rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-md shadow-emerald-600/30 px-6 py-2.5"
            >
              <Trophy className="h-4 w-4" />
              تأكيد إنجاز المشروع ونقله
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Project Wizard Dialog */}
      <AddProjectWizard
        open={isAddWizardOpen}
        onClose={() => setIsAddWizardOpen(false)}
        onSave={handleWizardSave}
      />

      {/* Official Project Share & Print Dialog */}
      <ProjectShareDialog
        project={projectToShare}
        open={!!projectToShare}
        onClose={() => setProjectToShare(null)}
      />

      {/* ─── FULLSCREEN LIGHTBOX PHOTO VIEWER ─────────────────────────────── */}
      {activePhotoViewer && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-fadeIn"
          dir="rtl"
          onClick={() => setActivePhotoViewer(null)}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between text-white z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/20">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-black text-white line-clamp-1">
                  {activePhotoViewer.title || "معاينة الصورة الميدانية"}
                </h4>
                <p className="text-xs text-white/70 font-mono">
                  صورة {activePhotoViewer.activeIndex + 1} من {activePhotoViewer.photos.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={activePhotoViewer.photos[activePhotoViewer.activeIndex]}
                download={`photo_${activePhotoViewer.activeIndex + 1}.jpg`}
                target="_blank"
                rel="noreferrer"
                className="h-10 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 text-xs font-bold border border-white/20 transition-colors"
                title="تنزيل الصورة"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">تنزيل الصورة</span>
              </a>
              <button
                type="button"
                onClick={() => setActivePhotoViewer(null)}
                className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/20 transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Image Area with Navigation Buttons */}
          <div className="flex-1 relative flex items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
            {activePhotoViewer.photos.length > 1 && (
              <button
                type="button"
                onClick={() => setActivePhotoViewer((prev) => prev ? {
                  ...prev,
                  activeIndex: (prev.activeIndex - 1 + prev.photos.length) % prev.photos.length,
                } : null)}
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all z-20 cursor-pointer shadow-lg hover:scale-105"
                title="الصورة السابقة"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            <img
              src={activePhotoViewer.photos[activePhotoViewer.activeIndex]}
              alt={`صورة ${activePhotoViewer.activeIndex + 1}`}
              className="max-w-full max-h-[75vh] object-contain rounded-3xl shadow-2xl border border-white/10 select-none animate-slideUp"
            />

            {activePhotoViewer.photos.length > 1 && (
              <button
                type="button"
                onClick={() => setActivePhotoViewer((prev) => prev ? {
                  ...prev,
                  activeIndex: (prev.activeIndex + 1) % prev.photos.length,
                } : null)}
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all z-20 cursor-pointer shadow-lg hover:scale-105"
                title="الصورة التالية"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip (if multiple) */}
          {activePhotoViewer.photos.length > 1 && (
            <div
              className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {activePhotoViewer.photos.map((ph, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActivePhotoViewer((prev) => prev ? { ...prev, activeIndex: idx } : null)}
                  className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    activePhotoViewer.activeIndex === idx
                      ? "border-primary scale-110 shadow-lg shadow-primary/40 ring-2 ring-primary/50"
                      : "border-white/30 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={ph} alt={`مصغرة ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── CONFIRM PROJECT DELETION DIALOG ─────────────────────────────── */}
      <Dialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent className="sm:max-w-md text-right border-border shadow-2xl rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-black text-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              تأكيد حذف المشروع
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm font-semibold text-foreground/80 leading-relaxed">
              هل أنت تأكد من رغبتك في حذف هذا المشروع؟ لا يمكن التراجع عن هذا الإجراء وسيتم مسح كافة البيانات والتقارير الميدانية المرتبطة به.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4 flex items-center justify-end">
            <Button
              variant="destructive"
              onClick={executeDeleteProject}
              className="gap-2 font-bold text-xs rounded-xl cursor-pointer"
            >
              <Trash2 className="h-4 w-4" /> نعم، احذف المشروع
            </Button>
            <Button
              variant="outline"
              onClick={() => setProjectToDelete(null)}
              className="font-bold text-xs rounded-xl cursor-pointer"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── CONFIRM FIELD REPORT DELETION DIALOG ─────────────────────────── */}
      <Dialog open={!!reportToDelete} onOpenChange={(open) => !open && setReportToDelete(null)}>
        <DialogContent className="sm:max-w-md text-right border-border shadow-2xl rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-black text-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              تأكيد حذف تقرير المتابعة الميدانية
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm font-semibold text-foreground/80 leading-relaxed">
              هل أنت تأكد من رغبتك في حذف هذا التقرير الميداني؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4 flex items-center justify-end">
            <Button
              variant="destructive"
              onClick={executeDeleteReport}
              className="gap-2 font-bold text-xs rounded-xl cursor-pointer"
            >
              <Trash2 className="h-4 w-4" /> نعم، احذف التقرير
            </Button>
            <Button
              variant="outline"
              onClick={() => setReportToDelete(null)}
              className="font-bold text-xs rounded-xl cursor-pointer"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embedded OpenStreetMap Keyframe Animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
        .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}
