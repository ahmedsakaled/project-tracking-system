-- ==============================================================================
-- 🏛️ سكربت إنشاء وتحديث جدول إدارة المشاريع والتقارير في Supabase
-- 🏢 مديرية ماء محافظة الأنبار - نظام متابعة وإدارة المشاريع
-- ==============================================================================

-- 1. تفعيل الإضافات المطلوبة (Extensions)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. جدول المشاريع الرئيسي (projects)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  district TEXT,
  sub_district TEXT,
  contractor TEXT,
  center_name TEXT,
  funding_source TEXT,
  referral_method TEXT,
  referral_no TEXT,
  referral_date TEXT,
  contract_no TEXT,
  contract_date TEXT,
  contract_value NUMERIC DEFAULT 0,
  duration_days INTEGER DEFAULT 0,
  start_date TEXT,
  planned_end_date TEXT,
  expected_end_date TEXT,
  planned_progress NUMERIC DEFAULT 0,
  actual_progress NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'ongoing',
  lat DOUBLE PRECISION DEFAULT 33.4248,
  lng DOUBLE PRECISION DEFAULT 43.3023,
  type TEXT DEFAULT 'water_tank',
  contract_type TEXT,
  actual_start_date TEXT,
  resume_start_date TEXT,
  suspension_date TEXT,
  suspension_duration TEXT,
  actual_execution_duration TEXT,
  additional_duration TEXT,
  contract_duration_after_resume TEXT,
  contractual_completion_date TEXT,
  completion_date_after_additional TEXT,
  initial_handover_order_no TEXT,
  initial_handover_order_date TEXT,
  initial_handover_date TEXT,
  initial_handover_committee JSONB DEFAULT '[]'::jsonb,
  initial_handover_notes TEXT,
  final_handover_date TEXT,
  final_handover_committee JSONB DEFAULT '[]'::jsonb,
  final_handover_notes TEXT,
  remaining_duration_from_resume TEXT,
  remaining_duration_from_report TEXT,
  delay_reasons TEXT,
  change_orders_count INTEGER DEFAULT 0,
  change_order_no_and_date TEXT,
  change_order_single_amount NUMERIC DEFAULT 0,
  change_orders_total_amount NUMERIC DEFAULT 0,
  change_orders_list JSONB DEFAULT '[]'::jsonb,
  work_cost NUMERIC DEFAULT 0,
  disbursed_work NUMERIC DEFAULT 0,
  total_disbursed NUMERIC DEFAULT 0,
  estimated_cost NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  local_staff_count INTEGER DEFAULT 0,
  foreign_staff_count INTEGER DEFAULT 0,
  executed_works_period TEXT,
  delivered_equipment_period TEXT,
  notes TEXT,
  problems_obstacles_solutions TEXT,
  suspension_dates_reasons TEXT,
  resident_engineer_opinion TEXT,
  resident_engineer_id TEXT,
  resident_engineer_name TEXT,
  resident_engineer_phone TEXT,
  selected_supervisors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- إضافة أي أعمدة مفقودة في حال كان الجدول موجوداً مسبقاً (Idempotent Migration)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS sub_district TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS center_name TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS funding_source TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS referral_method TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS referral_no TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS referral_date TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_date TEXT;
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
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS final_handover_date TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS final_handover_committee JSONB DEFAULT '[]'::jsonb;
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

-- إضافة أي أعمدة مفقودة لجدول التقارير
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS upcoming_works TEXT;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS weather TEXT;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS labour JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS equipment JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS obstacles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS obstacles_text TEXT;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS materials JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.progress_reports ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb;

-- ==============================================================================
-- 4. إعداد الصلاحيات وأمان الصفوف (Row Level Security & Permissions)
-- ==============================================================================

-- تفعيل RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_reports ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات السماح بالقراءة والكتابة والتعديل والحذف لكافة المستخدمين (anon & authenticated)
DO $$ 
BEGIN
  -- سياسة projects
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Allow all access to projects'
  ) THEN
    CREATE POLICY "Allow all access to projects" 
      ON public.projects 
      FOR ALL 
      TO public 
      USING (true) 
      WITH CHECK (true);
  END IF;

  -- سياسة progress_reports
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'progress_reports' AND policyname = 'Allow all access to progress_reports'
  ) THEN
    CREATE POLICY "Allow all access to progress_reports" 
      ON public.progress_reports 
      FOR ALL 
      TO public 
      USING (true) 
      WITH CHECK (true);
  END IF;
END $$;

-- منح الصلاحيات
GRANT ALL ON TABLE public.projects TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.progress_reports TO anon, authenticated, service_role;

-- ==============================================================================
-- 5. فهارس تسريع البحث (Performance Indexes)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_district ON public.projects(district);
CREATE INDEX IF NOT EXISTS idx_projects_contract_no ON public.projects(contract_no);
CREATE INDEX IF NOT EXISTS idx_progress_reports_project_id ON public.progress_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_progress_reports_date ON public.progress_reports(date);

-- ==============================================================================
-- 6. جدول حسابات المستخدمين (user_accounts)
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

ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_accounts' AND policyname = 'Allow all access to user_accounts'
  ) THEN
    CREATE POLICY "Allow all access to user_accounts" 
      ON public.user_accounts 
      FOR ALL 
      TO public 
      USING (true) 
      WITH CHECK (true);
  END IF;
END $$;
GRANT ALL ON TABLE public.user_accounts TO anon, authenticated, service_role;

-- ==============================================================================
-- 7. جدول إعدادات النظام (system_settings)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'system_settings' AND policyname = 'Allow all access to system_settings'
  ) THEN
    CREATE POLICY "Allow all access to system_settings" 
      ON public.system_settings 
      FOR ALL 
      TO public 
      USING (true) 
      WITH CHECK (true);
  END IF;
END $$;
GRANT ALL ON TABLE public.system_settings TO anon, authenticated, service_role;

-- ==============================================================================
-- 8. أوامر التحديث السريعة للجداول الحالية (Migration Updates)
-- ==============================================================================
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS referral_no TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS referral_date TEXT;

