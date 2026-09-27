export type ProjectStatus = "ongoing" | "delayed" | "stopped" | "completed" | "not_started";

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  ongoing: "قيد التنفيذ",
  delayed: "متلكئ",
  stopped: "متلكئ (متوقف)",
  completed: "منجز",
  not_started: "لم يبدأ",
};

export interface AnbarDistrict {
  id: string;
  name: string;
  fullName: string;
  lat: number;
  lng: number;
  subDistricts?: string[];
}

export const ANBAR_DISTRICTS: AnbarDistrict[] = [
  { id: "ramadi", name: "الرمادي", fullName: "الأنبار / الرمادي", lat: 33.4248, lng: 43.3023, subDistricts: ["مركز الرمادي", "السجارية", "الحمضية", "زنكورة", "الوفاء", "العوفية", "القطنية"] },
  { id: "fallujah", name: "الفلوجة", fullName: "الأنبار / الفلوجة", lat: 33.3522, lng: 43.7844, subDistricts: ["مركز الفلوجة", "الصقلاوية", "النساف", "النعيمية", "الهياكل"] },
  { id: "hit", name: "هيت", fullName: "الأنبار / هيت", lat: 33.6417, lng: 42.8253, subDistricts: ["مركز هيت", "البغدادي", "كبيسة", "الفرات"] },
  { id: "karmah", name: "الكرمة", fullName: "الأنبار / الكرمة", lat: 33.4561, lng: 43.9167, subDistricts: ["مركز الكرمة", "الخيرات", "الجزيرة", "الرشاد"] },
  { id: "habbaniyah", name: "الحبانية", fullName: "الأنبار / الحبانية", lat: 33.3167, lng: 43.5833, subDistricts: ["مركز الحبانية", "الخالدية", "العنكور", "المنطقة السياحية"] },
  { id: "amiriyah_samood", name: "عامرية الصمود", fullName: "الأنبار / عامرية الصمود", lat: 33.1811, lng: 43.8667, subDistricts: ["مركز العامرية", "زوبع", "البوهوى"] },
  { id: "haditha", name: "حديثة", fullName: "الأنبار / حديثة", lat: 34.1378, lng: 42.3781, subDistricts: ["مركز حديثة", "حقلانية", "بروانة", "آلوس"] },
  { id: "alqaim", name: "القائم", fullName: "الأنبار / القائم", lat: 34.3758, lng: 41.0119, subDistricts: ["مركز القائم", "العبيدي", "الكرابلة", "الرمانة"] },
  { id: "ana", name: "عنه", fullName: "الأنبار / عنه", lat: 34.3711, lng: 41.9467, subDistricts: ["مركز عنه", "الريحانة"] },
  { id: "rawa", name: "راوة", fullName: "الأنبار / راوة", lat: 34.4811, lng: 41.9197, subDistricts: ["مركز راوة", "الزاوية"] },
  { id: "khaldiyah", name: "الخالدية", fullName: "الأنبار / الخالدية", lat: 33.3811, lng: 43.5167, subDistricts: ["مركز الخالدية", "الحبانية", "أبو فليس"] },
  { id: "baghdadi", name: "البغدادي", fullName: "الأنبار / البغدادي", lat: 33.8500, lng: 42.5500, subDistricts: ["مركز البغدادي", "الجبة", "ماوس"] },
  { id: "karabla", name: "الكرابلة", fullName: "الأنبار / الكرابلة", lat: 34.3833, lng: 41.0667, subDistricts: ["مركز الكرابلة"] },
  { id: "nukhaib", name: "النخيب", fullName: "الأنبار / النخيب", lat: 32.0500, lng: 42.2500, subDistricts: ["مركز النخيب"] },
  { id: "rutba", name: "الرطبة", fullName: "الأنبار / الرطبة", lat: 33.0381, lng: 40.2847, subDistricts: ["مركز الرطبة", "الوليد", "عكاشات"] },
];

export interface ChangeOrderItem {
  id?: string;
  orderNo?: string; // رقم أمر الغيار (مثل: أمر غيار رقم 1)
  orderDate?: string; // تاريخ أمر الغيار
  amount?: number; // مبلغ أمر الغيار
  currency?: "IQD" | "USD"; // عملة أمر الغيار (د.ع أو $)
  additionalDays?: number | string; // المدة الإضافية بأمر الغيار (أيام أو نص)
  notes?: string; // تفاصيل أو أسباب أمر الغيار
}

export interface Project {
  id: string;
  name: string;
  location: string;
  district?: string; // القضاء
  subDistrict?: string; // الناحية
  contractor: string;
  contractNo: string;
  contractDate?: string; // تاريخ العقد (اختياري)
  contractValue: number; // قيمة العقد
  currency?: "IQD" | "USD"; // عملة المشروع (د.ع أو $)
  durationDays: number;
  startDate: string;
  plannedEndDate: string;
  expectedEndDate: string;
  plannedProgress: number;
  actualProgress: number;
  status: ProjectStatus;
  lat: number;
  lng: number;
  type: "investment" | "non_investment" | "water_tank" | "well" | "pipeline" | "treatment" | "building" | string;
  
  fundingSource?: string; // الجهة الممولة للمشروع
  centerName?: string; // اسم المركز
  referralMethod?: string; // طريقة الإحالة (مناقصة عامة، دعوة مباشرة، تنفيذ مباشر)
  referralNo?: string; // رقم الإحالة
  referralDate?: string; // تاريخ الإحالة
  residentEngineerName?: string; // اسم المهندس المقيم
  residentEngineerPhone?: string; // رقم هاتف المهندس المقيم
  selectedSupervisors?: string[]; // المشرفون المرافقون للمهندس
  initialHandoverOrderNo?: string; // رقم الأمر الإداري للاستلام الأولي
  initialHandoverOrderDate?: string; // تاريخ الأمر الإداري للاستلام الأولي
  initialHandoverDate?: string; // تاريخ الاستلام الأولي
  initialHandoverCommittee?: string[]; // لجنة الاستلام الأولي (3 أشخاص)
  initialHandoverNotes?: string; // ملاحظات وإجراءات الاستلام الأولي
  finalHandoverOrderNo?: string; // رقم الأمر الإداري للاستلام النهائي
  finalHandoverOrderDate?: string; // تاريخ الأمر الإداري للاستلام النهائي
  finalHandoverDate?: string; // تاريخ الاستلام النهائي
  finalHandoverCommittee?: string[]; // لجنة الاستلام النهائي (3 أشخاص)
  finalHandoverNotes?: string; // ملاحظات وإجراءات الاستلام النهائي
  contractType?: string; // نوع العقد
  actualStartDate?: string; // تاريخ المباشرة الفعلي
  resumeStartDate?: string; // تاريخ المباشرة بعد الاستئناف
  suspensionDate?: string; // تاريخ الإيقاف
  suspensionDuration?: string; // مدة التوقف
  actualExecutionDuration?: string; // مدة التنفيذ الفعلية
  additionalDuration?: string; // المدة الإضافية (المدد الأصلية + أوامر الغيار والاعمال)
  contractDurationAfterResume?: string; // مدة العقد بعد الاستئناف
  contractualCompletionDate?: string; // تاريخ الإنجاز التعاقدي
  completionDateAfterAdditional?: string; // تاريخ الإنجاز بعد المدد الإضافية
  remainingDurationFromResume?: string; // المدة المتبقية اعتباراً من تاريخ الاستئناف
  remainingDurationFromReport?: string; // المدة المتبقية اعتباراً من تاريخ التقرير
  delayReasons?: string; // أسباب التأخير
  changeOrdersCount?: number; // عدد أوامر الغيار
  changeOrderNoAndDate?: string; // رقم وتاريخ أمر الغيار
  changeOrderSingleAmount?: number; // مبلغ أمر الغيار
  changeOrdersTotalAmount?: number; // مجموع مبالغ أوامر الغيار
  changeOrdersList?: ChangeOrderItem[]; // قائمة أوامر الغيار المتعددة بالتفصيل (رقم، تاريخ، مبلغ)
  workCost?: number; // كلفة العمل (الأعمال + أوامر الغيار)
  disbursedWork?: number; // المصروف الكلي للأعمال المنجزة من مستخلصات العقد
  totalDisbursed?: number; // المصروف الكلي للمشروع
  estimatedCost?: number; // الكلفة التقديرية
  amount?: number; // المبلغ
  localStaffCount?: number; // كادر محلي
  foreignStaffCount?: number; // كادر أجنبي
  executedWorksPeriod?: string; // الأعمال التي تم تنفيذها هذه الفترة
  deliveredEquipmentPeriod?: string; // المعدات والأجهزة الواصلة خلال هذه الفترة
  notes?: string; // الملاحظات
  problemsObstaclesSolutions?: string; // المشاكل والمعوقات والحلول المقترحة
  suspensionDatesReasons?: string; // تاريخ التوقف وأسبابها
  residentEngineerOpinion?: string; // رأي دائرة المهندس المقيم حول أداء المقاول
}

export const PROJECTS: Project[] = [];

export function getStoredProjects(): Project[] {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("projects");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (p) =>
              p &&
              p.id &&
              !p.id.startsWith("PRJ-2024-001") &&
              !p.id.startsWith("PRJ-2024-002") &&
              !p.id.startsWith("PRJ-2023-014") &&
              !p.id.startsWith("PRJ-2023-009") &&
              !p.id.startsWith("PRJ-2022-031") &&
              !p.id.startsWith("PRJ-2024-018") &&
              !p.id.startsWith("PRJ-2025-005") &&
              !p.id.startsWith("PRJ-2025-089") &&
              !(p.location && (p.location.includes("بغداد") || p.location.includes("كربلاء") || p.location.includes("البصرة")))
          );
          if (cleaned.length !== parsed.length) {
            localStorage.setItem("projects", JSON.stringify(cleaned));
          }
          return cleaned.map((p) => ({
            ...p,
            name: p.name || "",
            location: p.location || "",
            district: p.district || "",
            contractNo: p.contractNo || "",
            contractor: p.contractor || "",
            fundingSource: p.fundingSource || "",
            centerName: p.centerName || "",
            residentEngineerPhone: p.residentEngineerPhone || "",
            selectedSupervisors: Array.isArray(p.selectedSupervisors) ? p.selectedSupervisors : [],
          }));
        }
      } catch (e) {
        return [];
      }
    }
  }
  return [];
}

export function saveStoredProjects(projects: Project[], silent = false) {
  if (typeof window !== "undefined") {
    localStorage.setItem("projects", JSON.stringify(projects));
    // Only dispatch if not silent — prevents infinite loops when called from load functions
    if (!silent) {
      window.dispatchEvent(new Event("projects_updated"));
    }
  }
}

export function projectStats() {
  const list = getStoredProjects();
  if (list.length === 0) {
    return {
      total: 0,
      delayed: 0,
      stopped: 0,
      completed: 0,
      ongoing: 0,
      not_started: 0,
      avgProgress: 0,
      totalValue: 0,
    };
  }
  return {
    total: list.length,
    delayed: list.filter((p) => p.status === "delayed").length,
    stopped: list.filter((p) => p.status === "stopped").length,
    completed: list.filter((p) => p.status === "completed").length,
    ongoing: list.filter((p) => p.status === "ongoing").length,
    not_started: list.filter((p) => p.status === "not_started").length,
    avgProgress: Math.round(
      list.reduce((s, p) => s + p.actualProgress, 0) / list.length,
    ),
    totalValue: list.reduce((s, p) => s + p.contractValue, 0),
  };
}

export const PERIODIC_PROGRESS = {
  weekly: [],
  monthly: [],
  quarterly: [],
  yearly: [],
};

export const MONTHLY_PROGRESS: { month: string; planned: number; actual: number }[] = [];

export interface RecentActivity {
  id: string;
  type: "create" | "update_progress" | "status_change" | "add_user" | "upload_report";
  title: string;
  description: string;
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  timestamp: string;
}

export const RECENT_ACTIVITIES: RecentActivity[] = [];
export const DEVIATIONS: any[] = [];
export const CHANGE_ORDERS: any[] = [];
export const MATERIALS: any[] = [];

/** Returns symbol ($ or د.ع) for currency type */
export function getCurrencySymbol(currency?: string): string {
  return currency === "USD" ? "$" : "د.ع";
}

/** Formats a numeric amount with commas and appends/prepends currency symbol */
export function formatAmountWithCurrency(amount: number | string | undefined | null, currency?: string): string {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString("en-US");
  return currency === "USD" ? `${formatted} $` : `${formatted} د.ع`;
}
export const ARCHIVE_DOCS: any[] = [];
