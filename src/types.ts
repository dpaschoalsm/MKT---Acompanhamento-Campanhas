export type Company = 'DPaschoal' | 'DPK' | 'AutoZ';

export type TaskStatus = 
  | 'Não iniciado' 
  | 'Em andamento' 
  | 'Concluído' 
  | 'Em atraso' 
  | 'Cancelado';

export const RESPONSIBLES = [
  'Rafael',
  'Natalia Maia',
  'Ana Paula',
  'Alanna',
  'Amanda',
  'Sidney',
  'Caio',
  'Beatriz',
  'Dalila',
  'Lívia',
  'Dani',
  'Jessica',
  'Diego',
  'Chiara',
  'Gabriel',
  'Giovana',
  'Victoria',
  'Todos',
] as const;

export type Responsible = typeof RESPONSIBLES[number] | string;

export const SECTORS = [
  'Marketing',
  'Trade Marketing',
  'Branding e Comunicação',
  'Digital e Social',
  'Operação',
  'CRM',
  'DCC',
  'E-commerce',
  'Agência',
  'Campanhas Incentivo',
  'Pricing',
  'Supply',
  'Comercial',
  'Diretoria',
  'Compras',
] as const;

export type Sector = typeof SECTORS[number] | string;

export const DEFAULT_CAMPAIGNS = [
  'Revisão DPaschoal',
  'Black Friday',
  'Férias',
] as const;

export interface Task {
  id: string;
  company: Company;
  month: string; // e.g. "Outubro/26", "Novembro/26"
  campaign: string; // e.g. "Revisão DPaschoal", "Black Friday", "Férias"
  taskNumber: string; // e.g. "1.0", "2.1", "3.3.1"
  description: string;
  responsible: Responsible;
  sector: Sector;
  durationDays: number; // In days (e.g. 45 for D-45)
  startDate: string; // YYYY-MM-DD format for storage, displayed as DD/MM/YYYY
  endDate: string; // Calculated: startDate + durationDays or target milestone
  completionDate?: string; // YYYY-MM-DD format, or empty if not finished
  diffDays?: number | null; // Calculated: completionDate - endDate (in days)
  status: TaskStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilterState {
  campaign: string;
  responsible: string;
  status: string;
  month: string;
  sector: string;
  search: string;
}
