-- ==============================================================================
-- مشروع نظام متابعة المشاريع - مديرية ماء محافظة الأنبار
-- Supabase / PostgreSQL Complete Database Migration & Schema Script
-- ==============================================================================

-- 1. تفعيل الإضافات المطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. إنشاء وتحديث جدول المشاريع (projects)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- الأعمدة الأساسية
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_no TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'investment';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_type TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contractor TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS center_name TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS funding_source TEXT DEFAULT 'الخطة الاستثمارية';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS referral_method TEXT DEFAULT 'مناقصة عامة';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ongoing';

-- الموقع الجغرافي والإحداثيات
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS sub_district TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS lat NUMERIC(10, 6) DEFAULT 33.4248;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS lng NUMERIC(10, 6) DEFAULT 43.3023;

-- المبالغ والماليات
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_value NUMERIC(18, 2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(18, 2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS amount NUMERIC(18, 2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS work_cost NUMERIC(18, 2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS disbursed_work NUMERIC(18, 2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS total_disbursed NUMERIC(18, 2) DEFAULT 0;

-- أوامر الغيار والمدد الإضافية
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS change_orders_count INT DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS change_order_no_and_date TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS change_order_single_amount NUMERIC(18, 2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS change_orders_total_amount NUMERIC(18, 2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS change_orders_list JSONB DEFAULT '[]'::jsonb;

-- التواريخ والمدد
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS duration_days INT DEFAULT 360;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS actual_start_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS resume_start_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS suspension_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS planned_end_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS expected_end_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contractual_completion_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS completion_date_after_additional DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS initial_handover_order_no TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS initial_handover_order_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS initial_handover_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS initial_handover_committee JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS initial_handover_notes TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS final_handover_order_no TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS final_handover_order_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS final_handover_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS final_handover_committee JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS final_handover_notes TEXT;

-- مدد التوقفات والتنفيذ الفعلي
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS suspension_duration TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS actual_execution_duration TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS additional_duration TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_duration_after_resume TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS remaining_duration_from_resume TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS remaining_duration_from_report TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS delay_reasons TEXT;

-- نسب الإنجاز
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS planned_progress NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS actual_progress NUMERIC(5, 2) DEFAULT 0;

-- الكادر الهندسي والمشرفون
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS local_staff_count INT DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS foreign_staff_count INT DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS resident_engineer_id TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS resident_engineer_name TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS resident_engineer_phone TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS selected_supervisors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS resident_engineer_opinion TEXT;

-- البيانات والملاحظات الفنية
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS executed_works_period TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS delivered_equipment_period TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS problems_obstacles_solutions TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS suspension_dates_reasons TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS notes TEXT;

-- فهارس تحسين الأداء
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_district ON public.projects(district);
CREATE INDEX IF NOT EXISTS idx_projects_actual_progress ON public.projects(actual_progress);

-- ==============================================================================
-- 3. إنشاء وتحديث جدول التقارير الميدانية والمتابعة (progress_reports)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.progress_reports (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    report_no TEXT,
    year TEXT DEFAULT '2026',
    month TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS report_no TEXT;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS year TEXT DEFAULT '2026';
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS month TEXT;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS engineer TEXT;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS engineer_phone TEXT;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS planned_progress NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS actual_progress NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS completed_works TEXT;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS upcoming_works TEXT;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS weather TEXT;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS labour TEXT;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS equipment TEXT;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS materials TEXT;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS obstacles TEXT;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS obstacles_text TEXT;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS lat NUMERIC(10, 6);
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS lng NUMERIC(10, 6);

CREATE INDEX IF NOT EXISTS idx_progress_reports_project ON public.progress_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_progress_reports_status ON public.progress_reports(status);
CREATE INDEX IF NOT EXISTS idx_progress_reports_date ON public.progress_reports(date);

-- ==============================================================================
-- 4. إنشاء وتحديث جدول المهندسين المقيمين (resident_engineers)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.resident_engineers (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    title TEXT DEFAULT 'مهندس مقيم',
    district TEXT,
    assigned_projects_count INT DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. إنشاء وتحديث جدول حسابات المستخدمين (user_accounts)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_accounts (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    password TEXT,
    role TEXT DEFAULT 'resident_engineer',
    status TEXT DEFAULT 'active',
    allowed_pages JSONB DEFAULT '[]'::jsonb,
    phone TEXT,
    department TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'resident_engineer';
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS allowed_pages JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- ==============================================================================
-- 6. دوال وعروض (Views) للمشاريع قيد التنفيذ والمتابعة الميدانية
-- ==============================================================================

-- عرض خاص بصفحة المشاريع قيد التنفيذ والمتابعة الميدانية
CREATE OR REPLACE VIEW public.v_ongoing_projects_monitoring AS
SELECT 
    p.*,
    COALESCE(p.planned_progress, 0) - COALESCE(p.actual_progress, 0) AS deviation_percentage,
    CASE 
        WHEN COALESCE(p.planned_progress, 0) - COALESCE(p.actual_progress, 0) > 10 THEN 'delayed_critical'
        WHEN COALESCE(p.planned_progress, 0) - COALESCE(p.actual_progress, 0) > 5 THEN 'delayed'
        ELSE 'on_track'
    END AS execution_health,
    (SELECT COUNT(*) FROM public.progress_reports r WHERE r.project_id = p.id) AS reports_count,
    (SELECT MAX(r.date) FROM public.progress_reports r WHERE r.project_id = p.id) AS last_report_date
FROM public.projects p
WHERE p.status != 'completed' 
  AND p.status != 'stopped' 
  AND COALESCE(p.actual_progress, 0) < 100
ORDER BY p.created_at DESC;

-- ==============================================================================
-- 7. سياسات الأمان لسماحيات API (Row Level Security)
-- ==============================================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resident_engineers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public insert/update projects" ON public.projects;
CREATE POLICY "Allow public read projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update projects" ON public.projects FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read progress_reports" ON public.progress_reports;
DROP POLICY IF EXISTS "Allow public insert/update progress_reports" ON public.progress_reports;
CREATE POLICY "Allow public read progress_reports" ON public.progress_reports FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update progress_reports" ON public.progress_reports FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read resident_engineers" ON public.resident_engineers;
DROP POLICY IF EXISTS "Allow public insert/update resident_engineers" ON public.resident_engineers;
CREATE POLICY "Allow public read resident_engineers" ON public.resident_engineers FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update resident_engineers" ON public.resident_engineers FOR ALL USING (true);

ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read user_accounts" ON public.user_accounts;
DROP POLICY IF EXISTS "Allow public insert/update/delete user_accounts" ON public.user_accounts;
CREATE POLICY "Allow public read user_accounts" ON public.user_accounts FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update/delete user_accounts" ON public.user_accounts FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.user_accounts TO anon, authenticated, service_role;

-- ==============================================================================
-- 8. التحديث التلقائي لتاريخ التعديل (Trigger)
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_projects_timestamp ON public.projects;
CREATE TRIGGER trigger_update_projects_timestamp
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trigger_update_reports_timestamp ON public.progress_reports;
CREATE TRIGGER trigger_update_reports_timestamp
BEFORE UPDATE ON public.progress_reports
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- ==============================================================================
-- 9. إنشاء وتحديث جدول التقارير الشهرية الشاملة (monthly_reports)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.monthly_reports (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL,
    contract_no TEXT,
    project_type TEXT,
    center_name TEXT,
    year TEXT DEFAULT '2026',
    month TEXT NOT NULL,
    report_no TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    resident_engineer TEXT,
    resident_engineer_phone TEXT,
    selected_supervisors JSONB DEFAULT '[]'::jsonb,
    contractor TEXT,
    location TEXT,
    district TEXT,
    sub_district TEXT,
    funding_source TEXT,
    referral_method TEXT,
    contract_date DATE,
    initial_handover_order_no TEXT,
    initial_handover_order_date DATE,
    initial_handover_date DATE,
    initial_handover_committee JSONB DEFAULT '[]'::jsonb,
    initial_handover_notes TEXT,
    final_handover_order_no TEXT,
    final_handover_order_date DATE,
    final_handover_date DATE,
    final_handover_committee JSONB DEFAULT '[]'::jsonb,
    final_handover_notes TEXT,
    contract_value NUMERIC(18, 2) DEFAULT 0,
    change_orders_count INT DEFAULT 0,
    change_orders_total_amount NUMERIC(18, 2) DEFAULT 0,
    work_cost NUMERIC(18, 2) DEFAULT 0,
    duration_days INT DEFAULT 360,
    start_date DATE,
    additional_duration TEXT,
    completion_date_after_additional DATE,
    planned_progress NUMERIC(5, 2) DEFAULT 0,
    actual_progress NUMERIC(5, 2) DEFAULT 0,
    labour_count INT DEFAULT 0,
    weather TEXT,
    executed_works TEXT,
    materials_delivered TEXT,
    obstacles_and_notes TEXT,
    status TEXT DEFAULT 'approved',
    photos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- فهارس تحسين الأداء لجدول التقارير الشهرية
CREATE INDEX IF NOT EXISTS idx_monthly_reports_project_id ON public.monthly_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_year_month ON public.monthly_reports(year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_status ON public.monthly_reports(status);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_created_at ON public.monthly_reports(created_at DESC);

-- سياسات الأمان RLS لجدول التقارير الشهرية
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read monthly_reports" ON public.monthly_reports;
DROP POLICY IF EXISTS "Allow public insert/update/delete monthly_reports" ON public.monthly_reports;
CREATE POLICY "Allow public read monthly_reports" ON public.monthly_reports FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update/delete monthly_reports" ON public.monthly_reports FOR ALL USING (true) WITH CHECK (true);

-- مشغل التحديث التلقائي لتاريخ التعديل
DROP TRIGGER IF EXISTS trigger_update_monthly_reports_timestamp ON public.monthly_reports;
CREATE TRIGGER trigger_update_monthly_reports_timestamp
BEFORE UPDATE ON public.monthly_reports
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- ==============================================================================
-- 10. إنشاء وتحديث جدول إعدادات النظام (system_settings)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow public insert/update/delete system_settings" ON public.system_settings;
CREATE POLICY "Allow public read system_settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update/delete system_settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.system_settings TO anon, authenticated, service_role;



