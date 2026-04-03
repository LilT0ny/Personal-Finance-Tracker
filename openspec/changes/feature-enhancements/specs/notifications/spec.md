# Notifications Specification

## Purpose

Define el comportamiento de las notificaciones enviadas por correo electrónico para reportes periódicos al usuario.

## Requirements

### Requirement: Monthly Email Summary

El sistema DEBE generar y enviar un resumen financiero (ingresos, gastos, saldos y presupuestos excedidos) a cada usuario activo al cierre de mes.

#### Scenario: Envío mensual exitoso

- GIVEN es el primer día de un nuevo mes (ej. 1 de noviembre a las 00:00)
- WHEN se ejecuta el proceso programado (cron job/Edge function) en el backend (Supabase)
- THEN se calcula el total de ingresos, gastos y el balance del mes anterior para cada usuario
- AND se despacha un correo (vía Resend o similar) con la estructura del reporte

#### Scenario: Manejo de errores

- GIVEN ocurre un fallo temporal con el proveedor de correo electrónico o de red
- WHEN se está procesando el lote de usuarios
- THEN el sistema DEBE manejar el error registrándolo sin romper el ciclo para el resto de los usuarios
- AND DEBE evitar duplicar el envío para usuarios ya notificados en el mismo período (usando banderas en base de datos)
