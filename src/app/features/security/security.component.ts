import { DismissibleCardDirective } from '../../shared/directives/dismissible-card.directive';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { DailyRemindersService } from '../../core/services/daily-reminders.service';
import { PageGuideService } from '../../core/services/page-guide.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '@environments/environment';
import { GoogleSignInComponent } from '../../shared/components/google-sign-in/google-sign-in.component';

@Component({
 selector:'app-security',standalone:true,imports: [DismissibleCardDirective, CommonModule,FormsModule,NavbarComponent,RouterLink,GoogleSignInComponent],
 templateUrl:'./security.component.html',styleUrl:'./security.component.scss'
})
export class SecurityComponent {
 private readonly http=inject(HttpClient);
 private readonly router=inject(Router);
 private readonly guide=inject(PageGuideService);
 replayGuide(): void {
   void this.router.navigateByUrl('/dashboard').then(ok => { if (ok) this.guide.start('/dashboard'); });
 }
 readonly auth=inject(AuthService);
 readonly reminders=inject(DailyRemindersService);
 readonly pushBusy=signal(false);
 readonly busy=signal(false);
 readonly message=signal('');
 readonly error=signal('');
 readonly showOld=signal(false);
 readonly showNew=signal(false);
 readonly showConfirm=signal(false);
 oldPassword='';
 newPassword='';
 confirmPassword='';
 revokePassword='';
 deletePassword='';
 deletePhrase='';
 readonly showDeletePassword=signal(false);
 emailPassword='';
 newEmail='';
 confirmEmail='';
 readonly revealEmailPassword=signal(false);
 readonly api=environment.apiUrl+'/auth';

 changeEmail(): void {
   if (this.busy()) return;
   this.error.set(''); this.message.set('');
   const desired = this.newEmail.trim().toLowerCase();
   const confirmed = this.confirmEmail.trim().toLowerCase();
   if (desired.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(desired) || desired !== confirmed) {
     this.error.set('Introduce y confirma un correo válido.');
     return;
   }
   if (!this.emailPassword || new TextEncoder().encode(this.emailPassword).length > 72) {
     this.error.set('Confirma tu contraseña actual (máximo 72 bytes).');
     return;
   }
   if (desired === this.auth.currentUser()?.email?.toLowerCase()) {
     this.error.set('El nuevo correo debe ser distinto al actual.');
     return;
   }
   this.busy.set(true);
   this.http.post<{status:string; logoutRequired:boolean}>(this.api + '/change-email', {
     currentPassword:this.emailPassword, newEmail:desired, confirmEmail:confirmed
   }).subscribe({
     next:()=> {
       this.busy.set(false);
       this.emailPassword=''; this.newEmail=''; this.confirmEmail='';
       this.auth.logout();
     },
     error:(err:HttpErrorResponse)=> {
       this.busy.set(false);
       this.error.set(err.status===403?'Contraseña actual incorrecta.'
         :err.status===409?'Ese correo ya está registrado.'
         :err.status===400?'Revisa el correo, su confirmación y la contraseña.'
         :'No fue posible actualizar el correo.');
     }
   });
 }

 onGoogleLinked(): void {
   this.error.set('');
   this.message.set('Cuenta de Google vinculada: podrás entrar con ella sin alterar tus finanzas.');
 }
 onGoogleError(message: string): void { this.error.set(message); }

 async activatePush() {
   if (this.pushBusy()) return;
   this.pushBusy.set(true); this.error.set(''); this.message.set('');
   try {
     const ok = await this.reminders.enable();
     this.message.set(ok ? 'Notificaciones de FinFlow activadas en este dispositivo.' : 'No se pudo activar Web Push. Comprueba permisos y configuración del servidor.');
   } catch { this.error.set('No se pudo activar Web Push.'); }
   finally { this.pushBusy.set(false); }
 }
 async deactivatePush() {
   if (this.pushBusy()) return;
   this.pushBusy.set(true); this.error.set(''); this.message.set('');
   try {
     const confirmed = await this.reminders.disable();
     this.message.set(confirmed
       ? 'Notificaciones desactivadas en este dispositivo.'
       : 'Notificaciones desactivadas en este navegador, pero no pudimos confirmar la baja con el servidor.');
   } catch {
     this.error.set('No pudimos desactivar las notificaciones. Inténtalo de nuevo.');
   } finally { this.pushBusy.set(false); }
 }
 async testPush() {
   if (this.pushBusy()) return;
   this.pushBusy.set(true); this.error.set(''); this.message.set('');
   try {
     const count = await this.reminders.testPush();
     this.message.set(count ? 'Prueba enviada al servicio push. Comprueba tu iPhone.' : 'No se confirmó ningún envío. Revisa la suscripción y el servidor.');
   } catch { this.error.set('No se pudo enviar la prueba de FinFlow.'); }
   finally { this.pushBusy.set(false); }
 }
 changePassword(){
   if(this.busy())return;
   this.error.set('');this.message.set('');
   if(new TextEncoder().encode(this.newPassword).length>72){
     this.error.set('La nueva contraseña supera el máximo de 72 bytes UTF-8. Algunos caracteres ocupan varios bytes.');
     return;
   }
   if(this.newPassword.length<12||this.newPassword.length>128||
     this.newPassword!==this.confirmPassword||!this.oldPassword){
     this.error.set('La nueva contraseña debe tener al menos 12 caracteres y coincidir con su confirmación.');
     return;
   }
   this.busy.set(true);
   this.http.post<{status:string;logoutRequired:boolean}>(this.api+'/change-password',{
      currentPassword:this.oldPassword,newPassword:this.newPassword,confirmPassword:this.confirmPassword
   }).subscribe({
     next:()=>{this.busy.set(false);this.oldPassword='';this.newPassword='';this.confirmPassword='';
       this.auth.logout();},
     error:(err:HttpErrorResponse)=>{this.busy.set(false);
       this.error.set(err.status===403?'Contraseña actual incorrecta.'
        :err.status===400?'Revisa la contraseña nueva y la confirmación.'
        :'No fue posible cambiar la contraseña.');}
   });
 }
 deleteAccount(){
   if(this.busy()) return;
   this.error.set(''); this.message.set('');
   if(!this.deletePassword || new TextEncoder().encode(this.deletePassword).length>72){
     this.error.set('Introduce la contraseña actual (máximo 72 bytes UTF-8).');
     return;
   }
   if(this.deletePhrase !== 'ELIMINAR'){
     this.error.set('Escribe ELIMINAR para confirmar la operación.');
     return;
   }
   if(!window.confirm('¿Eliminar definitivamente tu cuenta y tus datos financieros? Esta acción es irreversible.'))return;
   this.busy.set(true);
   this.http.request<void>('DELETE',this.api+'/account',{body:{password:this.deletePassword}}).subscribe({
     next:()=>{
       this.busy.set(false);this.deletePassword='';this.deletePhrase='';
       this.auth.finishAccountDeletion();
     },
     error:(err:HttpErrorResponse)=>{
       this.busy.set(false);
       this.error.set(err.status===403?'Contraseña incorrecta.':
          err.status===429?'Demasiados intentos. Inténtalo más tarde.':
          err.status===400?'Revisa la contraseña indicada.':
          'No fue posible confirmar la eliminación. Comprueba tu cuenta antes de reintentar.');
     }
   });
 }

 revokeSessions(){
   if(this.busy()||!this.revokePassword)return;
   if(!window.confirm('¿Cerrar las sesiones de todos tus dispositivos? Tendrás que iniciar sesión otra vez.'))return;
   this.error.set('');this.busy.set(true);
   this.http.post(this.api+'/revoke-sessions',{password:this.revokePassword}).subscribe({
     next:()=>{this.busy.set(false);this.revokePassword='';this.auth.logout();},
     error:(err:HttpErrorResponse)=>{this.busy.set(false);
       this.error.set(err.status===403?'Contraseña incorrecta.':'No fue posible cerrar las otras sesiones.');}
   });
 }
}
