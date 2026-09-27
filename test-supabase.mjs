/**
 * سكربت الفحص الشامل لاتصال قاعدة بيانات Supabase
 * مشروع: نظام متابعة مشاريع مديرية ماء محافظة الأنبار
 * للتشغيل: node test-supabase.mjs
 */

import fs from 'fs';
import dns from 'dns/promises';

// قراءة متغيرات البيئة من .env
let envUrl = '';
let envAnonKey = '';
let envServiceKey = '';

try {
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
    if (m) {
      const k = m[1];
      const v = m[2].trim().replace(/^['"]|['"]$/g, '');
      if (k === 'VITE_SUPABASE_URL') envUrl = v;
      if (k === 'VITE_SUPABASE_ANON_KEY') envAnonKey = v;
      if (k === 'SUPABASE_SERVICE_ROLE_KEY') envServiceKey = v;
    }
  }
} catch (e) {
  // استخدام القيم الافتراضية إن تعذر قراءة الملف
}

const SUPABASE_URL = envUrl || "https://swnhwhywirsvphlsifvn.supabase.co";
const SUPABASE_ANON_KEY = envAnonKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bmh3aHl3aXJzdnBobHNpZnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NTYzMTksImV4cCI6MjEwMTIzMjMxOX0.UZUmd3nKLH7xj0SMPnAp4d1HJqVa2aCNG1PwB4cYPfQ";

const HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const TEST_ID = `TEST-AUDIT-${Date.now()}`;

function printSection(title) {
  console.log("\n" + "═".repeat(60));
  console.log(`📋 ${title}`);
  console.log("═".repeat(60));
}

function logStep(step, success, message) {
  const icon = success ? "✅ [نجاح]" : "❌ [فشل]";
  console.log(`${icon} (${step}): ${message}`);
}

// ──────────────────────────────────────────────────────────────
// 1. فحص الشبكة و DNS و SSL
// ──────────────────────────────────────────────────────────────
async function testNetwork() {
  printSection("1. فحص الشبكة والاتصال الأساسي (DNS / SSL / Fetch)");
  try {
    const parsedUrl = new URL(SUPABASE_URL);
    console.log(`🌐 النطاق المستهدف: ${parsedUrl.hostname}`);

    // فحص DNS
    try {
      const lookup = await dns.lookup(parsedUrl.hostname);
      logStep("DNS Resolution", true, `تم العثور على عنوان IP الخادم: ${lookup.address}`);
    } catch (dnsErr) {
      logStep("DNS Resolution", false, `تعذر حل اسم النطاق DNS: ${dnsErr.message}`);
      return false;
    }

    // فحص HTTPS Ping
    try {
      const pingRes = await fetch(SUPABASE_URL, { method: "HEAD" });
      logStep("HTTPS / SSL Ping", true, `الخادم يستجيب برمز الحالة: ${pingRes.status}`);
    } catch (sslErr) {
      logStep("HTTPS / SSL Ping", false, `فشل الاتصال المشفر أو مهلة الطلب (Timeout/SSL): ${sslErr.message}`);
      return false;
    }

    return true;
  } catch (err) {
    logStep("الشبكة", false, `خطأ عام في فحص الشبكة: ${err.message}`);
    return false;
  }
}

// ──────────────────────────────────────────────────────────────
// 2. اختبار CRUD كامل على جدول projects
// ──────────────────────────────────────────────────────────────
async function testCrud() {
  printSection("2. اختبار العمليات الحقيقية (CRUD) على جدول المشاريع projects");

  const testProject = {
    id: TEST_ID,
    name: "مشروع فحص الاتصال التلقائي (سجل تجريبي)",
    location: "الرمادي - شارع 100",
    district: "الرمادي",
    sub_district: "المركز",
    contractor: "شركة الفحص الهندسي المعتمدة",
    contract_no: "AUDIT-2026-TEST",
    contract_value: 75000000,
    duration_days: 180,
    start_date: "2026-03-01",
    planned_end_date: "2026-09-01",
    planned_progress: 30,
    actual_progress: 25,
    status: "ongoing",
    lat: 33.4248,
    lng: 43.3023,
    type: "water_tank",
    notes: "سجل مؤقت تم إنشاؤه عبر test-supabase.mjs وسيتم حذفه تلقائياً",
  };

  // 1. INSERT
  try {
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(testProject),
    });
    const insertText = await insertRes.text();
    if (!insertRes.ok) {
      logStep("INSERT (إنشاء)", false, `HTTP ${insertRes.status} — ${insertText}`);
      return false;
    }
    const inserted = JSON.parse(insertText);
    logStep("INSERT (إنشاء)", true, `تم إنشاء السجل بنجاح! المعرف: ${inserted[0]?.id || TEST_ID}`);
  } catch (err) {
    logStep("INSERT (إنشاء)", false, `استثناء أثناء الإنشاء: ${err.message}`);
    return false;
  }

  // 2. SELECT
  try {
    const selectRes = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?id=eq.${encodeURIComponent(TEST_ID)}&select=*`,
      { headers: HEADERS }
    );
    const selectText = await selectRes.text();
    if (!selectRes.ok) {
      logStep("SELECT (قراءة)", false, `HTTP ${selectRes.status} — ${selectText}`);
      return false;
    }
    const selected = JSON.parse(selectText);
    if (!selected || selected.length === 0) {
      logStep("SELECT (قراءة)", false, "لم يتم العثور على السجل بعد إنشائه!");
      return false;
    }
    logStep("SELECT (قراءة)", true, `تمت قراءة السجل بنجاح: "${selected[0].name}" | قيمة العقد: ${selected[0].contract_value} | نسبة الإنجاز: ${selected[0].actual_progress}%`);
  } catch (err) {
    logStep("SELECT (قراءة)", false, `استثناء أثناء القراءة: ${err.message}`);
    return false;
  }

  // 3. UPDATE
  try {
    const updatePayload = {
      actual_progress: 60,
      status: "delayed",
      notes: "تم تعديل السجل بنجاح خلال فحص الاتصال",
    };
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?id=eq.${encodeURIComponent(TEST_ID)}`,
      {
        method: "PATCH",
        headers: HEADERS,
        body: JSON.stringify(updatePayload),
      }
    );
    const updateText = await updateRes.text();
    if (!updateRes.ok) {
      logStep("UPDATE (تعديل)", false, `HTTP ${updateRes.status} — ${updateText}`);
      return false;
    }
    const updated = JSON.parse(updateText);
    logStep("UPDATE (تعديل)", true, `تم التعديل بنجاح! نسبة الإنجاز الجديدة: ${updated[0]?.actual_progress}% | الحالة: ${updated[0]?.status}`);
  } catch (err) {
    logStep("UPDATE (تعديل)", false, `استثناء أثناء التعديل: ${err.message}`);
    return false;
  }

  // 4. DELETE
  try {
    const deleteRes = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?id=eq.${encodeURIComponent(TEST_ID)}`,
      {
        method: "DELETE",
        headers: { ...HEADERS, Prefer: "return=representation" },
      }
    );
    const deleteText = await deleteRes.text();
    if (!deleteRes.ok) {
      logStep("DELETE (حذف)", false, `HTTP ${deleteRes.status} — ${deleteText}`);
      return false;
    }
    logStep("DELETE (حذف)", true, "تم حذف السجل التجريبي بنجاح.");

    // تأكيد الحذف
    const verifyRes = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?id=eq.${encodeURIComponent(TEST_ID)}`,
      { headers: HEADERS }
    );
    const verifyData = await verifyRes.json();
    if (verifyData.length === 0) {
      logStep("تأكيد الحذف", true, "تأكيد: السجل غير موجود بقاعدة البيانات بعد الحذف.");
    } else {
      logStep("تأكيد الحذف", false, "تحذير: السجل لا يزال موجوداً بعد طلب الحذف!");
    }
  } catch (err) {
    logStep("DELETE (حذف)", false, `استثناء أثناء الحذف: ${err.message}`);
    return false;
  }

  return true;
}

// ──────────────────────────────────────────────────────────────
// 3. فحص الجداول المساندة والمستخدمين
// ──────────────────────────────────────────────────────────────
async function testOtherTables() {
  printSection("3. فحص الجداول التكميلية وجداول المستخدمين والإعدادات");

  const tables = [
    { name: "user_accounts", desc: "جدول حسابات المستخدمين", select: "id,username,role,status" },
    { name: "progress_reports", desc: "جدول تقارير المتابعة الميدانية", select: "id,project_id,actual_progress" },
    { name: "monthly_reports", desc: "جدول التقارير الشهرية للمشاريع", select: "id,project_id,project_name" },
    { name: "system_settings", desc: "جدول إعدادات النظام", select: "key,updated_at" },
  ];

  for (const t of tables) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${t.name}?select=${t.select}&limit=5`, {
        headers: HEADERS,
      });
      const text = await res.text();
      if (!res.ok) {
        logStep(t.name, false, `HTTP ${res.status} — ${text}`);
      } else {
        const data = JSON.parse(text);
        logStep(t.name, true, `متاح للقراءة (Anon) — عدد السجلات المسترجعة: ${data.length} (${t.desc})`);
        if (t.name === "user_accounts" && data.length > 0) {
          const userList = data.map(u => `${u.username} (${u.role})`).join("، ");
          console.log(`   👥 الحسابات المسجلة: ${userList}`);
        }
      }
    } catch (e) {
      logStep(t.name, false, `استثناء: ${e.message}`);
    }
  }
}

// ──────────────────────────────────────────────────────────────
// التنفيذ الرئيسي
// ──────────────────────────────────────────────────────────────
(async () => {
  console.log("\n╔═════════════════════════════════════════════════════════════════╗");
  console.log("║     🔬 فحص اتصال وتكامل قاعدة بيانات Supabase الشامل           ║");
  console.log("║     🏢 مديرية ماء محافظة الأنبار - برنامج متابعة المشاريع        ║");
  console.log("╚═════════════════════════════════════════════════════════════════╝");
  console.log(`🌐 عنوان السيرفر: ${SUPABASE_URL}`);
  console.log(`🔑 المفتاح المستخدم: ${SUPABASE_ANON_KEY.substring(0, 25)}...`);

  const netOk = await testNetwork();
  if (!netOk) {
    console.log("\n❌ فشل الاتصال بالشبكة الأساسية. تم إيقاف باقي الاختبارات.");
    process.exit(1);
  }

  const crudOk = await testCrud();
  await testOtherTables();

  console.log("\n" + "═".repeat(60));
  if (crudOk) {
    console.log("🎉 الخلاصة: الاتصال والعمليات (CRUD) على جدول المشاريع تعمل بنجاح 100%!");
  } else {
    console.log("⚠️ الخلاصة: توجد مشكلات في بعض العمليات، يرجى مراجعة تفاصيل التقرير أعلاه.");
  }
  console.log("═".repeat(60) + "\n");
})();
