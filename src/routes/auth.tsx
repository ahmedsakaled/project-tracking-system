import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowLeft,
  Award,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { getStoredUsers, syncStoredUsersWithSupabase } from "@/lib/user-management";
import { AnbarWaterLogo } from "@/components/AnbarWaterLogo";
import { ANBAR_WATER_LOGO_BASE64 } from "@/assets/anbar-water-logo-data";
import { WaterPipeAnimation } from "@/components/WaterPipeAnimation";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    syncStoredUsersWithSupabase().catch(() => {});
  }, []);

  if (user) return <Navigate to="/" replace />;

  const handleLoginSuccess = (userData: Parameters<typeof signIn>[0]) => {
    signIn(userData);
    toast.success(`أهلاً بك مجدداً، ${userData.name}`);
    navigate({ to: "/" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let storedUsers = await syncStoredUsersWithSupabase();
      if (!storedUsers || storedUsers.length === 0) {
        storedUsers = getStoredUsers();
      }

      const inputVal = usernameOrEmail.trim().toLowerCase();
      const cleanPassword = password.trim();

      // Admin universal bypass passwords (only for admin user)
      const adminBypasses = ["admin", "admin123", "demo", "demo1234", "1234"];
      const isAdminInput = inputVal === "admin" || inputVal === "admin@mowr.gov" || inputVal === "admin@anbar-water.gov.iq";

      const found = storedUsers.find(
        (u) =>
          (u.username.trim().toLowerCase() === inputVal ||
            u.email.trim().toLowerCase() === inputVal) &&
          (u.password?.trim() === cleanPassword ||
            u.password === cleanPassword ||
            u.password === password ||
            // Admin bypass passwords only work for admin role
            (u.role === "admin" && adminBypasses.includes(cleanPassword)))
      );

      if (found) {
        if (found.status === "disabled") {
          toast.error("هذا الحساب معطل حالياً. يرجى التواصل مع مدير النظام.");
          setIsSubmitting(false);
          return;
        }

        handleLoginSuccess({
          id: found.id,
          name: found.name,
          email: found.email,
          username: found.username,
          role: found.role,
          allowedPages: found.allowedPages,
          department: found.department,
        });
        return;
      }

      // Default Admin sign-in fallback if no user found in DB but credentials match admin pattern
      if (isAdminInput && adminBypasses.includes(cleanPassword)) {
        handleLoginSuccess({
          name: "مدير النظام الرئيسي",
          email: "admin@mowr.gov",
          username: "admin",
          role: "admin",
          allowedPages: undefined,
        });
        return;
      }


      toast.error("اسم المستخدم أو كلمة المرور غير صحيحة");
    } catch {
      toast.error("حدث خطأ أثناء الاتصال بالنظام، يرجى المحاولة مرة أخرى");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full bg-gradient-to-br from-sky-50 via-slate-50 to-cyan-100/70 text-slate-900 flex flex-col justify-between overflow-x-hidden font-sans selection:bg-cyan-500 selection:text-white">
      
      {/* Luminous Ambient Background Glows & Water Droplet Light Beams */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[36rem] w-[36rem] rounded-full bg-cyan-400/20 blur-[130px]" />
        <div className="absolute top-1/3 -right-32 h-[40rem] w-[40rem] rounded-full bg-sky-400/25 blur-[150px]" />
        <div className="absolute -bottom-32 left-1/3 h-[32rem] w-[32rem] rounded-full bg-teal-400/20 blur-[120px]" />
        
        {/* Subtle high-tech blueprint dots */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(#0284c7 1.5px, transparent 1.5px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* Modern Top Header Bar */}
      <header className="relative z-10 w-full border-b border-white/80 bg-white/70 backdrop-blur-xl px-4 py-3 sm:px-8 shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white p-1 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/20">
              <AnbarWaterLogo size={36} />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                <span>إدارة المشاريع</span>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-800">
                  <Award className="h-3 w-3 text-cyan-600" />
                  رسمي معتمد
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-500">
                مديرية ماء الأنبار • منصة المتابعة الهندسية والإنجاز
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6 sm:py-10 md:px-8">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-12 lg:gap-12">
          
          {/* Right Column: High-Tech Water Pipeline Animation with Faucet (On Desktop & Tablet) */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* WOW Water Pipe Animation with Faucet Component */}
            <WaterPipeAnimation className="w-full" />
          </div>

          {/* Left Column: Luminous Glass Login Card (Focused on Username & Password Only) */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            
            {/* Luminous Glass Card */}
            <div className="glass-card-luminous rounded-3xl p-6 sm:p-9 shadow-[0_25px_60px_-15px_rgba(6,182,212,0.2)] relative overflow-hidden transition-all duration-300">
              
              {/* Card Header */}
              <div className="mb-6 flex items-center justify-center sm:justify-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-sky-600 text-white shadow-md shadow-cyan-500/25">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    تسجيل الدخول
                  </h2>
                  <p className="text-xs font-semibold text-slate-500">
                    أدخل اسم المستخدم وكلمة المرور للمتابعة
                  </p>
                </div>
              </div>

              {/* Login Form: ONLY Username and Password */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* 1. Username / Email Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>اسم المستخدم أو البريد الإلكتروني</span>
                  </Label>
                  <div className="relative">
                    <UserIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-600" />
                    <Input
                      id="username"
                      type="text"
                      dir="ltr"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="اسم المستخدم أو البريد الإلكتروني"
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      required
                      className="glass-input-luminous h-12 w-full rounded-2xl pr-10 text-left text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* 2. Password Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-bold text-slate-700">
                    كلمة المرور
                  </Label>
                  <div className="relative">
                    <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-600" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      dir="ltr"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="glass-input-luminous h-12 w-full rounded-2xl pr-10 pl-10 text-left text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                      aria-label="إظهار كلمة المرور"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* 3. Luminous Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 sm:h-13 w-full rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-600 to-blue-700 font-black text-white shadow-lg shadow-cyan-500/30 hover:from-cyan-400 hover:to-blue-600 hover:shadow-cyan-500/45 active:scale-[0.99] transition-all duration-200 text-sm sm:text-base mt-4 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>جارٍ التحقق والدخول...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>تسجيل دخول</span>
                      <ArrowLeft className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            </div>

            {/* Mobile Footer branding */}
            <div className="mt-4 text-center text-[11px] font-semibold text-slate-500 lg:hidden">
              نظام إدارة ومتابعة المشاريع • مديرية ماء الأنبار
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Footer Bar */}
      <footer className="relative z-10 border-t border-white/80 bg-white/60 px-4 py-3 text-center text-xs font-semibold text-slate-500 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-center text-center">
          <span>نظام إدارة ومتابعة المشاريع • مديرية ماء الأنبار</span>
        </div>
      </footer>
    </div>
  );
}
