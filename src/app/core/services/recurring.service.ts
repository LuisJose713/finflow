import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';

export interface RecurringRule {
  id:number; title:string; amount:number; type:'income'|'expense';
  categoryId:number; accountId:number|null; dayOfMonth:number;
  nextDueDate:string; active:boolean;
}
export interface CreateRecurringRule {
  title:string; amount:number; type:'income'|'expense';
  categoryId:number; accountId:number|null; dayOfMonth:number;
}
@Injectable({providedIn:'root'})
export class RecurringService {
  private readonly http=inject(HttpClient);
  private readonly api=environment.apiUrl+'/recurring';
  list(){return this.http.get<RecurringRule[]>(this.api);}
  create(input:CreateRecurringRule){return this.http.post<RecurringRule>(this.api,input);}
  activate(id:number,active:boolean){return this.http.patch<RecurringRule>(this.api+'/'+id+'/active',{active});}
  delete(id:number){return this.http.delete<void>(this.api+'/'+id);}
  processDue(){return this.http.post<{created:number}>(this.api+'/process-due',{});}
}
