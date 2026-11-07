import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';

export type AccountType = 'cash'|'bank'|'savings'|'other';
export interface FinancialAccount {
  id:number; name:string; type:AccountType; currency:string;
  openingBalance:number; balance:number; archived:boolean;
}
export interface AccountTransfer {
  id:number; fromAccountId:number; toAccountId:number;
  amount:number; date:string; note:string|null;
}
@Injectable({providedIn:'root'})
export class AccountService {
  private readonly http=inject(HttpClient);
  private readonly api=environment.apiUrl+'/accounts';
  list(){return this.http.get<FinancialAccount[]>(this.api);}
  create(data:{name:string;type:AccountType;currency:'COP';openingBalance:number}){
    return this.http.post<FinancialAccount>(this.api,data);
  }
  update(id:number,data:{name:string;type:AccountType}){
    return this.http.put<FinancialAccount>(this.api+'/'+id,data);
  }
  archive(id:number,archived:boolean){
    return this.http.patch<FinancialAccount>(this.api+'/'+id+'/archive',{archived});
  }
  transfers(){return this.http.get<AccountTransfer[]>(this.api+'/transfers');}
  transfer(data:{fromAccountId:number;toAccountId:number;amount:number;date:string;note?:string}){
    return this.http.post<AccountTransfer>(this.api+'/transfers',data);
  }
}
