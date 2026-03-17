# FinanceApp — Angular 18

Migración completa del proyecto Next.js/React a **Angular 18 Standalone** con signals, lazy loading y arquitectura modular.

---

## 🗂️ Estructura del proyecto

```
src/app/
├── core/
│   ├── guards/
│   │   ├── auth.guard.ts          # Protege rutas privadas (≡ middleware.ts)
│   │   └── guest.guard.ts         # Redirige usuarios autenticados
│   ├── interceptors/
│   │   └── auth.interceptor.ts    # Añade Bearer token + maneja 401 (≡ axios.ts + useFetchWithAuth)
│   ├── models/
│   │   └── index.ts               # Interfaces: User, Transaction, Goal, AdvisorCard...
│   └── services/
│       ├── auth.service.ts        # Login, register, logout con Signals
│       ├── transaction.service.ts # CRUD transacciones + stats + export
│       ├── goal.service.ts        # CRUD metas financieras (≡ src/api/goals.js)
│       ├── advisor.service.ts     # Chat IA + cards (≡ lib/advisor.ts)
│       ├── toast.service.ts       # Notificaciones (≡ use-toast.ts)
│       ├── theme.service.ts       # Light/Dark/System (≡ theme-provider.tsx)
│       └── export-pdf.service.ts  # Descarga PDF (≡ lib/export-pdf.ts)
│
├── features/
│   ├── auth/
│   │   ├── login/
│   │   │   └── login.component.ts      # ≡ app/login/page.tsx
│   │   └── register/
│   │       └── register.component.ts   # ≡ app/register/page.tsx
│   ├── dashboard/
│   │   ├── dashboard.component.ts      # ≡ app/page.tsx + layout.tsx
│   │   ├── overview/
│   │   │   └── overview.component.ts   # ≡ components/overview.tsx
│   │   ├── recent-transactions/
│   │   │   └── recent-transactions.component.ts  # ≡ components/recent-transactions.tsx
│   │   └── transaction-stats/
│   │       └── transaction-stats.component.ts    # ≡ components/transaction-stats.tsx
│   ├── goals/
│   │   ├── goal-form/
│   │   │   └── goal-form.component.ts  # ≡ src/components/dashboard/Goals/GoalForm.jsx
│   │   └── goals-list/
│   │       └── goals-list.component.ts # ≡ src/pages/GoalsPage.jsx + GoalsList.jsx
│   └── advisor/
│       └── advisor.component.ts        # ≡ app/advisor/page.tsx
│
└── shared/
    ├── components/
    │   ├── add-transaction/            # ≡ components/add-transaction-button.tsx
    │   ├── logout-button/              # ≡ components/common/LogoutButton.tsx
    │   ├── navbar/                     # Sidebar de navegación
    │   ├── theme-switcher/             # ≡ components/theme-switcher.tsx
    │   └── toast-container/            # ≡ components/ui/toaster.tsx
    └── pipes/
        └── currency.pipe.ts            # Formatea moneda (≡ Intl en utils.ts)
```

---

## 🔁 Tabla de equivalencias Next.js → Angular

| Next.js / React                    | Angular                                      |
|------------------------------------|----------------------------------------------|
| `middleware.ts`                    | `auth.guard.ts` + `guest.guard.ts`           |
| `lib/axios.ts` + `useFetchWithAuth`| `auth.interceptor.ts` + `HttpClient`         |
| `useState` / `useEffect`           | `signal()` + `OnInit`                        |
| `useCallback` / `useMemo`          | `computed()`                                 |
| `use-toast.ts`                     | `ToastService` con signals                   |
| `theme-provider.tsx`               | `ThemeService` con `effect()`                |
| `lib/export-pdf.ts`                | `ExportPdfService`                           |
| `src/api/goals.js`                 | `GoalService`                                |
| `lib/advisor.ts`                   | `AdvisorService`                             |
| `app/layout.tsx`                   | `NavbarComponent` (sidebar)                  |
| Props                              | `input()` signal                             |
| Callbacks / emit                   | `output()` signal                            |
| `next/navigation` → `useRouter`    | `Router` (inject)                            |
| Dynamic imports (`next/dynamic`)   | `loadComponent` en routes (lazy)             |

---

## 🚀 Instalación y uso

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
npm start
# → http://localhost:4200

# Build de producción
npm run build:prod
```

---

## ⚙️ Variables de entorno

Edita `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',  // ← URL de tu backend
};
```

---

## 🎨 Temas

El tema **light/dark** se controla automáticamente con `ThemeService`. El botón en el sidebar llama `toggleTheme()`. Para forzar un tema inicial, edita `localStorage.setItem('theme', 'dark')` en el navegador.

---

## 📦 Tecnologías

- **Angular 18** — Standalone components, Signals, Control Flow (`@if`, `@for`, `@switch`)
- **Angular Router** — Lazy loading con `loadComponent`
- **Angular HttpClient** — Con interceptor funcional
- **Reactive Forms** — Login, Register, transacciones, metas
- **SCSS** — Variables CSS para theming completo
- **TypeScript strict** — Tipado fuerte en todos los modelos
