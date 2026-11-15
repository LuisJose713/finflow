import { Component, Input, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-logout-button',
  standalone: true,
  templateUrl: './logout-button.component.html',
  styleUrl: './logout-button.component.css',
})
export class LogoutButtonComponent {
  @Input() compact = false;
  private readonly auth = inject(AuthService);
  logout() { this.auth.logout(); }
}
