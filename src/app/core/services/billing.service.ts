import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@environments/environment';

export type BillingPlanCode = 'FREE' | 'MONTHLY' | 'YEARLY' | 'LIFETIME' | 'TRIAL';
export type DiscountType = 'PERCENT' | 'FIXED';
export interface BillingPlan {
  code: BillingPlanCode; title: string; description: string; priceCop: number;
  active: boolean; sortOrder: number;
}
export interface BillingPromotion {
  code: string; title: string; planCode: BillingPlanCode; discountType: DiscountType;
  discountValue: number; startsAt: string; endsAt: string; maxRedemptions: number | null;
  redemptionCount: number; active: boolean; published: boolean;
}
export type PromotionInput = Omit<BillingPromotion,'redemptionCount'>;
export interface BillingOffer {
  code: BillingPlanCode; title: string; description: string;
  originalCop: number; priceCop: number; promoCode: string | null;
  promoTitle: string | null; savingsPercent: number; checkoutEnabled: boolean;
}
export interface BillingCatalog { currency: string; checkoutEnabled: boolean; offers: BillingOffer[] }
export interface BillingEntitlement { planCode: BillingPlanCode; pro: boolean; validUntil?: string; source?: string; }
@Injectable({providedIn:'root'})
export class BillingService {
  private readonly http=inject(HttpClient);
  private readonly api=environment.apiUrl;
  catalog(){return this.http.get<BillingCatalog>(this.api+'/billing/catalog');}
  quote(planCode:BillingPlanCode,promoCode:string){
    return this.http.get<BillingOffer>(this.api+'/billing/quote',{params:new HttpParams().set('planCode',planCode).set('promoCode',promoCode)});
  }
  status(){return this.http.get<BillingEntitlement>(this.api+'/billing/me');}
  plans(){return this.http.get<BillingPlan[]>(this.api+'/admin/billing/plans');}
  savePlan(plan:BillingPlan){return this.http.put<BillingPlan>(this.api+'/admin/billing/plans/'+plan.code,plan);}
  promotions(){return this.http.get<BillingPromotion[]>(this.api+'/admin/billing/promotions');}
  addPromotion(p:PromotionInput){return this.http.post<BillingPromotion>(this.api+'/admin/billing/promotions',p);}
  savePromotion(p:PromotionInput){return this.http.put<BillingPromotion>(this.api+'/admin/billing/promotions/'+encodeURIComponent(p.code),p);}
  grant(userId:number,planCode:BillingPlanCode,reason:string){
    return this.http.post(this.api+'/admin/billing/grants',{userId,planCode,reason});
  }
}