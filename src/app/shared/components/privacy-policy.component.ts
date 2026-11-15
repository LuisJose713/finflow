import { Component, input } from '@angular/core';
import { PrivacyPolicy } from '../../core/services/privacy.service';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.css'
})
export class PrivacyPolicyComponent {
  policy = input<PrivacyPolicy | null>(null);
}
