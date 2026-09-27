import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  X, ChevronLeft, ChevronRight, ChevronDown, Check, Building2,
  Calendar, DollarSign, MapPin, Users, FileText,
  Droplets, Wrench, Pipette, Factory, Package,
  Save, AlertCircle, CheckCircle2, Loader2,
  Clock, TrendingUp, Hash, User, Phone,
  Maximize2, Search, Eye, Trash2, Plus, Layers, RotateCcw, WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { ANBAR_DISTRICTS, type Project, type ProjectStatus, type ChangeOrderItem, getStoredProjects, saveStoredProjects } from "@/lib/mock-data";
import { saveProjectToSupabase } from "@/lib/supabase-db";
import { logActivity } from "@/lib/activity-logger";
import { toEnglishDigits, parseSingleCoordinate, parseCoordinatesInput } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
type WizardFormData = Partial<Project>;

interface Step {
  id: number;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
}

interface AddProjectWizardProps {
  open: boolean;
  onClose: () => void;
  onSave: (project: Project) => void | Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STEPS: Step[] = [
  { id: 1, icon: <FileText size={16}/>, title: "البيانات الأساسية",  subtitle: "الاسم والنوع والموقع",      color: "#2563EB" },
  { id: 2, icon: <Calendar   size={16}/>, title: "العقد والمدة والتكاليف", subtitle: "التواريخ والتكاليف وأوامر الغيار", color: "#7C3AED" },
  { id: 3, icon: <CheckCircle2 size={16}/>, title: "الاستلام واللجان", subtitle: "التسليم الأولي والنهائي واللجان", color: "#059669" },
  { id: 4, icon: <FileText size={16}/>, title: "الملاحظات إن وجدت", subtitle: "الملاحظات العامة والتقارير والمعوقات", color: "#0891B2" },
  { id: 5, icon: <Eye        size={16}/>, title: "المراجعة والحفظ",   subtitle: "تحقق من البيانات والحفظ",     color: "#D97706" },
];

const PROJECT_TYPES = [
  { value: "investment",     icon: <TrendingUp size={28}/>, label: "استثماري",     desc: "المشاريع الاستثمارية والتنموية",           color: "#059669" },
  { value: "non_investment", icon: <Building2  size={28}/>, label: "غير استثماري", desc: "المشاريع التشغيلية والتجهيزية والصيانة", color: "#2563EB" },
];

const STATUS_OPTIONS: { value: ProjectStatus; label: string; color: string }[] = [
  { value: "ongoing",   label: "قيد التنفيذ", color: "#0891B2" },
  { value: "stopped",   label: "متوقف",       color: "#DC2626" },
  { value: "completed", label: "منجز",        color: "#059669" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatMoney = (val: number): string =>
  val ? val.toLocaleString("en-US") + " د.ع" : "";

export const formatDateDMY = (dateStr: string | undefined | null): string => {
  if (!dateStr) return "";
  const str = toEnglishDigits(String(dateStr).trim());
  const parts = str.split(/[-/.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD -> DD / MM / YYYY
      return `${parts[2]} / ${parts[1]} / ${parts[0]}`;
    }
  }
  return str;
};

export const parseDurationDays = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const str = toEnglishDigits(val).trim();
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

export const calcDateAddDaysISO = (startIso: string | undefined | null, days: number): string => {
  if (!startIso || !days || isNaN(days) || days <= 0) return "";
  try {
    const cleanStr = String(startIso).trim().split("T")[0];
    const parts = cleanStr.split(/[-/.]/);
    let year: number, month: number, day: number;
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      } else {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
      }
    } else {
      return "";
    }
    const d = new Date(year, month, day);
    if (isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + Number(days));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  } catch {
    return "";
  }
};

export const calcEndDate = (start: string, days: number): string => {
  const iso = calcDateAddDaysISO(start, days);
  return formatDateDMY(iso);
};

// ─── Sub-Components ───────────────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: "13px", fontWeight: 800, color: "#0F172A", marginBottom: "6px" }}>
      {children}
      {required && <span style={{ color: "#EF4444", marginRight: "4px" }}>*</span>}
    </label>
  );
}

function FormInput({
  label, required, value, onChange, type = "text", placeholder, disabled, hint,
}: {
  label: string; required?: boolean; value: string | number; onChange: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean; hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        type={type}
        value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        dir="rtl"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", padding: "11px 16px", borderRadius: "16px", fontSize: "14px", fontWeight: 700,
          border: `2px solid ${focused ? "#06B6D4" : "#E2E8F0"}`,
          background: disabled ? "#F8FAFC" : "#FFFFFF",
          color: disabled ? "#94A3B8" : "#0F172A",
          minHeight: "44px",
          outline: "none", boxSizing: "border-box", textAlign: "right",
          boxShadow: focused ? "0 0 0 4px rgba(6,182,212,0.15)" : "0 1px 2px rgba(0,0,0,0.03)",
          transition: "all 0.2s ease",
          fontFamily: "inherit",
        }}
      />
      {hint && <p style={{ fontSize: "11px", color: "#64748B", margin: 0 }}>{hint}</p>}
    </div>
  );
}

function FormTextarea({
  label, value, onChange, placeholder, rows = 3,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        dir="rtl"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", padding: "12px 16px", borderRadius: "16px", fontSize: "14px", fontWeight: 700,
          border: `2px solid ${focused ? "#06B6D4" : "#E2E8F0"}`,
          outline: "none", resize: "vertical", fontFamily: "inherit",
          boxShadow: focused ? "0 0 0 4px rgba(6,182,212,0.15)" : "0 1px 2px rgba(0,0,0,0.03)",
          transition: "all 0.2s ease",
          boxSizing: "border-box", textAlign: "right", lineHeight: "1.6",
        }}
      />
    </div>
  );
}

function FormDateInputRTL({
  label,
  value,
  onChange,
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  hint?: string;
}) {
  const parseISO = (isoStr: string) => {
    if (!isoStr) return { day: "", month: "", year: "" };
    const parts = isoStr.split("-");
    if (parts.length === 3) {
      return { year: parts[0], month: parts[1], day: parts[2] };
    }
    return { day: "", month: "", year: "" };
  };

  const { day, month, year } = parseISO(value || "");

  const handleUpdate = (newDay: string, newMonth: string, newYear: string) => {
    if (!newDay && !newMonth && !newYear) {
      onChange("");
      return;
    }
    const d = newDay ? newDay.padStart(2, "0") : "01";
    const m = newMonth ? newMonth.padStart(2, "0") : "01";
    const y = newYear || new Date().getFullYear().toString();
    onChange(`${y}-${m}-${d}`);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => String(currentYear - 10 + i));
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <FieldLabel required={required}>{label}</FieldLabel>
        {value && (
          <span style={{
            fontSize: "11.5px", fontWeight: 800, color: "#1D4ED8",
            background: "#EFF6FF", padding: "3px 10px", borderRadius: "12px", border: "1px solid #BFDBFE"
          }}>
            📅 {day || "01"} / {month || "01"} / {year || currentYear}
          </span>
        )}
      </div>

      {/* Unified Ultra-Modern RTL Input Bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "4px", direction: "rtl",
        background: value ? "#FFFFFF" : "#F8FAFC",
        border: `1.5px solid ${value ? "#3B82F6" : "#CBD5E1"}`,
        borderRadius: "14px",
        padding: "4px 8px",
        boxShadow: value ? "0 0 0 3px rgba(37, 99, 235, 0.1)" : "0 1px 3px rgba(0,0,0,0.03)",
        transition: "all 0.2s ease"
      }}>
        {/* Day Select (يمين) */}
        <div style={{ flex: 1, position: "relative" }}>
          <select
            value={day}
            onChange={e => handleUpdate(e.target.value, month, year)}
            style={{
              width: "100%", padding: "8px 4px", borderRadius: "8px", fontSize: "13.5px", fontWeight: 700,
              border: "none", background: "transparent", color: day ? "#0F172A" : "#94A3B8", outline: "none",
              cursor: "pointer", textAlign: "center", direction: "rtl"
            }}
          >
            <option value="">اليوم</option>
            {days.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <span style={{ fontWeight: 800, color: "#CBD5E1", fontSize: "14px" }}>/</span>

        {/* Month Select (وسط - أرقام فقط) */}
        <div style={{ flex: 1, position: "relative" }}>
          <select
            value={month}
            onChange={e => handleUpdate(day, e.target.value, year)}
            style={{
              width: "100%", padding: "8px 4px", borderRadius: "8px", fontSize: "13.5px", fontWeight: 700,
              border: "none", background: "transparent", color: month ? "#0F172A" : "#94A3B8", outline: "none",
              cursor: "pointer", textAlign: "center", direction: "rtl"
            }}
          >
            <option value="">الشهر</option>
            {months.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <span style={{ fontWeight: 800, color: "#CBD5E1", fontSize: "14px" }}>/</span>

        {/* Year Select (يسار) */}
        <div style={{ flex: 1.2, position: "relative" }}>
          <select
            value={year}
            onChange={e => handleUpdate(day, month, e.target.value)}
            style={{
              width: "100%", padding: "8px 4px", borderRadius: "8px", fontSize: "13.5px", fontWeight: 700,
              border: "none", background: "transparent", color: year ? "#0F172A" : "#94A3B8", outline: "none",
              cursor: "pointer", textAlign: "center", direction: "rtl"
            }}
          >
            <option value="">السنة</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Calendar Picker Trigger */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", marginLeft: "2px" }}>
          <input
            type="date"
            value={value || ""}
            onChange={e => onChange(e.target.value)}
            style={{
              position: "absolute", opacity: 0, width: "34px", height: "34px", cursor: "pointer", zIndex: 2, left: 0, top: 0
            }}
          />
          <button
            type="button"
            title="اختر من التقويم"
            style={{
              width: "34px", height: "34px", borderRadius: "10px", border: "1px solid #BFDBFE",
              background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)", color: "#2563EB",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              boxShadow: "0 2px 5px rgba(37, 99, 235, 0.15)"
            }}
          >
            <Calendar size={16} />
          </button>
        </div>
      </div>

      {hint && <span style={{ fontSize: "11px", color: "#6B7280" }}>{hint}</span>}
    </div>
  );
}

// ─── Modern Custom Dropdown Component ─────────────────────────────────────────
interface DropdownOption {
  id: string;
  label: string;
  subLabel?: string;
  badge?: string;
}

function ModernDropdownSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "-- اختر من القائمة --",
  searchPlaceholder = "ابحث بالاسم...",
  icon = <MapPin size={16} />,
  required = false,
  badgeText,
}: {
  label: string;
  options: DropdownOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  icon?: React.ReactNode;
  required?: boolean;
  badgeText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.id === value);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q) || (o.subLabel && o.subLabel.toLowerCase().includes(q)));
  }, [options, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <FieldLabel required={required}>{label}</FieldLabel>
        {badgeText && (
          <span style={{
            fontSize: "11px", fontWeight: 700, color: "#0284C7",
            background: "#E0F2FE", padding: "3px 10px", borderRadius: "12px", border: "1px solid #BAE6FD"
          }}>
            {badgeText}
          </span>
        )}
      </div>

      {/* Trigger Input/Button */}
      <div
        onClick={() => setOpen(prev => !prev)}
        style={{
          width: "100%",
          padding: "11px 14px",
          borderRadius: "12px",
          border: `1.5px solid ${open ? "#2563EB" : selectedOption ? "#3B82F6" : "#CBD5E1"}`,
          background: open ? "#FFFFFF" : selectedOption ? "#F8FAFC" : "#FFFFFF",
          color: selectedOption ? "#0F172A" : "#64748B",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: open ? "0 0 0 4px rgba(37, 99, 235, 0.12)" : "0 1px 3px rgba(0,0,0,0.04)",
          transition: "all 0.2s ease",
          userSelect: "none",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
          <div style={{ color: selectedOption ? "#2563EB" : "#94A3B8", display: "flex", alignItems: "center" }}>
            {icon}
          </div>
          {selectedOption ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, overflow: "hidden" }}>
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0F172A", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span style={{ fontSize: "10px", fontWeight: 600, color: "#2563EB", background: "#EFF6FF", padding: "2px 6px", borderRadius: "6px", flexShrink: 0 }}>
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: "13.5px", fontWeight: 500, color: "#94A3B8" }}>{placeholder}</span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {selectedOption && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              style={{
                background: "#E2E8F0", border: "none", borderRadius: "50%",
                width: "20px", height: "20px", display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer", color: "#64748B"
              }}
            >
              <X size={12} />
            </button>
          )}
          <ChevronDown
            size={16}
            style={{
              color: open ? "#2563EB" : "#64748B",
              transition: "transform 0.2s ease",
              transform: open ? "rotate(180deg)" : "rotate(0deg)"
            }}
          />
        </div>
      </div>

      {/* Popover Menu Panel */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0, right: 0,
          zIndex: 100,
          background: "#FFFFFF",
          borderRadius: "14px",
          border: "1.5px solid #E2E8F0",
          boxShadow: "0 12px 36px -4px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.04)",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          maxHeight: "260px",
        }}>
          {/* Search Box */}
          <div style={{ position: "relative", width: "100%" }}>
            <input
              type="text"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              dir="rtl"
              style={{
                width: "100%", padding: "8px 30px 8px 10px", borderRadius: "8px", fontSize: "12px",
                border: "1px solid #CBD5E1", background: "#F8FAFC", color: "#0F172A",
                outline: "none", boxSizing: "border-box", textAlign: "right"
              }}
            />
            <Search size={14} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
          </div>

          {/* Options List */}
          <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: "12px", textAlign: "center", fontSize: "12px", color: "#94A3B8" }}>
                لا تتوفر نتائج مطابقة
              </div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = opt.id === value;
                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      onChange(opt.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    style={{
                      padding: "9px 12px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: isSelected ? 700 : 500,
                      background: isSelected ? "#EFF6FF" : "#FFFFFF",
                      color: isSelected ? "#1D4ED8" : "#334155",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = "#F8FAFC";
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = "#FFFFFF";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>{opt.label}</span>
                      {opt.subLabel && <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 400 }}>({opt.subLabel})</span>}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {opt.badge && (
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "#475569", background: "#F1F5F9", padding: "2px 6px", borderRadius: "6px" }}>
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check size={14} color="#2563EB" strokeWidth={2.5} />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionCard({
  icon, title, desc, children,
}: {
  icon: React.ReactNode; title: string; desc?: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "linear-gradient(180deg, #FFFFFF 0%, #F0F9FF 100%)", borderRadius: "24px", border: "1.5px solid #BAE6FD",
      boxShadow: "0 4px 20px -4px rgba(6,182,212,0.08)", padding: "22px", marginBottom: "20px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", paddingBottom: "14px", borderBottom: "1.5px solid #E0F2FE" }}>
        <div style={{
          width: "42px", height: "42px", borderRadius: "14px", background: "rgba(6,182,212,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#0891B2", border: "1px solid #BAE6FD", flexShrink: 0,
        }}>{icon}</div>
        <div>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#0F172A" }}>{title}</h3>
          {desc && <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#64748B", fontWeight: 600 }}>{desc}</p>}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
      {children}
    </div>
  );
}

function Grid3({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
      {children}
    </div>
  );
}

// ─── Coordinate Inputs Component (N & E Dedicated Fields + Auto-Combined Output) ───
export interface CoordinateInputsProps {
  lat?: number;
  lng?: number;
  onChange: (lat?: number, lng?: number) => void;
}

export function CoordinateInputs({ lat, lng, onChange }: CoordinateInputsProps) {
  const [latText, setLatText] = useState<string>(lat !== undefined && lat !== null && !isNaN(lat) ? String(lat) : "");
  const [lngText, setLngText] = useState<string>(lng !== undefined && lng !== null && !isNaN(lng) ? String(lng) : "");
  const [combinedText, setCombinedText] = useState<string>("");

  useEffect(() => {
    setLatText(lat !== undefined && lat !== null && !isNaN(lat) ? String(lat) : "");
  }, [lat]);

  useEffect(() => {
    setLngText(lng !== undefined && lng !== null && !isNaN(lng) ? String(lng) : "");
  }, [lng]);

  const combinedDisplay = lat && lng ? `N ${lat} , E ${lng}` : "";
  const googleMapsUrl = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null;

  const handleLatChange = (val: string) => {
    setLatText(val);
    if (!val.trim()) {
      onChange(undefined, lng);
      return;
    }
    const parsedBoth = parseCoordinatesInput(val);
    if (parsedBoth.lat !== undefined && parsedBoth.lng !== undefined) {
      setLatText(String(parsedBoth.lat));
      setLngText(String(parsedBoth.lng));
      onChange(parsedBoth.lat, parsedBoth.lng);
      return;
    }
    const single = parseSingleCoordinate(val);
    if (single !== undefined && Math.abs(single) <= 90) {
      onChange(single, lng);
    }
  };

  const handleLngChange = (val: string) => {
    setLngText(val);
    if (!val.trim()) {
      onChange(lat, undefined);
      return;
    }
    const parsedBoth = parseCoordinatesInput(val);
    if (parsedBoth.lat !== undefined && parsedBoth.lng !== undefined) {
      setLatText(String(parsedBoth.lat));
      setLngText(String(parsedBoth.lng));
      onChange(parsedBoth.lat, parsedBoth.lng);
      return;
    }
    const single = parseSingleCoordinate(val);
    if (single !== undefined && Math.abs(single) <= 180) {
      onChange(lat, single);
    }
  };

  const handleCombinedChange = (val: string) => {
    setCombinedText(val);
    if (!val.trim()) {
      setLatText("");
      setLngText("");
      onChange(undefined, undefined);
      return;
    }
    const parsed = parseCoordinatesInput(val);
    if (parsed.lat !== undefined && parsed.lng !== undefined) {
      setLatText(String(parsed.lat));
      setLngText(String(parsed.lng));
      onChange(parsed.lat, parsed.lng);
    } else if (parsed.lat !== undefined) {
      setLatText(String(parsed.lat));
      onChange(parsed.lat, lng);
    } else if (parsed.lng !== undefined) {
      setLngText(String(parsed.lng));
      onChange(lat, parsed.lng);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("تحديد الموقع غير مدعوم في هذا المتصفح");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const curLat = parseFloat(pos.coords.latitude.toFixed(6));
        const curLng = parseFloat(pos.coords.longitude.toFixed(6));
        setLatText(String(curLat));
        setLngText(String(curLng));
        onChange(curLat, curLng);
        toast.success(`تم تحديد موقعك: N ${curLat} , E ${curLng}`);
      },
      () => toast.error("تعذر جلب موقعك، يرجى تفعيل الـ GPS")
    );
  };

  const handleClear = () => {
    setLatText("");
    setLngText("");
    setCombinedText("");
    onChange(undefined, undefined);
  };

  return (
    <div className="bg-gradient-to-b from-blue-50/80 to-slate-50/90 dark:from-slate-900 dark:to-slate-800/80 p-4 rounded-2xl border-2 border-blue-200/80 dark:border-blue-900/60 space-y-3.5 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
            📍
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 dark:text-slate-100 block">
              إحداثيات الموقع الجغرافي (GIS)
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              أدخل قيم N و E وسيقوم النظام بجمعهما في حقل الإحداثية الموحدة تلقائياً
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleGetLocation}
            className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 hover:bg-blue-200 transition-all cursor-pointer shadow-xs"
          >
            🎯 موقعي
          </button>
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200 transition-all cursor-pointer shadow-xs"
            >
              🗺️ خرائط Google
            </a>
          )}
          {(lat || lng) && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-200 transition-all cursor-pointer"
            >
              ✕ تفريغ
            </button>
          )}
        </div>
      </div>

      {/* 2 Fields: N and E */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* N Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[11px] font-black">N</span>
              حقل خط العرض (شمالاً / N)
            </label>
            <span className="text-[10px] text-slate-400 font-mono">Latitude</span>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-black text-blue-600 text-xs select-none">
              N
            </span>
            <input
              type="text"
              dir="ltr"
              inputMode="decimal"
              value={latText}
              onChange={(e) => handleLatChange(e.target.value)}
              placeholder="مثال: 33.315366"
              className="w-full h-10 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 px-3 pl-8 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400/25 transition-all"
            />
          </div>
        </div>

        {/* E Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-teal-600 text-white flex items-center justify-center text-[11px] font-black">E</span>
              حقل خط الطول (شرقاً / E)
            </label>
            <span className="text-[10px] text-slate-400 font-mono">Longitude</span>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-black text-teal-600 text-xs select-none">
              E
            </span>
            <input
              type="text"
              dir="ltr"
              inputMode="decimal"
              value={lngText}
              onChange={(e) => handleLngChange(e.target.value)}
              placeholder="مثال: 43.760076"
              className="w-full h-10 rounded-xl border-2 border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900 px-3 pl-8 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-400/25 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Combined Output Field */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <span>📋</span>
            الإحداثية المجمعة (الناتج الموحد):
          </label>
          {lat && lng ? (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`${lat}, ${lng}`);
                toast.success("تم نسخ الإحداثيات إلى الحافظة!");
              }}
              className="text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-md transition-colors"
            >
              نسخ الإحداثيات 📄
            </button>
          ) : null}
        </div>
        <div className="relative">
          <input
            type="text"
            dir="ltr"
            value={combinedDisplay || combinedText}
            onChange={(e) => handleCombinedChange(e.target.value)}
            placeholder="ستظهر الإحداثيات المجمعة هنا تلقائياً، أو الصق الإحداثية المركبة كاملة..."
            className="w-full h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-3 text-xs font-mono font-black text-emerald-800 dark:text-emerald-300 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/20"
          />
        </div>
        {lat && lng ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900 font-mono">
            <span>الصيغة المجمعة: <strong>N {lat} , E {lng}</strong></span>
            <span>Google Maps: <strong>{lat}, {lng}</strong></span>
          </div>
        ) : (
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
            💡 اكتب قيمة <strong>N</strong> و <strong>E</strong> في الحقلين بالأعلى، وستُجمع تلقائياً في هذا الحقل بصيغة جاهزة للخرائط والتقارير.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ currentStep, steps }: { currentStep: number; steps: Step[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0", padding: "0 8px" }}>
      {steps.map((step, idx) => {
        const isDone = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        return (
          <React.Fragment key={step.id}>
            {idx > 0 && (
              <div style={{
                flex: 1, height: "2px", maxWidth: "48px",
                background: isDone ? "#2563EB" : "#E5E7EB",
                transition: "background 0.4s ease",
              }} />
            )}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", minWidth: "60px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "50%", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: "13px",
                fontWeight: 700, transition: "all 0.3s ease", flexShrink: 0,
                background: isDone ? "#2563EB" : isCurrent ? "#EFF6FF" : "#F9FAFB",
                color: isDone ? "#FFFFFF" : isCurrent ? "#2563EB" : "#9CA3AF",
                border: `2px solid ${isDone ? "#2563EB" : isCurrent ? "#2563EB" : "#E5E7EB"}`,
                boxShadow: isCurrent ? "0 0 0 4px rgba(37,99,235,0.15)" : "none",
              }}>
                {isDone ? <Check size={16}/> : step.id}
              </div>
              <span style={{
                fontSize: "10px", fontWeight: isCurrent ? 700 : 500, textAlign: "center",
                color: isDone ? "#2563EB" : isCurrent ? "#111827" : "#9CA3AF",
                whiteSpace: "nowrap",
              }}>
                {step.title}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Supervisor Input Component ─────────────────────────────────────────────
function SupervisorInput({
  supervisors,
  onChange,
}: {
  supervisors: string[];
  onChange: (sups: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    if (!inputValue.trim()) return;
    const newNames = inputValue
      .split(/[,،\n]+/)
      .map(s => s.trim())
      .filter(Boolean);
    
    if (newNames.length > 0) {
      const updated = Array.from(new Set([...supervisors, ...newNames]));
      onChange(updated);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (index: number) => {
    const updated = supervisors.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <FieldLabel>المشرفون المرافقون للمهندس (إضافة أكثر من مشرف)</FieldLabel>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب اسم المشرف واضغط إضافة..."
          dir="rtl"
          style={{
            flex: 1, padding: "10px 14px", borderRadius: "10px", fontSize: "14px",
            border: "1.5px solid #E5E7EB", outline: "none", textAlign: "right",
            fontFamily: "inherit", background: "#FFFFFF", color: "#111827",
            boxSizing: "border-box",
          }}
        />
        <button
          type="button"
          onClick={handleAdd}
          style={{
            padding: "0 18px", borderRadius: "10px", background: "#2563EB", color: "#FFFFFF",
            border: "none", fontWeight: 600, fontSize: "13px", cursor: "pointer",
            transition: "background 0.15s", whiteSpace: "nowrap"
          }}
        >
          إضافة +
        </button>
      </div>
      <div style={{
        padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #E5E7EB",
        background: "#F9FAFB", minHeight: "44px", display: "flex", flexWrap: "wrap", gap: "8px",
        alignItems: "center", marginTop: "4px"
      }}>
        {supervisors && supervisors.length > 0 ? (
          supervisors.map((sup, idx) => (
            <span key={idx} style={{
              background: "#EFF6FF", border: "1px solid #BFDBFE",
              borderRadius: "8px", padding: "4px 10px", fontSize: "12px", color: "#1E40AF",
              fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px"
            }}>
              <span>👤 {sup}</span>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: "2px",
                  borderRadius: "50%"
                }}
                title="حذف"
              >
                <X size={14} style={{ color: "#EF4444" }} />
              </button>
            </span>
          ))
        ) : (
          <span style={{ fontSize: "12px", color: "#9CA3AF" }}>لم يتم إضافة مشرفين بعد. يمكنك كتابة اسم المشرف أعلاه ثم الضغط على إضافة.</span>
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Basic Info ───────────────────────────────────────────────────────
function Step1Basic({ data, onChange }: { data: WizardFormData; onChange: (f: keyof WizardFormData, v: any) => void }) {
  const selectedDistrict = ANBAR_DISTRICTS.find(d =>
    (data.district && data.district === d.name) ||
    (data.location && data.location.includes(d.name))
  );

  const districtOptions = useMemo(() => {
    return ANBAR_DISTRICTS.map(d => ({
      id: d.id,
      label: d.name,
      subLabel: d.fullName,
    }));
  }, []);

  const subDistrictOptions = useMemo(() => {
    if (!selectedDistrict || !selectedDistrict.subDistricts) return [];
    return selectedDistrict.subDistricts.map(sub => {
      const formatted = sub.startsWith("ناحية") || sub.startsWith("مركز") ? sub : `ناحية ${sub}`;
      return {
        id: formatted,
        label: formatted,
      };
    });
  }, [selectedDistrict]);

  const updateFullLocation = (districtObj: AnbarDistrict, subDistName: string, currentLoc: string | undefined) => {
    const suffix = currentLoc && currentLoc.includes(" - ") ? currentLoc.split(" - ")[1] : "";
    let baseLoc = districtObj.fullName;
    if (subDistName && subDistName.trim()) {
      const trimmed = subDistName.trim();
      const formattedSub = trimmed.startsWith("ناحية") || trimmed.startsWith("مركز")
        ? trimmed
        : `ناحية ${trimmed}`;
      baseLoc = `${districtObj.fullName} / ${formattedSub}`;
    }
    const newLoc = suffix ? `${baseLoc} - ${suffix}` : baseLoc;
    onChange("location", newLoc);
  };

  return (
    <div>
      {/* Project Type Cards */}
      <SectionCard icon={<Building2 size={18}/>} title="نوع المشروع" desc="اختر تصنيف المشروع">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px" }}>
          {PROJECT_TYPES.map(pt => (
            <button
              key={pt.value}
              type="button"
              onClick={() => onChange("type", pt.value)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
                padding: "18px 10px", borderRadius: "14px", border: "2px solid",
                borderColor: data.type === pt.value ? pt.color : "#E5E7EB",
                background: data.type === pt.value ? `${pt.color}12` : "#FAFAFA",
                cursor: "pointer", transition: "all 0.2s ease",
                transform: data.type === pt.value ? "translateY(-2px)" : "none",
                boxShadow: data.type === pt.value ? `0 4px 16px ${pt.color}30` : "none",
              }}
            >
              <div style={{ color: data.type === pt.value ? pt.color : "#6B7280", transition: "color 0.2s" }}>
                {pt.icon}
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: data.type === pt.value ? pt.color : "#374151" }}>
                  {pt.label}
                </div>
                <div style={{ fontSize: "10px", color: "#9CA3AF", marginTop: "2px" }}>{pt.desc}</div>
              </div>
              {data.type === pt.value && (
                <div style={{
                  position: "absolute", top: "8px", left: "8px",
                  width: "20px", height: "20px", borderRadius: "50%",
                  background: pt.color, display: "flex", alignItems: "center", justifyContent: "center",
                }}><Check size={12} color="white"/></div>
              )}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Basic Fields */}
      <SectionCard icon={<FileText size={18}/>} title="معلومات الاساسية للمشروع" desc="البيانات التعريفية للمشروع">
        <Grid2>
          <FormInput label="اسم المشروع" required value={data.name || ""} onChange={v => onChange("name", v)}
            placeholder="أدخل الاسم الكامل للمشروع" />
          <FormInput label="الشركة المنفذة" value={data.contractor || ""} onChange={v => onChange("contractor", v)}
            placeholder="اسم الشركة المنفذة" />
          <FormInput label="اسم المركز" value={data.centerName || ""} onChange={v => onChange("centerName", v)}
            placeholder="أدخل اسم المركز..." />
          <FormInput label="الجهة الممولة للمشروع" value={data.fundingSource || ""} onChange={v => onChange("fundingSource", v)}
            placeholder="مثال: الخطة الاستثمارية / محافظة الأنبار / تمويل مركزي" />
          <FormInput label="طريقة الإحالة" value={data.referralMethod || ""} onChange={v => onChange("referralMethod", v)}
            placeholder="مثال: مناقصة عامة / دعوة مباشرة / تنفيذ مباشر" />
          <div>
            <FieldLabel>حالة المشروع ونسبة الإنجاز</FieldLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => {
                    onChange("status", s.value);
                    if (s.value === "completed") {
                      onChange("actualProgress", 100);
                      onChange("plannedProgress", 100);
                    } else if (s.value === "not_started" && (!data.actualProgress || data.actualProgress === 100)) {
                      onChange("actualProgress", 0);
                    }
                  }}
                  style={{
                    padding: "8px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                    border: `1.5px solid ${data.status === s.value ? s.color : "#E5E7EB"}`,
                    background: data.status === s.value ? `${s.color}15` : "#FAFAFA",
                    color: data.status === s.value ? s.color : "#6B7280",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Percentage Display & Numeric Input */}
            <div style={{ marginTop: "10px", background: "#F8FAFC", padding: "12px 14px", borderRadius: "12px", border: "1.5px solid #E2E8F0" }}>
              {data.status === "completed" ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#374151" }}>نسبة الإنجاز الفعلي:</span>
                  <span style={{
                    fontSize: "13px", fontWeight: 800, color: "#059669",
                    background: "#D1FAE5", padding: "4px 14px", borderRadius: "20px", border: "1px solid #6EE7B7"
                  }}>
                    100% (منجز بالكامل)
                  </span>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                  <label style={{ fontSize: "12.5px", fontWeight: 700, color: "#374151", whitespace: "nowrap" }}>
                    أدخل نسبة الإنجاز الفعلي (%):
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={data.actualProgress === undefined || data.actualProgress === null ? 0 : data.actualProgress}
                      onChange={e => {
                        const raw = e.target.value;
                        if (raw === "") {
                          onChange("actualProgress", 0);
                        } else {
                          const val = Math.min(100, Math.max(0, Number(raw) || 0));
                          onChange("actualProgress", val);
                          if (val >= 100) {
                            onChange("status", "completed");
                          }
                        }
                      }}
                      placeholder="0"
                      dir="ltr"
                      style={{
                        width: "85px", padding: "6px 10px", borderRadius: "8px", fontSize: "14px", fontWeight: 800,
                        border: "1.5px solid #2563EB", textAlign: "center", background: "#FFFFFF", color: "#1D4ED8",
                        outline: "none", boxShadow: "0 1px 3px rgba(37,99,235,0.12)"
                      }}
                    />
                    <span style={{ fontSize: "14px", fontWeight: 800, color: "#2563EB" }}>%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 1. Anbar Location Selection Box - Ultra-Modern Custom Dropdowns */}
          <div style={{
            gridColumn: "1 / -1",
            background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
            padding: "20px",
            borderRadius: "18px",
            border: "1.5px solid #E2E8F0",
            boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.05)",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}>
            {/* Header with Title & Live Breadcrumb */}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "12px",
                  background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)"
                }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "14.5px", fontWeight: 800, color: "#0F172A" }}>
                    موقع المشروع في محافظة الأنبار <span style={{ color: "#EF4444" }}>*</span>
                  </h4>
                  <span style={{ fontSize: "11px", color: "#64748B" }}>اختر القضاء والناحية عبر القوائم المنسدلة الذكية</span>
                </div>
              </div>

              {/* Dynamic Live Breadcrumb Ribbon */}
              {selectedDistrict && (
                <div style={{
                  fontSize: "12px", fontWeight: 700, padding: "6px 16px", borderRadius: "20px",
                  background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE",
                  boxShadow: "0 2px 6px rgba(37, 99, 235, 0.08)",
                  display: "flex", alignItems: "center", gap: "6px"
                }}>
                  <span>الأنبار</span>
                  <span style={{ color: "#93C5FD" }}>‹</span>
                  <span style={{ color: "#2563EB" }}>قضاء {selectedDistrict.name}</span>
                  {data.subDistrict && (
                    <>
                      <span style={{ color: "#93C5FD" }}>‹</span>
                      <span style={{ color: "#0284C7" }}>{data.subDistrict}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 1️⃣ District Dropdown Selection */}
            <ModernDropdownSelect
              label="📍 اختر القضاء بمحافظة الأنبار"
              required
              options={districtOptions}
              value={selectedDistrict?.id || ""}
              placeholder="-- اضغط هنا لاختيار القضاء بالأنبار --"
              searchPlaceholder="🔍 ابحث عن قضاء (مثل: الرمادي، الفلوجة، هيت)..."
              icon={<MapPin size={17} />}
              onChange={distId => {
                const selected = ANBAR_DISTRICTS.find(d => d.id === distId);
                if (selected) {
                  onChange("district", selected.name);
                  onChange("subDistrict", "");
                  updateFullLocation(selected, "", data.location);
                } else {
                  onChange("district", "");
                  onChange("subDistrict", "");
                }
              }}
            />

            {/* 2️⃣ Sub-district Section (Typing Text Input Only) */}
            {selectedDistrict && (
              <div style={{
                background: "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)",
                padding: "16px",
                borderRadius: "14px",
                border: "1.5px solid #7DD3FC",
                boxShadow: "0 4px 14px rgba(2, 132, 199, 0.06)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "16px" }}>🏛️</span>
                    <label style={{ fontSize: "13px", fontWeight: 800, color: "#0369A1" }}>
                      كتابة الناحية التابعة لقضاء ({selectedDistrict.name}):
                    </label>
                  </div>
                  <span style={{
                    fontSize: "11px", fontWeight: 700, color: "#0284C7",
                    background: "#FFFFFF", padding: "3px 10px", borderRadius: "12px",
                    border: "1px solid #BAE6FD", boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
                  }}>
                    اختياري
                  </span>
                </div>

                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    type="text"
                    value={data.subDistrict || ""}
                    onChange={e => {
                      const val = e.target.value;
                      onChange("subDistrict", val);
                      updateFullLocation(selectedDistrict, val, data.location);
                    }}
                    placeholder={`أدخل اسم الناحية هنا (مثال: ناحية ${selectedDistrict.subDistricts?.[1] || "البغدادي"})...`}
                    dir="rtl"
                    style={{
                      width: "100%", padding: "10px 14px 10px 36px", borderRadius: "10px", fontSize: "13.5px", fontWeight: 600,
                      border: "1.5px solid #38BDF8", background: "#FFFFFF", color: "#0F172A",
                      outline: "none", boxSizing: "border-box", textAlign: "right",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                    }}
                  />
                  {data.subDistrict && (
                    <button
                      type="button"
                      onClick={() => {
                        onChange("subDistrict", "");
                        updateFullLocation(selectedDistrict, "", data.location);
                      }}
                      style={{
                        position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)",
                        background: "#E0F2FE", border: "none", borderRadius: "50%", width: "22px", height: "22px",
                        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#0284C7"
                      }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 3️⃣ Exact Location Address Textbox */}
            <div style={{ marginTop: "2px" }}>
              <FormInput
                label="تفاصيل عنوان الموقع الدقيق في الأنبار (المنطقة، الحي، القرية)"
                value={data.location || ""}
                onChange={v => onChange("location", v)}
                placeholder="الأنبار / القضاء / الناحية / المنطقة أو القرية..."
                hint="يتحدث عنوان المشروع تلقائياً وفق خيارات القضاء والناحية مع إمكانية تعديله يدوياً"
              />
            </div>
          </div>

          {/* 2. Google Maps Coordinates Full Box with N & E fields */}
          <div style={{ gridColumn: "1 / -1" }}>
            <CoordinateInputs
              lat={data.lat}
              lng={data.lng}
              onChange={(newLat, newLng) => {
                onChange("lat", newLat);
                onChange("lng", newLng);
              }}
            />
          </div>
        </Grid2>
      </SectionCard>

      <SectionCard icon={<Users size={18}/>} title="دائرة المهندس المقيم" desc="إدخال اسم المهندس المقيم والمشرفين المرافقين ورقم التواصل">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <FormInput
            label="المهندس المقيم"
            value={data.residentEngineerName || ""}
            onChange={v => onChange("residentEngineerName", v)}
            placeholder="أدخل اسم المهندس المقيم..."
          />
          <FormInput
            label="رقم هاتف المهندس"
            value={data.residentEngineerPhone || ""}
            onChange={v => onChange("residentEngineerPhone", v)}
            placeholder="0770xxxxxxx"
          />
        </div>
        <div style={{ marginTop: "8px" }}>
          <SupervisorInput
            supervisors={data.selectedSupervisors || []}
            onChange={sups => onChange("selectedSupervisors", sups)}
          />
        </div>
      </SectionCard>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// 📋 Change Orders Manager Component (أوامر الغيار المتعددة بالتفصيل)
// ───────────────────────────────────────────────────────────────────────────
export function ChangeOrdersManager({
  changeOrdersList,
  contractValue,
  currency = "IQD",
  onChangeList,
  onChangeTotal,
  onChangeCount,
}: {
  changeOrdersList?: ChangeOrderItem[];
  contractValue?: number;
  currency?: "IQD" | "USD";
  onChangeList: (list: ChangeOrderItem[]) => void;
  onChangeTotal?: (total: number) => void;
  onChangeCount?: (count: number) => void;
}) {
  const items = Array.isArray(changeOrdersList) ? changeOrdersList : [];
  const currSym = currency === "USD" ? "$" : "د.ع";

  const updateAll = (newList: ChangeOrderItem[]) => {
    const totalAmount = newList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    onChangeList(newList);
    if (onChangeTotal) onChangeTotal(totalAmount);
    if (onChangeCount) onChangeCount(newList.length);
  };

  const handleCountInputChange = (newCountVal: number) => {
    const count = Math.max(0, Math.min(25, newCountVal));
    let newList = [...items];
    if (count > newList.length) {
      const toAdd = count - newList.length;
      for (let i = 0; i < toAdd; i++) {
        const nextNum = newList.length + 1;
        newList.push({
          id: `CO-${Date.now()}-${nextNum}`,
          orderNo: `أمر غيار رقم ${nextNum}`,
          orderDate: new Date().toISOString().split("T")[0],
          amount: 0,
          notes: "",
        });
      }
    } else if (count < newList.length) {
      newList = newList.slice(0, count);
    }
    updateAll(newList);
  };

  const handleAddItem = () => {
    const nextNum = items.length + 1;
    const newList = [
      ...items,
      {
        id: `CO-${Date.now()}-${nextNum}`,
        orderNo: `أمر غيار رقم ${nextNum}`,
        orderDate: new Date().toISOString().split("T")[0],
        amount: 0,
        notes: "",
      },
    ];
    updateAll(newList);
  };

  const handleRemoveItem = (index: number) => {
    const newList = items.filter((_, i) => i !== index);
    updateAll(newList);
  };

  const handleUpdateItem = (index: number, field: keyof ChangeOrderItem, value: any) => {
    const newList = [...items];
    newList[index] = { ...newList[index], [field]: value };
    updateAll(newList);
  };

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalWorkCost = Number(contractValue || 0) + totalAmount;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header Bar */}
      <div style={{
        display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center",
        padding: "14px 18px", borderRadius: "14px", background: "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)",
        border: "1.5px solid #CBD5E1", gap: "12px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "12px", background: "#EDE9FE",
            color: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900
          }}>
            <Layers size={20} />
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#1E293B" }}>
              أوامر الغيار للمشروع ({items.length} أمر)
            </div>
            <div style={{ fontSize: "11.5px", color: "#64748B" }}>
              حدد عدد أوامر الغيار وسجل رقم وتاريخ ومبلغ كل أمر بالتفصيل
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#334155" }}>عدد الأوامر:</span>
            <input
              type="number"
              min="0"
              max="25"
              value={items.length || 0}
              onChange={(e) => handleCountInputChange(parseInt(e.target.value) || 0)}
              style={{
                width: "70px", padding: "7px 10px", borderRadius: "8px", border: "1.5px solid #7C3AED",
                textAlign: "center", fontWeight: 900, fontSize: "15px", color: "#7C3AED", background: "#FFFFFF",
                outline: "none", boxShadow: "0 1px 3px rgba(124,58,237,0.15)"
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px",
              borderRadius: "10px", background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
              color: "#FFFFFF", border: "none", fontSize: "12.5px", fontWeight: 800, cursor: "pointer",
              boxShadow: "0 2px 8px rgba(124,58,237,0.3)"
            }}
          >
            <Plus size={16} />
            إضافة أمر غيار
          </button>
        </div>
      </div>

      {/* Change Orders Cards List */}
      {items.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "28px 16px", borderRadius: "14px",
          border: "2px dashed #CBD5E1", background: "#F8FAFC", color: "#64748B", fontSize: "13px"
        }}>
          <p style={{ margin: "0 0 10px", fontWeight: 700, color: "#475569" }}>
            لم يتم تسجيل أي أمر غيار لهذا المشروع حتى الآن (العدد = 0)
          </p>
          <button
            type="button"
            onClick={handleAddItem}
            style={{
              padding: "7px 18px", borderRadius: "10px", background: "#EDE9FE",
              color: "#7C3AED", border: "1.5px solid #DDD6FE", fontSize: "12px", fontWeight: 800, cursor: "pointer"
            }}
          >
            + انقر هنا لإضافة أمر الغيار الأول
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {items.map((item, index) => (
            <div
              key={item.id || index}
              style={{
                padding: "16px 18px", borderRadius: "14px", border: "1.5px solid #DDD6FE",
                background: "linear-gradient(135deg, #FFFFFF 0%, #FAF5FF 100%)",
                boxShadow: "0 2px 8px rgba(124, 58, 237, 0.06)", position: "relative"
              }}
            >
              {/* Item Top Bar */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                borderBottom: "1px solid #EDE9FE", paddingBottom: "10px", marginBottom: "14px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: "26px", height: "26px", borderRadius: "50%", background: "#7C3AED",
                    color: "white", fontSize: "12px", fontWeight: 900
                  }}>
                    {index + 1}
                  </span>
                  <span style={{ fontSize: "13.5px", fontWeight: 800, color: "#5B21B6" }}>
                    أمر الغيار ({index + 1} من {items.length})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  title="حذف هذا الأمر"
                  style={{
                    display: "flex", alignItems: "center", gap: "4px", padding: "5px 12px",
                    borderRadius: "8px", background: "#FEE2E2", color: "#DC2626", border: "1px solid #FECACA",
                    fontSize: "11.5px", fontWeight: 800, cursor: "pointer"
                  }}
                >
                  <Trash2 size={13} />
                  حذف الأمر
                </button>
              </div>

              {/* Item Inputs Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#334155", marginBottom: "5px" }}>
                    رقم أو مسمى أمر الغيار <span style={{ color: "#64748B", fontWeight: 400 }}>(اختياري)</span>
                  </label>
                  <input
                    type="text"
                    value={item.orderNo || ""}
                    onChange={(e) => handleUpdateItem(index, "orderNo", e.target.value)}
                    placeholder={`مثال: أمر غيار رقم ${index + 1}`}
                    style={{
                      width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #CBD5E1",
                      fontSize: "13px", fontWeight: 700, color: "#0F172A", outline: "none", background: "#FFFFFF",
                      textAlign: "right"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#334155", marginBottom: "5px" }}>
                    تاريخ أمر الغيار <span style={{ color: "#64748B", fontWeight: 400 }}>(اختياري)</span>
                  </label>
                  <input
                    type="date"
                    value={item.orderDate || ""}
                    onChange={(e) => handleUpdateItem(index, "orderDate", e.target.value)}
                    style={{
                      width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #CBD5E1",
                      fontSize: "13px", fontWeight: 700, color: "#0F172A", outline: "none", background: "#FFFFFF",
                      textAlign: "right"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#334155", marginBottom: "5px" }}>
                    مبلغ أمر الغيار (د.ع) <span style={{ color: "#64748B", fontWeight: 400 }}>(اختياري)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={item.amount || ""}
                    onChange={(e) => handleUpdateItem(index, "amount", Number(e.target.value) || 0)}
                    placeholder="0"
                    style={{
                      width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #CBD5E1",
                      fontSize: "13.5px", fontWeight: 900, color: "#15803D", outline: "none", background: "#FFFFFF",
                      textAlign: "right"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#334155", marginBottom: "5px" }}>
                    المدة الإضافية بأمر الغيار <span style={{ color: "#64748B", fontWeight: 400 }}>(اختياري)</span>
                  </label>
                  <input
                    type="text"
                    value={item.additionalDays !== undefined ? String(item.additionalDays) : ""}
                    onChange={(e) => handleUpdateItem(index, "additionalDays", e.target.value)}
                    placeholder="مثال: 45 يوماً"
                    style={{
                      width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #CBD5E1",
                      fontSize: "12px", fontWeight: 600, color: "#0F172A", outline: "none", background: "#FFFFFF",
                      textAlign: "right"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#334155", marginBottom: "5px" }}>
                    الملاحظات <span style={{ color: "#64748B", fontWeight: 400 }}>(اختياري)</span>
                  </label>
                  <input
                    type="text"
                    value={item.notes || ""}
                    onChange={(e) => handleUpdateItem(index, "notes", e.target.value)}
                    placeholder="مثال: إضافة فقرات وأعمال تكميلية"
                    style={{
                      width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #CBD5E1",
                      fontSize: "12px", fontWeight: 600, color: "#0F172A", outline: "none", background: "#FFFFFF",
                      textAlign: "right"
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Real-time Summary Box */}
      <div style={{
        marginTop: "4px", padding: "16px 20px", borderRadius: "14px",
        background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)", border: "1.5px solid #86EFAC",
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px"
      }}>
        <div>
          <span style={{ fontSize: "12px", color: "#166534", display: "block", fontWeight: 800 }}>
            💰 مجموع أوامر الغيار ({items.length} أمر):
          </span>
          <div style={{ fontSize: "17px", fontWeight: 900, color: "#15803D", marginTop: "3px" }}>
            {Number(totalAmount).toLocaleString("en-US")} {currSym}
          </div>
        </div>

        <div>
          <span style={{ fontSize: "12px", color: "#1e3a8a", display: "block", fontWeight: 800 }}>
            🏗️ كلفة العمل الإجمالية (العقد + أوامر الغيار):
          </span>
          <div style={{ fontSize: "17px", fontWeight: 900, color: "#1E40AF", marginTop: "3px" }}>
            {Number(totalWorkCost).toLocaleString("en-US")} {currSym}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Dates ────────────────────────────────────────────────────────────
function Step2Dates({ data, onChange }: { data: WizardFormData; onChange: (f: keyof WizardFormData, v: any) => void }) {
  const duration = Number(data.durationDays || 0);
  const extraDays = parseDurationDays(data.additionalDuration);
  const coList = Array.isArray(data.changeOrdersList) ? data.changeOrdersList : [];
  const coExtraDays = coList.reduce((sum, item) => sum + parseDurationDays(item.additionalDays), 0);
  const totalExtraDays = extraDays + coExtraDays;
  const totalExecutionDays = duration + totalExtraDays;

  const autoPlannedEndIso = calcDateAddDaysISO(data.startDate, duration);
  const autoCompletionAfterAddIso = calcDateAddDaysISO(data.startDate, totalExecutionDays);

  const autoPlannedEndFormatted = formatDateDMY(autoPlannedEndIso);
  const autoCompletionAfterAddFormatted = formatDateDMY(autoCompletionAfterAddIso);

  // Synchronize auto calculated dates whenever start date, duration, additional duration, or change orders change
  useEffect(() => {
    if (data.startDate && duration > 0) {
      const pEnd = calcDateAddDaysISO(data.startDate, duration);
      const cEnd = calcDateAddDaysISO(data.startDate, totalExecutionDays);

      if (pEnd && data.plannedEndDate !== pEnd) {
        onChange("plannedEndDate", pEnd);
      }
      if (cEnd && data.completionDateAfterAdditional !== cEnd) {
        onChange("completionDateAfterAdditional", cEnd);
      }
    }
  }, [data.startDate, data.durationDays, data.additionalDuration, totalExecutionDays]);

  const handleStartDateChange = (val: string) => {
    onChange("startDate", val);
    if (val && duration > 0) {
      const pEnd = calcDateAddDaysISO(val, duration);
      const cEnd = calcDateAddDaysISO(val, duration + totalExtraDays);
      onChange("plannedEndDate", pEnd);
      onChange("completionDateAfterAdditional", cEnd);
    }
  };

  const handleDurationDaysChange = (val: number) => {
    onChange("durationDays", val);
    const start = data.startDate || "";
    if (start && val > 0) {
      const pEnd = calcDateAddDaysISO(start, val);
      const cEnd = calcDateAddDaysISO(start, val + totalExtraDays);
      onChange("plannedEndDate", pEnd);
      onChange("completionDateAfterAdditional", cEnd);
    }
  };

  const handleAdditionalDurationChange = (val: string) => {
    onChange("additionalDuration", val);
    const start = data.startDate || "";
    const newExtra = parseDurationDays(val);
    if (start && duration > 0) {
      const cEnd = calcDateAddDaysISO(start, duration + newExtra + coExtraDays);
      onChange("completionDateAfterAdditional", cEnd);
    }
  };

  return (
    <div>
      <SectionCard icon={<Calendar size={18}/>} title="بيانات العقد والمدة" desc="رقم وتاريخ الإحالة والعقد ومدة التنفيذ بالأيام">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* بيانات الإحالة */}
          <div style={{ background: "#F8FAFC", padding: "14px 16px", borderRadius: "14px", border: "1px solid #E2E8F0" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#475569", display: "block", marginBottom: "10px" }}>
              📋 بيانات الإحالة
            </span>
            <Grid2>
              <FormInput
                label="رقم الإحالة"
                value={data.referralNo || ""}
                onChange={v => onChange("referralNo", v)}
                placeholder="مثال: إحالة / 45 / 2024"
              />
              <FormDateInputRTL
                label="تاريخ الإحالة (اختياري)"
                value={data.referralDate || ""}
                onChange={v => onChange("referralDate", v)}
                hint="تاريخ صدور كتاب أو قرار الإحالة"
              />
            </Grid2>
          </div>

          {/* بيانات العقد والمدة */}
          <div>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#475569", display: "block", marginBottom: "10px" }}>
              📜 بيانات العقد والمدة
            </span>
            <Grid3>
              <FormInput
                label="رقم العقد"
                value={data.contractNo || ""}
                onChange={v => onChange("contractNo", v)}
                placeholder="مثال: M/2024/118"
              />
              <FormDateInputRTL
                label="تاريخ العقد (اختياري)"
                value={data.contractDate || ""}
                onChange={v => onChange("contractDate", v)}
                hint="تاريخ توقيع أو إبرام العقد"
              />
              <FormInput
                label="مدة العقد (أيام)"
                type="number"
                value={data.durationDays || ""}
                onChange={v => handleDurationDaysChange(Number(v))}
                placeholder="مثال: 540"
              />
            </Grid3>
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={<Clock size={18}/>} title="تواريخ المباشرة والمدد والإنجاز" desc="تاريخ المباشرة والمدة الإضافية وتاريخ الإنجاز (يوم / شهر / سنة)">
        <Grid3>
          <FormDateInputRTL
            label="تاريخ المباشرة"
            value={data.startDate || ""}
            onChange={handleStartDateChange}
          />
          <FormInput label="المدة الإضافية" value={data.additionalDuration || ""}
            onChange={handleAdditionalDurationChange} placeholder="مثال: 90 يوماً" />
          <FormDateInputRTL
            label="تاريخ الإنجاز بعد المدد الإضافية"
            value={data.completionDateAfterAdditional || ""}
            onChange={v => onChange("completionDateAfterAdditional", v)}
            hint="يحسب تلقائياً (تاريخ المباشرة + مدة العقد + المدة الإضافية)"
          />
        </Grid3>

        {data.startDate && duration > 0 && (
          <div style={{
            marginTop: "16px", padding: "14px 18px", borderRadius: "12px",
            background: "linear-gradient(135deg, #F0F9FF, #E0F2FE)", border: "1px solid #BAE6FD",
            display: "flex", flexDirection: "column", gap: "12px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={18} color="#0284C7"/>
              <span style={{ fontSize: "14px", color: "#0369A1", fontWeight: 700 }}>
                الحساب التلقائي للتواريخ والمدد
              </span>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px", fontSize: "13px" }}>
              <div style={{ background: "#FFFFFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E0F2FE" }}>
                <span style={{ color: "#64748B", display: "block", fontSize: "11px" }}>تاريخ المباشرة:</span>
                <strong style={{ color: "#0F172A" }}>{formatDateDMY(data.startDate)}</strong>
              </div>
              <div style={{ background: "#FFFFFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E0F2FE" }}>
                <span style={{ color: "#64748B", display: "block", fontSize: "11px" }}>مدة العقد الأساسية:</span>
                <strong style={{ color: "#0F172A" }}>{duration} يوم</strong>
              </div>
              <div style={{ background: "#FFFFFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E0F2FE" }}>
                <span style={{ color: "#64748B", display: "block", fontSize: "11px" }}>المدة الإضافية الممنوحة:</span>
                <strong style={{ color: "#0F172A" }}>{extraDays} يوم {data.additionalDuration ? `(${data.additionalDuration})` : ""}</strong>
              </div>
              <div style={{ background: "#FFFFFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E0F2FE" }}>
                <span style={{ color: "#64748B", display: "block", fontSize: "11px" }}>المدد بأوامر الغيار:</span>
                <strong style={{ color: coExtraDays > 0 ? "#7C3AED" : "#0F172A" }}>{coExtraDays} يوم</strong>
              </div>
              <div style={{ background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid #2563EB" }}>
                <span style={{ color: "#1D4ED8", display: "block", fontSize: "11px", fontWeight: 800 }}>إجمالي مدة التنفيذ: الكلية :</span>
                <strong style={{ color: "#1E40AF", fontSize: "15px", fontWeight: 900 }}>{totalExecutionDays} يوم</strong>
              </div>
            </div>

            <div style={{
              display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center",
              borderTop: "1px solid #BAE6FD", paddingTop: "10px", marginTop: "4px", fontSize: "13px", gap: "8px"
            }}>
              <span style={{ color: "#0369A1" }}>
                تاريخ الإنجاز التعاقدي المخطط: <strong>{autoPlannedEndFormatted || "—"}</strong>
              </span>
              <span style={{ color: "#166534", background: "#DCFCE7", padding: "5px 12px", borderRadius: "6px", fontWeight: 700, border: "1px solid #BBF7D0" }}>
                تاريخ الإنجاز بعد المدد الإضافية الكلية: {autoCompletionAfterAddFormatted || "—"}
              </span>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard icon={<DollarSign size={18}/>} title="كلفة العقد وأوامر الغيار والعملة" desc="اختر العملة (د.ع أو $) وأدخل كلفة المشروع الأساسية وأوامر الغيار التفصيلية">
        {/* Currency Selection Toggle */}
        <div style={{ marginBottom: "18px", padding: "14px 16px", borderRadius: "14px", background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)", border: "1.5px solid #CBD5E1", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 800, color: "#0F172A", marginBottom: "8px" }}>
            💱 عملة كلفة العقد وأوامر الغيار للمشروع <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <button
              type="button"
              onClick={() => onChange("currency", "IQD")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                padding: "10px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: 800,
                cursor: "pointer", transition: "all 0.2s ease",
                background: (data.currency || "IQD") === "IQD" ? "#EFF6FF" : "#FFFFFF",
                color: (data.currency || "IQD") === "IQD" ? "#1D4ED8" : "#64748B",
                border: `2px solid ${(data.currency || "IQD") === "IQD" ? "#2563EB" : "#CBD5E1"}`,
                boxShadow: (data.currency || "IQD") === "IQD" ? "0 2px 8px rgba(37,99,235,0.15)" : "none"
              }}
            >
              <span>🇮🇶 دينار عراقي</span>
              <span style={{ fontSize: "11px", fontWeight: 900, padding: "2px 8px", borderRadius: "6px", background: (data.currency || "IQD") === "IQD" ? "#DBEAFE" : "#F1F5F9" }}>د.ع</span>
            </button>

            <button
              type="button"
              onClick={() => onChange("currency", "USD")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                padding: "10px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: 800,
                cursor: "pointer", transition: "all 0.2s ease",
                background: data.currency === "USD" ? "#F0FDF4" : "#FFFFFF",
                color: data.currency === "USD" ? "#15803D" : "#64748B",
                border: `2px solid ${data.currency === "USD" ? "#16A34A" : "#CBD5E1"}`,
                boxShadow: data.currency === "USD" ? "0 2px 8px rgba(22,163,74,0.15)" : "none"
              }}
            >
              <span>🇺🇸 دولار أمريكي</span>
              <span style={{ fontSize: "11px", fontWeight: 900, padding: "2px 8px", borderRadius: "6px", background: data.currency === "USD" ? "#DCFCE7" : "#F1F5F9" }}>$</span>
            </button>
          </div>
        </div>

        <div style={{ marginBottom: "18px" }}>
          <FormInput
            label={`كلفة المشروع الأساسية (${data.currency === "USD" ? "$" : "د.ع"})`}
            type="number"
            value={data.contractValue || ""}
            onChange={v => {
              const cv = Number(v) || 0;
              onChange("contractValue", cv);
              const co = Number(data.changeOrdersTotalAmount || 0);
              onChange("workCost", cv + co);
            }}
            placeholder={data.currency === "USD" ? "مثال: 5000000" : "مثال: 1250000000"}
            hint={`مبلغ العقد الأساسي للمشروع بـ (${data.currency === "USD" ? "الدولار الأمريكي $" : "الدينار العراقي د.ع"})`}
          />
        </div>

        <ChangeOrdersManager
          changeOrdersList={data.changeOrdersList || []}
          contractValue={Number(data.contractValue || 0)}
          currency={data.currency || "IQD"}
          onChangeList={(list) => {
            const sym = data.currency === "USD" ? "$" : "د.ع";
            onChange("changeOrdersList", list);
            onChange("changeOrdersCount", list.length);
            const total = list.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
            onChange("changeOrdersTotalAmount", total);
            onChange("workCost", Number(data.contractValue || 0) + total);
            const summaryStr = list.map((item, idx) => `${item.orderNo || `أمر ${idx + 1}`}: ${formatDateDMY(item.orderDate)} ${item.additionalDays ? `(+${item.additionalDays})` : ""} (${Number(item.amount || 0).toLocaleString("en-US")} ${sym})`).join(" | ");
            onChange("changeOrderNoAndDate", summaryStr);
            if (list.length > 0) {
              onChange("changeOrderSingleAmount", Number(list[0].amount || 0));
            }

            // Real-time synchronization of completion date with change order additional days
            const newCoExtra = list.reduce((sum, item) => sum + parseDurationDays(item.additionalDays), 0);
            const curDuration = Number(data.durationDays || 0);
            const curExtra = parseDurationDays(data.additionalDuration);
            const newTotalDays = curDuration + curExtra + newCoExtra;
            if (data.startDate && curDuration > 0) {
              const cEnd = calcDateAddDaysISO(data.startDate, newTotalDays);
              if (cEnd) {
                onChange("completionDateAfterAdditional", cEnd);
              }
            }
          }}
          onChangeTotal={(tot) => {
            onChange("changeOrdersTotalAmount", tot);
            onChange("workCost", Number(data.contractValue || 0) + tot);
          }}
          onChangeCount={(cnt) => {
            onChange("changeOrdersCount", cnt);
          }}
        />
      </SectionCard>


    </div>
  );
}

// ─── Step 3: Financial ────────────────────────────────────────────────────────
function Step3Financial({ data, onChange }: { data: WizardFormData; onChange: (f: keyof WizardFormData, v: any) => void }) {
  const workCost = (Number(data.contractValue || 0)) + (Number(data.changeOrdersTotalAmount || 0));

  const handleNumChange = (field: keyof WizardFormData, val: string) => {
    const n = Number(val.replace(/[^0-9.]/g, "")) || 0;
    onChange(field, n);
    if (field === "contractValue" || field === "changeOrdersTotalAmount") {
      const cv = field === "contractValue" ? n : Number(data.contractValue || 0);
      const co = field === "changeOrdersTotalAmount" ? n : Number(data.changeOrdersTotalAmount || 0);
      onChange("workCost", cv + co);
    }
  };

  return (
    <div>
      <SectionCard icon={<DollarSign size={18}/>} title="قيم العقد الأساسية" desc="المبالغ التعاقدية بالدينار العراقي">
        <Grid2>
          <div>
            <FormInput label="الكلفة التقديرية (د.ع)" type="number" value={data.estimatedCost || ""}
              onChange={v => handleNumChange("estimatedCost", v)} placeholder="0"
              hint="الكلفة التقديرية الأولية قبل العقد" />
          </div>
          <div>
            <FormInput label="المبلغ التعاقدي الكلي (د.ع)" type="number" value={data.amount || ""}
              onChange={v => handleNumChange("amount", v)} placeholder="0" />
          </div>
          <div>
            <FormInput label="مبلغ العقد الأساسي (د.ع)" type="number" value={data.contractValue || ""}
              onChange={v => handleNumChange("contractValue", v)} placeholder="0"
              hint="قيمة العقد كما هو موقّع" />
          </div>
          <div>
            <FormInput label="عدد أوامر الغيار" type="number" value={data.changeOrdersCount || ""}
              onChange={v => onChange("changeOrdersCount", Number(v))} placeholder="0" />
          </div>
          <div>
            <FormInput label="مجموع مبالغ أوامر الغيار (د.ع)" type="number" value={data.changeOrdersTotalAmount || ""}
              onChange={v => handleNumChange("changeOrdersTotalAmount", v)} placeholder="0" />
          </div>
          <div>
            <FieldLabel>كلفة العمل الإجمالية (د.ع)</FieldLabel>
            <div style={{
              padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #E5E7EB",
              background: "linear-gradient(135deg, #F0FDF4, #DCFCE7)", fontSize: "14px",
              fontWeight: 700, color: "#059669", textAlign: "right",
            }}>
              {workCost > 0 ? formatMoney(workCost) : "يُحسب تلقائياً"}
            </div>
            <p style={{ fontSize: "11px", color: "#6B7280", margin: "4px 0 0" }}>
              = مبلغ العقد + أوامر الغيار
            </p>
          </div>
        </Grid2>
      </SectionCard>

      <SectionCard icon={<TrendingUp size={18}/>} title="المصروفات والمستخلصات" desc="المبالغ المصروفة فعلياً">
        <Grid2>
          <FormInput label="المصروف من المستخلصات (د.ع)" type="number" value={data.disbursedWork || ""}
            onChange={v => onChange("disbursedWork", Number(v))} placeholder="0"
            hint="إجمالي ما صُرف من مستخلصات العقد" />
          <FormInput label="المصروف الكلي للمشروع (د.ع)" type="number" value={data.totalDisbursed || ""}
            onChange={v => onChange("totalDisbursed", Number(v))} placeholder="0"
            hint="إجمالي الإنفاق الفعلي شامل جميع البنود" />
        </Grid2>
      </SectionCard>
    </div>
  );
}

// ─── Step 4: Performance ──────────────────────────────────────────────────────
function Step4Performance({ data, onChange }: { data: WizardFormData; onChange: (f: keyof WizardFormData, v: any) => void }) {
  const gap = Number(data.plannedProgress || 0) - Number(data.actualProgress || 0);

  return (
    <div>
      <SectionCard icon={<TrendingUp size={18}/>} title="نسب الإنجاز" desc="نسب التقدم المخطط والفعلي">
        <Grid2>
          <div>
            <FieldLabel>نسبة الإنجاز المخطط (%)</FieldLabel>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input type="range" min={0} max={100} value={data.plannedProgress || 0}
                onChange={e => onChange("plannedProgress", Number(e.target.value))}
                style={{ flex: 1, accentColor: "#2563EB" }} />
              <span style={{
                minWidth: "48px", textAlign: "center", fontWeight: 700, fontSize: "15px",
                color: "#2563EB", background: "#EFF6FF", padding: "4px 10px", borderRadius: "8px",
              }}>{data.plannedProgress || 0}%</span>
            </div>
          </div>
          <div>
            <FieldLabel>نسبة الإنجاز الفعلي (%)</FieldLabel>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input type="range" min={0} max={100} value={data.actualProgress || 0}
                onChange={e => onChange("actualProgress", Number(e.target.value))}
                style={{ flex: 1, accentColor: "#059669" }} />
              <span style={{
                minWidth: "48px", textAlign: "center", fontWeight: 700, fontSize: "15px",
                color: "#059669", background: "#F0FDF4", padding: "4px 10px", borderRadius: "8px",
              }}>{data.actualProgress || 0}%</span>
            </div>
          </div>
        </Grid2>
        {gap > 0 && (
          <div style={{
            marginTop: "16px", padding: "12px 16px", borderRadius: "10px",
            background: "#FEF3C7", border: "1px solid #FDE68A",
            display: "flex", alignItems: "center", gap: "10px",
          }}>
            <AlertCircle size={16} color="#D97706"/>
            <span style={{ fontSize: "13px", color: "#92400E", fontWeight: 600 }}>
              الفجوة: {gap}% خلف الخطة المرسومة
            </span>
          </div>
        )}
        {gap <= 0 && (data.actualProgress || 0) > 0 && (
          <div style={{
            marginTop: "16px", padding: "12px 16px", borderRadius: "10px",
            background: "#F0FDF4", border: "1px solid #BBF7D0",
            display: "flex", alignItems: "center", gap: "10px",
          }}>
            <CheckCircle2 size={16} color="#059669"/>
            <span style={{ fontSize: "13px", color: "#065F46", fontWeight: 600 }}>ضمن الخطة المرسومة أو متقدم عليها</span>
          </div>
        )}
      </SectionCard>



      <SectionCard icon={<Users size={18}/>} title="الكوادر البشرية في الموقع" desc="عدد العاملين">
        <Grid2>
          <FormInput label="الكادر المحلي (فرد)" type="number" value={data.localStaffCount || ""}
            onChange={v => onChange("localStaffCount", Number(v))} placeholder="0" />
          <FormInput label="الكادر الأجنبي (فرد)" type="number" value={data.foreignStaffCount || ""}
            onChange={v => onChange("foreignStaffCount", Number(v))} placeholder="0" />
        </Grid2>
      </SectionCard>

      <SectionCard icon={<FileText size={18}/>} title="ملاحظات الأداء والتقرير" desc="تقارير دورية تفصيلية">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <FormTextarea label="الأعمال المنفذة خلال هذه الفترة" value={data.executedWorksPeriod || ""}
            onChange={v => onChange("executedWorksPeriod", v)}
            placeholder="الأعمال الإنشائية والميكانيكية المنجزة مؤخراً..." />
          <FormTextarea label="المعدات والأجهزة الواصلة" value={data.deliveredEquipmentPeriod || ""}
            onChange={v => onChange("deliveredEquipmentPeriod", v)}
            placeholder="ذكر المعدات والأجهزة التي وصلت لموقع العمل..." />
          <FormTextarea label="أسباب التأخير (إن وجدت)" value={data.delayReasons || ""}
            onChange={v => onChange("delayReasons", v)}
            placeholder="عوائق فنية أو مالية أو قانونية أدت للتأخير..." />
          <FormTextarea label="المشاكل والمعوقات والحلول المقترحة" value={data.problemsObstaclesSolutions || ""}
            onChange={v => onChange("problemsObstaclesSolutions", v)}
            placeholder="وصف المشكلة والحل المقترح لمعالجتها..." />
          <FormTextarea label="رأي المهندس المقيم حول أداء المقاول" value={data.residentEngineerOpinion || ""}
            onChange={v => onChange("residentEngineerOpinion", v)}
            placeholder="تقييم المهندس المقيم لالتزام المقاول..." />
          <FormTextarea label="الملاحظات العامة" value={data.notes || ""}
            onChange={v => onChange("notes", v)} placeholder="أي ملاحظات أخرى..." />
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Step 5: Map / Location ───────────────────────────────────────────────────
function Step5Map({ data, onChange }: { data: WizardFormData; onChange: (f: keyof WizardFormData, v: any) => void }) {
  const hasCoords = typeof data.lat === "number" && !isNaN(data.lat) && data.lat !== 0 &&
                    typeof data.lng === "number" && !isNaN(data.lng) && data.lng !== 0;
  const lat = hasCoords ? data.lat! : 33.4248; // Viewport fallback: Ramadi, Anbar
  const lng = hasCoords ? data.lng! : 43.3023;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.08},${lat - 0.08},${lng + 0.08},${lat + 0.08}&layer=mapnik${hasCoords ? `&marker=${lat},${lng}` : ""}`;

  return (
    <div>
      <SectionCard icon={<MapPin size={18}/>} title="الموقع الجغرافي بمحافظة الأنبار" desc="تحديد وتعديل موقع المشروع على الخريطة">
        <div style={{ marginBottom: "16px", background: "#F8FAFC", padding: "14px", borderRadius: "12px", border: "1.5px solid #E2E8F0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <FieldLabel>📍 اختيار سريع لمركز قضاء الأنبار على الخريطة:</FieldLabel>
            {hasCoords && (
              <button
                type="button"
                onClick={() => {
                  onChange("lat", undefined);
                  onChange("lng", undefined);
                }}
                style={{
                  fontSize: "11px", color: "#DC2626", background: "#FEE2E2",
                  border: "1px solid #FCA5A5", borderRadius: "6px", padding: "2px 8px",
                  cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px"
                }}
              >
                <Trash2 size={12} /> تفريغ الإحداثيات
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
            {ANBAR_DISTRICTS.map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  onChange("lat", d.lat);
                  onChange("lng", d.lng);
                  if (!data.location) {
                    onChange("location", d.fullName);
                  }
                }}
                style={{
                  fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "8px",
                  border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#1D4ED8", cursor: "pointer",
                }}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "16px", background: "#EFF6FF", padding: "12px 14px", borderRadius: "12px", border: "1.5px solid #BFDBFE" }}>
          <FormInput
            label="📍 إحداثيات Google Maps الكاملة (خط العرض، خط الطول) — اختياري"
            value={data.lat && data.lng ? `${data.lat}, ${data.lng}` : ""}
            onChange={(v) => {
              if (!v || !v.trim()) {
                onChange("lat", undefined);
                onChange("lng", undefined);
                return;
              }
              const parts = v.split(/[,،\s]+/).map(p => p.trim()).filter(Boolean);
              if (parts.length >= 2) {
                const latNum = parseFloat(parts[0]);
                const lngNum = parseFloat(parts[1]);
                if (!isNaN(latNum) && !isNaN(lngNum)) {
                  onChange("lat", latNum);
                  onChange("lng", lngNum);
                }
              }
            }}
            placeholder="مثال: 33.63522577764224, 42.8100112300415 (اتركه فارغاً إن لم يتوفر)"
            hint="يمكنك تركها فارغة أو نسخ الإحداثيات مباشرة من Google Maps ولصقها هنا لتقسيمها تلقائياً"
          />
        </div>
        <Grid2>
          <FormInput label="خط العرض (Latitude)" value={data.lat === undefined || data.lat === null || data.lat === 0 ? "" : String(data.lat)}
            onChange={v => onChange("lat", v === "" ? undefined : parseFloat(v))} placeholder="33.63522577764224 (اختياري)" />
          <FormInput label="خط الطول (Longitude)" value={data.lng === undefined || data.lng === null || data.lng === 0 ? "" : String(data.lng)}
            onChange={v => onChange("lng", v === "" ? undefined : parseFloat(v))} placeholder="42.8100112300415 (اختياري)" />
        </Grid2>

        {/* Map Preview */}
        <div style={{ marginTop: "20px", borderRadius: "14px", overflow: "hidden", border: "2px solid #E5E7EB", position: "relative" }}>
          <div style={{ position: "absolute", top: "12px", right: "12px", zIndex: 10,
            background: "white", borderRadius: "8px", padding: "6px 12px", fontSize: "12px",
            fontWeight: 700, color: hasCoords ? "#15803D" : "#64748B", boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            display: "flex", alignItems: "center", gap: "6px",
          }}>
            <MapPin size={14} color={hasCoords ? "#16A34A" : "#9CA3AF"}/>
            {hasCoords ? `${data.lat!.toFixed(4)}° , ${data.lng!.toFixed(4)}°` : "لم يتم تحديد إحداثيات (معاينة عامة للأنبار)"}
          </div>
          <iframe
            src={mapUrl}
            title="موقع المشروع"
            style={{ width: "100%", height: "320px", border: "none", display: "block" }}
            loading="lazy"
          />
        </div>

        <div style={{
          marginTop: "12px", padding: "10px 14px", borderRadius: "10px",
          background: "#F0FDF4", border: "1px solid #BBF7D0", fontSize: "12px", color: "#065F46",
        }}>
          💡 <strong>تلميح:</strong> يمكنك زيارة{" "}
          <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer"
            style={{ color: "#2563EB", textDecoration: "underline" }}>
            Google Maps
          </a>{" "}
          للحصول على إحداثيات دقيقة، ثم انسخها هنا.
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Step 3: Handover & Committees ──────────────────────────────────────────
function CommitteeInput({
  title,
  members,
  onChange,
}: {
  title: string;
  members: string[];
  onChange: (sups: string[]) => void;
}) {
  const list = [members[0] || "", members[1] || "", members[2] || ""];

  const handleChangeMember = (index: number, val: string) => {
    const updated = [...list];
    updated[index] = val;
    onChange(updated);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <FieldLabel>{title}</FieldLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
        <FormInput
          label="العضو الأول (رئيس اللجنة)"
          value={list[0]}
          onChange={(v) => handleChangeMember(0, v)}
          placeholder="اسم رئيس اللجنة..."
        />
        <FormInput
          label="العضو الثاني"
          value={list[1]}
          onChange={(v) => handleChangeMember(1, v)}
          placeholder="اسم العضو الثاني..."
        />
        <FormInput
          label="العضو الثالث"
          value={list[2]}
          onChange={(v) => handleChangeMember(2, v)}
          placeholder="اسم العضو الثالث..."
        />
      </div>
    </div>
  );
}

function Step3Handover({
  data,
  onChange,
}: {
  data: WizardFormData;
  onChange: (f: keyof WizardFormData, v: any) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 1. الاستلام الأولي */}
      <SectionCard
        icon={<CheckCircle2 size={18} />}
        title="إجراءات الاستلام الأولي للمشروع"
        desc="تاريخ وتفاصيل لجنة الاستلام الأولي (3 أشخاص) والملاحظات"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
            <FormInput
              label="رقم الأمر الإداري (اختياري)"
              value={data.initialHandoverOrderNo || ""}
              onChange={(v) => onChange("initialHandoverOrderNo", v)}
              placeholder="مثال: أ.د / 1234"
              hint="رقم الأمر الإداري بتشكيل لجنة أو محضر الاستلام الأولي"
            />
            <FormDateInputRTL
              label="تاريخ الأمر الإداري (اختياري)"
              value={data.initialHandoverOrderDate || ""}
              onChange={(v) => onChange("initialHandoverOrderDate", v)}
              hint="تاريخ صدور الأمر الإداري"
            />
          </div>
          <FormDateInputRTL
            label="تاريخ الاستلام الأولي (اختياري)"
            value={data.initialHandoverDate || ""}
            onChange={(v) => onChange("initialHandoverDate", v)}
            hint="تاريخ صدور شهادة/محضر الاستلام الأولي"
          />
          <CommitteeInput
            title="لجنة الاستلام الأولي (3 أعضاء)"
            members={data.initialHandoverCommittee || []}
            onChange={(sups) => onChange("initialHandoverCommittee", sups)}
          />
          <FormTextarea
            label="ملاحظات الاستلام الأولي للمشروع (اختياري)"
            value={data.initialHandoverNotes || ""}
            onChange={(v) => onChange("initialHandoverNotes", v)}
            placeholder="أدخل أي ملاحظات أو شروط أو تفاصيل تخص الاستلام الأولي..."
            rows={2}
          />
        </div>
      </SectionCard>

      {/* 2. الاستلام النهائي */}
      <SectionCard
        icon={<CheckCircle2 size={18} />}
        title="إجراءات الاستلام النهائي للمشروع"
        desc="تاريخ وتفاصيل لجنة الاستلام النهائي (3 أشخاص) والملاحظات"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
            <FormInput
              label="رقم الأمر الإداري (اختياري)"
              value={data.finalHandoverOrderNo || ""}
              onChange={(v) => onChange("finalHandoverOrderNo", v)}
              placeholder="مثال: أ.د / 5678"
              hint="رقم الأمر الإداري بتشكيل لجنة أو محضر الاستلام النهائي"
            />
            <FormDateInputRTL
              label="تاريخ الأمر الإداري (اختياري)"
              value={data.finalHandoverOrderDate || ""}
              onChange={(v) => onChange("finalHandoverOrderDate", v)}
              hint="تاريخ صدور الأمر الإداري"
            />
          </div>
          <FormDateInputRTL
            label="تاريخ الاستلام النهائي (اختياري)"
            value={data.finalHandoverDate || ""}
            onChange={(v) => onChange("finalHandoverDate", v)}
            hint="تاريخ صدور محضر الاستلام النهائي وإبراء الذمة"
          />
          <CommitteeInput
            title="لجنة الاستلام النهائي (3 أعضاء)"
            members={data.finalHandoverCommittee || []}
            onChange={(sups) => onChange("finalHandoverCommittee", sups)}
          />
          <FormTextarea
            label="ملاحظات الاستلام النهائي للمشروع (اختياري)"
            value={data.finalHandoverNotes || ""}
            onChange={(v) => onChange("finalHandoverNotes", v)}
            placeholder="أدخل أي ملاحظات أو تفاصيل تخص الاستلام النهائي وإبراء الذمة..."
            rows={2}
          />
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Step 4: Notes (الملاحظات إن وجدت) ──────────────────────────────────────────
function Step4Notes({ data, onChange }: { data: WizardFormData; onChange: (f: keyof WizardFormData, v: any) => void }) {
  return (
    <div>
      <SectionCard icon={<FileText size={18}/>} title="الملاحظات والتفاصيل الإضافية (إن وجدت)" desc="الملاحظات العامة، أسباب التأخير، رأي المهندس والمشاكل والمعوقات">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <FormTextarea
            label="الملاحظات العامة للمشروع (إن وجدت)"
            value={data.notes || ""}
            onChange={v => onChange("notes", v)}
            placeholder="أدخل أي ملاحظات هامة أو تفاصيل تود توثيقها حول المشروع..."
            rows={3}
          />

          <FormTextarea
            label="الأعمال المنفذة خلال هذه الفترة"
            value={data.executedWorksPeriod || ""}
            onChange={v => onChange("executedWorksPeriod", v)}
            placeholder="الأعمال الإنشائية أو الميكانيكية أو التجهيزية المنجزة مؤخراً..."
            rows={3}
          />

          <FormTextarea
            label="المعدات والأجهزة الواصلة والمجهزة للموقع"
            value={data.deliveredEquipmentPeriod || ""}
            onChange={v => onChange("deliveredEquipmentPeriod", v)}
            placeholder="ذكر المعدات والأجهزة والمضخات التي وصلت للموقع..."
            rows={2}
          />

          <FormTextarea
            label="أسباب التأخير والمدد الإضافية (إن وجدت)"
            value={data.delayReasons || ""}
            onChange={v => onChange("delayReasons", v)}
            placeholder="عوائق فنية أو إدارية أو مالية تسببت بالتوقف أو التلكؤ..."
            rows={3}
          />

          <FormTextarea
            label="المشاكل والمعوقات والحلول المقترحة"
            value={data.problemsObstaclesSolutions || ""}
            onChange={v => onChange("problemsObstaclesSolutions", v)}
            placeholder="وصف المعوقات والحلول الموصى بها..."
            rows={3}
          />

          <FormTextarea
            label="رأي وتوصيات المهندس المقيم"
            value={data.residentEngineerOpinion || ""}
            onChange={v => onChange("residentEngineerOpinion", v)}
            placeholder="رأي وتوصيات المهندس المقيم حول التزام المقاول وسير العمل..."
            rows={3}
          />
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Step 5: Review ───────────────────────────────────────────────────────────
function Step5Review({ data, onEdit }: { data: WizardFormData; onEdit: (step: number) => void }) {
  const projectTypeLabel = PROJECT_TYPES.find(t => t.value === data.type)?.label || data.type || "—";
  const statusLabel = STATUS_OPTIONS.find(s => s.value === data.status)?.label || "—";
  const statusColor = STATUS_OPTIONS.find(s => s.value === data.status)?.color || "#6B7280";

  const ReviewRow = ({ label, value }: { label: string; value?: string | number }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 0", borderBottom: "1px solid #F1F5F9" }}>
      <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: "13px", color: "#111827", fontWeight: 600, maxWidth: "60%", textAlign: "left" }}>
        {value || "—"}
      </span>
    </div>
  );

  const ReviewCard = ({ step, icon, title, children }: {
    step: number; icon: React.ReactNode; title: string; children: React.ReactNode;
  }) => (
    <div style={{ background: "#FFFFFF", borderRadius: "16px", border: "1px solid #F1F5F9",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "20px", marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: "12px", paddingBottom: "10px", borderBottom: "1px solid #F1F5F9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ color: "#2563EB" }}>{icon}</div>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>{title}</span>
        </div>
        <button type="button" onClick={() => onEdit(step)}
          style={{ fontSize: "12px", color: "#2563EB", background: "#EFF6FF", border: "1px solid #BFDBFE",
            borderRadius: "8px", padding: "4px 12px", cursor: "pointer", fontWeight: 600 }}>
          تعديل
        </button>
      </div>
      {children}
    </div>
  );

  return (
    <div>
      {/* Completion Banner */}
      <div style={{
        padding: "20px 24px", borderRadius: "16px", marginBottom: "24px",
        background: "linear-gradient(135deg, #1E40AF, #2563EB, #3B82F6)",
        color: "white", display: "flex", alignItems: "center", gap: "16px",
      }}>
        <div style={{ width: "52px", height: "52px", borderRadius: "50%",
          background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0 }}>
          <CheckCircle2 size={28}/>
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800 }}>جاهز للحفظ!</h3>
          <p style={{ margin: "4px 0 0", fontSize: "13px", opacity: 0.85 }}>
            راجع جميع البيانات قبل إنشاء المشروع، أو عُد لأي خطوة لإجراء تعديلات.
          </p>
        </div>
      </div>

      <ReviewCard step={1} icon={<Building2 size={16}/>} title="البيانات الأساسية">
        <ReviewRow label="اسم المشروع" value={data.name} />
        {data.contractNo && <ReviewRow label="رقم العقد" value={data.contractNo} />}
        <ReviewRow label="نوع المشروع" value={projectTypeLabel} />
        <ReviewRow label="الموقع" value={data.location} />
        {data.district && <ReviewRow label="القضاء" value={data.district} />}
        {data.subDistrict && <ReviewRow label="الناحية" value={data.subDistrict} />}
        <ReviewRow label="الشركة المنفذة" value={data.contractor} />
        <ReviewRow label="اسم المركز" value={data.centerName} />
        <ReviewRow label="الجهة الممولة للمشروع" value={data.fundingSource} />
        <ReviewRow label="الحالة" value={statusLabel} />
        <ReviewRow label="المهندس المقيم" value={data.residentEngineerName} />
        <ReviewRow label="رقم هاتف المهندس" value={data.residentEngineerPhone} />
        <ReviewRow label="المشرفون المرافقون" value={data.selectedSupervisors?.join(" ، ")} />
      </ReviewCard>

      <ReviewCard step={2} icon={<Calendar size={16}/>} title="العقد والمدة والتكاليف">
        {data.referralNo && <ReviewRow label="رقم الإحالة" value={data.referralNo} />}
        {data.referralDate && <ReviewRow label="تاريخ الإحالة" value={formatDateDMY(data.referralDate)} />}
        <ReviewRow label="رقم العقد" value={data.contractNo} />
        {data.contractDate && <ReviewRow label="تاريخ العقد" value={formatDateDMY(data.contractDate)} />}
        <ReviewRow label="مدة العقد" value={data.durationDays ? `${data.durationDays} يوم` : undefined} />
        <ReviewRow label="تاريخ المباشرة" value={formatDateDMY(data.startDate)} />
        <ReviewRow label="المدة الإضافية الممنوحة" value={data.additionalDuration} />
        {(() => {
          const coListRev = Array.isArray(data.changeOrdersList) ? data.changeOrdersList : [];
          const coRevDays = coListRev.reduce((sum, item) => sum + parseDurationDays(item.additionalDays), 0);
          const durRev = Number(data.durationDays || 0);
          const extraRev = parseDurationDays(data.additionalDuration);
          const totalRev = durRev + extraRev + coRevDays;
          return (
            <>
              {coRevDays > 0 && <ReviewRow label="المدد الإضافية بأوامر الغيار" value={`${coRevDays} يوم`} />}
              <ReviewRow label="إجمالي مدة التنفيذ: الكلية :" value={totalRev ? `${totalRev} يوم` : undefined} />
            </>
          );
        })()}
        <ReviewRow label="تاريخ الإنجاز بعد المدد الإضافية" value={formatDateDMY(data.completionDateAfterAdditional)} />
        <ReviewRow label="كلفة المشروع الأساسية" value={data.contractValue ? formatMoney(data.contractValue) : undefined} />
        <ReviewRow label="عدد أوامر الغيار" value={data.changeOrdersCount ? `${data.changeOrdersCount} أمر` : undefined} />
        <ReviewRow label="مجموع مبالغ أوامر الغيار" value={data.changeOrdersTotalAmount ? formatMoney(data.changeOrdersTotalAmount) : undefined} />
        <ReviewRow label="كلفة العمل الإجمالية" value={(Number(data.contractValue || 0) + Number(data.changeOrdersTotalAmount || 0)) > 0 ? formatMoney(Number(data.contractValue || 0) + Number(data.changeOrdersTotalAmount || 0)) : undefined} />

        {Array.isArray(data.changeOrdersList) && data.changeOrdersList.length > 0 && (
          <div style={{ marginTop: "12px", borderTop: "1px dashed #DDD6FE", paddingTop: "10px" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#7C3AED", display: "block", marginBottom: "8px" }}>
              📋 تفاصيل أوامر الغيار ({data.changeOrdersList.length} أمر):
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {data.changeOrdersList.map((co, idx) => (
                <div key={idx} style={{
                  padding: "8px 12px", borderRadius: "8px", background: "#FAF5FF",
                  border: "1px solid #DDD6FE", display: "flex", justifyContent: "space-between",
                  alignItems: "center", fontSize: "12px"
                }}>
                  <div>
                    <strong style={{ color: "#5B21B6" }}>{co.orderNo || `أمر غيار رقم ${idx + 1}`}</strong>
                    {co.orderDate && <span style={{ color: "#64748B", marginRight: "8px" }}>({formatDateDMY(co.orderDate)})</span>}
                    {co.additionalDays && <span style={{ color: "#2563EB", fontWeight: 700, marginRight: "6px" }}>+{co.additionalDays}</span>}
                    {co.notes && <span style={{ color: "#94A3B8", marginRight: "6px" }}>- {co.notes}</span>}
                  </div>
                  <strong style={{ color: "#15803D", fontFamily: "monospace", fontWeight: 800 }}>
                    {Number(co.amount || 0).toLocaleString("en-US")} د.ع
                  </strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </ReviewCard>

      <ReviewCard step={3} icon={<CheckCircle2 size={16}/>} title="إجراءات الاستلام واللجان">
        {data.initialHandoverOrderNo && <ReviewRow label="رقم الأمر الإداري للاستلام الأولي" value={data.initialHandoverOrderNo} />}
        {data.initialHandoverOrderDate && <ReviewRow label="تاريخ الأمر الإداري للاستلام الأولي" value={formatDateDMY(data.initialHandoverOrderDate)} />}
        <ReviewRow label="تاريخ الاستلام الأولي" value={formatDateDMY(data.initialHandoverDate)} />
        <ReviewRow label="لجنة الاستلام الأولي" value={data.initialHandoverCommittee?.filter(Boolean).join(" ، ")} />
        {data.initialHandoverNotes && <ReviewRow label="ملاحظات الاستلام الأولي" value={data.initialHandoverNotes} />}
        {data.finalHandoverOrderNo && <ReviewRow label="رقم الأمر الإداري للاستلام النهائي" value={data.finalHandoverOrderNo} />}
        {data.finalHandoverOrderDate && <ReviewRow label="تاريخ الأمر الإداري للاستلام النهائي" value={formatDateDMY(data.finalHandoverOrderDate)} />}
        <ReviewRow label="تاريخ الاستلام النهائي" value={formatDateDMY(data.finalHandoverDate)} />
        <ReviewRow label="لجنة الاستلام النهائي" value={data.finalHandoverCommittee?.filter(Boolean).join(" ، ")} />
        {data.finalHandoverNotes && <ReviewRow label="ملاحظات الاستلام النهائي" value={data.finalHandoverNotes} />}
      </ReviewCard>

      <ReviewCard step={4} icon={<FileText size={16}/>} title="الملاحظات والتفاصيل الإضافية">
        {data.notes && <ReviewRow label="الملاحظات العامة" value={data.notes} />}
        {data.executedWorksPeriod && <ReviewRow label="الأعمال المنفذة" value={data.executedWorksPeriod} />}
        {data.deliveredEquipmentPeriod && <ReviewRow label="المعدات الواصلة" value={data.deliveredEquipmentPeriod} />}
        {data.delayReasons && <ReviewRow label="أسباب التأخير" value={data.delayReasons} />}
        {data.problemsObstaclesSolutions && <ReviewRow label="المشاكل والحلول" value={data.problemsObstaclesSolutions} />}
        {data.residentEngineerOpinion && <ReviewRow label="رأي المهندس المقيم" value={data.residentEngineerOpinion} />}
        {!data.notes && !data.executedWorksPeriod && !data.deliveredEquipmentPeriod && !data.delayReasons && !data.problemsObstaclesSolutions && !data.residentEngineerOpinion && (
          <p style={{ fontSize: "12px", color: "#94A3B8", margin: 0 }}>لا توجد ملاحظات إضافية مسجلة.</p>
        )}
      </ReviewCard>

    </div>
  );
}

const createInitialFormData = (): WizardFormData => ({
  name: "", location: "", district: "", subDistrict: "", contractor: "",
  contractNo: "", contractDate: "", referralNo: "", referralDate: "",
  referralMethod: "", fundingSource: "", centerName: "",
  contractValue: 0, durationDays: 0, startDate: "", plannedEndDate: "", expectedEndDate: "",
  plannedProgress: 0, actualProgress: 0, status: "ongoing",
  lat: undefined, lng: undefined, type: "investment", contractType: "",
  actualStartDate: "", resumeStartDate: "",
  suspensionDuration: "", actualExecutionDuration: "", additionalDuration: "",
  contractDurationAfterResume: "", contractualCompletionDate: "",
  completionDateAfterAdditional: "", remainingDurationFromResume: "",
  remainingDurationFromReport: "", delayReasons: "",
  changeOrdersCount: 0, changeOrdersTotalAmount: 0, changeOrdersList: [],
  workCost: 0, disbursedWork: 0, totalDisbursed: 0,
  estimatedCost: 0, amount: 0, localStaffCount: 0, foreignStaffCount: 0,
  executedWorksPeriod: "", deliveredEquipmentPeriod: "", notes: "",
  initialHandoverOrderNo: "", initialHandoverOrderDate: "",
  initialHandoverDate: "", initialHandoverCommittee: [], initialHandoverNotes: "",
  finalHandoverOrderNo: "", finalHandoverOrderDate: "",
  finalHandoverDate: "", finalHandoverCommittee: [], finalHandoverNotes: "",
  problemsObstaclesSolutions: "", suspensionDatesReasons: "", residentEngineerOpinion: "",
  residentEngineerName: "", residentEngineerPhone: "", selectedSupervisors: [],
});

// ─── Main Wizard Component ────────────────────────────────────────────────────
export function AddProjectWizard({ open, onClose, onSave }: AddProjectWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardFormData>(createInitialFormData);
  const [saving, setSaving] = useState(false);
  const [saveStage, setSaveStage] = useState<"idle" | "preparing" | "saving_local" | "syncing_cloud" | "success">("idle");
  const [slowNetworkWarning, setSlowNetworkWarning] = useState(false);
  const [totalProjectsCount, setTotalProjectsCount] = useState<number>(0);
  const [savedProjectSummary, setSavedProjectSummary] = useState<Project | null>(null);
  const isSubmittingRef = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Reset form with clean empty state whenever wizard opens
  useEffect(() => {
    if (open) {
      setData(createInitialFormData());
      setCurrentStep(1);
      setSaving(false);
      setSaveStage("idle");
      setSlowNetworkWarning(false);
      setTotalProjectsCount(0);
      setSavedProjectSummary(null);
      isSubmittingRef.current = false;
      try {
        localStorage.removeItem("add_project_draft");
      } catch {}
    }
  }, [open]);

  // Scroll to top on step change
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  const handleChange = useCallback((field: keyof WizardFormData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  }, []);

  const canProceed = () => {
    if (currentStep === 1) return !!(data.name?.trim());
    return true;
  };

  const handleNext = () => {
    if (saving) return;
    if (!canProceed()) {
      toast.error("يرجى إدخال اسم المشروع.");
      return;
    }
    if (currentStep < STEPS.length) setCurrentStep(s => s + 1);
  };

  const handleBack = () => {
    if (saving) return;
    if (currentStep > 1) setCurrentStep(s => s - 1);
  };

  const handleSuccessClose = () => {
    setData(createInitialFormData());
    setCurrentStep(1);
    setSaving(false);
    setSlowNetworkWarning(false);
    setSaveStage("idle");
    setSavedProjectSummary(null);
    isSubmittingRef.current = false;
    onClose();
  };

  const handleSave = async () => {
    // 1. Strict Anti-Double-Click / Concurrent Lock:
    if (isSubmittingRef.current || saving) {
      console.warn("[AddProjectWizard] Save already in progress, ignoring duplicate call.");
      return;
    }
    isSubmittingRef.current = true;
    setSaving(true);
    setSaveStage("preparing");
    setSlowNetworkWarning(false);

    const trimmedName = (data.name || "").trim();
    if (!trimmedName) {
      toast.error("يرجى إدخال اسم المشروع أولاً.");
      isSubmittingRef.current = false;
      setSaving(false);
      setSaveStage("idle");
      return;
    }

    // 2. Strict Deduplication Check:
    const existing = getStoredProjects();
    const isNameDuplicate = existing.some(
      (p) => p.name && p.name.trim().toLowerCase() === trimmedName.toLowerCase() && p.id !== data.id
    );
    if (isNameDuplicate) {
      toast.error(`يوجد مشروع مسجل مسبقاً بنفس الاسم: "${trimmedName}". لتفادي التكرار يرجى التأكد أو تغيير الاسم.`);
      isSubmittingRef.current = false;
      setSaving(false);
      setSaveStage("idle");
      return;
    }

    const trimmedContractNo = (data.contractNo || "").trim();
    if (trimmedContractNo) {
      const isContractDuplicate = existing.some(
        (p) => p.contractNo && p.contractNo.trim().toLowerCase() === trimmedContractNo.toLowerCase() && p.id !== data.id
      );
      if (isContractDuplicate) {
        toast.error(`رقم العقد "${trimmedContractNo}" مستخدم بالفعل لمشروع آخر! يرجى التحقق لتفادي التكرار.`);
        isSubmittingRef.current = false;
        setSaving(false);
        setSaveStage("idle");
        return;
      }
    }

    // 3. Calculation & Model preparation
    const actualProg = (data.actualProgress === undefined || data.actualProgress === null || isNaN(Number(data.actualProgress)) || String(data.actualProgress).trim() === "")
      ? 0
      : Number(data.actualProgress);

    const plannedProg = (data.plannedProgress === undefined || data.plannedProgress === null || isNaN(Number(data.plannedProgress)) || String(data.plannedProgress).trim() === "")
      ? 0
      : Number(data.plannedProgress);

    const projStatus: ProjectStatus = (actualProg >= 100 || data.status === "completed")
      ? "completed"
      : (data.status || "ongoing");

    const coList = Array.isArray(data.changeOrdersList) ? data.changeOrdersList : [];
    const coTotal = coList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const coCount = coList.length;
    const coExtraDays = coList.reduce((sum, item) => sum + parseDurationDays(item.additionalDays), 0);
    const durationNum = Number(data.durationDays || 0);
    const extraNum = parseDurationDays(data.additionalDuration);
    const totalExecDays = durationNum + extraNum + coExtraDays;
    const finalWorkCost = Number(data.contractValue || 0) + coTotal;
    const calculatedCompAfterAdd = (data.startDate && totalExecDays > 0)
      ? calcDateAddDaysISO(data.startDate, totalExecDays)
      : data.completionDateAfterAdditional;
    const summaryStr = coList.map((item, idx) => `${item.orderNo || `أمر ${idx + 1}`}: ${formatDateDMY(item.orderDate)} ${item.additionalDays ? `(+${item.additionalDays})` : ""} (${Number(item.amount || 0).toLocaleString("en-US")} د.ع)`).join(" | ");

    // Stable Project ID
    const stableId = data.id || `PRJ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newProject: Project = {
      ...(data as Project),
      id: stableId,
      changeOrdersList: coList,
      changeOrdersCount: coCount,
      changeOrdersTotalAmount: coTotal,
      changeOrderSingleAmount: coList.length > 0 ? Number(coList[0].amount || 0) : 0,
      changeOrderNoAndDate: data.changeOrderNoAndDate || summaryStr,
      completionDateAfterAdditional: calculatedCompAfterAdd || data.completionDateAfterAdditional,
      workCost: finalWorkCost,
      actualProgress: projStatus === "completed" ? 100 : actualProg,
      plannedProgress: plannedProg,
      status: projStatus,
      lat: (typeof data.lat === "number" && !isNaN(data.lat) && data.lat !== 0) ? data.lat : undefined,
      lng: (typeof data.lng === "number" && !isNaN(data.lng) && data.lng !== 0) ? data.lng : undefined,
    };

    // 4. Stage: Local Storage Save
    setSaveStage("saving_local");
    await new Promise((r) => setTimeout(r, 200));

    const updated = [
      newProject,
      ...existing.filter(
        (p) => p.id !== newProject.id && p.name?.trim().toLowerCase() !== trimmedName.toLowerCase()
      ),
    ];
    saveStoredProjects(updated);
    setTotalProjectsCount(updated.length);
    setSavedProjectSummary(newProject);

    // تسجيل العملية في سجل النظام
    try {
      logActivity({
        actionType: "project_create",
        category: "projects",
        title: `إضافة مشروع جديد: ${newProject.name}`,
        description: `تم إدراج المشروع في ${newProject.district || newProject.location || "الأنبار"} بكلفة ${Number(newProject.contractValue || 0).toLocaleString()} ${newProject.currency === "USD" ? "$" : "د.ع"} (المقاول: ${newProject.contractor || "غير محدد"})`,
        details: {
          "معرف المشروع": newProject.id,
          "رقم العقد": newProject.contractNo,
          "القضاء": newProject.district || "-",
          "حالة المشروع": newProject.status,
          "المقاول": newProject.contractor,
        },
      });
    } catch {}

    // 5. Stage: Cloud Sync with Slow Network Detector
    setSaveStage("syncing_cloud");

    const slowTimer = setTimeout(() => {
      setSlowNetworkWarning(true);
    }, 2200);

    let syncSuccess = false;
    try {
      // Execute parent onSave handler with safety timeout so weak internet doesn't hang indefinitely
      const onSavePromise = Promise.resolve(onSave(newProject));
      const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
        setTimeout(() => resolve({ timeout: true }), 14000)
      );
      const res = await Promise.race([onSavePromise, timeoutPromise]);
      clearTimeout(slowTimer);

      if (res && typeof res === "object" && "timeout" in res) {
        console.warn("[AddProjectWizard] Cloud sync timed out on slow network. Local save already succeeded.");
        syncSuccess = false;
      } else {
        syncSuccess = true;
      }
    } catch (err) {
      clearTimeout(slowTimer);
      console.warn("[AddProjectWizard] Cloud sync error:", err);
      syncSuccess = false;
    }

    // 6. Stage: Success confirmation
    const finalStored = getStoredProjects();
    setTotalProjectsCount(finalStored.length || updated.length);
    setSavedProjectSummary(newProject);
    setSaveStage("success");
    if (syncSuccess) {
      toast.success("تم إنشاء المشروع وحفظه ومزامنته سحابياً بنجاح!");
    } else {
      toast.info("تم حفظ المشروع محلياً في جهازك بنجاح! وسيقوم النظام بمزامنته مع السحابة فور استقرار الإنترنت. 💾");
    }

    try {
      localStorage.removeItem("add_project_draft");
    } catch {}
  };

  const handleClose = () => {
    if (saving && saveStage !== "success") return;
    if (saveStage === "success") {
      handleSuccessClose();
      return;
    }
    try {
      localStorage.removeItem("add_project_draft");
    } catch {}
    setData(createInitialFormData());
    setCurrentStep(1);
    onClose();
  };

  if (!open) return null;

  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;
  const currentStepInfo = STEPS[currentStep - 1];

  return (
    <>
      {/* Overlay */}
      <div
        onClick={saving && saveStage !== "success" ? undefined : (saveStage === "success" ? handleSuccessClose : handleClose)}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)", zIndex: 1000,
          animation: "fadeIn 0.2s ease",
          cursor: saving ? "not-allowed" : "default",
        }}
      />

      {/* Wizard Panel */}
      <div
        dir="rtl"
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(96vw, 900px)",
          height: "min(92vh, 900px)",
          maxHeight: "92dvh",
          background: "#F8FAFC",
          borderRadius: "20px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.12)",
          display: "flex", flexDirection: "column",
          overflow: "hidden", zIndex: 1001,
          animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* ── Full Wizard Loading Overlay & Anti-Duplicate Protector ── */}
        {saving && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255, 255, 255, 0.94)",
              backdropFilter: "blur(8px)",
              zIndex: 1050,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              animation: "fadeIn 0.25s ease",
              direction: "rtl",
            }}
          >
            {saveStage === "success" ? (
              /* ── Success Confirmation Screen with Total Projects Count and Top-Corner 'X' ── */
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1.5px solid #E2E8F0",
                  borderRadius: "24px",
                  boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(0,0,0,0.04)",
                  padding: "36px 30px 28px",
                  width: "min(92%, 500px)",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  position: "relative",
                  animation: "scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {/* Close Button 'X' at Top Left (RTL Standard) */}
                <button
                  type="button"
                  onClick={handleSuccessClose}
                  title="إغلاق النافذة"
                  style={{
                    position: "absolute",
                    top: "16px",
                    left: "16px",
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    border: "1.5px solid #E2E8F0",
                    background: "#F8FAFC",
                    color: "#64748B",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#F1F5F9";
                    e.currentTarget.style.color = "#0F172A";
                    e.currentTarget.style.borderColor = "#CBD5E1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#F8FAFC";
                    e.currentTarget.style.color = "#64748B";
                    e.currentTarget.style.borderColor = "#E2E8F0";
                  }}
                >
                  <X size={20} strokeWidth={2.5} />
                </button>

                {/* Animated Green Success Badge */}
                <div
                  style={{
                    width: "78px",
                    height: "78px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #ECFDF5, #D1FAE5)",
                    border: "3px solid #10B981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: "bounceIn 0.4s ease",
                    boxShadow: "0 10px 25px rgba(16, 185, 129, 0.25)",
                    marginBottom: "16px",
                  }}
                >
                  <CheckCircle2 size={46} color="#059669" />
                </div>

                {/* Title */}
                <h3
                  style={{
                    margin: "0 0 6px",
                    fontSize: "20px",
                    fontWeight: 900,
                    color: "#065F46",
                  }}
                >
                  تمت إضافة وحفظ المشروع بنجاح!
                </h3>

                <p
                  style={{
                    margin: "0 0 16px",
                    fontSize: "13px",
                    color: "#64748B",
                    fontWeight: 600,
                    lineHeight: 1.5,
                  }}
                >
                  تم تسجيل المشروع في النظام ومزامنته مع قاعدة البيانات السحابية بأمان.
                </p>

                {/* Summary of Added Project */}
                <div
                  style={{
                    width: "100%",
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "14px",
                    padding: "12px 16px",
                    marginBottom: "14px",
                    textAlign: "right",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <Building2 size={16} color="#2563EB" />
                    <span style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A" }}>
                      {savedProjectSummary?.name || data.name}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", fontSize: "12px", color: "#64748B" }}>
                    {(savedProjectSummary?.contractNo || data.contractNo) && (
                      <span>رقم العقد: <strong style={{ color: "#334155" }}>{savedProjectSummary?.contractNo || data.contractNo}</strong></span>
                    )}
                    {(savedProjectSummary?.district || data.district) && (
                      <span>القضاء: <strong style={{ color: "#334155" }}>{savedProjectSummary?.district || data.district}</strong></span>
                    )}
                    {(savedProjectSummary?.contractor || data.contractor) && (
                      <span>المقاول: <strong style={{ color: "#334155" }}>{savedProjectSummary?.contractor || data.contractor}</strong></span>
                    )}
                  </div>
                </div>

                {/* ── Total Projects Count KPI Box ── */}
                <div
                  style={{
                    width: "100%",
                    padding: "14px 18px",
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)",
                    border: "2px solid #86EFAC",
                    boxShadow: "0 4px 16px rgba(16, 185, 129, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "20px",
                    textAlign: "right",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "14px",
                        background: "#059669",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: "0 4px 10px rgba(5, 150, 105, 0.3)",
                      }}
                    >
                      <Layers size={22} />
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", color: "#166534", fontWeight: 700, display: "block" }}>
                        إحصائية النظام المحدثة
                      </span>
                      <span style={{ fontSize: "14px", color: "#065F46", fontWeight: 900 }}>
                        أصبح العدد الإجمالي للمشاريع المضافة الآن:
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      background: "#FFFFFF",
                      border: "1.5px solid #86EFAC",
                      borderRadius: "14px",
                      padding: "6px 16px",
                      textAlign: "center",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                      minWidth: "75px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "24px",
                        fontWeight: 900,
                        color: "#059669",
                        fontFamily: "monospace",
                        display: "block",
                        lineHeight: 1.1,
                      }}
                    >
                      {totalProjectsCount}
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#166534" }}>
                      مشروع
                    </span>
                  </div>
                </div>

                {/* Primary Dismiss Button */}
                <button
                  type="button"
                  onClick={handleSuccessClose}
                  style={{
                    width: "100%",
                    padding: "12px 24px",
                    borderRadius: "14px",
                    fontSize: "14px",
                    fontWeight: 800,
                    background: "linear-gradient(135deg, #059669, #047857)",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 14px rgba(5, 150, 105, 0.35)",
                    transition: "all 0.2s",
                  }}
                >
                  <Check size={18} />
                  <span>حسناً، تم الإغلاق</span>
                </button>
              </div>
            ) : (
              /* ── Loading / In-Progress Screen ── */
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1.5px solid #E2E8F0",
                  borderRadius: "24px",
                  boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(0,0,0,0.04)",
                  padding: "32px 28px",
                  width: "min(92%, 460px)",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  animation: "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {/* Animated Icon Ring */}
                <div style={{ position: "relative", marginBottom: "18px" }}>
                  <div
                    style={{
                      width: "74px",
                      height: "74px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)",
                      border: "3px solid #3B82F6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 10px 25px rgba(37, 99, 235, 0.2)",
                      position: "relative",
                    }}
                  >
                    <Loader2
                      size={40}
                      color="#2563EB"
                      style={{ animation: "spin 1.2s linear infinite" }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Building2 size={18} color="#1D4ED8" />
                    </div>
                  </div>
                </div>

                {/* Main Status Title */}
                <h3
                  style={{
                    margin: "0 0 6px",
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "#0F172A",
                  }}
                >
                  جارٍ إنشاء وحفظ بيانات المشروع...
                </h3>

                <p
                  style={{
                    margin: "0 0 20px",
                    fontSize: "13px",
                    color: "#64748B",
                    fontWeight: 600,
                    lineHeight: 1.5,
                  }}
                >
                  يرجى الانتظار، جاري حفظ البيانات وتأمينها لتفادي أي تكرار للإضافة.
                </p>

                {/* 3 Step Progress Checklist */}
                <div
                  style={{
                    width: "100%",
                    background: "#F8FAFC",
                    borderRadius: "16px",
                    border: "1px solid #E2E8F0",
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    textAlign: "right",
                  }}
                >
                  {/* Step 1: Verification */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: saveStage !== "preparing" ? "#D1FAE5" : "#DBEAFE",
                          color: saveStage !== "preparing" ? "#059669" : "#2563EB",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "11px",
                          fontWeight: 800,
                        }}
                      >
                        {saveStage !== "preparing" ? <Check size={14} /> : <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />}
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#1E293B" }}>
                        فحص وتدقيق بيانات المشروع
                      </span>
                    </div>
                    <span style={{ fontSize: "11px", color: saveStage !== "preparing" ? "#059669" : "#2563EB", fontWeight: 700 }}>
                      {saveStage !== "preparing" ? "مكتمل" : "جاري الفحص..."}
                    </span>
                  </div>

                  {/* Step 2: Local Storage */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background:
                            saveStage === "syncing_cloud" || saveStage === "success"
                              ? "#D1FAE5"
                              : saveStage === "saving_local"
                              ? "#DBEAFE"
                              : "#F1F5F9",
                          color:
                            saveStage === "syncing_cloud" || saveStage === "success"
                              ? "#059669"
                              : saveStage === "saving_local"
                              ? "#2563EB"
                              : "#94A3B8",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "11px",
                          fontWeight: 800,
                        }}
                      >
                        {saveStage === "syncing_cloud" || saveStage === "success" ? (
                          <Check size={14} />
                        ) : saveStage === "saving_local" ? (
                          <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                        ) : (
                          <Clock size={12} />
                        )}
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#1E293B" }}>
                        التثبيت في سجلات النظام المحلية
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        color:
                          saveStage === "syncing_cloud" || saveStage === "success"
                            ? "#059669"
                            : saveStage === "saving_local"
                            ? "#2563EB"
                            : "#94A3B8",
                        fontWeight: 700,
                      }}
                    >
                      {saveStage === "syncing_cloud" || saveStage === "success"
                        ? "محفوظ ومؤمّن"
                        : saveStage === "saving_local"
                        ? "جاري الحفظ..."
                        : "قيد الانتظار"}
                    </span>
                  </div>

                  {/* Step 3: Cloud Sync */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background:
                            saveStage === "success"
                              ? "#D1FAE5"
                              : saveStage === "syncing_cloud"
                              ? "#DBEAFE"
                              : "#F1F5F9",
                          color:
                            saveStage === "success"
                              ? "#059669"
                              : saveStage === "syncing_cloud"
                              ? "#2563EB"
                              : "#94A3B8",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "11px",
                          fontWeight: 800,
                        }}
                      >
                        {saveStage === "success" ? (
                          <Check size={14} />
                        ) : saveStage === "syncing_cloud" ? (
                          <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                        ) : (
                          <Clock size={12} />
                        )}
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#1E293B" }}>
                        المزامنة مع السحابة (Supabase)
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        color:
                          saveStage === "success"
                            ? "#059669"
                            : saveStage === "syncing_cloud"
                            ? "#2563EB"
                            : "#94A3B8",
                        fontWeight: 700,
                      }}
                    >
                      {saveStage === "success"
                        ? "تمت المزامنة"
                        : saveStage === "syncing_cloud"
                        ? "جاري المزامنة..."
                        : "قيد الانتظار"}
                    </span>
                  </div>
                </div>

                {/* Weak Network Reassurance Banner */}
                {slowNetworkWarning && (
                  <div
                    style={{
                      marginTop: "16px",
                      padding: "12px 14px",
                      borderRadius: "14px",
                      background: "#FFFBEB",
                      border: "1.5px solid #FCD34D",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      boxShadow: "0 4px 12px rgba(245, 158, 11, 0.1)",
                      animation: "fadeIn 0.3s ease",
                      textAlign: "right",
                    }}
                  >
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "10px",
                        background: "#FEF3C7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <WifiOff size={18} color="#D97706" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: "12px", fontWeight: 800, color: "#92400E" }}>
                        الاتصال بالإنترنت بطيء حالياً
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#B45309", lineHeight: 1.4 }}>
                        تم حفظ المشروع في جهازك بنجاح. جاري استكمال المزامنة السحابية تلقائياً دون تكرار الإضافة.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Sticky Header ── */}
        <div style={{
          background: "#FFFFFF", borderBottom: "1px solid #E5E7EB",
          padding: "0", flexShrink: 0,
        }}>
          {/* Top bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 24px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "12px",
                background: "linear-gradient(135deg, #1E40AF, #2563EB)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
              }}>
                <Building2 size={22} color="white"/>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#111827" }}>
                  إضافة مشروع جديد
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6B7280" }}>
                  {currentStepInfo.title} — {currentStepInfo.subtitle}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Reset / Clear Button */}
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  if (saving) return;
                  setData(createInitialFormData());
                  setCurrentStep(1);
                  try {
                    localStorage.removeItem("add_project_draft");
                  } catch {}
                  toast.info("تم تفريغ ومسح كافة الحقول بنجاح");
                }}
                title="تفريغ ومسح كافة الحقول"
                style={{
                  display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px",
                  borderRadius: "10px", border: "1.5px solid #CBD5E1", background: "#F1F5F9",
                  color: saving ? "#94A3B8" : "#475569", fontSize: "12px", fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.5 : 1,
                }}
              >
                <RotateCcw size={13} />
                تفريغ الحقول
              </button>
              {/* Step counter */}
              <div style={{
                background: "#EFF6FF", borderRadius: "20px", padding: "4px 14px",
                fontSize: "12px", fontWeight: 700, color: "#2563EB",
              }}>
                {currentStep} / {STEPS.length}
              </div>
              {/* Close */}
              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                style={{
                  width: "36px", height: "36px", borderRadius: "10px", border: "1.5px solid #E5E7EB",
                  background: "#FAFAFA", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: saving ? "not-allowed" : "pointer", color: saving ? "#CBD5E1" : "#6B7280",
                  opacity: saving ? 0.5 : 1,
                }}
              ><X size={18}/></button>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: "3px", background: "#F1F5F9" }}>
            <div style={{
              height: "100%", width: `${progress}%`,
              background: "linear-gradient(90deg, #2563EB, #3B82F6)",
              transition: "width 0.4s ease", borderRadius: "0 4px 4px 0",
            }}/>
          </div>

          {/* Step Indicator */}
          <div style={{ padding: "16px 24px" }}>
            <StepIndicator currentStep={currentStep} steps={STEPS}/>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div ref={bodyRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          <style>{`
            @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
            @keyframes slideUp { from { opacity:0; transform:translate(-50%,-48%) } to { opacity:1; transform:translate(-50%,-50%) } }
            @keyframes stepIn { from { opacity:0; transform:translateX(12px) } to { opacity:1; transform:translateX(0) } }
            @keyframes bounceIn { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); } }
            @keyframes scaleIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            .wizard-step-enter { animation: stepIn 0.25s ease; }
          `}</style>
          <div className="wizard-step-enter">
            {currentStep === 1 && <Step1Basic data={data} onChange={handleChange}/>}
            {currentStep === 2 && <Step2Dates data={data} onChange={handleChange}/>}
            {currentStep === 3 && <Step3Handover data={data} onChange={handleChange}/>}
            {currentStep === 4 && <Step4Notes data={data} onChange={handleChange}/>}
            {currentStep === 5 && <Step5Review data={data} onEdit={setCurrentStep}/>}
          </div>
        </div>

        {/* ── Sticky Footer ── */}
        <div style={{
          background: "#FFFFFF", borderTop: "1px solid #E5E7EB",
          padding: "14px 24px", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {/* Left: Back / Cancel */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              style={{
                padding: "9px 20px", borderRadius: "10px", fontSize: "13px", fontWeight: 600,
                border: "1.5px solid #E5E7EB", background: "transparent",
                color: saving ? "#CBD5E1" : "#6B7280",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.5 : 1,
              }}
            >إلغاء</button>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={saving}
                style={{
                  padding: "9px 20px", borderRadius: "10px", fontSize: "13px", fontWeight: 600,
                  border: "1.5px solid #BFDBFE", background: "#EFF6FF",
                  color: saving ? "#93C5FD" : "#2563EB",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.5 : 1,
                  display: "flex", alignItems: "center", gap: "6px",
                }}
              >
                <ChevronRight size={16}/> السابق
              </button>
            )}
          </div>

          {/* Center: auto-save hint */}
          <p style={{ fontSize: "11px", color: "#9CA3AF", margin: 0 }}>
            💾 يتم الحفظ التلقائي كل 30 ثانية
          </p>

          {/* Right: Next / Save */}
          <div>
            {currentStep < STEPS.length ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={saving}
                style={{
                  padding: "10px 28px", borderRadius: "10px", fontSize: "14px", fontWeight: 700,
                  background: "linear-gradient(135deg, #1E40AF, #2563EB)",
                  color: "white", border: "none", cursor: saving ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: "8px",
                  boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                التالي <ChevronLeft size={16}/>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "10px 32px", borderRadius: "10px", fontSize: "14px", fontWeight: 800,
                  background: saving ? "#9CA3AF" : "linear-gradient(135deg, #047857, #059669)",
                  color: "white", border: "none",
                  cursor: saving ? "not-allowed" : "pointer",
                  pointerEvents: saving ? "none" : "auto",
                  display: "flex", alignItems: "center", gap: "8px",
                  boxShadow: saving ? "none" : "0 4px 14px rgba(5,150,105,0.35)",
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    <span>جارٍ حفظ المشروع...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>إنشاء المشروع</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}
