import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Supabase Config:', {
  url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'UNDEFINED',
  hasKey: !!supabaseAnonKey,
  env: import.meta.env.MODE
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente faltando:', { supabaseUrl, hasKey: !!supabaseAnonKey });
  throw new Error('Supabase URL e Anon Key devem estar definidas no arquivo .env');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
