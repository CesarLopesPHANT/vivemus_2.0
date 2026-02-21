import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ioysnjfyikrxgxvkigcp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlveXNuamZ5aWtyeGd4dmtpZ2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NzcyODYsImV4cCI6MjA4MjM1MzI4Nn0.4vlUay_KOdP04EQK9YYPvQAs99DUjBDocGNNEvy-jsk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
