import { Component, inject } from '@angular/core';
import { WebUpdateService } from '../../core/services/web-update.service';

@Component({
  selector: 'app-update-notice', standalone: true,
  templateUrl: './update-notice.component.html',
  styleUrl: './update-notice.component.css',
})
export class UpdateNoticeComponent { readonly updates = inject(WebUpdateService); }
