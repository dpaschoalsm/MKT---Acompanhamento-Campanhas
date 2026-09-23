import React from 'react';
import { Company } from '../types';
import { RotateCcw } from 'lucide-react';

interface SpreadsheetBannerProps {
  company: Company;
  totalTasks: number;
  completedTasks: number;
  onResetToOfficial?: () => void;
}

export const SpreadsheetBanner: React.FC<SpreadsheetBannerProps> = ({
  company,
  totalTasks,
  completedTasks,
  onResetToOfficial,
}) => {
  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Title styling based on the exact image attached:
  // Red background, uppercase bold white text: "ACOMPANHAMENTO CAMPANHAS DPASCHOAL"
  const bannerTitle = `ACOMPANHAMENTO CAMPANHAS ${company.toUpperCase()}`;

  return (
    <div
      id="spreadsheet-banner"
      className="bg-[#a60000] text-white px-4 py-2.5 rounded-t-sm shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 border-b-2 border-red-900"
    >
      {/* Main Title - Matches exact spreadsheet header in screenshot */}
      <div className="flex items-center gap-3 flex-1 text-center sm:text-left">
        <h1
          id="spreadsheet-main-title"
          className="text-base sm:text-lg md:text-xl font-black uppercase tracking-wider drop-shadow-sm"
        >
          {bannerTitle}
        </h1>
        {onResetToOfficial && (
          <button
            onClick={onResetToOfficial}
            title="Recarregar todas as 103 entregas oficiais da planilha"
            className="hidden md:inline-flex items-center gap-1 text-[11px] bg-red-950/40 hover:bg-red-950/70 text-red-100 px-2 py-0.5 rounded border border-red-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restaurar Planilha Oficial</span>
          </button>
        )}
      </div>

      {/* Right Stats: "X de Y Tarefas" + Progress Box (as in screenshot) */}
      <div id="spreadsheet-kpi-box" className="flex items-center gap-3">
        <span className="text-xs sm:text-sm font-bold italic tracking-wide text-red-50 whitespace-nowrap">
          {completedTasks} de {totalTasks} Tarefas
        </span>

        {/* Progress box container mirroring the Excel progress pill in screenshot */}
        <div
          id="spreadsheet-progress-indicator"
          className="relative w-24 sm:w-28 h-7 bg-neutral-300 rounded overflow-hidden shadow-inner flex items-center justify-center border border-neutral-400"
        >
          {/* Green progress fill matching screenshot #70ad47 / #5cb85c */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-[#5cb85c] transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          />
          {/* Centered Percentage Text */}
          <span className="relative z-10 text-xs sm:text-sm font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
};
