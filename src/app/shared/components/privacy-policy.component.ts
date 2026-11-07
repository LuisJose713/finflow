import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { PrivacyPolicy } from '../../core/services/privacy.service';

@Component({
  selector:'app-privacy-policy',
  standalone:true,
  imports:[CommonModule],
  template:`
    <article class="privacy-doc">
      <h3>Política de tratamiento de datos personales</h3>
      <p>Versión: {{policy()?.version || 'Pendiente'}} · Fecha de entrada en vigor: {{policy()?.effectiveDate || 'Pendiente'}}</p>
      <section><h4>Responsable del tratamiento</h4>
        <p><strong>{{policy()?.controllerName || 'Pendiente de configurar'}}</strong></p>
        <p>Correo: {{policy()?.contactEmail || 'Pendiente'}} · Teléfono: {{policy()?.contactPhone || 'Pendiente'}} · Dirección: {{policy()?.contactAddress || 'Pendiente'}}</p>
      </section>
      <section><h4>Qué datos tratamos</h4>
        <p>Datos de cuenta (nombre, correo y credenciales protegidas), datos financieros que decides registrar, datos técnicos necesarios para mantener la seguridad, preferencias y constancias de autorización.</p>
      </section>
      <section><h4>Para qué los usamos</h4>
        <p>Autenticación, administración de cuentas, registro y consulta de tus finanzas, cálculo de metas, presupuestos, seguridad, soporte y cumplimiento de obligaciones legales. Las comunicaciones promocionales requieren tu autorización opcional.</p>
      </section>
      <section><h4>Proveedores y conservación</h4>
        <p>Para operar el servicio podemos usar proveedores de alojamiento, infraestructura y base de datos. Algunas operaciones podrían implicar tratamiento internacional de información y requieren evaluación legal y contractual. Conservaremos los datos solo mientras sean necesarios para las finalidades y obligaciones aplicables.</p>
      </section>
      <section><h4>Tus derechos</h4>
        <p>Puedes conocer, consultar, actualizar, rectificar y solicitar la supresión de tus datos, pedir prueba de la autorización y ejercer los demás derechos previstos en la Ley 1581 de 2012. Envía tu solicitud al correo del responsable.</p>
      </section>
      <section><h4>Tu decisión</h4>
        <p>La autorización necesaria para prestar FinFlow se solicita por separado de cualquier permiso comercial. Puedes rechazar el envío de publicidad sin perder acceso. Si no deseas aceptar el tratamiento necesario, puedes solicitar atención de tus derechos y no continuar usando las funciones financieras.</p>
      </section>
    </article>
  `,
  styles:[`
  .privacy-doc{display:grid;gap:.85rem;color:var(--text-primary,#17253d)}
  .privacy-doc h3{font-size:1.05rem}.privacy-doc h4{font-size:.88rem;margin-bottom:.2rem}
  .privacy-doc p{font-size:.8rem;line-height:1.6;color:var(--text-secondary,#52637a);overflow-wrap:anywhere}
  .privacy-doc section{border-bottom:1px solid var(--border,#e2e8f0);padding-bottom:.7rem}
  `]
})
export class PrivacyPolicyComponent {policy=input<PrivacyPolicy|null>(null);}
