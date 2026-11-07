import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { RecurringRule, RecurringService } from '../../core/services/recurring.service';
import { AccountService, FinancialAccount } from '../../core/services/account.service';
import { CategoryService } from '../../core/services/category.service';
import { Category } from '../../core/models';

@Component({
 selector:'app-recurring',standalone:true,imports:[CommonModule,FormsModule,NavbarComponent],
 templateUrl:'./recurring.component.html',styleUrl:'./recurring.component.scss'
})
export class RecurringComponent implements OnInit {
 private readonly api=inject(RecurringService);
 private readonly accountsApi=inject(AccountService);
 private readonly categoriesApi=inject(CategoryService);
 readonly rules=signal<RecurringRule[]>([]);
 readonly accounts=signal<FinancialAccount[]>([]);
 readonly categories=signal<Category[]>([]);
 readonly loading=signal(true);
 readonly saving=signal(false);
 readonly error=signal('');
 readonly notice=signal('');
 title='';
 amount:number|null=null;
 type:'income'|'expense'='expense';
 categoryId:number|null=null;
 accountId:number|null=null;
 dayOfMonth=1;
 readonly categoriesForType=computed(()=>this.categories().filter(c=>c.type.toLowerCase()===this.type));
 readonly activeAccounts=computed(()=>this.accounts().filter(a=>!a.archived&&a.currency==='COP'));
 readonly today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Bogota'});
 readonly reminders=computed(()=>this.rules().filter(r=>{
   if(!r.active)return false;
   const due=new Date(r.nextDueDate+'T12:00:00Z').getTime();
   const now=new Date(this.today+'T12:00:00Z').getTime();
   return due<=now+7*86400000;
 }));
 ngOnInit(){this.refresh();}
 refresh(){
   this.loading.set(true);this.error.set('');
   forkJoin({rules:this.api.list(),accounts:this.accountsApi.list(),categories:this.categoriesApi.getAll()}).subscribe({
     next:d=>{this.rules.set(d.rules);this.accounts.set(d.accounts);this.categories.set(d.categories);this.loading.set(false);},
     error:()=>{this.loading.set(false);this.error.set('No se pudo cargar tu agenda de pagos.');}
   });
 }
 changeType(value:'income'|'expense'){this.type=value;this.categoryId=null;}
 create(){
   if(this.saving())return;
   const title=this.title.trim();
   if(title.length<2||title.length>120||this.categoryId===null||this.amount===null||
     !Number.isFinite(this.amount)||this.amount<=0||Math.round(this.amount*100)/100!==this.amount||
     this.dayOfMonth<1||this.dayOfMonth>28){
       this.error.set('Completa título, categoría, día (1 a 28) y monto válido.');return;
   }
   this.saving.set(true);this.error.set('');this.notice.set('');
   this.api.create({title,amount:this.amount,type:this.type,categoryId:this.categoryId,
     accountId:this.accountId,dayOfMonth:this.dayOfMonth}).subscribe({
     next:()=>{this.saving.set(false);this.title='';this.amount=null;this.categoryId=null;
       this.notice.set('Movimiento mensual programado.');this.refresh();},
     error:()=>{this.saving.set(false);this.error.set('No se pudo programar. Revisa tu categoría y la billetera.');}
   });
 }
 toggle(r:RecurringRule){
   this.api.activate(r.id,!r.active).subscribe({
     next:()=>{this.notice.set(r.active?'Recurrencia pausada.':'Recurrencia activada.');this.refresh();},
     error:()=>this.error.set('No pudimos modificar esta recurrencia.')
   });
 }
 remove(r:RecurringRule){
   if(!window.confirm('¿Eliminar la recurrencia '+r.title+'? Los movimientos ya registrados se conservarán.'))return;
   this.api.delete(r.id).subscribe({
     next:()=>{this.notice.set('Recurrencia eliminada.');this.refresh();},
     error:()=>this.error.set('No se pudo eliminar esta recurrencia.')
   });
 }
 process(){
   if(this.saving())return;
   this.saving.set(true);this.error.set('');
   this.api.processDue().subscribe({
     next:result=>{this.saving.set(false);
       this.notice.set(result.created?result.created+' movimiento(s) registrados.':'No había movimientos vencidos por procesar.');
       this.refresh();},
     error:()=>{this.saving.set(false);this.error.set('No fue posible procesar los movimientos vencidos.');}
   });
 }
 categoryName(id:number){return this.categories().find(c=>c.id===id)?.name||'Categoría';}
 accountName(id:number|null){return this.accounts().find(a=>a.id===id)?.name||'Sin billetera asignada';}
}
