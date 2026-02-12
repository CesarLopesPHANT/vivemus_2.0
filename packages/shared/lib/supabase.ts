
import { createClient } from '@supabase/supabase-js';

// Acessor seguro para variaveis de ambiente Vite
const env = (import.meta as any).env || {};

// Credenciais do projeto Vivemus
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://ioysnjfyikrxgxvkigcp.supabase.co';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlveXNuamZ5aWtyeGd4dmtpZ2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NzcyODYsImV4cCI6MjA4MjM1MzI4Nn0.4vlUay_KOdP04EQK9YYPvQAs99DUjBDocGNNEvy-jsk';

// Cliente publico (anon) - para operacoes do usuario logado
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente admin (service_role) - NUNCA expor a chave no frontend em producao.
// Em producao, operacoes admin devem ser feitas via Edge Functions.
const supabaseServiceRoleKey: string = env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : supabase;
