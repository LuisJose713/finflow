import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UiPreferencesService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly endpoint = environment.apiUrl + '/preferences/ui';
  private readonly hiddenCards = signal<string[]>([]);
  private readonly savingCards = signal<string[]>([]);
  private edited = new Map<string, boolean>();
  readonly canCustomize = computed(() => !!this.auth.currentUser());

  constructor() {
    effect(cleanup => {
      const userId = this.auth.currentUser()?.id;
      this.hiddenCards.set([]); this.savingCards.set([]); this.edited = new Map();
      if (!userId) return;
      const request = this.http.get<{ hiddenCards: string[] }>(this.endpoint).subscribe({
        next: value => {
          if (this.auth.currentUser()?.id !== userId) return;
          const hidden = new Set(value.hiddenCards);
          this.edited.forEach((hide, card) => hide ? hidden.add(card) : hidden.delete(card));
          this.hiddenCards.set([...hidden]);
        },
        error: () => { /* Defaults remain usable while offline. */ },
      });
      cleanup(() => request.unsubscribe());
    });
  }

  isHidden(card: string): boolean { return this.hiddenCards().includes(card); }
  isSaving(card: string): boolean { return this.savingCards().includes(card); }
  setHidden(card: string, hidden: boolean) {
    const userId = this.auth.currentUser()?.id;
    if (!userId || this.isSaving(card)) return;
    const previous = this.isHidden(card);
    const apply = (value: boolean) => {
      this.edited.set(card, value);
      this.hiddenCards.update(cards => value ? [...new Set([...cards, card])] : cards.filter(item => item !== card));
    };
    apply(hidden); this.savingCards.update(cards => [...cards, card]);
    this.http.put(this.endpoint + '/' + encodeURIComponent(card), { hidden }).pipe(
      finalize(() => { if (this.auth.currentUser()?.id === userId) this.savingCards.update(cards => cards.filter(item => item !== card)); }),
    ).subscribe({ error: () => {
      if (this.auth.currentUser()?.id !== userId) return;
      apply(previous); this.toast.error('No pudimos guardar esta preferencia. Vuelve a intentarlo.');
    } });
  }
}
