import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://gbtozqgisxjdrjxubftq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdidG96cWdpc3hqZHJqeHViZnRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTg3MjMsImV4cCI6MjA2NjMzNDcyM30.k_y_yXVYC7aCR2wWA-cZkzr-y3tjHWxAiBMIWSBc54M';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

// Export for easy import
export default supabase; 