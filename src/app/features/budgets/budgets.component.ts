import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { CategoryService } from '../../core/services/category.service';
import { BudgetService, MonthlyBudget } from '../../core/services/budget.service';
import { Category } from '../../core/models';

@Component({
 selector:'app-budgets', standalone:true, imports:[CommonModule,FormsModule,NavbarComponent],
 templateUrl:'./budgets.component.html', styleUrl:'./budgets.component.scss'
})
export class BudgetsComponent implements OnInit {
 private readonly api=inject(BudgetService);
 private readonly categoryApi=inject(CategoryService);
 readonly year=signal(new Date(new Date().toLocaleString('en-US',{timeZone:'America/Bogota'})).getFullYear());
 readonly month=signal(new Date(new Date().toLocaleString('en-US',{timeZone:'America/Bogota'})).getMonth()+1);
 readonly budgets=signal<MonthlyBudget[]>([]);
 readonly categories=signal<Category[]>([]);
 readonly loading=signal(true);
 readonly busy=signal(false);
 readonly error=signal('');
 readonly notice=signal('');
 readonly editing=signal<number|null>(null);
 selectedCategory:number|null=null;
 amount:number|null=null;
 readonly period= computed(()=>new Intl.DateTimeFormat('es-CO',{month:'long',year:'numeric'}).format(new Date(this.year(),this.month()-1,1)));
 readonly selectedCategoryName=computed(()=>this.budgets().find(b=>b.id===this.editing())?.categoryName ?? 'Categoría');
 readonly available= computed(()=>this.categories().filter(c=>c.type.toLowerCase()==='expense' && !this.budgets().some(b=>b.categoryId===c.id)));
 readonly totalLimit= computed(()=>this.budgets().reduce((sum,b)=>sum+Number(b.limitAmount),0));
 readonly totalSpent= computed(()=>this.budgets().reduce((sum,b)=>sum+Number(b.spent),0));
 readonly alerts= computed(()=>this.budgets().filter(b=>b.status!=='ok').length);
 ngOnInit(){this.refresh();}
 refresh() {
   this.loading.set(true);this.error.set('');
   forkJoin({budgets:this.api.list(this.year(),this.month()),categories:this.categoryApi.getAll()}).subscribe({
     next:data=>{this.budgets.set(data.budgets);this.categories.set(data.categories);this.loading.set(false);},
     error:()=>{this.error.set('No pudimos consultar tus presupuestos.');this.loading.set(false);}
   });
 }
 changeMonth(delta:number) {
   const date=new Date(this.year(),this.month()-1+delta,1);
   if(date.getFullYear()<2000||date.getFullYear()>2100)return;
   this.year.set(date.getFullYear());this.month.set(date.getMonth()+1);this.reset();this.refresh();
 }
 reset(){this.editing.set(null);this.selectedCategory=null;this.amount=null;}
 edit(b:MonthlyBudget){this.editing.set(b.id);this.selectedCategory=b.categoryId;this.amount=b.limitAmount;this.error.set('');}
 save() {
   if(this.busy())return;
   const amount=Number(this.amount);
   if(this.amount===null||!Number.isFinite(amount)||amount<=0||amount>9999999999999.99||Math.round(amount*100)/100!==amount) {
     this.error.set('El límite debe ser positivo y tener máximo dos decimales.');return;
   }
   if(this.editing()===null&&!this.selectedCategory) {this.error.set('Selecciona una categoría de gasto.');return;}
   this.busy.set(true);this.error.set('');this.notice.set('');
   const id=this.editing();
   const op=id===null?this.api.create({categoryId:this.selectedCategory!,year:this.year(),month:this.month(),amount}):this.api.update(id,amount);
   op.subscribe({
     next:()=>{this.busy.set(false);this.notice.set(id===null?'Presupuesto creado.':'Límite actualizado.');this.reset();this.refresh();},
     error:err=>{this.busy.set(false);this.error.set(err.status===409?'Ya existe un límite para esta categoría en este mes.':'No fue posible guardar el presupuesto.');}
   });
 }
 remove(b:MonthlyBudget) {
   if(!window.confirm('¿Eliminar el presupuesto de '+b.categoryName+'? Tus transacciones se conservarán.'))return;
   this.error.set('');this.api.remove(b.id).subscribe({
     next:()=>{this.notice.set('Presupuesto eliminado.');this.reset();this.refresh();},
     error:()=>this.error.set('No fue posible eliminar el presupuesto.')
   });
 }
 progress(b:MonthlyBudget){return Math.min(100,Math.max(0,Number(b.percentUsed)));}
}
