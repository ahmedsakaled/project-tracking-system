import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  MapPin, Maximize2, Minimize2, RotateCcw, Target, Sparkles,
  Trophy, CheckCircle2, Clock, AlertTriangle, Construction,
  Building2, DollarSign, Calendar, FileText,
  Filter, Eye, Layers, Globe, Info as InfoIcon, X, Search,
  Phone, ExternalLink, Navigation, Compass, Check, Copy,
  ListFilter, Map as MapIcon, ChevronRight, Plus, CheckCircle,
  HelpCircle, LocateFixed, Zap, Crosshair, Edit3, CheckCheck,
  User, Wrench, Banknote, ClipboardList, Users, TrendingUp,
  AlertCircle, CheckSquare, Hash, ScrollText, Star
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  DialogPortal, DialogOverlay
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  STATUS_LABEL, ANBAR_DISTRICTS,
  type Project, type ProjectStatus,
  getStoredProjects, saveStoredProjects,
} from "@/lib/mock-data";
import { getProjectsFromSupabase, saveProjectToSupabase } from "@/lib/supabase-db";
import { formatDateDMY } from "@/components/AddProjectWizard";
import { logActivity } from "@/lib/activity-logger";

export const Route = createFileRoute("/_app/gis")({
  component: GisPage,
});

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { color: string; label: string; icon: string; bg: string }> = {
  completed: { color: "#22C55E", label: "منجزة",        icon: "✔",  bg: "#F0FDF4" },
  ongoing:   { color: "#3B82F6", label: "قيد التنفيذ",  icon: "⚙",  bg: "#EFF6FF" },
  delayed:   { color: "#F59E0B", label: "متأخرة",        icon: "⏳", bg: "#FFFBEB" },
  stopped:   { color: "#EF4444", label: "متوقفة",        icon: "⏸", bg: "#FEF2F2" },
  not_started:{ color: "#8B5CF6",label: "لم تبدأ",      icon: "○",  bg: "#F5F3FF" },
};

// Normalise any status → one of the 3 visual buckets
function visualBucket(p: Project): "completed" | "ongoing" | "stopped" {
  if (p.status === "completed" || Number(p.actualProgress ?? 0) >= 100) return "completed";
  if (p.status === "stopped") return "stopped";
  return "ongoing";
}

// ─── SVG icon paths per project type ──────────────────────────────────────────
const TYPE_SVG: Record<string, string> = {
  water_tank:    `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path stroke-linecap="round" stroke-width="2" d="M6 7V5a2 2 0 014 0v2M14 7V5a2 2 0 014 0v2"/>`,
  well:          `<circle cx="12" cy="12" r="3" stroke-width="2"/><path stroke-linecap="round" stroke-width="2" d="M12 2v3M12 19v3M2 12h3M19 12h3"/>`,
  pipeline:      `<path stroke-linecap="round" stroke-width="2" d="M3 12h18M3 6h18M3 18h18"/><rect x="7" y="3" width="10" height="4" rx="1" stroke-width="2"/><rect x="7" y="17" width="10" height="4" rx="1" stroke-width="2"/>`,
  treatment:     `<rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2"/><path stroke-linecap="round" stroke-width="2" d="M9 3v18M3 9h6M3 15h6"/>`,
  building:      `<path stroke-linecap="round" stroke-width="2" d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/>`,
  investment:    `<path stroke-linecap="round" stroke-width="2" d="M2 20h20M4 20V10l8-6 8 6v10M10 20v-5h4v5"/>`,
  non_investment:`<path stroke-linecap="round" stroke-width="2" d="M14.7 6.3a1 1 0 010 1.4L7.4 15H5v-2.4l7.3-7.3a1 1 0 011.4 0zM12 4l3 3M5 19h14"/>`,
};
const DEFAULT_SVG = `<path stroke-linecap="round" stroke-width="2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>`;

// Anbar defaults
export const ANBAR_BOUNDS: [[number, number], [number, number]] = [
  [31.0, 39.0], // جنوب غرب الأنبار (النخيب والرطبة)
  [34.9, 44.4], // شمال شرق الأنبار (القائم والفلوجة والكرمة)
];
export const ANBAR_CENTER: [number, number] = [33.4, 42.6];
export const ANBAR_DEFAULT_ZOOM = 8;

// ─── البحث الذكي عن قضاء الأنبار المطابق ───────────────────────────────────────
export function findAnbarDistrict(nameOrId?: string): typeof ANBAR_DISTRICTS[0] {
  if (!nameOrId) return ANBAR_DISTRICTS[0]; // Ramadi by default
  const clean = nameOrId.trim().replace(/^قضاء\s+/, "").trim();
  const found = ANBAR_DISTRICTS.find(
    (d) =>
      d.name === clean ||
      d.id === clean ||
      d.fullName.includes(clean) ||
      clean.includes(d.name) ||
      d.name.includes(clean)
  );
  return found || ANBAR_DISTRICTS[0];
}

// ─── التحقق من صحة واستخراج إحداثيات المشروع وضمان وقوعها داخل نطاق العراق ومحافظة الأنبار
export function getProjectCoords(p: Project): [number, number] | null {
  let lat = Number(p.lat);
  let lng = Number(p.lng);
  if (!p.lat || !p.lng || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;

  // معالجة حالة إدخال الإحداثيات مقلوبة بالخطأ (خط الطول مكان خط العرض والعكس):
  if (lat >= 38.0 && lat <= 48.0 && lng >= 29.0 && lng <= 37.0) {
    const temp = lat;
    lat = lng;
    lng = temp;
  }

  // استبعاد الإحداثيات التي تقع خارج نطاق العراق ومحافظة الأنبار
  if (lat < 29.0 || lat > 38.0 || lng < 38.0 || lng > 48.0) {
    return null;
  }

  return [lat, lng];
}

export function hasCoords(p: Project): boolean {
  return getProjectCoords(p) !== null;
}

// ─── Build marker HTML ─────────────────────────────────────────────────────────
function buildMarkerHtml(p: Project, isSel: boolean): string {
  const bucket = visualBucket(p);
  const cfg = STATUS_CFG[bucket] ?? STATUS_CFG.ongoing;
  const color = cfg.color;
  const progress = Math.round(Number(p.actualProgress ?? 0));
  const iconPath = TYPE_SVG[p.type ?? ""] ?? DEFAULT_SVG;
  const safeId = p.id.replace(/\W/g, "");

  const radarPulseHtml = isSel
    ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                   width:74px;height:74px;border-radius:50%;
                   background:radial-gradient(circle, rgba(59,130,246,0.45) 0%, rgba(37,99,235,0.1) 70%, transparent 100%);
                   border:2px solid #3B82F6;
                   animation:gisRadarPulse 1.8s cubic-bezier(0.25, 1, 0.5, 1) infinite;
                   pointer-events:none;z-index:-1;"></div>`
    : "";

  if (bucket === "completed") {
    const sz = isSel ? 52 : 44;
    const hSz = isSel ? 64 : 54;
    return `
      <div style="position:relative;width:${sz}px;height:${hSz}px;
                  filter:drop-shadow(0 6px 14px rgba(0,0,0,0.35));
                  transform:translate(-50%,-100%);z-index:${isSel ? 9999 : 500};
                  transition:all 0.3s cubic-bezier(0.4,0,0.2,1);">
        ${radarPulseHtml}
        <svg viewBox="0 0 44 54" xmlns="http://www.w3.org/2000/svg"
             style="width:100%;height:100%;overflow:visible;">
          <defs>
            <linearGradient id="gp${safeId}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#22C55E"/>
              <stop offset="100%" style="stop-color:#16A34A"/>
            </linearGradient>
          </defs>
          <path d="M22 2C13.163 2 6 9.163 6 18c0 12 16 34 16 34s16-22 16-34C38 9.163 30.837 2 22 2z"
                fill="url(#gp${safeId})"
                stroke="${isSel ? "#ffffff" : "#15803D"}" stroke-width="${isSel ? 3 : 2}"/>
          <circle cx="22" cy="18" r="11" fill="rgba(255,255,255,0.95)"/>
          <text x="22" y="23" text-anchor="middle" font-size="14" font-family="Arial" font-weight="bold" fill="#15803D">✔</text>
        </svg>
        <div style="position:absolute;top:-7px;right:-7px;
                    background:#16A34A;color:#fff;font-size:8px;font-weight:900;
                    padding:2px 5px;border-radius:6px;border:1.5px solid #fff;
                    box-shadow:0 2px 5px rgba(0,0,0,0.3);font-family:Arial;white-space:nowrap;">
          منجز
        </div>
      </div>`;
  }

  // ongoing / stopped / delayed
  const pinW = isSel ? 48 : 40;
  const pinH = isSel ? 60 : 50;
  return `
    <div style="position:relative;width:${pinW}px;height:${pinH}px;
                filter:drop-shadow(0 6px 14px rgba(0,0,0,0.3));
                transform:translate(-50%,-100%);z-index:${isSel ? 9999 : 100};
                transition:all 0.25s cubic-bezier(0.4,0,0.2,1);">
      ${radarPulseHtml}
      <svg viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg"
           style="width:100%;height:100%;overflow:visible;">
        <defs>
          <linearGradient id="pp${safeId}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:1"/>
            <stop offset="100%" style="stop-color:${color};stop-opacity:0.8"/>
          </linearGradient>
        </defs>
        <path d="M20 2C12.268 2 6 8.268 6 16c0 10.5 14 32 14 32s14-21.5 14-32C34 8.268 27.732 2 20 2z"
              fill="url(#pp${safeId})"
              stroke="${isSel ? "#ffffff" : "rgba(0,0,0,0.25)"}" stroke-width="${isSel ? 3 : 1.5}"/>
        <circle cx="20" cy="16" r="9.5" fill="rgba(255,255,255,0.95)"/>
        <svg x="11" y="7" width="18" height="18" viewBox="0 0 24 24"
             fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">
          ${iconPath}
        </svg>
      </svg>
      <div style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);
                  background:${color};color:#fff;font-size:7.5px;font-weight:900;
                  padding:2px 5px;border-radius:5px;border:1.5px solid #fff;
                  box-shadow:0 2px 5px rgba(0,0,0,0.25);font-family:Arial;white-space:nowrap;">
        ${progress}%
      </div>
    </div>`;
}

// ─── Build Leaflet Popup HTML ──────────────────────────────────────────────────
function buildPopupHtml(p: Project): string {
  const bucket = visualBucket(p);
  const cfg = STATUS_CFG[bucket] ?? STATUS_CFG.ongoing;
  const progress = Math.round(Number(p.actualProgress ?? 0));
  const engineer = (p as any).residentEngineerName || (p as any).engineer || "—";
  const value = p.contractValue
    ? `${Number(p.contractValue).toLocaleString("en-US")} د.ع`
    : "—";

  return `
    <div dir="rtl" style="font-family:'Cairo',Arial,sans-serif;min-width:250px;max-width:300px;padding:0;border-radius:14px;overflow:hidden;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0F172A,#1E3A8A);padding:14px;color:#fff;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <span style="background:${cfg.color};color:#fff;border-radius:6px;padding:3px 8px;font-size:10px;font-weight:800;">${cfg.icon} ${cfg.label}</span>
          <span style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:600;">📍 ${p.district || "الأنبار"}</span>
        </div>
        <div style="color:#fff;font-size:13px;font-weight:800;margin-top:8px;line-height:1.4;">${p.name}</div>
      </div>

      <!-- Body -->
      <div style="padding:12px 14px;background:#fff;space-y:8px;">
        <!-- Progress -->
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:#374151;margin-bottom:4px;">
            <span>نسبة الإنجاز الفعلي</span>
            <span style="color:${cfg.color};font-weight:900;">${progress}%</span>
          </div>
          <div style="background:#E5E7EB;border-radius:99px;height:7px;overflow:hidden;">
            <div style="width:${progress}%;background:${cfg.color};height:100%;border-radius:99px;transition:width 0.5s;"></div>
          </div>
        </div>

        <!-- Info rows -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">
          <div style="background:#F8FAFC;border-radius:8px;padding:6px 8px;border:1px solid #E2E8F0;">
            <div style="font-size:9px;color:#64748B;font-weight:600;">المهندس المسؤول</div>
            <div style="font-size:11px;font-weight:700;color:#0F172A;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${engineer}</div>
          </div>
          <div style="background:#F8FAFC;border-radius:8px;padding:6px 8px;border:1px solid #E2E8F0;">
            <div style="font-size:9px;color:#64748B;font-weight:600;">قيمة العقد</div>
            <div style="font-size:11px;font-weight:700;color:#0F172A;margin-top:1px;">${value}</div>
          </div>
          <div style="background:#F8FAFC;border-radius:8px;padding:6px 8px;border:1px solid #E2E8F0;">
            <div style="font-size:9px;color:#64748B;font-weight:600;">المقاول</div>
            <div style="font-size:11px;font-weight:700;color:#0F172A;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.contractor || "—"}</div>
          </div>
          <div style="background:#F8FAFC;border-radius:8px;padding:6px 8px;border:1px solid #E2E8F0;">
            <div style="font-size:9px;color:#64748B;font-weight:600;">تاريخ المباشرة</div>
            <div style="font-size:11px;font-weight:700;color:#0F172A;margin-top:1px;">${formatDateDMY(p.startDate) || "—"}</div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex;gap:6px;margin-top:8px;">
          <button
            onclick="window.__gisOpenProject && window.__gisOpenProject('${p.id}')"
            style="flex:1;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;
                   border:none;border-radius:8px;padding:8px 12px;font-size:11px;font-weight:800;
                   cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;
                   font-family:'Cairo',Arial,sans-serif;"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            عرض التفاصيل
          </button>
          <a
            href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}"
            target="_blank"
            rel="noreferrer"
            style="background:#F1F5F9;color:#2563EB;border:1px solid #CBD5E1;border-radius:8px;
                   padding:8px 10px;font-size:11px;font-weight:800;text-decoration:none;
                   display:flex;align-items:center;justify-content:center;gap:4px;
                   font-family:'Cairo',Arial,sans-serif;"
            title="ملاحة GPS عبر Google Maps"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            ملاحة
          </a>
        </div>
      </div>
    </div>`;
}

// ─── Component ─────────────────────────────────────────────────────────────────
function GisPage() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [clusterReady, setClusterReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dismissWarning, setDismissWarning] = useState(false);

  // Active sidebar tab: "details" or "list"
  const [activeTab, setActiveTab] = useState<"details" | "list">("list");
  // Active map layer: "hybrid" | "sat" | "roads"
  const [activeLayer, setActiveLayer] = useState<"hybrid" | "sat" | "roads">("hybrid");

  // Geolocation Assignment States
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showProjectDetail, setShowProjectDetail] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isBatchAssigning, setIsBatchAssigning] = useState(false);

  // Interactive pick on map mode: holds the project being positioned
  const [pickModeProject, setPickModeProject] = useState<Project | null>(null);

  // Per-project district selection inside modal: projectId -> districtName
  const [modalDistrictSelections, setModalDistrictSelections] = useState<Record<string, string>>({});
  // Manual edit coordinates inside modal: projectId | null
  const [manualEditId, setManualEditId] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  // Multi-select filter (3 buckets)
  const [visibleBuckets, setVisibleBuckets] = useState<Set<string>>(
    new Set(["completed", "ongoing", "stopped"])
  );
  const [districtFilter, setDistrictFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapCardRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clusterGroupRef = useRef<any>(null);
  const legendControlRef = useRef<any>(null);
  const tileLayersRef = useRef<{ sat: any; hybrid: any; roads: any } | null>(null);
  const hasInitiallyCenteredRef = useRef(false);

  // ── Show Toast Feedback ──────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // ── Load projects ────────────────────────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    const localData = getStoredProjects();
    const byId = new Map<string, Project>();
    localData.forEach((p) => byId.set(p.id, p));
    setProjects(localData);
    try {
      const remote = await getProjectsFromSupabase();
      if (remote && remote.length > 0) {
        remote.forEach((p) => { if (!byId.has(p.id)) byId.set(p.id, p); });
        const merged = Array.from(byId.values()).map((p) =>
          Number(p.actualProgress ?? 0) >= 100 && p.status !== "completed"
            ? { ...p, status: "completed" as ProjectStatus, actualProgress: 100 }
            : p
        );
        if (merged.length !== localData.length) saveStoredProjects(merged, true);
        setProjects(merged);
      }
    } catch (e) { console.warn("GIS: remote fetch failed", e); }
  }, []);

  useEffect(() => {
    loadProjects();
    const refresh = () => setProjects(getStoredProjects());
    window.addEventListener("projects_updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("projects_updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [loadProjects]);

  // ── Open Project Detail Modal from popup ────────────────────────────────────
  useEffect(() => {
    (window as any).__gisOpenProject = (id: string) => {
      const proj = projects.find((p) => p.id === id);
      if (!proj) return;
      if (mapRef.current) {
        try { mapRef.current.closePopup(); } catch { /* ignore */ }
      }
      setSelected(proj);
      setActiveTab("details");
      setShowProjectDetail(true);
    };
    return () => { delete (window as any).__gisOpenProject; };
  }, [projects]);

  // ── Filtered projects ────────────────────────────────────────────────────────
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const bucket = visualBucket(p);
      if (!visibleBuckets.has(bucket)) return false;

      const matchDistrict = districtFilter === "all" || p.district === districtFilter;
      const q = searchQuery.trim().toLowerCase();
      const normalizeDigits = (str: string) =>
        str.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
      const normQ = normalizeDigits(q);
      const matchField = (val?: string | number | null) => {
        if (!val) return false;
        const str = String(val).toLowerCase();
        return str.includes(q) || normalizeDigits(str).includes(normQ);
      };

      const matchSearch =
        !q ||
        matchField(p.name) ||
        matchField(p.contractNo) ||
        matchField(p.referralNo) ||
        matchField(p.contractor) ||
        matchField(p.residentEngineerName);

      return matchDistrict && matchSearch;
    });
  }, [projects, visibleBuckets, districtFilter, searchQuery]);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     projects.length,
    completed: projects.filter((p) => visualBucket(p) === "completed").length,
    ongoing:   projects.filter((p) => visualBucket(p) === "ongoing").length,
    stopped:   projects.filter((p) => visualBucket(p) === "stopped").length,
    withCoords:    projects.filter(hasCoords).length,
    withoutCoords: projects.filter((p) => !hasCoords(p)).length,
  }), [projects]);

  // Project count per district
  const districtCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      if (p.district) {
        counts[p.district] = (counts[p.district] || 0) + 1;
      }
    });
    return counts;
  }, [projects]);

  // ── Load Leaflet CSS + JS ────────────────────────────────────────────────────
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    // MarkerCluster CSS
    if (!document.getElementById("leaflet-mc-css")) {
      const link2 = document.createElement("link");
      link2.id = "leaflet-mc-css"; link2.rel = "stylesheet";
      link2.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
      document.head.appendChild(link2);
      const link3 = document.createElement("link");
      link3.id = "leaflet-mc2-css"; link3.rel = "stylesheet";
      link3.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css";
      document.head.appendChild(link3);
    }
    if (!document.getElementById("leaflet-js")) {
      const s = document.createElement("script");
      s.id = "leaflet-js";
      s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      s.async = true;
      s.onload = () => setLeafletReady(true);
      document.body.appendChild(s);
    } else if ((window as any).L) {
      setLeafletReady(true);
    }
  }, []);

  // Load MarkerCluster after Leaflet is ready
  useEffect(() => {
    if (!leafletReady) return;
    if ((window as any).L?.MarkerClusterGroup) { setClusterReady(true); return; }
    if (!document.getElementById("leaflet-mc-js")) {
      const s = document.createElement("script");
      s.id = "leaflet-mc-js";
      s.src = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";
      s.async = true;
      s.onload = () => setClusterReady(true);
      document.body.appendChild(s);
    }
  }, [leafletReady]);

  // Fullscreen listener
  useEffect(() => {
    const onFS = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(() => mapRef.current?.invalidateSize(), 250);
    };
    document.addEventListener("fullscreenchange", onFS);
    return () => document.removeEventListener("fullscreenchange", onFS);
  }, []);

  // ── Init map ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapContainerRef.current, {
      center: ANBAR_CENTER,
      zoom: ANBAR_DEFAULT_ZOOM,
      minZoom: 7,
      maxZoom: 18,
      zoomControl: false,
      maxBounds: [
        [28.0, 36.5],
        [37.5, 47.0],
      ],
      maxBoundsViscosity: 0.8,
    });

    // ── Google Maps tile layers ─────────────────────────────────────────────
    const googleSat = L.tileLayer(
      "https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
      {
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
        attribution: "© Google Maps",
        maxZoom: 20,
      }
    );

    const googleHybrid = L.tileLayer(
      "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
      {
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
        attribution: "© Google Maps",
        maxZoom: 20,
      }
    );

    const googleRoads = L.tileLayer(
      "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
      {
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
        attribution: "© Google Maps",
        maxZoom: 20,
      }
    );

    // Default: Google Hybrid
    googleHybrid.addTo(map);
    tileLayersRef.current = { sat: googleSat, hybrid: googleHybrid, roads: googleRoads };

    // ضبط العرض مباشرة وبدقة على محافظة الأنبار
    map.fitBounds(ANBAR_BOUNDS, { padding: [20, 20] });

    const timer1 = setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(ANBAR_BOUNDS, { padding: [20, 20] });
    }, 150);

    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 500);

    mapRef.current = map;
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [leafletReady]);

  // ── Switch Tile Layer ────────────────────────────────────────────────────────
  const switchTileLayer = (type: "sat" | "hybrid" | "roads") => {
    setActiveLayer(type);
    const map = mapRef.current;
    const layers = tileLayersRef.current;
    if (!map || !layers) return;
    [layers.sat, layers.hybrid, layers.roads].forEach((l) => {
      if (map.hasLayer(l)) map.removeLayer(l);
    });
    if (type === "sat") layers.sat.addTo(map);
    else if (type === "roads") layers.roads.addTo(map);
    else layers.hybrid.addTo(map);
  };

  // ── Legend control ───────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !leafletReady) return;
    const L = (window as any).L;
    if (!L) return;
    if (legendControlRef.current) return;

    const legend = L.control({ position: "bottomright" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "");
      div.style.cssText = `
        background:rgba(255,255,255,0.96);border-radius:14px;padding:10px 14px;
        box-shadow:0 8px 24px rgba(0,0,0,0.15);font-family:'Cairo',Arial,sans-serif;
        direction:rtl;text-align:right;min-width:175px;border:1px solid #E2E8F0;
        backdrop-filter:blur(10px);
      `;
      div.innerHTML = `
        <div style="font-size:11px;font-weight:900;color:#0F172A;margin-bottom:8px;border-bottom:1px solid #F1F5F9;padding-bottom:6px;display:flex;align-items:center;gap:6px;">
          <span>🗺️</span> مفتاح الخريطة
        </div>
        <div id="gis-legend-body" style="display:flex;flex-direction:column;gap:6px;font-size:11px;"></div>
      `;
      return div;
    };
    legend.addTo(map);
    legendControlRef.current = legend;
  }, [leafletReady]);

  // Update legend counts
  useEffect(() => {
    const body = document.getElementById("gis-legend-body");
    if (!body) return;
    body.innerHTML = [
      { bucket: "completed", label: "منجزة",       color: "#22C55E", count: stats.completed },
      { bucket: "ongoing",   label: "قيد التنفيذ", color: "#3B82F6", count: stats.ongoing },
      { bucket: "stopped",   label: "متوقفة",       color: "#EF4444", count: stats.stopped },
    ].map(({ color, label, count }) => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="width:10px;height:10px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0;box-shadow:0 0 0 2px ${color}30;"></span>
          <span style="color:#334155;font-weight:700;">${label}</span>
        </div>
        <span style="background:${color}18;color:${color};font-weight:900;
                     padding:1px 7px;border-radius:99px;font-size:10px;border:1px solid ${color}35;">
          ${count}
        </span>
      </div>
    `).join("");
  }, [stats]);

  // ── Interactive Map Click Handler (Pick on Map Mode) ─────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onMapClick = (e: any) => {
      if (!pickModeProject) return;
      const { lat, lng } = e.latlng;
      handleAssignProjectCoords(pickModeProject.id, lat, lng, pickModeProject.district);
      setPickModeProject(null);
    };

    map.on("click", onMapClick);
    return () => {
      map.off("click", onMapClick);
    };
  }, [pickModeProject, projects]);

  // ── Render markers ────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!leafletReady || !clusterReady || !map) return;
    const L = (window as any).L;
    if (!L) return;

    // Remove old markers / cluster group
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Projects with real coordinates in Anbar
    const withCoords = filteredProjects.filter(hasCoords);

    const useCluster = withCoords.length > 50 && L.MarkerClusterGroup;
    const clusterGroup = useCluster
      ? L.markerClusterGroup({
          maxClusterRadius: 60,
          iconCreateFunction: (cluster: any) => {
            const n = cluster.getChildCount();
            return L.divIcon({
              html: `<div style="
                background:linear-gradient(135deg,#1E40AF,#2563EB);color:#fff;
                border-radius:50%;width:42px;height:42px;
                display:flex;align-items:center;justify-content:center;
                font-size:13px;font-weight:900;font-family:Arial;
                box-shadow:0 4px 14px rgba(37,99,235,0.45);
                border:2.5px solid #fff;">${n}</div>`,
              className: "",
              iconSize: [42, 42],
              iconAnchor: [21, 21],
            });
          },
        })
      : null;

    withCoords.forEach((p) => {
      const coords = getProjectCoords(p);
      if (!coords) return;
      const isSel = selected?.id === p.id;
      const html = buildMarkerHtml(p, isSel);

      const icon = L.divIcon({
        className: "",
        html,
        iconSize: [40, 50],
        iconAnchor: [20, 50],
      });

      const marker = L.marker(coords, { icon });

      // Popup
      const popup = L.popup({
        maxWidth: 320,
        minWidth: 250,
        className: "gis-custom-popup",
        closeButton: true,
        autoClose: true,
        offset: [0, -50],
      }).setContent(buildPopupHtml(p));

      marker.bindPopup(popup);
      marker.on("click", () => {
        setSelected(p);
        setActiveTab("details");
        marker.openPopup();
      });

      if (useCluster && clusterGroup) {
        clusterGroup.addLayer(marker);
      } else {
        marker.addTo(map);
        markersRef.current.push(marker);
      }
    });

    if (useCluster && clusterGroup) {
      map.addLayer(clusterGroup);
      clusterGroupRef.current = clusterGroup;
    }

    // Auto-fit bounds:
    if (searchQuery.trim() && withCoords.length > 0) {
      const latlngs = withCoords
        .map((p) => getProjectCoords(p))
        .filter((c): c is [number, number] => c !== null);
      if (latlngs.length > 0) {
        try {
          map.fitBounds(latlngs, { padding: [50, 50], maxZoom: 13, animate: true, duration: 0.8 });
        } catch { /* ignore */ }
      }
    } else if (districtFilter === "all" && !hasInitiallyCenteredRef.current) {
      // الفتح المباشر دائماً على محافظة الأنبار كاملة
      map.fitBounds(ANBAR_BOUNDS, { padding: [20, 20], animate: false });
      hasInitiallyCenteredRef.current = true;
    }
  }, [leafletReady, clusterReady, filteredProjects, selected, districtFilter, searchQuery]);

  // ── Pan to selected project ───────────────────────────────────────────────────
  useEffect(() => {
    if (!selected || !mapRef.current) return;
    const coords = getProjectCoords(selected);
    if (!coords) return;
    mapRef.current.flyTo(coords, Math.max(mapRef.current.getZoom(), 13), { duration: 0.8 });
  }, [selected]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const toggleBucket = (bucket: string) => {
    setVisibleBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(bucket)) { next.delete(bucket); } else { next.add(bucket); }
      return next;
    });
  };

  const handleDistrictChange = (name: string) => {
    setDistrictFilter(name);
    if (name === "all") {
      mapRef.current?.fitBounds(ANBAR_BOUNDS, { padding: [20, 20], animate: true, duration: 1 });
      return;
    }
    const d = ANBAR_DISTRICTS.find((x) => x.name === name);
    if (d && mapRef.current) mapRef.current.flyTo([d.lat, d.lng], 12, { duration: 1.2 });
  };

  const handleToggleFullscreen = () => {
    if (!mapCardRef.current) return;
    if (!document.fullscreenElement) {
      mapCardRef.current.requestFullscreen?.().catch(() => setIsFullscreen(!isFullscreen));
    } else {
      document.exitFullscreen?.().catch(() => setIsFullscreen(false));
    }
  };

  const handleSelectFromList = (p: Project) => {
    setSelected(p);
    setActiveTab("details");
    const coords = getProjectCoords(p);
    if (coords && mapRef.current) {
      mapRef.current.flyTo(coords, 14, { duration: 1 });
    }
  };

  const handleCopyCoordinates = (lat: number, lng: number) => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // ── Assign Project Coordinates Core Function ─────────────────────────────────
  const handleAssignProjectCoords = async (
    projectId: string,
    lat: number,
    lng: number,
    districtName?: string
  ) => {
    const d = findAnbarDistrict(districtName);
    const finalDistrict = districtName || d.name;

    const updated = projects.map((item) => {
      if (item.id === projectId) {
        return {
          ...item,
          lat: Number(lat),
          lng: Number(lng),
          district: finalDistrict,
        };
      }
      return item;
    });

    setProjects(updated);
    saveStoredProjects(updated);

    const savedTarget = updated.find((x) => x.id === projectId);
    if (savedTarget) {
      saveProjectToSupabase(savedTarget).catch((err) => console.warn("Error updating Supabase:", err));
      setSelected(savedTarget);
      setActiveTab("details");
      showToast(`تم تثبيت موقع "${savedTarget.name}" بنجاح على الخريطة ✔`);

      try {
        logActivity({
          actionType: "gis_update",
          category: "gis",
          title: `تحديث موقع GIS: ${savedTarget.name}`,
          description: `تم تثبيت الإحداثيات الجغرافية لمشروع (${savedTarget.name}) ضمن قضاء (${finalDistrict})`,
          details: {
            "معرف المشروع": savedTarget.id,
            "خط العرض": lat,
            "خط الطول": lng,
            "القضاء": finalDistrict,
          },
        });
      } catch {}

      if (mapRef.current) {
        mapRef.current.flyTo([lat, lng], 13, { duration: 1 });
      }
    }
  };

  // ── Assign by District Center (with slight jitter to prevent pin overlap) ────
  const handleAssignToDistrict = (p: Project, targetDistrictName: string) => {
    const d = findAnbarDistrict(targetDistrictName);
    // Add small random spread (0.01 deg ~ 1km) so multiple projects in the district are distinctly visible
    const jitterLat = (Math.random() - 0.5) * 0.015;
    const jitterLng = (Math.random() - 0.5) * 0.015;
    handleAssignProjectCoords(p.id, d.lat + jitterLat, d.lng + jitterLng, d.name);
  };

  // ── Start Pick on Map Mode ───────────────────────────────────────────────────
  const handleStartPickOnMap = (p: Project) => {
    setShowAssignModal(false);
    setPickModeProject(p);
    showToast(`انقر في أي مكان على الخريطة لتحديد موقع "${p.name}"`);
  };

  // ── Batch Auto-Assign All Missing Projects ───────────────────────────────────
  const handleBatchAutoAssign = async () => {
    const unpositioned = projects.filter((p) => !hasCoords(p));
    if (unpositioned.length === 0) {
      showToast("جميع المشاريع محددة بالفعل على الخريطة!");
      return;
    }

    setIsBatchAssigning(true);
    const counters: Record<string, number> = {};

    const updated = projects.map((item) => {
      if (hasCoords(item)) return item;
      const d = findAnbarDistrict(item.district);
      const index = counters[d.name] || 0;
      counters[d.name] = index + 1;

      // Spiral spread around district center
      const angle = index * 0.85;
      const radius = 0.007 + (index * 0.002);
      const lat = d.lat + Math.sin(angle) * radius;
      const lng = d.lng + Math.cos(angle) * radius;

      return {
        ...item,
        lat,
        lng,
        district: item.district || d.name,
      };
    });

    setProjects(updated);
    saveStoredProjects(updated);

    // Save in background to Supabase
    updated.forEach((p) => {
      if (hasCoords(p)) {
        saveProjectToSupabase(p).catch(() => {});
      }
    });

    setIsBatchAssigning(false);
    setShowAssignModal(false);
    showToast(`تم تثبيت ${unpositioned.length} مشروع تلقائياً على خريطة الأنبار ✔`);

    if (mapRef.current) {
      mapRef.current.fitBounds(ANBAR_BOUNDS, { padding: [20, 20], animate: true, duration: 1 });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  const BUCKET_BTNS = [
    { id: "completed", label: "منجزة",       color: "#22C55E", bg: "#F0FDF4", border: "#86EFAC", icon: "✔" },
    { id: "ongoing",   label: "قيد التنفيذ", color: "#3B82F6", bg: "#EFF6FF", border: "#93C5FD", icon: "⚙" },
    { id: "stopped",   label: "متوقفة",       color: "#EF4444", bg: "#FEF2F2", border: "#FCA5A5", icon: "⏸" },
  ];

  const unpositionedProjects = useMemo(() => {
    return projects.filter((p) => !hasCoords(p)).filter((p) => {
      if (!assignSearch.trim()) return true;
      const q = assignSearch.trim().toLowerCase();
      return (
        p.name?.toLowerCase().includes(q) ||
        p.contractNo?.toLowerCase().includes(q) ||
        p.referralNo?.toLowerCase().includes(q) ||
        p.district?.toLowerCase().includes(q)
      );
    });
  }, [projects, assignSearch]);

  return (
    <div className="space-y-5 pb-16 dir-rtl text-right" style={{ direction: "rtl" }}>
      {/* ─── Premium Light CSS ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes gisRadarPulse {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.5; }
          100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
        }
        @keyframes gisHeroRadar {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes gisPulseRing {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes gisFloatY {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes gisBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .gis-hero-radar {
          animation: gisHeroRadar 8s linear infinite;
          transform-origin: 32px 32px;
        }
        .gis-float {
          animation: gisFloatY 3s ease-in-out infinite;
        }
        .gis-blink {
          animation: gisBlink 1.5s ease-in-out infinite;
        }
        .gis-district-pill {
          transition: all 0.2s ease;
        }
        .gis-district-pill:hover {
          transform: translateY(-1px);
        }
        .gis-project-item {
          transition: all 0.2s ease;
        }
        .gis-project-item:hover {
          transform: translateX(-2px);
        }
        .gis-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .gis-scrollbar::-webkit-scrollbar-track {
          background: #F1F5F9;
          border-radius: 99px;
        }
        .gis-scrollbar::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 99px;
        }
        .gis-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }
        .gis-card-hover {
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .gis-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.07), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
        }
      `}</style>

      {/* ─── Luminous Daytime Hero Header (Light Mode) ──────────────────────────────── */}
      <div
        className="rounded-3xl border border-sky-200/80 p-5 sm:p-6 relative overflow-hidden shadow-xs"
        style={{
          background: "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 40%, #EFF6FF 100%)",
        }}
      >
        {/* Background decorative ambient circles */}
        <div style={{
          position: "absolute", top: "-50px", left: "-50px",
          width: "200px", height: "200px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(186,230,253,0.5) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "-40px", right: "20%",
          width: "160px", height: "160px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(224,242,254,0.6) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5 z-10">
          <div className="flex items-center gap-4">
            {/* Animated Radar Globe Icon */}
            <div style={{ position: "relative", width: "60px", height: "60px", flexShrink: 0 }}>
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                border: "2px solid rgba(2,132,199,0.3)",
                animation: "gisPulseRing 2.2s ease-out infinite",
              }} />
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                border: "2px solid rgba(2,132,199,0.2)",
                animation: "gisPulseRing 2.2s ease-out 0.8s infinite",
              }} />
              <div style={{
                width: "60px", height: "60px", borderRadius: "18px",
                background: "linear-gradient(135deg, #0284C7, #2563EB)",
                border: "2px solid #fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 6px 16px rgba(2,132,199,0.35)",
                position: "relative",
              }}>
                <svg width="60" height="60" style={{ position: "absolute", inset: 0 }} className="gis-hero-radar">
                  <defs>
                    <linearGradient id="radarSweepLight" x1="50%" y1="50%" x2="100%" y2="50%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                    </linearGradient>
                  </defs>
                  <path d="M30 30 L58 30" stroke="url(#radarSweepLight)" strokeWidth="2.5" />
                </svg>
                <Globe className="w-7 h-7 text-white relative z-10" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900">
                  <span className="text-blue-600 font-black">GIS</span>
                  <span className="text-slate-900"> منظومة الخرائط التفاعلية</span>
                </h1>
                <span className="bg-blue-100/80 text-blue-700 border border-blue-200/80 text-xs font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                  محافظة الأنبار
                </span>
                <span className="flex items-center gap-1.5 text-xs font-black text-emerald-700 bg-emerald-100/70 border border-emerald-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                  <span className="gis-blink w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-xs" />
                  مباشر LIVE
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-1">
                التوزيع المكاني والمتابعة الميدانية الدقيقة للمشاريع · مديرية ماء الأنبار
              </p>

              {/* Quick stats mini chips */}
              <div className="flex items-center gap-2.5 mt-3 flex-wrap">
                {[
                  { val: stats.total, label: "إجمالي المشاريع", bg: "bg-white", text: "text-blue-700", border: "border-slate-200/90" },
                  { val: stats.completed, label: "منجز", bg: "bg-white", text: "text-emerald-600", border: "border-slate-200/90" },
                  { val: stats.ongoing, label: "قيد التنفيذ", bg: "bg-white", text: "text-sky-600", border: "border-slate-200/90" },
                  { val: stats.withCoords, label: "مسقط بالخريطة", bg: "bg-white", text: "text-purple-600", border: "border-slate-200/90" },
                ].map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl ${s.bg} ${s.border} border shadow-2xs`}
                  >
                    <span className={`text-base font-black ${s.text} leading-none`}>{s.val}</span>
                    <span className="text-[11px] font-bold text-slate-500">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
            {/* Search input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
              <input
                type="text"
                placeholder="ابحث بالاسم، رقم الإحالة، المقاول، أو العقد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pr-9 pl-8 rounded-xl border border-slate-300/90 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none shadow-2xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                dir="rtl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Assign button */}
            {stats.withoutCoords > 0 && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black border-none cursor-pointer shadow-sm shadow-amber-500/25 transition-all shrink-0"
              >
                <MapPin className="w-3.5 h-3.5" />
                تثبيت {stats.withoutCoords} موقع
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Premium Daytime KPI Cards (Light Mode) ──────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        {[
          {
            label: "إجمالي المشاريع",
            val: stats.total,
            icon: <Building2 className="w-5 h-5 text-blue-600" />,
            color: "#2563EB",
            iconBg: "bg-blue-50 border border-blue-100",
            pillBg: "bg-blue-50 text-blue-700 border-blue-200",
          },
          {
            label: "منجزة ومنفذة",
            val: stats.completed,
            icon: <Trophy className="w-5 h-5 text-emerald-600" />,
            color: "#059669",
            iconBg: "bg-emerald-50 border border-emerald-100",
            pillBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          },
          {
            label: "قيد التنفيذ",
            val: stats.ongoing,
            icon: <Construction className="w-5 h-5 text-sky-600" />,
            color: "#0284C7",
            iconBg: "bg-sky-50 border border-sky-100",
            pillBg: "bg-sky-50 text-sky-700 border-sky-200",
          },
          {
            label: "متوقفة / متأخرة",
            val: stats.stopped,
            icon: <AlertTriangle className="w-5 h-5 text-rose-600" />,
            color: "#DC2626",
            iconBg: "bg-rose-50 border border-rose-100",
            pillBg: "bg-rose-50 text-rose-700 border-rose-200",
          },
          {
            label: "على الخريطة",
            val: stats.withCoords,
            icon: <MapPin className="w-5 h-5 text-purple-600" />,
            color: "#7C3AED",
            iconBg: "bg-purple-50 border border-purple-100",
            pillBg: "bg-purple-50 text-purple-700 border-purple-200",
            sub: `من ${stats.total}`,
            colSpan: true,
          },
        ].map((c, i) => (
          <div
            key={i}
            className={`gis-card-hover bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between ${
              c.colSpan ? "col-span-2 sm:col-span-1" : ""
            }`}
          >
            {/* Top row */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{c.label}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-2xs ${c.iconBg}`}>
                {c.icon}
              </div>
            </div>

            {/* Value row */}
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-none">
                {c.val}
              </span>
              {(c as any).sub && (
                <span className="text-[11px] font-bold text-slate-400">
                  {(c as any).sub}
                </span>
              )}
            </div>

            {/* Subtle bottom colored indicator */}
            <div
              className="absolute bottom-0 inset-x-0 h-1 rounded-b-2xl"
              style={{ background: c.color }}
            />
          </div>
        ))}
      </div>

      {/* ─── District Quick-Filter (Light Mode) ────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:px-4 flex items-center gap-3 shadow-xs">
        <div className="flex items-center gap-1.5 shrink-0 pr-1 border-l border-slate-200 pl-3">
          <Compass className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-black text-slate-700">الأقضية:</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full py-0.5">
          {/* All districts button */}
          <button
            onClick={() => handleDistrictChange("all")}
            className={`gis-district-pill shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
              districtFilter === "all"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100/80 hover:bg-slate-200/70 text-slate-700 border border-slate-200/60"
            }`}
          >
            <span>📍 الكل</span>
            <span
              className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                districtFilter === "all" ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-600"
              }`}
            >
              {projects.length}
            </span>
          </button>

          {ANBAR_DISTRICTS.map((d) => {
            const isSelected = districtFilter === d.name;
            const count = districtCounts[d.name] || 0;
            return (
              <button
                key={d.id}
                onClick={() => handleDistrictChange(d.name)}
                className={`gis-district-pill shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100/80 hover:bg-slate-200/70 text-slate-700 border border-slate-200/60"
                }`}
              >
                <span>{d.name}</span>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── No-coordinates warning banner ───────────────────────────────── */}
      {stats.withoutCoords > 0 && !dismissWarning && (
        <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-amber-50/90 border border-amber-300/80 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-amber-900 leading-snug">
              يوجد <strong className="font-black text-amber-950">{stats.withoutCoords} مشروع</strong> بدون إحداثيات جغرافية مسجلة.{" "}
              <button
                onClick={() => setShowAssignModal(true)}
                className="text-blue-700 font-black underline cursor-pointer hover:text-blue-800 mr-1"
              >
                اضغط هنا لتثبيتها الآن
              </button>
            </span>
          </div>
          <button
            onClick={() => setDismissWarning(true)}
            className="text-amber-500 hover:text-amber-800 shrink-0 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Main Grid: Map + Sidebar ───────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3 items-start">

        {/* ─── PREMIUM DAYTIME MAP CARD ───────────────────────────────────────────── */}
        <div
          ref={mapCardRef}
          className={`lg:col-span-2 overflow-hidden flex flex-col transition-all ${
            isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen w-screen" : "rounded-3xl border border-slate-200/90 shadow-sm bg-white"
          }`}
        >
          {/* Map Sub-Header & Controls */}
          <div
            className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200/90"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span>الخريطة التفاعلية — محافظة الأنبار</span>
                {districtFilter !== "all" && (
                  <span className="bg-blue-100/80 text-blue-700 border border-blue-200/80 text-[10px] font-black px-2 py-0.5 rounded-full">
                    قضاء {districtFilter}
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-500">
                <span className="text-blue-700 font-black">{filteredProjects.filter(hasCoords).length}</span>
                {" "}مشروع مسقط • اضغط على أي مشروع لعرض بطاقته الميدانية
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              {/* Recenter Button */}
              <button
                onClick={() => {
                  setDistrictFilter("all");
                  setSearchQuery("");
                  mapRef.current?.fitBounds(ANBAR_BOUNDS, { padding: [20, 20], animate: true, duration: 1 });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300/80 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-500" /> إعادة تمركز
              </button>

              {/* Fullscreen Button */}
              <button
                onClick={handleToggleFullscreen}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer border-none"
              >
                {isFullscreen ? <><Minimize2 className="h-3.5 w-3.5" /> تصغير</>
                              : <><Maximize2 className="h-3.5 w-3.5" /> ملء الشاشة</>}
              </button>
            </div>
          </div>

          {/* Status Filter Bar */}
          <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/70 border-b border-slate-200/80">
            {/* Bucket toggles */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-slate-600 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" /> الفلترة:
              </span>
              {BUCKET_BTNS.map((b) => {
                const active = visibleBuckets.has(b.id);
                return (
                  <button
                    key={b.id}
                    onClick={() => toggleBucket(b.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                      active
                        ? b.id === "completed"
                          ? "bg-emerald-100/80 text-emerald-800 border border-emerald-300/80 shadow-2xs font-black"
                          : b.id === "ongoing"
                          ? "bg-sky-100/80 text-sky-800 border border-sky-300/80 shadow-2xs font-black"
                          : "bg-rose-100/80 text-rose-800 border border-rose-300/80 shadow-2xs font-black"
                        : "bg-white text-slate-500 border border-slate-200/80 hover:bg-slate-50"
                    }`}
                  >
                    <span>{b.icon}</span>
                    {b.label}
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                        active ? "bg-white/60 text-slate-800" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {b.id === "completed" ? stats.completed : b.id === "ongoing" ? stats.ongoing : stats.stopped}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick map layer switcher */}
            <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl border border-slate-300/50">
              {[
                { key: "hybrid", label: "🗺️ هجين" },
                { key: "sat",    label: "🛰️ أقمار" },
                { key: "roads",  label: "🛣️ طرق" },
              ].map((l) => (
                <button
                  key={l.key}
                  onClick={() => switchTileLayer(l.key as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer border-none ${
                    activeLayer === l.key
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 bg-transparent"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Map canvas container */}
          <div className="p-0 flex-1 flex flex-col min-h-0 relative">
            <div className={`relative w-full flex-1 ${isFullscreen ? "h-[calc(100vh-140px)]" : "min-h-[460px] sm:min-h-[560px]"}`}>
              {!leafletReady && (
                <div className="absolute inset-0 flex items-center justify-center z-50 rounded-b-3xl bg-slate-50/90 backdrop-blur-sm">
                  <div className="text-center space-y-3">
                    <div className="w-10 h-10 rounded-full border-3 border-transparent border-t-blue-600 border-r-cyan-600 animate-spin mx-auto" />
                    <p className="text-slate-800 text-xs font-black">جاري تحميل خريطة الأنبار...</p>
                  </div>
                </div>
              )}

              {/* 🎯 Interactive Pick Mode Floating Alert Banner */}
              {pickModeProject && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-cyan-400/40 flex items-center gap-3 backdrop-blur-md animate-pulse">
                  <Crosshair className="w-5 h-5 text-cyan-400 animate-spin" />
                  <div className="text-right">
                    <div className="text-xs font-bold text-cyan-300">وضع تحديد الموقع المباشر:</div>
                    <div className="text-xs font-black">انقر في أي نقطة على الخريطة لتثبيت موقع: "{pickModeProject.name}"</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPickModeProject(null)}
                    className="text-xs h-7 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border-white/20 mr-2"
                  >
                    إلغاء
                  </Button>
                </div>
              )}

              {/* Floating Map On-Canvas Tools */}
              <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2 pointer-events-auto">
                {/* Zoom In */}
                <button
                  onClick={() => mapRef.current?.zoomIn()}
                  className="w-9 h-9 rounded-xl bg-white/95 backdrop-blur-md shadow-md border border-slate-200 text-slate-700 font-black text-lg flex items-center justify-center hover:bg-blue-50 hover:text-blue-700 transition-all cursor-pointer"
                  title="تكبير"
                >
                  +
                </button>
                {/* Zoom Out */}
                <button
                  onClick={() => mapRef.current?.zoomOut()}
                  className="w-9 h-9 rounded-xl bg-white/95 backdrop-blur-md shadow-md border border-slate-200 text-slate-700 font-black text-lg flex items-center justify-center hover:bg-blue-50 hover:text-blue-700 transition-all cursor-pointer"
                  title="تصغير"
                >
                  −
                </button>
                {/* Recenter button icon */}
                <button
                  onClick={() => mapRef.current?.fitBounds(ANBAR_BOUNDS, { padding: [20, 20], animate: true, duration: 1 })}
                  className="w-9 h-9 rounded-xl bg-white/95 backdrop-blur-md shadow-md border border-slate-200 text-blue-600 flex items-center justify-center hover:bg-blue-50 hover:text-blue-700 transition-all cursor-pointer"
                  title="إعادة ضبط تمركز الأنبار"
                >
                  <LocateFixed className="w-4 h-4" />
                </button>
              </div>

              {/* Leaflet map div */}
              <div
                ref={mapContainerRef}
                className={`h-full w-full ${pickModeProject ? "cursor-crosshair" : ""}`}
                style={{ minHeight: 460 }}
              />
            </div>
          </div>
        </div>

        {/* ─── PREMIUM DAYTIME SIDEBAR (Light Mode) ────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Sidebar Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden sticky top-4">
            {/* Tab switch header */}
            <div className="bg-slate-50/90 border-b border-slate-200/90 p-2 flex items-center gap-2">
              <button
                onClick={() => setActiveTab("details")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none ${
                  activeTab === "details"
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                    : "bg-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${activeTab === "details" ? "text-blue-600" : "text-slate-400"}`} />
                <span>بطاقة المشروع</span>
                {selected && (
                  <span className="gis-blink w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-2xs" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("list")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none ${
                  activeTab === "list"
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                    : "bg-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>دليل المشاريع</span>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                    activeTab === "list" ? "bg-blue-100 text-blue-700" : "bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {filteredProjects.length}
                </span>
              </button>
            </div>

            <div className="p-4 space-y-4" style={{ direction: "rtl" }}>
              {/* ── TAB 1: Selected Project Details ───────────────────────── */}
              {activeTab === "details" && (
                selected ? (
                  <div className="space-y-4 text-right" dir="rtl">
                    {/* Header bar with status and deselect */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        style={{
                          background: STATUS_CFG[visualBucket(selected)]?.color + "15",
                          color: STATUS_CFG[visualBucket(selected)]?.color,
                          border: `1px solid ${STATUS_CFG[visualBucket(selected)]?.color}40`,
                        }}
                        className="text-xs font-black px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs"
                      >
                        {STATUS_CFG[visualBucket(selected)]?.icon} {STATUS_LABEL[selected.status] || selected.status}
                      </span>

                      <button
                        onClick={() => setSelected(null)}
                        className="text-slate-400 hover:text-slate-700 text-xs font-bold flex items-center gap-1 bg-transparent border-none cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> إلغاء التحديد
                      </button>
                    </div>

                    {/* Title & District */}
                    <div>
                      <h3 className="font-black text-base text-slate-900 leading-snug">{selected.name}</h3>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{selected.location || "محافظة الأنبار"}</span>
                        {selected.district && (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-md font-black text-[10px]">
                            {selected.district}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl">
                      <div className="flex justify-between items-center text-xs font-bold mb-2">
                        <span className="text-slate-600">نسبة الإنجاز الفعلي:</span>
                        <span
                          style={{ color: STATUS_CFG[visualBucket(selected)]?.color }}
                          className="font-black text-base"
                        >
                          {selected.actualProgress ?? 0}%
                        </span>
                      </div>
                      <div className="h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          style={{
                            width: `${selected.actualProgress ?? 0}%`,
                            background: STATUS_CFG[visualBucket(selected)]?.color,
                          }}
                          className="h-full rounded-full transition-all duration-700"
                        />
                      </div>
                    </div>

                    {/* Key Attributes Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { label: "رقم العقد", val: selected.contractNo || "—" },
                        { label: "الشركة / المقاول", val: selected.contractor || "—" },
                        { label: "قيمة العقد", val: selected.contractValue ? `${Number(selected.contractValue).toLocaleString("en-US")} د.ع` : "—" },
                        { label: "مدة التنفيذ", val: selected.durationDays ? `${selected.durationDays} يوم` : "—" },
                        { label: "تاريخ المباشرة", val: formatDateDMY(selected.startDate) || "—" },
                        { label: "الجهة الممولة", val: selected.fundingSource || "—" },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5">
                          <div className="text-[10px] text-slate-400 font-bold mb-0.5">{label}</div>
                          <div className="font-black text-slate-800 text-xs truncate" title={val}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Resident engineer card */}
                    {((selected as any).residentEngineerName || (selected as any).engineer) && (
                      <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-center justify-between gap-2.5">
                        <div>
                          <span className="text-[10px] font-bold text-blue-600 block">دائرة المهندس المقيم:</span>
                          <span className="font-black text-slate-900 text-xs">
                            {(selected as any).residentEngineerName || (selected as any).engineer}
                          </span>
                        </div>
                        {selected.residentEngineerPhone && (
                          <a
                            href={`tel:${selected.residentEngineerPhone}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-xs no-underline shadow-xs"
                          >
                            <Phone className="w-3 h-3" /> اتصال
                          </a>
                        )}
                      </div>
                    )}

                    {/* GPS Coordinates */}
                    <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-bold flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-blue-600" /> إحداثيات GPS:
                        </span>
                        {hasCoords(selected) && (
                          <button
                            onClick={() => handleCopyCoordinates(Number(selected.lat), Number(selected.lng))}
                            className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1 bg-transparent border-none cursor-pointer"
                          >
                            {copiedCoords ? <><Check className="w-3 h-3 text-emerald-600" /> تم النسخ</> : <><Copy className="w-3 h-3" /> نسخ</>}
                          </button>
                        )}
                      </div>

                      {hasCoords(selected) ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-xs text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                            {Number(selected.lat).toFixed(5)}, {Number(selected.lng).toFixed(5)}
                          </span>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs no-underline shadow-2xs"
                          >
                            <Navigation className="w-3 h-3" /> ملاحة
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-amber-600 font-bold">غير محدد جغرافياً</span>
                          <button
                            onClick={() => setShowAssignModal(true)}
                            className="text-blue-600 font-black underline bg-transparent border-none cursor-pointer"
                          >
                            تحديد الموقع الآن
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-slate-200/80 flex flex-col gap-2">
                      <button
                        onClick={() => navigate({ to: selected.status === "completed" ? "/projects-completed" : "/projects" })}
                        className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs border-none cursor-pointer shadow-xs transition-all"
                      >
                        <Eye className="w-4 h-4" /> عرض ملف المشروع الكامل
                      </button>
                      <button
                        onClick={() => navigate({ to: "/reports" })}
                        className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300/80 font-bold text-xs cursor-pointer transition-all"
                      >
                        <FileText className="w-4 h-4 text-slate-500" /> تقارير المتابعة الميدانية
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 px-4 flex flex-col items-center gap-3">
                    <div className="gis-float w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600">
                      <MapPin className="w-7 h-7" />
                    </div>
                    <h4 className="text-sm font-black text-slate-800">لم يتم تحديد مشروع</h4>
                    <p className="text-xs text-slate-500 font-medium max-w-[220px] leading-relaxed">
                      اضغط على أي مؤشر على الخريطة أو اختر مشروعاً من قائمة الدليل
                    </p>
                    <button
                      onClick={() => setActiveTab("list")}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 font-bold text-xs cursor-pointer transition-all"
                    >
                      <Layers className="w-3.5 h-3.5" /> استعراض قائمة المشاريع
                    </button>
                  </div>
                )
              )}

              {/* ── TAB 2: Projects List ──────────────────────────────────── */}
              {activeTab === "list" && (
                <div className="space-y-2.5 text-right" dir="rtl">
                  <div className="flex items-center justify-between text-xs font-bold pb-2 border-b border-slate-200/80 text-slate-500">
                    <span>المشاريع المطابقة ({filteredProjects.length})</span>
                    <span className="text-[11px] text-slate-400">اضغط للمعاينة</span>
                  </div>

                  <div className="gis-scrollbar max-h-[460px] overflow-y-auto space-y-2 pr-0.5">
                    {filteredProjects.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 text-xs font-bold">
                        لا توجد مشاريع تطابق الفلترة الحالية
                      </div>
                    ) : (
                      filteredProjects.map((p) => {
                        const bucket = visualBucket(p);
                        const cfg = STATUS_CFG[bucket];
                        const isPos = hasCoords(p);
                        const isCur = selected?.id === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleSelectFromList(p)}
                            className={`gis-project-item p-3 rounded-xl cursor-pointer border transition-all ${
                              isCur
                                ? "bg-blue-50/90 border-blue-400 shadow-xs ring-2 ring-blue-500/15"
                                : "bg-slate-50/70 hover:bg-white border-slate-200/80 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span
                                style={{
                                  background: cfg.color + "15",
                                  color: cfg.color,
                                  border: `1px solid ${cfg.color}35`,
                                }}
                                className="text-[10px] font-black px-2 py-0.5 rounded-md shrink-0"
                              >
                                {cfg.label}
                              </span>
                              <span className="font-bold text-xs text-slate-900 leading-snug line-clamp-2 text-right">
                                {p.name}
                              </span>
                            </div>

                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 text-xs">
                              <div className="text-slate-500 font-bold text-[11px]">
                                📍 {p.district || "الأنبار"}
                              </div>

                              <div className="flex items-center gap-2">
                                {isPos ? (
                                  <span className="text-emerald-700 bg-emerald-100/70 border border-emerald-200/70 px-2 py-0.5 rounded-md text-[10px] font-black flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> مسقط
                                  </span>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleStartPickOnMap(p); }}
                                    className="text-amber-800 bg-amber-100/80 hover:bg-amber-200 border border-amber-300/80 px-2 py-0.5 rounded-md text-[10px] font-black cursor-pointer"
                                  >
                                    + تثبيت الموقع
                                  </button>
                                )}
                                <span style={{ color: cfg.color }} className="font-black text-xs">
                                  {p.actualProgress ?? 0}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Premium Quick Summary Card (Light Mode) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
            <h4 className="text-xs font-black text-slate-900 flex items-center gap-2 mb-3">
              <Layers className="w-3.5 h-3.5 text-blue-600" /> إحصائيات التوزيع الجغرافي
            </h4>
            {[
              { label: "مسقطة على الخريطة", val: stats.withCoords, color: "#10B981", bar: stats.total ? (stats.withCoords / stats.total) * 100 : 0 },
              { label: "بحاجة لتثبيت الموقع", val: stats.withoutCoords, color: "#F59E0B", bar: stats.total ? (stats.withoutCoords / stats.total) * 100 : 0 },
              { label: "معروضة وفق الفلتر", val: filteredProjects.filter(hasCoords).length, color: "#3B82F6", bar: stats.total ? (filteredProjects.filter(hasCoords).length / stats.total) * 100 : 0 },
            ].map(({ label, val, color, bar }) => (
              <div key={label} className="mb-2.5 last:mb-0">
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span style={{ background: color }} className="w-2 h-2 rounded-full inline-block" />
                    {label}
                  </div>
                  <span style={{ color }} className="font-black">{val}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${bar}%`, background: color }}
                    className="h-full rounded-full transition-all duration-700"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ─── QUICK GEOLOCATION ASSIGNER MODAL ────────────────────────────── */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-3xl text-right dir-rtl p-6 rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-right space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                تثبيت المواقع الجغرافية للمشاريع على خريطة الأنبار
              </DialogTitle>
              <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-black text-xs">
                {unpositionedProjects.length} غير محدد
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500 font-semibold">
              اختر قضاء المشروع لتثبيته فوراً على مركز القضاء، أو انقر على الخريطة لاختيار نقطة دقيقة، أو استخدم التثبيت التلقائي الذكي لجميع المشاريع دفعة واحدة.
            </DialogDescription>
          </DialogHeader>

          {/* ⚡ Smart Bulk Action Banner */}
          {unpositionedProjects.length > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-300/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-2 shadow-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-emerald-950 font-black text-sm">
                  <Zap className="w-4 h-4 text-emerald-600 fill-emerald-500" />
                  تثبيت جماعي ذكي وسريع:
                </div>
                <div className="text-xs text-slate-600 font-semibold">
                  تثبيت جميع المشاريع الـ ({unpositionedProjects.length}) تلقائياً حسب أقضيتها المسجلة مع توزيع ذكي للمؤشرات.
                </div>
              </div>

              <Button
                onClick={handleBatchAutoAssign}
                disabled={isBatchAssigning}
                className="gap-2 text-xs font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 shrink-0 px-4 py-2.5"
              >
                {isBatchAssigning ? "جاري التثبيت..." : <>⚡ تثبيت الجميع الآن ({unpositionedProjects.length})</>}
              </Button>
            </div>
          )}

          <div className="space-y-4 my-2">
            {/* Search within modal */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="ابحث في المشاريع غير المحددة بالاسم أو القضاء..."
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                className="w-full h-10 pr-9 pl-4 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                dir="rtl"
              />
            </div>

            {/* List of projects without coordinates */}
            <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
              {unpositionedProjects.length === 0 ? (
                <div className="text-center py-14 space-y-2">
                  <CheckCheck className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-slate-800 font-black text-sm">
                    {assignSearch ? "لا توجد نتائج تطابق البحث" : "ممتاز! جميع المشاريع محددة ومسقطة بالكامل على الخريطة."}
                  </p>
                </div>
              ) : (
                unpositionedProjects.map((p) => {
                  const defaultDistrict = findAnbarDistrict(p.district).name;
                  const currentSelectedDistrict = modalDistrictSelections[p.id] || defaultDistrict;
                  const isManualOpen = manualEditId === p.id;

                  return (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 hover:bg-white hover:border-blue-300 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 leading-snug">{p.name}</h4>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold mt-1">
                            <span>المقاول: {p.contractor || "—"}</span>
                            <span>• العقد: {p.contractNo || "—"}</span>
                            <span>• القضاء المسجل: {p.district || "غير محدد"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Controls Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                        {/* District Selector */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-600">القضاء:</span>
                          <select
                            value={currentSelectedDistrict}
                            onChange={(e) => {
                              setModalDistrictSelections((prev) => ({
                                ...prev,
                                [p.id]: e.target.value,
                              }));
                            }}
                            className="h-8 px-2.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {ANBAR_DISTRICTS.map((d) => (
                              <option key={d.id} value={d.name}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* 1. Quick Assign to selected district */}
                          <Button
                            size="sm"
                            onClick={() => handleAssignToDistrict(p, currentSelectedDistrict)}
                            className="gap-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-2xs h-8 px-3"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            تثبيت على {currentSelectedDistrict}
                          </Button>

                          {/* 2. Pick location on map */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartPickOnMap(p)}
                            className="gap-1 text-xs font-bold rounded-xl border-slate-300 text-slate-700 hover:bg-blue-50 hover:text-blue-700 h-8 px-2.5"
                            title="انقر على الخريطة لتحديد نقطة دقيقة"
                          >
                            <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                            نقر بالخريطة
                          </Button>

                          {/* 3. Toggle manual input */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (isManualOpen) {
                                setManualEditId(null);
                              } else {
                                setManualEditId(p.id);
                                setManualLat(p.lat ? String(p.lat) : "");
                                setManualLng(p.lng ? String(p.lng) : "");
                              }
                            }}
                            className="text-xs font-bold rounded-xl text-slate-500 hover:text-slate-800 h-8 px-2"
                            title="إدخال إحداثيات GPS يدوياً"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Manual Lat/Lng input section */}
                      {isManualOpen && (
                        <div className="p-3 bg-white rounded-xl border border-blue-200 flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold text-slate-700">إدخال يدوي:</span>
                          <input
                            type="text"
                            placeholder="خط العرض (Lat) مثل: 33.4248"
                            value={manualLat}
                            onChange={(e) => setManualLat(e.target.value)}
                            className="h-8 px-2 rounded-lg border border-slate-300 text-xs w-36 font-mono"
                          />
                          <input
                            type="text"
                            placeholder="خط الطول (Lng) مثل: 43.3023"
                            value={manualLng}
                            onChange={(e) => setManualLng(e.target.value)}
                            className="h-8 px-2 rounded-lg border border-slate-300 text-xs w-36 font-mono"
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              const latNum = parseFloat(manualLat);
                              const lngNum = parseFloat(manualLng);
                              if (isNaN(latNum) || isNaN(lngNum)) {
                                alert("يرجى إدخال أرقام صحيحة لخط العرض والطول");
                                return;
                              }
                              handleAssignProjectCoords(p.id, latNum, lngNum, currentSelectedDistrict);
                              setManualEditId(null);
                            }}
                            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                          >
                            حفظ
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-bold">
              المتبقي: {unpositionedProjects.length} مشروع
            </span>
            <Button
              variant="outline"
              onClick={() => setShowAssignModal(false)}
              className="rounded-xl font-bold text-xs border-slate-300"
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── PROJECT FULL DETAIL MODAL ────────────────────────────────────── */}
      <Dialog open={showProjectDetail} onOpenChange={setShowProjectDetail}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            dir="rtl"
            className="fixed left-1/2 top-1/2 z-[100000] -translate-x-1/2 -translate-y-1/2 w-[96vw] max-w-4xl rounded-3xl overflow-hidden border-0 shadow-2xl outline-none flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
            style={{ maxHeight: "92vh" }}
          >
            {/* Hidden title for accessibility */}
            <DialogPrimitive.Title className="sr-only">
              {selected?.name ?? "تفاصيل المشروع"}
            </DialogPrimitive.Title>

            {selected && (() => {
              const bucket = visualBucket(selected);
              const cfg = STATUS_CFG[bucket] ?? STATUS_CFG.ongoing;
              const progress = Math.round(Number(selected.actualProgress ?? 0));
              const contractVal = selected.contractValue
                ? `${Number(selected.contractValue).toLocaleString("en-US")} ${selected.currency === "USD" ? "$" : "د.ع"}`
                : "—";
              const engineer = selected.residentEngineerName || (selected as any).engineer || "—";

              const InfoRow = ({ label, value, icon }: { label: string; value?: string | number | null; icon?: React.ReactNode }) => (
                value && String(value) !== "—" && String(value).trim() !== "" ? (
                  <div className="flex flex-col gap-0.5 p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-200 transition-colors">
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">{icon}{label}</span>
                    <span className="text-xs font-bold text-slate-800 break-words leading-snug">{value}</span>
                  </div>
                ) : null
              );

              return (
                <>
                  {/* ── Modal Header ── */}
                  <div style={{ background: `linear-gradient(135deg, #0F172A 0%, #1E3A8A 60%, #1d4ed8 100%)` }} className="p-5 sm:p-6 text-white shrink-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <span
                            style={{ background: cfg.color + "22", color: cfg.color, border: `1px solid ${cfg.color}55` }}
                            className="text-xs font-black px-3 py-1 rounded-xl flex items-center gap-1.5"
                          >
                            {cfg.icon} {cfg.label}
                          </span>
                          {selected.district && (
                            <span className="bg-white/10 text-white/90 text-xs font-bold px-2.5 py-1 rounded-xl border border-white/20 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {selected.district}
                            </span>
                          )}
                          {selected.type && (
                            <span className="bg-cyan-500/20 text-cyan-300 text-xs font-bold px-2.5 py-1 rounded-xl border border-cyan-500/30">
                              {selected.type === "investment" ? "استثماري" : selected.type === "non_investment" ? "غير استثماري" : selected.type === "water_tank" ? "خزان ماء" : selected.type === "well" ? "بئر" : selected.type === "pipeline" ? "شبكة مجاري" : selected.type === "treatment" ? "معالجة" : selected.type === "building" ? "مبنى" : selected.type}
                            </span>
                          )}
                        </div>
                        <h2 className="text-base sm:text-xl font-black leading-snug text-white">{selected.name}</h2>
                        {selected.location && (
                          <p className="text-xs text-white/60 font-semibold mt-1.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {selected.location}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setShowProjectDetail(false)}
                        className="shrink-0 w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-white/70">نسبة الإنجاز الفعلي</span>
                        <span style={{ color: cfg.color }} className="font-black text-sm">{progress}%</span>
                      </div>
                      <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${progress}%`, background: cfg.color, boxShadow: `0 0 12px ${cfg.color}80` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-white/50 font-bold">
                        <span>المخطط: {selected.plannedProgress ?? 0}%</span>
                        <span>الفارق: {Math.round((selected.actualProgress ?? 0) - (selected.plannedProgress ?? 0))}%</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Modal Body (scrollable) ── */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-white" dir="rtl">

                    {/* Section: بيانات العقد */}
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0"><ClipboardList className="w-3.5 h-3.5 text-white" /></div>
                        <h3 className="text-sm font-black text-slate-900">بيانات العقد الأساسية</h3>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <InfoRow label="رقم العقد" value={selected.contractNo} icon={<Hash className="w-3 h-3" />} />
                        <InfoRow label="نوع العقد" value={selected.contractType} icon={<ScrollText className="w-3 h-3" />} />
                        <InfoRow label="تاريخ العقد" value={formatDateDMY(selected.contractDate)} icon={<Calendar className="w-3 h-3" />} />
                        <InfoRow label="قيمة العقد" value={contractVal} icon={<Banknote className="w-3 h-3" />} />
                        <InfoRow label="الكلفة التقديرية" value={selected.estimatedCost ? `${Number(selected.estimatedCost).toLocaleString("en-US")} د.ع` : undefined} icon={<DollarSign className="w-3 h-3" />} />
                        <InfoRow label="الجهة الممولة" value={selected.fundingSource} icon={<Building2 className="w-3 h-3" />} />
                        <InfoRow label="طريقة الإحالة" value={selected.referralMethod} icon={<ChevronRight className="w-3 h-3" />} />
                        <InfoRow label="رقم الإحالة" value={selected.referralNo} icon={<Hash className="w-3 h-3" />} />
                        <InfoRow label="تاريخ الإحالة" value={formatDateDMY(selected.referralDate)} icon={<Calendar className="w-3 h-3" />} />
                      </div>
                    </section>

                    {/* Section: الجهات المنفذة */}
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0"><Wrench className="w-3.5 h-3.5 text-white" /></div>
                        <h3 className="text-sm font-black text-slate-900">الجهات المنفذة والإشراف</h3>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <InfoRow label="المقاول" value={selected.contractor} icon={<Wrench className="w-3 h-3" />} />
                        <InfoRow label="المهندس المقيم" value={engineer} icon={<User className="w-3 h-3" />} />
                        <InfoRow label="هاتف المهندس" value={selected.residentEngineerPhone} icon={<Phone className="w-3 h-3" />} />
                        <InfoRow label="الكادر المحلي" value={selected.localStaffCount ? `${selected.localStaffCount} فرد` : undefined} icon={<Users className="w-3 h-3" />} />
                        <InfoRow label="الكادر الأجنبي" value={selected.foreignStaffCount ? `${selected.foreignStaffCount} فرد` : undefined} icon={<Users className="w-3 h-3" />} />
                        <InfoRow label="اسم المركز" value={selected.centerName} icon={<Building2 className="w-3 h-3" />} />
                      </div>
                      {selected.selectedSupervisors && selected.selectedSupervisors.length > 0 && (
                        <div className="mt-2 p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1.5"><Users className="w-3 h-3" />المشرفون المرافقون</span>
                          <div className="flex flex-wrap gap-1.5">
                            {selected.selectedSupervisors.map((s, i) => (<span key={i} className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg">{s}</span>))}
                          </div>
                        </div>
                      )}
                    </section>

                    {/* Section: المواعيد والمدد */}
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center shrink-0"><Calendar className="w-3.5 h-3.5 text-white" /></div>
                        <h3 className="text-sm font-black text-slate-900">المواعيد والمدد الزمنية</h3>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <InfoRow label="تاريخ المباشرة" value={formatDateDMY(selected.startDate)} icon={<Calendar className="w-3 h-3" />} />
                        <InfoRow label="تاريخ المباشرة الفعلي" value={formatDateDMY(selected.actualStartDate)} icon={<Calendar className="w-3 h-3" />} />
                        <InfoRow label="تاريخ الإنجاز المخطط" value={formatDateDMY(selected.plannedEndDate)} icon={<Clock className="w-3 h-3" />} />
                        <InfoRow label="تاريخ الإنجاز المتوقع" value={formatDateDMY(selected.expectedEndDate)} icon={<Clock className="w-3 h-3" />} />
                        <InfoRow label="تاريخ الإنجاز التعاقدي" value={formatDateDMY(selected.contractualCompletionDate)} icon={<Clock className="w-3 h-3" />} />
                        <InfoRow label="تاريخ الإنجاز بعد المدد الإضافية" value={formatDateDMY(selected.completionDateAfterAdditional)} icon={<Clock className="w-3 h-3" />} />
                        <InfoRow label="مدة التنفيذ (أيام)" value={selected.durationDays ? `${selected.durationDays} يوم` : undefined} icon={<Clock className="w-3 h-3" />} />
                        <InfoRow label="مدة التنفيذ الفعلية" value={selected.actualExecutionDuration} icon={<Clock className="w-3 h-3" />} />
                        <InfoRow label="المدة الإضافية" value={selected.additionalDuration} icon={<Plus className="w-3 h-3" />} />
                        <InfoRow label="تاريخ الاستئناف" value={formatDateDMY(selected.resumeStartDate)} icon={<Calendar className="w-3 h-3" />} />
                        <InfoRow label="مدة العقد بعد الاستئناف" value={selected.contractDurationAfterResume} icon={<Clock className="w-3 h-3" />} />
                        <InfoRow label="المدة المتبقية من الاستئناف" value={selected.remainingDurationFromResume} icon={<AlertCircle className="w-3 h-3" />} />
                        <InfoRow label="المدة المتبقية من التقرير" value={selected.remainingDurationFromReport} icon={<AlertCircle className="w-3 h-3" />} />
                        <InfoRow label="تاريخ الإيقاف" value={formatDateDMY(selected.suspensionDate)} icon={<AlertTriangle className="w-3 h-3" />} />
                        <InfoRow label="مدة التوقف" value={selected.suspensionDuration} icon={<AlertTriangle className="w-3 h-3" />} />
                      </div>
                    </section>

                    {/* Section: المالية */}
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0"><DollarSign className="w-3.5 h-3.5 text-white" /></div>
                        <h3 className="text-sm font-black text-slate-900">البيانات المالية</h3>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <InfoRow label="كلفة العمل" value={selected.workCost ? `${Number(selected.workCost).toLocaleString("en-US")} د.ع` : undefined} icon={<Banknote className="w-3 h-3" />} />
                        <InfoRow label="المصروف الكلي للأعمال" value={selected.disbursedWork ? `${Number(selected.disbursedWork).toLocaleString("en-US")} د.ع` : undefined} icon={<Banknote className="w-3 h-3" />} />
                        <InfoRow label="المصروف الكلي للمشروع" value={selected.totalDisbursed ? `${Number(selected.totalDisbursed).toLocaleString("en-US")} د.ع` : undefined} icon={<Banknote className="w-3 h-3" />} />
                        <InfoRow label="مبلغ أوامر الغيار" value={selected.changeOrderSingleAmount ? `${Number(selected.changeOrderSingleAmount).toLocaleString("en-US")} د.ع` : undefined} icon={<DollarSign className="w-3 h-3" />} />
                        <InfoRow label="مجموع أوامر الغيار" value={selected.changeOrdersTotalAmount ? `${Number(selected.changeOrdersTotalAmount).toLocaleString("en-US")} د.ع` : undefined} icon={<DollarSign className="w-3 h-3" />} />
                        <InfoRow label="عدد أوامر الغيار" value={selected.changeOrdersCount ? `${selected.changeOrdersCount} أمر` : undefined} icon={<Hash className="w-3 h-3" />} />
                        <InfoRow label="رقم وتاريخ أمر الغيار" value={selected.changeOrderNoAndDate} icon={<ScrollText className="w-3 h-3" />} />
                      </div>
                      {selected.changeOrdersList && selected.changeOrdersList.length > 0 && (
                        <div className="mt-2 rounded-xl border border-slate-200 overflow-hidden">
                          <div className="bg-slate-50 px-3 py-2 text-[10px] font-black text-slate-500 border-b border-slate-200">تفصيل أوامر الغيار</div>
                          <div className="divide-y divide-slate-100">
                            {selected.changeOrdersList.map((co, i) => (
                              <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                                <span className="font-bold text-slate-700">{co.number || `أمر ${i + 1}`}</span>
                                {co.date && <span className="text-slate-400 font-semibold">{formatDateDMY(co.date)}</span>}
                                {co.amount && <span className="font-black text-violet-700">{Number(co.amount).toLocaleString("en-US")} د.ع</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </section>

                    {/* Section: الاستلام */}
                    {(selected.initialHandoverDate || selected.finalHandoverDate || selected.initialHandoverOrderNo || selected.finalHandoverOrderNo) && (
                      <section>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0"><CheckSquare className="w-3.5 h-3.5 text-white" /></div>
                          <h3 className="text-sm font-black text-slate-900">بيانات الاستلام</h3>
                          <div className="flex-1 h-px bg-slate-100" />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <InfoRow label="رقم أمر الاستلام الأولي" value={selected.initialHandoverOrderNo} icon={<Hash className="w-3 h-3" />} />
                          <InfoRow label="تاريخ أمر الاستلام الأولي" value={formatDateDMY(selected.initialHandoverOrderDate)} icon={<Calendar className="w-3 h-3" />} />
                          <InfoRow label="تاريخ الاستلام الأولي" value={formatDateDMY(selected.initialHandoverDate)} icon={<CheckCircle2 className="w-3 h-3" />} />
                          <InfoRow label="رقم أمر الاستلام النهائي" value={selected.finalHandoverOrderNo} icon={<Hash className="w-3 h-3" />} />
                          <InfoRow label="تاريخ أمر الاستلام النهائي" value={formatDateDMY(selected.finalHandoverOrderDate)} icon={<Calendar className="w-3 h-3" />} />
                          <InfoRow label="تاريخ الاستلام النهائي" value={formatDateDMY(selected.finalHandoverDate)} icon={<Star className="w-3 h-3" />} />
                        </div>
                        {selected.initialHandoverCommittee && selected.initialHandoverCommittee.length > 0 && (
                          <div className="mt-2 p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1.5"><Users className="w-3 h-3" />لجنة الاستلام الأولي</span>
                            <div className="flex flex-wrap gap-1.5">
                              {selected.initialHandoverCommittee.map((m, i) => (<span key={i} className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-lg">{m}</span>))}
                            </div>
                          </div>
                        )}
                        {selected.initialHandoverNotes && (
                          <div className="mt-2 p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                            <span className="text-[10px] font-bold text-slate-400 block mb-1">ملاحظات الاستلام الأولي</span>
                            <p className="text-xs text-slate-700 font-semibold leading-relaxed">{selected.initialHandoverNotes}</p>
                          </div>
                        )}
                        {selected.finalHandoverCommittee && selected.finalHandoverCommittee.length > 0 && (
                          <div className="mt-2 p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1.5"><Users className="w-3 h-3" />لجنة الاستلام النهائي</span>
                            <div className="flex flex-wrap gap-1.5">
                              {selected.finalHandoverCommittee.map((m, i) => (<span key={i} className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg">{m}</span>))}
                            </div>
                          </div>
                        )}
                        {selected.finalHandoverNotes && (
                          <div className="mt-2 p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                            <span className="text-[10px] font-bold text-slate-400 block mb-1">ملاحظات الاستلام النهائي</span>
                            <p className="text-xs text-slate-700 font-semibold leading-relaxed">{selected.finalHandoverNotes}</p>
                          </div>
                        )}
                      </section>
                    )}

                    {/* Section: تقارير التنفيذ */}
                    {(selected.executedWorksPeriod || selected.deliveredEquipmentPeriod || selected.delayReasons || selected.suspensionDatesReasons || selected.residentEngineerOpinion || selected.problemsObstaclesSolutions) && (
                      <section>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shrink-0"><TrendingUp className="w-3.5 h-3.5 text-white" /></div>
                          <h3 className="text-sm font-black text-slate-900">تقارير التنفيذ والمتابعة</h3>
                          <div className="flex-1 h-px bg-slate-100" />
                        </div>
                        <div className="space-y-2">
                          {selected.executedWorksPeriod && (<div className="p-3 rounded-xl border border-slate-100 bg-slate-50/60"><span className="text-[10px] font-bold text-slate-400 block mb-1">الأعمال المنفذة هذه الفترة</span><p className="text-xs text-slate-700 font-semibold leading-relaxed whitespace-pre-line">{selected.executedWorksPeriod}</p></div>)}
                          {selected.deliveredEquipmentPeriod && (<div className="p-3 rounded-xl border border-slate-100 bg-slate-50/60"><span className="text-[10px] font-bold text-slate-400 block mb-1">المعدات والأجهزة الواصلة</span><p className="text-xs text-slate-700 font-semibold leading-relaxed whitespace-pre-line">{selected.deliveredEquipmentPeriod}</p></div>)}
                          {selected.delayReasons && (<div className="p-3 rounded-xl border border-amber-100 bg-amber-50/60"><span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mb-1"><AlertTriangle className="w-3 h-3" />أسباب التأخير</span><p className="text-xs text-slate-700 font-semibold leading-relaxed whitespace-pre-line">{selected.delayReasons}</p></div>)}
                          {selected.suspensionDatesReasons && (<div className="p-3 rounded-xl border border-red-100 bg-red-50/60"><span className="text-[10px] font-bold text-red-600 flex items-center gap-1 mb-1"><AlertCircle className="w-3 h-3" />تواريخ التوقف وأسبابها</span><p className="text-xs text-slate-700 font-semibold leading-relaxed whitespace-pre-line">{selected.suspensionDatesReasons}</p></div>)}
                          {selected.residentEngineerOpinion && (<div className="p-3 rounded-xl border border-blue-100 bg-blue-50/60"><span className="text-[10px] font-bold text-blue-600 flex items-center gap-1 mb-1"><User className="w-3 h-3" />رأي دائرة المهندس المقيم حول أداء المقاول</span><p className="text-xs text-slate-700 font-semibold leading-relaxed whitespace-pre-line">{selected.residentEngineerOpinion}</p></div>)}
                          {selected.problemsObstaclesSolutions && (<div className="p-3 rounded-xl border border-violet-100 bg-violet-50/60"><span className="text-[10px] font-bold text-violet-600 flex items-center gap-1 mb-1"><HelpCircle className="w-3 h-3" />المشاكل والمعوقات والحلول المقترحة</span><p className="text-xs text-slate-700 font-semibold leading-relaxed whitespace-pre-line">{selected.problemsObstaclesSolutions}</p></div>)}
                        </div>
                      </section>
                    )}

                    {/* Section: الموقع الجغرافي */}
                    {hasCoords(selected) && (
                      <section>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center shrink-0"><Compass className="w-3.5 h-3.5 text-white" /></div>
                          <h3 className="text-sm font-black text-slate-900">الموقع الجغرافي</h3>
                          <div className="flex-1 h-px bg-slate-100" />
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="font-mono text-xs font-bold text-slate-800 flex-1">{Number(selected.lat).toFixed(6)}, {Number(selected.lng).toFixed(6)}</span>
                          <a href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm">
                            <Navigation className="w-3 h-3" /> ملاحة Google
                          </a>
                        </div>
                      </section>
                    )}

                    {/* Notes */}
                    {selected.notes && (
                      <section>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-slate-600 flex items-center justify-center shrink-0"><FileText className="w-3.5 h-3.5 text-white" /></div>
                          <h3 className="text-sm font-black text-slate-900">ملاحظات</h3>
                          <div className="flex-1 h-px bg-slate-100" />
                        </div>
                        <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                          <p className="text-xs text-slate-700 font-semibold leading-relaxed whitespace-pre-line">{selected.notes}</p>
                        </div>
                      </section>
                    )}
                  </div>

                  {/* ── Modal Footer (fixed) ── */}
                  <div className="shrink-0 px-5 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                      {selected.district || "محافظة الأنبار"}{selected.subDistrict ? ` / ${selected.subDistrict}` : ""}
                    </div>
                    <div className="flex items-center gap-2">
                      {selected.residentEngineerPhone && (
                        <a href={`tel:${selected.residentEngineerPhone}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm">
                          <Phone className="w-3.5 h-3.5" /> اتصال بالمهندس
                        </a>
                      )}
                      <button onClick={() => setShowProjectDetail(false)} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all">
                        <X className="w-3.5 h-3.5" /> إغلاق
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* ─── Toast Feedback Notification ─────────────────────────────────── */}
      {toastMessage && (

        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3 backdrop-blur-md">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-black">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
