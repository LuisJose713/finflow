# FinFlow Disponible · MVP web e iOS

- **Fuente:** API autenticada \`GET /accounts\` (saldos en COP no archivados) y \`GET /planned-expenses\` (pendientes, con fecha anterior al próximo ingreso; vencidos incluidos).
- **Fórmula:** saldos actuales − pagos pendientes − reserva voluntaria = disponible estimado. Importe diario = máximo(0, disponible) / días hasta el próximo ingreso, redondeado hacia abajo a centavos.
- **Sin escrituras:** el MVP es de solo lectura; el usuario proporciona fecha de su próximo ingreso y reserva de ahorro. No se almacenan en el servidor ni en localStorage.
- **No incluidos:** ingresos futuros, gastos recurrentes (podrían duplicar pagos planificados), pagos sin fecha, transacciones aún no registradas. Avisos explícitos; no afirmar solvencia bancaria.
- **Seguridad:** cálculo únicamente sobre respuestas de la API del usuario autenticado, no muestra cuentas ajenas; sin nuevas migraciones ni cambios de permisos; sin logs de importes.
- **Pruebas:** escenarios de centavos, obligaciones vencidas, estados completos, fechas, saldos archivados/otras monedas, disponible negativo. CI Angular debe aprobar \`tsc\` y \`build:prod\`.
- **Lanzamiento:** mantener en PR hasta confirmar estabilidad de la publicación web y backend a medianoche; mantener Beta Estudiante excluida.
