import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-privacy-info',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './privacy-info.component.html',
  styleUrl: './privacy-info.component.scss',
})
export class PrivacyInfoComponent {
  readonly isAuthenticated = inject(AuthService).isAuthenticated;
}
