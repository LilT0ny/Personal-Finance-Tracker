# Proposal: Mejoras de Funcionalidad y UI

## Intent
Mejorar la UX/UI añadiendo modo oscuro, una mejor interacción para agregar registros en escritorio (modal centrado), y otorgar más control al usuario (categorías personalizadas, límites de presupuesto). También incluir mejores herramientas de análisis y exportación (gráficos comparativos, exportación a Excel y resumen mensual por email).

## Scope

### In Scope
- Toggle de Modo Claro/Oscuro.
- Modal de escritorio centrado para agregar registros (en lugar de bottom sheet).
- ABM de Categorías Personalizadas.
- Límites de presupuesto (mensual/semanal) por categoría (ingresos y gastos).
- Gráficos visuales de progreso (gastado vs límite) usando Recharts.
- Exportación de transacciones a archivo Excel (`.xlsx`).
- Resumen mensual automático por correo electrónico.

### Out of Scope
- Sincronización automática con cuentas bancarias reales.
- Aplicación móvil nativa (se mantiene web responsiva).

## Approach
- **Modo Oscuro**: Tailwind CSS con `darkMode: 'class'` y persistencia en estado global.
- **Modal de Escritorio**: Modificar componente actual usando CSS media queries o condicional de React para un `Dialog` centrado en viewport ancho.
- **Categorías y Límites**: Crear tablas `categories` y `budgets` en Supabase asociadas al `user_id`.
- **Gráficos**: Integrar componentes de Recharts de barra apilada comparando gastos vs límites del mes en curso.
- **Exportación**: Implementar una utilidad front-end con `xlsx` (o similar) generando el archivo a partir del array de transacciones.
- **Resumen Mensual**: Configurar un cron-job o Edge Function en Supabase integrada con un proveedor como Resend para procesar saldos y enviar correos.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `tailwind.config.js` | Modificado | Activar modo oscuro. |
| `src/context/ThemeContext` | Nuevo | Proveer y persistir preferencia de tema. |
| `src/components/TransactionModal` | Modificado | Cambiar presentación según tamaño de pantalla. |
| `supabase-schema.sql` | Modificado | Adición de tablas `categories` y `budgets`. |
| `src/pages/Dashboard` | Modificado | Agregar barras de progreso y botón de Excel. |
| `src/utils/exportToExcel.ts` | Nuevo | Lógica de exportación. |
| `supabase/functions/monthly-summary/` | Nuevo | Edge Function para envío de emails. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Costos/Límites de envío de emails | Medium | Implementar flags en DB para evitar envíos dobles y usar tier gratuito de Resend. |
| Performance en Dashboard | Low | Memoizar cálculos de Recharts y cargar transacciones paginadas. |

## Rollback Plan
- Revertir cambios de frontend (commits UI, Modal y Theme).
- Las tablas nuevas en BD no rompen la funcionalidad actual, pueden mantenerse.
- Desactivar o pausar el cron job de Supabase Functions.

## Dependencies
- Librería `xlsx` (o `file-saver` + `exceljs`) para exportación en cliente.
- Resend (o SendGrid) para correos desde Supabase.

## Success Criteria
- [ ] Cambio de modo claro/oscuro persistido.
- [ ] Modal de registro centrado en pantallas de escritorio.
- [ ] Creación de categoría propia con límite de presupuesto exitosa.
- [ ] Dashboard muestra barra de progreso precisa comparando gasto con presupuesto.
- [ ] Exportación genera archivo Excel (.xlsx) válido con columnas correctas.
- [ ] Recepción de correo mensual con el resumen correcto de gastos e ingresos.
