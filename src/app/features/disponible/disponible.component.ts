import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";
import { AccountService, FinancialAccount } from "../../core/services/account.service";
import { PlannedExpenseService } from "../../core/services/planned-expense.service";
import { PlannedExpense } from "../../core/models";
import { NavbarComponent } from "../../shared/components/navbar/navbar.component";
import { addLocalDays, calculateAvailable, todayLocalISO } from "../../core/utils/disponible-calculator";

@Component({
  selector: "app-disponible",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent],
  templateUrl: "./disponible.component.html",
  styleUrls: ["./disponible.component.scss"]
})
export class DisponibleComponent implements OnInit {
  private readonly accountsApi = inject(AccountService);
  private readonly expensesApi = inject(PlannedExpenseService);
  readonly today = todayLocalISO();
  readonly loading = signal(true);
  readonly error = signal("");
  readonly accounts = signal<FinancialAccount[]>([]);
  readonly planned = signal<PlannedExpense[]>([]);
  nextPayday = addLocalDays(this.today, 15);
  reserve = 0;
  readonly cop = new Intl.NumberFormat("es-CO", {
    style: "currency",currency:"COP",maximumFractionDigits:0
  });

  readonly hasAccounts = computed(() =>
    this.accounts().some(a=>!a.archived && a.currency.toUpperCase()==="COP"));
  get report() {
    return calculateAvailable(this.accounts(),this.planned(),Number(this.reserve),this.nextPayday,this.today);
  }
  ngOnInit():void { this.refresh(); }
  refresh():void {
    this.error.set("");this.loading.set(true);
    forkJoin({accounts:this.accountsApi.list(),expenses:this.expensesApi.getAll()}).subscribe({
      next: result => {
        this.accounts.set(result.accounts);
        this.planned.set(result.expenses);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("No pudimos consultar tus cuentas y gastos planificados. Revisa tu conexión e inténtalo de nuevo.");
        this.loading.set(false);
      }
    });
  }
  format(value: number):string { return this.cop.format(value); }
  get reserveValid():boolean {
    return Number.isFinite(Number(this.reserve)) && Number(this.reserve)>=0 && Number(this.reserve)<=1e12;
  }
}
