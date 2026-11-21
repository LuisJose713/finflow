import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';

export type ImportStatus = 'ready' | 'review' | 'transfer' | 'duplicate';
export type ImportedType = 'income' | 'expense' | null;

export interface StatementDraft {
  rowNumber: number;
  date: string;
  description: string;
  amount: number;
  type: ImportedType;
  categoryId: number | null;
  currency: string;
  status: ImportStatus;
  note: string;
}

export interface ImportPreview {
  rows: StatementDraft[];
  ignored: number;
  format: 'CSV' | 'XLSX' | 'PDF';
  notice: string;
}

export interface ImportApproved {
  rowNumber: number;
  date: string;
  description: string;
  amount: number;
  type: ImportedType;
  categoryId: number | null;
  accountId: number;
  currency: string;
  include: boolean;
}

export interface ImportResult {
  created: number;
  duplicatesSkipped: number;
  excluded: number;
}

@Injectable({ providedIn: 'root' })
export class StatementImportService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl + '/imports/statements';

  preview(file: File, accountId: number) {
    const data = new FormData();
    data.append('file', file, file.name);
    data.append('accountId', String(accountId));
    return this.http.post<ImportPreview>(this.url + '/preview', data);
  }

  confirm(rows: ImportApproved[]) {
    return this.http.post<ImportResult>(this.url + '/confirm', {
      confirmed: true,
      rows
    });
  }
}
