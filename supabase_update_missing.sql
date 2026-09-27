-- ==============================================================================
-- سكربت استكمال وتحديث أعمدة وفهارس قاعدة بيانات Supabase الناقصة
-- نظام متابعة مشاريع مديرية ماء محافظة الأنبار
-- قم بنسخ هذا الكود وتشغيله في: Supabase Dashboard -> SQL Editor -> New query -> Run
-- ==============================================================================

-- 1. إضافة الأعمدة الناقصة في جدول التقارير الشهرية (monthly_reports)
ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS initial_handover_order_no TEXT;
ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS initial_handover_order_date DATE;
ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS lat NUMERIC(10, 6);
ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS lng NUMERIC(10, 6);

-- 2. تصحيح قيد البريد الإلكتروني في جدول المستخدمين (user_accounts)
-- جعل البريد الإلكتروني اختيارياً حتى لا يفشل إنشاء حسابات المهندسين التي لا تملك بريداً حكومياً
ALTER TABLE public.user_accounts ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.user_accounts ALTER COLUMN role SET DEFAULT 'resident_engineer';
ALTER TABLE public.user_accounts ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE public.user_accounts ALTER COLUMN allowed_pages SET DEFAULT '[]'::jsonb;

-- 3. إضافة وتأكيد الحذف المتسلسل (ON DELETE CASCADE) للعلاقات الخارجية
-- (لحذف التقارير تلقائياً عند حذف أي مشروع دون حدوث أخطاء Foreign Key)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'progress_reports_project_id_fkey'
    ) THEN
        ALTER TABLE public.progress_reports DROP CONSTRAINT progress_reports_project_id_fkey;
        ALTER TABLE public.progress_reports 
            ADD CONSTRAINT progress_reports_project_id_fkey 
            FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'monthly_reports_project_id_fkey'
    ) THEN
        ALTER TABLE public.monthly_reports DROP CONSTRAINT monthly_reports_project_id_fkey;
        ALTER TABLE public.monthly_reports 
            ADD CONSTRAINT monthly_reports_project_id_fkey 
            FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. فهارس تسريع استعلامات الفلترة والبحث (Performance Indexes)
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_district ON public.projects(district);
CREATE INDEX IF NOT EXISTS idx_progress_reports_proj ON public.progress_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_progress_reports_date ON public.progress_reports(date);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_proj ON public.monthly_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_date ON public.monthly_reports(date);
CREATE INDEX IF NOT EXISTS idx_system_activities_time ON public.system_activities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_accounts_username ON public.user_accounts(username);

-- 5. تأكيد الصلاحيات الشاملة وسياسات الوصول للواجهة (Anon / Authenticated)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 6. تحديث كاش واجهة البرمجة لـ PostgREST فوراً للتعرف على الأعمدة الجديدة
NOTIFY pgrst, 'reload schema';
