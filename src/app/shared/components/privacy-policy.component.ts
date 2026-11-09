import { Component, input } from '@angular/core';
import { PrivacyPolicy } from '../../core/services/privacy.service';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  template: `
    <article class="policy-document">
      <h3>Política de tratamiento de datos personales</h3>
      <p><strong>Versión:</strong> {{ policy()?.version || 'Pendiente' }} ·
        <strong>Fecha:</strong> {{ policy()?.effectiveDate || 'Por definir' }}</p>
      @if (!policy()?.ready) {
        <p class="policy-warning" role="status">Documento informativo en revisión. Todavía no es una política legal publicada ni permite registrar consentimientos.</p>
      }
      <section>
        <h4>Identificación del responsable</h4>
        @if (policy()?.ready) {
          <p>{{ policy()?.controllerName }}</p>
          <p>Contacto: {{ policy()?.contactEmail }} · {{ policy()?.contactPhone }} · {{ policy()?.contactAddress }}</p>
        } @else {
          <p>Identificación, dirección y canales oficiales pendientes de validación.</p>
        }
      </section>
      <section>
        <h4>Datos utilizados y finalidades</h4>
        <p>FinFlow utiliza el nombre, correo, credenciales de acceso protegidas y los registros financieros que proporcionas (ingresos, gastos, categorías, cuentas, metas y presupuestos) para prestar el servicio, identificarte, elaborar estadísticas, proteger tu cuenta y responder solicitudes. Las comunicaciones promocionales requieren una decisión independiente y opcional.</p>
      </section>
      <section>
        <h4>Servicios de infraestructura</h4>
        <p>FinFlow utiliza infraestructura externa para la web, el backend y la base de datos. Los proveedores pueden implicar tratamiento o transferencias internacionales que deben evaluarse legalmente. No afirmamos cifrado de extremo a extremo de toda la base de datos.</p>
      </section>
      <section>
        <h4>Conservación y control</h4>
        <p>Los periodos de conservación y procedimientos definitivos serán establecidos en la política aprobada conforme a las finalidades y obligaciones aplicables. Puedes solicitar acceso, rectificación y, cuando corresponda, supresión o revocatoria.</p>
      </section>
      <section>
        <h4>Autorización independiente</h4>
        <p>La autorización necesaria para prestar FinFlow es distinta del permiso opcional para promociones. Si no deseas autorizar el tratamiento necesario, puedes dejar de usar el servicio y presentar una solicitud relativa a tus datos.</p>
      </section>
    </article>
  `,
  styles: [`
    .policy-document{display:grid;gap:.8rem;color:var(--text-primary,#152740);min-width:0}
    h3{font-size:1.14rem;line-height:1.3;margin:0}h4{font-size:.93rem;margin:0 0 .3rem}
    p{font-size:.81rem;line-height:1.7;color:var(--text-secondary,#53637a);margin:.25rem 0;overflow-wrap:anywhere}
    section{border-bottom:1px solid var(--border,#e3e8ef);padding:0 0 .7rem}
    .policy-warning{color:#895823;background:#fff6e7;padding:.75rem;border-radius:10px}
  `]
})
export class PrivacyPolicyComponent {
  policy = input<PrivacyPolicy | null>(null);
}
