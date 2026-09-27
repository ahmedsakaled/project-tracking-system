import { getSystemSettingsFromSupabase, saveSystemSettingsToSupabase } from "./supabase-db";

export interface SystemSettings {
  showContractValueInCompletedProjects: boolean;
  showContractValueInOngoingProjects: boolean;
}

const SETTINGS_KEY = "anbar_water_system_settings_v1";

const DEFAULT_SETTINGS: SystemSettings = {
  showContractValueInCompletedProjects: true,
  showContractValueInOngoingProjects: true,
};

export function getSystemSettings(): SystemSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.warn("Failed to read system settings:", err);
    return DEFAULT_SETTINGS;
  }
}

/** Sync system settings with Supabase database */
export async function syncSystemSettingsWithSupabase(): Promise<SystemSettings> {
  const current = getSystemSettings();
  try {
    const remote = await getSystemSettingsFromSupabase();
    if (remote && Object.keys(remote).length > 0) {
      const merged = { ...current, ...remote };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("system-settings-changed"));
      }
      return merged;
    }
  } catch (err) {
    console.warn("Failed to sync system settings from Supabase:", err);
  }
  return current;
}

export function saveSystemSettings(newSettings: Partial<SystemSettings>): SystemSettings {
  const current = getSystemSettings();
  const updated = { ...current, ...newSettings };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("system-settings-changed"));
  } catch (err) {
    console.warn("Failed to save system settings:", err);
  }

  // Background Sync to Supabase
  Object.entries(newSettings).forEach(([k, v]) => {
    saveSystemSettingsToSupabase(k, v);
  });

  return updated;
}
