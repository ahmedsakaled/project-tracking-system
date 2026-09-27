import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  KeyRound,
  Lock,
  Unlock,
  Trash2,
  Edit,
  Check,
  Search,
  CheckSquare,
  Square,
  ShieldAlert,
  Building2,
  User,
  Eye,
  EyeOff,
  Filter,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ROLE_LABELS, type Role } from "@/lib/auth-context";
import {
  SYSTEM_PAGES,
  getStoredUsers,
  syncStoredUsersWithSupabase,
  saveUser,
  deleteUser,
  toggleUserStatus,
  type ManagedUser,
  type SystemPage,
} from "@/lib/user-management";
import { getSystemSettings, saveSystemSettings } from "@/lib/system-settings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin")({
  component: AdminPage,
});

function AdminPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // System Display Settings State
  const [showContractValueCompleted, setShowContractValueCompleted] = useState(
    () => getSystemSettings().showContractValueInCompletedProjects
  );
  const [showContractValueOngoing, setShowContractValueOngoing] = useState(
    () => getSystemSettings().showContractValueInOngoingProjects ?? true
  );

  const handleToggleContractValueCompleted = () => {
    const newValue = !showContractValueCompleted;
    setShowContractValueCompleted(newValue);
    saveSystemSettings({ showContractValueInCompletedProjects: newValue });
    toast.success(
      newValue
        ? "تم تفعيل إظهار قيمة العقد (د.ع) في المشاريع المنفذة بنجاح"
        : "تم إخفاء قيمة العقد (د.ع) من المشاريع المنفذة بنجاح"
    );
  };

  const handleToggleContractValueOngoing = () => {
    const newValue = !showContractValueOngoing;
    setShowContractValueOngoing(newValue);
    saveSystemSettings({ showContractValueInOngoingProjects: newValue });
    toast.success(
      newValue
        ? "تم تفعيل إظهار قيمة العقد (د.ع) في إدارة المشاريع بنجاح"
        : "تم إخفاء قيمة العقد (د.ع) من إدارة المشاريع بنجاح"
    );
  };

  // Modal states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>("resident_engineer");
  const [department, setDepartment] = useState("");
  const [allowedPages, setAllowedPages] = useState<string[]>([]);

  // Password reset modal state
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Delete modal state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    window.addEventListener("users_updated", loadUsers);
    return () => {
      window.removeEventListener("users_updated", loadUsers);
    };
  }, []);

  const loadUsers = async () => {
    const list = getStoredUsers();
    setUsers(list);
    const remoteUsers = await syncStoredUsersWithSupabase();
    if (remoteUsers && remoteUsers.length > 0) {
      setUsers(remoteUsers);
    }
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName("");
    setUsername("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setRole("resident_engineer");
    setDepartment("");
    // Default allowed pages for resident engineer
    setAllowedPages(["/", "/projects", "/reports"]);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (u: ManagedUser) => {
    setEditingUser(u);
    setName(u.name);
    setUsername(u.username);
    setEmail(u.email);
    setPassword("");
    setShowPassword(false);
    setRole(u.role);
    setDepartment(u.department || "");
    setAllowedPages(u.allowedPages || SYSTEM_PAGES.map((p) => p.url));
    setIsAddEditOpen(true);
  };

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    if (newRole === "admin") {
      setAllowedPages(SYSTEM_PAGES.map((p) => p.url));
    } else if (newRole === "directorate_manager") {
      setAllowedPages(["/", "/projects", "/projects-completed", "/reports", "/gis"]);
    } else if (newRole === "resident_engineer") {
      setAllowedPages(["/", "/projects", "/reports"]);
    } else {
      setAllowedPages(["/", "/projects", "/reports", "/gis"]);
    }
  };

  const togglePagePermission = (url: string) => {
    setAllowedPages((prev) =>
      prev.includes(url) ? prev.filter((p) => p !== url) : [...prev, url]
    );
  };

  const handleSelectAllPages = () => {
    setAllowedPages(SYSTEM_PAGES.map((p) => p.url));
  };

  const handleDeselectAllPages = () => {
    setAllowedPages(["/"]); // keep dashboard
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !username.trim()) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (!editingUser && !password.trim()) {
      toast.error("يرجى إدخال كلمة المرور للحساب الجديد");
      return;
    }

    const newUser: ManagedUser = {
      id: editingUser ? editingUser.id : `usr-${Date.now()}`,
      name: name.trim(),
      username: username.trim().toLowerCase(),
      email: editingUser?.email || `${username.trim().toLowerCase()}@anbar-water.gov.iq`,
      password: password.trim() || (editingUser ? editingUser.password : "123456"),
      role,
      status: editingUser ? editingUser.status : "active",
      allowedPages,
      department: department.trim(),
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString(),
    };

    await saveUser(newUser);
    toast.success(editingUser ? "تم تحديث الحساب وصلاحيات الصفحات بنجاح" : "تم إنشاء الحساب الجديد بنجاح");
    setIsAddEditOpen(false);
    await loadUsers();
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    await toggleUserStatus(id);
    toast.success(currentStatus === "active" ? "تم تعطيل الحساب بنجاح" : "تم تنشيط الحساب بنجاح");
    await loadUsers();
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !newPassword.trim()) {
      toast.error("يرجى كتابة كلمة المرور الجديدة");
      return;
    }
    const updated = { ...resetTargetUser, password: newPassword.trim() };
    await saveUser(updated);
    toast.success(`تم تغيير كلمة المرور للحساب ${resetTargetUser.name} بنجاح`);
    setIsResetPasswordOpen(false);
    setNewPassword("");
    await loadUsers();
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId) {
      await deleteUser(deleteTargetId);
      toast.success("تم حذف الحساب بنجاح");
      setDeleteTargetId(null);
      await loadUsers();
    }
  };

  // Filtered users list
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === "all" || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const activeCount = users.filter((u) => u.status === "active").length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const engineerCount = users.filter((u) => u.role === "resident_engineer").length;

  // Pages categorized
  const pageCategories = ["أساسي", "مشاريع", "تقارير", "أدوات وإدارة"] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            إدارة المستخدمين وصلاحيات الوصول
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            إنشاء حسابات المستخدمين الجدد، التحكم بكلمات المرور، وتحديد الصفحات المسموح لكل شخص بالوصول إليها.
          </p>
        </div>

        <Button onClick={handleOpenAdd} size="lg" className="gap-2 shadow-md">
          <UserPlus className="h-5 w-5" />
          إضافة حساب جديد
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي الحسابات
            </CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground mt-1">مستخدمون مسجلون في النظام</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              الحسابات النشطة
            </CardTitle>
            <Unlock className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              حسابات تعمل وبإمكانها الدخول
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              مدراء النظام
            </CardTitle>
            <ShieldCheck className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{adminCount}</div>
            <p className="text-xs text-muted-foreground mt-1">صلاحية إدارة كاملة للنظام</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              المهندسون المقيمون
            </CardTitle>
            <Building2 className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{engineerCount}</div>
            <p className="text-xs text-muted-foreground mt-1">متابعة ميدانية وتقارير</p>
          </CardContent>
        </Card>
      </div>

      {/* System Display Settings Card */}
      <Card className="bespoke-card border-primary/30 bg-gradient-to-r from-background via-muted/40 to-background shadow-xs">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-black text-foreground flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <span>إعدادات عرض قيم العقود في جداول وبطاقات النظام</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mr-9">
            تستطيع التحكم بإظهار أو إخفاء مبالغ وقيم العقود (د.ع) بشكل منفصل في كل قسم من أقسام المنظومة.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Ongoing Projects Control */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-background border border-border/80 shadow-2xs">
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <span>قيمة العقد في (إدارة المشاريع والمشاريع المستمرة)</span>
              </h4>
              <p className="text-xs text-muted-foreground">
                التحكم بالعمود والمبلغ المعروض في جداول وبطاقات صفحة إدارة المشاريع.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleToggleContractValueOngoing}
              variant="outline"
              className={cn(
                "h-10 px-4 rounded-xl text-xs font-black gap-2 transition-all shrink-0 cursor-pointer shadow-2xs",
                showContractValueOngoing
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
                  : "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100"
              )}
            >
              {showContractValueOngoing ? (
                <>
                  <Eye className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>إظهار قيمة العقد: مفعل</span>
                  <Badge className="bg-emerald-600 text-white font-bold text-[10px] mr-1">ظاهر</Badge>
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <span>إخفاء قيمة العقد: مفعل</span>
                  <Badge className="bg-rose-600 text-white font-bold text-[10px] mr-1">مخفي</Badge>
                </>
              )}
            </Button>
          </div>

          {/* Completed Projects Control */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-background border border-border/80 shadow-2xs">
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <span>قيمة العقد في (المشاريع المنفذة)</span>
              </h4>
              <p className="text-xs text-muted-foreground">
                التحكم بالعمود والمبلغ المعروض في أرشفة وجداول المشاريع المكتملة.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleToggleContractValueCompleted}
              variant="outline"
              className={cn(
                "h-10 px-4 rounded-xl text-xs font-black gap-2 transition-all shrink-0 cursor-pointer shadow-2xs",
                showContractValueCompleted
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
                  : "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100"
              )}
            >
              {showContractValueCompleted ? (
                <>
                  <Eye className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>إظهار قيمة العقد: مفعل</span>
                  <Badge className="bg-emerald-600 text-white font-bold text-[10px] mr-1">ظاهر</Badge>
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <span>إخفاء قيمة العقد: مفعل</span>
                  <Badge className="bg-rose-600 text-white font-bold text-[10px] mr-1">مخفي</Badge>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بالاسم، اسم المستخدم، البريد، أو القسم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>

            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="flex h-9 w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer font-bold text-foreground"
              >
                <option value="all">جميع الأدوار</option>
                <option value="admin">مدير النظام</option>
                <option value="directorate_manager">مدير مديرية</option>
                <option value="resident_engineer">مهندس مقيم</option>
                <option value="executive">إدارة عليا</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredUsers.map((u) => {
          const isUserAdmin = u.role === "admin";
          const allowedCount = u.allowedPages?.length || SYSTEM_PAGES.length;

          return (
            <Card key={u.id} className="relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className={`h-2 w-full ${u.status === "active" ? "bg-emerald-500" : "bg-destructive"}`} />

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {u.name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <CardTitle className="text-base font-bold">{u.name}</CardTitle>
                      <CardDescription className="text-xs dir-ltr text-right">
                        @{u.username}
                      </CardDescription>
                    </div>
                  </div>

                  <Badge
                    variant={
                      u.role === "admin"
                        ? "destructive"
                        : u.role === "directorate_manager"
                        ? "default"
                        : "secondary"
                    }
                    className="shrink-0"
                  >
                    {ROLE_LABELS[u.role]}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 text-xs">
                {u.department && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{u.department}</span>
                  </div>
                )}

                <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                  <div className="flex items-center justify-between font-medium">
                    <span>الصفحات المتاحة للوصول:</span>
                    <Badge variant="outline" className="bg-background">
                      {allowedCount} من {SYSTEM_PAGES.length} صفحات
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {SYSTEM_PAGES.map((p) => {
                      const hasAccess = isUserAdmin || (u.allowedPages && u.allowedPages.includes(p.url));
                      return (
                        <span
                          key={p.id}
                          className={`px-2 py-0.5 rounded-full text-[10px] ${
                            hasAccess
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium"
                              : "bg-muted text-muted-foreground opacity-40 line-through"
                          }`}
                        >
                          {p.title}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">الحالة:</span>
                    {u.status === "active" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <Check className="h-3.5 w-3.5" /> نشط
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-destructive font-medium">
                        <Lock className="h-3.5 w-3.5" /> معطل
                      </span>
                    )}
                  </div>

                  {u.password && (
                    <span className="text-muted-foreground text-[11px] font-mono bg-muted px-2 py-0.5 rounded">
                      كلمة السر: {u.password}
                    </span>
                  )}
                </div>
              </CardContent>

              <div className="p-3 bg-muted/20 border-t flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(u)}
                  className="flex-1 gap-1 text-xs"
                >
                  <Edit className="h-3.5 w-3.5 text-primary" />
                  تعديل الصلاحيات
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setResetTargetUser(u);
                    setNewPassword("");
                    setIsResetPasswordOpen(true);
                  }}
                  title="تغيير كلمة المرور"
                >
                  <KeyRound className="h-4 w-4 text-amber-600" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleStatus(u.id, u.status)}
                  title={u.status === "active" ? "تعطيل الحساب" : "تنشيط الحساب"}
                >
                  {u.status === "active" ? (
                    <Lock className="h-4 w-4 text-orange-600" />
                  ) : (
                    <Unlock className="h-4 w-4 text-emerald-600" />
                  )}
                </Button>

                {u.username !== "admin" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTargetId(u.id)}
                    title="حذف الحساب"
                    className="hover:bg-destructive/10 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <Card className="py-12 text-center text-muted-foreground">
          <CardContent>
            <Users className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-bold">لا يوجد نتائج طابقة للبحث</h3>
            <p className="text-sm">جرب البحث بكلمة أخرى أو تغيير الفلتر</p>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit User Modal - Ultra Modern Luxury Glass Design */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="max-w-2xl w-[94vw] sm:w-full max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-3xl sm:rounded-3xl border-2 border-cyan-500/25 bg-background shadow-[0_25px_60px_-15px_rgba(6,182,212,0.25)] font-sans dir-rtl">
          
          {/* Bright Clean Light Header */}
          <div className="bg-gradient-to-r from-sky-50/90 via-cyan-50/70 to-blue-50/60 dark:from-slate-900 dark:to-slate-800 p-5 sm:p-6 relative overflow-hidden border-b border-cyan-100 dark:border-slate-700">
            <div className="relative z-10 flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400 border border-cyan-200/80 dark:border-cyan-800 shadow-2xs">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {editingUser ? `تعديل حساب وصلاحيات: ${editingUser.name}` : "إنشاء حساب مستخدم جديد"}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  أدخل بيانات الحساب وحدد الصفحات المسموح للشخص بالوصول إليها.
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveUser} className="p-4 sm:p-7 space-y-6">
            {/* Inputs Grid */}
            <div className="grid gap-4.5 sm:grid-cols-2">
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="u-name" className="text-xs sm:text-sm font-black text-foreground flex items-center gap-1.5">
                  <span>الاسم الكامل</span>
                  <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  <Input
                    id="u-name"
                    placeholder="مثال: م. علي الحسيني"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 sm:h-12 rounded-2xl border-2 border-border/80 bg-background pr-10 hover:border-cyan-500/50 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 font-bold text-sm shadow-2xs transition-all"
                    required
                  />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="u-username" className="text-xs sm:text-sm font-black text-foreground flex items-center gap-1.5">
                  <span>اسم المستخدم (للدخول)</span>
                  <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="u-username"
                  placeholder="مثال: ali.eng"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 sm:h-12 rounded-2xl border-2 border-border/80 bg-background dir-ltr text-right hover:border-cyan-500/50 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 font-bold text-sm shadow-2xs transition-all"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="u-pwd" className="text-xs sm:text-sm font-black text-foreground flex items-center gap-1.5">
                  <span>{editingUser ? "كلمة المرور (اختياري للإبقاء)" : "كلمة المرور"}</span>
                  {!editingUser && <span className="text-rose-500">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="u-pwd"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!editingUser}
                    className="h-11 sm:h-12 rounded-2xl border-2 border-border/80 bg-background pr-4 pl-10 hover:border-cyan-500/50 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 font-bold text-sm shadow-2xs transition-all"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 h-8 px-2.5 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Field (الحقل) */}
              <div className="space-y-1.5">
                <Label htmlFor="u-dept" className="text-xs sm:text-sm font-black text-foreground">
                  الحقل / القسم
                </Label>
                <Input
                  id="u-dept"
                  placeholder="أدخل اسم الحقل أو القسم..."
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="h-11 sm:h-12 rounded-2xl border-2 border-border/80 bg-background hover:border-cyan-500/50 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 font-bold text-sm shadow-2xs transition-all"
                />
              </div>

              {/* Role Selector */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="u-role" className="text-xs sm:text-sm font-black text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  <span>دور المستخدم (الصلاحية)</span>
                  <span className="text-rose-500">*</span>
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["admin", "directorate_manager", "resident_engineer", "executive"] as const).map((r) => {
                    const labels: Record<string, string> = {
                      admin: "مدير النظام",
                      directorate_manager: "مدير مديرية",
                      resident_engineer: "مهندس مقيم",
                      executive: "إدارة عليا",
                    };
                    const colors: Record<string, string> = {
                      admin: "border-rose-500 bg-rose-500/10 text-rose-800 dark:text-rose-200",
                      directorate_manager: "border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-200",
                      resident_engineer: "border-blue-500 bg-blue-500/10 text-blue-800 dark:text-blue-200",
                      executive: "border-purple-500 bg-purple-500/10 text-purple-800 dark:text-purple-200",
                    };
                    const selected = role === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleRoleChange(r)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1 rounded-2xl border-2 p-2.5 text-xs font-black transition-all duration-200 cursor-pointer select-none shadow-2xs",
                          selected
                            ? colors[r] + " shadow-md scale-[1.02]"
                            : "border-border/70 bg-background text-muted-foreground hover:border-cyan-500/40 hover:bg-cyan-50/30 dark:hover:bg-slate-800/50"
                        )}
                      >
                        <span className="text-[13px]">{labels[r]}</span>
                        {selected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
                {role === "admin" && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-1 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    مدير النظام يحصل تلقائياً على صلاحية الوصول لجميع الصفحات.
                  </p>
                )}
              </div>
            </div>

            {/* Page Access Control Section - Ultra High Tech Cards */}
            <div className="border-t border-border/80 pt-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-cyan-500/5 dark:bg-cyan-950/30 p-3.5 sm:p-4 rounded-2xl border border-cyan-500/20">
                <div>
                  <Label className="text-sm sm:text-base font-black text-cyan-900 dark:text-cyan-200 flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    الصفحات المسموح بالوصول إليها (Page Permissions)
                  </Label>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    اختر الصفحات المتاحة للمستخدم عند تسجيل الدخول للنظام.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllPages}
                    className="text-xs font-bold h-8 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-800 dark:text-cyan-200 border-cyan-500/30 cursor-pointer"
                  >
                    تحديد الكل
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAllPages}
                    className="text-xs font-bold h-8 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700 cursor-pointer"
                  >
                    إلغاء الكل
                  </Button>
                </div>
              </div>

              {/* Categorized Permissions Grid */}
              <div className="space-y-5 rounded-2xl border-2 border-border/70 bg-slate-50/50 dark:bg-slate-900/40 p-3.5 sm:p-5">
                {pageCategories.map((cat) => {
                  const catPages = SYSTEM_PAGES.filter((p) => p.category === cat);
                  return (
                    <div key={cat} className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-cyan-800 dark:text-cyan-300 bg-cyan-100/80 dark:bg-cyan-950 px-3 py-1 rounded-xl border border-cyan-300/50 shadow-2xs">
                          📁 {cat}
                        </span>
                      </div>

                      <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2">
                        {catPages.map((p) => {
                          const isChecked = role === "admin" || allowedPages.includes(p.url);
                          const isDisabled = role === "admin";

                          return (
                            <div
                              key={p.id}
                              className={cn(
                                "flex items-center justify-between gap-3 rounded-2xl border-2 p-3.5 cursor-pointer transition-all duration-200 select-none shadow-2xs min-h-[56px]",
                                isDisabled ? "opacity-70 cursor-not-allowed" : "active:scale-[0.98]",
                                isChecked
                                  ? "bg-gradient-to-br from-cyan-500/15 via-sky-500/10 to-teal-500/15 border-cyan-500 text-foreground font-black shadow-md shadow-cyan-500/10"
                                  : "bg-background border-border/80 text-muted-foreground hover:border-cyan-500/40 hover:bg-cyan-50/40 dark:hover:bg-slate-800/50"
                              )}
                              onClick={() => !isDisabled && togglePagePermission(p.url)}
                            >
                              <div className="space-y-0.5 leading-snug">
                                <span className="text-xs sm:text-sm font-black block text-foreground">
                                  {p.title}
                                </span>
                                <p className="text-[11px] text-muted-foreground font-medium leading-tight">
                                  {p.description}
                                </p>
                              </div>

                              <div className="shrink-0">
                                {isChecked ? (
                                  <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-cyan-500 to-sky-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/30">
                                    <Check className="h-4 w-4 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="h-6 w-6 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-background" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddEditOpen(false)}
                className="h-11 sm:h-12 w-full sm:w-auto px-5 rounded-2xl border-2 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                className="h-11 sm:h-12 w-full sm:w-auto px-7 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-600 to-blue-700 hover:from-cyan-400 hover:to-blue-600 text-white font-black shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all gap-2 text-sm cursor-pointer"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                <span>{editingUser ? "حفظ التغييرات والصلاحيات" : "إنشاء الحساب"}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-500" />
              تغيير كلمة المرور: {resetTargetUser?.name}
            </DialogTitle>
            <DialogDescription>
              أدخل كلمة المرور الجديدة لهذا الحساب مباشرة.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmResetPassword} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-pwd">كلمة المرور الجديدة</Label>
              <Input
                id="new-pwd"
                type="text"
                placeholder="أدخل كلمة المرور الجديدة"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsResetPasswordOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
                تحديث كلمة المرور
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              تأكيد حذف الحساب
            </DialogTitle>
            <DialogDescription>
              هل أنت تأكد من إرادتك لحذف هذا الحساب بشكل دائم من النظام؟ لا يمكن التراجع عن هذه العملية.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              نعم، حذف الحساب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
