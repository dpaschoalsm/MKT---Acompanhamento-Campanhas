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
 * Returns current Supabase config from env vars or localStorage.
 */
export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

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
        return {
          url: parsed.url.trim(),
          anonKey: parsed.anonKey.trim(),
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
 * Saves custom Supabase credentials to localStorage.
 */
export function saveSupabaseCredentials(url: string, anonKey: string): void {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();
  localStorage.setItem(
    STORAGE_KEY_SUPABASE,
    JSON.stringify({ url: cleanUrl, anonKey: cleanKey })
  );
  cachedClient = null; // force recreate
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
  if (!client) {
    return { success: false, message: 'URL ou Chave Anon do Supabase não configurados.' };
  }

  try {
    const { data, error } = await client.from('tasks').select('id').limit(1);
    if (error) {
      if (error.code === '42P01' || error.message.includes('relation "public.tasks" does not exist') || error.message.includes('does not exist')) {
        return {
          success: true,
          tableExists: false,
          message: 'Conectado ao Supabase! A tabela "tasks" ainda não foi criada. Copie e execute o script SQL.',
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
    return { success: false, message: e.message || 'Falha na conexão com Supabase.' };
  }
}
