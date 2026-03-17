import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AdvisorCard, AdvisorMessage } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdvisorService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/advisor`;

  getCards() {
    return this.http.get<AdvisorCard[]>(`${this.apiUrl}/cards`);
  }

  sendMessage(messages: { role: string; content: string }[]) {
    return this.http.post<{ response: string }>(`${this.apiUrl}/chat`, {
      messages,
    });
  }

  getFinancialSummary() {
    return this.http.get<{ summary: string }>(`${this.apiUrl}/summary`);
  }
}
