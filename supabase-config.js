/**
 * Supabase Client Configuration
 * 
 * NOTE FOR GITHUB & SECURITY:
 * Only use the Supabase Project URL and the Public/Publishable "anon" key here.
 * NEVER paste your service_role secret key or database password!
 * 
 * You can set them directly in this file, or via the app's "Cloud Config" modal.
 */

window.SUPABASE_CONFIG = {
  // Your Supabase Project URL (public)
  url: window.localStorage.getItem('supabase_project_url') || 'https://mtoqugqjtammoxutfrnz.supabase.co',
  anonKey: window.localStorage.getItem('supabase_anon_key') || ''
};
