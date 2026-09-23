import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_SUPABASE = 'dpaschoal_supabase_config';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  source: 'env' | 'custom' | 'none';
}

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

/**
 * Automatically cleans and formats a Supabase URL.
 * Handles common user mistakes:
 * - Pasting dashboard URL from browser: https://supabase.com/dashboard/project/abcxyz...
 * - Pasting with /rest/v1, /settings/api or trailing slashes
 * - Pasting only the project reference
 * - Surrounding quotes or whitespace
 */
export function sanitizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim().replace(/^["']|["']$/g, '');

  // If user pasted the dashboard URL from browser:
  // e.g. https://supabase.com/dashboard/project/dpmzomwdfbvhilkwchuh/settings/api
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // If user pasted only the project ref (alphanumeric, ~15-30 chars)
  if (/^[a-z0-9]{15,30}$/i.test(url)) {
    return `https://${url}.supabase.co`;
  }

  // Add https:// if missing
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    // Project API URL is always origin only (no subpaths like /rest/v1 or /settings)
    // e.g. https://dpmzomwdfbvhilkwchuh.supabase.co
    if (parsed.hostname.endsWith('.supabase.co')) {
      return `${parsed.protocol}//${parsed.hostname}`;
    }
    // Custom domain or self-hosted: preserve host and protocol only
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  }
}

export function sanitizeSupabaseKey(rawKey: string): string {
  if (!rawKey) return '';
  return rawKey.trim().replace(/^["']|["']$/g, '');
}

/**
 * Detects if the user accidentally swapped URL and API key.
 */
export function detectAndFixSwappedCredentials(
  urlInput: string,
  keyInput: string
): { url: string; anonKey: string; wasSwapped: boolean } {
  const trimmedUrl = (urlInput || '').trim();
  const trimmedKey = (keyInput || '').trim();

  // If the 'url' looks like a JWT (starts with eyJ and has 3 parts separated by dots)
  if (trimmedUrl.startsWith('eyJ') && (trimmedKey.includes('http') || trimmedKey.includes('supabase') || /^[a-z0-9]{15,30}$/i.test(trimmedKey))) {
    return {
      url: sanitizeSupabaseUrl(trimmedKey),
      anonKey: sanitizeSupabaseKey(trimmedUrl),
      wasSwapped: true,
    };
  }

  return {
    url: sanitizeSupabaseUrl(trimmedUrl),
    anonKey: sanitizeSupabaseKey(trimmedKey),
    wasSwapped: false,
  };
}

/**
 * Returns current Supabase config from env vars or localStorage.
 */
export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = sanitizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || '');
  const envKey = sanitizeSupabaseKey(import.meta.env.VITE_SUPABASE_ANON_KEY || '');

  if (envUrl && envKey && !envUrl.includes('your-project')) {
    return {
      url: envUrl,
      anonKey: envKey,
      source: 'env',
    };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY_SUPABASE);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        const cleanUrl = sanitizeSupabaseUrl(parsed.url);
        const cleanKey = sanitizeSupabaseKey(parsed.anonKey);
        return {
          url: cleanUrl,
          anonKey: cleanKey,
          source: 'custom',
        };
      }
    }
  } catch (e) {
    console.error('Failed to read Supabase config from localStorage', e);
  }

  return {
    url: '',
    anonKey: '',
    source: 'none',
  };
}

/**
 * Returns true if Supabase URL and anon key are available.
 */
export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey);
}

/**
 * Gets or creates the Supabase client instance.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  // Reuse client if config hasn't changed
  if (cachedClient && lastUrl === config.url && lastKey === config.anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    lastUrl = config.url;
    lastKey = config.anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Saves custom Supabase credentials to localStorage with automatic sanitization.
 */
export function saveSupabaseCredentials(url: string, anonKey: string): { url: string; anonKey: string; wasSwapped: boolean } {
  const fixed = detectAndFixSwappedCredentials(url, anonKey);
  localStorage.setItem(
    STORAGE_KEY_SUPABASE,
    JSON.stringify({ url: fixed.url, anonKey: fixed.anonKey })
  );
  cachedClient = null; // force recreate
  return fixed;
}

/**
 * Clears custom Supabase credentials from localStorage.
 */
export function clearSupabaseCredentials(): void {
  localStorage.removeItem(STORAGE_KEY_SUPABASE);
  cachedClient = null;
}

/**
 * Tests connection to Supabase by pinging the tasks table.
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; tableExists?: boolean }> {
  const client = getSupabaseClient();
  const config = getSupabaseConfig();
  if (!client || !config.url || !config.anonKey) {
    return { success: false, message: 'URL ou Chave Anon do Supabase não configurados.' };
  }

  try {
    const { data, error } = await client.from('tasks').select('id').limit(1);
    if (error) {
      if (error.message && error.message.includes('Invalid path specified in request URL')) {
        return {
          success: false,
          message: 'URL inválida! Você pode ter colado a URL do painel da web (dashboard) em vez da Project URL. A URL correta termina com ".supabase.co" (ex: https://xyz.supabase.co).',
        };
      }

      if (error.code === '42P01' || error.message.includes('relation "public.tasks" does not exist') || error.message.includes('does not exist')) {
        return {
          success: true,
          tableExists: false,
          message: 'Conectado ao Supabase! A tabela "tasks" ainda não foi criada. Acesse a aba "Script SQL" e execute o código.',
        };
      }
      return { success: false, message: `Erro ao consultar Supabase: ${error.message}` };
    }

    return {
      success: true,
      tableExists: true,
      message: `Conexão bem-sucedida! Tabela "tasks" encontrada (${data?.length ?? 0} registros consultados).`,
    };
  } catch (e: any) {
    if (e.message && e.message.includes('Invalid path specified in request URL')) {
      return {
        success: false,
        message: 'URL inválida! Certifique-se de usar a Project URL (ex: https://xyz.supabase.co) e não a URL do navegador.',
      };
    }
    return { success: false, message: e.message || 'Falha na conexão com Supabase.' };
  }
}
