import React, { useState } from 'react';
import { X, Plus, Trash2, Tag, Check } from 'lucide-react';

interface CampaignManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns: string[];
  onAddCampaign: (newCampaignName: string) => void;
  onDeleteCampaign: (campaignName: string) => void;
  taskCountsByCampaign: Record<string, number>;
}

export const CampaignManagerModal: React.FC<CampaignManagerModalProps> = ({
  isOpen,
  onClose,
  campaigns,
  onAddCampaign,
  onDeleteCampaign,
  taskCountsByCampaign,
}) => {
  const [newCampaign, setNewCampaign] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCampaign.trim();
    if (!trimmed) return;

    if (campaigns.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setError('Esta campanha já existe!');
      return;
    }

    onAddCampaign(trimmed);
    setNewCampaign('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
      <div 
        id="campaign-manager-modal"
        className="bg-white rounded-lg shadow-xl w-full max-w-md border border-neutral-200 overflow-hidden"
      >
        <div className="bg-[#a60000] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            <h2 className="font-bold text-sm uppercase tracking-wider">Gerenciar Campanhas</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-red-200 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-neutral-600">
            Campanhas padrão: <strong>Revisão DPaschoal</strong>, <strong>Black Friday</strong> e <strong>Férias</strong>. Você pode adicionar novas campanhas sazonais ou institucionais abaixo:
          </p>

          {/* Add form */}
          <form onSubmit={handleAdd} className="space-y-2">
            <div className="flex gap-2">
              <input
                id="input-new-campaign"
                type="text"
                placeholder="Nome da nova campanha..."
                value={newCampaign}
                onChange={(e) => {
                  setNewCampaign(e.target.value);
                  if (error) setError('');
                }}
                className="flex-1 text-xs py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-md focus:ring-1 focus:ring-[#a60000] focus:border-[#a60000]"
              />
              <button
                id="btn-add-new-campaign"
                type="submit"
                className="px-4 py-2 bg-[#a60000] hover:bg-[#8f0000] text-white text-xs font-bold rounded-md flex items-center gap-1 transition-colors shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>
            {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
          </form>

          {/* Current campaigns list */}
          <div className="border border-neutral-200 rounded-lg overflow-hidden divide-y divide-neutral-100 max-h-60 overflow-y-auto">
            {campaigns.map((camp) => {
              const count = taskCountsByCampaign[camp] || 0;
              const isDefault = ['Revisão DPaschoal', 'Black Friday', 'Férias'].includes(camp);

              return (
                <div
                  key={camp}
                  className="px-3.5 py-2.5 flex items-center justify-between hover:bg-neutral-50 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#a60000]"></span>
                    <span className="font-semibold text-neutral-800">{camp}</span>
                    <span className="text-[10px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                      {count} {count === 1 ? 'tarefa' : 'tarefas'}
                    </span>
                  </div>

                  {!isDefault ? (
                    <button
                      type="button"
                      onClick={() => onDeleteCampaign(camp)}
                      className="p-1 text-neutral-400 hover:text-red-700 transition-colors"
                      title="Excluir campanha"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-[10px] font-medium text-neutral-400 italic">Padrão</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-md transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
