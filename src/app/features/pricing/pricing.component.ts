import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BillingCatalog, BillingOffer, BillingPlanCode, BillingService } from '../../core/services/billing.service';
@Component({
  selector:'app-pricing',standalone:true,imports:[CommonModule,FormsModule,RouterLink],
  templateUrl:'./pricing.component.html',styleUrl:'./pricing.component.scss'
})
export class PricingComponent implements OnInit {
  private readonly billing=inject(BillingService);
  readonly auth=inject(AuthService);
  readonly catalog=signal<BillingCatalog|null>(null);
  readonly loading=signal(true);
  readonly error=signal('');
  readonly chosen=signal<BillingPlanCode>('MONTHLY');
  readonly coupon=signal('');
  readonly quote=signal<BillingOffer|null>(null);
  readonly couponError=signal('');
  readonly current=signal<BillingPlanCode>('FREE');
  ngOnInit(){
    this.billing.catalog().subscribe({next:data=>{this.catalog.set(data);this.loading.set(false);},
      error:()=>{this.error.set('Los planes no están disponibles todavía.');this.loading.set(false);}});
    if(this.auth.isAuthenticated())this.billing.status().subscribe({next:data=>this.current.set(data.planCode),error:()=>{}});
  }
  format(v:number){return new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(v);}
  period(code:BillingPlanCode){return code==='MONTHLY'?'por mes':code==='YEARLY'?'al año':code==='LIFETIME'?'pago único':'para siempre';}
  checkCoupon(){
    this.quote.set(null);this.couponError.set('');
    if(!this.coupon().trim()){this.couponError.set('Escribe el código promocional.');return;}
    this.billing.quote(this.chosen(),this.coupon().trim()).subscribe({
      next:v=>this.quote.set(v),error:()=>this.couponError.set('Este código no aplica, está vencido o no existe.')});
  }
}