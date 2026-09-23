import { Task, Company, TaskStatus, Responsible, Sector } from '../types';
import { getSupabaseClient } from '../utils/supabaseClient';
import { sortTasks } from '../utils/taskSort';

export function dbRowToTask(row: any): Task {
  return {
    id: String(row.id),
    company: (row.company as Company) || 'DPaschoal',
    month: row.month || '',
    campaign: row.campaign || '',
    taskNumber: row.task_number || row.taskNumber || '',
    description: row.description || '',
    responsible: (row.responsible as Responsible) || 'Rafael',
    sector: (row.sector as Sector) || 'Marketing',
    durationDays: typeof row.duration_days === 'number' 
      ? row.duration_days 
      : typeof row.durationDays === 'number'
        ? row.durationDays
        : parseInt(String(row.duration_days || row.durationDays || 5), 10) || 5,
    startDate: row.start_date || row.startDate || '',
    endDate: row.end_date || row.endDate || '',
    completionDate: row.completion_date || row.completionDate || '',
    diffDays: row.diff_days !== undefined && row.diff_days !== null 
      ? Number(row.diff_days) 
      : row.diffDays !== undefined && row.diffDays !== null
        ? Number(row.diffDays)
        : null,
    status: (row.status as TaskStatus) || 'Não iniciado',
    notes: row.notes || '',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export interface SupabaseOpResult {
  success: boolean;
  error?: string;
}

export function taskToDbRow(task: Task): Record<string, any> {
  let validCreatedAt = new Date().toISOString();
  if (task.createdAt && !isNaN(Date.parse(task.createdAt))) {
    validCreatedAt = new Date(task.createdAt).toISOString();
  }

  return {
    id: String(task.id),
    company: task.company || 'DPaschoal',
    month: task.month || '',
    campaign: task.campaign || '',
    task_number: task.taskNumber || '',
    description: task.description || '',
    responsible: task.responsible || 'Todos',
    sector: task.sector || 'Marketing',
    duration_days: typeof task.durationDays === 'number' && !isNaN(task.durationDays) ? task.durationDays : 5,
    start_date: task.startDate || '',
    end_date: task.endDate || '',
    completion_date: task.completionDate || null,
    diff_days: typeof task.diffDays === 'number' && !isNaN(task.diffDays) ? task.diffDays : null,
    status: task.status || 'Não iniciado',
    notes: task.notes || null,
    created_at: validCreatedAt,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Loads all tasks from Supabase ordered naturally by company, campaign and task_number.
 */
export async function fetchTasksFromSupabase(): Promise<Task[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('tasks')
    .select('*');

  if (error) {
    console.error('Error fetching tasks from Supabase:', error);
    throw error;
  }

  if (!data) return [];
  const tasks = data.map(dbRowToTask);
  return sortTasks(tasks);
}

/**
 * Loads all campaigns from Supabase.
 */
export async function fetchCampaignsFromSupabase(): Promise<string[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('campaigns')
    .select('name')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching campaigns from Supabase:', error);
    throw error;
  }

  if (!data || data.length === 0) return [];
  return data.map((c: any) => c.name).filter(Boolean);
}

/**
 * Upserts a single task in Supabase.
 */
export async function upsertTaskToSupabase(task: Task): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const row = taskToDbRow(task);
  const { error } = await client
    .from('tasks')
    .upsert(row, { onConflict: 'id' });

  if (error) {
    console.error('Error upserting task in Supabase:', error);
    return false;
  }
  return true;
}

/**
 * Batch upserts tasks to Supabase (e.g. initial seed or sync).
 */
export async function upsertTasksBatchToSupabase(tasks: Task[]): Promise<SupabaseOpResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Credenciais do Supabase não configuradas no app.' };
  }

  const rows = tasks.map(taskToDbRow);
  // Send in chunks of 50 to avoid payload limits
  const CHUNK_SIZE = 50;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await client
      .from('tasks')
      .upsert(chunk, { onConflict: 'id' });

    if (error) {
      console.error(`Error upserting chunk ${i}-${i + CHUNK_SIZE} to Supabase:`, error);
      return { 
        success: false, 
        error: error.message || error.details || error.hint || 'Falha ao salvar tarefas no banco Supabase.' 
      };
    }
  }
  return { success: true };
}

/**
 * Deletes a task from Supabase by ID.
 */
export async function deleteTaskFromSupabase(taskId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting task from Supabase:', error);
    return false;
  }
  return true;
}

/**
 * Upserts a campaign to Supabase.
 */
export async function upsertCampaignToSupabase(name: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !name.trim()) return false;

  const { error } = await client
    .from('campaigns')
    .upsert({ name: name.trim() }, { onConflict: 'name' });

  if (error) {
    console.error('Error upserting campaign to Supabase:', error);
    return false;
  }
  return true;
}

/**
 * Batch upserts campaigns.
 */
export async function upsertCampaignsBatchToSupabase(campaigns: string[]): Promise<SupabaseOpResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Credenciais do Supabase não configuradas.' };
  }

  const rows = campaigns
    .map((name) => ({ name: String(name).trim() }))
    .filter((c) => Boolean(c.name));

  if (rows.length === 0) return { success: true };

  const { error } = await client
    .from('campaigns')
    .upsert(rows, { onConflict: 'name' });

  if (error) {
    console.error('Error batch upserting campaigns:', error);
    return { 
      success: false, 
      error: error.message || error.details || error.hint || 'Falha ao salvar campanhas no banco Supabase.' 
    };
  }
  return { success: true };
}

/**
 * Deletes a campaign from Supabase.
 */
export async function deleteCampaignFromSupabase(name: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !name.trim()) return false;

  const { error } = await client
    .from('campaigns')
    .delete()
    .eq('name', name.trim());

  if (error) {
    console.error('Error deleting campaign from Supabase:', error);
    return false;
  }
  return true;
}

/**
 * Subscribes to Realtime changes on both `tasks` and `campaigns` tables.
 */
export function subscribeToSupabaseRealtime(
  onTaskChange: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; task?: Task; oldId?: string }) => void,
  onCampaignChange: () => void
): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;

  const channel = client
    .channel('dpaschoal-realtime-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks' },
      (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const task = dbRowToTask(payload.new);
          onTaskChange({ eventType: payload.eventType, task });
        } else if (payload.eventType === 'DELETE') {
          const oldId = payload.old?.id;
          if (oldId) {
            onTaskChange({ eventType: 'DELETE', oldId: String(oldId) });
          }
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'campaigns' },
      () => {
        onCampaignChange();
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
