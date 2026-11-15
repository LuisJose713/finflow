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
  templateUrl: './advisor.component.html',
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

