import { Injectable, computed, signal } from '@angular/core';

/** User-controlled steps. No tutorial performs API writes or triggers form submission. */
export interface GuideStep {
  selector: string;
  title: string;
  description: string;
  advanceOn: 'click' | 'change' | 'focusout' | 'manual';
}
interface GuideState { route: string; index: number; }
const GUIDES: Record<string, GuideStep[]> = {
  '/dashboard': [
    { selector: '.stat-card.balance', title: 'Tu balance, con claridad',
      description: 'Aquí se resume tu dinero. Pulsa Siguiente para conocer los gráficos.', advanceOn: 'manual' },
    { selector: '.trend-chart', title: 'Explora tus tendencias',
      description: 'Compara ingresos y gastos a través del tiempo.', advanceOn: 'manual' },
    { selector: 'app-recent-transactions', title: 'Consulta tus movimientos',
      description: 'Revisa el historial reciente para identificar hábitos.', advanceOn: 'manual' }
  ],
  '/accounts': [
    { selector: '#acc-name', title: 'Nombra tu billetera',
      description: 'Escribe un nombre fácil de reconocer y pasa al siguiente campo.', advanceOn: 'focusout' },
    { selector: '#acc-type', title: 'Selecciona el tipo',
      description: 'Elige el tipo de cuenta que vas a registrar.', advanceOn: 'change' },
    { selector: '#acc-initial', title: 'Saldo inicial',
      description: 'Escribe el saldo con el que comienza. Aún no guardaremos nada.', advanceOn: 'focusout' },
    { selector: 'button.account-primary', title: 'Revisa antes de crear',
      description: 'Pulsa Crear billetera solo si deseas guardar esta cuenta real.', advanceOn: 'manual' }
  ],
  '/budgets': [
    { selector: '#budget-category', title: 'Categoría del presupuesto',
      description: 'Selecciona qué categoría de gasto controlarás.', advanceOn: 'change' },
    { selector: '#budget-amount', title: 'Define tu límite',
      description: 'Introduce el importe máximo que planeas gastar al mes.', advanceOn: 'focusout' },
    { selector: 'button.budget-primary', title: 'Confirma tu presupuesto',
      description: 'Puedes crearlo cuando estés listo. La guía nunca guarda automáticamente.', advanceOn: 'manual' }
  ],
  '/goals': [
    { selector: '.btn-new', title: 'Pulsa Nueva meta',
      description: 'Abre el formulario para establecer un objetivo de ahorro.', advanceOn: 'click' },
    { selector: 'app-goal-form input[formControlName="title"]', title: 'Ponle nombre a tu meta',
      description: 'Por ejemplo: «Fondo de emergencia».', advanceOn: 'focusout' },
    { selector: 'app-goal-form input[formControlName="targetAmount"]', title: 'Indica cuánto ahorrarás',
      description: 'Escribe el valor total que quieres conseguir.', advanceOn: 'focusout' },
    { selector: 'app-goal-form .btn-submit', title: 'Revisa tu objetivo',
      description: 'Guarda la meta solamente si deseas registrarla.', advanceOn: 'manual' }
  ],
  '/planned-expenses': [
    { selector: '.page-header .btn-primary', title: 'Programa un gasto',
      description: 'Pulsa el botón para abrir el formulario de gastos planeados.', advanceOn: 'click' },
    { selector: '.modal input[formControlName="title"]', title: 'Describe el gasto',
      description: 'Escribe el concepto de este gasto futuro.', advanceOn: 'focusout' },
    { selector: '.modal input[formControlName="amount"]', title: 'Estima el valor',
      description: 'Indica el monto que esperas pagar.', advanceOn: 'focusout' },
    { selector: '.modal select[formControlName="categoryId"]', title: 'Elige su categoría',
      description: 'Asigna la categoría correspondiente.', advanceOn: 'change' },
    { selector: '.modal input[formControlName="dueDate"]', title: 'Fecha prevista',
      description: 'Indica cuándo esperas realizar el gasto.', advanceOn: 'change' },
    { selector: '.modal button[type="submit"]', title: 'Confirma cuando quieras',
      description: 'Guarda solo si revisaste los datos y deseas registrarlos.', advanceOn: 'manual' }
  ],
  '/recurring': [
    { selector: '#recurring-title', title: 'Nombra el movimiento recurrente',
      description: 'Ejemplo: salario o pago del arriendo.', advanceOn: 'focusout' },
    { selector: '#recurring-type', title: 'Ingreso o gasto',
      description: 'Elige qué tipo de movimiento se repite.', advanceOn: 'change' },
    { selector: '#recurring-amount', title: 'Importe del movimiento',
      description: 'Introduce cuánto se registra cada mes.', advanceOn: 'focusout' },
    { selector: '#recurring-category', title: 'Elige su categoría',
      description: 'Asigna la categoría del movimiento.', advanceOn: 'change' },
    { selector: '#recurring-day', title: 'Selecciona el día',
      description: 'Indica cuándo ocurre el movimiento recurrente.', advanceOn: 'focusout' },
    { selector: '.recurring-primary', title: 'Programa cuando estés listo',
      description: 'Revisa todo antes de pulsar Programar cada mes.', advanceOn: 'manual' }
  ],
  '/categories': [
    { selector: '#category-name', title: 'Crea tu propia categoría',
      description: 'Escribe un nombre para organizar mejor tus finanzas.', advanceOn: 'focusout' },
    { selector: '#category-type', title: 'Define si es ingreso o gasto',
      description: 'Selecciona el tipo correspondiente.', advanceOn: 'change' },
    { selector: 'button.primary-action', title: 'Guarda la categoría',
      description: 'Confirma solo si deseas agregarla a tu cuenta.', advanceOn: 'manual' }
  ],
  '/advisor': [
    { selector: '#finflow-advisor-input', title: 'Pregunta a FinFlow AI',
      description: 'Escribe una pregunta sobre tus finanzas y revisa que no incluyas información sensible.', advanceOn: 'focusout' },
    { selector: '.btn-send', title: 'Envía tu consulta',
      description: 'Pulsa enviar únicamente si estás de acuerdo con el contenido.', advanceOn: 'manual' }
  ],
  '/security': [
    { selector: '#change-password-title', title: 'Protege tu contraseña',
      description: 'Puedes cambiarla desde aquí. La guía jamás te pedirá contraseñas.', advanceOn: 'manual' },
    { selector: '#google-link-title', title: 'Vincula tu cuenta de Google',
      description: 'Primero vincula tu Google con la cuenta FinFlow existente para mantener tus datos.', advanceOn: 'manual' },
    { selector: '#session-control-title', title: 'Administra tus sesiones',
      description: 'Aquí puedes cerrar las sesiones activas de tus dispositivos.', advanceOn: 'manual' },
    { selector: '#delete-account-title', title: 'Control de tus datos',
      description: 'Aquí está la opción para solicitar la eliminación de tu cuenta.', advanceOn: 'manual' }
  ]
};

@Injectable({ providedIn: 'root' })
export class PageGuideService {
  readonly state = signal<GuideState | null>(null);
  readonly step = computed(() => {
    const s = this.state();
    return s ? GUIDES[s.route]?.[s.index] ?? null : null;
  });
  readonly index = computed(() => this.state()?.index ?? -1);
  readonly total = computed(() => {
    const s = this.state();
    return s ? GUIDES[s.route]?.length ?? 0 : 0;
  });
  has(route: string): boolean { return Boolean(GUIDES[route]?.length); }
  start(route: string): void {
    this.state.set(this.has(route) ? { route, index: 0 } : null);
  }
  next(): void {
    const state = this.state();
    if (!state) return;
    const next = state.index + 1;
    if (next >= this.total()) this.finish();
    else this.state.set({ ...state, index: next });
  }
  finish(): void { this.state.set(null); }

  /** Only real user events may advance a guide. No synthesized clicks. */
  handleInteraction(event: Event): void {
    const step = this.step();
    if (!step || step.advanceOn === 'manual' || step.advanceOn !== event.type) return;
    const target = event.target;
    if (!(target instanceof Element) || !target.closest(step.selector)) return;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      if (!target.value.trim()) return;
    }
    if (target instanceof HTMLSelectElement && !target.value) return;
    this.next();
  }
}
