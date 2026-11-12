import { DismissibleCardDirective } from '../../shared/directives/dismissible-card.directive';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { DailyRemindersService } from '../../core/services/daily-reminders.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '@environments/environment';

@Component({
 selector:'app-security',standalone:true,imports: [DismissibleCardDirective, CommonModule,FormsModule,NavbarComponent,RouterLink],
 templateUrl:'./security.component.html',styleUrl:'./security.component.scss'
})
export class SecurityComponent {
 private readonly http=inject(HttpClient);
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
 readonly api=environment.apiUrl+'/auth';

 async activatePush() {
   if (this.pushBusy()) return;
   this.pushBusy.set(true); this.error.set(''); this.message.set('');
   try {
     const ok = await this.reminders.enable();
     this.message.set(ok ? 'Notificaciones de FinFlow activadas en este dispositivo.' : 'No se pudo activar Web Push. Comprueba permisos y configuración del servidor.');
   } catch { this.error.set('No se pudo activar Web Push.'); }
   finally { this.pushBusy.set(false); }
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
