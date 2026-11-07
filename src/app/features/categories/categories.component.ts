import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { CategoryService } from '../../core/services/category.service';
import { AuthService } from '../../core/services/auth.service';
import { Category } from '../../core/models';

type CategoryType = 'Income' | 'Expense';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss',
})
export class CategoriesComponent implements OnInit {
  private readonly categoriesApi = inject(CategoryService);
  readonly auth = inject(AuthService);

  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly editId = signal<number | null>(null);

  name = '';
  type: CategoryType = 'Expense';

  readonly mine = computed(() =>
    this.categories().filter(c => c.userId != null &&
      Number(c.userId) === Number(this.auth.currentUser()?.id))
  );
  readonly global = computed(() =>
    this.categories().filter(c => c.userId == null)
  );

  ngOnInit() { this.refresh(); }

  refresh() {
    this.loading.set(true);
    this.error.set('');
    this.categoriesApi.getAll().subscribe({
      next: categories => {
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar tus categorías. Inténtalo de nuevo.');
        this.loading.set(false);
      },
    });
  }

  startEdit(category: Category) {
    if (category.userId == null || Number(category.userId) !== Number(this.auth.currentUser()?.id)) return;
    this.editId.set(category.id);
    this.name = category.name;
    this.type = category.type === 'Income' ? 'Income' : 'Expense';
    this.error.set('');
    this.notice.set('');
  }

  reset() {
    this.editId.set(null);
    this.name = '';
    this.type = 'Expense';
  }

  save() {
    const name = this.name.trim();
    if (name.length < 2 || name.length > 80) {
      this.error.set('El nombre debe tener entre 2 y 80 caracteres.');
      return;
    }
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');
    const payload = { name, type: this.type };
    const id = this.editId();
    const operation = id == null
      ? this.categoriesApi.create(payload)
      : this.categoriesApi.update(id, payload);
    operation.subscribe({
      next: () => {
        this.saving.set(false);
        this.notice.set(id == null ? 'Categoría creada.' : 'Categoría actualizada.');
        this.reset();
        this.refresh();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(err.status === 409
          ? 'La categoría ya existe o está en uso.'
          : 'No fue posible guardar. Revisa los datos e inténtalo nuevamente.');
      },
    });
  }

  remove(category: Category) {
    if (category.userId == null || Number(category.userId) !== Number(this.auth.currentUser()?.id)) return;
    if (!window.confirm('¿Eliminar la categoría "' + category.name + '"? No se eliminarán tus movimientos.')) return;
    this.error.set('');
    this.notice.set('');
    this.categoriesApi.delete(category.id).subscribe({
      next: () => {
        this.notice.set('Categoría eliminada.');
        if (this.editId() === category.id) this.reset();
        this.refresh();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.status === 409
          ? 'No puedes eliminar una categoría con movimientos, presupuestos o gastos asociados.'
          : 'No pudimos eliminar la categoría.');
      },
    });
  }
}
