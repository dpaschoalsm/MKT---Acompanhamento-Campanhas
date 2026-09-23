import React, { useState, useMemo } from 'react';
import { Task, Company, RESPONSIBLES, SECTORS } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  CartesianGrid 
} from 'recharts';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  PlayCircle, 
  ListTodo, 
  Users, 
  Briefcase, 
  Target,
  Filter,
  RotateCcw
} from 'lucide-react';

interface DashboardViewProps {
  tasks: Task[];
  company: Company;
  campaigns: string[];
}

// Brand color palette
const STATUS_COLORS: Record<string, string> = {
  'Concluído': '#5cb85c',     // Vivid green from screenshot
  'Em atraso': '#e53935',     // Vivid red from screenshot
  'Em andamento': '#0284c7',  // Sky blue
  'Não iniciado': '#64748b',  // Slate gray
  'Cancelado': '#a3a3a3',     // Neutral gray
};

const SECTOR_COLORS = [
  '#a60000', '#d97706', '#2563eb', '#7c3aed', 
  '#059669', '#0891b2', '#e11d48', '#4b5563', '#ea580c'
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  company,
  campaigns,
}) => {
  // Campaign filter state (empty string = todas as campanhas)
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');

  // Filter tasks based on selected campaign
  const filteredTasks = useMemo(() => {
    if (!selectedCampaign) return tasks;
    return tasks.filter((t) => t.campaign === selectedCampaign);
  }, [tasks, selectedCampaign]);

  // 1. Core KPIs
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter((t) => t.status === 'Concluído').length;
  const delayedTasks = filteredTasks.filter((t) => t.status === 'Em atraso').length;
  const notStartedTasks = filteredTasks.filter((t) => t.status === 'Não iniciado').length;
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'Em andamento').length;
  const cancelledTasks = filteredTasks.filter((t) => t.status === 'Cancelado').length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const delayRate = totalTasks > 0 ? Math.round((delayedTasks / totalTasks) * 100) : 0;

  // 2. Gráfico Donut de Proporção de Status
  const pieStatusData = [
    { name: 'Concluído', value: completedTasks, color: '#5cb85c' },
    { name: 'Em atraso', value: delayedTasks, color: '#e53935' },
    { name: 'Em andamento', value: inProgressTasks, color: '#0284c7' },
    { name: 'Não iniciado', value: notStartedTasks, color: '#64748b' },
    ...(cancelledTasks > 0 ? [{ name: 'Cancelado', value: cancelledTasks, color: '#a3a3a3' }] : []),
  ].filter((item) => item.value > 0);

  // 3. Tarefas por Campanha
  const campaignData = (selectedCampaign ? [selectedCampaign] : campaigns).map((camp) => {
    const campTasks = tasks.filter((t) => t.campaign === camp);
    return {
      name: camp,
      total: campTasks.length,
      concluidas: campTasks.filter((t) => t.status === 'Concluído').length,
      emAtraso: campTasks.filter((t) => t.status === 'Em atraso').length,
      emAndamento: campTasks.filter((t) => t.status === 'Em andamento').length,
      naoIniciadas: campTasks.filter((t) => t.status === 'Não iniciado').length,
    };
  }).filter((c) => c.total > 0 || campaigns.length <= 4);

  // 4. Tarefas por Responsável (reconhece múltiplos responsáveis como Dalila + Lívia)
  const responsibleData = RESPONSIBLES.map((resp) => {
    const respLower = resp.toLowerCase();
    const respTasks = filteredTasks.filter((t) => {
      if (!t.responsible) return false;
      const tLower = t.responsible.toLowerCase();
      if (tLower === respLower) return true;
      if (resp === 'Sidney' && (tLower.includes('sid') || tLower.includes('sidney'))) return true;
      if (resp === 'Natalia Maia' && (tLower.includes('natalia'))) return true;
      return tLower.includes(respLower);
    });
    return {
      name: resp,
      total: respTasks.length,
      concluidas: respTasks.filter((t) => t.status === 'Concluído').length,
      emAtraso: respTasks.filter((t) => t.status === 'Em atraso').length,
      emAndamento: respTasks.filter((t) => t.status === 'Em andamento').length,
      naoIniciadas: respTasks.filter((t) => t.status === 'Não iniciado').length,
    };
  }).filter((r) => r.total > 0).sort((a, b) => b.total - a.total);

  // 5. Tarefas por Setor (reconhece múltiplos setores como Trade + Social)
  const sectorData = SECTORS.map((sec) => {
    const secLower = sec.toLowerCase();
    const secTasks = filteredTasks.filter((t) => {
      if (!t.sector) return false;
      const sLower = t.sector.toLowerCase();
      if (sLower === secLower) return true;
      if (sec === 'Branding e Comunicação' && (sLower.includes('branding') || sLower.includes('brand'))) return true;
      return sLower.includes(secLower);
    });
    return {
      name: sec,
      total: secTasks.length,
      concluidas: secTasks.filter((t) => t.status === 'Concluído').length,
      emAtraso: secTasks.filter((t) => t.status === 'Em atraso').length,
    };
  }).filter((s) => s.total > 0).sort((a, b) => b.total - a.total);

  // 6. Indicador de Prazos (Dias +/-)
  const completedWithDiff = filteredTasks.filter(
    (t) => t.status === 'Concluído' && t.diffDays !== undefined && t.diffDays !== null
  );
  const earlyCount = completedWithDiff.filter((t) => (t.diffDays || 0) < 0).length;
  const onTimeCount = completedWithDiff.filter((t) => (t.diffDays || 0) === 0).length;
  const lateCount = completedWithDiff.filter((t) => (t.diffDays || 0) > 0).length;

  return (
    <div id="dashboard-view-container" className="space-y-6 pb-12">
      {/* Title Header with Company branding */}
      <div className="bg-[#a60000] text-white p-4 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-bold bg-red-950/50 px-2.5 py-1 rounded">
            Visão Executiva &amp; Indicadores
          </span>
          <h2 className="text-xl font-black uppercase tracking-wide mt-1">
            Dashboard de Campanhas - {company}
          </h2>
          <p className="text-xs text-red-100">
            Acompanhamento de volumetria, gargalos de entrega e distribuição de carga por time
          </p>
        </div>

        <div className="flex items-center gap-3 bg-red-950/40 p-2.5 rounded-lg border border-red-800">
          <div className="text-right">
            <div className="text-[11px] text-red-200">Progresso Geral</div>
            <div className="text-lg font-black">{completionRate}% Concluído</div>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-emerald-400 flex items-center justify-center font-black text-xs bg-red-900">
            {completedTasks}/{totalTasks}
          </div>
        </div>
      </div>

      {/* Campaign Filter Controls */}
      <div id="dashboard-campaign-filter-bar" className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-neutral-800 font-semibold text-sm">
          <Filter className="w-4 h-4 text-[#a60000]" />
          <span>Filtrar por Campanha:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* "Todas" button */}
          <button
            id="filter-all-campaigns"
            onClick={() => setSelectedCampaign('')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              !selectedCampaign
                ? 'bg-[#a60000] text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Todas as Campanhas ({tasks.length})
          </button>

          {/* Individual campaign buttons */}
          {campaigns.map((camp) => {
            const count = tasks.filter((t) => t.campaign === camp).length;
            const isSelected = selectedCampaign === camp;
            return (
              <button
                key={camp}
                id={`filter-camp-${camp.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => setSelectedCampaign(camp)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#a60000] text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                <span>{camp}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-red-950/40 text-red-100' : 'bg-neutral-200 text-neutral-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}

          {selectedCampaign && (
            <button
              id="clear-dashboard-campaign-filter"
              onClick={() => setSelectedCampaign('')}
              className="text-xs text-neutral-500 hover:text-[#a60000] flex items-center gap-1 px-2 py-1 ml-1"
              title="Limpar filtro de campanha"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Top 5 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total */}
        <div id="card-total-tasks" className="bg-white p-3.5 rounded-lg border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total</span>
            <ListTodo className="w-4 h-4 text-[#a60000]" />
          </div>
          <div className="text-2xl font-black text-neutral-900">{totalTasks}</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">Tarefas cadastradas</div>
        </div>

        {/* Concluídas */}
        <div id="card-completed-tasks" className="bg-white p-3.5 rounded-lg border border-neutral-200 shadow-2xs border-l-4 border-l-[#5cb85c]">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Concluídas</span>
            <CheckCircle2 className="w-4 h-4 text-[#5cb85c]" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{completedTasks}</div>
          <div className="text-[11px] text-emerald-800 font-medium mt-0.5">
            {completionRate}% do total
          </div>
        </div>

        {/* Em Atraso */}
        <div id="card-delayed-tasks" className="bg-white p-3.5 rounded-lg border border-neutral-200 shadow-2xs border-l-4 border-l-[#e53935]">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-red-800">Em Atraso</span>
            <AlertTriangle className="w-4 h-4 text-[#e53935]" />
          </div>
          <div className="text-2xl font-black text-red-700">{delayedTasks}</div>
          <div className="text-[11px] text-red-800 font-medium mt-0.5">
            {delayRate}% requerem atenção
          </div>
        </div>

        {/* Em Andamento */}
        <div id="card-inprogress-tasks" className="bg-white p-3.5 rounded-lg border border-neutral-200 shadow-2xs border-l-4 border-l-[#0284c7]">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-800">Em Andamento</span>
            <Clock className="w-4 h-4 text-[#0284c7]" />
          </div>
          <div className="text-2xl font-black text-sky-700">{inProgressTasks}</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">Em execução ativa</div>
        </div>

        {/* Não Iniciadas */}
        <div id="card-notstarted-tasks" className="bg-white p-3.5 rounded-lg border border-neutral-200 shadow-2xs border-l-4 border-l-[#64748b]">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Não Iniciadas</span>
            <PlayCircle className="w-4 h-4 text-[#64748b]" />
          </div>
          <div className="text-2xl font-black text-slate-700">{notStartedTasks}</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">Fila de espera</div>
        </div>
      </div>

      {/* Row 1: Desempenho por Campanha & Proporção de Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Desempenho por Campanha */}
        <div id="chart-campaign-breakdown" className="lg:col-span-2 bg-white p-5 rounded-lg border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#a60000]" />
                Desempenho por Campanha
              </h3>
              <p className="text-xs text-neutral-500">
                Comparativo de tarefas por status nas campanhas (Revisão DPaschoal, Black Friday, Férias, etc.)
              </p>
            </div>
            <span className="text-[11px] font-semibold text-neutral-500">
              {selectedCampaign ? `Campanha: ${selectedCampaign}` : `${campaigns.length} Campanhas`}
            </span>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#334155' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="concluidas" name="Concluídas" fill="#5cb85c" radius={[3, 3, 0, 0]} />
                <Bar dataKey="emAtraso" name="Em Atraso" fill="#e53935" radius={[3, 3, 0, 0]} />
                <Bar dataKey="emAndamento" name="Em Andamento" fill="#0284c7" radius={[3, 3, 0, 0]} />
                <Bar dataKey="naoIniciadas" name="Não Iniciadas" fill="#64748b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut de Distribuição de Status */}
        <div id="chart-status-donut" className="bg-white p-5 rounded-lg border border-neutral-200 shadow-2xs flex flex-col">
          <div className="border-b border-neutral-100 pb-3 mb-3">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-[#a60000]" />
              Proporção de Status
            </h3>
            <p className="text-xs text-neutral-500">Distribuição percentual da empresa</p>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-[220px]">
            {pieStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieStatusData.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name: any) => [`${value} tarefas`, name]}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-neutral-400">Nenhum dado cadastrado</div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Tarefas por Responsável & Tarefas por Setor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 3: Tarefas por Responsável (11 pessoas) */}
        <div id="chart-responsible-breakdown" className="bg-white p-5 rounded-lg border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#a60000]" />
                Tarefas por Responsável
              </h3>
              <p className="text-xs text-neutral-500">
                Distribuição entre os 11 responsáveis e status das atribuições
              </p>
            </div>
            <span className="text-[11px] font-semibold text-neutral-500">
              11 Membros
            </span>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={responsibleData} 
                layout="vertical"
                margin={{ top: 5, right: 20, left: 25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 600 }} width={75} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
                <Bar dataKey="concluidas" name="Concluídas" fill="#5cb85c" stackId="a" />
                <Bar dataKey="emAtraso" name="Em Atraso" fill="#e53935" stackId="a" />
                <Bar dataKey="emAndamento" name="Em Andamento" fill="#0284c7" stackId="a" />
                <Bar dataKey="naoIniciadas" name="Não Iniciadas" fill="#64748b" stackId="a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 4: Tarefas por Setor (9 setores) */}
        <div id="chart-sector-breakdown" className="bg-white p-5 rounded-lg border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#a60000]" />
                Tarefas por Setor
              </h3>
              <p className="text-xs text-neutral-500">
                Alocação de demandas entre os 9 setores da organização
              </p>
            </div>
            <span className="text-[11px] font-semibold text-neutral-500">
              9 Setores
            </span>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={sectorData} 
                layout="vertical"
                margin={{ top: 5, right: 20, left: 35, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#1e293b' }} width={100} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
                <Bar dataKey="total" name="Total Tarefas" fill="#a60000" radius={[0, 4, 4, 0]} />
                <Bar dataKey="concluidas" name="Concluídas" fill="#5cb85c" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4: Eficiência de Entrega e Prazos (Dias +/-) */}
      <div id="card-delivery-performance" className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
          Análise de Precisão de Prazos (Dias +/- Conclusão Real vs Prevista)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-md border border-neutral-200 flex items-center justify-between">
            <div>
              <div className="text-xs text-emerald-800 font-medium">Entregues Antecipadas</div>
              <div className="text-xl font-black text-emerald-700">{earlyCount} tarefas</div>
              <div className="text-[10px] text-neutral-500">Dias (-) menos tempo gasto</div>
            </div>
            <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-xs">
              ✓-
            </span>
          </div>

          <div className="bg-white p-3 rounded-md border border-neutral-200 flex items-center justify-between">
            <div>
              <div className="text-xs text-neutral-700 font-medium">Entregues no Prazo Exato</div>
              <div className="text-xl font-black text-neutral-800">{onTimeCount} tarefas</div>
              <div className="text-[10px] text-neutral-500">Dias (0) dia previsto</div>
            </div>
            <span className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-700 font-bold flex items-center justify-center text-xs">
              0
            </span>
          </div>

          <div className="bg-white p-3 rounded-md border border-neutral-200 flex items-center justify-between">
            <div>
              <div className="text-xs text-red-800 font-medium">Entregues com Atraso</div>
              <div className="text-xl font-black text-red-700">{lateCount} tarefas</div>
              <div className="text-[10px] text-neutral-500">Dias (+) mais tempo gasto</div>
            </div>
            <span className="w-8 h-8 rounded-full bg-red-50 text-red-700 font-bold flex items-center justify-center text-xs">
              !+
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
