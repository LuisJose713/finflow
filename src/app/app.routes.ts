import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";
import { guestGuard } from "./core/guards/guest.guard";

export const routes: Routes = [
  {
    path: "",
    redirectTo: "/login",
    pathMatch: "full",
  },
  {
    path: "login",
    loadComponent: () =>
      import("./features/auth/login/login.component").then(
        (m) => m.LoginComponent,
      ),
    canActivate: [guestGuard],
  },
  {
    path: "register",
    loadComponent: () =>
      import("./features/auth/register/register.component").then(
        (m) => m.RegisterComponent,
      ),
    canActivate: [guestGuard],
  },
  {
    path: "dashboard",
    loadComponent: () =>
      import("./features/dashboard/dashboard.component").then(
        (m) => m.DashboardComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: "goals",
    loadComponent: () =>
      import("./features/goals/goals-list/goals-list.component").then(
        (m) => m.GoalsListComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: "advisor",
    loadComponent: () =>
      import("./features/advisor/advisor.component").then(
        (m) => m.AdvisorComponent,
      ),
    canActivate: [authGuard],
  },
   {
    path:"transactions",
    loadComponent: () =>
      import("./features/transactions/transactions.component").then(
        (m) => m.TransactionsComponent,
      ),
    canActivate: [authGuard],

  },
   {
    path:"planned-expenses",
    loadComponent: () =>
      import("./features/planned-expenses/planned-expenses.component").then(
        (m) => m.PlannedExpensesComponent,
      ),
    canActivate: [authGuard],

  },
  {
    path: "categories",
    loadComponent: () => import("./features/categories/categories.component").then(m => m.CategoriesComponent),
    canActivate: [authGuard],
  },
  {
    path: "admin",
    loadComponent: () => import("./features/admin/admin.component").then(m => m.AdminComponent),
    canActivate: [authGuard],
  },
  {
    path: "**",
    redirectTo: "/login",
  },
 
];