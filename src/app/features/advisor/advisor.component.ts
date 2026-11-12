import {
  Component, DestroyRef, NgZone, effect, inject, signal,
  ElementRef, viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdvisorService } from '../../core/services/advisor.service';
import { ToastService } from '../../core/services/toast.service';
import { AdvisorMessage } from '../../core/models';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { ToastContainerComponent } from '../../shared/components/toast-container/toast-container.component';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-advisor',
  standalone: true,
  imports: [FormsModule, NavbarComponent, ToastContainerComponent, DatePipe],
  template: `
    <div class="app-shell">
      <app-navbar [showTransactionShortcut]="false" />

      <main class="main-content advisor-main">
        <section class="chat-layout" aria-label="Conversación con FinFlow AI">
          <header class="chat-topbar">
            <div class="assistant-identity">
              <img class="brand-avatar" src="/finflow-icon-classic.svg" width="42" height="42" alt="" aria-hidden="true" />
              <div class="identity-copy">
                <strong>FinFlow AI</strong>
                <small>Tu asistente financiero</small>
              </div>
            </div>
            <button class="btn-clear" type="button" (click)="clearChat()"
                    [disabled]="messages().length === 0 || responding()"
                    aria-label="Iniciar un chat nuevo" title="Nuevo chat">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
                   stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Nuevo chat</span>
            </button>
          </header>

          <div class="messages-wrapper" #messagesContainer role="log"
               aria-label="Mensajes de FinFlow AI" aria-live="polite" aria-relevant="additions">
            @if (messages().length === 0) {
              <div class="welcome-panel">
                <img class="welcome-mark" src="/finflow-icon-classic.svg" width="52" height="52"
                     alt="" aria-hidden="true" />
                <h1>¿En qué puedo ayudarte?</h1>
                <p>Pregunta lo que quieras sobre tus finanzas.</p>
              </div>
            } @else {
              @for (msg of messages(); track $index) {
                <div class="message" [class.user]="msg.role === 'user'"
                     [class.assistant]="msg.role === 'assistant'">
                  @if (msg.role === 'assistant') {
                    <img class="message-avatar" src="/finflow-icon-classic.svg"
                         width="32" height="32" alt="" aria-hidden="true" />
                  }
                  <div class="message-body">
                    <div class="message-bubble"><p>{{ msg.content }}</p></div>
                    <div class="message-meta">
                      <time>{{ msg.timestamp | date:'HH:mm' }}</time>
                      @if (msg.role === 'assistant') {
                        <button type="button" class="copy-btn" (click)="copyMessage(msg.content)"
                                aria-label="Copiar respuesta de FinFlow AI" title="Copiar respuesta">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                               stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
                               stroke-linejoin="round" aria-hidden="true">
                            <rect x="8" y="8" width="12" height="12" rx="2"></rect>
                            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path>
                          </svg>
                          Copiar
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }
              @if (responding()) {
                <div class="message assistant" role="status" aria-label="FinFlow está escribiendo">
                  <img class="message-avatar" src="/finflow-icon-classic.svg"
                       width="32" height="32" alt="" aria-hidden="true" />
                  <div class="message-body">
                    <div class="message-bubble typing" aria-hidden="true">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              }
            }
          </div>

          <div class="composer-shell">
            <label class="visually-hidden" for="finflow-advisor-input">Mensaje para FinFlow AI</label>
            <div class="input-area">
              <textarea id="finflow-advisor-input" [(ngModel)]="userInput"
                        placeholder="Escribe tu mensaje…"
                        rows="1" maxlength="2000"
                        (keydown.enter)="onEnter($event)" [disabled]="responding()"
                        aria-label="Escribe un mensaje para el asistente financiero"></textarea>
              <button class="btn-send" type="button" (click)="send()"
                      [disabled]="!userInput.trim() || responding()"
                      [attr.aria-label]="responding() ? 'Preparando respuesta' : 'Enviar mensaje'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
                     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M5 12 19 5l-4 14-3.4-6.6L5 12Z"></path>
                  <path d="m11.6 12.4 7.4-7.4"></path>
                </svg>
              </button>
            </div>
            <div class="composer-footer">
              <span>La IA puede equivocarse. Verifica la información importante.</span>
              @if (userInput.length > 1700) { <span class="message-limit">{{ userInput.length }}/2000</span> }
            </div>
          </div>
        </section>
      </main>

      <app-toast-container />
    </div>
  `,
  styleUrl: './advisor.component.scss',
})
export class AdvisorComponent {
  private advisorService = inject(AdvisorService);
  private toast = inject(ToastService);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private scrollFrame: number | null = null;

  messages = signal<AdvisorMessage[]>([]);
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

}

