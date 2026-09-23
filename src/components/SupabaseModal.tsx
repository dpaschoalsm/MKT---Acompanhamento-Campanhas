import React, { useState, useEffect } from 'react';
import { 
  Database, 
  X, 
  Check, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  UploadCloud, 
  AlertCircle,
  Radio,
  CheckCircle2
} from 'lucide-react';
import { 
  getSupabaseConfig, 
  saveSupabaseCredentials, 
  clearSupabaseCredentials, 
  testSupabaseConnection 
} from '../utils/supabaseClient';
import { Task } from '../types';
import { upsertTasksBatchToSupabase, upsertCampaignsBatchToSupabase } from '../services/supabaseService';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  campaigns: string[];
  onSyncComplete?: () => void;
}

export const SUPABASE_SQL_SCRIPT = `-- =========================================================================
-- CONFIGURAÇÃO DO SUPABASE - GESTÃO DE CAMPANHAS DPASCHOAL / DPK / AUTOZ
-- Execute este script no SQL Editor do painel Supabase (supabase.com)
-- =========================================================================

-- 1. Criação da tabela de Tarefas
create table if not exists public.tasks (
  id text primary key,
  company text not null default 'DPaschoal',
  month text not null default '',
  campaign text not null default '',
  task_number text default '',
  description text not null default '',
  responsible text not null default 'Todos',
  sector text not null default 'Marketing',
  duration_days integer not null default 5,
  start_date text not null default '',
  end_date text not null default '',
  completion_date text,
  diff_days integer,
  status text not null default 'Não iniciado',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Criação da tabela de Campanhas
create table if not exists public.campaigns (
  name text primary key,
  created_at timestamptz not null default now()
);

-- 3. Habilitar Segurança por Linha (RLS)
alter table public.tasks enable row level security;
alter table public.campaigns enable row level security;

-- 4. Criar políticas de acesso para a equipe ler e alterar dados
drop policy if exists "Acesso total tasks para equipe" on public.tasks;
create policy "Acesso total tasks para equipe" on public.tasks 
  for all using (true) with check (true);

drop policy if exists "Acesso total campaigns para equipe" on public.campaigns;
create policy "Acesso total campaigns para equipe" on public.campaigns 
  for all using (true) with check (true);

-- 5. Habilitar Realtime para colaboração ao vivo instantânea
do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception when others then
  null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.campaigns;
exception when others then
  null;
end $$;
`;

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  tasks,
  campaigns,
  onSyncComplete,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; tableExists?: boolean } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'sql' | 'instructions'>('status');

  const config = getSupabaseConfig();

  useEffect(() => {
    if (isOpen) {
      const current = getSupabaseConfig();
      setUrlInput(current.url);
      setKeyInput(current.anonKey);
      setTestResult(null);
      setUploadSuccess(false);
      setUploadError(null);

      if (current.url && current.anonKey) {
        testCurrentConfig();
      }
    }
  }, [isOpen]);

  const testCurrentConfig = async () => {
    setTesting(true);
    setUploadError(null);
    const res = await testSupabaseConnection();
    setTestResult(res);
    setTesting(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !keyInput.trim()) {
      alert('Preencha a URL e a chave Anon do Supabase.');
      return;
    }
    saveSupabaseCredentials(urlInput.trim(), keyInput.trim());
    await testCurrentConfig();
    if (onSyncComplete) onSyncComplete();
  };

  const handleClear = () => {
    clearSupabaseCredentials();
    setUrlInput('');
    setKeyInput('');
    setTestResult(null);
    setUploadError(null);
    if (onSyncComplete) onSyncComplete();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleUploadCurrentData = async () => {
    setUploading(true);
    setUploadSuccess(false);
    setUploadError(null);
    try {
      const tasksRes = await upsertTasksBatchToSupabase(tasks);
      if (!tasksRes.success) {
        const errorMsg = tasksRes.error || '';
        if (errorMsg.includes('does not exist') || errorMsg.includes('relation "public.tasks"')) {
          setUploadError('A tabela "tasks" ainda não existe no seu banco de dados Supabase! Acesse a aba "Script SQL (Tabelas)", copie o script e execute no SQL Editor do Supabase.');
        } else if (errorMsg.includes('policy') || errorMsg.includes('row-level security')) {
          setUploadError('Erro de permissão no Supabase (RLS). Execute o script SQL para conceder permissão de gravação à chave anon.');
        } else {
          setUploadError(`Erro retornado pelo Supabase: ${errorMsg}`);
        }
        return;
      }

      const campaignsRes = await upsertCampaignsBatchToSupabase(campaigns);
      if (!campaignsRes.success) {
        const errorMsg = campaignsRes.error || '';
        if (errorMsg.includes('does not exist') || errorMsg.includes('relation "public.campaigns"')) {
          setUploadError('A tabela "campaigns" ainda não existe no seu banco de dados Supabase! Execute o script SQL no SQL Editor do Supabase.');
        } else {
          setUploadError(`Erro ao salvar campanhas: ${errorMsg}`);
        }
        return;
      }

      setUploadSuccess(true);
      if (onSyncComplete) onSyncComplete();
    } catch (e: any) {
      console.error(e);
      setUploadError(e.message || 'Erro inesperado na sincronização.');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const isConfigured = Boolean(config.url && config.anonKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
      >
        {/* Header */}
        <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Conexão Supabase (Online & Realtime)
                {isConfigured && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Ativo
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400">
                Sincronize a planilha em nuvem para que todo o seu time possa editar simultaneamente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'status'
                ? 'border-[#a60000] text-[#a60000] bg-white rounded-t-md'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Conexão & Credenciais
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'border-[#a60000] text-[#a60000] bg-white rounded-t-md'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <span>Script SQL (Tabelas)</span>
            <span className="bg-red-100 text-[#a60000] text-[10px] px-1.5 py-0.2 rounded font-bold">Essencial</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('instructions')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'instructions'
                ? 'border-[#a60000] text-[#a60000] bg-white rounded-t-md'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Passo a Passo Vercel
          </button>
        </div>

        {/* Tab 1: Status & Credentials */}
        {activeTab === 'status' && (
          <div className="p-6 space-y-5">
            {/* Live Status Banner */}
            <div className={`p-4 rounded-lg border flex items-start gap-3 ${
              testResult?.success && testResult?.tableExists
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : testResult?.success && testResult?.tableExists === false
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : isConfigured
                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                    : 'bg-neutral-100 border-neutral-200 text-neutral-800'
            }`}>
              {testResult?.success && testResult?.tableExists ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : testResult?.success && testResult?.tableExists === false ? (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <Radio className="w-5 h-5 text-neutral-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-xs">
                <div className="font-bold flex items-center justify-between">
                  <span>
                    Status da Conexão:{' '}
                    {isConfigured
                      ? (testResult?.success ? 'Conectado ao Supabase' : 'Configurado (Verificando)')
                      : 'Não configurado'}
                  </span>
                  {config.source === 'env' && (
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono font-medium">
                      Via Variáveis Vercel (.env)
                    </span>
                  )}
                  {config.source === 'custom' && (
                    <span className="text-[10px] bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded font-mono font-medium">
                      Via Armazenamento Local
                    </span>
                  )}
                </div>
                <p className="mt-1 text-neutral-600">
                  {testResult?.message || (isConfigured 
                    ? 'Credenciais detectadas. Clique em "Testar Conexão" para verificar.'
                    : 'Insira sua URL e Chave Anon abaixo para testar ou configure as variáveis na Vercel.')}
                </p>
                {testResult?.tableExists === false && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('sql')}
                    className="mt-2 text-xs font-bold text-amber-800 underline hover:text-amber-900 cursor-pointer block"
                  >
                    Clique aqui para ver o Script SQL e criar a tabela "tasks" no Supabase →
                  </button>
                )}
              </div>
            </div>

            {/* Test and Seed Buttons */}
            {isConfigured && (
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-800">
                      Sincronização Inicial de Dados ({tasks.length} tarefas)
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      Envie todas as tarefas e campanhas atuais da planilha para o banco de dados Supabase com 1 clique.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUploadCurrentData}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#a60000] hover:bg-red-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    {uploading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5" />
                    )}
                    <span>{uploading ? 'Enviando...' : 'Enviar Dados Atuais ao Supabase'}</span>
                  </button>
                </div>
                {uploadSuccess && (
                  <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Todas as tarefas e campanhas foram salvas no Supabase com sucesso! Sua equipe já pode acessar e editar online.</span>
                  </div>
                )}
                {uploadError && (
                  <div className="text-[11px] text-red-900 bg-red-50 border border-red-200 p-3 rounded-lg space-y-2">
                    <div className="flex items-start gap-2 font-bold">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                      <span>{uploadError}</span>
                    </div>
                    <div className="pl-6">
                      <button
                        type="button"
                        onClick={() => setActiveTab('sql')}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs transition-colors cursor-pointer"
                      >
                        Abrir Script SQL para Criar as Tabelas →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Project URL do Supabase (VITE_SUPABASE_URL)
                </label>
                <input
                  type="url"
                  placeholder="https://exemplo-seu-projeto.supabase.co"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg font-mono focus:border-[#a60000] focus:ring-1 focus:ring-[#a60000] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Anon / Public API Key (VITE_SUPABASE_ANON_KEY)
                </label>
                <textarea
                  rows={2}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg font-mono focus:border-[#a60000] focus:ring-1 focus:ring-[#a60000] outline-none"
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Encontrada no Supabase em: <strong>Project Settings → API → Project API Keys (anon public)</strong>.
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    Salvar e Conectar
                  </button>
                  <button
                    type="button"
                    onClick={testCurrentConfig}
                    disabled={testing || !urlInput || !keyInput}
                    className="flex items-center gap-1.5 px-3 py-2 border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                    <span>Testar Conexão</span>
                  </button>
                </div>

                {config.source === 'custom' && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs text-neutral-500 hover:text-red-700 underline cursor-pointer"
                  >
                    Limpar credenciais manuais
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: SQL Script */}
        {activeTab === 'sql' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-neutral-900">
                  Script PostgreSQL para criar as Tabelas e Realtime
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Abra o painel do Supabase, clique em <strong>SQL Editor</strong> no menu lateral, cole e clique em <strong>Run</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#a60000] hover:bg-red-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Script SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <pre className="p-3 bg-neutral-900 text-neutral-200 text-[11px] font-mono rounded-lg overflow-x-auto max-h-[300px] border border-neutral-800 select-all">
                {SUPABASE_SQL_SCRIPT}
              </pre>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
              <strong>Nota sobre o Realtime:</strong> Este script já inclui o comando para habilitar o Supabase Realtime nas tabelas. Quando qualquer membro do time alterar ou concluir uma tarefa, ela se atualizará na tela de todos automaticamente sem precisar de F5!
            </div>
          </div>
        )}

        {/* Tab 3: Instructions for Vercel */}
        {activeTab === 'instructions' && (
          <div className="p-6 space-y-4 text-xs text-neutral-700">
            <h3 className="font-bold text-neutral-900 text-sm">
              Como colocar para funcionar online na Vercel e compartilhar com o time
            </h3>

            <ol className="space-y-3 list-decimal list-inside pl-1">
              <li className="space-y-1">
                <span className="font-bold text-neutral-900">Criar o projeto no Supabase:</span>
                <p className="text-neutral-600 pl-5">
                  Acesse <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-[#a60000] font-semibold underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-3 h-3" /></a> e crie um novo projeto (ex: <code>dpaschoal-campanhas</code>). É gratuito.
                </p>
              </li>

              <li className="space-y-1">
                <span className="font-bold text-neutral-900">Executar o script SQL:</span>
                <p className="text-neutral-600 pl-5">
                  No menu lateral esquerdo do Supabase, clique em <strong>SQL Editor</strong> &gt; <strong>New Query</strong>. Cole o script da aba "Script SQL" e clique no botão verde <strong>Run</strong>.
                </p>
              </li>

              <li className="space-y-1">
                <span className="font-bold text-neutral-900">Pegar as chaves no Supabase:</span>
                <p className="text-neutral-600 pl-5">
                  Vá em <strong>Project Settings</strong> (ícone de engrenagem) &gt; <strong>API</strong>. Copie o <strong>Project URL</strong> e a chave <strong>anon public</strong>.
                </p>
              </li>

              <li className="space-y-1">
                <span className="font-bold text-neutral-900">Adicionar as variáveis na Vercel:</span>
                <p className="text-neutral-600 pl-5">
                  No painel da <strong>Vercel</strong>, entre no seu projeto &gt; <strong>Settings</strong> &gt; <strong>Environment Variables</strong> e adicione as 2 variáveis:
                </p>
                <div className="pl-5 space-y-1 font-mono text-[11px] mt-1">
                  <div className="bg-neutral-100 p-2 rounded border border-neutral-300">
                    <strong className="text-neutral-900">VITE_SUPABASE_URL</strong> = <code>https://seu-projeto.supabase.co</code>
                  </div>
                  <div className="bg-neutral-100 p-2 rounded border border-neutral-300">
                    <strong className="text-neutral-900">VITE_SUPABASE_ANON_KEY</strong> = <code>eyJhbGciOi... (sua chave anon)</code>
                  </div>
                </div>
              </li>

              <li className="space-y-1">
                <span className="font-bold text-neutral-900">Fazer Redeploy na Vercel:</span>
                <p className="text-neutral-600 pl-5">
                  Vá na aba <strong>Deployments</strong> na Vercel, clique nos três pontinhos <strong>...</strong> do último deploy e selecione <strong>Redeploy</strong> (ou faça um git push). A Vercel vai compilar com as novas variáveis.
                </p>
              </li>

              <li className="space-y-1">
                <span className="font-bold text-neutral-900">Enviar os dados iniciais:</span>
                <p className="text-neutral-600 pl-5">
                  Ao abrir o site na Vercel pela primeira vez, abra esta janela e clique em <strong>"Enviar Dados Atuais ao Supabase"</strong> para subir todas as 50+ tarefas oficiais.
                </p>
              </li>
            </ol>
          </div>
        )}

        {/* Footer */}
        <div className="bg-neutral-100 border-t border-neutral-200 px-6 py-3 flex items-center justify-between">
          <span className="text-xs text-neutral-500">
            {isConfigured ? '🟢 Supabase pronto para uso' : '⚪ Modo Local ativo (configure para sincronizar)'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
