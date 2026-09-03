# Design Spec — ETAPA 4: Cajas, Cajeros y Sesiones

## Overview
Esta especificación detalla el diseño de arquitectura técnica para la **Etapa 4** del plan de remediación de Recreo-PDV: **Cajas, Cajeros y Sesiones**.

---

## 1. Modelo Estricto de Sesiones y Bloqueos Backend

### 1.1. Reglas Negocio
- `1 CAJERO = 1 SESIÓN / TURNO ACTIVO`
- `1 CAJA = 1 SESIÓN / TURNO ACTIVO`

### 1.2. Validaciones en `openShift` (`server/store.ts`)
- **Validación de Caja**: Si `register.isOpen === true` o existe un turno en `shifts` con `registerId === register.id && status === 'OPEN'`, se rechaza la operación con `Error("La caja ya cuenta con un turno abierto activo.")`.
- **Validación de Cajero**: Si el cajero especificado `cashierId` ya posee un turno con `status === 'OPEN'` en **cualquier** registradora de la tienda, se rechaza la apertura con `Error("El usuario ya tiene una caja abierta activa. Debe realizar el cierre de caja antes de abrir una nueva.")`.
- **Validación por Dispositivo / Concurrencia**: Se mantiene el bloqueo por `deviceId` y `SESSION_TIMEOUT_MS` (35 segundos de heartbeat) en `verifyAndClaimCashier` y `verifyAndClaimRegister` para evitar sesiones duplicadas en distintas pestañas o navegadores.

---

## 2. Flujo de Cierre de Sesión Obligatorio

### 2.1. Secuencia Exigida
`Cerrar Caja` $\rightarrow$ `Realizar Arqueo` $\rightarrow$ `Cerrar Sesión (Logout)`

### 2.2. Rechazo Backend y Bloqueo Frontend
- En `releaseCashierSession(cashierId, deviceId, force)` en `server/store.ts`:
  - Si el cajero posee un turno `status === 'OPEN'` y no se pasa el parámetro `force === true` (reservado para administradores), la función arrojará un error `HTTP 400`: *"No es posible cerrar sesión: Tienes una caja abierta activa. Es obligatorio realizar el corte y cierre de caja antes de salir."*
- En `src/components/LogoutModal.tsx`:
  - Se consulta si el cajero activo posee un turno `OPEN`. De ser así, se deshabilita/oculta el botón de cierre directo de sesión y se muestra un aviso prominente con el botón *"Ir a Corte de Caja (SHIFT+F12)"*.

---

## 3. Resiliencia ante Recargas (F5) y Pérdida de Conexión

### 3.1. Estado de Sesión en Firestore / Memoria
- El estado de apertura del turno se almacena en el documento del turno (`shifts`), en el cajero (`cashiers.isLoggedIn`, `cashiers.activeRegisterId`) y en la caja registradora (`registers.isOpen`, `registers.activeShiftId`).
- Una recarga de pantalla (F5), cierre accidental de pestaña o desconexión temporal de internet no modifica el estado del turno abierto.
- Al reconectarse el cliente, la API de bootstrap (`/api/bootstrap`) rehidrata el estado identificando que la caja sigue abierta y el cajero activo.

---

## 4. Inmutabilidad del Cierre de Caja

### 4.1. Registro de Corte de Caja Sellado
- Al invocar `closeShift(shiftId, declaredCash, notes)`:
  - Se calcula `difference = declaredCash - expectedCash`.
  - Se marcan `closedAt = new Date().toISOString()` y `status = 'CLOSED'`.
  - Se liberan los candados del cajero y de la registradora.
- Una vez que un turno pasa a estado `'CLOSED'`, cualquier intento de modificar sus totales o alterar sus ventas históricas queda bloqueado en backend para garantizar la trazabilidad contable y auditoría.

---

## 5. Plan de Verificación

1. **Prueba de Doble Apertura por Cajero**: Intentar abrir la Caja 2 con un cajero que ya tiene la Caja 1 abierta $\rightarrow$ Verificar rechazo `HTTP 400`.
2. **Prueba de Doble Apertura en Caja**: Intentar abrir la Caja 1 con un segundo cajero mientras la Caja 1 está abierta $\rightarrow$ Verificar rechazo `HTTP 400`.
3. **Prueba de Cierre de Sesión con Turno Abierto**: Intentar hacer Logout con turno abierto $\rightarrow$ Verificar bloqueo en UI y rechazo backend.
4. **Prueba de Recarga F5**: Recargar pantalla con turno abierto $\rightarrow$ Verificar que la caja permanece abierta y el cajero logueado.
