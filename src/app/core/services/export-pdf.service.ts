import { Injectable, inject } from '@angular/core';
import { TransactionService } from './transaction.service';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ExportPdfService {
  private transactionService = inject(TransactionService);

  exportTransactions(filename = 'transactions.pdf') {
    return this.transactionService.exportPdf().pipe(
      tap((blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
      })
    );
  }
}
