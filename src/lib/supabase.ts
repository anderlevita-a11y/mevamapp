import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Clean spaces and surrounding quotes that can come from copy-pasting
let supabaseUrl = rawUrl.trim().replace(/^["']|["']$/g, '');
// Automatically sanitize URL from appending /rest/v1/ or trailing slash
supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

const supabaseAnonKey = rawKey.trim().replace(/^["']|["']$/g, '');

export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') && 
  supabaseUrl.startsWith('http')
);

if (!isSupabaseConfigured) {
  console.error('ERRO: Credenciais do Supabase não encontradas ou inválidas!');
  console.info('Certifique-se de configurar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas configurações do ambiente.');
} else {
  console.info('Supabase regulado e configurado com a URL:', supabaseUrl);
}

const safeFetch: typeof fetch = async (input, init) => {
  try {
    const res = await fetch(input, init);
    return res;
  } catch (err: any) {
    console.warn('[Supabase Global Fetch Guard] Network fetch fallback:', err?.message || err);
    return new Response(
      JSON.stringify({
        message: err?.message || 'Network request failed',
        hint: 'Network connection issue or request timeout.'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder',
  {
    global: {
      fetch: safeFetch
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Bypass Web Lock API to prevent "Lock was released because another request stole it" in iframes & concurrent fetches
      lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
        return await fn();
      }
    }
  }
);
