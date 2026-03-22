import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PlannedExpense, CreatePlannedExpenseRequest } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PlannedExpenseService {
  private http   = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/planned-expenses`;

  getAll() {
    return this.http.get<PlannedExpense[]>(this.apiUrl);
  }

  create(data: CreatePlannedExpenseRequest) {
    return this.http.post<PlannedExpense>(this.apiUrl, data);
  }

  update(id: string, data: Partial<CreatePlannedExpenseRequest>) {
    return this.http.put<PlannedExpense>(`${this.apiUrl}/${id}`, data);
  }

  execute(id: string) {
    return this.http.patch<PlannedExpense>(`${this.apiUrl}/${id}/execute`, {});
  }

  cancel(id: string) {
    return this.http.patch<PlannedExpense>(`${this.apiUrl}/${id}/cancel`, {});
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getOverdue() {
    return this.http.get<PlannedExpense[]>(`${this.apiUrl}/overdue`);
  }
}