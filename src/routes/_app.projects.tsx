import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { ANBAR_WATER_LOGO_BASE64 } from "@/assets/anbar-water-logo-data";
import { AddProjectWizard, formatDateDMY, parseDurationDays, calcDateAddDaysISO, ChangeOrdersManager, CoordinateInputs } from "@/components/AddProjectWizard";
import { getProjectsFromSupabase, saveProjectToSupabase, deleteProjectFromSupabase, getProgressReportsFromSupabase, deleteProgressReportFromSupabase } from "@/lib/supabase-db";
import { OngoingProjectsPage, printSingleFieldReport, shareSingleFieldReportWhatsApp, copySingleFieldReportText, type ProgressReport } from "./_app.projects-ongoing";
import { logActivity } from "@/lib/activity-logger";
import { parseSingleCoordinate, parseCoordinatesInput } from "@/lib/utils";

import {
  Filter,
  Plus,
  Search,
  Calendar,
  Building,
  MapPin,
  DollarSign,
  Clock,
  Users,
  FileText,
  AlertTriangle,
  FileCheck,
  Edit,
  Save,
  Trash2,
  Construction,
  Briefcase,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Wrench,
  FolderKanban,
  Eye,
  Activity,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Share2,
  Copy,
  Check,
  Printer,
  Download,
  MessageSquare,
  ExternalLink,
  ImageIcon,
  Camera,
  Sparkles,
  Layers,
  X,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { STATUS_LABEL, type Project, type ProjectStatus, type ChangeOrderItem, getStoredProjects, saveStoredProjects, formatAmountWithCurrency, getCurrencySymbol } from "@/lib/mock-data";
import { getSystemSettings, syncSystemSettingsWithSupabase } from "@/lib/system-settings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/projects")({
  component: () => <ProjectsPage defaultStatus="all" />,
});

const statusBadge: Record<ProjectStatus, string> = {
  ongoing: "bg-info/15 text-info border-info/30",
  delayed: "bg-warning/15 text-warning border-warning/30",
  stopped: "bg-destructive/15 text-destructive border-destructive/30",
  completed: "bg-success/15 text-success border-success/30",
};

const projectTypeLabel: Record<string, string> = {
  investment: "استثماري",
  non_investment: "غير استثماري",
  regional_dev: "استثماري",
  trust: "غير استثماري",
  operational: "غير استثماري",
  water_tank: "استثماري",
  well: "غير استثماري",
  pipeline: "استثماري",
  treatment: "استثماري",
  building: "غير استثماري",
};

// ─── Premium Form Components ───────────────────────────────────────────────
const fieldBase: React.CSSProperties = {
  width: '100%',
  borderRadius: '14px',
  border: '2px solid #e2e8f0',
  padding: '13px 16px',
  fontSize: '14px',
  fontWeight: 500,
  color: 'hsl(var(--foreground))',
  background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
  minHeight: '48px',
  textAlign: 'right' as const,
};

function PremiumField({
  id, label, required, muted, ...props
}: { id: string; label: string; required?: boolean; muted?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
      {/* Label */}
      <label htmlFor={id} style={{
        fontSize: '12px',
        fontWeight: 700,
        color: 'hsl(var(--primary))',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        userSelect: 'none' as const,
      }}>
        <span style={{
          display: 'inline-block',
          width: '4px', height: '14px',
          borderRadius: '3px',
          background: 'linear-gradient(180deg, hsl(var(--primary)) 0%, color-mix(in srgb, hsl(var(--primary)) 60%, #7c3aed) 100%)',
          flexShrink: 0,
        }} />
        {label}
        {required && <span style={{ color: '#ef4444', fontWeight: 900, fontSize: '14px', lineHeight: 1 }}>*</span>}
      </label>
      {/* Input */}
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          dir="rtl"
          {...props}
          style={{
            ...fieldBase,
            background: muted
              ? 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
            opacity: muted ? 0.85 : 1,
            ...props.style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'hsl(var(--primary))';
            e.currentTarget.style.boxShadow = '0 0 0 4px color-mix(in srgb, hsl(var(--primary)) 12%, transparent), 0 2px 8px rgba(0,0,0,0.08)';
            e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, color-mix(in srgb, hsl(var(--primary)) 4%, #f8faff) 100%)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)';
            e.currentTarget.style.background = muted
              ? 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)';
            e.currentTarget.style.transform = 'translateY(0)';
            props.onBlur?.(e);
          }}
        />
      </div>
    </div>
  );
}

function PremiumTextarea({
  id, label, rows, placeholder, value, onChange,
}: { id: string; label: string; rows?: number; placeholder?: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
      {/* Label */}
      <label htmlFor={id} style={{
        fontSize: '12px',
        fontWeight: 700,
        color: 'hsl(var(--primary))',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        userSelect: 'none' as const,
      }}>
        <span style={{
          display: 'inline-block',
          width: '4px', height: '14px',
          borderRadius: '3px',
          background: 'linear-gradient(180deg, hsl(var(--primary)) 0%, color-mix(in srgb, hsl(var(--primary)) 60%, #7c3aed) 100%)',
          flexShrink: 0,
        }} />
        {label}
      </label>
      {/* Textarea */}
      <textarea
        id={id}
        dir="rtl"
        rows={rows || 3}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{
          ...fieldBase,
          minHeight: 'unset',
          resize: 'vertical',
          lineHeight: '1.65',
          fontFamily: 'inherit',
          padding: '13px 16px',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'hsl(var(--primary))';
          e.currentTarget.style.boxShadow = '0 0 0 4px color-mix(in srgb, hsl(var(--primary)) 12%, transparent), 0 2px 8px rgba(0,0,0,0.08)';
          e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, color-mix(in srgb, hsl(var(--primary)) 4%, #f8faff) 100%)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#e2e8f0';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)';
          e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)';
        }}
      />
    </div>
  );
}
// ───────────────────────────────────────────────────────────────────────────
// 📤 Project Share Dialog (WhatsApp Image & Official Document Card)
// ───────────────────────────────────────────────────────────────────────────

// Canvas Round Rect Polyfill Helper
function drawCanvasRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function renderProjectSheetToCanvas(project: Project): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const width = 1200;
  const coList = Array.isArray(project.changeOrdersList) ? project.changeOrdersList : [];
  const initComm = Array.isArray(project.initialHandoverCommittee) ? project.initialHandoverCommittee.filter(Boolean) : [];
  const finalComm = Array.isArray(project.finalHandoverCommittee) ? project.finalHandoverCommittee.filter(Boolean) : [];

  const isCompleted = project.status === "completed" || Number(project.actualProgress || 0) >= 100;
  const statusLabel = isCompleted
    ? "منجز بالكامل (100%)"
    : project.status === "delayed"
    ? `متلكئ (${project.actualProgress || 0}%)`
    : project.status === "stopped"
    ? `متوقف (${project.actualProgress || 0}%)`
    : `مستمر (${project.actualProgress || 0}%)`;

  const statusEn = isCompleted
    ? "COMPLETED (100%)"
    : project.status === "delayed"
    ? `DELAYED (${project.actualProgress || 0}%)`
    : project.status === "stopped"
    ? `STOPPED (${project.actualProgress || 0}%)`
    : `ONGOING (${project.actualProgress || 0}%)`;

  const docTitle = isCompleted
    ? "استمارة توثيق وإنجاز مشروع منفذ"
    : "استمارة متابعة وتوثيق مشروع";

  const hasNotes = Boolean(project.notes || project.problemsObstaclesSolutions || project.residentEngineerName);

  // Dynamic Height calculation
  let totalHeight = 1050 + 230 + 155 + 155 + 110 + 60; // base ~1760
  if (coList.length > 0) totalHeight += 60 + (coList.length * 36);
  if (initComm.length > 0) totalHeight += 95;
  if (finalComm.length > 0) totalHeight += 95;
  if (hasNotes) totalHeight += 85;

  canvas.width = width;
  canvas.height = totalHeight;

  // Background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, totalHeight);

  // Outer Border
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(18, 18, width - 36, totalHeight - 36);

  const pad = 50;
  const contentWidth = width - (pad * 2);
  let y = 55;

  // Load Logo
  const logoImg = new Image();
  logoImg.src = ANBAR_WATER_LOGO_BASE64;
  await new Promise((res) => {
    if (logoImg.complete) res(null);
    else {
      logoImg.onload = () => res(null);
      logoImg.onerror = () => res(null);
    }
  });

  // Top Header Right
  ctx.textAlign = "right";
  ctx.fillStyle = "#1E3A8A";
  ctx.font = "bold 23px 'Cairo', Tahoma, sans-serif";
  ctx.fillText("مديرية ماء محافظة الأنبار", width - pad, y + 25);

  // Center Logo
  const logoSize = 85;
  if (logoImg.width) {
    ctx.drawImage(logoImg, (width - logoSize) / 2, y - 5, logoSize, logoSize);
  }

  // Top Header Left
  ctx.textAlign = "left";
  ctx.fillStyle = "#334155";
  ctx.font = "bold 16px 'Cairo', Tahoma, sans-serif";
  ctx.fillText(`Ref: ${project.contractNo || "ANB-PROJ"}`, pad, y + 25);
  ctx.font = "bold 14.5px 'Cairo', Tahoma, sans-serif";
  ctx.fillText(`Date: ${new Date().toISOString().split("T")[0]}`, pad, y + 50);
  ctx.fillStyle = isCompleted ? "#15803D" : project.status === "delayed" ? "#B91C1C" : "#0284C7";
  ctx.fillText(`Status: ${statusEn}`, pad, y + 74);

  // Header Divider
  y += 98;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(width - pad, y);
  ctx.strokeStyle = "#1E3A8A";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Title Banner
  y += 18;
  ctx.fillStyle = isCompleted ? "#F0FDF4" : "#EFF6FF";
  ctx.strokeStyle = isCompleted ? "#86EFAC" : "#93C5FD";
  ctx.lineWidth = 2;
  drawCanvasRoundRect(ctx, pad, y, contentWidth, 75, 12);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = isCompleted ? "#14532D" : "#1E3A8A";
  ctx.font = "bold 22px 'Cairo', Tahoma, sans-serif";
  ctx.fillText(docTitle, width / 2, y + 33);

  ctx.fillStyle = isCompleted ? "#166534" : "#0369A1";
  ctx.font = "bold 17px 'Cairo', Tahoma, sans-serif";
  ctx.fillText(project.name, width / 2, y + 60);

  y += 95;

  const drawSectionTitle = (title: string) => {
    ctx.textAlign = "right";
    ctx.fillStyle = "#1E3A8A";
    ctx.font = "bold 17px 'Cairo', Tahoma, sans-serif";
    ctx.fillText(title, width - pad, y + 16);
    y += 24;
  };

  const draw4ColTable = (rows: [string, string, string, string][]) => {
    const colW1 = contentWidth * 0.22;
    const colW2 = contentWidth * 0.28;
    const colW3 = contentWidth * 0.22;
    const colW4 = contentWidth * 0.28;
    const rowH = 38;

    rows.forEach((r, rIdx) => {
      const rowY = y + (rIdx * rowH);

      // Th 1
      ctx.fillStyle = "#F8FAFC";
      ctx.fillRect(width - pad - colW1, rowY, colW1, rowH);
      ctx.strokeStyle = "#CBD5E1";
      ctx.lineWidth = 1;
      ctx.strokeRect(width - pad - colW1, rowY, colW1, rowH);
      ctx.fillStyle = "#1E293B";
      ctx.font = "bold 14px 'Cairo', Tahoma, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(r[0], width - pad - 12, rowY + 24);

      // Td 1
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(width - pad - colW1 - colW2, rowY, colW2, rowH);
      ctx.strokeRect(width - pad - colW1 - colW2, rowY, colW2, rowH);
      ctx.fillStyle = "#0F172A";
      ctx.font = "600 14px 'Cairo', Tahoma, sans-serif";
      ctx.fillText(r[1] || "—", width - pad - colW1 - 12, rowY + 24);

      if (r[2] !== undefined && r[2] !== "") {
        // Th 2
        ctx.fillStyle = "#F8FAFC";
        ctx.fillRect(width - pad - colW1 - colW2 - colW3, rowY, colW3, rowH);
        ctx.strokeRect(width - pad - colW1 - colW2 - colW3, rowY, colW3, rowH);
        ctx.fillStyle = "#1E293B";
        ctx.font = "bold 14px 'Cairo', Tahoma, sans-serif";
        ctx.fillText(r[2], width - pad - colW1 - colW2 - 12, rowY + 24);

        // Td 2
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(pad, rowY, colW4, rowH);
        ctx.strokeRect(pad, rowY, colW4, rowH);
        ctx.fillStyle = "#0F172A";
        ctx.font = "600 14px 'Cairo', Tahoma, sans-serif";
        ctx.fillText(r[3] || "—", pad + colW4 - 12, rowY + 24);
      } else {
        // Single field spanning the remaining width
        const fullTdWidth = colW2 + colW3 + colW4;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(pad, rowY, fullTdWidth, rowH);
        ctx.strokeRect(pad, rowY, fullTdWidth, rowH);
        ctx.fillStyle = "#0F172A";
        ctx.font = "600 14px 'Cairo', Tahoma, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(r[1] || "—", width - pad - colW1 - 12, rowY + 24);
      }
    });

    y += (rows.length * rowH) + 16;
  };

  // 1. Basic Table (5 full rows)
  drawSectionTitle("البيانات الأساسية والتعاقدية");
  draw4ColTable([
    ["اسم المشروع", project.name, "موقع المشروع", project.location || "محافظة الأنبار"],
    ["القضاء والناحية", `${project.district || "الأنبار"}${project.subDistrict ? ` / ${project.subDistrict}` : ""}`, "الشركة / المقاول المنفذ", project.contractor || "—"],
    ["نوع المشروع", project.type === "investment" ? "استثماري" : project.type === "non_investment" ? "تشغيلي / غير استثماري" : (project.type || "مشروع ماء"), "طريقة الإحالة", project.referralMethod || "مناقصة عامة"],
    ["رقم وتاريخ الإحالة", `${project.referralNo || "—"}${project.referralDate ? ` (${formatDateDMY(project.referralDate)})` : ""}`, "رقم وتاريخ العقد", `${project.contractNo || "—"}${project.contractDate ? ` (${formatDateDMY(project.contractDate)})` : ""}`],
    ["الجهة الممولة", project.fundingSource || "خطة المحافظة", "حالة المشروع ونسبة الإنجاز", statusLabel],
  ]);

  // 2. Financial Table
  const contractValStr = Number(project.contractValue || 0).toLocaleString("en-US") + " د.ع";
  const coAmountStr = Number(project.changeOrdersTotalAmount || 0).toLocaleString("en-US") + " د.ع";
  const workCostStr = Number(project.workCost || Number(project.contractValue || 0) + Number(project.changeOrdersTotalAmount || 0)).toLocaleString("en-US") + " د.ع";

  drawSectionTitle("التكاليف المالية وأوامر الغيار");
  draw4ColTable([
    ["مبلغ العقد الأساسي", contractValStr, "عدد أوامر الغيار", `${coList.length} أمر`],
    ["مجموع أوامر الغيار", coAmountStr, "كلفة العمل الإجمالية", workCostStr],
  ]);

  // 3. Change Orders Table (if any)
  if (coList.length > 0) {
    drawSectionTitle(`جدول أوامر الغيار التفصيلية (${coList.length} أمر)`);
    const colW1 = contentWidth * 0.08;
    const colW2 = contentWidth * 0.32;
    const colW3 = contentWidth * 0.20;
    const colW4 = contentWidth * 0.25;
    const colW5 = contentWidth * 0.15;
    const headerH = 34;
    const rowH = 34;

    // Table Header
    ctx.fillStyle = "#F1F5F9";
    ctx.fillRect(pad, y, contentWidth, headerH);
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, y, contentWidth, headerH);
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 13px 'Cairo', Tahoma, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("#", width - pad - (colW1 / 2), y + 22);
    ctx.textAlign = "right";
    ctx.fillText("رقم ومسمى أمر الغيار", width - pad - colW1 - 10, y + 22);
    ctx.fillText("تاريخ أمر الغيار", width - pad - colW1 - colW2 - 10, y + 22);
    ctx.fillText("مبلغ أمر الغيار (د.ع)", width - pad - colW1 - colW2 - colW3 - 10, y + 22);
    ctx.fillText("ملاحظات", pad + colW5 - 10, y + 22);
    y += headerH;

    coList.forEach((co, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? "#FFFFFF" : "#FAF5FF";
      ctx.fillRect(pad, y, contentWidth, rowH);
      ctx.strokeRect(pad, y, contentWidth, rowH);

      ctx.textAlign = "center";
      ctx.fillStyle = "#64748B";
      ctx.font = "bold 13px 'Cairo', Tahoma, sans-serif";
      ctx.fillText(`${idx + 1}`, width - pad - (colW1 / 2), y + 22);

      ctx.textAlign = "right";
      ctx.fillStyle = "#5B21B6";
      ctx.font = "bold 13px 'Cairo', Tahoma, sans-serif";
      ctx.fillText(co.orderNo || `أمر غيار رقم ${idx + 1}`, width - pad - colW1 - 10, y + 22);

      ctx.fillStyle = "#334155";
      ctx.font = "600 13px 'Cairo', Tahoma, sans-serif";
      ctx.fillText(formatDateDMY(co.orderDate) || "—", width - pad - colW1 - colW2 - 10, y + 22);

      ctx.fillStyle = "#15803D";
      ctx.font = "bold 14px monospace";
      ctx.fillText(`${Number(co.amount || 0).toLocaleString("en-US")} د.ع`, width - pad - colW1 - colW2 - colW3 - 10, y + 22);

      ctx.fillStyle = "#64748B";
      ctx.font = "12px 'Cairo', Tahoma, sans-serif";
      ctx.fillText(co.notes || "—", pad + colW5 - 10, y + 22);

      y += rowH;
    });
    y += 16;
  }

  // 4. Timelines Table
  drawSectionTitle("التوقيتات الزمنية ومراحل الاستلام");
  draw4ColTable([
    ["تاريخ المباشرة", formatDateDMY(project.startDate || project.actualStartDate) || "—", "مدة العقد الأصلية", `${project.durationDays || 0} يوم`],
    ["المدد الإضافية", project.additionalDuration || "لا يوجد", "تاريخ الإنجاز التعاقدي", formatDateDMY(project.contractualCompletionDate || project.plannedEndDate) || "—"],
    ["تاريخ الاستلام الأولي", formatDateDMY(project.initialHandoverDate) || "—", "تاريخ الاستلام النهائي", formatDateDMY(project.finalHandoverDate) || "—"],
  ]);

  // 5. Committees
  const drawCommitteeBox = (title: string, members: string[]) => {
    ctx.fillStyle = "#F8FAFC";
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    drawCanvasRoundRect(ctx, pad, y, contentWidth, 75, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "right";
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 13px 'Cairo', Tahoma, sans-serif";
    ctx.fillText(title, width - pad - 12, y + 22);

    const memberW = (contentWidth - 30) / Math.min(members.length, 3);
    members.slice(0, 3).forEach((m, mIdx) => {
      const mX = width - pad - 15 - ((mIdx + 1) * memberW);
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#CBD5E1";
      drawCanvasRoundRect(ctx, mX, y + 32, memberW - 10, 32, 6);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = "#1E40AF";
      ctx.font = "bold 12px 'Cairo', Tahoma, sans-serif";
      ctx.fillText(mIdx === 0 ? `(رئيس اللجنة) ${m}` : m, mX + ((memberW - 10) / 2), y + 53);
    });

    y += 85;
  };

  if (initComm.length > 0) drawCommitteeBox("لجنة الاستلام الأولي للمشروع:", initComm);
  if (finalComm.length > 0) drawCommitteeBox("لجنة الاستلام النهائي للمشروع وإبراء الذمة:", finalComm);

  // 6. Resident Engineer & Notes if any
  if (hasNotes || project.residentEngineerName) {
    ctx.fillStyle = "#F8FAFC";
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 1;
    drawCanvasRoundRect(ctx, pad, y, contentWidth, 68, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "right";
    ctx.fillStyle = "#1E3A8A";
    ctx.font = "bold 13px 'Cairo', Tahoma, sans-serif";
    ctx.fillText("إشراف المهندس المقيم والملاحظات:", width - pad - 12, y + 22);

    ctx.fillStyle = "#334155";
    ctx.font = "12.5px 'Cairo', Tahoma, sans-serif";
    const noteContent = [
      project.residentEngineerName ? `المهندس المقيم: ${project.residentEngineerName}${project.residentEngineerPhone ? ` (${project.residentEngineerPhone})` : ""}` : "",
      project.notes ? `الملاحظات: ${project.notes}` : "",
      project.problemsObstaclesSolutions ? `المعوقات: ${project.problemsObstaclesSolutions}` : ""
    ].filter(Boolean).join("  |  ");
    ctx.fillText(noteContent || "لا توجد ملاحظات إضافية مسجلة", width - pad - 12, y + 48);

    y += 80;
  }

  // 7. Signatures
  y += 15;
  const sigW = contentWidth / 2;
  const sigs = [
    { title: "المهندس المقيم", role: project.residentEngineerName || "المهندس المشرف على المشروع" },
  ];

  sigs.forEach((s, idx) => {
    const sX = width - pad - ((idx + 1) * sigW) + 20;
    const boxW = sigW - 40;

    ctx.beginPath();
    ctx.moveTo(sX, y);
    ctx.lineTo(sX + boxW, y);
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 14px 'Cairo', Tahoma, sans-serif";
    ctx.fillText(s.title, sX + (boxW / 2), y + 20);

    ctx.fillStyle = "#64748B";
    ctx.font = "12px 'Cairo', Tahoma, sans-serif";
    ctx.fillText(s.role, sX + (boxW / 2), y + 38);
  });

  // 8. Footer
  y += 65;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(width - pad, y);
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = "right";
  ctx.fillStyle = "#94A3B8";
  ctx.font = "11px 'Cairo', Tahoma, sans-serif";
  ctx.fillText("وثيقة رسمية صادرة إلكترونياً من منصة متابعة مشاريع مديرية ماء الأنبار", width - pad, y + 18);

  ctx.textAlign = "left";
  ctx.fillText(`تاريخ الإصدار: ${new Date().toISOString().split("T")[0]}`, pad, y + 18);

  return canvas;
}

export function getProjectFieldReports(projectId: string): ProgressReport[] {
  if (typeof window === "undefined" || !projectId) return [];
  try {
    const stored = localStorage.getItem("wms.progress_reports");
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r) => r && r.id && r.projectId === projectId);
  } catch {
    return [];
  }
}

export function generateProjectWhatsAppText(project: Project, includeFieldReports: boolean = true): string {
  const isComp = project.status === "completed" || Number(project.actualProgress || 0) >= 100;
  const statusStr = isComp
    ? "منجز بالكامل (100%)"
    : project.status === "delayed"
    ? `متلكئ (${project.actualProgress || 0}%)`
    : project.status === "stopped"
    ? `متوقف (${project.actualProgress || 0}%)`
    : `مستمر (${project.actualProgress || 0}%)`;

  const contractVal = Number(project.contractValue || 0).toLocaleString("en-US");
  const coTotal = Number(project.changeOrdersTotalAmount || 0).toLocaleString("en-US");
  const workCost = Number(
    project.workCost ||
      Number(project.contractValue || 0) + Number(project.changeOrdersTotalAmount || 0)
  ).toLocaleString("en-US");
  const coList = Array.isArray(project.changeOrdersList) ? project.changeOrdersList : [];

  const lines = [
    `🏛️ *جمهورية العراق - محافظة الأنبار*`,
    `💧 *مديرية ماء محافظة الأنبار*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📋 *${isComp ? "استمارة توثيق وإنجاز مشروع منفذ" : "استمارة متابعة وتوثيق مشروع"}*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🏗️ *اسم المشروع:* ${project.name}`,
    `📍 *الموقع:* ${project.location || "محافظة الأنبار"}${project.district ? ` (${project.district})` : ""}`,
    `🏢 *الشركة / المقاول المنفذ:* ${project.contractor || "—"}`,
    `🏷️ *نوع المشروع:* ${project.type === "investment" ? "استثماري" : project.type === "non_investment" ? "تشغيلي / غير استثماري" : (project.type || "مشروع ماء")}`,
    `📄 *طريقة الإحالة:* ${project.referralMethod || "مناقصة عامة"}`,
    ...(project.referralNo ? [`📑 *رقم الإحالة:* ${project.referralNo}`] : []),
    ...(project.referralDate ? [`📅 *تاريخ الإحالة:* ${formatDateDMY(project.referralDate)}`] : []),
    `🔢 *رقم العقد:* ${project.contractNo || "—"}`,
    `📅 *تاريخ العقد:* ${formatDateDMY(project.contractDate) || "—"}`,
    `🏛️ *الجهة الممولة:* ${project.fundingSource || "خطة المحافظة"}`,
    `📊 *حالة المشروع:* ${statusStr}`,
    `📈 *نسبة الإنجاز الفعلي:* ${project.actualProgress || 0}% (المخطط: ${project.plannedProgress || 0}%)`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `💰 *البيانات المالية:*`,
    `• مبلغ العقد الأساسي: ${contractVal} د.ع`,
    `• أوامر الغيار: ${coList.length} أمر (المجموع: ${coTotal} د.ع)`,
    `• كلفة العمل الإجمالية: ${workCost} د.ع`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `⏱️ *التوقيتات الزمنية:*`,
    `• تاريخ المباشرة: ${formatDateDMY(project.startDate || project.actualStartDate) || "—"}`,
    `• مدة العقد الأصلية: ${project.durationDays || 0} يوم`,
  ];

  if (project.additionalDuration) {
    lines.push(`• المدد الإضافية: ${project.additionalDuration}`);
  }
  lines.push(`• تاريخ الإنجاز التعاقدي: ${formatDateDMY(project.contractualCompletionDate || project.plannedEndDate) || "—"}`);
  if (project.initialHandoverOrderNo) {
    lines.push(`• رقم الأمر الإداري للاستلام الأولي: ${project.initialHandoverOrderNo}`);
  }
  if (project.initialHandoverOrderDate) {
    lines.push(`• تاريخ الأمر الإداري للاستلام الأولي: ${formatDateDMY(project.initialHandoverOrderDate)}`);
  }
  if (project.initialHandoverDate) {
    lines.push(`• تاريخ الاستلام الأولي: ${formatDateDMY(project.initialHandoverDate)}`);
  }
  if (project.finalHandoverOrderNo) {
    lines.push(`• رقم الأمر الإداري للاستلام النهائي: ${project.finalHandoverOrderNo}`);
  }
  if (project.finalHandoverOrderDate) {
    lines.push(`• تاريخ الأمر الإداري للاستلام النهائي: ${formatDateDMY(project.finalHandoverOrderDate)}`);
  }
  if (project.finalHandoverDate) {
    lines.push(`• تاريخ الاستلام النهائي: ${formatDateDMY(project.finalHandoverDate)}`);
  }

  if (includeFieldReports) {
    const fieldReports = getProjectFieldReports(project.id);
    if (fieldReports.length > 0) {
      lines.push(
        `━━━━━━━━━━━━━━━━━━━━`,
        `📋 *سجل تقارير التقدم الميداني المعتمدة (${fieldReports.length} تقارير):*`
      );
      fieldReports.forEach((rep, idx) => {
        lines.push(`• *تقرير #${fieldReports.length - idx} (${formatDateDMY(rep.date)}) - إنجاز: ${rep.actualProgress}%*`);
        lines.push(`  - الأعمال المنجزة: ${rep.completedWorks || "—"}`);
        if (rep.upcomingWorks) lines.push(`  - الأعمال القادمة: ${rep.upcomingWorks}`);
        if (rep.obstaclesText) lines.push(`  - المعوقات: ${rep.obstaclesText}`);
      });
    }
  }

  if (project.residentEngineerName) {
    lines.push(
      `━━━━━━━━━━━━━━━━━━━━`,
      `👷‍♂️ *المهندس المقيم:* ${project.residentEngineerName}${project.residentEngineerPhone ? ` (${project.residentEngineerPhone})` : ""}`
    );
  }

  if (project.notes) {
    lines.push(`📝 *ملاحظات:* ${project.notes}`);
  }

  lines.push(
    `━━━━━━━━━━━━━━━━━━━━`,
    `🌐 *صادر إلكترونياً من منصة متابعة مشاريع مديرية ماء الأنبار*`
  );

  return lines.join("\n");
}

export function ProjectShareDialog({
  project,
  open,
  onClose,
}: {
  project: Project | null;
  open: boolean;
  onClose: () => void;
}) {
  const [loadingImage, setLoadingImage] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [textCopied, setTextCopied] = useState(false);
  const [showFieldReports, setShowFieldReports] = useState(true);
  if (!project || !open) return null;

  const fieldReports = getProjectFieldReports(project.id);

  const initComm = Array.isArray(project.initialHandoverCommittee)
    ? project.initialHandoverCommittee.filter(Boolean)
    : [];
  const finalComm = Array.isArray(project.finalHandoverCommittee)
    ? project.finalHandoverCommittee.filter(Boolean)
    : [];

  const coList: ChangeOrderItem[] = Array.isArray(project.changeOrdersList) && project.changeOrdersList.length > 0
    ? project.changeOrdersList
    : [];

  const isCompleted = project.status === "completed" || Number(project.actualProgress || 0) >= 100;
  const statusLabel = isCompleted
    ? "منجز بالكامل (100%)"
    : project.status === "delayed"
    ? `متلكئ (${project.actualProgress || 0}%)`
    : project.status === "stopped"
    ? `متوقف (${project.actualProgress || 0}%)`
    : `مستمر (${project.actualProgress || 0}%)`;

  const statusEn = isCompleted
    ? "COMPLETED (100%)"
    : project.status === "delayed"
    ? `DELAYED (${project.actualProgress || 0}%)`
    : project.status === "stopped"
    ? `STOPPED (${project.actualProgress || 0}%)`
    : `ONGOING (${project.actualProgress || 0}%)`;

  const docTitle = isCompleted
    ? "استمارة توثيق وإنجاز مشروع منفذ"
    : "استمارة متابعة وتوثيق مشروع";

  const contractValStr = Number(project.contractValue || 0).toLocaleString("en-US");
  const workCostStr = Number(
    project.workCost ||
      Number(project.contractValue || 0) + Number(project.changeOrdersTotalAmount || 0)
  ).toLocaleString("en-US");
  const coAmountStr = Number(project.changeOrdersTotalAmount || 0).toLocaleString("en-US");

  // Share Image & Text to WhatsApp
  const handleShareImageWhatsApp = async () => {
    try {
      setLoadingImage(true);
      toast.info("جاري فتح واتساب وتجهيز صورة الاستمارة...");

      const whatsappText = generateProjectWhatsAppText(project, showFieldReports);
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

      // 1. Process Canvas & Blob in background
      let canvas: HTMLCanvasElement | null = null;
      try {
        canvas = await renderProjectSheetToCanvas(project);
      } catch (cErr) {
        console.warn("Canvas render error:", cErr);
      }

      if (canvas) {
        const blob = await new Promise<Blob | null>((res) => canvas!.toBlob(res, "image/png", 1.0));
        
        if (blob) {
          // Native file share if supported
          const file = new File(
            [blob],
            `استمارة_${isCompleted ? "إنجاز" : "متابعة"}_مشروع_${project.name.replace(/\s+/g, "_")}.png`,
            { type: "image/png" }
          );

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                title: project.name,
                text: whatsappText,
                files: [file],
              });
              setLoadingImage(false);
              toast.success("✅ تمت المشاركة بنجاح!");
              return;
            } catch (shareErr) {
              console.warn("Navigator share skipped or dismissed:", shareErr);
            }
          }

          // Desktop Clipboard copy
          if (navigator.clipboard && (window as any).ClipboardItem) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob }),
              ]);
              setImageCopied(true);
              setTimeout(() => setImageCopied(false), 4000);
            } catch (clipErr) {
              console.warn("Clipboard copy warning:", clipErr);
            }
          }

          // Auto-download backup
          try {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `استمارة_${isCompleted ? "إنجاز" : "متابعة"}_مشروع_${project.name.replace(/\s+/g, "_")}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          } catch (dlErr) {
            console.warn("Download warning:", dlErr);
          }
        }
      }

      // 2. Open WhatsApp directly
      window.open(whatsappUrl, "_blank");
      setLoadingImage(false);

      toast.success(
        "📲 تم فتح واتساب ونسخ صورة الاستمارة للحافظة! يمكنك لصق الصورة في المحادثة بـ (Ctrl + V)",
        { duration: 7000 }
      );
    } catch (err) {
      console.error(err);
      setLoadingImage(false);
      const whatsappText = generateProjectWhatsAppText(project);
      window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`, "_blank");
      toast.info("تم فتح تطبيق واتساب للمشاركة");
    }
  };

  // Copy Image Only
  const handleCopyImageOnly = async () => {
    try {
      setLoadingImage(true);
      const canvas = await renderProjectSheetToCanvas(project);
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("تعذر إنشاء صورة الاستمارة");
          setLoadingImage(false);
          return;
        }

        if (navigator.clipboard && (window as any).ClipboardItem) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob }),
            ]);
            setImageCopied(true);
            toast.success("📋 تم نسخ صورة الاستمارة الكاملة للحافظة! يمكنك الآن لصقها في واتساب بالضغط على (Ctrl + V)");
            setTimeout(() => setImageCopied(false), 3000);
          } catch (e) {
            toast.error("يرجى استخدام زر التحميل أو المشاركة المباشرة");
          }
        } else {
          toast.info("متصفحك لا يدعم النسخ المباشر للصور، تم تفعيل زر التحميل");
        }
        setLoadingImage(false);
      }, "image/png", 1.0);
    } catch (err) {
      setLoadingImage(false);
      toast.error("فشل نسخ صورة الاستمارة");
    }
  };

  // Copy Text Summary Only
  const handleCopyTextOnly = async () => {
    try {
      const text = generateProjectWhatsAppText(project, showFieldReports);
      await navigator.clipboard.writeText(text);
      setTextCopied(true);
      toast.success("📝 تم نسخ نص وبيانات الاستمارة بالكامل إلى الحافظة!");
      setTimeout(() => setTextCopied(false), 3000);
    } catch (e) {
      toast.error("فشل نسخ النص");
    }
  };

  // Download Image Only
  const handleDownloadImageOnly = async () => {
    try {
      setLoadingImage(true);
      const canvas = await renderProjectSheetToCanvas(project);
      const url = canvas.toDataURL("image/png", 1.0);
      const a = document.createElement("a");
      a.href = url;
      a.download = `استمارة_${isCompleted ? "إنجاز" : "متابعة"}_مشروع_${project.name.replace(/\s+/g, "_")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setLoadingImage(false);
      toast.success("📥 تم تحميل صورة الاستمارة الرسمية الكاملة بنجاح بجودة عالية!");
    } catch (err) {
      setLoadingImage(false);
      toast.error("فشل تحميل الصورة");
    }
  };

  // Print PDF
  const handlePrintPdf = () => {
    const printWindow = window.open("", "_blank", "width=1000,height=1100");
    if (!printWindow) {
      toast.error("يرجى السماح بالنوافذ المنبثقة للطباعة أو حفظ PDF");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const isCompleted = project.status === "completed" || Number(project.actualProgress || 0) >= 100;
    const isStopped = project.status === "stopped";
    const isDelayed = project.status === "delayed";
    const statusEn = isCompleted
      ? "COMPLETED (100%)"
      : isStopped
      ? `STOPPED (${project.actualProgress || 0}%)`
      : isDelayed
      ? `DELAYED (${project.actualProgress || 0}%)`
      : `ONGOING (${project.actualProgress || 0}%)`;
    const statusColor = isCompleted
      ? "#15803d"
      : isStopped
      ? "#e11d48"
      : isDelayed
      ? "#d97706"
      : "#0284c7";

    const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${docTitle} - ${project.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Cairo', Tahoma, sans-serif;
    }
    
    body {
      background-color: #f1f5f9;
      color: #0f172a;
      padding: 20px;
      direction: rtl;
      font-size: 11px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .toolbar {
      max-width: 800px;
      margin: 0 auto 16px;
      padding: 14px 18px;
      background: #1e293b;
      color: #ffffff;
      border-radius: 14px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .toolbar-info {
      font-size: 12px;
      font-weight: 700;
      color: #fde047;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .toolbar-btn {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 20px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 6px rgba(37,99,235,0.4);
    }
    
    .toolbar-btn:hover {
      background: #1d4ed8;
    }
    
    .page {
      background: #ffffff;
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      padding: 24px 30px;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      position: relative;
    }

    .print-wrapper-table {
      width: 100%;
      border-collapse: collapse;
    }
    .print-wrapper-table thead {
      display: table-header-group;
    }
    .print-wrapper-table tbody {
      display: table-row-group;
    }
    
    .header {
      border-bottom: 2.5px solid #0c2340;
      padding-bottom: 10px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      direction: rtl;
      width: 100%;
    }
    
    .header-right {
      text-align: right;
      line-height: 1.4;
      flex: 1;
    }
    .header-right h2 { font-size: 16px; font-weight: 900; color: #0c2340; margin: 0; }
    
    .header-center {
      text-align: center;
      flex: 1;
    }
    .header-center img {
      width: 60px;
      height: 60px;
      object-fit: contain;
      border-radius: 50%;
      border: 1px solid #cbd5e1;
      padding: 2px;
      background: #ffffff;
    }
    
    .header-left {
      text-align: left;
      direction: ltr;
      line-height: 1.5;
      font-size: 11px;
      font-weight: 700;
      color: #1e293b;
      font-family: 'Segoe UI', Tahoma, sans-serif;
      flex: 1;
    }
    
    .title-banner {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border: 1.5px solid #86efac;
      border-radius: 10px;
      padding: 8px 14px;
      text-align: center;
      margin-bottom: 12px;
    }
    .title-banner h1 { font-size: 15px; font-weight: 900; color: #14532d; }
    .title-banner p { font-size: 11.5px; font-weight: 800; color: #166534; margin-top: 2px; }
    
    .section-title {
      font-size: 11.5px;
      font-weight: 800;
      color: #1e3a8a;
      margin: 10px 0 6px;
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 1.5px dashed #cbd5e1;
      padding-bottom: 3px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      font-size: 10.5px;
      page-break-inside: avoid;
    }
    
    table th, table td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      text-align: right;
    }
    
    table th {
      background-color: #f1f5f9;
      color: #1e293b;
      font-weight: 800;
      width: 25%;
    }
    
    table td {
      color: #0f172a;
      font-weight: 600;
      width: 25%;
    }
    
    .committee-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 8px;
      page-break-inside: avoid;
    }
    .committee-box h4 { font-size: 11px; font-weight: 800; color: #0f172a; margin-bottom: 5px; }
    .committee-members {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      font-size: 10.5px;
    }
    .committee-member {
      background: white;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 4px 8px;
      font-weight: 700;
      color: #1e40af;
      text-align: center;
    }
    
    .signatures {
      margin-top: 18px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      text-align: center;
      page-break-inside: avoid;
    }
    .sig-block {
      border-top: 1.5px solid #94a3b8;
      padding-top: 6px;
    }
    .sig-title { font-size: 11px; font-weight: 800; color: #1e293b; }
    .sig-role { font-size: 9.5px; color: #64748b; margin-top: 2px; }
    
    .footer {
      margin-top: 18px;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      color: #94a3b8;
    }
    
    @media print {
      body {
        padding: 0 !important;
        background: #ffffff !important;
      }
      .toolbar {
        display: none !important;
      }
      .page {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
        border-radius: 0 !important;
      }
      .print-wrapper-table thead {
        display: table-header-group !important;
      }
      tr {
        page-break-inside: avoid;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <div class="toolbar-info">
      ⚠️ تنبيه: يرجى اختيار <strong>Save as PDF</strong> (حفظ كـ PDF) أو اختيار طابعة ورق A4 من قائمة <strong>Destination</strong>، وليس طابعة الباركود (Xprinter).
    </div>
    <button class="toolbar-btn" onclick="window.print()">
      🖨️ طباعة المستند (A4) / حفظ كـ PDF
    </button>
  </div>

  <div class="page">
    <table class="print-wrapper-table">
      <thead>
        <tr>
          <td>
            <div class="header">
              <div class="header-right">
                <h2>مديرية ماء محافظة الأنبار</h2>
              </div>
              <div class="header-center">
                <img src="${ANBAR_WATER_LOGO_BASE64}" alt="شعار مديرية ماء الأنبار" />
              </div>
              <div class="header-left">
                <div>Ref: ${project.contractNo || "ANB-PROJ"}</div>
                <div>Date: ${todayStr}</div>
                <div style="color: ${statusColor}; font-weight: 800;">Status: ${statusEn}</div>
              </div>
            </div>
          </td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="title-banner" style="background: ${isCompleted ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" : "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)"}; border-color: ${isCompleted ? "#86efac" : "#93c5fd"};">
              <h1 style="color: ${isCompleted ? "#14532d" : "#1e3a8a"};">${docTitle}</h1>
              <p style="color: ${isCompleted ? "#166534" : "#0369a1"};">${project.name}</p>
            </div>

            <div class="section-title">البيانات الأساسية والتعاقدية</div>
            <table>
              <tr>
                <th>اسم المشروع</th>
                <td colspan="3" style="font-weight: 800; color: #1e3a8a;">${project.name}</td>
              </tr>
              <tr>
                <th>موقع المشروع</th>
                <td>${project.location || "محافظة الأنبار"}</td>
                <th>القضاء والناحية</th>
                <td>${project.district || "الأنبار"}${project.subDistrict ? ` / ${project.subDistrict}` : ""}</td>
              </tr>
              <tr>
                <th>الشركة / المقاول المنفذ</th>
                <td>${project.contractor || "—"}</td>
                <th>نوع المشروع</th>
                <td>${project.type === "investment" ? "استثماري" : project.type === "non_investment" ? "تشغيلي / غير استثماري" : (project.type || "مشروع ماء")}</td>
              </tr>
              <tr>
                <th>رقم العقد</th>
                <td>${project.contractNo || "—"}</td>
                <th>تاريخ توقيع العقد</th>
                <td>${formatDateDMY(project.contractDate) || "—"}</td>
              </tr>
              <tr>
                <th>الجهة الممولة</th>
                <td>${project.fundingSource || "خطة المحافظة"}</td>
                <th>طريقة الإحالة</th>
                <td>${project.referralMethod || "مناقصة عامة"}</td>
              </tr>
              <tr>
                <th>حالة المشروع الحالية</th>
                <td style="font-weight: 800; color: ${isCompleted ? "#15803d" : "#0284c7"};">${statusLabel}</td>
                <th>نسبة الإنجاز الفعلي</th>
                <td style="font-weight: 800; color: #15803d;">${project.actualProgress || 0}% (المخطط: ${project.plannedProgress || 0}%)</td>
              </tr>
            </table>

            <div class="section-title">التكاليف المالية وأوامر الغيار</div>
            <table>
              <tr>
                <th>مبلغ العقد الأساسي</th>
                <td style="color: #047857; font-weight: 800;">${contractValStr} د.ع</td>
                <th>عدد أوامر الغيار</th>
                <td>${coList.length} أمر</td>
              </tr>
              <tr>
                <th>مجموع أوامر الغيار</th>
                <td>${coAmountStr} د.ع</td>
                <th>كلفة العمل الإجمالية</th>
                <td style="color: #1e40af; font-weight: 900; font-size: 12px;">${workCostStr} د.ع</td>
              </tr>
            </table>

            ${coList.length > 0 ? `
            <div class="section-title">جدول أوامر الغيار التفصيلية (${coList.length} أمر)</div>
            <table>
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="width: 8%; text-align: center;">#</th>
                  <th style="width: 32%;">رقم ومسمى أمر الغيار</th>
                  <th style="width: 20%;">تاريخ أمر الغيار</th>
                  <th style="width: 25%;">مبلغ أمر الغيار (د.ع)</th>
                  <th style="width: 15%;">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                ${coList.map((co, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: 800;">${idx + 1}</td>
                  <td style="font-weight: 700; color: #5b21b6;">${co.orderNo || `أمر غيار رقم ${idx + 1}`}</td>
                  <td>${formatDateDMY(co.orderDate) || "—"}</td>
                  <td style="font-weight: 800; color: #15803d; font-family: monospace;">${Number(co.amount || 0).toLocaleString("en-US")} د.ع</td>
                  <td style="font-size: 10px; color: #64748b;">${co.notes || "—"}</td>
                </tr>`).join("")}
              </tbody>
            </table>` : ""}

            <div class="section-title">التوقيتات الزمنية ومراحل الاستلام</div>
            <table>
              <tr>
                <th>تاريخ المباشرة</th>
                <td>${formatDateDMY(project.startDate || project.actualStartDate) || "—"}</td>
                <th>مدة العقد الأصلية</th>
                <td>${project.durationDays || 0} يوم</td>
              </tr>
              <tr>
                <th>المدد الإضافية الممنوحة</th>
                <td>${project.additionalDuration || "لا يوجد"}</td>
                <th>تاريخ الإنجاز التعاقدي</th>
                <td>${formatDateDMY(project.contractualCompletionDate || project.plannedEndDate) || "—"}</td>
              </tr>

        <td style="font-weight: 800; color: #0284c7;">${formatDateDMY(project.initialHandoverDate) || "—"}</td>
        <th>تاريخ الاستلام النهائي</th>
        <td style="font-weight: 800; color: #16a34a;">${formatDateDMY(project.finalHandoverDate) || "—"}</td>
      </tr>
    </table>

    ${(showFieldReports && fieldReports.length > 0) ? `
    <div class="section-title">سجل تقارير التقدم الميداني المعتمدة (${fieldReports.length} تقارير)</div>
    <table>
      <thead>
        <tr style="background: #f1f5f9;">
          <th style="width: 6%; text-align: center;">#</th>
          <th style="width: 16%;">تاريخ التقرير</th>
          <th style="width: 18%;">المهندس المقيم</th>
          <th style="width: 10%;">الإنجاز</th>
          <th style="width: 50%;">الأعمال المنجزة والقادمة والمعوقات</th>
        </tr>
      </thead>
      <tbody>
        ${fieldReports.map((rep, idx) => `
        <tr>
          <td style="text-align: center; font-weight: 800;">${fieldReports.length - idx}</td>
          <td style="font-weight: 700;">${formatDateDMY(rep.date)}</td>
          <td>${rep.engineer || "—"}</td>
          <td style="font-weight: 800; color: #15803d;">${rep.actualProgress}%</td>
          <td>
            <div style="font-weight: 700; color: #14532d;">${rep.completedWorks || "—"}</div>
            ${rep.upcomingWorks ? `<div style="font-size: 9.5px; color: #4338ca; margin-top: 2px;">القادمة: ${rep.upcomingWorks}</div>` : ""}
            ${rep.obstaclesText ? `<div style="font-size: 9.5px; color: #b91c1c; margin-top: 2px;">المعوقات: ${rep.obstaclesText}</div>` : ""}
          </td>
        </tr>`).join("")}
      </tbody>
    </table>` : ""}

    ${initComm.length > 0 ? `
    <div class="committee-box">
      <h4>لجنة الاستلام الأولي للمشروع:</h4>
      <div class="committee-members">
        ${initComm.map((m, idx) => `<div class="committee-member">${idx === 0 ? "(رئيس اللجنة) " : ""}${m}</div>`).join("")}
      </div>
    </div>` : ""}

    ${finalComm.length > 0 ? `
    <div class="committee-box">
      <h4>لجنة الاستلام النهائي للمشروع وإبراء الذمة:</h4>
      <div class="committee-members">
        ${finalComm.map((m, idx) => `<div class="committee-member">${idx === 0 ? "(رئيس اللجنة) " : ""}${m}</div>`).join("")}
      </div>
    </div>` : ""}

    ${(project.residentEngineerName || project.notes || project.problemsObstaclesSolutions) ? `
    <div class="committee-box" style="background: #f8fafc; border-color: #cbd5e1;">
      <h4>إشراف المهندس المقيم والملاحظات:</h4>
      <div style="font-size: 10.5px; color: #334155; line-height: 1.6;">
        ${project.residentEngineerName ? `<div><strong>المهندس المقيم: </strong>${project.residentEngineerName} ${project.residentEngineerPhone ? `(${project.residentEngineerPhone})` : ""}</div>` : ""}
        ${project.notes ? `<div><strong>ملاحظات: </strong>${project.notes}</div>` : ""}
        ${project.problemsObstaclesSolutions ? `<div style="color: #b91c1c;"><strong>المعوقات والمشاكل: </strong>${project.problemsObstaclesSolutions}</div>` : ""}
      </div>
    </div>` : ""}

    <div class="signatures" style="justify-content: flex-start;">
      <div class="sig-block" style="width: 250px;">
        <div class="sig-title">المهندس المقيم</div>
        <div class="sig-role">${project.residentEngineerName || "المهندس المشرف على المشروع"}</div>
      </div>
    </div>

    <div class="footer">
      <div>وثيقة رسمية صادرة إلكترونياً من منصة متابعة مشاريع مديرية ماء الأنبار</div>
      <div>تاريخ الطباعة: ${todayStr}</div>
    </div>
  </div>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[96vw] rounded-3xl p-0 overflow-hidden border border-slate-200 shadow-2xl" dir="rtl">
        <DialogTitle className="sr-only">مشاركة وتصدير صورة وثيقة المشروع</DialogTitle>
        <DialogDescription className="sr-only">مشاركة صورة الاستمارة الرسمية الكاملة عبر واتساب أو حفظها بصيغة PNG أو PDF</DialogDescription>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white p-5 sm:p-6 relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner shrink-0">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2 flex-wrap">
                  مشاركة وتصدير استمارة المشروع الكاملة
                  <span className="text-xs font-black bg-white/25 px-2.5 py-0.5 rounded-full border border-white/30 text-white">
                    استمارة رسمية شاملة (PNG / PDF)
                  </span>
                </h3>
                <p className="text-xs text-emerald-100 font-semibold mt-0.5 line-clamp-1">
                  {project.name} · عقد رقم: {project.contractNo || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* Toggle Field Progress Reports Control Bar */}
          <div className="flex items-center justify-between p-3.5 bg-slate-100/90 rounded-2xl border border-slate-200 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4.5 h-4.5 text-emerald-600" />
              <div className="text-xs font-bold text-slate-800">
                تضمين تقارير التقدم الميداني في الاستمارة والطباعة:
                {fieldReports.length > 0 ? (
                  <span className="text-[11px] font-semibold text-emerald-700 mr-1.5 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    ({fieldReports.length} تقارير مسجلة)
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-500 mr-1.5">
                    (لا توجد تقارير ميدانية لهذا المشروع بعد)
                  </span>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowFieldReports(!showFieldReports)}
              className={`h-8 gap-1.5 px-3.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                showFieldReports
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600 shadow-xs"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300 border-slate-300"
              }`}
            >
              {showFieldReports ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              {showFieldReports ? "إظهار التقارير الميدانية (مُضمّنة)" : "إخفاء التقارير الميدانية"}
            </Button>
          </div>

          {/* Quick Action Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. WhatsApp Image Share Card */}
            <button
              type="button"
              disabled={loadingImage}
              onClick={handleShareImageWhatsApp}
              className="flex items-center gap-3.5 p-4 rounded-2xl border-2 border-emerald-500/50 bg-emerald-50/90 hover:bg-emerald-100 text-right transition-all group shadow-xs hover:shadow-md cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-black text-emerald-950 flex items-center gap-1.5">
                  إرسال صورة الاستمارة لواتساب
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                </div>
                <div className="text-[11px] font-semibold text-emerald-800/90 mt-0.5 leading-snug">
                  نسخ وفتح واتساب ولصق صورة الاستمارة المعتمدة بكافة تفاصيلها
                </div>
              </div>
            </button>

            {/* 2. PDF Export & Print Card */}
            <button
              type="button"
              onClick={handlePrintPdf}
              className="flex items-center gap-3.5 p-4 rounded-2xl border-2 border-blue-500/50 bg-blue-50/90 hover:bg-blue-100 text-right transition-all group shadow-xs hover:shadow-md cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-black text-blue-950 flex items-center gap-1.5">
                  طباعة / تصدير PDF (A4)
                  <Download className="w-3.5 h-3.5 text-blue-700" />
                </div>
                <div className="text-[11px] font-semibold text-blue-800/90 mt-0.5 leading-snug">
                  استمارة توثيق المشروع الرسمية (وثيقة معتمدة A4 جاهزة للطباعة)
                </div>
              </div>
            </button>
          </div>

          {/* Quick Image & Text Utilities */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loadingImage}
              onClick={handleCopyImageOnly}
              className="h-8 text-xs gap-1.5 font-bold text-blue-900 bg-blue-50/70 hover:bg-blue-100 border-blue-200 rounded-xl cursor-pointer"
            >
              {imageCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-blue-600" />}
              {imageCopied ? "تم نسخ الصورة!" : "نسخ صورة الاستمارة"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyTextOnly}
              className="h-8 text-xs gap-1.5 font-bold text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100 border-emerald-200 rounded-xl cursor-pointer"
            >
              {textCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <FileText className="w-3.5 h-3.5 text-emerald-600" />}
              {textCopied ? "تم نسخ النص!" : "نسخ ملخص النص"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loadingImage}
              onClick={handleDownloadImageOnly}
              className="h-8 text-xs gap-1.5 font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200 rounded-xl cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              تحميل كصورة (PNG)
            </Button>
          </div>

          {/* Live Document Preview Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                معاينة استمارة المشروع الرسمية الكاملة (مطابقة تماماً للطباعة والصورة):
              </span>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                وثيقة معتمدة وشاملة 📋
              </span>
            </div>

            {/* Rendered Live Official Full Document Sheet */}
            <div className="bg-white border-2 border-slate-300 rounded-3xl p-5 sm:p-7 shadow-md space-y-4 text-slate-900 text-right text-xs" dir="rtl">
              {/* Header */}
              <div className="flex justify-between items-center border-b-2 border-blue-900 pb-3.5">
                <div className="space-y-0.5">
                  <h4 className="font-black text-blue-950 text-base">مديرية ماء محافظة الأنبار</h4>
                </div>
                <div className="text-center">
                  <img src={ANBAR_WATER_LOGO_BASE64} className="w-14 h-14 object-contain" alt="شعار مديرية ماء الأنبار" />
                </div>
                <div className="text-left text-xs font-bold text-slate-600" dir="ltr">
                  <div>Ref: {project.contractNo || "ANB-PROJ"}</div>
                  <div>Date: {new Date().toISOString().split("T")[0]}</div>
                  <div className={isCompleted ? "text-emerald-600" : project.status === "delayed" ? "text-rose-600" : "text-sky-600"}>
                    Status: {statusEn}
                  </div>
                </div>
              </div>

              {/* Title Banner */}
              <div className={`p-3 rounded-2xl text-center border ${isCompleted ? "bg-emerald-50/90 border-emerald-300" : "bg-blue-50/90 border-blue-300"}`}>
                <h3 className={`text-base font-black ${isCompleted ? "text-emerald-950" : "text-blue-950"}`}>{docTitle}</h3>
                <p className={`text-xs font-bold mt-0.5 ${isCompleted ? "text-emerald-800" : "text-blue-800"}`}>{project.name}</p>
              </div>

              {/* Section 1: البيانات الأساسية والتعاقدية */}
              <div className="space-y-1.5">
                <span className="text-xs font-black text-blue-900 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-blue-700" />
                  البيانات الأساسية والتعاقدية:
                </span>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-right border-collapse text-[11px]">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <th className="bg-slate-100 p-2 font-black text-slate-800 w-[20%]">اسم المشروع</th>
                        <td className="p-2 font-extrabold text-blue-950 w-[30%]" colSpan={3}>{project.name}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <th className="bg-slate-100 p-2 font-black text-slate-800 w-[20%]">موقع المشروع</th>
                        <td className="p-2 text-slate-900 font-semibold w-[30%]">{project.location || "محافظة الأنبار"}</td>
                        <th className="bg-slate-100 p-2 font-black text-slate-800 w-[20%]">القضاء والناحية</th>
                        <td className="p-2 text-slate-900 font-semibold w-[30%]">{project.district || "الأنبار"}{project.subDistrict ? ` / ${project.subDistrict}` : ""}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <th className="bg-slate-100 p-2 font-black text-slate-800">الشركة / المقاول المنفذ</th>
                        <td className="p-2 text-slate-900 font-semibold">{project.contractor || "—"}</td>
                        <th className="bg-slate-100 p-2 font-black text-slate-800">نوع المشروع</th>
                        <td className="p-2 text-slate-900 font-semibold">{project.type === "investment" ? "استثماري" : project.type === "non_investment" ? "تشغيلي / غير استثماري" : (project.type || "مشروع ماء")}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <th className="bg-slate-100 p-2 font-black text-slate-800">رقم العقد</th>
                        <td className="p-2 text-slate-900 font-mono font-bold">{project.contractNo || "—"}</td>
                        <th className="bg-slate-100 p-2 font-black text-slate-800">تاريخ توقيع العقد</th>
                        <td className="p-2 text-slate-900 font-semibold">{formatDateDMY(project.contractDate) || "—"}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <th className="bg-slate-100 p-2 font-black text-slate-800">الجهة الممولة</th>
                        <td className="p-2 text-slate-900 font-semibold">{project.fundingSource || "خطة المحافظة"}</td>
                        <th className="bg-slate-100 p-2 font-black text-slate-800">طريقة الإحالة</th>
                        <td className="p-2 text-slate-900 font-semibold">{project.referralMethod || "مناقصة عامة"}</td>
                      </tr>
                      <tr>
                        <th className="bg-slate-100 p-2 font-black text-slate-800">حالة المشروع الحالية</th>
                        <td className={`p-2 font-black ${isCompleted ? "text-emerald-700" : "text-blue-700"}`}>{statusLabel}</td>
                        <th className="bg-slate-100 p-2 font-black text-slate-800">نسبة الإنجاز الفعلي</th>
                        <td className="p-2 font-black text-emerald-800">{project.actualProgress || 0}% (المخطط: {project.plannedProgress || 0}%)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 2: التكاليف المالية وأوامر الغيار */}
              <div className="space-y-1.5">
                <span className="text-xs font-black text-blue-900 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                  التكاليف المالية وأوامر الغيار:
                </span>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-right border-collapse text-[11px]">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <th className="bg-slate-100 p-2 font-black text-slate-800 w-[20%]">مبلغ العقد الأساسي</th>
                        <td className="p-2 font-bold text-emerald-700 font-mono w-[30%]">{contractValStr} د.ع</td>
                        <th className="bg-slate-100 p-2 font-black text-slate-800 w-[20%]">عدد أوامر الغيار</th>
                        <td className="p-2 font-semibold w-[30%]">{coList.length} أمر</td>
                      </tr>
                      <tr>
                        <th className="bg-slate-100 p-2 font-black text-slate-800">مجموع أوامر الغيار</th>
                        <td className="p-2 font-bold text-purple-700 font-mono">{coAmountStr} د.ع</td>
                        <th className="bg-slate-100 p-2 font-black text-slate-800">كلفة العمل الإجمالية</th>
                        <td className="p-2 font-black text-blue-900 font-mono">{workCostStr} د.ع</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: جدول أوامر الغيار التفصيلية (إن وجدت) */}
              {coList.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-black text-purple-900 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-purple-700" />
                    جدول أوامر الغيار التفصيلية ({coList.length} أمر):
                  </span>
                  <div className="border border-purple-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-right border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-purple-100/70 border-b border-purple-200 text-purple-950 font-black">
                          <th className="p-2 text-center w-[8%]">#</th>
                          <th className="p-2 w-[35%]">رقم ومسمى أمر الغيار</th>
                          <th className="p-2 w-[22%]">تاريخ أمر الغيار</th>
                          <th className="p-2 w-[20%]">المبلغ (د.ع)</th>
                          <th className="p-2 w-[15%]">ملاحظات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coList.map((co, idx) => (
                          <tr key={idx} className="border-b border-purple-100 last:border-0 hover:bg-purple-50/50">
                            <td className="p-2 text-center font-black text-slate-600">{idx + 1}</td>
                            <td className="p-2 font-bold text-purple-900">{co.orderNo || `أمر غيار رقم ${idx + 1}`}</td>
                            <td className="p-2 text-slate-800">{formatDateDMY(co.orderDate) || "—"}</td>
                            <td className="p-2 font-mono font-bold text-emerald-700">{Number(co.amount || 0).toLocaleString("en-US")} د.ع</td>
                            <td className="p-2 text-slate-600 text-[10px]">{co.notes || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Section 4: التوقيتات الزمنية ومراحل الاستلام */}
              <div className="space-y-1.5">
                <span className="text-xs font-black text-blue-900 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-700" />
                  التوقيتات الزمنية ومراحل الاستلام:
                </span>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-right border-collapse text-[11px]">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <th className="bg-slate-100 p-2 font-black text-slate-800 w-[20%]">تاريخ المباشرة</th>
                        <td className="p-2 text-slate-900 font-semibold w-[30%]">{formatDateDMY(project.startDate || project.actualStartDate) || "—"}</td>
                        <th className="bg-slate-100 p-2 font-black text-slate-800 w-[20%]">مدة العقد الأصلية</th>
                        <td className="p-2 text-slate-900 font-semibold w-[30%]">{project.durationDays || 0} يوم</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <th className="bg-slate-100 p-2 font-black text-slate-800">المدد الإضافية الممنوحة</th>
                        <td className="p-2 text-slate-900 font-semibold">{project.additionalDuration || "لا يوجد"}</td>
                        <th className="bg-slate-100 p-2 font-black text-slate-800">تاريخ الإنجاز التعاقدي</th>
                        <td className="p-2 text-slate-900 font-semibold">{formatDateDMY(project.contractualCompletionDate || project.plannedEndDate) || "—"}</td>
                      </tr>
                      <tr>
                        <th className="bg-slate-100 p-2 font-black text-slate-800">تاريخ الاستلام الأولي</th>
                        <td className="p-2 font-bold text-sky-700">{formatDateDMY(project.initialHandoverDate) || "—"}</td>
                        <th className="bg-slate-100 p-2 font-black text-slate-800">تاريخ الاستلام النهائي</th>
                        <td className="p-2 font-bold text-emerald-700">{formatDateDMY(project.finalHandoverDate) || "—"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section: تقارير التقدم الميداني المعتمدة */}
              {showFieldReports && fieldReports.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-black text-emerald-900 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-emerald-700" />
                    سجل تقارير التقدم الميداني المعتمدة ({fieldReports.length} تقارير):
                  </span>
                  <div className="border border-emerald-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-right border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-emerald-100/70 border-b border-emerald-200 text-emerald-950 font-black">
                          <th className="p-2 text-center w-[8%]">#</th>
                          <th className="p-2 w-[18%]">تاريخ التقرير</th>
                          <th className="p-2 w-[18%]">المهندس المقيم</th>
                          <th className="p-2 w-[12%]">الإنجاز</th>
                          <th className="p-2 w-[44%]">الأعمال المنجزة والقادمة والمعوقات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fieldReports.map((rep, idx) => (
                          <tr key={idx} className="border-b border-emerald-100 last:border-0 hover:bg-emerald-50/50">
                            <td className="p-2 text-center font-black text-slate-600">{fieldReports.length - idx}</td>
                            <td className="p-2 font-bold text-slate-800">{formatDateDMY(rep.date)}</td>
                            <td className="p-2 text-slate-800">{rep.engineer || "—"}</td>
                            <td className="p-2 font-black text-emerald-700">{rep.actualProgress}%</td>
                            <td className="p-2 text-slate-900 leading-relaxed">
                              <div className="font-semibold text-emerald-950">{rep.completedWorks || "—"}</div>
                              {rep.upcomingWorks && (
                                <div className="text-[10px] text-indigo-900 mt-0.5 font-medium">الأعمال القادمة: {rep.upcomingWorks}</div>
                              )}
                              {rep.obstaclesText && (
                                <div className="text-[10px] text-rose-900 mt-0.5 font-medium">المعوقات: {rep.obstaclesText}</div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Section 5: اللجان */}
              {initComm.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                  <span className="text-[11px] font-black text-slate-900 block">لجنة الاستلام الأولي للمشروع:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {initComm.map((m, idx) => (
                      <div key={idx} className="bg-white border border-slate-300 rounded-lg p-1.5 text-center text-[11px] font-bold text-blue-900">
                        {idx === 0 ? `(رئيس اللجنة) ${m}` : m}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {finalComm.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                  <span className="text-[11px] font-black text-slate-900 block">لجنة الاستلام النهائي للمشروع وإبراء الذمة:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {finalComm.map((m, idx) => (
                      <div key={idx} className="bg-white border border-slate-300 rounded-lg p-1.5 text-center text-[11px] font-bold text-blue-900">
                        {idx === 0 ? `(رئيس اللجنة) ${m}` : m}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 6: المهندس المقيم والملاحظات */}
              {(project.residentEngineerName || project.notes || project.problemsObstaclesSolutions) && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 text-[11px]">
                  <span className="font-black text-blue-950 block">إشراف المهندس المقيم والملاحظات:</span>
                  <div className="text-slate-800 space-y-0.5">
                    {project.residentEngineerName && (
                      <div><strong className="text-slate-900">المهندس المقيم: </strong>{project.residentEngineerName} {project.residentEngineerPhone ? `(${project.residentEngineerPhone})` : ""}</div>
                    )}
                    {project.notes && (
                      <div><strong className="text-slate-900">ملاحظات: </strong>{project.notes}</div>
                    )}
                    {project.problemsObstaclesSolutions && (
                      <div><strong className="text-rose-900">المعوقات والمشاكل: </strong>{project.problemsObstaclesSolutions}</div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-start pt-3 border-t border-slate-200">
                <div className="border-t-2 border-slate-400 pt-1.5 w-64 text-center">
                  <div className="font-black text-slate-900 text-xs">المهندس المقيم</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5">{project.residentEngineerName || "المهندس المشرف"}</div>
                </div>
              </div>

              {/* Footer note */}
              <div className="pt-2 border-t border-slate-200 flex justify-between text-[10px] text-slate-400 font-medium">
                <div>وثيقة رسمية صادرة إلكترونياً من منصة متابعة مشاريع مديرية ماء الأنبار</div>
                <div>تاريخ الإصدار: {new Date().toISOString().split("T")[0]}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between sm:justify-between items-center w-full" dir="rtl">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            إغلاق
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handlePrintPdf}
              className="gap-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              طباعة / حفظ PDF
            </Button>
            <Button
              type="button"
              disabled={loadingImage}
              onClick={handleShareImageWhatsApp}
              className="gap-1.5 rounded-xl text-xs font-black bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md px-4 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              {loadingImage ? "جاري التجهيز..." : "مشاركة الصورة عبر واتساب 📲"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────────────────────────────────────────────────────


export function ProjectsPage({ defaultStatus = "all" }: { defaultStatus?: string }) {
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState<string>(
    defaultStatus === "ongoing_all" || defaultStatus === "ongoing" ? "ongoing" : "directory"
  );
  const [q, setQ] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("q") || params.get("search") || "";
    }
    return "";
  });
  const [status, setStatus] = useState<string>(
    defaultStatus === "completed" ? "completed" : defaultStatus === "stopped" ? "stopped" : "all"
  );
  const [projects, setProjects] = useState<Project[]>(() => {
    return getStoredProjects();
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlQ = params.get("q") || params.get("search");
      if (urlQ && urlQ !== q) {
        setQ(urlQ);
      }
    }
  }, []);
  
  // Dialog & Sheet States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [projectToShare, setProjectToShare] = useState<Project | null>(null);

  // Stop / Pause Project State
  const [projectToPause, setProjectToPause] = useState<Project | null>(null);
  const [pauseDate, setPauseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [pauseReason, setPauseReason] = useState("");

  // Resume Project State
  const [projectToResume, setProjectToResume] = useState<Project | null>(null);
  const [resumeDate, setResumeDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [resumeNotes, setResumeNotes] = useState("");

  // System Display Settings State
  const [showContractValueCompletedSetting, setShowContractValueCompletedSetting] = useState(
    () => getSystemSettings().showContractValueInCompletedProjects
  );
  const [showContractValueOngoingSetting, setShowContractValueOngoingSetting] = useState(
    () => getSystemSettings().showContractValueInOngoingProjects ?? true
  );

  useEffect(() => {
    syncSystemSettingsWithSupabase();
    const handleSettingsChange = () => {
      const settings = getSystemSettings();
      setShowContractValueCompletedSetting(settings.showContractValueInCompletedProjects);
      setShowContractValueOngoingSetting(settings.showContractValueInOngoingProjects ?? true);
    };
    window.addEventListener("system-settings-changed", handleSettingsChange);
    return () => window.removeEventListener("system-settings-changed", handleSettingsChange);
  }, []);

  // Form State
  const [formData, setFormData] = useState<Partial<Project>>({});

  // Initial load from LocalStorage and Supabase merge
  const loadProjects = async () => {
    // 1. Immediately load local stored projects to ensure instant display
    const localData = getStoredProjects();
    setProjects(localData);

    // 2. Fetch from Supabase as single source of truth
    try {
      const remoteData = await getProjectsFromSupabase();
      if (remoteData && remoteData.length > 0) {
        // Merge remote projects with local projects so freshly added or offline projects are not wiped out
        const remoteIds = new Set(remoteData.map((p) => p.id));
        const localList = getStoredProjects();
        const localOnly = localList.filter((p) => p && p.id && !remoteIds.has(p.id));
        const combined = [...remoteData, ...localOnly];

        // Auto-heal any project with 100% progress
        const healed = combined.map((p) => {
          if (Number(p.actualProgress || 0) >= 100 && p.status !== "completed") {
            return { ...p, status: "completed" as ProjectStatus, actualProgress: 100 };
          }
          return p;
        });
        setProjects(healed);
        saveStoredProjects(healed, true); // update local storage silently to match Supabase
      }
    } catch (e) {
      console.warn("Could not sync remote projects in projects page:", e);
    }
  };

  const [reports, setReports] = useState<ProgressReport[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("wms.progress_reports");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed.filter((r) => r && r.id && r.projectId);
        } catch {}
      }
    }
    return [];
  });

  // Load progress reports from localStorage and Supabase
  const loadReports = async () => {
    const storedRaw = localStorage.getItem("wms.progress_reports");
    let storedReports: ProgressReport[] = [];
    if (storedRaw) {
      try {
        const parsed = JSON.parse(storedRaw);
        if (Array.isArray(parsed)) {
          storedReports = parsed.filter((r) => r && r.id && r.projectId);
        }
      } catch {}
    }

    try {
      const remoteReports = await getProgressReportsFromSupabase();
      if (remoteReports && remoteReports.length > 0) {
        const cleanedRemote = remoteReports.filter((r) => r && r.id && r.projectId);
        const map = new Map<string, ProgressReport>();
        storedReports.forEach((r) => map.set(r.id, r));
        cleanedRemote.forEach((r) => map.set(r.id, r));
        const merged = Array.from(map.values());
        setReports(merged);
        localStorage.setItem("wms.progress_reports", JSON.stringify(merged));
        return;
      }
    } catch {}

    setReports(storedReports);
  };

  useEffect(() => {
    loadProjects();
    loadReports();

    const handleUpdate = () => {
      const stored = getStoredProjects();
      const healed = stored.map((p) => {
        if (Number(p.actualProgress || 0) >= 100 && p.status !== "completed") {
          return { ...p, status: "completed" as ProjectStatus, actualProgress: 100 };
        }
        return p;
      });
      setProjects(healed);

      // Re-load reports on storage/projects_updated event
      loadReports();
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

  // Save changes helper
  const saveProjectsToStorage = (updatedList: Project[]) => {
    setProjects(updatedList);
    saveStoredProjects(updatedList); // this already dispatches "projects_updated" internally
  };

  // Filter projects
  const filtered = projects.filter((p) => {
    const query = (q || "").trim().toLowerCase();
    const normalizeDigits = (str: string) =>
      str.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
    const normQuery = normalizeDigits(query);

    const matchField = (val?: string | number | null) => {
      if (!val) return false;
      const str = String(val).toLowerCase();
      const normStr = normalizeDigits(str);
      return str.includes(query) || normStr.includes(normQuery);
    };

    const matchQ =
      !query ||
      matchField(p.name) ||
      matchField(p.referralNo) || // رقم الإحالة
      matchField(p.contractNo) || // رقم العقد
      matchField(p.id) ||
      matchField(p.location) ||
      matchField(p.district) ||
      matchField(p.centerName) ||
      matchField(p.contractor) ||
      matchField(p.residentEngineerName) ||
      matchField((p as any).residentEngineer) ||
      matchField(STATUS_LABEL[p.status]);

    const isCompleted = p.status === "completed" || Number(p.actualProgress || 0) >= 100;
    const isStopped = p.status === "stopped";
    const isOngoing = !isCompleted && !isStopped;

    let matchS = false;
    if (defaultStatus === "ongoing_all" || defaultStatus === "ongoing") {
      matchS = isOngoing;
    } else if (defaultStatus === "completed") {
      matchS = isCompleted;
    } else if (defaultStatus === "stopped") {
      matchS = isStopped;
    } else {
      if (status === "active") {
        matchS = isOngoing;
      } else if (status === "all") {
        matchS = !isCompleted;
      } else if (status === "completed") {
        matchS = isCompleted;
      } else if (status === "ongoing" || status === "delayed") {
        matchS = isOngoing && (status === "ongoing" ? (p.status === "ongoing" || p.status === "delayed") : p.status === status);
      } else if (status === "stopped") {
        matchS = isStopped;
      } else {
        matchS = p.status === status;
      }
    }
    return matchQ && matchS;
  });

  // Calculate planned end date helper
  const calculatePlannedEndDate = (start: string, durationDays: number) => {
    if (!start || !durationDays) return "";
    try {
      const date = new Date(start);
      date.setDate(date.getDate() + Number(durationDays));
      return date.toISOString().split("T")[0];
    } catch (e) {
      return "";
    }
  };

  // Handle input changes with auto calculations
  const handleInputChange = (field: keyof Project, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Auto calculate Cost of Work = Contract Value + Change Orders Total
      if (field === "contractValue" || field === "changeOrdersTotalAmount") {
        const valueNum = Number(updated.contractValue || 0);
        const coAmountNum = Number(updated.changeOrdersTotalAmount || 0);
        updated.workCost = valueNum + coAmountNum;
      }
      
      // Auto calculate planned end dates based on start date, duration, additional duration, and change orders
      if (field === "startDate" || field === "durationDays" || field === "additionalDuration" || field === "changeOrdersList") {
        const start = updated.startDate || "";
        const duration = Number(updated.durationDays || 0);
        const extraDays = parseDurationDays(updated.additionalDuration);
        const coList = Array.isArray(updated.changeOrdersList) ? updated.changeOrdersList : [];
        const coExtraDays = coList.reduce((sum: number, item: any) => sum + parseDurationDays(item.additionalDays), 0);
        const totalExecution = duration + extraDays + coExtraDays;
        
        if (start && duration > 0) {
          const calculatedEnd = calcDateAddDaysISO(start, duration);
          if (calculatedEnd) {
            updated.plannedEndDate = calculatedEnd;
            updated.contractualCompletionDate = calculatedEnd;
          }
          const calculatedCompAfterAdd = calcDateAddDaysISO(start, totalExecution);
          if (calculatedCompAfterAdd) {
            updated.completionDateAfterAdditional = calculatedCompAfterAdd;
          }
        }
      }

      // Auto set actualProgress to 100 when status is completed
      if (field === "status" && value === "completed") {
        updated.actualProgress = 100;
      }
      // Auto set status to completed when actualProgress is 100
      if (field === "actualProgress" && Number(value) >= 100) {
        updated.status = "completed";
      }

      return updated;
    });
  };

  // Open add project wizard
  const handleOpenAdd = () => {
    setIsAddOpen(true);
  };

  // Wizard save handler (Async Supabase Sync)
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

    const currentStored = getStoredProjects();
    const updatedList = [
      cleanProject,
      ...currentStored.filter(
        p => p.id !== cleanProject.id &&
        !(p.name && cleanProject.name && p.name.trim().toLowerCase() === cleanProject.name.trim().toLowerCase())
      )
    ];
    saveProjectsToStorage(updatedList);
    setProjects(updatedList);

    // Sync with Supabase (saveProjectsToStorage already dispatched projects_updated)
    await saveProjectToSupabase(cleanProject);
  };

  // Edit project handler
  const handleEditClick = () => {
    if (selectedProject) {
      let coList = Array.isArray(selectedProject.changeOrdersList) ? [...selectedProject.changeOrdersList] : [];
      if (coList.length === 0 && (selectedProject.changeOrdersCount || 0) > 0) {
        const count = selectedProject.changeOrdersCount || 1;
        const total = selectedProject.changeOrdersTotalAmount || selectedProject.changeOrderSingleAmount || 0;
        const singleAmt = count > 0 ? Math.round(total / count) : total;
        for (let i = 0; i < count; i++) {
          coList.push({
            id: `CO-${Date.now()}-${i + 1}`,
            orderNo: selectedProject.changeOrderNoAndDate || `أمر غيار رقم ${i + 1}`,
            orderDate: new Date().toISOString().split("T")[0],
            amount: singleAmt,
            notes: "",
          });
        }
      }
      setFormData({
        ...selectedProject,
        changeOrdersList: coList,
      });
      setIsEditMode(true);
    }
  };

  // Save edited project (Async Supabase Sync)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name) return;

    const actualProg = Number(formData.actualProgress ?? selectedProject?.actualProgress ?? 0);
    const finalStatus = (actualProg >= 100 || formData.status === "completed")
      ? ("completed" as ProjectStatus)
      : (formData.status || selectedProject?.status || "ongoing");

    const coList = Array.isArray(formData.changeOrdersList) ? formData.changeOrdersList : (selectedProject?.changeOrdersList || []);
    const coTotal = coList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const finalWorkCost = Number(formData.contractValue ?? selectedProject?.contractValue ?? 0) + coTotal;

    const updatedProject = {
      ...selectedProject,
      ...formData,
      changeOrdersList: coList,
      changeOrdersCount: coList.length,
      changeOrdersTotalAmount: coTotal,
      changeOrderSingleAmount: coList.length > 0 ? Number(coList[0].amount || 0) : 0,
      workCost: finalWorkCost,
      status: finalStatus,
      actualProgress: finalStatus === "completed" ? 100 : actualProg
    } as Project;

    const updatedList = projects.map((p) =>
      p.id === formData.id ? updatedProject : p
    );

    saveProjectsToStorage(updatedList);
    setSelectedProject(updatedProject);
    setIsEditMode(false);
    toast.success("تم تحديث بيانات المشروع وحفظ التغييرات.");

    try {
      logActivity({
        actionType: "project_update",
        category: "projects",
        title: `تعديل مشروع: ${updatedProject.name}`,
        description: `تم تحديث بيانات المشروع (نسبة الإنجاز: ${updatedProject.actualProgress}% - الحالة: ${updatedProject.status === "completed" ? "منجز" : updatedProject.status === "stopped" ? "متوقف" : "قيد التنفيذ"})`,
        details: {
          "معرف المشروع": updatedProject.id,
          "نسبة الإنجاز": `${updatedProject.actualProgress}%`,
          "الحالة": updatedProject.status,
          "الكلفة": `${Number(updatedProject.contractValue || 0).toLocaleString()} ${updatedProject.currency || "IQD"}`,
        },
      });
    } catch {}

    // Sync with Supabase
    await saveProjectToSupabase(updatedProject);
  };

  // Delete project handler (Async Supabase Sync)
  const handleDeleteClick = (id: string) => {
    setProjectToDelete(id);
  };

  const executeDeleteProject = async () => {
    if (!projectToDelete) return;
    const targetId = projectToDelete;
    const deletedProj = projects.find((p) => p.id === targetId);
    const updatedList = projects.filter((p) => p.id !== targetId);
    saveProjectsToStorage(updatedList);
    setIsViewOpen(false);
    setProjectToDelete(null);
    toast.success("تم حذف المشروع بنجاح من النظام.");

    try {
      logActivity({
        actionType: "project_delete",
        category: "projects",
        title: `حذف مشروع: ${deletedProj?.name || targetId}`,
        description: `تم حذف المشروع نهائياً من قاعدة بيانات النظام (${deletedProj?.district || deletedProj?.location || "الأنبار"})`,
        details: {
          "معرف المشروع": targetId,
          "رقم العقد": deletedProj?.contractNo,
          "اسم المقاول": deletedProj?.contractor,
        },
      });
    } catch {}

    // Sync with Supabase (saveProjectsToStorage already dispatched projects_updated)
    await deleteProjectFromSupabase(targetId);
  };

  const handleDeleteReport = (rId: string) => {
    setReportToDelete(rId);
  };

  const executeDeleteReport = async () => {
    if (!reportToDelete) return;
    const targetId = reportToDelete;
    const deletedRep = reports.find((r) => r.id === targetId);
    const stored = localStorage.getItem("wms.progress_reports");
    const rawList: ProgressReport[] = stored ? JSON.parse(stored) : [];
    const updatedReports = rawList.filter((r) => r.id !== targetId);

    localStorage.setItem("wms.progress_reports", JSON.stringify(updatedReports));
    setReports(updatedReports);

    try {
      logActivity({
        actionType: "progress_update",
        category: "reports",
        title: `حذف تقرير متابعة ميدانية`,
        description: `تم حذف تقرير المتابعة الميدانية بتاريخ ${deletedRep?.date || "-"} الخاص بالمشروع`,
        details: {
          "معرف التقرير": targetId,
          "المهندس": deletedRep?.engineer,
        },
      });
    } catch {}

    // Sync delete report with Supabase
    await deleteProgressReportFromSupabase(targetId);

    window.dispatchEvent(new Event("projects_updated"));
    toast.success("تم حذف تقرير المتابعة الميدانية بنجاح 🗑️");
    setReportToDelete(null);
  };

  // Stop / Pause Project handlers
  const handleConfirmPause = async () => {
    if (!projectToPause) return;
    if (!pauseReason.trim()) {
      toast.error("يرجى كتابة سبب إيقاف المشروع");
      return;
    }
    if (!pauseDate) {
      toast.error("يرجى تحديد تاريخ إيقاف المشروع");
      return;
    }
    const reasonText = pauseReason.trim();
    const formattedSuspension = `توقف بتاريخ ${pauseDate}: ${reasonText}`;

    const updatedList = projects.map((p) => {
      if (p.id === projectToPause.id) {
        return {
          ...p,
          status: "stopped" as ProjectStatus,
          suspensionDate: pauseDate,
          suspensionDatesReasons: formattedSuspension,
          delayReasons: reasonText,
        };
      }
      return p;
    });
    const targetProject = updatedList.find((p) => p.id === projectToPause.id);
    if (targetProject) {
      saveProjectsToStorage(updatedList);
      try {
        logActivity({
          actionType: "project_update",
          category: "projects",
          title: `إيقاف مشروع: ${targetProject.name}`,
          description: `تم إيقاف العمل في المشروع اعتباراً من ${pauseDate} بسبب: ${reasonText}`,
          details: {
            "معرف المشروع": targetProject.id,
            "تاريخ الإيقاف": pauseDate,
            "أسباب التوقف": reasonText,
          },
        });
      } catch {}
      await saveProjectToSupabase(targetProject);
      toast.success(`تم إيقاف مشروع "${targetProject.name}" بتاريخ ${pauseDate} وتسجيل السبب بنجاح`);
    }
    setProjectToPause(null);
    setPauseReason("");
  };

  const handleConfirmResume = async () => {
    if (!projectToResume) return;
    if (!resumeDate) {
      toast.error("يرجى تحديد تاريخ استئناف المشروع");
      return;
    }
    const notesText = resumeNotes.trim();
    const formattedResume = notesText
      ? `استئناف العمل بتاريخ ${resumeDate} (${notesText})`
      : `استئناف العمل بتاريخ ${resumeDate}`;

    const updatedList = projects.map((p) => {
      if (p.id === projectToResume.id) {
        const existingReasons = p.suspensionDatesReasons ? `${p.suspensionDatesReasons}\n` : "";
        return {
          ...p,
          status: "ongoing" as ProjectStatus,
          resumeStartDate: resumeDate,
          suspensionDatesReasons: `${existingReasons}${formattedResume}`,
        };
      }
      return p;
    });
    const targetProject = updatedList.find((p) => p.id === projectToResume.id);
    if (targetProject) {
      saveProjectsToStorage(updatedList);
      try {
        logActivity({
          actionType: "project_update",
          category: "projects",
          title: `استئناف مشروع: ${targetProject.name}`,
          description: `تم استئناف وتنشيط العمل في المشروع بتاريخ ${resumeDate}`,
          details: {
            "معرف المشروع": targetProject.id,
            "تاريخ الاستئناف": resumeDate,
            "ملاحظات": notesText,
          },
        });
      } catch {}
      await saveProjectToSupabase(targetProject);
      toast.success(`تم استئناف وتنشيط مشروع "${targetProject.name}" بتاريخ ${resumeDate} بنجاح`);
    }
    setProjectToResume(null);
    setResumeNotes("");
  };

  const pageInfo = {
    all: { title: "إدارة المشاريع", description: "استعراض وإضافة وتعديل كافة مشاريع المديرية", icon: FolderKanban },
    ongoing_all: { title: "مشاريع قيد التنفيذ", description: "المشاريع الجاري تنفيذها حالياً ومتابعة تقدمها", icon: Construction },
    completed: { title: "مشاريع المنفذة", description: "سجل المشاريع المنجزة والمغلقة بالكامل بنجاح", icon: FileCheck },
    stopped: { title: "مشاريع تم إلغاؤها", description: "المشاريع المتوقفة أو التي تم إلغاؤها وأسباب التوقف", icon: AlertCircle },
  }[defaultStatus] || { title: "المشاريع", description: "إدارة المشاريع", icon: FolderKanban };
  const PageIcon = pageInfo.icon;

  const totalValueIQD = useMemo(() => {
    return filtered
      .filter((p) => (p.currency || "IQD") === "IQD")
      .reduce((sum, p) => sum + (Number(p.contractValue) || 0), 0);
  }, [filtered]);

  const totalValueUSD = useMemo(() => {
    return filtered
      .filter((p) => p.currency === "USD")
      .reduce((sum, p) => sum + (Number(p.contractValue) || 0), 0);
  }, [filtered]);

  return (
    <div className="space-y-5" dir="rtl">
      {/* Unified Navigation Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
          <TabsList className="grid w-full sm:w-auto grid-cols-2 bg-muted/60 p-1">
            <TabsTrigger value="directory" className="gap-2 text-xs sm:text-sm font-bold">
              <FolderKanban className="h-4 w-4" />
              دليل وإدارة المشاريع العامة
            </TabsTrigger>
            <TabsTrigger value="ongoing" className="gap-2 text-xs sm:text-sm font-bold">
              <Construction className="h-4 w-4 text-primary" />
              متابعة المشاريع قيد التنفيذ والتقارير
            </TabsTrigger>
          </TabsList>

          {defaultStatus !== "completed" && (
            <Button onClick={handleOpenAdd} className="gap-2 bg-primary hover:bg-primary/95 text-white">
              <Plus className="h-4 w-4" />
              مشروع جديد
            </Button>
          )}
        </div>

        {/* Tab 1: General Projects Directory & Management */}
        <TabsContent value="directory" className="space-y-5 mt-0">
          {/* Luminous Light Page Header */}
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-sky-50/90 via-cyan-50/70 to-blue-50/60 border border-cyan-200/80 dark:bg-slate-900 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs mb-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 border border-cyan-200/80 shadow-2xs">
                <PageIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {pageInfo.title}
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  {pageInfo.description}
                </p>
              </div>
            </div>
          </div>

          {/* Search and Filters Card */}
          <Card className="bespoke-card">
            <CardContent className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 sm:p-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="بحث باسم المشروع، رقم الإحالة، رقم العقد، الموقع، أو المقاول..."
                  className="pr-9 pl-9 text-right h-10 text-xs sm:text-sm rounded-xl font-medium"
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors rounded-full"
                    title="مسح البحث"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {defaultStatus === "all" && (
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="flex h-10 w-full sm:w-56 items-center justify-between rounded-xl border border-input bg-background px-3 py-1 text-xs sm:text-sm shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer font-bold text-foreground min-h-[44px]"
                >
                  <option value="active">المشاريع الجارية (قيد التنفيذ)</option>
                  <option value="ongoing">{STATUS_LABEL.ongoing}</option>
                  <option value="delayed">{STATUS_LABEL.delayed}</option>
                  <option value="stopped">{STATUS_LABEL.stopped}</option>
                  <option value="completed">المشاريع المنفذة ({STATUS_LABEL.completed})</option>
                  <option value="all">كافة المشاريع (شاملة المنفذة)</option>
                </select>
              )}
            </CardContent>
          </Card>

          {/* Split Financial Totals Bar (IQD & USD) */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between shadow-2xs">
              <div className="space-y-0.5">
                <span className="text-[11px] font-extrabold text-blue-800 dark:text-blue-300 block">
                  🇮🇶 إجمالي العقود بالدينار العراقي (د.ع)
                </span>
                <span className="text-base font-black text-blue-950 dark:text-blue-100 tabular-nums">
                  {(totalValueIQD || 0).toLocaleString("en-US")} <span className="text-xs font-bold">د.ع</span>
                </span>
              </div>
              <Badge className="bg-blue-600 text-white font-bold text-xs">
                {filtered.filter((p) => (p.currency || "IQD") === "IQD").length} عقد
              </Badge>
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-50 to-teal-50/60 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between shadow-2xs">
              <div className="space-y-0.5">
                <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 block">
                  🇺🇸 إجمالي العقود بالدولار الأمريكي ($)
                </span>
                <span className="text-base font-black text-emerald-950 dark:text-emerald-100 tabular-nums">
                  {(totalValueUSD || 0).toLocaleString("en-US")} <span className="text-xs font-bold">$</span>
                </span>
              </div>
              <Badge className="bg-emerald-600 text-white font-bold text-xs">
                {filtered.filter((p) => p.currency === "USD").length} عقد
              </Badge>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/50 border border-border/80 flex items-center justify-between shadow-2xs sm:col-span-2 lg:col-span-1">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-muted-foreground block">
                  📊 عدد المشاريع في القائمة
                </span>
                <span className="text-base font-black text-foreground tabular-nums">
                  {filtered.length} مشروع
                </span>
              </div>
              <Badge variant="outline" className="font-bold text-xs">
                محدث تلقائياً
              </Badge>
            </div>
          </div>

          {/* Projects Table & Mobile Cards Card */}
          <Card className="bespoke-card overflow-hidden">
            <CardContent className="p-0">
              {/* 1. Desktop & Tablet Table (Hidden on Mobile) */}
              <div className="hidden md:block w-full table-responsive-wrapper max-w-full" dir="rtl" style={{ direction: "rtl" }}>
                <Table dir="rtl" style={{ direction: "rtl" }}>
                  <TableHeader className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-700">
                    <TableRow className="border-b border-slate-300">
                      <TableHead className="text-right min-w-[220px] font-black text-slate-900 dark:text-slate-100 text-sm py-3.5">اسم المشروع</TableHead>
                      <TableHead className="text-right min-w-[130px] font-black text-slate-900 dark:text-slate-100 text-sm py-3.5">اسم المركز</TableHead>
                      <TableHead className="text-right min-w-[120px] font-black text-slate-900 dark:text-slate-100 text-sm py-3.5">نوع المشروع</TableHead>
                      <TableHead className="text-center min-w-[130px] font-black text-slate-900 dark:text-slate-100 text-sm py-3.5">الحالة ونسبة الإنجاز</TableHead>
                      {(showContractValueCompletedSetting || showContractValueOngoingSetting) && (
                        <TableHead className="text-center min-w-[130px] font-black text-slate-900 dark:text-slate-100 text-sm py-3.5">قيمة العقد</TableHead>
                      )}
                      <TableHead className="text-center min-w-[125px] font-black text-slate-900 dark:text-slate-100 text-sm py-3.5">رقم العقد / الإحالة</TableHead>
                      <TableHead className="text-right min-w-[130px] font-black text-slate-900 dark:text-slate-100 text-sm py-3.5">الشركة المنفذة</TableHead>
                      <TableHead className="text-center min-w-[240px] font-black text-slate-900 dark:text-slate-100 text-sm py-3.5">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => {
                      const isStopped = p.status === "stopped";
                      const isCompleted = p.status === "completed" || Number(p.actualProgress || 0) >= 100;
                      const hideContractVal = isCompleted ? !showContractValueCompletedSetting : !showContractValueOngoingSetting;
                      return (
                        <TableRow
                          key={p.id}
                          className={
                            isStopped
                              ? "bg-red-100/90 dark:bg-rose-950/80 hover:bg-red-200/90 dark:hover:bg-rose-900/90 cursor-pointer border-b-2 border-rose-300 dark:border-rose-800 transition-all shadow-xs"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer border-b border-slate-200"
                          }
                          onClick={() => {
                            setSelectedProject(p);
                            setIsViewOpen(true);
                            setIsEditMode(false);
                          }}
                        >
                          {/* 1. Project Name & Dates */}
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2">
                              {isStopped && (
                                <Badge className="bg-rose-700 text-white font-black text-[10px] px-2 py-0.5 shrink-0">
                                  متوقف
                                </Badge>
                              )}
                              <div className={`font-black text-sm leading-snug ${isStopped ? "text-rose-950 dark:text-rose-100" : "text-slate-900"}`}>{p.name}</div>
                            </div>
                            <div className={`text-xs font-semibold mt-1 ${isStopped ? "text-rose-900 dark:text-rose-200" : "text-slate-500"}`}>
                              مباشرة: {p.startDate || p.actualStartDate || "—"} · انتهاء: {p.plannedEndDate || "—"}
                              {(p.suspensionDatesReasons || p.delayReasons) && (
                                <span className="block mt-1 text-rose-950 dark:text-rose-100 font-bold bg-rose-200/90 dark:bg-rose-900/70 px-2 py-1 rounded border border-rose-300 dark:border-rose-700">
                                  سبب التوقف: {p.suspensionDatesReasons || p.delayReasons}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* 2. Center Name (اسم المركز) */}
                          <TableCell className={`text-sm font-extrabold text-right ${isStopped ? "text-rose-950 dark:text-rose-100" : "text-slate-900"}`}>
                            {p.centerName || p.district || "مركز المديرية"}
                          </TableCell>

                          {/* 3. Project Type */}
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={isStopped ? "bg-rose-200 text-rose-900 border-rose-400 text-xs font-black px-2.5 py-0.5" : "bg-blue-50 text-blue-800 border-blue-300 text-xs font-black px-2.5 py-0.5"}
                            >
                              {projectTypeLabel[p.type] || p.type || p.fundingSource || "استثماري"}
                            </Badge>
                          </TableCell>

                          {/* 4. Status & Progress */}
                          <TableCell className="text-center">
                            <div className="space-y-1.5 flex flex-col items-center">
                              <Badge
                                variant="outline"
                                className={
                                  isStopped
                                    ? "bg-rose-700 text-white font-black border-rose-800 text-xs px-2.5 py-0.5 animate-pulse"
                                    : isCompleted
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold text-xs px-2.5 py-0.5"
                                    : `${statusBadge[p.status]} font-extrabold text-xs px-2.5 py-0.5`
                                }
                              >
                                {isCompleted ? "منجز 🏆" : STATUS_LABEL[p.status] || p.status}
                              </Badge>
                              <div className="w-24 bg-muted rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full ${isCompleted ? "bg-emerald-500" : isStopped ? "bg-rose-500" : "bg-primary"}`}
                                  style={{ width: `${p.actualProgress || 0}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-bold tabular-nums text-muted-foreground">{p.actualProgress || 0}%</span>
                            </div>
                          </TableCell>

                          {/* 5. Contract Value */}
                          {(showContractValueCompletedSetting || showContractValueOngoingSetting) && (
                            <TableCell className={`text-center font-bold tabular-nums text-sm ${isStopped ? "text-rose-950 dark:text-rose-100" : "text-slate-900"}`}>
                              {hideContractVal ? "مخفية" : formatAmountWithCurrency(p.contractValue, p.currency)}
                            </TableCell>
                          )}

                          {/* 6. Contract No & Referral No */}
                          <TableCell className={`text-center font-mono font-bold text-xs ${isStopped ? "text-rose-950 dark:text-rose-100" : "text-slate-800"}`}>
                            <div>{p.contractNo || "—"}</div>
                            {p.referralNo && (
                              <div className="text-[10px] font-sans font-semibold text-blue-700 dark:text-blue-300 mt-0.5" title={`رقم الإحالة: ${p.referralNo}`}>
                                إحالة: <span className="font-mono">{p.referralNo}</span>
                              </div>
                            )}
                          </TableCell>

                          {/* 7. Contractor */}
                          <TableCell className={`text-sm font-extrabold text-right ${isStopped ? "text-rose-950 dark:text-rose-100" : "text-slate-900"}`}>
                            {p.contractor || "—"}
                          </TableCell>

                          {/* 8. Actions (Leftmost in RTL) */}
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Resume if Stopped */}
                              {isStopped && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1 px-2.5 bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600 text-xs font-black shadow-xs cursor-pointer"
                                  title="تنشيط وإلغاء إيقاف المشروع وتحديد تاريخ الاستئناف"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProjectToResume(p);
                                    setResumeDate(p.resumeStartDate || new Date().toISOString().split("T")[0]);
                                    setResumeNotes("");
                                  }}
                                >
                                  <PlayCircle className="h-3.5 w-3.5" />
                                  استئناف
                                </Button>
                              )}

                              {/* Stop if Active */}
                              {!isCompleted && !isStopped && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1 px-2.5 bg-rose-600 text-white hover:bg-rose-700 border-rose-600 text-xs font-black shadow-xs cursor-pointer"
                                  title="إيقاف المشروع وتسجيل السبب والتاريخ"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProjectToPause(p);
                                    setPauseDate(p.suspensionDate || new Date().toISOString().split("T")[0]);
                                    setPauseReason(p.delayReasons || "");
                                  }}
                                >
                                  <PauseCircle className="h-3.5 w-3.5" />
                                  إيقاف
                                </Button>
                              )}

                              {/* Monitor Progress */}
                              {!isCompleted && !isStopped && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1 px-2 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/30 text-xs font-black cursor-pointer"
                                  title="متابعة تقارير الإنجاز لهذا المشروع"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMainTab("ongoing");
                                  }}
                                >
                                  <Activity className="h-3.5 w-3.5" />
                                  متابعة
                                </Button>
                              )}

                              {/* Share Button (Available for ALL Projects) */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300 dark:border-blue-800 text-xs font-black shadow-2xs transition-all cursor-pointer"
                                title="مشاركة استمارة ووثيقة المشروع كصورة أو PDF أو عبر واتساب"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProjectToShare(p);
                                }}
                              >
                                <Share2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                مشاركة
                              </Button>

                              {/* Details */}
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8 gap-1 px-2.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 text-xs font-black transition-all cursor-pointer"
                                title="عرض تفاصيل المشروع بالكامل"
                                onClick={() => {
                                  setSelectedProject(p);
                                  setIsViewOpen(true);
                                  setIsEditMode(false);
                                }}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                تفاصيل
                              </Button>

                              {/* Delete */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                title="حذف المشروع"
                                onClick={() => {
                                  handleDeleteClick(p.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* 2. Mobile Cards View (Visible on Mobile Screens only) */}
              <div className="md:hidden p-2.5 sm:p-3 space-y-3 divide-y divide-border/40" dir="rtl">
                {filtered.map((p) => {
                  const isStopped = p.status === "stopped";
                  const isCompleted = p.status === "completed" || Number(p.actualProgress || 0) >= 100;
                  const hideContractVal = isCompleted ? !showContractValueCompletedSetting : !showContractValueOngoingSetting;
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "rounded-2xl border p-3.5 space-y-3 transition-all duration-200 active:scale-[0.99] shadow-xs cursor-pointer",
                        isStopped
                          ? "bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800"
                          : isCompleted
                          ? "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60"
                          : "bg-card border-border/80 hover:border-primary/40"
                      )}
                      onClick={() => {
                        setSelectedProject(p);
                        setIsViewOpen(true);
                        setIsEditMode(false);
                      }}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {p.contractNo && (
                            <span className="font-mono text-[10.5px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border" title="رقم العقد">
                              عقد: {p.contractNo}
                            </span>
                          )}
                          {p.referralNo && (
                            <span className="font-mono text-[10.5px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800" title="رقم الإحالة">
                              إحالة: {p.referralNo}
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className={
                              isStopped
                                ? "bg-rose-200 text-rose-900 border-rose-400 text-[10px] font-black px-2 py-0.5"
                                : "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] font-black px-2 py-0.5"
                            }
                          >
                            {projectTypeLabel[p.type] || p.type || p.fundingSource || "استثماري"}
                          </Badge>
                        </div>

                        <Badge
                          variant="outline"
                          className={
                            isStopped
                              ? "bg-rose-700 text-white font-black border-rose-800 text-[11px] px-2.5 py-0.5 animate-pulse"
                              : isCompleted
                              ? "bg-emerald-600 text-white border-emerald-700 font-extrabold text-[11px] px-2.5 py-0.5"
                              : `${statusBadge[p.status]} font-extrabold text-[11px] px-2.5 py-0.5`
                          }
                        >
                          {isCompleted ? "منجز 🏆" : STATUS_LABEL[p.status] || p.status}
                        </Badge>
                      </div>

                      {/* Project Name & Location */}
                      <div>
                        <h3 className={`text-base font-black leading-snug ${isStopped ? "text-rose-950 dark:text-rose-100" : "text-slate-900 dark:text-slate-100"}`}>
                          {p.name}
                        </h3>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between flex-wrap gap-1">
                          <span className="font-bold text-foreground">🏢 {p.centerName || p.district || "مركز المديرية"}</span>
                          <span className="font-medium text-[11px]">
                            {p.startDate || p.actualStartDate || "—"} ← {p.plannedEndDate || "—"}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1 bg-muted/40 p-2.5 rounded-xl border border-border/60">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-muted-foreground text-[11px]">نسبة الإنجاز الفعلي:</span>
                          <span className={isCompleted ? "text-emerald-600 font-black" : "text-primary font-black"}>
                            {p.actualProgress || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isCompleted ? "bg-emerald-500" : isStopped ? "bg-rose-500" : "bg-primary"
                            }`}
                            style={{ width: `${p.actualProgress || 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Key Details Grid */}
                      <div className={cn("grid gap-2 text-xs pt-1 border-t border-border/40", hideContractVal ? "grid-cols-1" : "grid-cols-2")}>
                        {!hideContractVal && (
                          <div>
                            <span className="text-[10px] text-muted-foreground block font-medium">قيمة العقد:</span>
                            <span className="font-extrabold text-foreground tabular-nums text-xs">
                              {formatAmountWithCurrency(p.contractValue, p.currency)}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] text-muted-foreground block font-medium">الشركة المنفذة:</span>
                          <span className="font-extrabold text-foreground truncate block text-xs">
                            {p.contractor || "—"}
                          </span>
                        </div>
                      </div>

                      {/* Suspension Alert if applicable */}
                      {(p.suspensionDatesReasons || p.delayReasons) && (
                        <div className="p-2 rounded-xl bg-rose-200/90 dark:bg-rose-900/70 text-rose-950 dark:text-rose-100 font-bold text-xs border border-rose-300">
                          سبب التوقف: {p.suspensionDatesReasons || p.delayReasons}
                        </div>
                      )}

                      {/* Mobile Actions Bar */}
                      <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 flex-wrap flex-1">
                          {isStopped && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 px-2.5 bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600 text-xs font-black shadow-xs cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectToResume(p);
                                setResumeDate(p.resumeStartDate || new Date().toISOString().split("T")[0]);
                                setResumeNotes("");
                              }}
                            >
                              <PlayCircle className="h-3.5 w-3.5" />
                              استئناف
                            </Button>
                          )}

                          {!isCompleted && !isStopped && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 px-2 bg-rose-600 text-white hover:bg-rose-700 border-rose-600 text-xs font-black shadow-xs cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectToPause(p);
                                setPauseDate(p.suspensionDate || new Date().toISOString().split("T")[0]);
                                setPauseReason(p.delayReasons || "");
                              }}
                            >
                              <PauseCircle className="h-3.5 w-3.5" />
                              إيقاف
                            </Button>
                          )}

                          {!isCompleted && !isStopped && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 px-2 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/30 text-xs font-black cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMainTab("ongoing");
                              }}
                            >
                              <Activity className="h-3.5 w-3.5" />
                              متابعة
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300 dark:border-blue-800 text-xs font-black shadow-2xs cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectToShare(p);
                            }}
                          >
                            <Share2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            مشاركة
                          </Button>

                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 gap-1 px-2.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 text-xs font-black cursor-pointer"
                            onClick={() => {
                              setSelectedProject(p);
                              setIsViewOpen(true);
                              setIsEditMode(false);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            تفاصيل
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(p.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filtered.length === 0 && (
                <div className="p-8 sm:p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <FolderKanban className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">لا توجد مشاريع مسجلة في هذا القسم</h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    يمكنك البدء بإضافة مشروع جديد إلى النظام باستخدام زر "مشروع جديد" بالأعلى.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Rich Ongoing Projects & Progress Reports Monitoring */}
        <TabsContent value="ongoing" className="space-y-5 mt-0">
          <OngoingProjectsPage />
        </TabsContent>
      </Tabs>

      {/* Premium Multi-Step Wizard to ADD project */}
      <AddProjectWizard
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleWizardSave}
      />


      {/* Sheet to VIEW & EDIT project details */}
      <Sheet open={isViewOpen} onOpenChange={setIsViewOpen}>
        <SheetContent className="max-w-4xl w-[90vw] overflow-y-auto sm:max-w-xl md:max-w-3xl" side="left" dir="rtl">
          <SheetHeader className="text-right border-b pb-4 mb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <SheetTitle className="text-xl font-bold text-primary flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  {selectedProject?.name}
                </SheetTitle>
                <SheetDescription className="text-sm font-mono text-muted-foreground">
                  رقم العقد: {selectedProject?.contractNo} · المعرّف: {selectedProject?.id}
                </SheetDescription>
              </div>
              <div className="flex gap-2">
                {isEditMode ? (
                  <>
                    <Button onClick={handleEditSubmit} className="gap-2 bg-success hover:bg-success/90 text-white">
                      <Save className="h-4 w-4" /> حفظ
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditMode(false)}>
                      إلغاء
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => selectedProject && setProjectToShare(selectedProject)}
                      className="gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300 font-extrabold text-xs shadow-xs cursor-pointer"
                    >
                      <Share2 className="h-4 w-4 text-blue-600" />
                      مشاركة (واتساب / PDF)
                    </Button>
                    <Button onClick={handleEditClick} className="gap-2 bg-primary hover:bg-primary/90 text-white">
                      <Edit className="h-4 w-4" /> تعديل
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => selectedProject && handleDeleteClick(selectedProject.id)}
                      className="gap-2 text-white"
                    >
                      <Trash2 className="h-4 w-4" /> حذف
                    </Button>
                  </>
                )}
              </div>
            </div>
            {selectedProject && (
              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <Badge className={`${statusBadge[selectedProject.status]} border font-medium`}>
                  الحالة: {STATUS_LABEL[selectedProject.status]}
                </Badge>
                <Badge variant="secondary">
                  النوع: {projectTypeLabel[selectedProject.type] || selectedProject.type}
                </Badge>
                <div className="flex-1 min-w-[200px] flex items-center gap-3">
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-primary h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${selectedProject.actualProgress || 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold whitespace-nowrap">
                    إنجاز: {selectedProject.actualProgress || 0}%
                  </span>
                </div>
              </div>
            )}
          </SheetHeader>

          {isEditMode ? (
            /* EDIT FORM VIEW */
            <form onSubmit={handleEditSubmit} className="space-y-6 pt-2">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid grid-cols-4 w-full bg-muted/60 p-1 rounded-lg">
                  <TabsTrigger value="basic" className="text-xs md:text-sm font-bold">البيانات الأساسية</TabsTrigger>
                  <TabsTrigger value="dates" className="text-xs md:text-sm font-bold">المدد والتواريخ</TabsTrigger>
                  <TabsTrigger value="financials" className="text-xs md:text-sm font-bold">المالية والتغييرات</TabsTrigger>
                  <TabsTrigger value="engineers" className="text-xs md:text-sm font-bold">👷 المهندسون</TabsTrigger>
                </TabsList>

                {/* Edit Basic */}
                <TabsContent value="basic" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم المشروع</Label>
                      <Input
                        value={formData.name || ""}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        className="text-right"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>رقم العقد</Label>
                      <Input
                        value={formData.contractNo || ""}
                        onChange={(e) => handleInputChange("contractNo", e.target.value)}
                        className="text-right"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الموقع (العنوان الكامل)</Label>
                      <Input
                        value={formData.location || ""}
                        onChange={(e) => handleInputChange("location", e.target.value)}
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>القضاء</Label>
                      <Input
                        value={formData.district || ""}
                        onChange={(e) => handleInputChange("district", e.target.value)}
                        placeholder="أدخل اسم القضاء..."
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الناحية التابعة لقضاء</Label>
                      <Input
                        value={formData.subDistrict || ""}
                        onChange={(e) => handleInputChange("subDistrict", e.target.value)}
                        placeholder="أدخل اسم الناحية (اختياري)..."
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الشركة المنفذة</Label>
                      <Input
                        value={formData.contractor || ""}
                        onChange={(e) => handleInputChange("contractor", e.target.value)}
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>اسم المركز</Label>
                      <Input
                        value={formData.centerName || ""}
                        onChange={(e) => handleInputChange("centerName", e.target.value)}
                        placeholder="أدخل اسم المركز..."
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الجهة الممولة للمشروع</Label>
                      <Input
                        value={formData.fundingSource || ""}
                        onChange={(e) => handleInputChange("fundingSource", e.target.value)}
                        placeholder="مثال: الخطة الاستثمارية / محافظة الأنبار"
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>طريقة الإحالة</Label>
                      <Input
                        value={formData.referralMethod || ""}
                        onChange={(e) => handleInputChange("referralMethod", e.target.value)}
                        placeholder="مثال: مناقصة عامة / دعوة مباشرة / تنفيذ مباشر"
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>رقم الإحالة</Label>
                      <Input
                        value={formData.referralNo || ""}
                        onChange={(e) => handleInputChange("referralNo", e.target.value)}
                        placeholder="مثال: إحالة / 45 / 2024"
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ الإحالة (اختياري)</Label>
                      <Input
                        type="date"
                        value={formData.referralDate || ""}
                        onChange={(e) => handleInputChange("referralDate", e.target.value)}
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-900">نوع المشروع (التصنيف)</Label>
                      <select
                        value={formData.type === "non_investment" ? "non_investment" : "investment"}
                        onChange={(e) => handleInputChange("type", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-blue-200 bg-blue-50/40 px-3 py-2 text-sm font-bold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer text-foreground"
                      >
                        <option value="investment" className="font-bold text-emerald-700">استثماري</option>
                        <option value="non_investment" className="font-bold text-blue-700">غير استثماري</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>الكلفة التقديرية (د.ع)</Label>
                      <Input
                        type="number"
                        value={formData.estimatedCost || ""}
                        onChange={(e) => handleInputChange("estimatedCost", Number(e.target.value))}
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>المبلغ العام التعاقدي (د.ع)</Label>
                      <Input
                        type="number"
                        value={formData.amount || ""}
                        onChange={(e) => handleInputChange("amount", Number(e.target.value))}
                        className="text-right"
                      />
                    </div>

                    {/* Google Maps Coordinates Box with dedicated N & E inputs */}
                    <div className="space-y-2 col-span-1 md:col-span-2">
                      <CoordinateInputs
                        lat={formData.lat}
                        lng={formData.lng}
                        onChange={(newLat, newLng) => {
                          handleInputChange("lat", newLat);
                          handleInputChange("lng", newLng);
                        }}
                      />
                    </div>
                    <div className="space-y-2 col-span-1 md:col-span-2">
                      <Label className="font-bold text-slate-900">حالة المشروع ونسبة الإنجاز</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                        <div>
                          <Label className="text-xs text-slate-600 mb-1 block font-bold">حالة المشروع</Label>
                          <select
                            value={formData.status || "ongoing"}
                            onChange={(e) => handleInputChange("status", e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm font-bold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer text-foreground"
                          >
                            <option value="ongoing" className="font-bold">{STATUS_LABEL.ongoing}</option>
                            <option value="stopped" className="font-bold">{STATUS_LABEL.stopped}</option>
                            <option value="completed" className="font-bold text-emerald-700">منجز (100%)</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600 mb-1 block font-bold">نسبة الإنجاز الفعلي (%)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            disabled={formData.status === "completed"}
                            value={formData.status === "completed" ? 100 : (formData.actualProgress ?? 0)}
                            onChange={(e) => handleInputChange("actualProgress", Number(e.target.value))}
                            className="text-right font-mono font-black bg-emerald-50 border-emerald-300 text-emerald-900 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ── Engineers & Supervisors Tab ─────────────────────────── */}
                <TabsContent value="engineers" className="space-y-5 pt-4">
                  {/* Resident Engineer Card */}
                  <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/60 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm">👷</span>
                      <div>
                        <p className="font-black text-sm text-blue-900">المهندس المقيم</p>
                        <p className="text-[11px] text-blue-600">المهندس المشرف الميداني المسؤول عن المشروع</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-bold text-slate-800">اسم المهندس المقيم</Label>
                        <Input
                          value={formData.residentEngineerName || ""}
                          onChange={(e) => handleInputChange("residentEngineerName", e.target.value)}
                          placeholder="أدخل الاسم الكامل للمهندس المقيم..."
                          className="text-right bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-slate-800">رقم هاتف المهندس المقيم</Label>
                        <Input
                          value={formData.residentEngineerPhone || ""}
                          onChange={(e) => handleInputChange("residentEngineerPhone", e.target.value)}
                          placeholder="مثال: 07801234567"
                          className="text-right bg-white font-mono"
                          type="tel"
                          dir="ltr"
                        />
                      </div>
                    </div>
                    {/* Preview */}
                    {formData.residentEngineerName && (
                      <div className="flex items-center gap-3 bg-white/80 rounded-xl border border-blue-200 px-4 py-2.5">
                        <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                          {formData.residentEngineerName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-sm text-slate-900">{formData.residentEngineerName}</p>
                          {formData.residentEngineerPhone && (
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{formData.residentEngineerPhone}</p>
                          )}
                        </div>
                        <span className="mr-auto text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-lg">مهندس مقيم</span>
                      </div>
                    )}
                  </div>

                  {/* Supervisors Card */}
                  <div className="rounded-2xl border-2 border-purple-200 bg-purple-50/60 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center text-sm">🧑‍💼</span>
                        <div>
                          <p className="font-black text-sm text-purple-900">المشرفون على المشروع</p>
                          <p className="text-[11px] text-purple-600">
                            {Array.isArray(formData.selectedSupervisors) && formData.selectedSupervisors.length > 0
                              ? `${formData.selectedSupervisors.length} مشرف مضاف`
                              : "لم يضاف أي مشرف بعد"}
                          </p>
                        </div>
                      </div>
                      {/* Add supervisor button */}
                      <button
                        type="button"
                        onClick={() => {
                          const name = window.prompt("أدخل اسم المشرف:");
                          if (!name?.trim()) return;
                          const current = Array.isArray(formData.selectedSupervisors) ? formData.selectedSupervisors : [];
                          handleInputChange("selectedSupervisors", [...current, name.trim()]);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors shadow-sm"
                      >
                        <span className="text-base leading-none">+</span> إضافة مشرف
                      </button>
                    </div>

                    {/* Supervisors list */}
                    <div className="space-y-2">
                      {Array.isArray(formData.selectedSupervisors) && formData.selectedSupervisors.length > 0 ? (
                        formData.selectedSupervisors.map((sup: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 bg-white/80 rounded-xl border border-purple-200 px-4 py-2.5">
                            <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-300 text-purple-700 flex items-center justify-center font-black text-sm shrink-0">
                              {idx + 1}
                            </div>
                            <input
                              value={sup}
                              onChange={(e) => {
                                const list = [...(formData.selectedSupervisors as string[])];
                                list[idx] = e.target.value;
                                handleInputChange("selectedSupervisors", list);
                              }}
                              className="flex-1 bg-transparent text-sm font-semibold text-slate-800 border-none outline-none focus:bg-purple-50 rounded-lg px-2 py-1 transition-colors"
                              placeholder="اسم المشرف..."
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const list = (formData.selectedSupervisors as string[]).filter((_, i) => i !== idx);
                                handleInputChange("selectedSupervisors", list);
                              }}
                              className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 flex items-center justify-center text-sm font-black transition-colors shrink-0"
                              title="حذف المشرف"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-purple-400">
                          <p className="text-2xl mb-2">🧑‍💼</p>
                          <p className="text-xs font-semibold">لم يتم إضافة مشرفين بعد</p>
                          <p className="text-[11px] text-purple-300 mt-0.5">استخدم زر «إضافة مشرف» أعلاه</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resident Engineer Opinion */}
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-800">ملاحظات / رأي المهندس المقيم</Label>
                    <textarea
                      value={formData.residentEngineerOpinion || ""}
                      onChange={(e) => handleInputChange("residentEngineerOpinion", e.target.value)}
                      rows={3}
                      placeholder="أدخل ملاحظات أو رأي المهندس المقيم حول سير العمل..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 text-right resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all"
                      dir="rtl"
                    />
                  </div>
                </TabsContent>

                {/* Edit Dates */}
                <TabsContent value="dates" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>مدة العقد الأصلية (أيام)</Label>
                      <Input
                        type="number"
                        value={formData.durationDays || ""}
                        onChange={(e) => handleInputChange("durationDays", Number(e.target.value))}
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ العقد (اختياري)</Label>
                      <Input
                        type="date"
                        value={formData.contractDate || ""}
                        onChange={(e) => handleInputChange("contractDate", e.target.value)}
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ المباشرة</Label>
                      <Input
                        type="date"
                        value={formData.startDate || ""}
                        onChange={(e) => handleInputChange("startDate", e.target.value)}
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ المباشرة الفعلي</Label>
                      <Input
                        type="date"
                        value={formData.actualStartDate || ""}
                        onChange={(e) => handleInputChange("actualStartDate", e.target.value)}
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ المباشرة بعد الاستئناف</Label>
                      <Input
                        type="date"
                        value={formData.resumeStartDate || ""}
                        onChange={(e) => handleInputChange("resumeStartDate", e.target.value)}
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ الإنجاز التعاقدي</Label>
                      <Input
                        type="date"
                        value={formData.plannedEndDate || ""}
                        onChange={(e) => handleInputChange("plannedEndDate", e.target.value)}
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ الإنجاز بعد المدد الإضافية</Label>
                      <Input
                        type="date"
                        value={formData.completionDateAfterAdditional || ""}
                        onChange={(e) => handleInputChange("completionDateAfterAdditional", e.target.value)}
                        className="text-right"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>مدة التوقف</Label>
                      <Input
                        value={formData.suspensionDuration || ""}
                        onChange={(e) => handleInputChange("suspensionDuration", e.target.value)}
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>مدة التنفيذ الفعلية</Label>
                      <Input
                        value={formData.actualExecutionDuration || ""}
                        onChange={(e) => handleInputChange("actualExecutionDuration", e.target.value)}
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>المدة الإضافية</Label>
                      <Input
                        value={formData.additionalDuration || ""}
                        onChange={(e) => handleInputChange("additionalDuration", e.target.value)}
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>مدة العقد بعد الاستئناف</Label>
                      <Input
                        value={formData.contractDurationAfterResume || ""}
                        onChange={(e) => handleInputChange("contractDurationAfterResume", e.target.value)}
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>المدة المتبقية من تاريخ الاستئناف</Label>
                      <Input
                        value={formData.remainingDurationFromResume || ""}
                        onChange={(e) => handleInputChange("remainingDurationFromResume", e.target.value)}
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>المدة المتبقية من تاريخ التقرير</Label>
                      <Input
                        value={formData.remainingDurationFromReport || ""}
                        onChange={(e) => handleInputChange("remainingDurationFromReport", e.target.value)}
                        className="text-right"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>تاريخ وأسباب التوقف</Label>
                    <Textarea
                      rows={2}
                      value={formData.suspensionDatesReasons || ""}
                      onChange={(e) => handleInputChange("suspensionDatesReasons", e.target.value)}
                      className="text-right"
                    />
                  </div>

                  {/* إجراءات الاستلام الأولي والنهائي واللجان والملاحظات */}
                  <div className="space-y-4 pt-3 border-t border-border/80">
                    <h4 className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      إجراءات ولجان الاستلام الأولي والنهائي
                    </h4>

                    {/* الاستلام الأولي */}
                    <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-3">
                      <span className="text-xs font-bold text-slate-800 block">إجراءات الاستلام الأولي للمشروع:</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">رقم الأمر الإداري (اختياري)</Label>
                          <Input
                            type="text"
                            placeholder="مثال: أ.د / 1234"
                            value={formData.initialHandoverOrderNo || ""}
                            onChange={(e) => handleInputChange("initialHandoverOrderNo", e.target.value)}
                            className="text-right text-xs bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">تاريخ الأمر الإداري (اختياري)</Label>
                          <Input
                            type="date"
                            value={formData.initialHandoverOrderDate || ""}
                            onChange={(e) => handleInputChange("initialHandoverOrderDate", e.target.value)}
                            className="text-right font-mono text-xs bg-white"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">تاريخ الاستلام الأولي</Label>
                          <Input
                            type="date"
                            value={formData.initialHandoverDate || ""}
                            onChange={(e) => handleInputChange("initialHandoverDate", e.target.value)}
                            className="text-right font-mono text-xs bg-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">أعضاء لجنة الاستلام الأولي (3 أعضاء)</Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <Input
                            type="text"
                            placeholder="العضو الأول (رئيس اللجنة)..."
                            value={formData.initialHandoverCommittee?.[0] ?? ""}
                            onChange={(e) => {
                              const curr = [...(formData.initialHandoverCommittee || ["", "", ""])];
                              while (curr.length < 3) curr.push("");
                              curr[0] = e.target.value;
                              handleInputChange("initialHandoverCommittee", curr);
                            }}
                            className="text-right text-xs bg-white"
                          />
                          <Input
                            type="text"
                            placeholder="العضو الثاني..."
                            value={formData.initialHandoverCommittee?.[1] ?? ""}
                            onChange={(e) => {
                              const curr = [...(formData.initialHandoverCommittee || ["", "", ""])];
                              while (curr.length < 3) curr.push("");
                              curr[1] = e.target.value;
                              handleInputChange("initialHandoverCommittee", curr);
                            }}
                            className="text-right text-xs bg-white"
                          />
                          <Input
                            type="text"
                            placeholder="العضو الثالث..."
                            value={formData.initialHandoverCommittee?.[2] ?? ""}
                            onChange={(e) => {
                              const curr = [...(formData.initialHandoverCommittee || ["", "", ""])];
                              while (curr.length < 3) curr.push("");
                              curr[2] = e.target.value;
                              handleInputChange("initialHandoverCommittee", curr);
                            }}
                            className="text-right text-xs bg-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">ملاحظات الاستلام الأولي للمشروع</Label>
                        <Textarea
                          rows={2}
                          placeholder="أدخل أي ملاحظات أو شروط تخص الاستلام الأولي..."
                          value={formData.initialHandoverNotes || ""}
                          onChange={(e) => handleInputChange("initialHandoverNotes", e.target.value)}
                          className="text-right text-xs bg-white"
                        />
                      </div>
                    </div>

                    {/* الاستلام النهائي */}
                    <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-3">
                      <span className="text-xs font-bold text-slate-800 block">إجراءات الاستلام النهائي للمشروع:</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">رقم الأمر الإداري (اختياري)</Label>
                          <Input
                            type="text"
                            placeholder="مثال: أ.د / 5678"
                            value={formData.finalHandoverOrderNo || ""}
                            onChange={(e) => handleInputChange("finalHandoverOrderNo", e.target.value)}
                            className="text-right text-xs bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">تاريخ الأمر الإداري (اختياري)</Label>
                          <Input
                            type="date"
                            value={formData.finalHandoverOrderDate || ""}
                            onChange={(e) => handleInputChange("finalHandoverOrderDate", e.target.value)}
                            className="text-right font-mono text-xs bg-white"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">تاريخ الاستلام النهائي</Label>
                          <Input
                            type="date"
                            value={formData.finalHandoverDate || ""}
                            onChange={(e) => handleInputChange("finalHandoverDate", e.target.value)}
                            className="text-right font-mono text-xs bg-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">أعضاء لجنة الاستلام النهائي (3 أعضاء)</Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <Input
                            type="text"
                            placeholder="العضو الأول (رئيس اللجنة)..."
                            value={formData.finalHandoverCommittee?.[0] ?? ""}
                            onChange={(e) => {
                              const curr = [...(formData.finalHandoverCommittee || ["", "", ""])];
                              while (curr.length < 3) curr.push("");
                              curr[0] = e.target.value;
                              handleInputChange("finalHandoverCommittee", curr);
                            }}
                            className="text-right text-xs bg-white"
                          />
                          <Input
                            type="text"
                            placeholder="العضو الثاني..."
                            value={formData.finalHandoverCommittee?.[1] ?? ""}
                            onChange={(e) => {
                              const curr = [...(formData.finalHandoverCommittee || ["", "", ""])];
                              while (curr.length < 3) curr.push("");
                              curr[1] = e.target.value;
                              handleInputChange("finalHandoverCommittee", curr);
                            }}
                            className="text-right text-xs bg-white"
                          />
                          <Input
                            type="text"
                            placeholder="العضو الثالث..."
                            value={formData.finalHandoverCommittee?.[2] ?? ""}
                            onChange={(e) => {
                              const curr = [...(formData.finalHandoverCommittee || ["", "", ""])];
                              while (curr.length < 3) curr.push("");
                              curr[2] = e.target.value;
                              handleInputChange("finalHandoverCommittee", curr);
                            }}
                            className="text-right text-xs bg-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">ملاحظات الاستلام النهائي للمشروع</Label>
                        <Textarea
                          rows={2}
                          placeholder="أدخل أي ملاحظات أو تفاصيل تخص الاستلام النهائي وإبراء الذمة..."
                          value={formData.finalHandoverNotes || ""}
                          onChange={(e) => handleInputChange("finalHandoverNotes", e.target.value)}
                          className="text-right text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Edit Financials */}
                <TabsContent value="financials" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700">قيمة العقد الأساسية (د.ع)</Label>
                      <Input
                        type="number"
                        value={formData.contractValue || ""}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          const coList = Array.isArray(formData.changeOrdersList) ? formData.changeOrdersList : [];
                          const coTotal = coList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                          handleInputChange("contractValue", val);
                          handleInputChange("workCost", val + coTotal);
                        }}
                        className="text-right font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-blue-900">كلفة العمل الإجمالية (العقد + الغيار) (د.ع)</Label>
                      <Input
                        type="number"
                        readOnly
                        value={Number(formData.contractValue || 0) + (Array.isArray(formData.changeOrdersList) ? formData.changeOrdersList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) : Number(formData.changeOrdersTotalAmount || 0))}
                        className="text-right font-mono font-bold bg-blue-50 border-blue-200 text-blue-900 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Dynamic Change Orders Block */}
                  <div className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200 space-y-4 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                          <Layers size={18} />
                        </div>
                        <div>
                          <span className="text-sm font-black text-slate-900 block">أوامر الغيار للمشروع ({(formData.changeOrdersList || []).length} أمر)</span>
                          <span className="text-xs text-slate-500">حدد عدد الأوامر وسجل رقم وتاريخ ومبلغ كل أمر منفرد</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-700">عدد الأوامر:</span>
                          <Input
                            type="number"
                            min="0"
                            max="25"
                            value={(formData.changeOrdersList || []).length}
                            onChange={(e) => {
                              const newCount = Math.max(0, Math.min(25, parseInt(e.target.value) || 0));
                              let list = Array.isArray(formData.changeOrdersList) ? [...formData.changeOrdersList] : [];
                              if (newCount > list.length) {
                                const toAdd = newCount - list.length;
                                for (let i = 0; i < toAdd; i++) {
                                  const idx = list.length + 1;
                                  list.push({
                                    id: `CO-${Date.now()}-${idx}`,
                                    orderNo: `أمر غيار رقم ${idx}`,
                                    orderDate: new Date().toISOString().split("T")[0],
                                    amount: 0,
                                    notes: "",
                                  });
                                }
                              } else if (newCount < list.length) {
                                list = list.slice(0, newCount);
                              }
                              const coTotal = list.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                              const contractVal = Number(formData.contractValue || 0);
                              const summaryStr = list.map((item, idx) => `${item.orderNo || `أمر ${idx + 1}`}: ${formatDateDMY(item.orderDate)} (${Number(item.amount || 0).toLocaleString()} د.ع)`).join(" | ");

                              handleInputChange("changeOrdersList", list);
                              handleInputChange("changeOrdersCount", list.length);
                              handleInputChange("changeOrdersTotalAmount", coTotal);
                              handleInputChange("changeOrderSingleAmount", list.length > 0 ? Number(list[0].amount || 0) : 0);
                              handleInputChange("changeOrderNoAndDate", summaryStr);
                              handleInputChange("workCost", contractVal + coTotal);
                            }}
                            className="w-16 h-9 text-center font-black text-purple-700 border-purple-300 bg-white"
                          />
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            let list = Array.isArray(formData.changeOrdersList) ? [...formData.changeOrdersList] : [];
                            const idx = list.length + 1;
                            list.push({
                              id: `CO-${Date.now()}-${idx}`,
                              orderNo: `أمر غيار رقم ${idx}`,
                              orderDate: new Date().toISOString().split("T")[0],
                              amount: 0,
                              notes: "",
                            });
                            const coTotal = list.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                            const contractVal = Number(formData.contractValue || 0);
                            const summaryStr = list.map((item, idx) => `${item.orderNo || `أمر ${idx + 1}`}: ${formatDateDMY(item.orderDate)} (${Number(item.amount || 0).toLocaleString()} د.ع)`).join(" | ");

                            handleInputChange("changeOrdersList", list);
                            handleInputChange("changeOrdersCount", list.length);
                            handleInputChange("changeOrdersTotalAmount", coTotal);
                            handleInputChange("changeOrderSingleAmount", list.length > 0 ? Number(list[0].amount || 0) : 0);
                            handleInputChange("changeOrderNoAndDate", summaryStr);
                            handleInputChange("workCost", contractVal + coTotal);
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5 cursor-pointer"
                        >
                          <Plus size={14} /> إضافة أمر غيار
                        </Button>
                      </div>
                    </div>

                    {/* Change Orders List */}
                    {(!formData.changeOrdersList || formData.changeOrdersList.length === 0) ? (
                      <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-white text-slate-500 text-xs">
                        لا توجد أوامر غيار مضافة لهذا المشروع حتى الآن (العدد = 0)
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formData.changeOrdersList.map((item, index) => (
                          <div key={item.id || index} className="p-3.5 rounded-xl border border-purple-200 bg-white shadow-2xs space-y-3">
                            <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                              <span className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-mono">
                                  {index + 1}
                                </span>
                                أمر الغيار ({index + 1} من {formData.changeOrdersList.length})
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const list = (formData.changeOrdersList || []).filter((_, i) => i !== index);
                                  const coTotal = list.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                                  const contractVal = Number(formData.contractValue || 0);
                                  const summaryStr = list.map((item, idx) => `${item.orderNo || `أمر ${idx + 1}`}: ${formatDateDMY(item.orderDate)} (${Number(item.amount || 0).toLocaleString()} د.ع)`).join(" | ");

                                  handleInputChange("changeOrdersList", list);
                                  handleInputChange("changeOrdersCount", list.length);
                                  handleInputChange("changeOrdersTotalAmount", coTotal);
                                  handleInputChange("changeOrderSingleAmount", list.length > 0 ? Number(list[0].amount || 0) : 0);
                                  handleInputChange("changeOrderNoAndDate", summaryStr);
                                  handleInputChange("workCost", contractVal + coTotal);
                                }}
                                className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold gap-1 cursor-pointer"
                              >
                                <Trash2 size={13} /> حذف الأمر
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs font-bold text-slate-700">رقم/مسمى أمر الغيار</Label>
                                <Input
                                  type="text"
                                  placeholder={`مثال: أمر غيار رقم ${index + 1}`}
                                  value={item.orderNo || ""}
                                  onChange={(e) => {
                                    const list = [...(formData.changeOrdersList || [])];
                                    list[index] = { ...list[index], orderNo: e.target.value };
                                    const summaryStr = list.map((it, idx) => `${it.orderNo || `أمر ${idx + 1}`}: ${formatDateDMY(it.orderDate)} (${Number(it.amount || 0).toLocaleString()} د.ع)`).join(" | ");

                                    handleInputChange("changeOrdersList", list);
                                    handleInputChange("changeOrderNoAndDate", summaryStr);
                                  }}
                                  className="text-right text-xs bg-white"
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs font-bold text-slate-700">تاريخ أمر الغيار</Label>
                                <Input
                                  type="date"
                                  value={item.orderDate || ""}
                                  onChange={(e) => {
                                    const list = [...(formData.changeOrdersList || [])];
                                    list[index] = { ...list[index], orderDate: e.target.value };
                                    const summaryStr = list.map((it, idx) => `${it.orderNo || `أمر ${idx + 1}`}: ${formatDateDMY(it.orderDate)} (${Number(it.amount || 0).toLocaleString()} د.ع)`).join(" | ");

                                    handleInputChange("changeOrdersList", list);
                                    handleInputChange("changeOrderNoAndDate", summaryStr);
                                  }}
                                  className="text-right font-mono text-xs bg-white"
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs font-bold text-slate-700">مبلغ أمر الغيار المنفرد (د.ع)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={item.amount || ""}
                                  onChange={(e) => {
                                    const amt = Number(e.target.value) || 0;
                                    const list = [...(formData.changeOrdersList || [])];
                                    list[index] = { ...list[index], amount: amt };
                                    const coTotal = list.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
                                    const contractVal = Number(formData.contractValue || 0);
                                    const summaryStr = list.map((it, idx) => `${it.orderNo || `أمر ${idx + 1}`}: ${formatDateDMY(it.orderDate)} (${Number(it.amount || 0).toLocaleString()} د.ع)`).join(" | ");

                                    handleInputChange("changeOrdersList", list);
                                    handleInputChange("changeOrdersTotalAmount", coTotal);
                                    handleInputChange("changeOrderSingleAmount", list.length > 0 ? Number(list[0].amount || 0) : 0);
                                    handleInputChange("changeOrderNoAndDate", summaryStr);
                                    handleInputChange("workCost", contractVal + coTotal);
                                  }}
                                  className="text-right font-mono text-xs font-bold text-emerald-700 bg-white"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </form>
          ) : (
            /* DETAILED VIEWER */
            <div className="space-y-6 pt-2">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid grid-cols-4 w-full bg-muted/60 p-1 rounded-lg">
                  <TabsTrigger value="overview" className="text-xs md:text-sm font-bold">ملخص فني</TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs md:text-sm font-bold">الجدولة والمدد</TabsTrigger>
                  <TabsTrigger value="money" className="text-xs md:text-sm font-bold">البيانات المالية</TabsTrigger>
                  <TabsTrigger value="reports" className="text-xs md:text-sm font-bold flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    التقارير الميدانية
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Overview */}
                <TabsContent value="overview" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border border-muted/50 shadow-sm bg-card">
                      <CardHeader className="py-3 bg-muted/20 border-b">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <Building className="h-4 w-4 text-primary" />
                          معلومات العقد
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3 text-sm">
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">اسم المشروع:</span><span className="font-semibold">{selectedProject?.name}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">الشركة المنفذة:</span><span className="font-semibold text-primary">{selectedProject?.contractor}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">الموقع التفصيلي:</span><span>{selectedProject?.location || "—"}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">اسم المركز:</span><span className="font-semibold">{selectedProject?.centerName || "—"}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">الجهة الممولة للمشروع:</span><span className="font-semibold text-blue-700">{selectedProject?.fundingSource || "—"}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">طريقة الإحالة:</span><span className="font-bold text-slate-800">{selectedProject?.referralMethod || "—"}</span></div>
                        {selectedProject?.referralNo && (
                          <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">رقم الإحالة:</span><span className="font-mono font-bold text-slate-800">{selectedProject.referralNo}</span></div>
                        )}
                        {selectedProject?.referralDate && (
                          <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">تاريخ الإحالة:</span><span className="font-semibold text-slate-800">{formatDateDMY(selectedProject.referralDate)}</span></div>
                        )}
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">رقم العقد:</span><span className="font-mono font-medium">{selectedProject?.contractNo || "—"}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">المهندس المقيم:</span><span className="font-semibold text-primary">{selectedProject?.residentEngineerName || "—"}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">المشرفون المرافقون:</span><span className="font-semibold">{selectedProject?.selectedSupervisors?.length ? selectedProject.selectedSupervisors.join(" ، ") : "—"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">الإحداثيات الجغرافية:</span><span className="font-mono">{selectedProject?.lat}°N, {selectedProject?.lng}°E</span></div>
                      </CardContent>
                    </Card>

                    <Card className="border border-muted/50 shadow-sm bg-card">
                      <CardHeader className="py-3 bg-muted/20 border-b">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          مؤشرات الإنجاز
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">نسبة الإنجاز الفعلي:</span>
                            <span className="font-bold">{selectedProject?.actualProgress || 0}%</span>
                          </div>
                          <Progress value={selectedProject?.actualProgress || 0} className="h-3" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">نسبة الإنجاز المخطط:</span>
                            <span className="font-semibold">{selectedProject?.plannedProgress || 0}%</span>
                          </div>
                          <Progress value={selectedProject?.plannedProgress || 0} className="h-2 bg-muted-foreground/10" />
                        </div>
                        {selectedProject && (selectedProject.plannedProgress || 0) - (selectedProject.actualProgress || 0) > 0 && (
                          <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <div>
                              يوجد تأخير بنسبة {((selectedProject.plannedProgress || 0) - (selectedProject.actualProgress || 0))}% عن المخطط الزمني المستهدف.
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {selectedProject?.delayReasons && (
                    <Card className="border border-warning/30 bg-warning/5">
                      <CardContent className="p-4 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="font-semibold text-warning-foreground text-sm">أسباب التأخير المسجلة</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">{selectedProject.delayReasons}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Tab: Timeline & Durations */}
                <TabsContent value="timeline" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border border-muted/50 bg-card">
                      <CardHeader className="py-3 bg-muted/10 border-b">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          التواريخ الأساسية والتعاقدية
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3 text-sm">
                        {selectedProject?.referralDate && (
                          <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">تاريخ الإحالة:</span><span className="font-semibold text-slate-800">{formatDateDMY(selectedProject.referralDate)}</span></div>
                        )}
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">تاريخ العقد:</span><span className="font-semibold text-slate-800">{formatDateDMY(selectedProject?.contractDate) || "—"}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">تاريخ المباشرة بالعمل:</span><span>{formatDateDMY(selectedProject?.startDate) || "—"}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">تاريخ الإنجاز التعاقدي:</span><span>{formatDateDMY(selectedProject?.plannedEndDate) || "—"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">تاريخ الإنجاز بعد المدد الإضافية:</span><span className="font-semibold text-primary">{formatDateDMY(selectedProject?.completionDateAfterAdditional) || "—"}</span></div>
                      </CardContent>
                    </Card>

                    <Card className="border border-muted/50 bg-card">
                      <CardHeader className="py-3 bg-muted/10 border-b">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          المدد والزمن المتبقي
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3 text-sm">
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">مدة العقد الأصلية:</span><span>{selectedProject?.durationDays} يوم</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">تاريخ الإيقاف:</span><span className="font-semibold text-rose-700">{formatDateDMY(selectedProject?.suspensionDate) || "—"}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">تاريخ المباشرة بعد الاستئناف:</span><span className="font-semibold text-emerald-700">{formatDateDMY(selectedProject?.resumeStartDate) || "—"}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">مدة التوقف:</span><span>{selectedProject?.suspensionDuration || "—"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">المدة الإضافية الممنوحة:</span><span>{selectedProject?.additionalDuration || "—"}</span></div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border border-muted/50 bg-card col-span-1 md:col-span-2">
                    <CardHeader className="py-3 bg-muted/10 border-b">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        إجراءات الاستلام واللجان
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2 md:border-l md:pl-4">
                        {selectedProject?.initialHandoverOrderNo && (
                          <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">رقم الأمر الإداري:</span><span className="font-semibold text-sky-800">{selectedProject.initialHandoverOrderNo}</span></div>
                        )}
                        {selectedProject?.initialHandoverOrderDate && (
                          <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">تاريخ الأمر الإداري:</span><span className="font-semibold">{formatDateDMY(selectedProject.initialHandoverOrderDate)}</span></div>
                        )}
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">تاريخ الاستلام الأولي:</span><span className="font-semibold">{formatDateDMY(selectedProject?.initialHandoverDate) || "—"}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">لجنة الاستلام الأولي:</span><span className="font-semibold text-emerald-700">{selectedProject?.initialHandoverCommittee?.filter(Boolean).length ? selectedProject.initialHandoverCommittee.filter(Boolean).join(" ، ") : "—"}</span></div>
                        {selectedProject?.initialHandoverNotes && (
                          <div className="pt-1">
                            <span className="text-xs text-muted-foreground block mb-1">ملاحظات الاستلام الأولي:</span>
                            <p className="text-xs font-medium text-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50 leading-relaxed whitespace-pre-wrap">{selectedProject.initialHandoverNotes}</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        {selectedProject?.finalHandoverOrderNo && (
                          <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">رقم الأمر الإداري:</span><span className="font-semibold text-emerald-800">{selectedProject.finalHandoverOrderNo}</span></div>
                        )}
                        {selectedProject?.finalHandoverOrderDate && (
                          <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">تاريخ الأمر الإداري:</span><span className="font-semibold">{formatDateDMY(selectedProject.finalHandoverOrderDate)}</span></div>
                        )}
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">تاريخ الاستلام النهائي:</span><span className="font-semibold">{formatDateDMY(selectedProject?.finalHandoverDate) || "—"}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">لجنة الاستلام النهائي:</span><span className="font-semibold text-emerald-700">{selectedProject?.finalHandoverCommittee?.filter(Boolean).length ? selectedProject.finalHandoverCommittee.filter(Boolean).join(" ، ") : "—"}</span></div>
                        {selectedProject?.finalHandoverNotes && (
                          <div className="pt-1">
                            <span className="text-xs text-muted-foreground block mb-1">ملاحظات الاستلام النهائي:</span>
                            <p className="text-xs font-medium text-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50 leading-relaxed whitespace-pre-wrap">{selectedProject.finalHandoverNotes}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {selectedProject?.suspensionDatesReasons && (
                    <Card className="border border-destructive/20 bg-destructive/5">
                      <CardContent className="p-4 text-sm space-y-1">
                        <h4 className="font-bold text-destructive flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4" />
                          تفاصيل وتواريخ التوقفات وأسبابها
                        </h4>
                        <p className="text-muted-foreground leading-relaxed mt-1">{selectedProject.suspensionDatesReasons}</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Tab: Financials */}
                <TabsContent value="money" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border border-slate-200 bg-white shadow-xs">
                      <CardHeader className="py-3 bg-slate-50 border-b">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                          <DollarSign className="h-4 w-4 text-blue-600" />
                          التكاليف والمبالغ التعاقدية
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3 text-sm">
                        <div className="flex justify-between border-b pb-2">
                          <span className="text-slate-500 font-medium">قيمة العقد الأساسية:</span>
                          <span className="font-bold text-slate-900 font-mono">
                            {formatAmountWithCurrency(selectedProject?.contractValue, selectedProject?.currency)}
                          </span>
                        </div>

                        <div className="flex justify-between border-b pb-2">
                          <span className="text-slate-500 font-medium">مجموع مبالغ أوامر الغيار:</span>
                          <span className="font-bold text-blue-700 font-mono">
                            {formatAmountWithCurrency(selectedProject?.changeOrdersTotalAmount, selectedProject?.currency)}
                          </span>
                        </div>

                        <div className="flex justify-between pt-1">
                          <span className="text-slate-700 font-bold">كلفة العمل الإجمالية (العقد + الغيار):</span>
                          <span className="font-black text-emerald-700 font-mono text-base">
                            {formatAmountWithCurrency(selectedProject?.workCost || (Number(selectedProject?.contractValue || 0) + Number(selectedProject?.changeOrdersTotalAmount || 0)), selectedProject?.currency)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-slate-200 bg-white shadow-xs">
                      <CardHeader className="py-3 bg-slate-50 border-b">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                          <FileCheck className="h-4 w-4 text-blue-600" />
                          تفاصيل وأوامر الغيار ({Array.isArray(selectedProject?.changeOrdersList) ? selectedProject?.changeOrdersList.length : (selectedProject?.changeOrdersCount || 0)} أمر)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3 text-sm">
                        {Array.isArray(selectedProject?.changeOrdersList) && selectedProject.changeOrdersList.length > 0 ? (
                          <div className="space-y-2">
                            {selectedProject.changeOrdersList.map((co, idx) => (
                              <div key={idx} className="p-2.5 rounded-xl border border-purple-100 bg-purple-50/50 flex justify-between items-center text-xs">
                                <div>
                                  <div className="font-bold text-purple-950">{co.orderNo || `أمر غيار رقم ${idx + 1}`}</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    {co.orderDate ? `التاريخ: ${formatDateDMY(co.orderDate)}` : "بدون تاريخ"}
                                    {co.notes ? ` • ${co.notes}` : ""}
                                  </div>
                                </div>
                                <div className="font-extrabold text-emerald-700 font-mono text-sm">
                                  {formatAmountWithCurrency(co.amount, selectedProject?.currency)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between border-b pb-2">
                              <span className="text-slate-500 font-medium">عدد أوامر الغيار:</span>
                              <span className="font-bold text-slate-900">{selectedProject?.changeOrdersCount || 0} أمر</span>
                            </div>

                            <div className="flex justify-between border-b pb-2">
                              <span className="text-slate-500 font-medium">رقم وتاريخ أمر الغيار:</span>
                              <span className="font-bold text-slate-900">{selectedProject?.changeOrderNoAndDate || "—"}</span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-slate-500 font-medium">مبلغ أمر الغيار:</span>
                              <span className="font-bold text-blue-700 font-mono">
                                {(selectedProject?.changeOrderSingleAmount || 0).toLocaleString("en-US")} د.ع
                              </span>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Tab: Progress Reports */}
                <TabsContent value="reports" className="space-y-4 pt-4">
                  {(() => {
                    const projectReports = reports.filter(
                      (r) => r.projectId === selectedProject?.id
                    );
                    if (projectReports.length === 0) {
                      return (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                          <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                          <h4 className="font-bold text-sm text-slate-700">لا توجد تقارير متابعة ميدانية مسجلة لهذا المشروع</h4>
                          <p className="text-xs text-slate-500">لم يتم إضافة تقارير تقدم عمل ميداني لهذا المشروع بعد.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Activity className="w-4 h-4 text-emerald-600" />
                            سجل تقارير التقدم الميداني المعتمدة ({projectReports.length} تقارير):
                          </h4>
                        </div>
                        <div className="space-y-3">
                          {projectReports.map((rep, index) => {
                            const repNo = projectReports.length - index;
                            return (
                              <div
                                key={rep.id || index}
                                className="bg-white border-2 border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3"
                              >
                                <div className="flex justify-between items-center border-b pb-2 flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-blue-100 text-blue-900 font-bold text-xs">
                                      تقرير #{repNo}
                                    </Badge>
                                    <span className="text-xs font-bold text-slate-700 font-mono">
                                      {formatDateDMY(rep.date)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-emerald-600 text-white font-mono text-xs">
                                      إنجاز: {rep.actualProgress}%
                                    </Badge>
                                  </div>
                                </div>

                                <div className="text-xs space-y-2 text-slate-800">
                                  <div>
                                    <span className="font-extrabold text-slate-900 block mb-0.5">المهندس المقيم:</span>
                                    <span className="text-slate-600 font-medium">{rep.engineer || "—"}</span>
                                  </div>

                                  <div>
                                    <span className="font-extrabold text-emerald-900 block mb-0.5">الأعمال المنجزة:</span>
                                    <p className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 text-emerald-950 font-medium leading-relaxed">
                                      {rep.completedWorks || "تم تنفيذ الأعمال وفق المواصفات المعتمدة."}
                                    </p>
                                  </div>

                                  {rep.upcomingWorks && (
                                    <div>
                                      <span className="font-extrabold text-indigo-900 block mb-0.5">الأعمال القادمة:</span>
                                      <p className="bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 text-indigo-950 leading-relaxed">
                                        {rep.upcomingWorks}
                                      </p>
                                    </div>
                                  )}

                                  {rep.obstaclesText && (
                                    <div>
                                      <span className="font-extrabold text-rose-900 block mb-0.5">المعوقات والمشاكل:</span>
                                      <p className="bg-rose-50/70 p-2.5 rounded-xl border border-rose-100 text-rose-950 leading-relaxed">
                                        {rep.obstaclesText}
                                      </p>
                                    </div>
                                  )}

                                  {rep.notes && (
                                    <div>
                                      <span className="font-extrabold text-blue-900 block mb-0.5">ملاحظات إضافية:</span>
                                      <p className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-100 text-blue-950 leading-relaxed">
                                        {rep.notes}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-end gap-2 border-t pt-2.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copySingleFieldReportText(rep, selectedProject, repNo)}
                                    className="h-7 text-[11px] gap-1 font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200 rounded-lg cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5" /> نسخ النص
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => printSingleFieldReport(rep, selectedProject, repNo)}
                                    className="h-7 text-[11px] gap-1 font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border-blue-200 rounded-lg cursor-pointer"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-blue-600" /> طباعة / PDF
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => shareSingleFieldReportWhatsApp(rep, selectedProject, repNo)}
                                    className="h-7 text-[11px] gap-1 font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 rounded-lg cursor-pointer"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> واتساب
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Custom Deletion Confirmation Dialog styled into the system UI */}
      <Dialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent className="sm:max-w-md text-right border-border shadow-2xl rounded-2xl" dir="rtl">
          <DialogHeader className="text-right border-b pb-3">
            <DialogTitle className="text-lg font-extrabold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              تأكيد حذف المشروع
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-2">
              هل أنت متأكد من رغبتك في حذف هذا المشروع نهائياً؟
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs text-muted-foreground leading-relaxed">
            سيتم إزالة المشروع من كافة سجلات وإحصائيات النظام ولا يمكن استرجاعه لاحقاً.
          </div>
          <DialogFooter className="flex gap-2 sm:justify-start pt-3 border-t mt-2">
            <Button
              variant="destructive"
              onClick={executeDeleteProject}
              className="gap-2 font-bold text-white bg-destructive hover:bg-destructive/90 px-5"
            >
              <Trash2 className="h-4 w-4" /> نعم، احذف المشروع
            </Button>
            <Button
              variant="outline"
              onClick={() => setProjectToDelete(null)}
              className="px-5 font-semibold"
            >
              تراجع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── CONFIRM REPORT DELETION DIALOG ────────────────────────────────────── */}
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

      {/* ─── PAUSE / STOP CONFIRMATION DIALOG ────────────────────────────────────── */}
      <Dialog
        open={Boolean(projectToPause)}
        onOpenChange={(open) => {
          if (!open) {
            setProjectToPause(null);
            setPauseReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px] text-right rounded-2xl border border-rose-200 dark:border-rose-900 p-0 overflow-hidden shadow-2xl" dir="rtl">
          <DialogHeader className="p-5 bg-gradient-to-r from-rose-50 to-rose-100 dark:from-rose-950 dark:to-rose-900 border-b border-rose-200 dark:border-rose-800 text-right">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-md shrink-0">
                <PauseCircle className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-rose-950 dark:text-rose-100">
                  إيقاف المشروع
                </DialogTitle>
                <DialogDescription className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 font-bold">
                  {projectToPause?.name} ({projectToPause?.contractNo})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-4 text-right">
            <div className="p-3 bg-rose-50 dark:bg-rose-900/30 rounded-xl border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-100 flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block mb-1 text-rose-950 dark:text-rose-50">هل أنت متأكد من إيقاف هذا المشروع؟</span>
                <span className="leading-relaxed">سيتم تغيير حالة المشروع إلى (متوقف) وتسجيل تاريخ وسبب الإيقاف، وتمييز الصف باللون الأحمر لسهولة المتابعة.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-rose-600" />
                  تاريخ الإيقاف <span className="text-rose-600 font-bold">*</span>
                </Label>
                <Input
                  type="date"
                  value={pauseDate}
                  onChange={(e) => setPauseDate(e.target.value)}
                  className="text-xs font-bold border-rose-200 dark:border-rose-800 focus-visible:ring-rose-500 rounded-xl p-2.5 text-right"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  رقم العقد
                </Label>
                <Input
                  disabled
                  value={projectToPause?.contractNo || "—"}
                  className="text-xs bg-muted/50 border-slate-200 rounded-xl p-2.5 text-right font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                سبب إيقاف المشروع والتفاصيل <span className="text-rose-600 font-bold">*</span>
              </Label>
              <Textarea
                rows={3}
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="أدخل سبب وتفاصيل إيقاف أو توقف العمل بالمشروع..."
                className="text-xs border-rose-200 dark:border-rose-800 focus-visible:ring-rose-500 rounded-xl p-3 leading-relaxed text-right"
              />
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2" dir="rtl">
            <Button
              variant="outline"
              onClick={() => {
                setProjectToPause(null);
                setPauseReason("");
              }}
              className="rounded-xl text-xs font-bold px-4"
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmPause}
              disabled={!pauseReason.trim() || !pauseDate}
              className="rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-md px-5"
            >
              <PauseCircle className="h-4 w-4" />
              تأكيد الإيقاف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── RESUME WORK CONFIRMATION DIALOG ────────────────────────────────────── */}
      <Dialog
        open={Boolean(projectToResume)}
        onOpenChange={(open) => {
          if (!open) {
            setProjectToResume(null);
            setResumeNotes("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px] text-right rounded-2xl border border-emerald-200 dark:border-emerald-900 p-0 overflow-hidden shadow-2xl" dir="rtl">
          <DialogHeader className="p-5 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-b border-emerald-200 dark:border-emerald-800 text-right">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md shrink-0">
                <PlayCircle className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-emerald-950 dark:text-emerald-100">
                  استئناف وتنشيط المشروع
                </DialogTitle>
                <DialogDescription className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5 font-bold">
                  {projectToResume?.name} ({projectToResume?.contractNo})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-4 text-right">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-100 flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block mb-1 text-emerald-950 dark:text-emerald-50">إعادة نشاط العمل في المشروع</span>
                <span className="leading-relaxed">سيتم تغيير حالة المشروع من (متوقف) إلى (قيد التنفيذ)، وتحديث تاريخ المباشرة بعد الاستئناف بشكل رسمي.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                  تاريخ الاستئناف <span className="text-emerald-600 font-bold">*</span>
                </Label>
                <Input
                  type="date"
                  value={resumeDate}
                  onChange={(e) => setResumeDate(e.target.value)}
                  className="text-xs font-bold border-emerald-200 dark:border-emerald-800 focus-visible:ring-emerald-500 rounded-xl p-2.5 text-right"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  رقم العقد
                </Label>
                <Input
                  disabled
                  value={projectToResume?.contractNo || "—"}
                  className="text-xs bg-muted/50 border-slate-200 rounded-xl p-2.5 text-right font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                ملاحظات أو كتاب الاستئناف <span className="text-muted-foreground font-normal">(اختياري)</span>
              </Label>
              <Textarea
                rows={3}
                value={resumeNotes}
                onChange={(e) => setResumeNotes(e.target.value)}
                placeholder="أدخل أي ملاحظات، رقم امر الاستئناف، أو تفاصيل مباشرة العمل..."
                className="text-xs border-emerald-200 dark:border-emerald-800 focus-visible:ring-emerald-500 rounded-xl p-3 leading-relaxed text-right"
              />
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2" dir="rtl">
            <Button
              variant="outline"
              onClick={() => {
                setProjectToResume(null);
                setResumeNotes("");
              }}
              className="rounded-xl text-xs font-bold px-4"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleConfirmResume}
              disabled={!resumeDate}
              className="rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-md px-5"
            >
              <PlayCircle className="h-4 w-4" />
              تأكيد الاستئناف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Share Dialog (WhatsApp & Official PDF Document) */}
      <ProjectShareDialog
        project={projectToShare}
        open={!!projectToShare}
        onClose={() => setProjectToShare(null)}
      />
    </div>
  );
}
