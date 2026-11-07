import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { PrivacyPolicy, PrivacyService } from './core/services/privacy.service';
import { PrivacyPolicyComponent } from './shared/components/privacy-policy.component';

@Component({
  selector:'app-root',standalone:true,
  imports:[RouterOutlet,CommonModule,PrivacyPolicyComponent],
  template:`
    <router-outlet/>
    <div class="privacy-shield" *ngIf="needsConsent()" role="presentation">
      <section class="privacy-dialog" role="dialog" aria-modal="true" aria-labelledby="legacy-privacy-title">
        <header><span>FINFLOW · TUS DATOS SON TUYOS</span><h2 id="legacy-privacy-title">Actualizamos nuestra política de privacidad</h2>
          <p>Como ya tienes cuenta, necesitamos que leas la versión vigente y decidas si autorizas el tratamiento de tus datos.</p></header>
        <div class="privacy-scroll"><app-privacy-policy [policy]="policy()"/></div>
        <footer>
          <label class="privacy-check"><input type="checkbox" [checked]="accepted()" (change)="accepted.set(!accepted())"/>
            <span>He leído la política y autorizo el tratamiento necesario para utilizar FinFlow.</span></label>
          <label class="privacy-check"><input type="checkbox" [checked]="marketing()" (change)="marketing.set(!marketing())"/>
            <span>Opcional: quiero recibir promociones y novedades por correo.</span></label>
          <p *ngIf="privacyError()" class="privacy-error" role="alert">{{privacyError()}}</p>
          <button (click)="confirmConsent()" [disabled]="!accepted() || saving()">
            {{saving()?'Guardando...':'Aceptar y continuar'}}
          </button>
          <button type="button" class="privacy-leave" (click)="auth.logout()">No acepto · Cerrar sesión</button>
          <a [href]="'mailto:'+policy()?.contactEmail+'?subject=Solicitud%20de%20datos%20FinFlow'">Consultar derechos o solicitar eliminación</a>
        </footer>
      </section>
    </div>
  `,
  styles:[`
    .privacy-shield{position:fixed;inset:0;z-index:5000;display:flex;justify-content:center;align-items:center;padding:clamp(.5rem,2vw,2rem);background:#071225df;backdrop-filter:blur(9px)}
    .privacy-dialog{display:flex;flex-direction:column;width:min(100%,760px);max-height:calc(100dvh - 1rem);min-height:0;background:var(--bg-primary,#fff);color:var(--text-primary,#0f172a);border-radius:20px;overflow:hidden;box-shadow:0 30px 80px #0007}
    .privacy-dialog header{padding:1.25rem clamp(1rem,3vw,2rem);border-bottom:1px solid var(--border,#e2e8f0)}
    .privacy-dialog header span{font-size:.65rem;letter-spacing:.18em;color:#9f7c45;font-weight:800}
    .privacy-dialog header h2{font-size:clamp(1.2rem,3vw,1.7rem);margin:.55rem 0}
    .privacy-dialog header p{font-size:.82rem;line-height:1.6;color:var(--text-secondary,#475569)}
    .privacy-scroll{overflow-y:auto;min-height:0;flex:1 1 auto;padding:1.1rem clamp(1rem,3vw,2rem);overscroll-behavior:contain}
    .privacy-dialog footer{flex:0 0 auto;display:flex;flex-direction:column;gap:.65rem;padding:1rem clamp(1rem,3vw,2rem) calc(1rem + env(safe-area-inset-bottom));border-top:1px solid var(--border,#e2e8f0);background:var(--bg-primary,#fff)}
    .privacy-check{display:flex;align-items:flex-start;gap:.6rem;font-size:.81rem;line-height:1.4}
    .privacy-check input{width:20px;height:20px;flex:none}
    .privacy-dialog button{min-height:44px;border-radius:10px;font-weight:800;background:#162c48;color:#fff;border:0}
    .privacy-dialog button:disabled{opacity:.55}
    .privacy-dialog .privacy-leave{background:transparent;border:1px solid var(--border,#e2e8f0);color:var(--text-primary,#0f172a)}
    .privacy-dialog footer a{font-size:.75rem;text-align:center;text-decoration:underline}
    .privacy-error{color:#b42342;font-size:.8rem}
    @media(max-width:600px){.privacy-shield{padding:0;align-items:flex-end}.privacy-dialog{max-height:100dvh;border-radius:20px 20px 0 0}.privacy-dialog header{padding:1rem}.privacy-dialog header p{font-size:.77rem}.privacy-scroll{padding:1rem}}
  `]
})
export class AppComponent {
  readonly auth=inject(AuthService);
  private readonly privacy=inject(PrivacyService);
  readonly needsConsent=signal(false);
  readonly policy=signal<PrivacyPolicy|null>(null);
  readonly accepted=signal(false);
  readonly marketing=signal(false);
  readonly saving=signal(false);
  readonly privacyError=signal('');
  constructor(){
    effect(onCleanup=>{
      const token=this.auth.token();
      this.needsConsent.set(false);
      if(!token)return;
      const subscription=this.privacy.status().subscribe({
        next:status=>{
          if(!status.policyReady)return;
          this.privacy.policy().subscribe({
            next:p=>{
              if(p.ready){this.policy.set(p);this.needsConsent.set(!status.accepted);}
            },
            error:()=>{}
          });
        },
        error:()=>{}
      });
      onCleanup(()=>subscription.unsubscribe());
    });
  }
  confirmConsent(){
    if(!this.accepted()||!this.policy()||this.saving())return;
    this.privacyError.set('');this.saving.set(true);
    this.privacy.consent(true,this.policy()!.version,this.marketing()).subscribe({
      next:()=>{this.needsConsent.set(false);this.saving.set(false);},
      error:()=>{this.privacyError.set('No pudimos registrar la autorización. Inténtalo de nuevo.');this.saving.set(false);}
    });
  }
}
