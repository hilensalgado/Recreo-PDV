# ETAPA 3 — Integridad de Datos y Persistencia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Stage 3 (Data Integrity & Persistence) of the Recreo-PDV remediation plan: enforcing strict atomic Firestore writes, soft delete for products and customers, debt customer deletion protection, and multi-register ticket collision prevention.

**Architecture:** Update `server/store.ts` persistence methods to return awaited Promises and handle batch transactions. Update `src/types/pos.ts` schemas to support `isDeleted?: boolean`. Implement backend validation in `server.ts` for customer debt and soft delete filtering across catalog and customer lookups.

**Tech Stack:** Node.js, Express, TypeScript, Firebase Firestore SDK (`setDoc`, `writeBatch`).

## Global Constraints

- Do not break existing functionality or API contracts.
- Maintain compatibility with frontend state and types.
- Ensure all sensitive and critical operations are protected in the backend.

---

### Task 1: Add `isDeleted?: boolean` to Product and Customer types

**Files:**
- Modify: `src/types/pos.ts:50-100`

**Interfaces:**
- Consumes: Existing `Product` and `Customer` interfaces.
- Produces: `isDeleted?: boolean` property on `Product` and `Customer`.

- [ ] **Step 1: Edit `src/types/pos.ts` to add `isDeleted?: boolean`**

Update `Product` and `Customer` interfaces in `src/types/pos.ts`:
```ts
export interface Product {
  id: string;
  barcode: string;
  name: string;
  // ... existing fields
  isDeleted?: boolean;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  // ... existing fields
  isDeleted?: boolean;
  updatedAt?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/pos.ts
git commit -m "feat(types): add isDeleted optional flag to Product and Customer interfaces"
```

---

### Task 2: Implement Debt Protection and Soft Delete for Customers

**Files:**
- Modify: `server/store.ts:1300-1400`
- Modify: `server.ts:400-500`

**Interfaces:**
- Consumes: `Customer`, `deleteCustomer(id: string)`
- Produces: Debt deletion protection error and soft delete flag `isDeleted: true`.

- [ ] **Step 1: Update `deleteCustomer` in `server/store.ts`**

```ts
  public async deleteCustomer(id: string): Promise<void> {
    const customer = this.data.customers.find(c => c.id === id);
    if (!customer) return;

    if (customer.creditBalance && customer.creditBalance > 0) {
      throw new Error(`No se puede eliminar un cliente con un saldo adeudado activo de $${customer.creditBalance.toFixed(2)}.`);
    }

    customer.isDeleted = true;
    customer.updatedAt = new Date().toISOString();

    this.logAudit({
      action: 'CUSTOMER_DELETED',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      entityName: customer.name,
      summary: `Baja lógica de cliente "${customer.name}"`,
      previousValue: { ...customer },
    });

    await this.persistDoc('customers', id, customer);
    this.emitSync('customers');
  }
```

- [ ] **Step 2: Update `getCustomers` in `server/store.ts` to filter active customers**

```ts
  public getCustomers(includeDeleted = false): Customer[] {
    if (includeDeleted) return this.data.customers;
    return this.data.customers.filter(c => !c.isDeleted);
  }
```

- [ ] **Step 3: Update `DELETE /api/customers/:id` route in `server.ts`**

```ts
app.delete('/api/customers/:id', async (req, res) => {
  try {
    await store.deleteCustomer(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    if (err.message && err.message.includes('saldo adeudado')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || 'Error al eliminar cliente' });
  }
});
```

- [ ] **Step 4: Commit**

```bash
git add server/store.ts server.ts
git commit -m "feat(store): enforce customer debt deletion protection and soft delete"
```

---

### Task 3: Implement Soft Delete for Products

**Files:**
- Modify: `server/store.ts:1170-1200`
- Modify: `server.ts:300-350`

**Interfaces:**
- Consumes: `Product`, `deleteProduct(id: string)`
- Produces: Soft delete `isDeleted: true` on product deletion.

- [ ] **Step 1: Update `deleteProduct` in `server/store.ts`**

```ts
  public async deleteProduct(id: string): Promise<void> {
    const prod = this.data.products.find(p => p.id === id);
    if (!prod) return;

    prod.isDeleted = true;
    prod.updatedAt = new Date().toISOString();

    this.logAudit({
      action: 'PRODUCT_DELETED',
      entityType: 'PRODUCT',
      entityId: prod.id,
      entityName: prod.name,
      summary: `Baja lógica de producto "${prod.name}" (${prod.barcode})`,
      previousValue: { ...prod },
    });

    await this.persistDoc('products', id, prod);
    this.emitSync('products');
  }
```

- [ ] **Step 2: Update `getProducts` in `server/store.ts` to filter active products**

```ts
  public getProducts(includeDeleted = false): Product[] {
    if (includeDeleted) return this.data.products;
    return this.data.products.filter(p => !p.isDeleted);
  }
```

- [ ] **Step 3: Update `DELETE /api/products/:id` route in `server.ts`**

```ts
app.delete('/api/products/:id', async (req, res) => {
  try {
    await store.deleteProduct(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al eliminar producto' });
  }
});
```

- [ ] **Step 4: Commit**

```bash
git add server/store.ts server.ts
git commit -m "feat(store): convert product deletion to soft delete"
```

---

### Task 4: Atomic Async Persistence and Error Handling in Backend

**Files:**
- Modify: `server/store.ts:725-745`
- Modify: `server.ts:200-600`

**Interfaces:**
- Consumes: `persistDoc`, `setDoc`
- Produces: `persistDoc` returning `Promise<void>`, HTTP 500 error responses on database persist errors.

- [ ] **Step 1: Update `persistDoc` in `server/store.ts` to be async and throw errors**

```ts
  private async persistDoc(collName: string, docId: string, data: any): Promise<void> {
    this.emitSync(collName, { docId, data });
    if (!this.firestore) return;
    try {
      const sanitized = this.sanitizeForFirestore(data);
      await setDoc(doc(this.firestore, collName, docId), sanitized, { merge: true });
    } catch (err) {
      console.error(`[Firebase] Error crítico al guardar documento ${collName}/${docId}:`, err);
      throw err;
    }
  }
```

- [ ] **Step 2: Wrap critical endpoints in `server.ts` with try/catch returning HTTP 500**

Ensure `POST /api/sales`, `POST /api/products/adjust-stock`, `POST /api/shifts/open`, `POST /api/shifts/close`, and `POST /api/cash-movements` properly catch errors from `store` and send `res.status(500).json({ error: err.message })`.

- [ ] **Step 3: Commit**

```bash
git add server/store.ts server.ts
git commit -m "fix(persistence): guarantee async firestore writes and error propagation"
```

---

### Task 5: Prevent Ticket Collisions with Register Prefixes

**Files:**
- Modify: `server/store.ts:2000-2200`

**Interfaces:**
- Consumes: `createSale` ticket format
- Produces: Unique formatted ticket numbers with register prefix (e.g. `REG1-1001`).

- [ ] **Step 1: Format ticket numbers in `createSale`**

In `createSale(saleData)` inside `server/store.ts`:
```ts
const regPrefix = register.id.toUpperCase().replace(/[^A-Z0-9]/g, '');
const formattedTicketNumber = `${regPrefix}-${this.data.ticketCounter++}`;
```

- [ ] **Step 2: Commit**

```bash
git add server/store.ts
git commit -m "feat(sales): add register prefix to ticket counter to prevent collisions"
```
