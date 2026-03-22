import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DashboardRefreshService {

  readonly version = signal(0);
 
  trigger() {
    this.version.update(v => v + 1);
  }
}
