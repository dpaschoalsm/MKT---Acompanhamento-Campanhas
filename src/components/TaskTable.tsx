import React, { useState, useMemo } from 'react';
import { 
  Task, 
  TaskStatus, 
  Responsible,
  Sector,
  RESPONSIBLES, 
  SECTORS 
} from '../types';
import { 
  formatDateToBR, 
  formatDiffDays, 
  calculateEndDate, 
  calculateDiffDays, 
  getMonthAbbr,
  toISOFormat
} from '../utils/dateUtils';
import { MultiSelectPopover } from './MultiSelectPopover';
import { splitMulti, joinMulti } from '../utils/multiSelectUtils';
import { 
  ChevronDown, 
  ChevronRight,
  Trash2, 
  Plus,
  Check
} from 'lucide-react';
import { getHierarchyRenderItems } from '../utils/taskHierarchy';

interface TaskTableProps {
  tasks: Task[];
  campaigns: string[];
  activeCompany: string;
  onUpdateTaskField: (taskId: string, field: keyof Task, value: any) => void;
  onDeleteTask: (taskId: string) => void;
  onAddNewTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

type CellField = 
  | 'month'
  | 'campaign'
  | 'taskNumber'
  | 'description'
  | 'responsible'
  | 'sector'
  | 'durationDays'
  | 'startDate'
  | 'completionDate'
  | 'status';

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  campaigns,
  activeCompany,
  onUpdateTaskField,
  onDeleteTask,
  onAddNewTask,
}) => {
  // Editing state: which task and which cell field is currently focused
  const [activeCell, setActiveCell] = useState<{ taskId: string; field: CellField } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Multi-select popovers for Quick Add row
  const [quickAddRespOpen, setQuickAddRespOpen] = useState(false);
  const [quickAddSectorOpen, setQuickAddSectorOpen] = useState(false);

  // Set of expanded parent group keys (e.g. "Revisão DPaschoal:::2").
  // Initialized empty so only parent tasks (e.g. 2) appear, and clicking opens subtasks (2.1, 2.2...)
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());

  // Compute hierarchical render list: groups subtasks under parent tasks
  const { renderItems } = useMemo(() => {
    return getHierarchyRenderItems(tasks, expandedGroupKeys);
  }, [tasks, expandedGroupKeys]);

  const toggleGroup = (key: string) => {
    setExpandedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Draft state for the new empty row at the bottom
  const defaultCampaign = campaigns[0] || 'Revisão DPaschoal';
  const defaultResponsible: Responsible = RESPONSIBLES[0] || 'Rafael';
  const defaultSector: Sector = SECTORS[0] || 'Brand';
  const todayIso = toISOFormat(new Date());

  const [newRowDraft, setNewRowDraft] = useState<{
    month: string;
    taskNumber: string;
    description: string;
    campaign: string;
    responsible: Responsible;
    sector: Sector;
    durationDays: number;
    startDate: string;
    completionDate: string;
    status: TaskStatus;
  }>({
    month: getMonthAbbr(todayIso) || 'Setembro/26',
    taskNumber: '',
    description: '',
    campaign: defaultCampaign,
    responsible: defaultResponsible,
    sector: defaultSector,
    durationDays: 45,
    startDate: todayIso,
    completionDate: '',
    status: 'Não iniciado',
  });

  // Status badge styling helper
  const getStatusBadgeStyle = (status: TaskStatus) => {
    switch (status) {
      case 'Concluído':
        return 'bg-[#5cb85c] text-white hover:bg-[#4ea24e]';
      case 'Em atraso':
        return 'bg-[#e53935] text-white hover:bg-[#c62828]';
      case 'Em andamento':
        return 'bg-[#0284c7] text-white hover:bg-[#0369a1]';
      case 'Não iniciado':
        return 'bg-[#64748b] text-white hover:bg-[#475569]';
      case 'Cancelado':
        return 'bg-neutral-400 text-neutral-800 line-through';
      default:
        return 'bg-neutral-600 text-white';
    }
  };

  // Helper for difference days (+/-) styling
  const renderDiffDays = (diff?: number | null) => {
    if (diff === undefined || diff === null) {
      return <span className="text-neutral-300">-</span>;
    }
    const formatted = formatDiffDays(diff);
    if (diff < 0) {
      return (
        <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-xs" title="Entregue antes do prazo previsto">
          {formatted}
        </span>
      );
    }
    if (diff > 0) {
      return (
        <span className="font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded text-xs" title="Entregue com atraso em relação ao prazo">
          {formatted}
        </span>
      );
    }
    return (
      <span className="font-bold text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded text-xs" title="Entregue no prazo exato">
        0
      </span>
    );
  };

  // Handle clicking to edit a cell
  const handleCellClick = (task: Task, field: CellField) => {
    setActiveCell({ taskId: task.id, field });
    let val = '';
    if (field === 'durationDays') {
      val = String(task.durationDays ?? 1);
    } else if (field === 'startDate') {
      val = task.startDate || '';
    } else if (field === 'completionDate') {
      val = task.completionDate || '';
    } else {
      val = String(task[field] ?? '');
    }
    setEditValue(val);
  };

  // Commit changes to an existing task
  const commitEdit = (task: Task, field: CellField, valueToCommit?: string) => {
    const finalVal = valueToCommit !== undefined ? valueToCommit : editValue;
    setActiveCell(null);

    if (field === 'durationDays') {
      const num = Math.max(1, parseInt(String(finalVal).replace(/\D/g, ''), 10) || 1);
      onUpdateTaskField(task.id, 'durationDays', num);
    } else if (field === 'startDate') {
      // Expecting YYYY-MM-DD
      if (finalVal) {
        onUpdateTaskField(task.id, 'startDate', finalVal);
      }
    } else if (field === 'completionDate') {
      onUpdateTaskField(task.id, 'completionDate', finalVal || '');
    } else if (field === 'status') {
      onUpdateTaskField(task.id, 'status', finalVal as TaskStatus);
    } else {
      onUpdateTaskField(task.id, field, finalVal);
    }
  };

  // Handle Enter / Escape on inline inputs
  const handleKeyDown = (e: React.KeyboardEvent, task: Task, field: CellField) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit(task, field);
    } else if (e.key === 'Escape') {
      setActiveCell(null);
    }
  };

  // Handle saving the new row
  const handleCommitNewRow = () => {
    // Only commit if description or taskNumber has been entered
    if (!newRowDraft.description.trim() && !newRowDraft.taskNumber.trim()) {
      return;
    }

    const duration = Math.max(1, typeof newRowDraft.durationDays === 'number' ? newRowDraft.durationDays : parseInt(String(newRowDraft.durationDays).replace(/\D/g, ''), 10) || 5);
    const startDate = newRowDraft.startDate || todayIso;
    const endDate = calculateEndDate(startDate, duration);
    const month = newRowDraft.month?.trim() || getMonthAbbr(startDate) || 'Outubro/26';
    const completionDate = newRowDraft.completionDate || '';
    const diffDays = completionDate ? calculateDiffDays(completionDate, endDate) : null;

    onAddNewTask({
      company: activeCompany as any,
      month,
      campaign: newRowDraft.campaign || defaultCampaign,
      taskNumber: newRowDraft.taskNumber.trim() || `${tasks.length + 1}.0`,
      description: newRowDraft.description.trim() || 'Nova tarefa',
      responsible: newRowDraft.responsible || defaultResponsible,
      sector: newRowDraft.sector || defaultSector,
      durationDays: duration,
      startDate,
      endDate,
      completionDate,
      diffDays,
      status: newRowDraft.status || 'Não iniciado',
    });

    // Reset draft with next task number automatically
    const nextNum = tasks.length + 2;
    setNewRowDraft({
      month: month,
      taskNumber: `${nextNum}.0`,
      description: '',
      campaign: newRowDraft.campaign || defaultCampaign,
      responsible: newRowDraft.responsible || defaultResponsible,
      sector: newRowDraft.sector || defaultSector,
      durationDays: 45,
      startDate: todayIso,
      completionDate: '',
      status: 'Não iniciado',
    });
  };

  const handleNewRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommitNewRow();
    }
  };

  return (
    <div id="tasks-table-container" className="shadow-sm border border-neutral-300 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1280px]">
          {/* Header row in authentic DPaschoal Red */}
          <thead>
            <tr className="bg-[#a60000] text-white text-xs font-black tracking-wider uppercase select-none border-b-2 border-red-950">
              <th className="py-2.5 px-3 border-r border-red-900/60 text-center w-28">
                <div className="flex items-center justify-center gap-1">
                  <span>MÊS</span>
                  <ChevronDown className="w-3 h-3 text-red-200" />
                </div>
              </th>
              <th className="py-2.5 px-3 border-r border-red-900/60 text-center w-36">
                <div className="flex items-center justify-center gap-1">
                  <span>CAMPANHA</span>
                  <ChevronDown className="w-3 h-3 text-red-200" />
                </div>
              </th>
              <th className="py-2.5 px-2.5 border-r border-red-900/60 text-center w-14">
                <div className="flex items-center justify-center gap-1">
                  <span>Nº</span>
                  <ChevronDown className="w-3 h-3 text-red-200" />
                </div>
              </th>
              <th className="py-2.5 px-4 border-r border-red-900/60 min-w-[280px]">
                <div className="flex items-center justify-between">
                  <span>TAREFA</span>
                  <ChevronDown className="w-3 h-3 text-red-200" />
                </div>
              </th>
              <th className="py-2.5 px-3 border-r border-red-900/60 text-center w-32">
                <div className="flex items-center justify-center gap-1">
                  <span>RESPONSÁVEL</span>
                  <ChevronDown className="w-3 h-3 text-red-200" />
                </div>
              </th>
              <th className="py-2.5 px-3 border-r border-red-900/60 text-center w-40">
                <div className="flex items-center justify-center gap-1">
                  <span>SETOR</span>
                  <ChevronDown className="w-3 h-3 text-red-200" />
                </div>
              </th>
              <th className="py-2.5 px-2.5 border-r border-red-900/60 text-center w-24">
                <div className="flex items-center justify-center gap-1">
                  <span>DURAÇÃO</span>
                  <ChevronDown className="w-3 h-3 text-red-200" />
                </div>
              </th>
              <th className="py-2.5 px-3 border-r border-red-900/60 text-center w-28">
                <div className="flex items-center justify-center gap-1">
                  <span>DT. ÍNICIO</span>
                  <ChevronDown className="w-3 h-3 text-red-200" />
                </div>
              </th>
              <th className="py-2.5 px-3 border-r border-red-900/60 text-center w-28">
                <div className="flex items-center justify-center gap-1">
                  <span>DT. FINAL</span>
                  <ChevronDown className="w-3 h-3 text-red-200" />
                </div>
              </th>
              <th className="py-2.5 px-3 border-r border-red-900/60 text-center w-28">
                <div className="flex items-center justify-center gap-1">
                  <span>CONCLUSÃO</span>
                  <ChevronDown className="w-3 h-3 text-red-200" />
                </div>
              </th>
              <th className="py-2.5 px-2.5 border-r border-red-900/60 text-center w-24">
                <div className="flex items-center justify-center gap-1">
                  <span>DIAS (+/-)</span>
                  <ChevronDown className="w-3 h-3 text-red-200" />
                </div>
              </th>
              <th className="py-2.5 px-3 border-r border-red-900/60 text-center w-36">
                <div className="flex items-center justify-center gap-1">
                  <span>STATUS</span>
                  <ChevronDown className="w-3 h-3 text-red-200" />
                </div>
              </th>
              <th className="py-2.5 px-2 text-center w-14 bg-red-950/40">
                <span>AÇÃO</span>
              </th>
            </tr>
          </thead>

          {/* Table Body - Excel grid lines */}
          <tbody className="divide-y divide-neutral-200 text-xs text-neutral-800">
            {renderItems.map((item, idx) => {
              const task = item.task;
              const isEven = idx % 2 === 0;
              const isParent = item.type === 'parent';
              const isSubtask = item.type === 'subtask';
              const isExpanded = isParent ? item.isExpanded : false;

              const isEditingMonth = activeCell?.taskId === task.id && activeCell.field === 'month';
              const isEditingCampaign = activeCell?.taskId === task.id && activeCell.field === 'campaign';
              const isEditingTaskNumber = activeCell?.taskId === task.id && activeCell.field === 'taskNumber';
              const isEditingDesc = activeCell?.taskId === task.id && activeCell.field === 'description';
              const isEditingResponsible = activeCell?.taskId === task.id && activeCell.field === 'responsible';
              const isEditingSector = activeCell?.taskId === task.id && activeCell.field === 'sector';
              const isEditingDuration = activeCell?.taskId === task.id && activeCell.field === 'durationDays';
              const isEditingStartDate = activeCell?.taskId === task.id && activeCell.field === 'startDate';
              const isEditingCompDate = activeCell?.taskId === task.id && activeCell.field === 'completionDate';
              const isEditingStatus = activeCell?.taskId === task.id && activeCell.field === 'status';

              return (
                <tr
                  key={task.id}
                  id={`task-row-${task.id}`}
                  className={`transition-colors group ${
                    isSubtask 
                      ? 'bg-amber-50/20 hover:bg-amber-50/60 border-l-[3px] border-l-[#a60000]' 
                      : isEven 
                        ? 'bg-white hover:bg-amber-50/50' 
                        : 'bg-neutral-50/40 hover:bg-amber-50/50'
                  }`}
                >
                  {/* MÊS (Calculado automaticamente da Data de Início, mas editável se desejado) */}
                  <td 
                    onClick={() => handleCellClick(task, 'month')}
                    className="py-2 px-2 border-r border-neutral-200 text-center font-medium text-neutral-700 whitespace-nowrap cursor-pointer hover:bg-neutral-100"
                    title="Clique para editar o mês"
                  >
                    {isEditingMonth ? (
                      <input
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => commitEdit(task, 'month')}
                        onKeyDown={(e) => handleKeyDown(e, task, 'month')}
                        className="w-full text-center px-1 py-0.5 text-xs bg-white border border-[#a60000] rounded focus:outline-none"
                      />
                    ) : (
                      <span>{task.month}</span>
                    )}
                  </td>

                  {/* CAMPANHA (Dropdown com opções) */}
                  <td 
                    onClick={() => handleCellClick(task, 'campaign')}
                    className="py-2 px-2 border-r border-neutral-200 text-center font-semibold text-neutral-900 cursor-pointer hover:bg-neutral-100"
                    title="Clique para alterar a campanha"
                  >
                    {isEditingCampaign ? (
                      <select
                        autoFocus
                        value={editValue}
                        onChange={(e) => {
                          setEditValue(e.target.value);
                          commitEdit(task, 'campaign', e.target.value);
                        }}
                        onBlur={() => commitEdit(task, 'campaign')}
                        className="w-full text-xs font-semibold bg-white border border-[#a60000] rounded px-1 py-0.5 focus:outline-none"
                      >
                        {campaigns.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="uppercase text-[11px] font-bold text-neutral-800">{task.campaign}</span>
                    )}
                  </td>

                  {/* Nº (Número da tarefa com toggle para subtarefas) */}
                  <td 
                    onClick={() => handleCellClick(task, 'taskNumber')}
                    className="py-2 px-1.5 border-r border-neutral-200 text-center font-bold text-neutral-800 cursor-pointer hover:bg-neutral-100"
                    title={isParent ? "Clique para editar o número ou na seta para expandir" : "Clique para editar o número"}
                  >
                    {isEditingTaskNumber ? (
                      <input
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => commitEdit(task, 'taskNumber')}
                        onKeyDown={(e) => handleKeyDown(e, task, 'taskNumber')}
                        className="w-full text-center px-1 py-0.5 text-xs font-bold bg-white border border-[#a60000] rounded focus:outline-none"
                      />
                    ) : isParent ? (
                      <span className="font-bold text-neutral-900">{task.taskNumber}</span>
                    ) : isSubtask ? (
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-neutral-400 font-bold text-[10px]" title="Subtarefa">↳</span>
                        <span className="font-bold text-[#a60000] bg-red-50 border border-red-200 px-1 py-0.5 rounded text-[11px]">
                          {task.taskNumber}
                        </span>
                      </div>
                    ) : (
                      <span>{task.taskNumber}</span>
                    )}
                  </td>

                  {/* TAREFA (Descrição da tarefa com botão '+' para expandir subtarefas) */}
                  <td 
                    onClick={() => handleCellClick(task, 'description')}
                    className={`py-2 px-3 border-r border-neutral-200 text-left font-normal text-neutral-900 cursor-pointer hover:bg-neutral-100 min-w-[260px] ${
                      isSubtask ? 'pl-6' : ''
                    }`}
                    title="Clique para editar o nome da tarefa"
                  >
                    {isEditingDesc ? (
                      <input
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => commitEdit(task, 'description')}
                        onKeyDown={(e) => handleKeyDown(e, task, 'description')}
                        className="w-full px-2 py-0.5 text-xs bg-white border border-[#a60000] rounded focus:outline-none"
                      />
                    ) : isParent ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-neutral-900">{task.description}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGroup(item.groupKey);
                          }}
                          className={`w-5 h-5 flex items-center justify-center font-bold text-xs rounded transition-colors cursor-pointer shrink-0 border ${
                            isExpanded
                              ? 'bg-neutral-200 text-neutral-700 border-neutral-300 hover:bg-neutral-300'
                              : 'bg-red-50 text-[#a60000] border-red-300 hover:bg-[#a60000] hover:text-white hover:border-[#a60000]'
                          }`}
                          title={isExpanded ? "Recolher subtarefas (−)" : "Expandir subtarefas (+)"}
                        >
                          {isExpanded ? '−' : '+'}
                        </button>
                      </div>
                    ) : isSubtask ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-400 font-bold select-none text-xs">└─</span>
                        <span className="font-medium text-neutral-800">{task.description}</span>
                      </div>
                    ) : (
                      <span className="font-medium text-neutral-900">{task.description}</span>
                    )}
                  </td>

                {/* RESPONSÁVEL (Multi-seleção com todos os integrantes) */}
                <td 
                  onClick={() => handleCellClick(task, 'responsible')}
                  className="py-2 px-2 border-r border-neutral-200 text-center font-medium text-neutral-800 whitespace-nowrap cursor-pointer hover:bg-neutral-100 relative"
                  title="Clique para selecionar 1 ou mais responsáveis"
                >
                  <span className="font-semibold text-neutral-900 bg-neutral-100/90 hover:bg-neutral-200 px-2 py-0.5 rounded text-xs border border-neutral-200 inline-flex items-center gap-1">
                    {task.responsible}
                  </span>
                  {isEditingResponsible && (
                    <MultiSelectPopover
                      title="Selecionar Responsáveis"
                      options={RESPONSIBLES}
                      selected={splitMulti(task.responsible)}
                      onChange={(newSel) => {
                        onUpdateTaskField(task.id, 'responsible', joinMulti(newSel) || 'Todos');
                      }}
                      onClose={() => setActiveCell(null)}
                      badgeColor="red"
                      align="center"
                    />
                  )}
                </td>

                {/* SETOR (Multi-seleção com todos os setores) */}
                <td 
                  onClick={() => handleCellClick(task, 'sector')}
                  className="py-2 px-2 border-r border-neutral-200 text-center font-medium text-neutral-700 whitespace-nowrap cursor-pointer hover:bg-neutral-100 relative"
                  title="Clique para selecionar 1 ou mais setores"
                >
                  <span className="text-neutral-700 text-xs bg-neutral-50 hover:bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 inline-flex items-center gap-1">
                    {task.sector}
                  </span>
                  {isEditingSector && (
                    <MultiSelectPopover
                      title="Selecionar Setor(es)"
                      options={SECTORS}
                      selected={splitMulti(task.sector)}
                      onChange={(newSel) => {
                        onUpdateTaskField(task.id, 'sector', joinMulti(newSel) || 'Marketing');
                      }}
                      onClose={() => setActiveCell(null)}
                      badgeColor="dark"
                      align="center"
                    />
                  )}
                </td>

                {/* DURAÇÃO (Dias - Somente Números) */}
                <td 
                  onClick={() => handleCellClick(task, 'durationDays')}
                  className="py-2 px-2 border-r border-neutral-200 text-center font-medium text-neutral-800 cursor-pointer hover:bg-neutral-100"
                  title="Clique para editar duração em dias"
                >
                  {isEditingDuration ? (
                    <input
                      autoFocus
                      type="number"
                      min="1"
                      placeholder="45"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitEdit(task, 'durationDays')}
                      onKeyDown={(e) => handleKeyDown(e, task, 'durationDays')}
                      className="w-16 mx-auto text-center px-1 py-0.5 text-xs bg-white border border-[#a60000] rounded focus:outline-none font-bold"
                    />
                  ) : (
                    <span className="font-semibold text-neutral-700 bg-neutral-50 px-1.5 py-0.5 rounded text-xs border border-neutral-200">
                      {task.durationDays}
                    </span>
                  )}
                </td>

                {/* DT. ÍNICIO */}
                <td 
                  onClick={() => handleCellClick(task, 'startDate')}
                  className="py-2 px-2 border-r border-neutral-200 text-center text-neutral-700 whitespace-nowrap cursor-pointer hover:bg-neutral-100"
                  title="Clique para alterar a data de início"
                >
                  {isEditingStartDate ? (
                    <input
                      autoFocus
                      type="date"
                      value={editValue}
                      onChange={(e) => {
                        setEditValue(e.target.value);
                        commitEdit(task, 'startDate', e.target.value);
                      }}
                      onBlur={() => commitEdit(task, 'startDate')}
                      className="w-full text-xs bg-white border border-[#a60000] rounded px-1 py-0.5 focus:outline-none"
                    />
                  ) : (
                    <span>{formatDateToBR(task.startDate)}</span>
                  )}
                </td>

                {/* DT. FINAL (Calculada automaticamente: Data Início + Duração) */}
                <td 
                  className="py-2 px-2 border-r border-neutral-200 text-center font-semibold text-neutral-900 whitespace-nowrap bg-neutral-50/30"
                  title="Data final calculada automaticamente a partir da data de início e da duração"
                >
                  {formatDateToBR(task.endDate)}
                </td>

                {/* CONCLUSÃO (Data real de entrega) */}
                <td 
                  onClick={() => handleCellClick(task, 'completionDate')}
                  className="py-2 px-2 border-r border-neutral-200 text-center whitespace-nowrap cursor-pointer hover:bg-neutral-100"
                  title="Clique para definir a data de conclusão"
                >
                  {isEditingCompDate ? (
                    <input
                      autoFocus
                      type="date"
                      value={editValue}
                      onChange={(e) => {
                        setEditValue(e.target.value);
                        commitEdit(task, 'completionDate', e.target.value);
                      }}
                      onBlur={() => commitEdit(task, 'completionDate')}
                      className="w-full text-xs bg-white border border-[#a60000] rounded px-1 py-0.5 focus:outline-none"
                    />
                  ) : task.completionDate ? (
                    <span className="font-semibold text-emerald-800">
                      {formatDateToBR(task.completionDate)}
                    </span>
                  ) : (
                    <span className="text-neutral-400 italic text-[11px]">-</span>
                  )}
                </td>

                {/* DIAS (+/-) (Calculado automaticamente: Conclusão - Data Final) */}
                <td 
                  className="py-2 px-2 border-r border-neutral-200 text-center bg-neutral-50/30"
                  title="Diferença calculada automaticamente entre data prevista e data de entrega"
                >
                  {renderDiffDays(task.diffDays)}
                </td>

                {/* STATUS (Dropdown com cores padrões) */}
                <td 
                  onClick={() => handleCellClick(task, 'status')}
                  className="py-2 px-2 border-r border-neutral-200 text-center cursor-pointer hover:bg-neutral-100"
                  title="Clique para alterar status"
                >
                  <select
                    id={`status-select-${task.id}`}
                    value={task.status}
                    onChange={(e) => onUpdateTaskField(task.id, 'status', e.target.value as TaskStatus)}
                    className={`appearance-none cursor-pointer text-xs font-bold px-3 py-1 rounded transition-colors text-center shadow-2xs border border-black/10 focus:outline-none focus:ring-1 focus:ring-black ${getStatusBadgeStyle(task.status)}`}
                  >
                    <option value="Não iniciado" className="bg-white text-neutral-800 font-normal">Não iniciado</option>
                    <option value="Em andamento" className="bg-white text-neutral-800 font-normal">Em andamento</option>
                    <option value="Concluído" className="bg-white text-neutral-800 font-normal">Concluído</option>
                    <option value="Em atraso" className="bg-white text-neutral-800 font-normal">Em atraso</option>
                    <option value="Cancelado" className="bg-white text-neutral-800 font-normal">Cancelado</option>
                  </select>
                </td>

                {/* AÇÕES (Excluir linha) */}
                <td className="py-2 px-1 text-center whitespace-nowrap">
                  <button
                    id={`btn-delete-${task.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDeleteTask(task.id);
                    }}
                    className="p-1.5 rounded text-neutral-400 hover:text-red-700 hover:bg-red-100 transition-colors cursor-pointer inline-flex items-center justify-center"
                    title={`Excluir linha ${task.taskNumber || ''}`}
                    aria-label={`Excluir linha ${task.taskNumber || ''}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                  </button>
                </td>
              </tr>
            );
          })}

          {/* EMPTY ROW AT THE BOTTOM FOR SEAMLESS DIRECT INLINE CREATION */}
          <tr 
            id="new-task-inline-row"
            className="bg-emerald-50/15 hover:bg-emerald-50/30 border-t border-dashed border-emerald-300/40 transition-colors text-xs"
          >
            {/* MÊS (Editável ou calculado da Data de Início) */}
            <td className="py-2 px-1 border-r border-neutral-200 text-center">
              <input
                type="text"
                value={newRowDraft.month}
                onChange={(e) => setNewRowDraft({ ...newRowDraft, month: e.target.value })}
                onKeyDown={handleNewRowKeyDown}
                placeholder="Ex: Setembro/26"
                className="w-24 mx-auto text-center px-1 py-0.5 text-xs font-semibold bg-white/80 border border-neutral-300 hover:border-emerald-500 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-800"
                title="Mês da tarefa (editável)"
              />
            </td>

            {/* CAMPANHA */}
            <td className="py-2 px-2 border-r border-neutral-200 text-center">
              <select
                value={newRowDraft.campaign}
                onChange={(e) => setNewRowDraft({ ...newRowDraft, campaign: e.target.value })}
                className="w-full text-xs font-semibold bg-white/80 border border-neutral-300 hover:border-emerald-500 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {campaigns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </td>

            {/* Nº */}
            <td className="py-2 px-1.5 border-r border-neutral-200 text-center">
              <input
                type="text"
                placeholder={`${tasks.length + 1}.0`}
                value={newRowDraft.taskNumber}
                onChange={(e) => setNewRowDraft({ ...newRowDraft, taskNumber: e.target.value })}
                onKeyDown={handleNewRowKeyDown}
                className="w-full text-center px-1 py-0.5 text-xs font-bold bg-white/80 border border-neutral-300 hover:border-emerald-500 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-neutral-400"
              />
            </td>

            {/* TAREFA (Campo principal) */}
            <td className="py-2 px-3 border-r border-neutral-200 text-left min-w-[260px]">
              <div className="flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <input
                  type="text"
                  placeholder="Clique para adicionar nova tarefa..."
                  value={newRowDraft.description}
                  onChange={(e) => setNewRowDraft({ ...newRowDraft, description: e.target.value })}
                  onKeyDown={handleNewRowKeyDown}
                  className="w-full px-2 py-1 text-xs bg-white border border-neutral-300 hover:border-emerald-500 focus:border-emerald-600 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-neutral-500"
                />
              </div>
            </td>

            {/* RESPONSÁVEL (Multi-seleção com todos os integrantes) */}
            <td className="py-2 px-2 border-r border-neutral-200 text-center relative">
              <button
                type="button"
                onClick={() => {
                  setQuickAddRespOpen(!quickAddRespOpen);
                  setQuickAddSectorOpen(false);
                }}
                className="w-full text-xs bg-white border border-neutral-300 hover:border-emerald-500 rounded px-1.5 py-1 font-semibold text-neutral-800 text-left truncate flex items-center justify-between gap-1 cursor-pointer"
                title="Clique para selecionar 1 ou mais responsáveis"
              >
                <span className="truncate">{newRowDraft.responsible || 'Selecionar...'}</span>
                <span className="text-[10px] bg-red-100 text-[#a60000] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                  {splitMulti(newRowDraft.responsible).length || 1}
                </span>
              </button>
              {quickAddRespOpen && (
                <MultiSelectPopover
                  title="Selecionar Responsáveis"
                  options={RESPONSIBLES}
                  selected={splitMulti(newRowDraft.responsible)}
                  onChange={(newSel) => {
                    setNewRowDraft({
                      ...newRowDraft,
                      responsible: (joinMulti(newSel) || RESPONSIBLES[0]) as any,
                    });
                  }}
                  onClose={() => setQuickAddRespOpen(false)}
                  badgeColor="red"
                  align="center"
                />
              )}
            </td>

            {/* SETOR (Multi-seleção com todos os setores) */}
            <td className="py-2 px-2 border-r border-neutral-200 text-center relative">
              <button
                type="button"
                onClick={() => {
                  setQuickAddSectorOpen(!quickAddSectorOpen);
                  setQuickAddRespOpen(false);
                }}
                className="w-full text-xs bg-white border border-neutral-300 hover:border-emerald-500 rounded px-1.5 py-1 font-semibold text-neutral-800 text-left truncate flex items-center justify-between gap-1 cursor-pointer"
                title="Clique para selecionar 1 ou mais setores"
              >
                <span className="truncate">{newRowDraft.sector || 'Selecionar...'}</span>
                <span className="text-[10px] bg-neutral-200 text-neutral-800 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                  {splitMulti(newRowDraft.sector).length || 1}
                </span>
              </button>
              {quickAddSectorOpen && (
                <MultiSelectPopover
                  title="Selecionar Setor(es)"
                  options={SECTORS}
                  selected={splitMulti(newRowDraft.sector)}
                  onChange={(newSel) => {
                    setNewRowDraft({
                      ...newRowDraft,
                      sector: (joinMulti(newSel) || SECTORS[0]) as any,
                    });
                  }}
                  onClose={() => setQuickAddSectorOpen(false)}
                  badgeColor="dark"
                  align="center"
                />
              )}
            </td>

            {/* DURAÇÃO (Dias - Somente Números) */}
            <td className="py-2 px-2 border-r border-neutral-200 text-center">
              <input
                type="number"
                min="1"
                placeholder="45"
                value={newRowDraft.durationDays}
                onChange={(e) => setNewRowDraft({ ...newRowDraft, durationDays: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                onKeyDown={handleNewRowKeyDown}
                className="w-16 mx-auto text-center px-1 py-1 text-xs bg-white border border-neutral-300 hover:border-emerald-500 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
              />
            </td>

            {/* DT. ÍNICIO */}
            <td className="py-2 px-2 border-r border-neutral-200 text-center">
              <input
                type="date"
                value={newRowDraft.startDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  const suggestedMonth = getMonthAbbr(newDate);
                  setNewRowDraft({ 
                    ...newRowDraft, 
                    startDate: newDate,
                    month: suggestedMonth || newRowDraft.month
                  });
                }}
                className="w-full text-xs bg-white/80 border border-neutral-300 hover:border-emerald-500 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </td>

            {/* DT. FINAL (Calculado) */}
            <td className="py-2 px-2 border-r border-neutral-200 text-center font-medium text-neutral-500 bg-neutral-50/50">
              {formatDateToBR(calculateEndDate(newRowDraft.startDate, newRowDraft.durationDays))}
            </td>

            {/* CONCLUSÃO */}
            <td className="py-2 px-2 border-r border-neutral-200 text-center">
              <input
                type="date"
                value={newRowDraft.completionDate}
                onChange={(e) => setNewRowDraft({ ...newRowDraft, completionDate: e.target.value })}
                className="w-full text-xs bg-white/80 border border-neutral-300 hover:border-emerald-500 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </td>

            {/* DIAS (+/-) */}
            <td className="py-2 px-2 border-r border-neutral-200 text-center text-neutral-400 bg-neutral-50/50">
              -
            </td>

            {/* STATUS */}
            <td className="py-2 px-2 border-r border-neutral-200 text-center">
              <select
                value={newRowDraft.status}
                onChange={(e) => setNewRowDraft({ ...newRowDraft, status: e.target.value as TaskStatus })}
                className="w-full text-xs bg-white/80 border border-neutral-300 hover:border-emerald-500 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="Não iniciado">Não iniciado</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Concluído">Concluído</option>
                <option value="Em atraso">Em atraso</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </td>

            {/* AÇÃO: Adicionar / Salvar Linha */}
            <td className="py-2 px-1 text-center whitespace-nowrap">
              <button
                type="button"
                onClick={handleCommitNewRow}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-2xs flex items-center gap-1 mx-auto transition-colors"
                title="Salvar linha preenchida e criar nova linha em branco"
              >
                <Check className="w-3 h-3" />
                <span>Salvar</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  );
};
