# Design: Mejoras de Funcionalidad y UI

## Technical Approach

El enfoque principal consiste en mejorar la experiencia y funcionalidad del "Personal Finance Tracker" mediante agregados progresivos que no rompen el esquema base. Introduciremos un `ThemeContext` para manejar el estado del modo oscuro, aprovecharemos las utilidades de CSS/Tailwind para el modal adaptativo en escritorio, y ampliaremos el esquema de Supabase (`categories`, `budgets`) integrando esto mediante hooks en React. El análisis de datos se extenderá usando `recharts` en el dashboard y herramientas exportables (`xlsx`). Las notificaciones se apoyarán en las capacidades serverless de Supabase (Edge Functions + Cron).

## Architecture Decisions

### Decision: Manejo del Modo Oscuro

**Choice**: Usar un `ThemeContext` de React guardando la preferencia en `localStorage` y alternando la clase `dark` en el tag `<html>`.
**Alternatives considered**: Usar una librería externa como `next-themes`, o depender exclusivamente de `@media (prefers-color-scheme: dark)`.
**Rationale**: Al no ser un proyecto Next.js, `next-themes` no aplica directamente. Manejarlo con contexto propio es trivial, no añade peso al bundle y permite al usuario forzar un modo particular, superando el default del sistema operativo.

### Decision: Modal Adaptativo (Mobile vs Desktop)

**Choice**: Usar utilidades de CSS/Tailwind (ej. `md:max-w-md`, `md:mx-auto`, `md:rounded-lg`, etc.) sobre el componente existente `TransactionModal.tsx` para modificar su posicionamiento de `bottom-sheet` a `modal centrado`.
**Alternatives considered**: Crear dos componentes distintos (`BottomSheetTransaction.tsx` y `DesktopModalTransaction.tsx`) controlados por un hook `useMediaQuery`.
**Rationale**: Mantener un solo componente controlado puramente por CSS media queries vía Tailwind evita el re-renderizado de React y la duplicación de la lógica del formulario, manteniendo la UI reactiva de forma nativa.

### Decision: Categorías Personalizadas y Presupuestos

**Choice**: Crear tablas `categories` y `budgets` en Supabase con RLS (Row Level Security) ligadas al `user_id`. Modificar `useTransactions.ts` para que cruce la información, o crear un `useCategories.ts`.
**Alternatives considered**: Guardar todo en un campo JSONB dentro de una tabla de `user_settings`.
**Rationale**: Mantener un esquema relacional con tablas separadas facilita las consultas (joins) si a futuro se desea ver cuánto se gastó por categoría específica vía SQL. Además simplifica la validación estricta de límites.

### Decision: Exportación a Excel

**Choice**: Usar la librería `xlsx` (SheetJS) ejecutada enteramente en el cliente (Browser).
**Alternatives considered**: Generar el Excel en el backend (Supabase Edge Function) y devolver el link de descarga.
**Rationale**: Como la aplicación SPA (Single Page Application) ya tiene cargados los datos del usuario en memoria o puede solicitarlos mediante la API REST de Supabase, generarlo en el cliente ahorra cómputo y ancho de banda en el servidor, permitiendo una experiencia sin latencia de red adicional.

## Data Flow

    [ UI Components ] ───(hooks)───→ [ React Context / State ] ───(supabase-js)───→ [ Supabase BD ]
           │                                                                               │
           └─ Export a Excel (SheetJS)                                                     │
                                                                                           v
                                  [ Resend API ] ←───(Edge Function / Cron)──────── [ Supabase ]

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `tailwind.config.js` | Modify | Habilitar `darkMode: 'class'`. |
| `src/context/ThemeContext.tsx` | Create | Estado y persistencia del tema (dark/light). |
| `src/App.tsx` | Modify | Proveer ThemeContext, inyectar Toggle Button y Botón Excel. |
| `src/components/TransactionModal.tsx` | Modify | Añadir clases Tailwind para modo desktop (centrado, sin margen bottom) y soportar selección de nueva categoría. |
| `supabase-schema.sql` | Modify | DDL para `categories` (id, user_id, name, type, icon) y `budgets` (id, user_id, category_id, limit_amount). |
| `src/utils/export.ts` | Create | Lógica para usar `xlsx` y parsear el array de transacciones. |
| `src/components/BudgetProgress.tsx` | Create | Componente visual usando Recharts para barra de progreso de presupuesto. |
| `supabase/functions/monthly-summary/index.ts` | Create | Edge Function de Deno que consulta registros del mes, calcula totales e invoca la API de envío de correos. |

## Interfaces / Contracts

```typescript
// src/types/index.ts (Extensiones propuestas)
export interface Category {
  id: string; // Puede ser un UUID de Supabase ahora
  name: string;
  type: 'income' | 'expense';
  icon: string; // Nombre del icono lucide
  color?: string;
  user_id?: string; // Para categorías personalizadas
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  limit_amount: number;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Utilidad de Exportación | Validar que el parser devuelve el formato de array bi-dimensional correcto para `xlsx`. |
| Integration | Edge Function (Emails) | Usar entorno local de Supabase (`supabase functions serve`) simulando el cron y mockeando la respuesta de la API de correos. |
| E2E | Flujo de Límite Presupuestario | Crear categoría, definir límite, registrar gasto menor al límite, luego exceder el límite y verificar renderizado de alerta roja en UI. |

## Migration / Rollout

- **Migración BD**: Ejecutar en Supabase el nuevo schema para `categories` y `budgets`.
- **Pre-llenado (Seed)**: Migrar las categorías "hardcodeadas" del Frontend actual para que cada usuario existente las tenga en su DB, o manejarlas de forma híbrida (las predeterminadas sin `user_id` y las custom con `user_id`).
- **Configuración Edge Functions**: Desplegar `monthly-summary` usando Supabase CLI y setear el secret para la API key de correo.

## Open Questions

- [ ] ¿Cómo tratamos las transacciones anteriores si se borra una categoría personalizada? ¿Eliminación en cascada o "soft-delete"?
- [ ] ¿Los usuarios preferirán un límite "global" mensual o estrictamente por categoría? El alcance asume por categoría de gasto.
