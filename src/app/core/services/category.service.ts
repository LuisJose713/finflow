import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Category } from '@core/models';
import { environment } from '@environments/environment';
@Injectable({
  providedIn: 'root'
})
export class CategoryService {

   private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/categories`;

  getAll() {
    return this.http.get<Category[]>(this.apiUrl);
  }

  create(data: {name: string; type: 'Income' | 'Expense'}) {
    return this.http.post<Category>(this.apiUrl, data);
  }

  update(id: number, data: {name: string; type: 'Income' | 'Expense'}) {
    return this.http.put<Category>(this.apiUrl + '/' + id, data);
  }

  delete(id: number) {
    return this.http.delete<void>(this.apiUrl + '/' + id);
  }
}
