import {
  Component, inject, signal, OnInit,
  ElementRef, viewChild, AfterViewChecked,
  ChangeDetectionStrategy
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
    imports: [FormsModule, NavbarComponent, ToastContainerComponent, DatePipe],
    template: `
    <div class="app-shell">
      <app-navbar />

      <main class="main-content">
        <header class="page-header">
          <div>
            <h1>🤖 Asesor Financiero IA</h1>
            <p class="subtitle">Consulta sobre tus finanzas personales</p>
          </div>
          <button class="btn-clear" (click)="clearChat()" [disabled]="messages().length === 0">
            🗑 Limpiar chat
          </button>
        </header>

        <div class="chat-layout">
          <!-- Suggestion cards -->
          @if (messages().length === 0) {
            <div class="cards-grid">
              @if (cardsLoading()) {
                @for (i of [1, 2, 3, 4]; track i) {
                  <div class="advisor-card skeleton"></div>
                }
              } @else {
                @for (card of cards(); track card.id) {
                  <button class="advisor-card" (click)="sendPrompt(card.prompt)">
                    <span class="card-icon">{{ card.icon }}</span>
                    <div>
                      <strong>{{ card.title }}</strong>
                      <p>{{ card.description }}</p>
                    </div>
                  </button>
                }
              }
            </div>
          }

          <!-- Messages -->
          <div class="messages-wrapper" #messagesContainer>
            @for (msg of messages(); track $index) {
              <div class="message" [class]="msg.role">
                <div class="message-bubble">
                  <p>{{ msg.content }}</p>
                  <span class="msg-time">{{ msg.timestamp | date: 'HH:mm' }}</span>
                </div>
              </div>
            }

            @if (responding()) {
              <div class="message assistant">
                <div class="message-bubble typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            }
          </div>

          <!-- Input -->
          <div class="input-area">
            <textarea
              [(ngModel)]="userInput"
              placeholder="Escribe tu pregunta financiera..."
              rows="1"
              (keydown.enter)="onEnter($event)"
              [disabled]="responding()"
            ></textarea>
            <button
              class="btn-send"
              (click)="send()"
              [disabled]="!userInput.trim() || responding()"
            >
              {{ responding() ? '⏳' : '➤' }}
            </button>
          </div>
        </div>
      </main>

      <app-toast-container />
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './advisor.component.scss'
})
export class AdvisorComponent implements OnInit, AfterViewChecked {
  private advisorService = inject(AdvisorService);
  private toast = inject(ToastService);

  messages = signal<AdvisorMessage[]>([]);
  cards = signal<AdvisorCard[]>([]);
  cardsLoading = signal(true);
  responding = signal(false);
  userInput = '';

  messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  ngOnInit() {
    this.advisorService.getCards().subscribe({
      next: (data) => {
        this.cards.set(data);
        this.cardsLoading.set(false);
      },
      error: () => {
        this.cards.set(this.defaultCards());
        this.cardsLoading.set(false);
      },
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  sendPrompt(prompt: string) {
    this.userInput = prompt;
    this.send();
  }

  onEnter(event: Event) {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
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
    this.messages.set([]);
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
