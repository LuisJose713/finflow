import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '@environments/environment';

@Component({
 selector:'app-security',standalone:true,imports:[CommonModule,FormsModule,NavbarComponent],
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
 profileName='';
 profileEmail='';
 profileOriginalName='';
 profileOriginalEmail='';
 profilePassword='';
 verificationCode='';
 readonly emailPending=signal(false);
 readonly profileBusy=signal(false);

 constructor(){
   const user=this.auth.currentUser();
   this.profileName=user?.name??'';
   this.profileEmail=user?.email??'';
   this.profileOriginalName=this.profileName;
   this.profileOriginalEmail=this.profileEmail;
   this.http.get<{name:string;email:string}>(this.api+'/me').subscribe({
     next:user=>{
       this.profileName=user.name;this.profileEmail=user.email;
       this.profileOriginalName=user.name;this.profileOriginalEmail=user.email;
     },
     error:()=>{}
   });
 }

 updateProfile(){
   if(this.profileBusy())return;
   this.error.set('');this.message.set('');
   if(!this.profileName.trim() || !this.profileEmail.trim() || !this.profilePassword) {
     this.error.set('Completa nombre, correo y tu contraseña actual.');return;
   }
   const emailChanged=this.profileEmail.trim().toLowerCase() !== this.profileOriginalEmail.toLowerCase();
   if(emailChanged) {
     if(this.profileName.trim() !== this.profileOriginalName) {
       this.error.set('Guarda primero el cambio de nombre. Después podrás verificar el nuevo correo.');
       return;
     }
     this.profileBusy.set(true);
     this.http.post<{status:string;expiresInSeconds:number}>(this.api+'/profile-email/request',{
       newEmail:this.profileEmail.trim(),currentPassword:this.profilePassword
     }).subscribe({
       next:()=>{this.profileBusy.set(false);this.profilePassword='';
         this.emailPending.set(true);this.message.set('Enviamos un código al nuevo correo. Caduca en 15 minutos.');},
       error:(err:HttpErrorResponse)=>{this.profileBusy.set(false);
         this.error.set(err.status===503?'El servicio de verificación de correo no está habilitado todavía.'
           :err.status===429?'Has solicitado demasiados códigos. Inténtalo más tarde.'
           :err.status===409?'El nuevo correo ya está registrado.'
           :err.status===403?'Contraseña actual incorrecta.'
           :'No pudimos enviar el código. Verifica tu dirección e inténtalo.');}
     });
     return;
   }
   this.profileBusy.set(true);
   this.http.put<{logoutRequired:boolean}>(this.api+'/profile',{
     name:this.profileName.trim(),email:this.profileOriginalEmail,currentPassword:this.profilePassword
   }).subscribe({
     next:()=>{this.profileBusy.set(false);this.profilePassword='';this.auth.logout();},
     error:(err:HttpErrorResponse)=>{this.profileBusy.set(false);
       this.error.set(err.status===403?'La contraseña actual no coincide.'
         :err.status===409?'El nombre ya pertenece a otra cuenta.'
         :err.status===400?'Verifica el nombre.'
         :'No pudimos guardar tu perfil.');}
   });
 }

 confirmEmail(){
   if(this.profileBusy() || !/^[0-9]{8}$/.test(this.verificationCode))return;
   this.error.set('');this.profileBusy.set(true);
   this.http.post<{status:string;logoutRequired?:boolean;attemptsRemaining?:number}>(
       this.api+'/profile-email/confirm',{code:this.verificationCode}).subscribe({
     next:response=>{
       this.profileBusy.set(false);
       if(response.status==='VERIFIED'){
         this.emailPending.set(false);this.auth.logout();
       }else this.error.set('Código incorrecto. Intentos restantes: '+(response.attemptsRemaining??0));
     },
     error:(err:HttpErrorResponse)=>{
       this.profileBusy.set(false);
       this.error.set(err.status===429?'Agotaste los intentos. Solicita otro código.'
         :'No se pudo verificar el correo. Solicita otro código si caducó.');
     }
   });
 }


 changePassword(){
   if(this.busy())return;
   this.error.set('');this.message.set('');
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
