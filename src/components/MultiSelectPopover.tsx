import React, { useState, useRef, useEffect } from 'react';
import { Check, X, Search, Plus } from 'lucide-react';

interface MultiSelectPopoverProps {
  title: string;
  options: readonly string[];
  selected: string[];
  onChange: (newSelected: string[]) => void;
  onClose: () => void;
  allowCustom?: boolean;
  align?: 'left' | 'right' | 'center';
  badgeColor?: 'red' | 'dark';
}

export const MultiSelectPopover: React.FC<MultiSelectPopoverProps> = ({
  title,
  options,
  selected,
  onChange,
  onClose,
  allowCustom = true,
  align = 'center',
  badgeColor = 'red',
}) => {
  const [search, setSearch] = useState('');
  const [customInput, setCustomInput] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    // Delay adding listener to prevent immediate trigger from opening click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const handleAddCustom = () => {
    const val = customInput.trim();
    if (val && !selected.includes(val)) {
      onChange([...selected, val]);
      setCustomInput('');
    }
  };

  const clearAll = () => {
    onChange([]);
  };

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase().trim())
  );

  const alignClass =
    align === 'left'
      ? 'left-0'
      : align === 'right'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2';

  const badgeBg =
    badgeColor === 'red'
      ? 'bg-[#a60000] text-white'
      : 'bg-neutral-800 text-white';

  return (
    <div
      ref={popoverRef}
      className={`absolute z-50 top-full mt-1.5 w-72 sm:w-80 bg-white rounded-lg shadow-2xl border border-neutral-300 text-left p-3 ${alignClass} animate-in fade-in duration-100`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-neutral-800">{title}</span>
          <span className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded-full">
            {selected.length} selecionado{selected.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded cursor-pointer"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Selected Items Badges */}
      {selected.length > 0 && (
        <div className="mb-2 p-1.5 bg-neutral-50 rounded border border-neutral-200">
          <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-1">
            <span>Selecionado(s):</span>
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] text-red-600 hover:underline cursor-pointer"
            >
              Limpar todos
            </button>
          </div>
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
            {selected.map((item) => (
              <span
                key={item}
                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-medium ${badgeBg}`}
              >
                <span className="truncate max-w-[130px]">{item}</span>
                <button
                  type="button"
                  onClick={() => toggleOption(item)}
                  className="hover:opacity-75 rounded-full cursor-pointer"
                  title={`Remover ${item}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick Search */}
      <div className="relative mb-2">
        <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          autoFocus
          type="text"
          placeholder="Filtrar na lista..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-2.5 py-1 text-xs bg-neutral-50 border border-neutral-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#a60000]"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Options List with Checkboxes (ONLY individual items, NO pairs/fronts!) */}
      <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5 border border-neutral-200 rounded p-1 bg-neutral-50/50">
        {filteredOptions.length === 0 ? (
          <div className="py-3 text-center text-xs text-neutral-400 italic">
            Nenhum item encontrado
          </div>
        ) : (
          filteredOptions.map((opt) => {
            const isChecked = selected.includes(opt);
            return (
              <label
                key={opt}
                className={`flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer select-none transition-colors ${
                  isChecked
                    ? 'bg-red-50 text-[#a60000] font-semibold border border-red-200'
                    : 'text-neutral-700 hover:bg-neutral-100 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOption(opt)}
                    className="w-3.5 h-3.5 accent-[#a60000] rounded cursor-pointer"
                  />
                  <span>{opt}</span>
                </div>
                {isChecked && <Check className="w-3.5 h-3.5 text-[#a60000]" />}
              </label>
            );
          })
        )}
      </div>

      {/* Add Custom item */}
      {allowCustom && (
        <div className="mt-2 pt-2 border-t border-neutral-200 flex gap-1">
          <input
            type="text"
            placeholder="Ou digite outro..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustom();
              }
            }}
            className="flex-1 text-xs py-1 px-2 bg-neutral-50 border border-neutral-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#a60000]"
          />
          <button
            type="button"
            onClick={handleAddCustom}
            className="text-xs bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-semibold px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1"
            title="Adicionar à seleção"
          >
            <Plus className="w-3 h-3" />
            <span>Adicionar</span>
          </button>
        </div>
      )}

      {/* Footer Confirm */}
      <div className="mt-2.5 pt-2 border-t border-neutral-200 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="w-full text-xs font-bold py-1.5 bg-[#a60000] hover:bg-[#850000] text-white rounded transition-colors cursor-pointer text-center"
        >
          Confirmar ({selected.length} selecionado{selected.length !== 1 ? 's' : ''})
        </button>
      </div>
    </div>
  );
};
