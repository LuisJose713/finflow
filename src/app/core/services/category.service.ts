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
}
