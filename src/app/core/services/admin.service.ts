import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@environments/environment';

export interface AdminMonthlyActivity {
  month: string;
  signups: number;
  transactions: number;
}

export interface AdminOverview {
  users: number;
  newUsers30Days: number;
  activeUsers30Days: number;
  transactions: number;
  transactions30Days: number;
  incomeTransactions: number;
  expenseTransactions: number;
  goals: number;
  plannedExpenses: number;
  pendingExpenses: number;
  customCategories: number;
  systemCategories: number;
  monthlyActivity: AdminMonthlyActivity[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  getOverview() {
    return this.http.get<AdminOverview>(environment.apiUrl + '/admin/overview');
  }
}
