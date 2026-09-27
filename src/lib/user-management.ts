export type Role = "admin" | "resident_engineer" | "directorate_manager" | "executive";

export interface SystemPage {
  id: string;
  url: string;
  title: string;
  description: string;
  category: "أساسي" | "مشاريع" | "تقارير" | "أدوات وإدارة";
}

export const SYSTEM_PAGES: SystemPage[] = [
  { id: "dashboard", url: "/", title: "لوحة التحكم", description: "المؤشرات والأرقام والإحصائيات الرئيسية", category: "أساسي" },
  { id: "projects", url: "/projects", title: "إدارة المشاريع", description: "عرض وإدارة كافة المشاريع ومتابعة تقارير الإنجاز", category: "مشاريع" },
  { id: "projects-completed", url: "/projects-completed", title: "مشاريع المنفذة", description: "أرشيف وسجلات المشاريع المنجزة", category: "مشاريع" },
  { id: "reports", url: "/reports", title: "التقارير الشهرية", description: "إصدار وتصدير التقارير الشهرية الرسمية", category: "تقارير" },
  { id: "reports-pro", url: "/reports-pro", title: "تقارير Pro", description: "تقارير متقدمة سهلة وواضحة مع مشاركة وتصدير لكل مشروع", category: "تقارير" },
  { id: "gis", url: "/gis", title: "الخرائط GIS", description: "التوزيع الجغرافي للمشاريع على الخارطة", category: "أدوات وإدارة" },
  { id: "logs", url: "/logs", title: "سجل", description: "متابعة وعرض كافة الحركات والإضافات والعمليات داخل النظام", category: "أدوات وإدارة" },
  { id: "admin", url: "/admin", title: "المستخدمون", description: "إنشاء وتعديل الحسابات والصلاحيات", category: "أدوات وإدارة" },
];

export interface ManagedUser {
  id: string;
  name: string;
  username: string;
  email: string;
  password?: string;
  role: Role;
  status: "active" | "disabled";
  allowedPages: string[]; // List of page URLs (e.g. ["/", "/projects", "/gis"])
  phone?: string;
  department?: string;
  createdAt: string;
  lastLogin?: string;
}

const STORAGE_KEY = "wms_user_accounts";

export const DEFAULT_USERS: ManagedUser[] = [
  {
    id: "usr-admin-1",
    name: "مدير النظام",
    username: "admin",
    email: "admin@anbar-water.gov.iq",
    password: "admin",
    role: "admin",
    status: "active",
    allowedPages: SYSTEM_PAGES.map((p) => p.url),
    department: "مديرية ماء محافظة الأنبار",
    createdAt: new Date().toISOString(),
  },
];

import { getUsersFromSupabase, saveUserToSupabase, deleteUserFromSupabase } from "./supabase-db";
import { logActivity } from "./activity-logger";

export function getStoredUsers(): ManagedUser[] {
  if (typeof window === "undefined") return DEFAULT_USERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw) as ManagedUser[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    // Clean out any legacy demo mock users
    const cleaned = parsed.filter(
      (u) =>
        u &&
        u.id &&
        u.id !== "usr-dir-1" &&
        u.id !== "usr-eng-1" &&
        u.id !== "usr-exec-1" &&
        u.username !== "sara.dir" &&
        u.username !== "ahmed.eng" &&
        u.username !== "k.hussaini"
    );
    if (cleaned.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return DEFAULT_USERS;
  }
}

/** Fetch users from Supabase and update local storage as the single source of truth */
export async function syncStoredUsersWithSupabase(): Promise<ManagedUser[]> {
  const local = getStoredUsers();
  try {
    const remote = await getUsersFromSupabase();
    if (remote && remote.length > 0) {
      // Create a map to merge local and remote users by ID or username
      const map = new Map<string, ManagedUser>();
      for (const u of local) {
        if (u && u.id) map.set(u.id, u);
      }
      for (const u of remote) {
        if (u && u.id) map.set(u.id, u);
      }
      const merged = Array.from(map.values());
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }

      // Upload any local users missing from remote database to Supabase
      const remoteIds = new Set(remote.map((r) => r.id));
      for (const u of local) {
        if (!remoteIds.has(u.id)) {
          await saveUserToSupabase(u);
        }
      }
      return merged;
    } else if (local.length > 0) {
      // If remote database is empty, seed local default users to Supabase
      for (const u of local) {
        await saveUserToSupabase(u);
      }
    }
  } catch (err) {
    console.warn("Could not sync users with Supabase:", err);
  }
  return local;
}

export function saveUsers(users: ManagedUser[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  window.dispatchEvent(new CustomEvent("users_updated"));
}

export async function saveUser(user: ManagedUser): Promise<ManagedUser[]> {
  const current = getStoredUsers();
  const index = current.findIndex((u) => u.id === user.id);
  const isNew = index < 0;
  let updated: ManagedUser[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = user;
  } else {
    updated = [user, ...current];
  }
  saveUsers(updated);

  try {
    logActivity({
      actionType: isNew ? "user_create" : "user_update",
      category: "users",
      title: isNew ? `إضافة مستخدم جديد: ${user.name}` : `تعديل بيانات المستخدم: ${user.name}`,
      description: isNew
        ? `تم إنشاء حساب جديد باسم مستخدم (${user.username}) ورتبة (${user.role === "admin" ? "مدير نظام" : "مهندس مقيم"})`
        : `تم تحديث بيانات وصلاحيات الحساب (${user.username})`,
      details: {
        "اسم المستخدم": user.username,
        "الاسم الكامل": user.name,
        "الدور": user.role,
        "الحالة": user.status === "active" ? "نشط" : "معطل",
      },
    });
  } catch {}

  // Persist to Supabase
  await saveUserToSupabase(user);
  return updated;
}

export async function deleteUser(id: string): Promise<ManagedUser[]> {
  const current = getStoredUsers();
  const deletedUser = current.find((u) => u.id === id);
  const updated = current.filter((u) => u.id !== id);
  saveUsers(updated);

  try {
    logActivity({
      actionType: "user_delete",
      category: "users",
      title: `حذف مستخدم: ${deletedUser?.name || id}`,
      description: `تم حذف حساب المستخدم (${deletedUser?.username || id}) نهائياً من النظام`,
      details: {
        "معرف المستخدم": id,
        "اسم الحساب": deletedUser?.username,
      },
    });
  } catch {}

  // Persist to Supabase
  await deleteUserFromSupabase(id);
  return updated;
}

export async function toggleUserStatus(id: string): Promise<ManagedUser[]> {
  const current = getStoredUsers();
  let targetUser: ManagedUser | null = null;
  const updated = current.map((u) => {
    if (u.id === id) {
      const updatedU = { ...u, status: u.status === "active" ? ("disabled" as const) : ("active" as const) };
      targetUser = updatedU;
      return updatedU;
    }
    return u;
  });
  saveUsers(updated);

  if (targetUser) {
    try {
      const activeStatus = (targetUser as ManagedUser).status === "active";
      logActivity({
        actionType: "user_status",
        category: "users",
        title: `${activeStatus ? "تفعيل" : "تعطيل"} حساب: ${(targetUser as ManagedUser).name}`,
        description: `تم ${activeStatus ? "تفعيل وتمكين" : "تعطيل وإيقاف"} حساب المستخدم (${(targetUser as ManagedUser).username})`,
        details: {
          "اسم المستخدم": (targetUser as ManagedUser).username,
          "الحالة الجديدة": activeStatus ? "نشط" : "معطل",
        },
      });
    } catch {}

    await saveUserToSupabase(targetUser);
  }
  return updated;
}
