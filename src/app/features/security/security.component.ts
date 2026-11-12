import { DismissibleCardDirective } from '../../shared/directives/dismissible-card.directive';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '@environments/environment';

@Component({
 selector:'app-security',standalone:true,imports: [DismissibleCardDirective, CommonModule,FormsModule,NavbarComponent,RouterLink],
 templateUrl:'./security.component.html',styleUrl:'./security.component.scss'
})
export class SecurityComponent {
 private readonly http=inject(HttpClient);
 readonly auth=inject(AuthService);
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
 readonly api=environment.apiUrl+'/auth';

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
