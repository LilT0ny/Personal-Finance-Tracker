# Core Specification

## Purpose

Define el comportamiento central de presupuestos y categorías para permitir a los usuarios crear, editar y fijar límites personalizados.

## Requirements

### Requirement: Custom Categories

El sistema DEBE permitir a cada usuario definir sus propias categorías para ingresos y gastos, además de las opciones por defecto.

#### Scenario: Creación de categoría personalizada

- GIVEN un usuario autenticado
- WHEN crea una nueva categoría indicando nombre, tipo (ingreso/gasto) e ícono
- THEN la categoría se almacena en la base de datos asociada a su cuenta
- AND está disponible en el formulario de nuevas transacciones

### Requirement: Budget Limits

El sistema DEBE permitir configurar un presupuesto máximo (límite mensual) para categorías de gastos.

#### Scenario: Configuración de presupuesto

- GIVEN un usuario con categorías existentes
- WHEN asigna un valor límite a una categoría de gasto (ej. $500 para Comida)
- THEN ese valor se persiste en la configuración de la categoría
- AND se actualiza visualmente en las barras de progreso del dashboard

#### Scenario: Superación de límite

- GIVEN el usuario ha alcanzado el 100% o más de su límite asignado a "Comida"
- WHEN el usuario intenta agregar un gasto en esa categoría
- THEN el gasto se DEBE registrar normalmente, sin bloqueos
- AND el sistema DEBE mostrar alertas visuales en el dashboard indicando el exceso
