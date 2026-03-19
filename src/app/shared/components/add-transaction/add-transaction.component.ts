import { Component, inject, signal, output, OnInit } from "@angular/core";
import { FormBuilder, Validators, ReactiveFormsModule } from "@angular/forms";
import { TransactionService } from "../../../core/services/transaction.service";
import { CategoryService } from "../../../core/services/category.service";
import { ToastService } from "../../../core/services/toast.service";
import { CreateTransactionRequest, TransactionType, Category } from "../../../core/models";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-add-transaction",
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: "./add-transaction.component.html",
  styleUrls: ["./add-transaction.component.scss"],
})
export class AddTransactionComponent implements OnInit {
  private fb = inject(FormBuilder);
  private transactionService = inject(TransactionService);
  private categoryService = inject(CategoryService);
  private toast = inject(ToastService);

  isOpen = signal(false);
  loading = signal(false);

  allCategories = signal<Category[]>([]);
  filteredCategories = signal<Category[]>([]);

  created = output<void>();

  form = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    type: ["expense" as TransactionType, Validators.required],
    categoryId: [null as number | null, Validators.required],
    description: ["", [Validators.required, Validators.minLength(2)]],
    date: [new Date().toISOString().split("T")[0], Validators.required],
    currency: ["COP"],
    status: ["completed"],
  });

  get f() { return this.form.controls; }

  ngOnInit() {
    this.categoryService.getAll().subscribe({
      next: (cats) => {
        this.allCategories.set(cats);
        this.filterCategories("expense"); // por defecto
      }
    });

    // Filtrar categorías cuando cambia el tipo
    this.form.get("type")!.valueChanges.subscribe(type => {
      this.filterCategories(type!);
      this.form.patchValue({ categoryId: null }); // reset categoria
    });
  }

  filterCategories(type: string) {
    const mapped = type === "income" ? "Income" : "Expense";
    this.filteredCategories.set(
      this.allCategories().filter(c => c.type === mapped)
    );
  }

  open() { this.isOpen.set(true); }

  close() {
    this.isOpen.set(false);
    this.form.reset({
      type: "expense",
      categoryId: null,
      date: new Date().toISOString().split("T")[0],
      currency: "COP",
      status: "completed",
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const data = this.form.getRawValue() as CreateTransactionRequest;

    this.transactionService.create(data).subscribe({
      next: () => {
        this.toast.success("Transacción agregada");
        this.created.emit();
        this.close();
        this.loading.set(false);
      },
      error: () => {
        this.toast.error("Error al guardar");
        this.loading.set(false);
      },
    });
  }
}