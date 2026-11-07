import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@environments/environment';

export interface PrivacyPolicy {
  version:string;ready:boolean;controllerName:string;contactEmail:string;
  contactAddress:string;contactPhone:string;effectiveDate:string;
}
export interface PrivacyStatus {accepted:boolean;version:string;policyReady:boolean;}
@Injectable({providedIn:'root'})
export class PrivacyService {
  private readonly http=inject(HttpClient);
  private readonly api=environment.apiUrl+'/privacy';
  policy(){return this.http.get<PrivacyPolicy>(this.api+'/policy');}
  status(){return this.http.get<PrivacyStatus>(this.api+'/status');}
  consent(accepted:boolean,policyVersion:string,marketingConsent:boolean){
    return this.http.post<{accepted:boolean;version:string}>(this.api+'/consent',{accepted,policyVersion,marketingConsent});
  }
  rightsRequest(type:'ACCESS'|'RECTIFY'|'DELETE'|'REVOKE',description:string){
    return this.http.post<{status:string;message:string}>(this.api+'/rights-request',{type,description});
  }
}