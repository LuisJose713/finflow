import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router'; 
import { CommonModule } from '@angular/common'; 
import { AuthService } from '../../../core/services/auth.service';
import { LogoutButtonComponent } from '../logout-button/logout-button.component';
import { ThemeSwitcherComponent } from '../theme-switcher/theme-switcher.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,          
    RouterModule,          
    LogoutButtonComponent,
    ThemeSwitcherComponent
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {

  auth = inject(AuthService);

  collapsed = signal(false);
  mobileOpen = signal(false); // 🔥 CLAVE

  navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/goals',     label: 'Metas',     icon: '🎯' },
    { path: '/advisor',   label: 'Asesor IA', icon: '🤖' },
    { path: '/transactions', label: 'Transacciones', icon: '💳' },
    { path: '/planned-expenses', label: 'Gastos Planeados', icon: '📅' },
    { path: '/categories', label: 'Mis categorías', icon: '▦' }
  ];

  toggleCollapse() {
    this.collapsed.update(v => !v);
  }

  toggleMobile() {
    this.mobileOpen.update(v => !v);
  }

  closeMobile() {
    this.mobileOpen.set(false);
  }
}