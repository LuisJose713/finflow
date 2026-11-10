import {
  Component, DestroyRef, NgZone, effect, inject, signal, OnInit,
  ElementRef, viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdvisorService } from '../../core/services/advisor.service';
import { ToastService } from '../../core/services/toast.service';
import { AdvisorMessage, AdvisorCard } from '../../core/models';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { ToastContainerComponent } from '../../shared/components/toast-container/toast-container.component';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-advisor',
  standalone: true,
  imports: [FormsModule, NavbarComponent, ToastContainerComponent, DatePipe],
  template: `
    <div class="app-shell">
      <app-navbar />

      <main class="main-content advisor-main">
        <div class="advisor-topline">
          <span class="live-dot" aria-hidden="true"></span> FINFLOW
          <span class="topline-version">ASESOR IA</span>
        </div>
        <header class="page-header advisor-header">
          <div class="heading-copy">
            <span class="eyebrow">TU ESPACIO FINANCIERO</span>
            <h1>Una visión clara. <span class="heading-accent">Mejores decisiones.</span></h1>
            <p class="subtitle">Explora tus finanzas con el asesor de FinFlow.</p>
            <button class="btn-clear" type="button" (click)="clearChat()"
                    [disabled]="messages().length === 0 || responding()"
                    aria-label="Comenzar una conversación nueva">
              <span aria-hidden="true">↻</span> Nueva conversación
            </button>
          </div>
          <img class="hero-symbol" src="/finflow-icon-classic.svg" width="96" height="96"
               alt="" aria-hidden="true" />
        </header>

        <section class="chat-layout" aria-label="Conversación con el asesor financiero">
          <div class="chat-topbar">
            <span class="assistant-identity">
              <img class="brand-avatar" src="/finflow-icon-classic.svg" width="44" height="44" alt="" aria-hidden="true" />
              <span class="identity-copy"><strong>FinFlow AI</strong><small>Asistente de finanzas personales</small></span>
            </span>
            <span class="conversation-status" aria-label="Conversación actual">
              <span class="status-dot" aria-hidden="true"></span> Esta conversación
            </span>
          </div>

          <div class="messages-wrapper" #messagesContainer role="log" aria-label="Mensajes de la conversación" aria-live="polite" aria-relevant="additions">
            @if (messages().length === 0) {
              <div class="welcome-panel">
                <img class="welcome-mark" src="/finflow-icon-classic.svg" width="58" height="58" alt="" aria-hidden="true" />
                <span class="welcome-eyebrow">TU PRÓXIMA BUENA DECISIÓN EMPIEZA AQUÍ</span>
                <h2>¿Qué te gustaría <em>explorar hoy?</em></h2>
                <p>Desde organizar tus gastos hasta planear una meta: empieza con una pregunta o elige una idea.</p>
              </div>
              <div class="suggestions-heading">
                <span>PRUEBA CON UNA DE ESTAS IDEAS</span>
              </div>
              <div class="cards-grid">
                @if (cardsLoading()) {
                  @for (i of [1, 2, 3, 4]; track i) {
                    <div class="advisor-card skeleton" aria-hidden="true"></div>
                  }
                } @else {
                  @for (card of cards(); track card.id) {
                    <button class="advisor-card" type="button"
                            (click)="sendPrompt(card.prompt)" [disabled]="responding()">
                      <span class="card-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M4 17l6-6 4 4 6-8"/>
                          <path d="M16 7h4v4"/>
                          <path d="M4 21h16"/>
                        </svg>
                      </span>
                      <span class="card-copy"><strong>{{ card.title }}</strong><small>{{ card.description }}</small></span>
                      <span class="card-arrow" aria-hidden="true">↗</span>
                    </button>
                  }
                }
              </div>
            } @else {
              <div class="conversation-label">CONVERSACIÓN ACTUAL</div>
              @for (msg of messages(); track $index) {
                <div class="message" [class.user]="msg.role === 'user'"
                     [class.assistant]="msg.role === 'assistant'">
                  @if (msg.role === 'assistant') {
                    <img class="message-avatar" src="/finflow-icon-classic.svg" width="33" height="33" alt="" aria-hidden="true" />
                  }
                  <div class="message-body">
                    <div class="message-author">{{ msg.role === 'assistant' ? 'FinFlow AI' : 'Tú' }}</div>
                    <div class="message-bubble">
                      <p>{{ msg.content }}</p>
                    </div>
                    <div class="message-meta">
                      <time>{{ msg.timestamp | date: 'HH:mm' }}</time>
                      @if (msg.role === 'assistant') {
                        <button type="button" class="copy-btn" (click)="copyMessage(msg.content)"
                                aria-label="Copiar respuesta del asesor" title="Copiar respuesta">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
                               aria-hidden="true">
                            <rect x="8" y="8" width="12" height="12" rx="2"></rect>
                            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path>
                          </svg> Copiar
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }

              @if (responding()) {
                <div class="message assistant" role="status" aria-label="FinFlow está preparando una respuesta">
                  <img class="message-avatar" src="/finflow-icon-classic.svg" width="33" height="33" alt="" aria-hidden="true" />
                  <div class="message-body">
                    <div class="message-author">FinFlow AI</div>
                    <div class="message-bubble typing"><span></span><span></span><span></span></div>
                  </div>
                </div>
              }
            }
          </div>

          <div class="composer-shell">
            <label for="finflow-advisor-input" class="composer-label">ESCRIBE TU PREGUNTA</label>
            <div class="input-area">
              <textarea
                id="finflow-advisor-input"
                [(ngModel)]="userInput"
                placeholder="¿Cómo puedo organizar mejor mi presupuesto?"
                rows="2"
                maxlength="2000"
                (keydown.enter)="onEnter($event)"
                [disabled]="responding()"
                aria-label="Pregunta para el asesor financiero"
              ></textarea>
              <button class="btn-send" type="button"
                      (click)="send()"
                      [disabled]="!userInput.trim() || responding()"
                      [attr.aria-label]="responding() ? 'Preparando respuesta' : 'Enviar pregunta'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
                     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="m5 12 14-7-4 14-3.4-6.6L5 12Z"></path>
                  <path d="m11.6 12.4 7.4-7.4"></path>
                </svg>
              </button>
            </div>
            <div class="composer-footer">
              <span>Enter para enviar · Shift + Enter para nueva línea</span>
              <span>{{ userInput.length }}/2000</span>
            </div>
            <p class="ai-disclaimer">Las sugerencias de IA son orientativas; verifica la información antes de tomar decisiones financieras.</p>
          </div>
        </section>
      </main>

      <app-toast-container />
    </div>
  `,
  styleUrl: './advisor.component.scss',
})
export class AdvisorComponent implements OnInit {
  private advisorService = inject(AdvisorService);
  private toast = inject(ToastService);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private scrollFrame: number | null = null;

  messages = signal<AdvisorMessage[]>([]);
  cards = signal<AdvisorCard[]>([]);
  cardsLoading = signal(true);
  responding = signal(false);
  userInput = '';

  messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.scrollFrame !== null) cancelAnimationFrame(this.scrollFrame);
    });
    // Scroll only when the chat content changes; scrolling on every Angular
    // change detection forced needless layout during menu transitions.
    effect(() => {
      this.messages();
      this.responding();
      this.scheduleScrollToBottom();
    });
  }

  private scheduleScrollToBottom() {
    if (this.scrollFrame !== null) cancelAnimationFrame(this.scrollFrame);
    this.zone.runOutsideAngular(() => {
      this.scrollFrame = requestAnimationFrame(() => {
        this.scrollFrame = null;
        this.scrollToBottom();
      });
    });
  }

  ngOnInit() {
    this.advisorService.getCards().subscribe({
      next: (data) => {
        this.cards.set(data.length ? data : this.defaultCards());
        this.cardsLoading.set(false);
      },
      error: () => {
        this.cards.set(this.defaultCards());
        this.cardsLoading.set(false);
      },
    });
  }

  sendPrompt(prompt: string) {
    this.userInput = prompt;
    this.send();
  }

  onEnter(event: Event) {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey && !ke.isComposing) {
      ke.preventDefault();
      this.send();
    }
  }

  send() {
    const content = this.userInput.trim();
    if (!content || this.responding()) return;

    const userMsg: AdvisorMessage = {
      role: 'user',
      content,
      timestamp: new Date(),
    };

    this.messages.update((m) => [...m, userMsg]);
    this.userInput = '';
    this.responding.set(true);

    const payload = this.messages().map((m) => ({
      role: m.role,
      content: m.content,
    }));

    this.advisorService.sendMessage(payload).subscribe({
      next: (res) => {
        this.messages.update((m) => [
          ...m,
          { role: 'assistant', content: res.response, timestamp: new Date() },
        ]);
        this.responding.set(false);
      },
      error: () => {
        this.toast.error('Error al contactar al asesor');
        this.responding.set(false);
      },
    });
  }

  clearChat() {
    if (this.responding()) return;
    this.messages.set([]);
  }

  async copyMessage(content: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(content);
      this.toast.success('Respuesta copiada');
    } catch {
      this.toast.error('No se pudo copiar la respuesta');
    }
  }

  private scrollToBottom() {
    const el = this.messagesContainer()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  private defaultCards(): AdvisorCard[] {
    return [
      { id: '1', icon: '📊', title: 'Analizar gastos', description: '¿En qué estoy gastando más?', prompt: 'Analiza mis gastos principales y dime en qué categorías gasto más.' },
      { id: '2', icon: '💰', title: 'Consejos de ahorro', description: 'Estrategias para ahorrar más', prompt: '¿Qué estrategias me recomiendas para ahorrar más dinero cada mes?' },
      { id: '3', icon: '🎯', title: 'Revisar metas', description: 'Estado de mis objetivos', prompt: 'Revisa mis metas financieras y dime si voy por buen camino.' },
      { id: '4', icon: '📈', title: 'Inversiones', description: 'Ideas para hacer crecer tu dinero', prompt: '¿Qué opciones de inversión básicas me recomiendas para comenzar?' },
    ];
  }
}
