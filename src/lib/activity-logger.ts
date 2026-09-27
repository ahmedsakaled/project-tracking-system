import { saveActivityToSupabase, getActivitiesFromSupabase } from "./supabase-db";

export type ActivityActionType =
  | "project_create"      // إضافة مشروع
  | "project_update"      // تعديل مشروع
  | "project_delete"      // حذف مشروع
  | "progress_update"     // تحديث نسب الإنجاز / تقرير ميداني
  | "monthly_report_add"  // إضافة تقرير شهري
  | "monthly_report_del"  // حذف تقرير شهري
  | "user_create"         // إضافة مستخدم
  | "user_update"         // تعديل مستخدم / صلاحيات
  | "user_delete"         // حذف مستخدم
  | "user_status"         // تفعيل / تعطيل حساب
  | "auth_login"          // تسجيل دخول
  | "auth_logout"         // تسجيل خروج
  | "gis_update"          // تحديث إحداثيات GIS
  | "change_order_add";   // إضافة أمر غيار

export type ActivityCategory = "projects" | "reports" | "users" | "system" | "gis";

export interface ActivityItem {
  id: string;
  actionType: ActivityActionType;
  category: ActivityCategory;
  title: string;
  description: string;
  userName: string;
  userRole?: string;
  userAvatar?: string;
  timestamp: string; // ISO string
  formattedDate?: string;
  details?: Record<string, any>;
}

const STORAGE_KEY = "wms_system_activities";
// علامة الإصدار الجديد لتصفير أي حركات قديمة سابقة والبدء بسجل حقيقي جديد كلياً
const PURGE_FLAG_KEY = "wms_activities_purged_v2";

/** Return category label in Arabic */
export function getActivityCategoryLabel(category: ActivityCategory): string {
  switch (category) {
    case "projects":
      return "المشاريع";
    case "reports":
      return "التقارير";
    case "users":
      return "المستخدمين";
    case "gis":
      return "الخرائط GIS";
    case "system":
    default:
      return "النظام والأمان";
  }
}

/** Format ISO timestamp to a clean Arabic date and time */
export function formatArabicDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    const months = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "م" : "ص";
    hours = hours % 12 || 12;

    return `${day} ${month} ${year} - ${hours}:${minutes} ${ampm}`;
  } catch {
    return isoString;
  }
}

/** Get relative time in Arabic (منذ دقيقتين، اليوم، إلخ) */
export function getRelativeTimeArabic(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return "الآن";

    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "الآن";

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
      if (diffMin === 1) return "منذ دقيقة";
      if (diffMin === 2) return "منذ دقيقتين";
      if (diffMin <= 10) return `منذ ${diffMin} دقائق`;
      return `منذ ${diffMin} دقيقة`;
    }

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) {
      if (diffHours === 1) return "منذ ساعة";
      if (diffHours === 2) return "منذ ساعتين";
      if (diffHours <= 10) return `منذ ${diffHours} ساعات`;
      return `منذ ${diffHours} ساعة`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "أمس";
    if (diffDays === 2) return "منذ يومين";
    if (diffDays <= 10) return `منذ ${diffDays} أيام`;
    return `منذ ${diffDays} يوماً`;
  } catch {
    return "سابقاً";
  }
}

/** Get current active user from localStorage or fallback */
function getCurrentUserInfo(): { name: string; role: string } {
  if (typeof window === "undefined") return { name: "مستخدم النظام", role: "مستخدم" };
  try {
    const raw = localStorage.getItem("wms.auth.user");
    if (raw) {
      const user = JSON.parse(raw);
      return {
        name: user.name || "مستخدم النظام",
        role: user.role === "admin" ? "مدير النظام" : "مهندس مقيم",
      };
    }
  } catch {}
  return { name: "مدير النظام", role: "مدير النظام" };
}

/** Retrieve all logged activities: strictly real data from current live usage only */
export function getStoredActivities(): ActivityItem[] {
  if (typeof window === "undefined") return [];
  try {
    // تصفير فوري لمرة واحدة لمسح أي بيانات تجريبية أو قديمة سابقة والبدء من الآن فصاعداً
    if (!localStorage.getItem(PURGE_FLAG_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      localStorage.setItem(PURGE_FLAG_KEY, "true");
      return [];
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    let parsed: ActivityItem[] = [];
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }

    if (!Array.isArray(parsed)) return [];

    // استبعاد أي سجلات قديمة أو وهمية والتأكد من أنها حركات فعلية جديدة
    const cleaned = parsed.filter(
      (item) =>
        item &&
        item.id &&
        !item.id.startsWith("act-init-") &&
        !item.id.startsWith("act-real-prj-") &&
        !item.id.startsWith("act-real-prog-") &&
        !item.id.startsWith("act-real-comp-") &&
        !item.id.startsWith("act-real-stop-") &&
        !item.title.includes("محطة ماء الرمادي الكبيرة") &&
        !item.title.includes("ماء الفلوجة الموحد") &&
        !item.title.includes("قطاع ماء هيت والبغدادي")
    );

    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }

    return cleaned.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch {
    return [];
  }
}

/** Record a new real activity in local storage, notify subscribers and sync to Supabase */
export function logActivity(
  data: Omit<ActivityItem, "id" | "timestamp"> & {
    userName?: string;
    userRole?: string;
    timestamp?: string;
  }
): ActivityItem {
  const currentUser = getCurrentUserInfo();
  const timestamp = data.timestamp || new Date().toISOString();

  const newActivity: ActivityItem = {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    actionType: data.actionType,
    category: data.category,
    title: data.title,
    description: data.description,
    userName: data.userName || currentUser.name,
    userRole: data.userRole || currentUser.role,
    userAvatar: data.userAvatar,
    timestamp,
    formattedDate: formatArabicDateTime(timestamp),
    details: data.details,
  };

  if (typeof window !== "undefined") {
    try {
      // التأكد من تفعيل علامة البداية النظيفة
      localStorage.setItem(PURGE_FLAG_KEY, "true");

      const current = getStoredActivities();
      // إضافة الحركة الحقيقية الجديدة في المقدمة
      const updated = [newActivity, ...current].slice(0, 500);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // إرسال إشعار فوري لكافة الصفحات لتحديث الواجهة فوراً
      window.dispatchEvent(new CustomEvent("activities_updated", { detail: newActivity }));
    } catch (err) {
      console.warn("Could not save activity to localStorage:", err);
    }
  }

  // مزامنة فورية مع سحابة Supabase في الخلفية
  try {
    saveActivityToSupabase(newActivity).catch((err) => {
      console.debug("Activity sync to Supabase:", err);
    });
  } catch {}

  return newActivity;
}

/** Sync activities with Supabase */
export async function syncActivitiesWithSupabase(): Promise<ActivityItem[]> {
  const local = getStoredActivities();
  try {
    const remote = await getActivitiesFromSupabase();
    if (remote && remote.length > 0) {
      const map = new Map<string, ActivityItem>();
      for (const item of local) {
        if (item && item.id && !item.id.startsWith("act-init-") && !item.id.startsWith("act-real-")) {
          map.set(item.id, item);
        }
      }
      for (const item of remote) {
        if (item && item.id && !item.id.startsWith("act-init-") && !item.id.startsWith("act-real-")) {
          map.set(item.id, item);
        }
      }
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged.slice(0, 500)));
        window.dispatchEvent(new CustomEvent("activities_updated"));
      }
      return merged;
    }
  } catch (err) {
    console.debug("Could not sync activities with Supabase:", err);
  }
  return local;
}

/** Clear all stored activities permanently */
export function clearStoredActivities(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  localStorage.setItem(PURGE_FLAG_KEY, "true");
  window.dispatchEvent(new CustomEvent("activities_updated"));
}
