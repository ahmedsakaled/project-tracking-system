import { SUPABASE_URL, getSupabaseHeaders } from "./supabase";
import type { Project } from "./mock-data";

// ─── Helpers to convert between CamelCase (JS) and SnakeCase (DB) ─────────────
const mapProjectToDb = (p: Partial<Project>) => ({
  id: p.id,
  name: p.name,
  title: p.name,
  cost: p.contractValue ?? 0,
  progress: p.actualProgress ?? 0,
  finish: p.plannedEndDate || "",
  img: "",
  description: p.notes || "",
  location: p.location,
  district: p.district,
  sub_district: p.subDistrict,
  contractor: p.contractor,
  center_name: p.centerName,
  funding_source: p.fundingSource,
  referral_method: p.referralMethod,
  referral_no: p.referralNo || null,
  referral_date: p.referralDate || null,
  contract_no: p.contractNo,
  contract_date: p.contractDate || null,
  contract_value: p.contractValue,
  duration_days: p.durationDays,
  start_date: p.startDate || null,
  planned_end_date: p.plannedEndDate || null,
  expected_end_date: p.expectedEndDate || null,
  planned_progress: p.plannedProgress ?? 0,
  actual_progress: p.actualProgress ?? 0,
  status: p.status || "ongoing",
  lat: p.lat,
  lng: p.lng,
  type: p.type || "water_tank",
  contract_type: p.contractType,
  actual_start_date: p.actualStartDate || null,
  resume_start_date: p.resumeStartDate || null,
  suspension_date: p.suspensionDate || null,
  suspension_duration: p.suspensionDuration,
  actual_execution_duration: p.actualExecutionDuration,
  additional_duration: p.additionalDuration,
  contract_duration_after_resume: p.contractDurationAfterResume,
  contractual_completion_date: p.contractualCompletionDate || null,
  completion_date_after_additional: p.completionDateAfterAdditional || null,
  initial_handover_order_no: p.initialHandoverOrderNo || null,
  initial_handover_order_date: p.initialHandoverOrderDate || null,
  initial_handover_date: p.initialHandoverDate || null,
  initial_handover_committee: p.initialHandoverCommittee || [],
  initial_handover_notes: p.initialHandoverNotes || null,
  final_handover_order_no: p.finalHandoverOrderNo || null,
  final_handover_order_date: p.finalHandoverOrderDate || null,
  final_handover_date: p.finalHandoverDate || null,
  final_handover_committee: p.finalHandoverCommittee || [],
  final_handover_notes: p.finalHandoverNotes || null,
  remaining_duration_from_resume: p.remainingDurationFromResume,
  remaining_duration_from_report: p.remainingDurationFromReport,
  delay_reasons: p.delayReasons,
  change_orders_count: p.changeOrdersCount ?? (p.changeOrdersList ? p.changeOrdersList.length : 0),
  change_order_no_and_date: p.changeOrderNoAndDate,
  change_order_single_amount: p.changeOrderSingleAmount ?? 0,
  change_orders_total_amount: p.changeOrdersTotalAmount ?? 0,
  change_orders_list: p.changeOrdersList || [],
  currency: p.currency || "IQD",
  work_cost: p.workCost ?? 0,
  disbursed_work: p.disbursedWork ?? 0,
  total_disbursed: p.totalDisbursed ?? 0,
  estimated_cost: p.estimatedCost ?? 0,
  amount: p.amount ?? 0,
  local_staff_count: p.localStaffCount ?? 0,
  foreign_staff_count: p.foreignStaffCount ?? 0,
  executed_works_period: p.executedWorksPeriod,
  delivered_equipment_period: p.deliveredEquipmentPeriod,
  notes: p.notes,
  problems_obstacles_solutions: p.problemsObstaclesSolutions,
  suspension_dates_reasons: p.suspensionDatesReasons,
  resident_engineer_opinion: p.residentEngineerOpinion,
  resident_engineer_id: (p as any).residentEngineerId,
  resident_engineer_name: (p as any).residentEngineerName,
  resident_engineer_phone: p.residentEngineerPhone,
  selected_supervisors: p.selectedSupervisors || [],
});

const mapDbToProject = (row: any): Project => ({
  id: String(row.id || ""),
  name: String(row.name || row.title || ""),
  location: String(row.location || ""),
  district: String(row.district || ""),
  subDistrict: String(row.sub_district || ""),
  contractor: String(row.contractor || ""),
  centerName: String(row.center_name || ""),
  fundingSource: String(row.funding_source || ""),
  referralMethod: String(row.referral_method || ""),
  referralNo: String(row.referral_no || ""),
  referralDate: String(row.referral_date || ""),
  contractNo: String(row.contract_no || ""),
  contractDate: String(row.contract_date || ""),
  contractValue: Number(row.contract_value || 0),
  currency: (row.currency === "USD" ? "USD" : "IQD") as "IQD" | "USD",
  durationDays: Number(row.duration_days || 0),
  startDate: String(row.start_date || ""),
  plannedEndDate: String(row.planned_end_date || ""),
  expectedEndDate: String(row.expected_end_date || ""),
  plannedProgress: Number(row.planned_progress || 0),
  actualProgress: Number(row.actual_progress || 0),
  status: (row.status || "ongoing") as any,
  lat: (row.lat != null && row.lat !== 0) ? Number(row.lat) : 0,
  lng: (row.lng != null && row.lng !== 0) ? Number(row.lng) : 0,
  type: row.type || "water_tank",
  contractType: String(row.contract_type || ""),
  actualStartDate: String(row.actual_start_date || ""),
  resumeStartDate: String(row.resume_start_date || ""),
  suspensionDate: String(row.suspension_date || ""),
  suspensionDuration: String(row.suspension_duration || ""),
  actualExecutionDuration: String(row.actual_execution_duration || ""),
  additionalDuration: String(row.additional_duration || ""),
  contractDurationAfterResume: String(row.contract_duration_after_resume || ""),
  contractualCompletionDate: String(row.contractualCompletionDate || row.contractual_completion_date || ""),
  completionDateAfterAdditional: String(row.completion_date_after_additional || ""),
  initialHandoverOrderNo: String(row.initial_handover_order_no || ""),
  initialHandoverOrderDate: String(row.initial_handover_order_date || ""),
  initialHandoverDate: String(row.initial_handover_date || ""),
  initialHandoverCommittee: Array.isArray(row.initial_handover_committee) ? row.initial_handover_committee : [],
  initialHandoverNotes: String(row.initial_handover_notes || ""),
  finalHandoverOrderNo: String(row.final_handover_order_no || ""),
  finalHandoverOrderDate: String(row.final_handover_order_date || ""),
  finalHandoverDate: String(row.final_handover_date || ""),
  finalHandoverCommittee: Array.isArray(row.final_handover_committee) ? row.final_handover_committee : [],
  finalHandoverNotes: String(row.final_handover_notes || ""),
  remainingDurationFromResume: String(row.remaining_duration_from_resume || ""),
  remainingDurationFromReport: String(row.remaining_duration_from_report || ""),
  delayReasons: String(row.delay_reasons || ""),
  changeOrdersCount: row.change_orders_count ?? (Array.isArray(row.change_orders_list) ? row.change_orders_list.length : 0),
  changeOrderNoAndDate: String(row.change_order_no_and_date || ""),
  changeOrderSingleAmount: Number(row.change_order_single_amount || 0),
  changeOrdersTotalAmount: Number(row.change_orders_total_amount || 0),
  changeOrdersList: Array.isArray(row.change_orders_list) ? row.change_orders_list : [],
  workCost: Number(row.work_cost || 0),
  disbursedWork: Number(row.disbursed_work || 0),
  totalDisbursed: Number(row.total_disbursed || 0),
  estimatedCost: Number(row.estimated_cost || 0),
  amount: Number(row.amount || 0),
  localStaffCount: Number(row.local_staff_count || 0),
  foreignStaffCount: Number(row.foreign_staff_count || 0),
  executedWorksPeriod: String(row.executed_works_period || ""),
  deliveredEquipmentPeriod: String(row.delivered_equipment_period || ""),
  notes: String(row.notes || ""),
  problemsObstaclesSolutions: String(row.problems_obstacles_solutions || ""),
  suspensionDatesReasons: String(row.suspension_dates_reasons || ""),
  residentEngineerOpinion: String(row.resident_engineer_opinion || ""),
  residentEngineerId: String(row.resident_engineer_id || ""),
  residentEngineerName: String(row.resident_engineer_name || ""),
  residentEngineerPhone: String(row.resident_engineer_phone || ""),
  selectedSupervisors: Array.isArray(row.selected_supervisors)
    ? row.selected_supervisors
    : typeof row.selected_supervisors === "string"
    ? JSON.parse(row.selected_supervisors)
    : [],
  createdAt: row.created_at || new Date().toISOString(),
  updatedAt: row.updated_at || new Date().toISOString(),
} as any);

// ─── API Functions via Native Fetch ──────────────────────────────────────────

/** Fetch all projects from Supabase REST API */
export async function getProjectsFromSupabase(): Promise<Project[] | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/projects?select=*&order=created_at.desc`, {
      headers: getSupabaseHeaders(),
    });

    if (!res.ok) {
      console.warn("Supabase fetch projects error status:", res.status);
      return null;
    }

    const data = await res.json();
    if (!Array.isArray(data)) return null;
    console.info(`[Supabase] تم جلب ${data.length} مشروع من قاعدة البيانات بنجاح.`);
    return data.map(mapDbToProject);
  } catch (err) {
    console.warn("Supabase fetch exception:", err);
    return null;
  }
}

/** Insert or update a project in Supabase REST API */
export async function saveProjectToSupabase(project: Project): Promise<boolean> {
  try {
    let payload = { ...mapProjectToDb(project) };

    for (let attempt = 0; attempt < 8; attempt++) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
        method: "POST",
        headers: getSupabaseHeaders({
          "Prefer": "resolution=merge-duplicates,return=minimal",
        }),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        console.info(`[Supabase] تم حفظ المشروع ${project.name} (${project.id}) بنجاح.`);
        return true;
      }

      const errText = await res.text();
      console.warn(`[Supabase] محاولة حفظ المشروع ${attempt + 1} فشلت (${res.status}):`, errText);

      // 1. Detect missing column from PostgREST error message
      const colMatch = errText.match(/Could not find the '([^']+)' column/i);
      if (colMatch && colMatch[1]) {
        const col = colMatch[1];
        console.warn(`[Supabase] استبعاد العمود غير الموجود '${col}' وإعادة المحاولة...`);
        delete payload[col];
        continue;
      }

      // 2. If 400 Bad Request on first attempt, shed optional columns that might not exist yet
      if (attempt === 0) {
        delete payload.initial_handover_order_no;
        delete payload.initial_handover_order_date;
        delete payload.referral_no;
        delete payload.referral_date;
        delete payload.referral_method;
        delete payload.center_name;
        delete payload.funding_source;
        delete payload.contract_type;
        delete payload.contract_date;
        continue;
      }

      break;
    }

    return false;
  } catch (err) {
    console.error("Exception saving project to Supabase:", err);
    return false;
  }
}

/** Delete a project from Supabase REST API */
export async function deleteProjectFromSupabase(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: getSupabaseHeaders(),
    });

    return res.ok;
  } catch (err) {
    console.error("Exception deleting project from Supabase:", err);
    return false;
  }
}

/** Delete a progress report from Supabase REST API */
export async function deleteProgressReportFromSupabase(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/progress_reports?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: getSupabaseHeaders(),
    });

    return res.ok;
  } catch (err) {
    console.error("Exception deleting progress report from Supabase:", err);
    return false;
  }
}


/** Fetch all progress reports */
export async function getProgressReportsFromSupabase(projectId?: string): Promise<any[] | null> {
  try {
    let url = `${SUPABASE_URL}/rest/v1/progress_reports?select=*&order=date.desc`;
    if (projectId) {
      url += `&project_id=eq.${encodeURIComponent(projectId)}`;
    }
    const res = await fetch(url, { headers: getSupabaseHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return data.map(r => ({
      id: r.id,
      projectId: r.project_id,
      date: r.date,
      engineer: r.engineer,
      actualProgress: Number(r.actual_progress || 0),
      status: r.status,
      completedWorks: r.completed_works,
      upcomingWorks: r.upcoming_works,
      weather: r.weather,
      labour: r.labour,
      equipment: r.equipment,
      obstacles: r.obstacles,
      obstaclesText: r.obstacles_text,
      materials: r.materials,
      lat: r.lat,
      lng: r.lng,
      notes: r.notes,
      photos: r.photos,
      files: r.files,
    }));
  } catch {
    return null;
  }
}

/** Save a progress report in Supabase REST API */
export async function saveProgressReportToSupabase(report: any): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/progress_reports`, {
      method: "POST",
      headers: getSupabaseHeaders({
        "Prefer": "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify({
        id: report.id,
        project_id: report.projectId,
        date: report.date || new Date().toISOString().split("T")[0],
        engineer: report.engineer,
        actual_progress: report.actualProgress,
        status: report.status || "ongoing",
        completed_works: report.completedWorks,
        upcoming_works: report.upcomingWorks,
        weather: report.weather,
        labour: report.labour,
        equipment: report.equipment,
        obstacles: report.obstacles,
        obstacles_text: report.obstaclesText,
        materials: report.materials,
        notes: report.notes,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Delete a monthly report from Supabase REST API */
export async function deleteMonthlyReportFromSupabase(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/monthly_reports?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: getSupabaseHeaders(),
    });
    return res.ok;
  } catch (err) {
    console.error("Exception deleting monthly report from Supabase:", err);
    return false;
  }
}

/** Fetch all monthly reports from Supabase REST API */
export async function getMonthlyReportsFromSupabase(): Promise<any[] | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/monthly_reports?select=*&order=created_at.desc`, {
      headers: getSupabaseHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return data.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      projectName: r.project_name,
      contractNo: r.contract_no,
      projectType: r.project_type,
      centerName: r.center_name,
      year: r.year,
      month: r.month,
      reportNo: r.report_no,
      date: r.date,
      residentEngineer: r.resident_engineer,
      residentEngineerPhone: r.resident_engineer_phone,
      selectedSupervisors: r.selected_supervisors,
      contractor: r.contractor,
      location: r.location,
      district: r.district,
      subDistrict: r.sub_district,
      fundingSource: r.funding_source,
       referralMethod: r.referral_method,
      contractDate: r.contract_date,
      initialHandoverOrderNo: r.initial_handover_order_no,
      initialHandoverOrderDate: r.initial_handover_order_date,
      initialHandoverDate: r.initial_handover_date,
      initialHandoverCommittee: r.initial_handover_committee,
      initialHandoverNotes: r.initial_handover_notes,
      finalHandoverOrderNo: r.final_handover_order_no,
      finalHandoverOrderDate: r.final_handover_order_date,
      finalHandoverDate: r.final_handover_date,
      finalHandoverCommittee: r.final_handover_committee,
      finalHandoverNotes: r.final_handover_notes,
      contractValue: Number(r.contract_value || 0),
      changeOrdersCount: Number(r.change_orders_count || 0),
      changeOrdersTotalAmount: Number(r.change_orders_total_amount || 0),
      workCost: Number(r.work_cost || 0),
      durationDays: Number(r.duration_days || 0),
      startDate: r.start_date,
      additionalDuration: r.additional_duration,
      completionDateAfterAdditional: r.completion_date_after_additional,
      plannedProgress: Number(r.planned_progress || 0),
      actualProgress: Number(r.actual_progress || 0),
      labourCount: Number(r.labour_count || 0),
      weather: r.weather,
      executedWorks: r.executed_works || "",
      materialsDelivered: r.materials_delivered || "",
      obstaclesAndNotes: r.obstacles_and_notes || "",
      status: r.status || "approved",
      photos: r.photos || [],
      createdAt: r.created_at,
    }));
  } catch {
    return null;
  }
}

/** Save a monthly report to Supabase REST API */
export async function saveMonthlyReportToSupabase(report: any): Promise<boolean> {
  try {
    const payload: Record<string, any> = {
      id: report.id,
      project_id: report.projectId,
      project_name: report.projectName,
      contract_no: report.contractNo,
      project_type: report.projectType,
      center_name: report.centerName,
      year: report.year,
      month: report.month,
      report_no: report.reportNo,
      date: report.date || new Date().toISOString().split("T")[0],
      resident_engineer: report.residentEngineer,
      resident_engineer_phone: report.residentEngineerPhone,
      selected_supervisors: report.selectedSupervisors || [],
      contractor: report.contractor,
      location: report.location,
      district: report.district,
      sub_district: report.subDistrict,
      funding_source: report.fundingSource,
      referral_method: report.referralMethod,
      contract_date: report.contractDate || null,
      initial_handover_order_no: report.initialHandoverOrderNo || null,
      initial_handover_order_date: report.initialHandoverOrderDate || null,
      initial_handover_date: report.initialHandoverDate || null,
      initial_handover_committee: report.initialHandoverCommittee || [],
      initial_handover_notes: report.initialHandoverNotes,
      final_handover_order_no: report.finalHandoverOrderNo || null,
      final_handover_order_date: report.finalHandoverOrderDate || null,
      final_handover_date: report.finalHandoverDate || null,
      final_handover_committee: report.finalHandoverCommittee || [],
      final_handover_notes: report.finalHandoverNotes,
      contract_value: report.contractValue || 0,
      change_orders_count: report.changeOrdersCount || 0,
      change_orders_total_amount: report.changeOrdersTotalAmount || 0,
      work_cost: report.workCost || 0,
      duration_days: report.durationDays || 360,
      start_date: report.startDate || null,
      additional_duration: report.additionalDuration,
      completion_date_after_additional: report.completionDateAfterAdditional || null,
      planned_progress: report.plannedProgress || 0,
      actual_progress: report.actualProgress || 0,
      labour_count: report.labourCount || 0,
      weather: report.weather,
      executed_works: report.executedWorks,
      materials_delivered: report.materialsDelivered,
      obstacles_and_notes: report.obstaclesAndNotes,
      status: report.status || "approved",
      photos: report.photos || [],
    };

    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/monthly_reports`, {
        method: "POST",
        headers: getSupabaseHeaders({
          "Prefer": "resolution=merge-duplicates,return=minimal",
        }),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        return true;
      }

      const errText = await res.text();
      const colMatch = errText.match(/Could not find the '([^']+)' column/i);
      if (colMatch && colMatch[1]) {
        const col = colMatch[1];
        console.warn(`[Supabase] استبعاد العمود غير الموجود '${col}' من التقرير الشهري وإعادة المحاولة...`);
        delete payload[col];
        continue;
      }

      console.warn(`[Supabase] فشل حفظ التقرير الشهري (${res.status}):`, errText);
      break;
    }

    return false;
  } catch (err) {
    console.error("Exception saving monthly report to Supabase:", err);
    return false;
  }
}

/** Fetch user_accounts from Supabase REST API */
export async function getUsersFromSupabase(): Promise<any[] | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_accounts?select=*`, {
      headers: getSupabaseHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return data.map((u: any) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      email: u.email,
      password: u.password || "",
      role: u.role || "resident_engineer",
      status: u.status || "active",
      allowedPages: Array.isArray(u.allowed_pages) ? u.allowed_pages : ["/", "/projects", "/reports"],
      phone: u.phone || "",
      department: u.department || "",
      createdAt: u.created_at || new Date().toISOString(),
      lastLogin: u.last_login || "",
    }));
  } catch (err) {
    console.error("Exception fetching user_accounts from Supabase:", err);
    return null;
  }
}

/** Save/Upsert user_account to Supabase REST API */
export async function saveUserToSupabase(user: any): Promise<boolean> {
  const body = JSON.stringify({
    id: user.id,
    name: user.name || user.username || "مستخدم",
    username: user.username,
    email: user.email || `${(user.username || "user").trim().toLowerCase()}@anbar-water.gov.iq`,
    password: user.password || null,
    role: user.role || "resident_engineer",
    status: user.status || "active",
    allowed_pages: user.allowedPages || [],
    phone: user.phone || null,
    department: user.department || null,
    updated_at: new Date().toISOString(),
  });

  try {
    // Step 1: Try PATCH (update) by username – handles existing rows regardless of id
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_accounts?username=eq.${encodeURIComponent(user.username)}`,
      {
        method: "PATCH",
        headers: getSupabaseHeaders({ "Prefer": "return=representation" }),
        body,
      }
    );
    if (patchRes.ok) {
      const patched = await patchRes.json().catch(() => []);
      if (Array.isArray(patched) && patched.length > 0) {
        return true; // updated successfully
      }
    }

    // Step 2: No existing row found → INSERT new record
    const postRes = await fetch(`${SUPABASE_URL}/rest/v1/user_accounts`, {
      method: "POST",
      headers: getSupabaseHeaders({ "Prefer": "return=minimal" }),
      body,
    });
    return postRes.ok;
  } catch (err) {
    console.error("Exception saving user to Supabase:", err);
    return false;
  }
}

/** Delete user_account from Supabase REST API */
export async function deleteUserFromSupabase(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_accounts?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: getSupabaseHeaders({
        "Prefer": "return=minimal",
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("Exception deleting user from Supabase:", err);
    return false;
  }
}

/** Fetch system_settings from Supabase REST API */
export async function getSystemSettingsFromSupabase(): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/system_settings?select=*`, {
      headers: getSupabaseHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    const result: Record<string, any> = {};
    data.forEach((row: any) => {
      if (row && row.key) {
        result[row.key] = row.value;
      }
    });
    return result;
  } catch {
    return null;
  }
}

/** Save/Upsert system_settings key to Supabase REST API */
export async function saveSystemSettingsToSupabase(key: string, value: any): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/system_settings`, {
      method: "POST",
      headers: getSupabaseHeaders({
        "Prefer": "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify({
        key,
        value,
        updated_at: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Fetch system activities from Supabase REST API */
export async function getActivitiesFromSupabase(): Promise<any[] | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/system_activities?select=*&order=timestamp.desc&limit=200`, {
      headers: getSupabaseHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return data.map((row: any) => ({
      id: row.id,
      actionType: row.action_type || row.actionType,
      category: row.category,
      title: row.title,
      description: row.description,
      userName: row.user_name || row.userName,
      userRole: row.user_role || row.userRole,
      userAvatar: row.user_avatar || row.userAvatar,
      timestamp: row.timestamp,
      formattedDate: row.formatted_date || row.formattedDate,
      details: row.details || {},
    }));
  } catch {
    return null;
  }
}

/** Save a system activity to Supabase REST API */
export async function saveActivityToSupabase(activity: any): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/system_activities`, {
      method: "POST",
      headers: getSupabaseHeaders({
        "Prefer": "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify({
        id: activity.id,
        action_type: activity.actionType,
        category: activity.category,
        title: activity.title,
        description: activity.description,
        user_name: activity.userName,
        user_role: activity.userRole,
        user_avatar: activity.userAvatar,
        timestamp: activity.timestamp,
        formatted_date: activity.formattedDate,
        details: activity.details || {},
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

