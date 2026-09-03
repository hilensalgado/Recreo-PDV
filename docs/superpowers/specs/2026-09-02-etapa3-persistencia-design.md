# Design Spec — ETAPA 3: Integridad de Datos y Persistencia

## Overview
Esta especificación detalla el diseño de arquitectura técnica para la **Etapa 3** del plan de remediación de Recreo-PDV: **Integridad de Datos y Persistencia**.

---

## 1. Persistencia Atómica y Propagación de Errores

### 1.1. Problema
Actualmente, las escrituras en Firestore se ejecutan de forma asíncrona ("fire-and-forget") dentro de `persistDoc()` en `server/store.ts`. Si la base de datos de Firestore en la nube falla (por tiempo de espera, cuotas o desconexión), la memoria local registra el éxito de la venta pero los datos no se persisten en la nube, perdiéndose ante un reinicio del servidor.

### 1.2. Solución propuesta
- Modificar `persistDoc` para retornar una `Promise<void>` y garantizar el `await` de `setDoc`.
- Implementar `persistBatch(operations)` en `server/store.ts` utilizando lotes atómicos de Firestore (`writeBatch`) o transacciones cuando múltiples documentos deban guardarse juntos (Venta + Stock + Turno + Puntos).
- En `server.ts`, envolver todas las rutas de escrituras críticas en bloques `try/catch` de forma que ante un fallo de persistencia, se responda un código de estado `HTTP 500 (Internal Server Error)` al cliente.

---

## 2. Concurrencia y Folios de Ticket Únicos Multi-Caja

### 2.1. Problema
Dos cajas realizando una venta en el mismo segundo o instancias concurrentes pueden obtener el mismo número correlativo `ticketCounter`, produciendo colisión de tickets.

### 2.2. Solución propuesta
- Incorporar el prefijo de la caja registradora en el identificador del ticket (ejemplo: `REG1-1001`, `REG2-1001`) o utilizar una transacción atómica `runTransaction` de Firestore para incrementar el contador de folios global.
- De esta manera, cada ticket es unívoco en el sistema contable y fiscal.

---

## 3. Bajas Lógicas (Soft Delete) y Protección de Deudores

### 3.1. Protección de Clientes con Saldo Deudor
- En `deleteCustomer(id: string)` en `server/store.ts`, se verificará si `customer.creditBalance > 0`.
- Si el cliente posee una deuda pendiente mayor a $0, el servidor rechazará la operación respondiendo un error `HTTP 400 Bad Request` con el mensaje: *"No se puede eliminar un cliente con un saldo adeudado activo de $X"*.

### 3.2. Soft Delete en Productos y Clientes
- Añadir la propiedad opcional `isDeleted?: boolean` a las interfaces `Product` y `Customer` en `src/types/pos.ts`.
- En `deleteProduct` y `deleteCustomer`, sustituir el borrado físico (`removeDoc`) por una actualización de estado:
  ```ts
  item.isDeleted = true;
  item.updatedAt = new Date().toISOString();
  await this.persistDoc(collectionName, item.id, item);
  ```
- En los métodos de lectura orientados a ventas e inventario activo (`getProducts`, `getCustomers`), filtrar únicamente los registros activos (`!item.isDeleted`).
- En reportes históricos y consulta de ventas pasadas, los productos y clientes eliminados seguirán estando disponibles para preservar la integridad referencial y el cálculo de ganancias históricas.

---

## 4. Plan de Verificación

1. **Prueba de protección de deuda**: Intentar eliminar un cliente con saldo `creditBalance = 500` y verificar respuesta `HTTP 400`.
2. **Prueba de Soft Delete**: Eliminar un producto sin stock y verificar que ya no aparece en el selector de ventas, pero sus ventas históricas conservan el nombre, categoría y costo original.
3. **Prueba de Persistencia en Error**: Simular falla de base de datos y verificar que la API responde error al frontend.
