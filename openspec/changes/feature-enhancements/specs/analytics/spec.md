# Analytics Specification

## Purpose

Define el comportamiento de visualización y exportación de datos del usuario, para facilitar el análisis y el seguimiento financiero.

## Requirements

### Requirement: Category Visual Charts

El sistema DEBE mostrar gráficos y barras de progreso comparando los gastos actuales frente a los límites de presupuesto de las categorías.

#### Scenario: Visualización de progreso

- GIVEN el usuario tiene al menos una categoría con límite asignado e ingresos/gastos registrados en el mes actual
- WHEN el usuario carga la vista del Dashboard
- THEN el sistema muestra una barra apilada o medidor (Recharts) indicando el monto gastado sobre el total del límite
- AND muestra un color distinto (ej. rojo) si el gasto excede el límite (100%+)

### Requirement: Export to Excel

El sistema DEBE permitir exportar el historial de transacciones a un formato de hoja de cálculo estándar (Excel - .xlsx).

#### Scenario: Exportar transacciones

- GIVEN el usuario está en la vista del historial de transacciones
- WHEN el usuario hace clic en el botón "Exportar a Excel"
- THEN el navegador descarga un archivo .xlsx que contiene las transacciones filtradas (o todas por defecto)
- AND cada fila representa una transacción con columnas: Fecha, Categoría, Monto, Tipo y Notas
