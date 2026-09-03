# Design Spec — ETAPA 5: Inventario, Lotes, Persistencia de Carritos y UX

## Overview
Esta especificación detalla el diseño de arquitectura técnica para la **Etapa 5** del plan de remediación de Recreo-PDV: **Inventario, Lotes, Persistencia de Carritos y UX Operativa**.

---

## 1. Control Estricto de Caducidad de Lotes y Bloqueo de Venta

### 1.1. Estado Dinámico de Lotes
- En `server/store.ts` (`createSale` y consulta de lotes), filtrar y marcar de forma automática los lotes cuya fecha de expiración sea estrictamente menor a la fecha actual (`b.expirationDate < todayStr`) con `status = 'EXPIRED'`.

### 1.2. Bloqueo de Venta en Servidor
- En `createSale` en `server/store.ts`:
  - Para cualquier producto que posea lotes (`hasBatches = true` o lotes asociados en `batches`), si no existe ningún lote en estado `'ACTIVE'` con stock que no esté caducado (`expirationDate >= today`), rechazar la venta con un error `HTTP 400`:
    *"Bloqueo por Caducidad: No es posible vender "${product.name}". El lote activo (${batch.batchNumber}) se encuentra vencido desde el ${batch.expirationDate}. Se debe retirar el producto de góndola."*

### 1.3. Bloqueo Preventivo en Caja (Frontend)
- En `SalesView.tsx`, al escanear o seleccionar un producto con lotes vencidos o sin lotes vigentes suficientes, mostrar una alerta emergente de bloqueo impidiendo su adición al carrito.

---

## 2. Persistencia Reactiva de Carritos Activos (LocalStorage)

### 2.1. Rehidratación de Borradores Multiticket
- En `src/components/SalesView.tsx`:
  - Inicializar los estados `tickets` (arreglo de `DraftTicket`) y `activeTicketId` mediante lecturas sincrónicas de `localStorage` (`recreo_pdv_draft_tickets` y `recreo_pdv_active_ticket_id`).
  - Utilizar un `useEffect` reactivo que guarde automáticamente cualquier cambio en `tickets` y `activeTicketId` en `localStorage`.
- Al recargar la pantalla (F5), perder conexión o cerrar accidentalmente la ventana del navegador, los borradores de tickets en curso (ítemes, cantidades, descuentos y cliente seleccionado) se restaurarán intactos.
- Tras completar con éxito una venta en `CheckoutModal`, se limpia el carrito del ticket activo y se actualiza `localStorage`.

---

## 3. Ergonomía y Velocidad de Cobro para Cajeros (UX)

### 3.1. Escaneo Multiplicador (`N*CÓDIGO`)
- En el campo principal de búsqueda/escaneo de `SalesView.tsx` (`handleSearchSubmit` / `handleKeyDown`):
  - Interpretar patrones del tipo `3*779123456` o `2.5*779123456`.
  - Extraer la cantidad (`quantity = 3` o `2.5`) y el código/término de búsqueda (`779123456`).
  - Cargar directamente la cantidad multiplicada al carrito al presionar `Enter` o escanear.

### 3.2. Navegación Ágil por Teclado
- Soportar teclas `Flecha Arriba` / `Flecha Abajo` en la lista desplegable de resultados para desplazar la selección sin usar mouse, e integrar la tecla `Enter` para confirmación instantánea.

---

## 4. Plan de Verificación

1. **Prueba de Lote Vencido**: Intentar vender un producto cuyo único lote activo tenga fecha de vencimiento pasada $\rightarrow$ Verificar mensaje de bloqueo en pantalla y rechazo `HTTP 400` en backend.
2. **Prueba de Persistencia F5**: Cargar 3 productos y asignar un cliente en el Ticket 1 $\rightarrow$ Presionar `F5` $\rightarrow$ Verificar que el carrito y cliente permanecen intactos.
3. **Prueba de Escaneo Multiplicador**: Ingresar `5*779123456` y presionar `Enter` $\rightarrow$ Verificar que se agregan 5 unidades del producto al carrito.
