import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Goal, CreateGoalRequest, UpdateGoalRequest, AddContributionRequest, GoalContribution } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GoalService {
  private http   = inject(HttpClient);
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

  update(id: string, data: UpdateGoalRequest) {
    return this.http.put<Goal>(`${this.apiUrl}/${id}`, data);
  }

  addContribution(id: string, data: AddContributionRequest) {
    return this.http.patch<Goal>(`${this.apiUrl}/${id}/contribute`, data);
  }

  // 👇 nuevo
  getContributions(id: string) {
    return this.http.get<GoalContribution[]>(`${this.apiUrl}/${id}/contributions`);
  }

  updateStatus(id: string, status: Goal['status']) {
    return this.http.patch<Goal>(`${this.apiUrl}/${id}/status`, { status });
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}