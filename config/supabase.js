// Initialize Supabase client using the service role key
// The service role key bypasses RLS — safe to use ONLY on the backend
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = supabase;
