import { useState, useMemo, useEffect } from "react";
import {
  Building2, Search, Filter, MapPin, User, CheckCircle2,
  Clock, AlertTriangle, X, Sparkles, TrendingUp, TrendingDown,
  ArrowLeft, FileText, Check, DollarSign, Calendar, ShieldCheck,
  ChevronRight, ArrowRight, Eye, Layers, CheckCircle, ChevronDown,
  FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ANBAR_DISTRICTS, STATUS_LABEL, type Project, type ProjectStatus } from "@/lib/mock-data";
import { formatDateDMY } from "@/components/AddProjectWizard";

interface ProjectSelectionDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  projects: Project[];
  selectedProjectId?: string;
  onSelectProject: (project: Project) => void;
  onSelectMultipleProjects?: (projects: Project[]) => void;
}

export function ProjectSelectionDialog({
  open,
  onOpenChange,
  onClose,
  projects,
  selectedProjectId,
  onSelectProject,
  onSelectMultipleProjects,
}: ProjectSelectionDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedExportIds, setSelectedExportIds] = useState<string[]>([]);
  const [isDistrictMenuOpen, setIsDistrictMenuOpen] = useState(false);

  // Track currently highlighted selection
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleClose = () => {
    if (onOpenChange) onOpenChange(false);
    if (onClose) onClose();
  };

  // Sync selected project with prop when dialog opens
  useEffect(() => {
    if (open) {
      if (selectedProjectId) {
        const found = projects.find((p) => p.id === selectedProjectId);
        setSelectedProject(found || projects[0] || null);
      } else if (projects.length > 0) {
        setSelectedProject(projects[0]);
      }
    }
  }, [open, selectedProjectId, projects]);

  const handleConfirmSelection = (projectToConfirm?: Project) => {
    if (selectedExportIds.length > 1 && onSelectMultipleProjects) {
      const selectedList = projects.filter((p) => selectedExportIds.includes(p.id));
      onSelectMultipleProjects(selectedList);
      handleClose();
      return;
    }

    const target = projectToConfirm || selectedProject;
    if (target) {
      onSelectProject(target);
      handleClose();
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
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
        matchField(p.district) ||
        matchField(p.location) ||
        matchField(p.residentEngineerName) ||
        matchField(p.contractor);

      const matchStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(p.status);
      const matchDistrict =
        selectedDistricts.length === 0 || (p.district && selectedDistricts.includes(p.district));

      return matchSearch && matchStatus && matchDistrict;
    });
  }, [projects, searchQuery, selectedStatuses, selectedDistricts]);

  const statusCounts = useMemo(() => {
    const counts = {
      all: projects.length,
      ongoing: 0,
      delayed: 0,
      stopped: 0,
      completed: 0,
    };
    projects.forEach((p) => {
      if (p.status in counts) {
        counts[p.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [projects]);

  const toggleStatus = (statusId: string) => {
    if (statusId === "all") {
      setSelectedStatuses([]);
      return;
    }
    if (selectedStatuses.includes(statusId)) {
      setSelectedStatuses(selectedStatuses.filter((s) => s !== statusId));
    } else {
      setSelectedStatuses([...selectedStatuses, statusId]);
    }
  };

  const toggleDistrict = (districtName: string) => {
    if (selectedDistricts.includes(districtName)) {
      setSelectedDistricts(selectedDistricts.filter((d) => d !== districtName));
    } else {
      setSelectedDistricts([...selectedDistricts, districtName]);
    }
  };

  const toggleProjectForExport = (projectId: string) => {
    if (selectedExportIds.includes(projectId)) {
      setSelectedExportIds(selectedExportIds.filter((id) => id !== projectId));
    } else {
      setSelectedExportIds([...selectedExportIds, projectId]);
    }
  };

  const selectAllFilteredForExport = () => {
    const allFilteredIds = filteredProjects.map((p) => p.id);
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedExportIds.includes(id));

    if (isAllSelected) {
      setSelectedExportIds(selectedExportIds.filter((id) => !allFilteredIds.includes(id)));
    } else {
      const set = new Set([...selectedExportIds, ...allFilteredIds]);
      setSelectedExportIds(Array.from(set));
    }
  };

  const handleExportProjectsToExcel = (specificProject?: Project) => {
    let listToExport: Project[] = [];

    if (specificProject) {
      listToExport = [specificProject];
    } else if (selectedExportIds.length > 0) {
      listToExport = projects.filter((p) => selectedExportIds.includes(p.id));
    } else {
      listToExport = filteredProjects;
    }

    if (listToExport.length === 0) {
      toast.error("لا توجد مشاريع مجهّزة للتصدير إلى Excel");
      return;
    }

    const cleanName = specificProject
      ? specificProject.name.replace(/[\\/:*?"<>|]/g, "_")
      : `قائمة_${listToExport.length}_مشاريع`;
    const filename = specificProject
      ? `بيانات_مشروع_${cleanName}.xls`
      : `قائمة_مشاريع_التقرير_الشهري_${new Date().toISOString().split("T")[0]}.xls`;

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>مشاريع التقرير الشهري</x:Name>
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
          th { background-color: #1E3A8A; color: #FFFFFF; font-weight: bold; border: 1px solid #CBD5E1; padding: 10px; text-align: center; }
          td { border: 1px solid #CBD5E1; padding: 8px; text-align: right; vertical-align: middle; }
          .title-row { background-color: #0284C7; color: #FFFFFF; font-size: 14pt; font-weight: bold; text-align: center; padding: 12px; }
          .highlight-emerald { background-color: #ECFDF5; color: #047857; font-weight: bold; }
          .highlight-amber { background-color: #FEF3C7; color: #B45309; font-weight: bold; }
          .highlight-blue { background-color: #EFF6FF; color: #1D4ED8; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <th colspan="14" class="title-row">
              مشاريع مديرية ماء الأنبار
            </th>
          </tr>
          <tr>
            <th>#</th>
            <th>اسم المشروع</th>
            <th>اسم المركز</th>
            <th>رقم العقد</th>
            <th>تاريخ العقد</th>
            <th>مدة المشروع (يوم)</th>
            <th>القضاء / الموقع</th>
            <th>الإحداثيات (GIS)</th>
            <th>الشركة المنفذة (المقاول)</th>
            <th>المهندس المقيم</th>
            <th>حالة المشروع</th>
            <th>نسبة الإنجاز الفعلي</th>
            <th>مبلغ العقد (د.ع)</th>
            <th>الجهة الممولة</th>
          </tr>
          ${listToExport
            .map((p, idx) => {
              const statusText = STATUS_LABEL[p.status] || p.status;
              const formattedContractDate = p.contractDate ? formatDateDMY(p.contractDate) : "—";
              const formattedDuration = p.durationDays ? `${p.durationDays} يوم` : "—";
              const coords = p.lat && p.lng ? `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}` : "—";
              return `
            <tr>
              <td style="text-align:center;">${idx + 1}</td>
              <td class="highlight-blue">${p.name || "—"}</td>
              <td>${p.centerName || "—"}</td>
              <td>${p.contractNo || "—"}</td>
              <td>${formattedContractDate}</td>
              <td>${formattedDuration}</td>
              <td>${p.district || "الأنبار"} (${p.location || "—"})</td>
              <td>${coords}</td>
              <td>${p.contractor || "—"}</td>
              <td>${p.residentEngineerName || "—"}</td>
              <td>${statusText}</td>
              <td class="highlight-emerald">${p.actualProgress || 0}%</td>
              <td>${(p.contractValue || 0).toLocaleString("en-US")} د.ع</td>
              <td>${p.fundingSource || "—"}</td>
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

    toast.success(`📊 تم تصدير بيانات ${listToExport.length} مشروع إلى ملف Excel بنجاح!`);
  };

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case "ongoing":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1.5 animate-pulse" />
            قيد التنفيذ
          </Badge>
        );
      case "delayed":
        return (
          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-1.5" />
            متأخر
          </Badge>
        );
      case "stopped":
        return (
          <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 ml-1.5" />
            متوقف
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-1.5" />
            منجز
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold">
            {STATUS_LABEL[status] || status}
          </Badge>
        );
    }
  };



  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleClose();
        } else if (onOpenChange) {
          onOpenChange(isOpen);
        }
      }}
    >
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl dir-rtl">
        {/* ─── Header matching system design ────────────────────────── */}
        <div className="p-6 pl-14 sm:pl-16 border-b border-slate-200 bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-slate-50 shrink-0 relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/25 shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                  <span>اختيار مشروع لإعداد التقرير الشهري</span>
                  <Badge className="bg-blue-100 text-blue-800 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {filteredProjects.length} من {projects.length} مشروع
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-600 mt-1">
                  اختر المشروع المطلوب لاستيراد كافة بياناته الفنية، المالية ونسب الإنجاز تلقائياً، ثم اضغط على زر <strong className="text-blue-700 font-black">تأكيد الاختيار</strong>.
                </DialogDescription>
              </div>
            </div>

            {/* Export List to Excel Button in Header */}
            <Button
              type="button"
              onClick={() => handleExportProjectsToExcel()}
              variant="outline"
              className="gap-2 rounded-xl text-xs font-bold border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50 shadow-xs shrink-0 py-2.5 px-4"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>
                {selectedExportIds.length > 0
                  ? `تصدير (${selectedExportIds.length}) مشاريع محددة لـ Excel`
                  : "تصدير القائمة إلى Excel"}
              </span>
            </Button>
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-5 space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Search Box */}
              <div className="relative flex-1 w-full">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث باسم المشروع، رقم الإحالة، رقم العقد، القضاء، المقاول، أو المهندس المقيم..."
                  className="pr-10 pl-9 rounded-xl text-xs bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 h-10 shadow-xs transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Multi-Select District Filter Dropdown */}
              <div className="relative w-full sm:w-64 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDistrictMenuOpen((prev) => !prev)}
                  className={`w-full h-10 px-3.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all dir-rtl ${
                    selectedDistricts.length > 0
                      ? "bg-blue-50 border-blue-500 text-blue-900 shadow-xs ring-2 ring-blue-500/20"
                      : "bg-white border-slate-300 text-slate-800 hover:border-slate-400 shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className={`w-4 h-4 shrink-0 ${selectedDistricts.length > 0 ? "text-blue-600" : "text-slate-400"}`} />
                    <span className="truncate">
                      {selectedDistricts.length === 0
                        ? `📍 جميع الأقضية (${projects.length})`
                        : `📍 ${selectedDistricts.length} أقضية محددة`}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${isDistrictMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown Menu for Multi-Selecting Districts */}
                {isDistrictMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsDistrictMenuOpen(false)}
                    />
                    <div className="absolute z-50 right-0 left-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 space-y-2 max-h-72 overflow-y-auto dir-rtl text-right">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                        <span className="font-black text-slate-800 flex items-center gap-1.5">
                          <Filter className="w-3.5 h-3.5 text-blue-600" /> اختيار الأقضية (تحديد متعدد)
                        </span>
                        {selectedDistricts.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedDistricts([])}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline"
                          >
                            إلغاء التحديد ({selectedDistricts.length})
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-1 pt-1">
                        <label
                          className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                            selectedDistricts.length === 0
                              ? "bg-blue-50 text-blue-900 font-black"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedDistricts.length === 0}
                              onChange={() => setSelectedDistricts([])}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>جميع الأقضية</span>
                          </div>
                          <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-600">
                            {projects.length} مشروع
                          </span>
                        </label>

                        {ANBAR_DISTRICTS.map((d) => {
                          const isChecked = selectedDistricts.includes(d.name);
                          const districtProjectCount = projects.filter((p) => p.district === d.name).length;

                          return (
                            <label
                              key={d.id}
                              className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                                isChecked
                                  ? "bg-blue-50/90 text-blue-900 border border-blue-200"
                                  : "hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleDistrict(d.name)}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>{d.name}</span>
                              </div>
                              <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-600">
                                {districtProjectCount} مشروع
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Multi-Select Status Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] font-bold text-slate-500 ml-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-blue-600" /> تصفية الحالة (تحديد متعدد):
              </span>
              {[
                { id: "all", label: "الكل", count: statusCounts.all },
                { id: "ongoing", label: "قيد التنفيذ", count: statusCounts.ongoing },
                { id: "delayed", label: "متأخر", count: statusCounts.delayed },
                { id: "stopped", label: "متوقف", count: statusCounts.stopped },
                { id: "completed", label: "منجز", count: statusCounts.completed },
              ].map((f) => {
                const isActive = f.id === "all" ? selectedStatuses.length === 0 : selectedStatuses.includes(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleStatus(f.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-500"
                        : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {isActive && f.id !== "all" && <Check className="w-3 h-3 stroke-[3]" />}
                    <span>{f.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? "bg-white/25 text-white" : "bg-white text-slate-600 border border-slate-200"
                    }`}>
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Filters Summary Bar */}
            {(selectedDistricts.length > 0 || selectedStatuses.length > 0 || searchQuery) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60 text-xs">
                <span className="text-[10px] font-bold text-slate-500 ml-1">الفلاتر المطبقة:</span>
                {selectedDistricts.map((d) => (
                  <Badge
                    key={d}
                    className="bg-blue-100 text-blue-900 border border-blue-200 text-[10px] font-bold gap-1 px-2 py-0.5 rounded-lg flex items-center"
                  >
                    <span>📍 {d}</span>
                    <button
                      type="button"
                      onClick={() => toggleDistrict(d)}
                      className="hover:text-rose-600 mr-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {selectedStatuses.map((s) => {
                  const label = STATUS_LABEL[s as ProjectStatus] || s;
                  return (
                    <Badge
                      key={s}
                      className="bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-bold gap-1 px-2 py-0.5 rounded-lg flex items-center"
                    >
                      <span>🏷️ {label}</span>
                      <button
                        type="button"
                        onClick={() => toggleStatus(s)}
                        className="hover:text-rose-600 mr-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedDistricts([]);
                    setSelectedStatuses([]);
                  }}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline mr-auto flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> مسح الفلاتر
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── Scrollable Project Cards Grid ────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3.5 max-h-[52vh] custom-scrollbar bg-slate-50/60">
          {/* Quick Multi-Select Toolbar for Export */}
          {filteredProjects.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 border-b border-slate-200/80 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-bold hover:text-emerald-700 transition-colors">
                <input
                  type="checkbox"
                  checked={
                    filteredProjects.length > 0 &&
                    filteredProjects.every((p) => selectedExportIds.includes(p.id))
                  }
                  onChange={selectAllFilteredForExport}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>تحديد كافة المشاريع المعروضة للتصدير إلى Excel ({filteredProjects.length})</span>
              </label>

              {selectedExportIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[11px] py-0.5 px-2.5 rounded-full">
                    تم تحديد {selectedExportIds.length} مشروع للتصدير
                  </Badge>

                  <button
                    type="button"
                    onClick={() => setSelectedExportIds([])}
                    className="text-[11px] font-bold text-rose-600 hover:underline"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              )}
            </div>
          )}

          {filteredProjects.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-slate-200 p-8">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
                <Search className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">لم يتم العثور على مشاريع تطابق الفلاتر المحددة</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                يرجى تجربة تعديل مصطلح البحث أو إلغاء بعض الأقضية أو الحالات المحددة أعلاه.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedStatuses([]);
                  setSelectedDistricts([]);
                }}
                className="rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 text-xs mt-2"
              >
                إعادة ضبط الفلاتر
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.map((p) => {
                const isSelected = selectedProject?.id === p.id;
                const isExportChecked = selectedExportIds.includes(p.id);
                const variance = (p.actualProgress || 0) - (p.plannedProgress || 0);

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProject(p)}
                    onDoubleClick={() => handleConfirmSelection(p)}
                    className={`group relative text-right p-4.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-blue-50/80 border-2 border-blue-600 shadow-md shadow-blue-500/10 ring-2 ring-blue-500/20"
                        : "bg-white hover:bg-slate-50/80 border-slate-200 hover:border-blue-400 hover:shadow-md"
                    }`}
                  >
                    <div>
                      {/* Top Row: Badges, Excel Checkbox & Radio Check */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getStatusBadge(p.status)}
                          {p.contractNo && (
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200">
                              عقد: {p.contractNo}
                            </span>
                          )}
                          {p.referralNo && (
                            <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-200">
                              إحالة: {p.referralNo}
                            </span>
                          )}
                          {p.district && (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" /> {p.district}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Export Selection Checkbox */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleProjectForExport(p.id);
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 cursor-pointer transition-all ${
                              isExportChecked
                                ? "bg-emerald-600 text-white border-emerald-700 shadow-2xs"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isExportChecked}
                              onChange={() => {}}
                              className="w-3 h-3 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>{isExportChecked ? "تضمين بالإكسل ✓" : "تحديد للإكسل"}</span>
                          </div>

                          {/* Selected Radio Bubble */}
                          <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-xs shrink-0 transition-all ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-200"
                              : "border-2 border-slate-300 group-hover:border-blue-400 bg-white"
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      </div>

                      {/* Project Name */}
                      <h3 className={`text-sm font-black leading-snug line-clamp-2 transition-colors ${
                        isSelected ? "text-blue-900" : "text-slate-900 group-hover:text-blue-600"
                      }`}>
                        {p.name}
                      </h3>

                      {/* Technical Details Strip */}
                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="text-slate-700 text-[11px] truncate">
                            {p.residentEngineerName || "المهندس المقيم"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-slate-700 text-[11px] truncate">
                            {p.contractor || "الشركة المنفذة"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar & Contract Info */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-[11px]">الإنجاز الفعلي:</span>
                          <span className="font-black text-blue-700 text-xs">{p.actualProgress || 0}%</span>
                          <span className="text-slate-400 text-[10px]">(المخطط: {p.plannedProgress || 0}%)</span>
                        </div>

                        <div>
                          {variance >= 0 ? (
                            <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <TrendingUp className="w-3 h-3" /> +{variance}%
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 flex items-center gap-0.5 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              <TrendingDown className="w-3 h-3" /> {variance}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, p.actualProgress || 0))}%` }}
                        />
                      </div>

                      {/* Footer Row */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-bold text-slate-600">
                          {p.contractValue ? `${p.contractValue.toLocaleString("en-US")} د.ع` : "كلفة غير محددة"}
                        </span>

                        <span className={`inline-flex items-center gap-1 text-xs font-bold transition-all ${
                          isSelected ? "text-blue-700 font-black" : "text-slate-400 group-hover:text-blue-600"
                        }`}>
                          {isSelected ? "تم التحديد ✓" : "انقر للتحديد"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Bottom Confirmation Bar (تأكيد الاختيار) ───────────────── */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          {/* Selected Project Summary Pill */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {selectedProject ? (
              <div className="flex items-center gap-3 bg-blue-50/90 border border-blue-200 rounded-xl p-2 px-3.5 w-full sm:w-auto">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="truncate max-w-xs sm:max-w-md">
                  <span className="text-[10px] text-blue-700 font-bold block">المشروع المحدد:</span>
                  <span className="text-xs font-black text-slate-900 truncate block">{selectedProject.name}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>حدد مشروعاً من القائمة لتأكيد اختياره</span>
              </div>
            )}
          </div>

          {/* Action Buttons: Confirm, Export & Cancel */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
            {selectedExportIds.length > 0 ? (
              <Button
                type="button"
                onClick={() => handleExportProjectsToExcel()}
                className="gap-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 py-2.5 px-4"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>تصدير {selectedExportIds.length} مشاريع محددة لـ Excel</span>
              </Button>
            ) : selectedProject ? (
              <Button
                type="button"
                onClick={() => handleExportProjectsToExcel(selectedProject)}
                variant="outline"
                className="gap-1.5 rounded-xl text-xs font-bold border-emerald-300 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100 py-2.5 px-3.5"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>تصدير بيانات المشروع لـ Excel</span>
              </Button>
            ) : null}

            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="rounded-xl border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold py-2.5 px-4"
            >
              إلغاء
            </Button>

            <Button
              type="button"
              disabled={!selectedProject && selectedExportIds.length === 0}
              onClick={() => handleConfirmSelection()}
              className="gap-2 rounded-xl text-xs sm:text-sm font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 py-2.5 px-6 transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              <span>
                {selectedExportIds.length > 1
                  ? `اعتماد وإصدار التقارير لـ (${selectedExportIds.length}) مشاريع`
                  : "تأكيد الاختيار وبدء إعداد التقرير"}
              </span>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
