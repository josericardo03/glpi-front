export type ID = number;

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PageParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export type AtivoInativo = 'ATIVO' | 'INATIVO';
