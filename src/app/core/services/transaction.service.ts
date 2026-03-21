import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import {
  Transaction,
  CreateTransactionRequest,
  TransactionStats,
} from "../models";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class TransactionService {
  private http   = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/transactions`;

  // Dashboard — siempre últimas 5
  getRecent() {
    return this.http.get<Transaction[]>(`${this.apiUrl}/recent`);
  }

  // Todas con filtros de backend (sin search — se hace localmente)
  getAll(
    type?: string,
    month?: number,
    year?: number,
    categoryId?: number,
  ) {
    let params = new HttpParams();
    if (type)       params = params.set('type', type);
    if (month)      params = params.set('month', month.toString());
    if (year)       params = params.set('year', year.toString());
    if (categoryId) params = params.set('categoryId', categoryId.toString());
    return this.http.get<Transaction[]>(this.apiUrl, { params });
  }

  // Años disponibles del usuario
  getAvailableYears() {
    return this.http.get<number[]>(`${this.apiUrl}/years`);
  }

  getStats() {
    return this.http.get<TransactionStats>(`${this.apiUrl}/stats`);
  }

  getMonthlyStats() {
    return this.http.get<any[]>(`${this.apiUrl}/monthly-stats`);
  }

  create(data: CreateTransactionRequest) {
    return this.http.post<Transaction>(this.apiUrl, data);
  }

  update(id: string, data: Partial<CreateTransactionRequest>) {
    return this.http.put<Transaction>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  exportPdf(
  type?: string,
  month?: number,
  year?: number,
  categoryId?: number,
) {
  let params = new HttpParams();
  if (type)       params = params.set('type', type);
  if (month)      params = params.set('month', month.toString());
  if (year)       params = params.set('year', year.toString());
  if (categoryId) params = params.set('categoryId', categoryId.toString());
  return this.http.get(`${this.apiUrl}/export/pdf`, { params, responseType: 'blob' });
}

  // CSV — pasa los filtros activos (sin search)
  exportCsv(
    type?: string,
    month?: number,
    year?: number,
    categoryId?: number,
    search?: string,
  ) {
    let params = new HttpParams();
    if (type)       params = params.set('type', type);
    if (month)      params = params.set('month', month.toString());
    if (year)       params = params.set('year', year.toString());
    if (categoryId) params = params.set('categoryId', categoryId.toString());
    if (search)     params = params.set('search', search);
    return this.http.get(`${this.apiUrl}/export/csv`, { params, responseType: 'blob' });
  }
}