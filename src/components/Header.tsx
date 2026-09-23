import React from 'react';
import { Company } from '../types';
import { 
  Table2, 
  BarChart3, 
  Plus, 
  Tag, 
  Download, 
  Building2,
  Calendar,
  Layers,
  Database
} from 'lucide-react';

interface HeaderProps {
  activeCompany: Company;
  onCompanyChange: (company: Company) => void;
  activeView: 'table' | 'dashboard';
  onViewChange: (view: 'table' | 'dashboard') => void;
  onNewTaskClick: () => void;
  onManageCampaignsClick: () => void;
  onExportCsvClick: () => void;
  taskCountByCompany: Record<Company, number>;
  onOpenSupabaseModal: () => void;
  isSupabaseConnected: boolean;
  isSyncing?: boolean;
}

const COMPANY_LOGOS: Record<Company, { src: string; fallbackSrc?: string; alt: string; className: string }> = {
  DPaschoal: {
    src: 'https://dpaschoal.vtexassets.com/assets/vtex/assets-builder/dpaschoal.store-theme/5.0.3/svg/logo___0a4b60af779f614b17666e49ccd80d76.svg',
    alt: 'DPaschoal',
    className: 'h-8 md:h-9 object-contain shrink-0 max-w-[130px]',
  },
  DPK: {
    // Official logo from SharePoint:
    // https://dpaschoal-my.sharepoint.com/:i:/g/personal/rafael_sousa_dpaschoal_com_br/IQC9AejkZbJIQpL9cL8QrvIjAb3_veu7911Kr2FYrz3UOJA?e=jLCxQC
    src: '/dpk-logo.png',
    fallbackSrc: 'https://dpaschoal-my.sharepoint.com/:i:/g/personal/rafael_sousa_dpaschoal_com_br/IQC9AejkZbJIQpL9cL8QrvIjAb3_veu7911Kr2FYrz3UOJA?download=1',
    alt: 'DPK Autopeças',
    className: 'h-8 md:h-9 object-contain shrink-0 max-w-[130px]',
  },
  AutoZ: {
    src: 'https://autoz.vteximg.com.br/arquivos/logo.svg?v=638743657352170000',
    alt: 'AutoZ',
    className: 'h-7 md:h-8 object-contain shrink-0 max-w-[130px]',
  },
};

export const Header: React.FC<HeaderProps> = ({
  activeCompany,
  onCompanyChange,
  activeView,
  onViewChange,
  onNewTaskClick,
  onManageCampaignsClick,
  onExportCsvClick,
  taskCountByCompany,
  onOpenSupabaseModal,
  isSupabaseConnected,
  isSyncing,
}) => {
  const companies: Company[] = ['DPaschoal', 'DPK', 'AutoZ'];
  const activeLogo = COMPANY_LOGOS[activeCompany] || COMPANY_LOGOS.DPaschoal;

  return (
    <header id="app-header" className="bg-white border-b border-neutral-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6">
        {/* Top bar with company brand + view switch + quick actions */}
        <div className="py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-neutral-100">
          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            <div className="h-9 flex items-center justify-center min-w-[70px]">
              <img 
                key={activeCompany}
                src={activeLogo.src} 
                alt={activeLogo.alt} 
                className={activeLogo.className}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  if (activeLogo.fallbackSrc && e.currentTarget.src !== activeLogo.fallbackSrc) {
                    e.currentTarget.src = activeLogo.fallbackSrc;
                  }
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-neutral-900 leading-none">
                  Gestão de Campanhas & Tarefas
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-[#a60000] px-2 py-0.5 rounded-full">
                  {activeCompany}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Controle operacional de prazos, entregáveis e indicadores por setor
              </p>
            </div>
          </div>

          {/* Center: View Switcher (Planilha vs Dashboard) */}
          <div id="view-mode-selector" className="flex items-center bg-neutral-100 p-1 rounded-lg border border-neutral-200 self-stretch md:self-auto">
            <button
              id="view-table-btn"
              type="button"
              onClick={() => onViewChange('table')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeView === 'table'
                  ? 'bg-white text-[#a60000] shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Table2 className="w-4 h-4" />
              <span>Planilha de Tarefas</span>
            </button>
            <button
              id="view-dashboard-btn"
              type="button"
              onClick={() => onViewChange('dashboard')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeView === 'dashboard'
                  ? 'bg-[#a60000] text-white shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard de Gráficos</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap self-stretch md:self-auto">
            {/* Supabase Status / Connect Button */}
            <button
              id="btn-supabase-status"
              type="button"
              onClick={onOpenSupabaseModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
                isSupabaseConnected
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
              title="Configurar ou gerenciar banco Supabase para sincronização em nuvem com a equipe"
            >
              <Database className={`w-3.5 h-3.5 ${isSupabaseConnected ? 'text-emerald-600' : 'text-neutral-500'}`} />
              <span className="hidden sm:inline">
                {isSupabaseConnected ? 'Supabase Online' : 'Conectar Supabase'}
              </span>
              {isSupabaseConnected && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sincronizado em tempo real"></span>
              )}
              {isSyncing && (
                <span className="text-[10px] text-emerald-700 font-mono animate-spin" title="Sincronizando...">⟳</span>
              )}
            </button>

            <button
              id="btn-manage-campaigns"
              type="button"
              onClick={onManageCampaignsClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
              title="Adicionar ou visualizar campanhas cadastradas"
            >
              <Tag className="w-3.5 h-3.5 text-neutral-500" />
              <span>Campanhas</span>
            </button>

            <button
              id="btn-export-csv"
              type="button"
              onClick={onExportCsvClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
              title="Exportar planilha para arquivo CSV/Excel"
            >
              <Download className="w-3.5 h-3.5 text-neutral-500" />
              <span>Exportar</span>
            </button>

            <button
              id="btn-add-task"
              type="button"
              onClick={onNewTaskClick}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#a60000] hover:bg-[#8f0000] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Tarefa</span>
            </button>
          </div>
        </div>

        {/* Company Tabs: DPaschoal, DPK, AutoZ */}
        <div id="company-tabs-container" className="flex items-center justify-between gap-4 pt-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-neutral-500 mr-2 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              Empresa:
            </span>
            {companies.map((comp) => {
              const isActive = activeCompany === comp;
              const count = taskCountByCompany[comp] || 0;
              return (
                <button
                  key={comp}
                  id={`tab-company-${comp.toLowerCase()}`}
                  type="button"
                  onClick={() => onCompanyChange(comp)}
                  className={`relative flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? 'border-[#a60000] text-[#a60000] bg-red-50/40 rounded-t-md font-extrabold'
                      : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-t-md'
                  }`}
                >
                  <span>{comp}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isActive
                        ? 'bg-[#a60000] text-white'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-4 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              Ano Base: <strong className="text-neutral-700">2026</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-neutral-400" />
              Ambiente Corporativo
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
