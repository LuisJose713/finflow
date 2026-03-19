import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import {
  Transaction,
  CreateTransactionRequest,
  TransactionStats,
  PaginatedResponse,
} from "../models";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class TransactionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/transactions`;

  getAll(page = 1, limit = 10) {
    const params = new HttpParams()
      .set("page", page.toString())
      .set("limit", limit.toString());
    return this.http.get<PaginatedResponse<Transaction>>(this.apiUrl, {
      params,
    });
  }

  getRecent(limit = 5) {
    return this.http.get<Transaction[]>(`${this.apiUrl}/recent`);
  }

  getStats() {
    return this.http.get<TransactionStats>(`${this.apiUrl}/stats`);
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

  exportPdf() {
    return this.http.get(`${this.apiUrl}/export/pdf`, {
      responseType: "blob",
    });
  }
  getMonthlyStats() {
    return this.http.get<any[]>(`${this.apiUrl}/monthly-stats`);
  }
}
