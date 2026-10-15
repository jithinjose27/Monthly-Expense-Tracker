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
  // Replace these with your project values from Supabase Dashboard > Project Settings > API
  // or enter them via the app UI "⚙️ Cloud Setup"
  url: window.localStorage.getItem('supabase_project_url') || '',
  anonKey: window.localStorage.getItem('supabase_anon_key') || ''
};
