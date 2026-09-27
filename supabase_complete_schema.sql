-- ==============================================================================
-- 🏛️ سكربت تهيئة وتحديث قاعدة بيانات Supabase بالكامل
-- 🏢 مشروع: نظام متابعة مشاريع مديرية ماء محافظة الأنبار
-- ==============================================================================

-- 1. تفعيل الامتدادات المطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. جدول المشاريع (projects)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- تحويل عمود id إلى TEXT بأمان ليدعم معرفات النظام مثل (PRJ-2026-001) ودون تعارض مع الـ Views
DO $$ 
DECLARE
  r RECORD;
BEGIN 
  -- إذا كان العمود ليس من نوع text (مثلاً كان uuid سابقاً)
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'projects' 
      AND column_name = 'id' 
      AND data_type NOT IN ('text', 'character varying')
  ) THEN 
    -- حذف أي View تعتمد على الجدول لتفادي خطأ 0A000
    FOR r IN (
      SELECT DISTINCT dependent_ns.nspname AS schemaname, dependent_view.relname AS viewname
      FROM pg_depend 
      JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
      JOIN pg_class AS dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
      JOIN pg_class AS source_table ON pg_depend.refobjid = source_table.oid 
      JOIN pg_namespace AS dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
      WHERE source_table.relname = 'projects' AND dependent_view.relkind = 'v'
    ) LOOP
      EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.schemaname) || '.' || quote_ident(r.viewname) || ' CASCADE';
    END LOOP;

    -- تغيير نوع العمود إلى TEXT
    ALTER TABLE public.projects ALTER COLUMN id TYPE TEXT USING id::text;
  END IF;
END $$;

-- إزالة شروط NOT NULL من جميع أعمدة المشاريع (ما عدا id) لضمان مرونة الحفظ ومنع خطأ 23502
DO $$ 
DECLARE
  col RECORD;
BEGIN 
  FOR col IN (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'projects' 
      AND is_nullable = 'NO' 
      AND column_name NOT IN ('id')
  ) LOOP
    EXECUTE 'ALTER TABLE public.projects ALTER COLUMN ' || quote_ident(col.column_name) || ' DROP NOT NULL';
  END LOOP;
END $$;

-- إضافة وتحديث جميع أعمدة المشاريع في حال كان الجدول موجوداً مسبقاً
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS sub_district TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contractor TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS center_name TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS funding_source TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS referral_method TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_no TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_date TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_value NUMERIC DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'IQD';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS start_date TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS planned_end_date TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS expected_end_date TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS planned_progress NUMERIC DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS actual_progress NUMERIC DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ongoing';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION DEFAULT 33.4248;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION DEFAULT 43.3023;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'water_tank';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_type TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS actual_start_date TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS resume_start_date TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS suspension_date TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS suspension_duration TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS actual_execution_duration TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS additional_duration TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_duration_after_resume TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contractual_completion_date TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS completion_date_after_additional TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS initial_handover_order_no TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS initial_handover_order_date TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS initial_handover_date TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS initial_handover_committee JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS initial_handover_notes TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS final_handover_order_no TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS final_handover_order_date TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS final_handover_date TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS final_handover_committee JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS final_handover_notes TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS remaining_duration_from_resume TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS remaining_duration_from_report TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS delay_reasons TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS change_orders_count INTEGER DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS change_order_no_and_date TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS change_order_single_amount NUMERIC DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS change_orders_total_amount NUMERIC DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS change_orders_list JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS work_cost NUMERIC DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS disbursed_work NUMERIC DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS total_disbursed NUMERIC DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS local_staff_count INTEGER DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS foreign_staff_count INTEGER DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS executed_works_period TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS delivered_equipment_period TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS problems_obstacles_solutions TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS suspension_dates_reasons TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS resident_engineer_opinion TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS resident_engineer_id TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS resident_engineer_name TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS resident_engineer_phone TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS selected_supervisors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- مزامنة البيانات القديمة إن وجدت أعمدة title أو progress
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='title') THEN 
    UPDATE public.projects SET name = COALESCE(name, title) WHERE name IS NULL; 
  END IF; 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='progress') THEN 
    UPDATE public.projects SET actual_progress = COALESCE(actual_progress, progress) WHERE actual_progress = 0 OR actual_progress IS NULL; 
  END IF; 
END $$;

-- ==============================================================================
-- 3. جدول تقارير المتابعة الميدانية اليومية (progress_reports)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.progress_reports (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  date TEXT DEFAULT (CURRENT_DATE)::text,
  engineer TEXT,
  actual_progress NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'ongoing',
  completed_works TEXT,
  upcoming_works TEXT,
  weather TEXT DEFAULT 'مشمس',
  labour JSONB DEFAULT '{}'::jsonb,
  equipment JSONB DEFAULT '[]'::jsonb,
  obstacles JSONB DEFAULT '[]'::jsonb,
  obstacles_text TEXT,
  materials JSONB DEFAULT '[]'::jsonb,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  notes TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  files JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 4. جدول التقارير الشهرية (monthly_reports)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.monthly_reports (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  project_name TEXT,
  contract_no TEXT,
  project_type TEXT,
  center_name TEXT,
  year INTEGER,
  month TEXT,
  report_no TEXT,
  date TEXT,
  resident_engineer TEXT,
  resident_engineer_phone TEXT,
  selected_supervisors JSONB DEFAULT '[]'::jsonb,
  contractor TEXT,
  location TEXT,
  district TEXT,
  sub_district TEXT,
  funding_source TEXT,
  referral_method TEXT,
  contract_date TEXT,
  initial_handover_order_no TEXT,
  initial_handover_order_date TEXT,
  initial_handover_date TEXT,
  initial_handover_committee JSONB DEFAULT '[]'::jsonb,
  initial_handover_notes TEXT,
  final_handover_date TEXT,
  final_handover_committee JSONB DEFAULT '[]'::jsonb,
  final_handover_notes TEXT,
  contract_value NUMERIC DEFAULT 0,
  change_orders_count INTEGER DEFAULT 0,
  change_orders_total_amount NUMERIC DEFAULT 0,
  work_cost NUMERIC DEFAULT 0,
  duration_days INTEGER DEFAULT 360,
  start_date TEXT,
  additional_duration TEXT,
  completion_date_after_additional TEXT,
  planned_progress NUMERIC DEFAULT 0,
  actual_progress NUMERIC DEFAULT 0,
  labour_count INTEGER DEFAULT 0,
  weather TEXT,
  executed_works TEXT,
  materials_delivered TEXT,
  obstacles_and_notes TEXT,
  status TEXT DEFAULT 'approved',
  photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 5. جدول حسابات المستخدمين (user_accounts)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  password TEXT,
  role TEXT DEFAULT 'resident_engineer',
  status TEXT DEFAULT 'active',
  allowed_pages JSONB DEFAULT '[]'::jsonb,
  phone TEXT,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ
);

-- إضافة مستخدم إداري افتراضي إن لم يوجد أي مستخدم
INSERT INTO public.user_accounts (id, name, username, email, password, role, status, allowed_pages)
VALUES (
  'admin-default-id',
  'مدير النظام',
  'admin',
  'admin@water-anbar.gov.iq',
  'admin123',
  'super_admin',
  'active',
  '["/dashboard", "/projects", "/reports", "/users", "/settings", "/gis", "/analytics"]'::jsonb
) ON CONFLICT (username) DO NOTHING;

-- ==============================================================================
-- 6. جدول إعدادات النظام (system_settings)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 7. جدول سجل العمليات والحركات (system_activities)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.system_activities (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  user_name TEXT,
  user_role TEXT,
  user_avatar TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  formatted_date TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 8. تفعيل الأمان وسياسات الصلاحيات (Row Level Security)
-- ==============================================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_activities ENABLE ROW LEVEL SECURITY;

-- حذف أي سياسات قديمة متعارضة
DROP POLICY IF EXISTS "Allow all access to projects" ON public.projects;
DROP POLICY IF EXISTS "Allow all access to progress_reports" ON public.progress_reports;
DROP POLICY IF EXISTS "Allow all access to monthly_reports" ON public.monthly_reports;
DROP POLICY IF EXISTS "Allow all access to user_accounts" ON public.user_accounts;
DROP POLICY IF EXISTS "Allow all access to system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow all access to system_activities" ON public.system_activities;

-- إنشاء سياسات شاملة للوصول الكامل (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Allow all access to projects" ON public.projects FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to progress_reports" ON public.progress_reports FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to monthly_reports" ON public.monthly_reports FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_accounts" ON public.user_accounts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to system_settings" ON public.system_settings FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to system_activities" ON public.system_activities FOR ALL TO public USING (true) WITH CHECK (true);

-- منح الصلاحيات للأدوار المستخدمة
GRANT ALL ON TABLE public.projects TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.progress_reports TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.monthly_reports TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.user_accounts TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.system_settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.system_activities TO anon, authenticated, service_role;

-- ==============================================================================
-- 9. فهارس تسريع الاستعلامات (Performance Indexes)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_district ON public.projects(district);
CREATE INDEX IF NOT EXISTS idx_projects_contract_no ON public.projects(contract_no);
CREATE INDEX IF NOT EXISTS idx_progress_reports_project_id ON public.progress_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_project_id ON public.monthly_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_username ON public.user_accounts(username);
CREATE INDEX IF NOT EXISTS idx_system_activities_timestamp ON public.system_activities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_activities_category ON public.system_activities(category);

