import { DismissibleCardDirective } from '../../shared/directives/dismissible-card.directive';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BillingPlan, BillingPromotion, BillingPlanCode, BillingService, DiscountType, PromotionInput } from '../../core/services/billing.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-admin-billing', standalone: true,
  imports: [DismissibleCardDirective, CommonModule, FormsModule, RouterLink, NavbarComponent],
  templateUrl: './admin-billing.component.html', styleUrl: './admin-billing.component.scss'
})
export class AdminBillingComponent implements OnInit {
  private readonly billing = inject(BillingService);
  readonly plans = signal<BillingPlan[]>([]);
  readonly promotions = signal<BillingPromotion[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly editing = signal(false);
  promotion: PromotionInput = this.emptyPromotion();
  grantUserId: number | null = null;
  grantPlan: BillingPlanCode = 'MONTHLY';
  grantReason = '';

  ngOnInit(){ this.refresh(); }
  formatCop(value: number) { return new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(value); }
  private errorText(error: any): string {
    return error?.error?.detail || error?.error?.message || error?.error?.error ||
       (error?.status === 403 ? 'No tienes permisos administrativos.' : 'No se pudo completar la operación.');
  }
  refresh() {
    this.loading.set(true); this.error.set('');
    this.billing.plans().subscribe({
      next: data => { this.plans.set(data); this.loading.set(false); },
      error: error => { this.loading.set(false); this.error.set(this.errorText(error)); }
    });
    this.billing.promotions().subscribe({
      next: data => this.promotions.set(data),
      error: error => this.error.set(this.errorText(error))
    });
  }
  private localDateTime(date: Date) {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16);
  }
  private emptyPromotion(): PromotionInput {
    return {code:'',title:'',planCode:'MONTHLY',discountType:'PERCENT',discountValue:20,
      startsAt:this.localDateTime(new Date()),
      endsAt:this.localDateTime(new Date(Date.now()+14*86400000)),
      maxRedemptions:null,active:true,published:false};
  }
  private toLocalDateTime(iso: string) { return this.localDateTime(new Date(iso)); }
  newPromotion() { this.editing.set(false); this.promotion=this.emptyPromotion(); this.error.set(''); }
  edit(p: BillingPromotion) {
    this.promotion={code:p.code,title:p.title,planCode:p.planCode,discountType:p.discountType,
      discountValue:p.discountValue,startsAt:this.toLocalDateTime(p.startsAt),
      endsAt:this.toLocalDateTime(p.endsAt),maxRedemptions:p.maxRedemptions,
      active:p.active,published:p.published};
    this.editing.set(true);
    this.error.set('');
  }
  savePlan(plan:BillingPlan) {
    if(this.saving())return;
    this.error.set('');this.message.set('');this.saving.set(true);
    this.billing.savePlan(plan).subscribe({
      next: () => {this.saving.set(false);this.message.set('Precio y estado guardados.');this.refresh();},
      error: e => {this.saving.set(false);this.error.set(this.errorText(e));}
    });
  }
  savePromotion(){
    if(this.saving())return;
    this.error.set('');this.message.set('');
    const data:PromotionInput={...this.promotion,
      code:this.promotion.code.trim().toUpperCase(),
      startsAt:new Date(this.promotion.startsAt).toISOString(),
      endsAt:new Date(this.promotion.endsAt).toISOString(),
      maxRedemptions:this.promotion.maxRedemptions || null};
    if(!data.title || !data.code || !Number.isFinite(data.discountValue)) {
      this.error.set('Completa el nombre, código y descuento de la campaña.');return;
    }
    this.saving.set(true);
    const req=this.editing()?this.billing.savePromotion(data):this.billing.addPromotion(data);
    req.subscribe({
      next:()=>{this.saving.set(false);this.message.set('Promoción guardada.');this.newPromotion();this.refresh();},
      error:e=>{this.saving.set(false);this.error.set(this.errorText(e));}
    });
  }
  togglePromotion(p:BillingPromotion) {
    if(this.saving())return;
    this.saving.set(true);
    const updated:PromotionInput={...p,active:!p.active};
    this.billing.savePromotion(updated).subscribe({
      next:()=>{this.saving.set(false);this.message.set('Promoción actualizada.');this.refresh();},
      error:e=>{this.saving.set(false);this.error.set(this.errorText(e));}
    });
  }
  grant() {
    if(this.saving() || this.grantUserId == null || this.grantUserId <= 0 || this.grantReason.trim().length < 8)return;
    if(!confirm('Vas a conceder acceso Pro sin cobro. ¿Confirmas esta concesión administrativa?'))return;
    this.saving.set(true);this.error.set('');this.message.set('');
    this.billing.grant(this.grantUserId,this.grantPlan,this.grantReason.trim()).subscribe({
      next:()=>{this.saving.set(false);this.message.set('Acceso asignado y auditado.');this.grantUserId=null;this.grantReason='';},
      error:e=>{this.saving.set(false);this.error.set(this.errorText(e));}
    });
  }
}
