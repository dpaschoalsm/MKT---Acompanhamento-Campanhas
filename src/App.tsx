import React, { useState, useEffect, useMemo } from 'react';
import { 
  Company, 
  Task, 
  TaskFilterState, 
  TaskStatus 
} from './types';
import { INITIAL_TASKS, INITIAL_CAMPAIGNS } from './data/initialData';
import { calculateDiffDays, toISOFormat, calculateEndDate, getMonthAbbr, normalizeMonthLabel } from './utils/dateUtils';
import { Header } from './components/Header';
import { SpreadsheetBanner } from './components/SpreadsheetBanner';
import { FilterBar } from './components/FilterBar';
import { TaskTable } from './components/TaskTable';
import { TaskModal } from './components/TaskModal';
import { CampaignManagerModal } from './components/CampaignManagerModal';
import { DashboardView } from './components/DashboardView';
import { SupabaseModal } from './components/SupabaseModal';
import { 
  isSupabaseConfigured 
} from './utils/supabaseClient';
import {
  fetchTasksFromSupabase,
  fetchCampaignsFromSupabase,
  upsertTaskToSupabase,
  upsertTasksBatchToSupabase,
  upsertCampaignsBatchToSupabase,
  deleteTaskFromSupabase,
  upsertCampaignToSupabase,
  deleteCampaignFromSupabase,
  subscribeToSupabaseRealtime
} from './services/supabaseService';
import { sortTasks } from './utils/taskSort';

const STORAGE_KEY_TASKS = 'dpaschoal_tasks_v7';
const STORAGE_KEY_CAMPAIGNS = 'dpaschoal_campaigns_v7';

export default function App() {
  // Load tasks from localStorage or initial state
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TASKS) || localStorage.getItem('dpaschoal_tasks_v6');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 50) {
          return parsed.map((t: any) => {
            let company = t.company;
            // Rule: tasks mentioning DPK go to DPK tab (e.g. linha 11)
            if (/\bDPK\b/i.test(t.description || '') || /\bDPK\b/i.test(t.notes || '')) {
              company = 'DPK';
            }
            return {
              ...t,
              company,
              durationDays: typeof t.durationDays === 'number'
                ? t.durationDays
                : parseInt(String(t.durationDays).replace(/\D/g, ''), 10) || 5,
              month: normalizeMonthLabel(t.month) || t.month,
            };
          });
        }
      }
    } catch (e) {
      console.error('Failed to load tasks from localStorage', e);
    }
    return INITIAL_TASKS;
  });

  // Load campaigns from localStorage or initial state
  const [campaigns, setCampaigns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CAMPAIGNS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load campaigns from localStorage', e);
    }
    return INITIAL_CAMPAIGNS;
  });

  // Active Company tab: DPaschoal, DPK, AutoZ
  const [activeCompany, setActiveCompany] = useState<Company>('DPaschoal');

  // Active View mode: 'table' (Planilha) or 'dashboard' (Gráficos)
  const [activeView, setActiveView] = useState<'table' | 'dashboard'>('table');

  // Filter state
  const [filters, setFilters] = useState<TaskFilterState>({
    campaign: '',
    responsible: '',
    status: '',
    month: '',
    sector: '',
    search: '',
  });

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [supabaseReloadKey, setSupabaseReloadKey] = useState(0);

  // Supabase Online & Realtime Sync Effect
  useEffect(() => {
    const configured = isSupabaseConfigured();
    setIsSupabaseConnected(configured);

    if (!configured) return;

    setIsSyncing(true);

    // 1. Fetch remote tasks
    fetchTasksFromSupabase()
      .then(async (remoteTasks) => {
        if (remoteTasks && remoteTasks.length > 0) {
          setTasks(sortTasks(remoteTasks, campaigns));
        } else {
          // If remote table has 0 tasks, populate with initial data
          await upsertTasksBatchToSupabase(tasks);
        }
      })
      .catch((err) => {
        console.warn('Não foi possível carregar do Supabase (verifique se executou o SQL):', err);
      })
      .finally(() => {
        setIsSyncing(false);
      });

    // 2. Fetch remote campaigns
    fetchCampaignsFromSupabase()
      .then(async (remoteCampaigns) => {
        if (remoteCampaigns && remoteCampaigns.length > 0) {
          setCampaigns(remoteCampaigns);
        } else {
          await upsertCampaignsBatchToSupabase(campaigns);
        }
      })
      .catch((err) => {
        console.warn('Não foi possível carregar campanhas do Supabase:', err);
      });

    // 3. Realtime subscription (Instant sync across all browser tabs / users)
    const unsubscribe = subscribeToSupabaseRealtime(
      ({ eventType, task, oldId }) => {
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          if (task) {
            setTasks((prev) => {
              const idx = prev.findIndex((t) => t.id === task.id);
              let nextList: Task[];
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = task;
                nextList = copy;
              } else {
                nextList = [task, ...prev];
              }
              return sortTasks(nextList, campaigns);
            });
          }
        } else if (eventType === 'DELETE' && oldId) {
          setTasks((prev) => prev.filter((t) => t.id !== oldId));
        }
      },
      () => {
        fetchCampaignsFromSupabase().then((camps) => {
          if (camps && camps.length > 0) setCampaigns(camps);
        });
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [supabaseReloadKey]);

  // Sync to localStorage as offline fallback
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save tasks', e);
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(campaigns));
    } catch (e) {
      console.error('Failed to save campaigns', e);
    }
  }, [campaigns]);

  // Task count per company
  const taskCountByCompany = useMemo(() => {
    const counts: Record<Company, number> = {
      DPaschoal: 0,
      DPK: 0,
      AutoZ: 0,
    };
    tasks.forEach((t) => {
      if (counts[t.company] !== undefined) {
        counts[t.company]++;
      }
    });
    return counts;
  }, [tasks]);

  // Tasks for the active company
  const companyTasks = useMemo(() => {
    const list = tasks.filter((t) => t.company === activeCompany);
    return sortTasks(list, campaigns);
  }, [tasks, activeCompany, campaigns]);

  // Available unique months in company tasks
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    companyTasks.forEach((t) => {
      if (t.month) set.add(t.month);
    });
    return Array.from(set).sort();
  }, [companyTasks]);

  // Filtered tasks for the active company
  const filteredTasks = useMemo(() => {
    const filtered = companyTasks.filter((task) => {
      if (filters.campaign && task.campaign !== filters.campaign) return false;
      if (filters.responsible) {
        const rLower = filters.responsible.toLowerCase();
        if (!task.responsible?.toLowerCase().includes(rLower)) return false;
      }
      if (filters.status && task.status !== filters.status) return false;
      if (filters.month && task.month !== filters.month) return false;
      if (filters.sector) {
        const sLower = filters.sector.toLowerCase();
        if (!task.sector?.toLowerCase().includes(sLower)) return false;
      }
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchesDesc = task.description.toLowerCase().includes(query);
        const matchesNotes = task.notes ? task.notes.toLowerCase().includes(query) : false;
        const matchesNumber = task.taskNumber.toLowerCase().includes(query);
        const matchesResp = task.responsible?.toLowerCase().includes(query);
        const matchesSec = task.sector?.toLowerCase().includes(query);
        if (!matchesDesc && !matchesNotes && !matchesNumber && !matchesResp && !matchesSec) return false;
      }
      return true;
    });
    return sortTasks(filtered, campaigns);
  }, [companyTasks, filters, campaigns]);

  // Statistics for active company (all vs filtered)
  const totalCompanyTasks = companyTasks.length;
  const completedCompanyTasks = companyTasks.filter((t) => t.status === 'Concluído').length;

  const totalFilteredTasks = filteredTasks.length;
  const completedFilteredTasks = filteredTasks.filter((t) => t.status === 'Concluído').length;

  // Task counts by campaign
  const taskCountsByCampaign = useMemo(() => {
    const counts: Record<string, number> = {};
    campaigns.forEach((c) => (counts[c] = 0));
    tasks.forEach((t) => {
      counts[t.campaign] = (counts[t.campaign] || 0) + 1;
    });
    return counts;
  }, [tasks, campaigns]);

  // Handlers for Filters
  const handleFilterChange = (key: keyof TaskFilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      campaign: '',
      responsible: '',
      status: '',
      month: '',
      sector: '',
      search: '',
    });
  };

  // Handlers for Task CRUD
  const handleSaveTask = (
    taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    const now = new Date().toISOString();
    // Rule: wherever DPK is mentioned, assign to DPK company
    const resolvedCompany = (/\bDPK\b/i.test(taskData.description || '') || /\bDPK\b/i.test(taskData.notes || ''))
      ? 'DPK'
      : taskData.company;

    const dataWithCompany = {
      ...taskData,
      company: resolvedCompany,
    };

    if (existingId) {
      // Update
      const existing = tasks.find((t) => t.id === existingId);
      const updated: Task = {
        ...(existing || (dataWithCompany as Task)),
        ...dataWithCompany,
        updatedAt: now,
      };

      setTasks((prev) =>
        prev.map((t) => (t.id === existingId ? updated : t))
      );

      if (isSupabaseConfigured()) {
        upsertTaskToSupabase(updated);
      }
    } else {
      // Create new
      const newTask: Task = {
        ...dataWithCompany,
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      };
      setTasks((prev) => [newTask, ...prev]);

      if (isSupabaseConfigured()) {
        upsertTaskToSupabase(newTask);
      }
    }
  };

  const [deletedTaskBackup, setDeletedTaskBackup] = useState<{ task: Task; index: number } | null>(null);

  const handleDeleteTask = (taskId: string) => {
    const taskToDelete = tasks.find((t) => t.id === taskId);
    if (!taskToDelete) return;
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    setDeletedTaskBackup({ task: taskToDelete, index: taskIndex });
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    if (isSupabaseConfigured()) {
      deleteTaskFromSupabase(taskId);
    }
  };

  const handleUndoDelete = () => {
    if (deletedTaskBackup) {
      setTasks((prev) => {
        const copy = [...prev];
        const targetIndex = Math.min(deletedTaskBackup.index, copy.length);
        copy.splice(targetIndex, 0, deletedTaskBackup.task);
        return copy;
      });

      if (isSupabaseConfigured()) {
        upsertTaskToSupabase(deletedTaskBackup.task);
      }
      setDeletedTaskBackup(null);
    }
  };

  const handleQuickStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          let updatedCompDate = t.completionDate;
          let diffDays = t.diffDays;

          if (newStatus === 'Concluído' && !updatedCompDate) {
            updatedCompDate = toISOFormat(new Date());
            diffDays = calculateDiffDays(updatedCompDate, t.endDate);
          } else if (newStatus !== 'Concluído' && updatedCompDate) {
            // cleared completion date if moved away from Concluído
            updatedCompDate = '';
            diffDays = null;
          }

          const updated: Task = {
            ...t,
            status: newStatus,
            completionDate: updatedCompDate,
            diffDays,
            updatedAt: new Date().toISOString(),
          };

          if (isSupabaseConfigured()) {
            upsertTaskToSupabase(updated);
          }

          return updated;
        }
        return t;
      })
    );
  };

  // Handler for direct inline cell edits on the table
  const handleUpdateTaskField = (taskId: string, field: keyof Task, value: any) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;

        const updated = { ...t, [field]: value, updatedAt: new Date().toISOString() };

        // Rule: if description or notes mentions DPK, auto-route to DPK
        if (field === 'description' || field === 'notes') {
          const desc = field === 'description' ? String(value) : updated.description;
          const notes = field === 'notes' ? String(value) : updated.notes;
          if (/\bDPK\b/i.test(desc) || /\bDPK\b/i.test(notes || '')) {
            updated.company = 'DPK';
          }
        }

        // If duration or startDate changed, recalculate endDate and diffDays
        if (field === 'durationDays' || field === 'startDate') {
          const start = field === 'startDate' ? value : t.startDate;
          const duration = field === 'durationDays' ? Number(value) || 1 : t.durationDays;
          updated.endDate = calculateEndDate(start, duration);
          if (field === 'startDate') {
            updated.month = getMonthAbbr(start) || t.month;
          }
          if (updated.completionDate) {
            updated.diffDays = calculateDiffDays(updated.completionDate, updated.endDate);
          }
        }

        // If completionDate changed, recalculate diffDays and status if needed
        if (field === 'completionDate') {
          if (value) {
            updated.diffDays = calculateDiffDays(value, updated.endDate);
            if (updated.status !== 'Concluído') {
              updated.status = 'Concluído';
            }
          } else {
            updated.diffDays = null;
          }
        }

        // If status changed to Concluído and completionDate is empty, set today
        if (field === 'status') {
          if (value === 'Concluído' && !updated.completionDate) {
            const today = toISOFormat(new Date());
            updated.completionDate = today;
            updated.diffDays = calculateDiffDays(today, updated.endDate);
          } else if (value !== 'Concluído' && updated.completionDate) {
            updated.completionDate = '';
            updated.diffDays = null;
          }
        }

        if (isSupabaseConfigured()) {
          upsertTaskToSupabase(updated);
        }

        return updated;
      })
    );
  };

  const handleAddNewTaskDirect = (
    taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const now = new Date().toISOString();
    const resolvedCompany = (/\bDPK\b/i.test(taskData.description || '') || /\bDPK\b/i.test(taskData.notes || ''))
      ? 'DPK'
      : taskData.company;

    const newTask: Task = {
      ...taskData,
      company: resolvedCompany,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    // Append to end of task list so user can see it right above the new empty row
    setTasks((prev) => [...prev, newTask]);

    if (isSupabaseConfigured()) {
      upsertTaskToSupabase(newTask);
    }
  };

  // Handlers for Campaign Management
  const handleAddCampaign = (name: string) => {
    if (!campaigns.includes(name)) {
      setCampaigns((prev) => [...prev, name]);
      if (isSupabaseConfigured()) {
        upsertCampaignToSupabase(name);
      }
    }
  };

  const handleDeleteCampaign = (name: string) => {
    setCampaigns((prev) => prev.filter((c) => c !== name));
    if (isSupabaseConfigured()) {
      deleteCampaignFromSupabase(name);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = [
      'Empresa',
      'Mês',
      'Campanha',
      'Nº',
      'Tarefa',
      'Responsável',
      'Setor',
      'Duração (dias)',
      'Data Início',
      'Data Final Prevista',
      'Data Conclusão Real',
      'Dias (+/-)',
      'Status',
      'Observações',
    ];

    const rows = filteredTasks.map((t) => [
      `"${t.company}"`,
      `"${t.month}"`,
      `"${t.campaign}"`,
      `"${t.taskNumber}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.responsible}"`,
      `"${t.sector}"`,
      t.durationDays,
      `"${t.startDate}"`,
      `"${t.endDate}"`,
      `"${t.completionDate || ''}"`,
      t.diffDays !== undefined && t.diffDays !== null ? t.diffDays : '',
      `"${t.status}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Tarefas_${activeCompany}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetToOfficial = () => {
    setTasks(INITIAL_TASKS);
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(INITIAL_TASKS));
  };

  return (
    <div id="app-root-container" className="min-h-screen bg-neutral-100 flex flex-col font-sans text-neutral-900">
      {/* Top Header */}
      <Header
        activeCompany={activeCompany}
        onCompanyChange={setActiveCompany}
        activeView={activeView}
        onViewChange={setActiveView}
        onNewTaskClick={() => {
          setEditingTask(null);
          setIsTaskModalOpen(true);
        }}
        onManageCampaignsClick={() => setIsCampaignModalOpen(true)}
        onExportCsvClick={handleExportCsv}
        taskCountByCompany={taskCountByCompany}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        isSupabaseConnected={isSupabaseConnected}
        isSyncing={isSyncing}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-6 py-4">
        {activeView === 'table' ? (
          <div id="spreadsheet-view-wrapper" className="space-y-3">
            {/* Red Spreadsheet Banner (Mirrors exact image attached) */}
            <SpreadsheetBanner
              company={activeCompany}
              totalTasks={totalFilteredTasks}
              completedTasks={completedFilteredTasks}
              onResetToOfficial={handleResetToOfficial}
            />

            {/* Quick Filters */}
            <FilterBar
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              campaigns={campaigns}
              months={availableMonths}
              filteredCount={filteredTasks.length}
              totalCount={totalCompanyTasks}
            />

            {/* Spreadsheet Table with Direct Inline Cell Editing & Empty Bottom Row */}
            <TaskTable
              tasks={filteredTasks}
              campaigns={campaigns}
              activeCompany={activeCompany}
              onUpdateTaskField={handleUpdateTaskField}
              onDeleteTask={handleDeleteTask}
              onAddNewTask={handleAddNewTaskDirect}
            />
          </div>
        ) : (
          /* Analytics & Charts Dashboard */
          <DashboardView
            tasks={companyTasks}
            company={activeCompany}
            campaigns={campaigns}
          />
        )}
      </main>

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        initialTask={editingTask}
        defaultCompany={activeCompany}
        campaigns={campaigns}
      />

      <CampaignManagerModal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        campaigns={campaigns}
        onAddCampaign={handleAddCampaign}
        onDeleteCampaign={handleDeleteCampaign}
        taskCountsByCampaign={taskCountsByCampaign}
      />

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        tasks={tasks}
        campaigns={campaigns}
        onSyncComplete={() => {
          setSupabaseReloadKey((prev) => prev + 1);
        }}
      />

      {/* Floating Toast Notification when a task is deleted with instantaneous Undo */}
      {deletedTaskBackup && (
        <div 
          id="toast-undo-delete"
          className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 text-xs border border-neutral-700 animate-in fade-in slide-in-from-bottom-2"
        >
          <span>
            Tarefa excluída{deletedTaskBackup.task.taskNumber ? ` (${deletedTaskBackup.task.taskNumber})` : ''}: <strong>"{deletedTaskBackup.task.description.slice(0, 32)}{deletedTaskBackup.task.description.length > 32 ? '...' : ''}"</strong>
          </span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="bg-[#a60000] hover:bg-red-700 text-white font-bold px-3 py-1 rounded transition-colors cursor-pointer ml-1"
          >
            Desfazer
          </button>
          <button
            type="button"
            onClick={() => setDeletedTaskBackup(null)}
            className="text-neutral-400 hover:text-white cursor-pointer ml-1 text-base font-bold leading-none"
            title="Fechar"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
