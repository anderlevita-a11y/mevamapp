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

// Utility to clear any stale or corrupted Supabase auth tokens from client storage
export const clearStaleSupabaseSession = () => {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (_) {}
    });

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token'))) {
        sessionStorage.removeItem(key);
      }
    }
  } catch (_) {}
};

// Intercept benign GoTrue "Invalid Refresh Token: Refresh Token Not Found" console errors
// This prevents Supabase internal auto-refresh failures on stale tokens from breaking the application.
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const msg = args
      .map((a) => (typeof a === 'string' ? a : a?.message || (typeof a?.toString === 'function' ? a.toString() : '')))
      .join(' ');

    if (
      msg.includes('Invalid Refresh Token') ||
      msg.includes('Refresh Token Not Found') ||
      msg.includes('refresh_token_not_found') ||
      msg.includes('invalid_grant')
    ) {
      clearStaleSupabaseSession();
      console.warn('[Supabase Auth Guard] Sessão expirada ou token inválido limpo com segurança.');
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

if (!isSupabaseConfigured) {
  console.error('ERRO: Credenciais do Supabase não encontradas ou inválidas!');
  console.info('Certifique-se de configurar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas configurações do ambiente.');
} else {
  console.info('Supabase regulado e configurado com a URL:', supabaseUrl);
}

const safeFetch: typeof fetch = async (input, init) => {
  try {
    const res = await fetch(input, init);
    const urlStr = typeof input === 'string' ? input : input instanceof Request ? input.url : '';

    // If Supabase token endpoint returns 400 with invalid refresh token, purge local cache immediately
    if (urlStr.includes('/auth/v1/token') && !res.ok) {
      try {
        const cloned = res.clone();
        const json = await cloned.json();
        if (
          json?.error === 'invalid_grant' ||
          json?.error_description?.includes('Refresh Token Not Found') ||
          json?.message?.includes('Refresh Token Not Found') ||
          json?.msg?.includes('Refresh Token Not Found')
        ) {
          clearStaleSupabaseSession();
          console.warn('[Supabase Fetch Guard] Token de atualização inválido ou revogado. Cache de sessão limpo.');
        }
      } catch (_) {}
    }

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

// Safe sign out helper that purges local tokens before invoking signOut to prevent loop refresh errors
export const safeSignOut = async () => {
  clearStaleSupabaseSession();
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (err) {
    console.info('[Supabase Auth] Sign out local concluído:', err);
  }
};

