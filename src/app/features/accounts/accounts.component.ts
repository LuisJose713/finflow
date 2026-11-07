import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { AccountService, AccountType, FinancialAccount, AccountTransfer } from '../../core/services/account.service';

@Component({
  selector:'app-accounts',standalone:true,imports:[CommonModule,FormsModule,NavbarComponent],
  templateUrl:'./accounts.component.html',styleUrl:'./accounts.component.scss'
})
export class AccountsComponent implements OnInit {
  private readonly api=inject(AccountService);
  readonly accounts=signal<FinancialAccount[]>([]);
  readonly transfers=signal<AccountTransfer[]>([]);
  readonly loading=signal(true);
  readonly saving=signal(false);
  readonly error=signal('');
  readonly message=signal('');
  readonly active=computed(()=>this.accounts().filter(a=>!a.archived));
  readonly balance=computed(()=>this.active().reduce((s,a)=>s+Number(a.balance),0));
  name='';
  type:AccountType='cash';
  opening:number|null=0;
  fromId:number|null=null;
  toId:number|null=null;
  amount:number|null=null;
  note='';
  readonly types:{value:AccountType;label:string}[]=[
    {value:'cash',label:'Efectivo'},{value:'bank',label:'Cuenta bancaria'},
    {value:'savings',label:'Ahorro'},{value:'other',label:'Otra'}
  ];
  readonly date=new Date().toLocaleDateString('en-CA',{timeZone:'America/Bogota'});

  ngOnInit(){this.load();}
  load(){
    this.loading.set(true);this.error.set('');
    forkJoin({accounts:this.api.list(),transfers:this.api.transfers()}).subscribe({
      next:data=>{this.accounts.set(data.accounts);this.transfers.set(data.transfers);this.loading.set(false);},
      error:()=>{this.error.set('No pudimos cargar tus billeteras.');this.loading.set(false);}
    });
  }
  private validAmount(value:number|null,zeroAllowed=false):boolean {
    return value!==null&&Number.isFinite(value)&&(zeroAllowed?value>=0:value>0)
      &&value<=9999999999999.99&&Math.round(value*100)/100===value;
  }
  create(){
    if(this.saving())return;
    const name=this.name.trim().replace(/\s+/g,' ');
    if(name.length<2||name.length>80||!this.validAmount(this.opening,true)) {
      this.error.set('Revisa el nombre y el saldo inicial (máximo dos decimales).');return;
    }
    this.saving.set(true);this.error.set('');this.message.set('');
    this.api.create({name,type:this.type,currency:'COP',openingBalance:Number(this.opening)}).subscribe({
      next:()=>{this.name='';this.opening=0;this.saving.set(false);this.message.set('Billetera creada.');this.load();},
      error:e=>{this.saving.set(false);this.error.set(e.status===409?'Ya tienes una cuenta con ese nombre.':'No fue posible crear la billetera.');}
    });
  }
  transfer(){
    if(this.saving())return;
    if(!this.fromId||!this.toId||this.fromId===this.toId||!this.validAmount(this.amount)) {
      this.error.set('Selecciona cuentas distintas y un importe válido.');return;
    }
    this.saving.set(true);this.error.set('');this.message.set('');
    this.api.transfer({fromAccountId:this.fromId,toAccountId:this.toId,amount:Number(this.amount),
      date:this.date,note:this.note.trim()}).subscribe({
      next:()=>{this.amount=null;this.note='';this.saving.set(false);this.message.set('Transferencia registrada.');this.load();},
      error:e=>{this.saving.set(false);this.error.set(e.status===400?'Revisa el saldo disponible, las cuentas y el importe.':'No fue posible transferir.');}
    });
  }
  archive(a:FinancialAccount) {
    if(!window.confirm((a.archived?'¿Reactivar ':'¿Archivar ')+a.name+'?'))return;
    this.api.archive(a.id,!a.archived).subscribe({
      next:()=>{this.message.set(a.archived?'Cuenta reactivada.':'Cuenta archivada.');this.load();},
      error:()=>this.error.set('No se pudo cambiar el estado de la billetera.')
    });
  }
  label(type:AccountType){return this.types.find(t=>t.value===type)?.label||type;}
  nameOf(id:number){return this.accounts().find(a=>a.id===id)?.name||'Cuenta';}
}
