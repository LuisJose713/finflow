import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Goal, CreateGoalRequest } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GoalService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/goals`;

  getAll() {
    return this.http.get<Goal[]>(this.apiUrl);
  }

  getById(id: string) {
    return this.http.get<Goal>(`${this.apiUrl}/${id}`);
  }

  create(data: CreateGoalRequest) {
    return this.http.post<Goal>(this.apiUrl, data);
  }

  update(id: string, data: Partial<CreateGoalRequest>) {
    return this.http.put<Goal>(`${this.apiUrl}/${id}`, data);
  }

  updateProgress(id: string, amount: number) {
    return this.http.patch<Goal>(`${this.apiUrl}/${id}/progress`, { amount });
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
