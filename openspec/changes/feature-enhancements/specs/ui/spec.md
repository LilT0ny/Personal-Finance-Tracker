# UI Specification

## Purpose

Define el comportamiento de la interfaz de usuario en relación con los temas visuales (modo oscuro/claro) y las adaptaciones responsivas de modales.

## Requirements

### Requirement: Dark Mode Toggle

El sistema DEBE permitir al usuario alternar entre un modo de color claro y oscuro, persistiendo su preferencia.

#### Scenario: Alternar y persistir tema

- GIVEN el usuario se encuentra en cualquier pantalla
- WHEN hace clic en el botón de alternar tema
- THEN la aplicación cambia inmediatamente los colores de su interfaz al tema opuesto
- AND la preferencia se guarda localmente (ej. localStorage) para futuras sesiones

#### Scenario: Preferencia del sistema

- GIVEN es la primera vez que el usuario ingresa
- WHEN la aplicación se carga
- THEN se DEBE aplicar el tema preferido del sistema operativo por defecto

### Requirement: Desktop Modal

El sistema DEBE mostrar el formulario de creación de registros (transacciones) en un modal centrado cuando la pantalla sea lo suficientemente ancha, y mantener el formato "bottom sheet" en móviles.

#### Scenario: Vista en escritorio

- GIVEN la ventana del navegador tiene un ancho mayor al breakpoint (ej. 768px)
- WHEN el usuario hace clic en el botón flotante "+"
- THEN se abre un modal centrado en la pantalla con el formulario

#### Scenario: Vista en móvil

- GIVEN la ventana del navegador tiene un ancho menor al breakpoint
- WHEN el usuario hace clic en el botón flotante "+"
- THEN el formulario se desliza desde la parte inferior de la pantalla (bottom sheet)
