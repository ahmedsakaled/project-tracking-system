// Lightweight native Supabase client (Zero extra npm package dependency required)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://swnhwhywirsvphlsifvn.supabase.co";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bmh3aHl3aXJzdnBobHNpZnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NTYzMTksImV4cCI6MjEwMTIzMjMxOX0.UZUmd3nKLH7xj0SMPnAp4d1HJqVa2aCNG1PwB4cYPfQ";

export const getSupabaseHeaders = (extraHeaders: Record<string, string> = {}) => ({
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  ...extraHeaders,
});
