import React, { useState, useEffect } from 'react';
import { 
  Task, 
  Company, 
  TaskStatus, 
  RESPONSIBLES, 
  SECTORS, 
  Responsible, 
  Sector 
} from '../types';
import { 
  calculateEndDate, 
  calculateDiffDays, 
  getMonthAbbr, 
  formatDateToBR, 
  formatDiffDays 
} from '../utils/dateUtils';
import { splitMulti, joinMulti } from '../utils/multiSelectUtils';
import { X, Calendar, Clock, AlertCircle, CheckCircle2, Sparkles, Plus, Check } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string) => void;
  initialTask?: Task | null;
  defaultCompany: Company;
  campaigns: string[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
  defaultCompany,
  campaigns,
}) => {
  const [company, setCompany] = useState<Company>(defaultCompany);
  const [campaign, setCampaign] = useState<string>(campaigns[0] || 'Revisão DPaschoal');
  const [taskNumber, setTaskNumber] = useState<string>('1.0');
  const [description, setDescription] = useState<string>('');
  
  // Multi-select state for Responsibles and Sectors
  const [selectedResponsibles, setSelectedResponsibles] = useState<string[]>([RESPONSIBLES[0]]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([SECTORS[0]]);
  const [customResp, setCustomResp] = useState<string>('');
  const [customSec, setCustomSec] = useState<string>('');

  const [durationDays, setDurationDays] = useState<number>(5);
  const [startDate, setStartDate] = useState<string>('2026-09-02');
  const [endDate, setEndDate] = useState<string>('2026-09-06');
  const [completionDate, setCompletionDate] = useState<string>('');
  const [status, setStatus] = useState<TaskStatus>('Não iniciado');
  const [notes, setNotes] = useState<string>('');
  const [customMonth, setCustomMonth] = useState<string>('');

  // Automatically recalculate End Date when Start Date or Duration changes
  useEffect(() => {
    if (startDate && durationDays) {
      const computedEnd = calculateEndDate(startDate, durationDays);
      setEndDate(computedEnd);
    }
  }, [startDate, durationDays]);

  // Derive diffDays in real-time
  const computedDiffDays = calculateDiffDays(completionDate, endDate);

  // Month calculation
  const calculatedMonth = startDate ? getMonthAbbr(startDate) : 'Setembro/26';

  // Initialize or reset form when modal opens or initialTask changes
  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setCompany(initialTask.company);
        setCampaign(initialTask.campaign);
        setTaskNumber(initialTask.taskNumber);
        setDescription(initialTask.description);
        
        const respList = splitMulti(initialTask.responsible);
        setSelectedResponsibles(respList.length > 0 ? respList : [initialTask.responsible || RESPONSIBLES[0]]);
        
        const secList = splitMulti(initialTask.sector);
        setSelectedSectors(secList.length > 0 ? secList : [initialTask.sector || SECTORS[0]]);

        const parsedDuration = typeof initialTask.durationDays === 'number'
          ? initialTask.durationDays
          : parseInt(String(initialTask.durationDays).replace(/\D/g, ''), 10) || 5;
        setDurationDays(parsedDuration);
        setStartDate(initialTask.startDate);
        setEndDate(initialTask.endDate);
        setCompletionDate(initialTask.completionDate || '');
        setStatus(initialTask.status);
        setNotes(initialTask.notes || '');
        setCustomMonth(initialTask.month);
      } else {
        setCompany(defaultCompany);
        setCampaign(campaigns[0] || 'Revisão DPaschoal');
        setTaskNumber('1.0');
        setDescription('');
        setSelectedResponsibles([RESPONSIBLES[0]]);
        setSelectedSectors([SECTORS[0]]);
        setDurationDays(5);
        const todayStr = '2026-09-02';
        setStartDate(todayStr);
        setEndDate(calculateEndDate(todayStr, 5));
        setCompletionDate('');
        setStatus('Não iniciado');
        setNotes('');
        setCustomMonth('');
      }
      setCustomResp('');
      setCustomSec('');
    }
  }, [isOpen, initialTask, defaultCompany, campaigns]);

  if (!isOpen) return null;

  // Toggle responsible
  const toggleResponsible = (name: string) => {
    setSelectedResponsibles((prev) => {
      if (prev.includes(name)) {
        if (prev.length === 1) return prev; // keep at least 1
        return prev.filter((r) => r !== name);
      }
      return [...prev, name];
    });
  };

  const addCustomResponsible = () => {
    if (customResp.trim() && !selectedResponsibles.includes(customResp.trim())) {
      setSelectedResponsibles([...selectedResponsibles, customResp.trim()]);
      setCustomResp('');
    }
  };

  // Toggle sector
  const toggleSector = (sec: string) => {
    setSelectedSectors((prev) => {
      if (prev.includes(sec)) {
        if (prev.length === 1) return prev; // keep at least 1
        return prev.filter((s) => s !== sec);
      }
      return [...prev, sec];
    });
  };

  const addCustomSector = () => {
    if (customSec.trim() && !selectedSectors.includes(customSec.trim())) {
      setSelectedSectors([...selectedSectors, customSec.trim()]);
      setCustomSec('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const finalMonth = customMonth || calculatedMonth;
    const finalDiff = calculateDiffDays(completionDate, endDate);

    // If completion date is provided and status is still "Não iniciado", auto suggest "Concluído"
    let finalStatus = status;
    if (completionDate && status === 'Não iniciado') {
      finalStatus = 'Concluído';
    }

    const finalResponsible = selectedResponsibles.length > 0 ? joinMulti(selectedResponsibles) : 'Todos';
    const finalSector = selectedSectors.length > 0 ? joinMulti(selectedSectors) : 'Marketing';

    onSave(
      {
        company,
        month: finalMonth,
        campaign,
        taskNumber,
        description: description.trim(),
        responsible: finalResponsible,
        sector: finalSector,
        durationDays,
        startDate,
        endDate,
        completionDate: completionDate || undefined,
        diffDays: finalDiff,
        status: finalStatus,
        notes: notes.trim() || undefined,
      },
      initialTask?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs overflow-y-auto">
      <div 
        id="task-form-modal"
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl border border-neutral-200 overflow-hidden my-8"
      >
        {/* Header */}
        <div className="bg-[#a60000] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm uppercase tracking-wider">
              {initialTask ? 'Editar Tarefa' : 'Nova Tarefa de Campanha'}
            </span>
            <span className="bg-red-950/60 px-2 py-0.5 rounded text-[11px] font-medium">
              {company}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-red-200 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Row 1: Empresa & Campanha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="modal-company" className="block text-xs font-bold text-neutral-700 mb-1">
                Empresa *
              </label>
              <select
                id="modal-company"
                value={company}
                onChange={(e) => setCompany(e.target.value as Company)}
                className="w-full text-xs py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-md focus:ring-1 focus:ring-[#a60000] focus:border-[#a60000]"
                required
              >
                <option value="DPaschoal">DPaschoal</option>
                <option value="DPK">DPK</option>
                <option value="AutoZ">AutoZ</option>
              </select>
            </div>

            <div>
              <label htmlFor="modal-campaign" className="block text-xs font-bold text-neutral-700 mb-1">
                Campanha *
              </label>
              <select
                id="modal-campaign"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                className="w-full text-xs py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-md focus:ring-1 focus:ring-[#a60000] focus:border-[#a60000]"
                required
              >
                {campaigns.map((camp) => (
                  <option key={camp} value={camp}>
                    {camp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Nº da Tarefa & Mês */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="modal-task-number" className="block text-xs font-bold text-neutral-700 mb-1">
                Nº Tarefa *
              </label>
              <input
                id="modal-task-number"
                type="text"
                placeholder="Ex: 1.0, 1.1"
                value={taskNumber}
                onChange={(e) => setTaskNumber(e.target.value)}
                className="w-full text-xs py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-md focus:ring-1 focus:ring-[#a60000] focus:border-[#a60000]"
                required
              />
            </div>

            <div>
              <label htmlFor="modal-month" className="block text-xs font-bold text-neutral-700 mb-1">
                Mês (ex: Setembro/26)
              </label>
              <input
                id="modal-month"
                type="text"
                placeholder={calculatedMonth}
                value={customMonth || calculatedMonth}
                onChange={(e) => setCustomMonth(e.target.value)}
                className="w-full text-xs py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-md focus:ring-1 focus:ring-[#a60000] focus:border-[#a60000]"
              />
            </div>

            <div>
              <label htmlFor="modal-status" className="block text-xs font-bold text-neutral-700 mb-1">
                Status *
              </label>
              <select
                id="modal-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full text-xs py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-md focus:ring-1 focus:ring-[#a60000] focus:border-[#a60000] font-semibold"
                required
              >
                <option value="Não iniciado">Não iniciado</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Concluído">Concluído</option>
                <option value="Em atraso">Em atraso</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Row 3: Descrição da Tarefa */}
          <div>
            <label htmlFor="modal-description" className="block text-xs font-bold text-neutral-700 mb-1">
              Descrição da Tarefa *
            </label>
            <textarea
              id="modal-description"
              rows={2}
              placeholder="Descreva a atividade ou entregável da campanha..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-300 rounded-md focus:ring-1 focus:ring-[#a60000] focus:border-[#a60000]"
              required
            />
          </div>

          {/* Row 4: Responsável & Setor com Lista de Seleção Sempre Disponível */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Responsáveis: Lista de Seleção Sempre Disponível + Checkboxes */}
            <div className="border border-neutral-300 bg-white p-3.5 rounded-lg shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <label htmlFor="modal-responsible-select" className="block text-xs font-bold text-neutral-900">
                  Lista de Seleção: Responsável *
                </label>
                <span className="text-[10px] bg-red-100 text-[#a60000] font-bold px-2 py-0.5 rounded-full">
                  {selectedResponsibles.length} selecionado{selectedResponsibles.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* 1. O DROPDOWN SELECT TRADICIONAL (SEMPRE DISPONÍVEL) */}
              <div>
                <select
                  id="modal-responsible-select"
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      toggleResponsible(val);
                    }
                  }}
                  className="w-full text-xs py-2 px-3 bg-neutral-50 hover:bg-white border border-neutral-300 rounded-md font-medium text-neutral-800 focus:ring-2 focus:ring-[#a60000] focus:border-[#a60000] cursor-pointer"
                >
                  <option value="">▼ Selecionar na lista ({RESPONSIBLES.length} integrantes)...</option>
                  {RESPONSIBLES.map((resp) => (
                    <option key={resp} value={resp}>
                      {selectedResponsibles.includes(resp) ? `✓ ${resp} (já selecionado - clique p/ remover)` : `+ ${resp}`}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-neutral-500 mt-1">
                  💡 Escolha na lista acima ou marque/desmarque nas caixinhas abaixo:
                </p>
              </div>

              {/* 2. Tag badges dos selecionados */}
              <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-md">
                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Selecionado(s) para esta tarefa:</span>
                  {selectedResponsibles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSelectedResponsibles([selectedResponsibles[0]])}
                      className="text-[10px] text-red-700 hover:underline cursor-pointer"
                    >
                      Manter apenas o 1º
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-[26px]">
                  {selectedResponsibles.length === 0 ? (
                    <span className="text-xs text-neutral-400 italic">Nenhum responsável selecionado</span>
                  ) : (
                    selectedResponsibles.map((resp) => (
                      <span
                        key={resp}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#a60000] text-white px-2 py-0.5 rounded shadow-2xs"
                      >
                        {resp}
                        <button
                          type="button"
                          onClick={() => toggleResponsible(resp)}
                          className="hover:bg-red-800 rounded-full p-0.5 transition-colors cursor-pointer"
                          title={`Remover ${resp}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* 3. Lista de opções visíveis com checkboxes para seleção múltipla */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-neutral-500">
                    Todos os Integrantes ({RESPONSIBLES.length}):
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedResponsibles(['Todos'])}
                    className="text-[10px] text-[#a60000] hover:underline font-semibold cursor-pointer"
                  >
                    Marcar "Todos"
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto p-1.5 bg-neutral-50/80 border border-neutral-200 rounded">
                  {RESPONSIBLES.map((r) => {
                    const isChecked = selectedResponsibles.includes(r);
                    return (
                      <label
                        key={r}
                        className={`flex items-center gap-1.5 text-[11px] px-1.5 py-1 rounded cursor-pointer border transition-colors select-none ${
                          isChecked
                            ? 'bg-red-50 text-[#a60000] border-red-300 font-bold'
                            : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleResponsible(r)}
                          className="w-3.5 h-3.5 accent-[#a60000] rounded cursor-pointer"
                        />
                        <span className="truncate">{r}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 4. Campo para adicionar outro integrante personalizado */}
              <div className="flex gap-1.5 pt-0.5">
                <input
                  type="text"
                  placeholder="Ou digite outro nome..."
                  value={customResp}
                  onChange={(e) => setCustomResp(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomResponsible();
                    }
                  }}
                  className="flex-1 text-xs py-1 px-2.5 bg-neutral-50 border border-neutral-300 rounded focus:bg-white focus:ring-1 focus:ring-[#a60000]"
                />
                <button
                  type="button"
                  onClick={addCustomResponsible}
                  className="text-xs bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer"
                  title="Adicionar à lista"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Setores: Lista de Seleção Sempre Disponível + Checkboxes */}
            <div className="border border-neutral-300 bg-white p-3.5 rounded-lg shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <label htmlFor="modal-sector-select" className="block text-xs font-bold text-neutral-900">
                  Lista de Seleção: Setor / Frente *
                </label>
                <span className="text-[10px] bg-neutral-200 text-neutral-800 font-bold px-2 py-0.5 rounded-full">
                  {selectedSectors.length} selecionado{selectedSectors.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* 1. O DROPDOWN SELECT TRADICIONAL (SEMPRE DISPONÍVEL) */}
              <div>
                <select
                  id="modal-sector-select"
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      toggleSector(val);
                    }
                  }}
                  className="w-full text-xs py-2 px-3 bg-neutral-50 hover:bg-white border border-neutral-300 rounded-md font-medium text-neutral-800 focus:ring-2 focus:ring-[#a60000] focus:border-[#a60000] cursor-pointer"
                >
                  <option value="">▼ Selecionar na lista ({SECTORS.length} setores)...</option>
                  {SECTORS.map((sec) => (
                    <option key={sec} value={sec}>
                      {selectedSectors.includes(sec) ? `✓ ${sec} (já selecionado - clique p/ remover)` : `+ ${sec}`}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-neutral-500 mt-1">
                  💡 Escolha na lista acima ou marque/desmarque nas caixinhas abaixo:
                </p>
              </div>

              {/* 2. Tag badges dos selecionados */}
              <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-md">
                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Setor(es) envolvido(s):</span>
                  {selectedSectors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSectors([selectedSectors[0]])}
                      className="text-[10px] text-neutral-700 hover:underline cursor-pointer"
                    >
                      Manter apenas o 1º
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-[26px]">
                  {selectedSectors.length === 0 ? (
                    <span className="text-xs text-neutral-400 italic">Nenhum setor selecionado</span>
                  ) : (
                    selectedSectors.map((sec) => (
                      <span
                        key={sec}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold bg-neutral-800 text-white px-2 py-0.5 rounded shadow-2xs"
                      >
                        {sec}
                        <button
                          type="button"
                          onClick={() => toggleSector(sec)}
                          className="hover:bg-neutral-700 rounded-full p-0.5 transition-colors cursor-pointer"
                          title={`Remover ${sec}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* 3. Lista de opções visíveis com checkboxes para seleção múltipla */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-neutral-500">
                    Todos os Setores ({SECTORS.length}):
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedSectors(['Marketing'])}
                    className="text-[10px] text-neutral-700 hover:underline font-semibold cursor-pointer"
                  >
                    Padrão (Marketing)
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto p-1.5 bg-neutral-50/80 border border-neutral-200 rounded">
                  {SECTORS.map((s) => {
                    const isChecked = selectedSectors.includes(s);
                    return (
                      <label
                        key={s}
                        className={`flex items-center gap-1.5 text-[11px] px-1.5 py-1 rounded cursor-pointer border transition-colors select-none ${
                          isChecked
                            ? 'bg-neutral-200 text-neutral-900 border-neutral-400 font-bold'
                            : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSector(s)}
                          className="w-3.5 h-3.5 accent-neutral-800 rounded cursor-pointer"
                        />
                        <span className="truncate">{s}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 4. Campo para adicionar outro setor personalizado */}
              <div className="flex gap-1.5 pt-0.5">
                <input
                  type="text"
                  placeholder="Ou digite outro setor..."
                  value={customSec}
                  onChange={(e) => setCustomSec(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomSector();
                    }
                  }}
                  className="flex-1 text-xs py-1 px-2.5 bg-neutral-50 border border-neutral-300 rounded focus:bg-white focus:ring-1 focus:ring-[#a60000]"
                />
                <button
                  type="button"
                  onClick={addCustomSector}
                  className="text-xs bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer"
                  title="Adicionar à lista"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Section: Cálculo Automático de Prazos (Excel Logic) */}
          <div className="bg-neutral-50 p-3.5 rounded-lg border border-neutral-200 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#a60000]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cálculo Automático de Prazos e Dias (+/-)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Duração (em dias) */}
              <div>
                <label htmlFor="modal-duration" className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  Duração (em dias) *
                </label>
                <input
                  id="modal-duration"
                  type="number"
                  min="1"
                  placeholder="Ex: 45"
                  value={durationDays}
                  onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full text-xs py-1.5 px-3 bg-white border border-neutral-300 rounded-md focus:ring-1 focus:ring-[#a60000] font-bold text-neutral-800"
                  required
                />
              </div>

              {/* Data Início */}
              <div>
                <label htmlFor="modal-start-date" className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  Data de Início *
                </label>
                <input
                  id="modal-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs py-1.5 px-3 bg-white border border-neutral-300 rounded-md focus:ring-1 focus:ring-[#a60000]"
                  required
                />
              </div>

              {/* Data Final (Calculada Automaticamente) */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1 flex items-center justify-between">
                  <span>Data Final</span>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase">Automático</span>
                </label>
                <div className="w-full text-xs py-1.5 px-3 bg-amber-50/60 border border-amber-200 rounded-md font-bold text-neutral-800 flex items-center justify-between">
                  <span>{formatDateToBR(endDate) || 'Aguardando...'}</span>
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                </div>
              </div>
            </div>

            {/* Conclusão & Dias (+/-) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-200">
              <div>
                <label htmlFor="modal-completion-date" className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  Data de Conclusão Real (opcional)
                </label>
                <input
                  id="modal-completion-date"
                  type="date"
                  value={completionDate}
                  onChange={(e) => {
                    const newComp = e.target.value;
                    setCompletionDate(newComp);
                    if (newComp && status === 'Não iniciado') {
                      setStatus('Concluído');
                    }
                  }}
                  className="w-full text-xs py-1.5 px-3 bg-white border border-neutral-300 rounded-md focus:ring-1 focus:ring-[#a60000]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1 flex items-center justify-between">
                  <span>Resultado: Dias (+/-)</span>
                  <span className="text-[10px] text-neutral-500 font-medium">Previsto vs. Real</span>
                </label>
                <div className="w-full text-xs py-1.5 px-3 bg-white border border-neutral-300 rounded-md font-bold flex items-center justify-between">
                  {computedDiffDays !== null ? (
                    <span
                      className={`text-xs font-bold ${
                        computedDiffDays < 0
                          ? 'text-emerald-700'
                          : computedDiffDays > 0
                          ? 'text-red-700'
                          : 'text-neutral-800'
                      }`}
                    >
                      {formatDiffDays(computedDiffDays)} dias ({computedDiffDays < 0 ? 'Adiantado' : computedDiffDays > 0 ? 'Atrasado' : 'No prazo'})
                    </span>
                  ) : (
                    <span className="text-neutral-400 font-normal">Preencha a data de conclusão</span>
                  )}
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label htmlFor="modal-notes" className="block text-xs font-bold text-neutral-700 mb-1">
              Observações / Entregáveis
            </label>
            <input
              id="modal-notes"
              type="text"
              placeholder="Ex: Alinhado com compras, link do drive, feedback..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-md focus:ring-1 focus:ring-[#a60000] focus:border-[#a60000]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              id="modal-submit-btn"
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-[#a60000] hover:bg-[#8f0000] rounded-md shadow-xs transition-colors"
            >
              {initialTask ? 'Salvar Alterações' : 'Cadastrar Tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
