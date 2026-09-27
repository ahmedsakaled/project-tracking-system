import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { logActivity } from "./activity-logger";

export type Role = "admin" | "resident_engineer" | "directorate_manager" | "executive";

export interface AuthUser {
  id?: string;
  name: string;
  email: string;
  username?: string;
  role: Role;
  allowedPages?: string[];
  department?: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "مدير النظام",
  resident_engineer: "مهندس مقيم",
  directorate_manager: "مدير مديرية",
  executive: "إدارة عليا",
};

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (user: AuthUser) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "wms.auth.user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw) as AuthUser);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const signIn = (u: AuthUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
    try {
      logActivity({
        actionType: "auth_login",
        category: "system",
        title: `تسجيل دخول: ${u.name}`,
        description: `تم تسجيل الدخول بنجاح بحساب (${u.username || u.name}) برتبة (${ROLE_LABELS[u.role] || u.role})`,
        userName: u.name,
        userRole: ROLE_LABELS[u.role] || u.role,
        details: {
          "اسم المستخدم": u.username || "-",
          "الرتبة": ROLE_LABELS[u.role] || u.role,
          "البريد الإلكتروني": u.email || "-",
        },
      });
    } catch {}
  };

  const signOut = () => {
    if (user) {
      try {
        logActivity({
          actionType: "auth_logout",
          category: "system",
          title: `تسجيل خروج: ${user.name}`,
          description: `تم تسجيل الخروج من الجلسة الحالية (${ROLE_LABELS[user.role] || user.role})`,
          userName: user.name,
          userRole: ROLE_LABELS[user.role] || user.role,
        });
      } catch {}
    }
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

