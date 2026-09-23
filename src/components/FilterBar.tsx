import React from 'react';
import { TaskFilterState, RESPONSIBLES, SECTORS, TaskStatus } from '../types';
import { Search, X, RotateCcw } from 'lucide-react';

interface FilterBarProps {
  filters: TaskFilterState;
  onFilterChange: (key: keyof TaskFilterState, value: string) => void;
  onResetFilters: () => void;
  campaigns: string[];
  months: string[];
  filteredCount: number;
  totalCount: number;
}

const STATUS_OPTIONS: TaskStatus[] = [
  'Não iniciado',
  'Em andamento',
  'Concluído',
  'Em atraso',
  'Cancelado',
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  campaigns,
  months,
  filteredCount,
  totalCount,
}) => {
  const hasActiveFilters = Boolean(
    filters.campaign ||
    filters.responsible ||
    filters.status ||
    filters.month ||
    filters.sector ||
    filters.search
  );

  return (
    <div
      id="task-filter-bar"
      className="bg-white p-3 rounded-lg border border-neutral-200 shadow-2xs mb-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="filter-search-input"
            type="text"
            placeholder="Buscar por descrição da tarefa ou observação..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#a60000] focus:border-[#a60000] transition-colors"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange('search', '')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Campanha */}
          <div className="flex items-center gap-1">
            <label htmlFor="filter-campaign" className="text-[11px] font-semibold text-neutral-500 whitespace-nowrap">
              Campanha:
            </label>
            <select
              id="filter-campaign"
              value={filters.campaign}
              onChange={(e) => onFilterChange('campaign', e.target.value)}
              className="text-xs py-1.5 px-2 bg-neutral-50 border border-neutral-200 rounded-md text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#a60000]"
            >
              <option value="">Todas</option>
              {campaigns.map((camp) => (
                <option key={camp} value={camp}>
                  {camp}
                </option>
              ))}
            </select>
          </div>

          {/* Responsável */}
          <div className="flex items-center gap-1">
            <label htmlFor="filter-responsible" className="text-[11px] font-semibold text-neutral-500 whitespace-nowrap">
              Responsável:
            </label>
            <select
              id="filter-responsible"
              value={filters.responsible}
              onChange={(e) => onFilterChange('responsible', e.target.value)}
              className="text-xs py-1.5 px-2 bg-neutral-50 border border-neutral-200 rounded-md text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#a60000]"
            >
              <option value="">Todos ({RESPONSIBLES.length})</option>
              {RESPONSIBLES.map((resp) => (
                <option key={resp} value={resp}>
                  {resp}
                </option>
              ))}
            </select>
          </div>

          {/* Setor */}
          <div className="flex items-center gap-1">
            <label htmlFor="filter-sector" className="text-[11px] font-semibold text-neutral-500 whitespace-nowrap">
              Setor:
            </label>
            <select
              id="filter-sector"
              value={filters.sector}
              onChange={(e) => onFilterChange('sector', e.target.value)}
              className="text-xs py-1.5 px-2 bg-neutral-50 border border-neutral-200 rounded-md text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#a60000]"
            >
              <option value="">Todos</option>
              {SECTORS.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1">
            <label htmlFor="filter-status" className="text-[11px] font-semibold text-neutral-500 whitespace-nowrap">
              Status:
            </label>
            <select
              id="filter-status"
              value={filters.status}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className="text-xs py-1.5 px-2 bg-neutral-50 border border-neutral-200 rounded-md text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#a60000]"
            >
              <option value="">Todos</option>
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Mês */}
          <div className="flex items-center gap-1">
            <label htmlFor="filter-month" className="text-[11px] font-semibold text-neutral-500 whitespace-nowrap">
              Mês:
            </label>
            <select
              id="filter-month"
              value={filters.month}
              onChange={(e) => onFilterChange('month', e.target.value)}
              className="text-xs py-1.5 px-2 bg-neutral-50 border border-neutral-200 rounded-md text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#a60000]"
            >
              <option value="">Todos</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              id="btn-reset-filters"
              type="button"
              onClick={onResetFilters}
              className="flex items-center gap-1 text-[11px] font-semibold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1.5 rounded transition-colors"
              title="Limpar todos os filtros"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Active filters tags */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-neutral-500 mt-2.5 pt-2 border-t border-neutral-100">
          <span className="text-neutral-400 font-medium mr-1">Filtros ativos:</span>
          {filters.campaign && (
            <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded text-[10px]">
              Campanha: {filters.campaign}
            </span>
          )}
          {filters.responsible && (
            <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded text-[10px]">
              Responsável: {filters.responsible}
            </span>
          )}
          {filters.sector && (
            <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded text-[10px]">
              Setor: {filters.sector}
            </span>
          )}
          {filters.status && (
            <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded text-[10px]">
              Status: {filters.status}
            </span>
          )}
          {filters.month && (
            <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded text-[10px]">
              Mês: {filters.month}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
