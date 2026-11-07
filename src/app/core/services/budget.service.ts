import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';

export interface MonthlyBudget {
  id: number; categoryId: number; categoryName: string; year: number; month: number;
  limitAmount: number; spent: number; remaining: number; percentUsed: number;
  status: 'ok' | 'near' | 'over'; currency: 'COP';
}
@Injectable({providedIn:'root'})
export class BudgetService {
  private readonly http=inject(HttpClient);
  private readonly url=environment.apiUrl+'/budgets';
  list(year:number,month:number) {
    return this.http.get<MonthlyBudget[]>(this.url, {params:new HttpParams().set('year',year).set('month',month)});
  }
  create(payload:{categoryId:number;year:number;month:number;amount:number}) {
    return this.http.post(this.url,payload);
  }
  update(id:number,amount:number) { return this.http.put(this.url+'/'+id,{amount}); }
  remove(id:number) { return this.http.delete<void>(this.url+'/'+id); }
}
