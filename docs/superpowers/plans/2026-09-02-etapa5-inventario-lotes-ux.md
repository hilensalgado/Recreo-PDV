# ETAPA 5 — Inventario, Lotes, Persistencia de Carritos y UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Stage 5 of the Recreo-PDV remediation plan: enforcing strict expired batch sales blocking, persisting active draft carts in `localStorage`, and adding `N*BARCODE` scanner multiplier support in `SalesView.tsx`.

**Architecture:** Update `server/store.ts` to validate batch expiration dates before deducting stock. Update `src/components/SalesView.tsx` to rehydrate and persist multi-ticket drafts in `localStorage`, add batch expiration alerts on scan, and parse multiplier quantities from search input.

**Tech Stack:** React, TypeScript, Node.js, Express, `localStorage`.

## Global Constraints

- Do not break existing functionality or API contracts.
- Maintain compatibility with frontend state and types.
- Ensure all sensitive and critical operations are protected in the backend.

---

### Task 1: Enforce Expired Batch Sales Blocking in Backend

**Files:**
- Modify: `server/store.ts:2015-2050`
- Modify: `server/store.ts:2200-2220`

**Interfaces:**
- Consumes: `ProductBatch`, `createSale`
- Produces: Strict batch expiration check preventing sales of expired product batches.

- [ ] **Step 1: Update batch validation in `createSale` in `server/store.ts`**

In `server/store.ts`, inside `createSale` item validation (Step 1):
```ts
const todayStr = new Date().toISOString().slice(0, 10);

// Check if product has batches and if any valid non-expired batch exists
if (product.hasBatches || (this.data.batches && this.data.batches.some(b => b.productId === product.id))) {
  const productBatches = (this.data.batches || []).filter(b => (b.productId === product.id || (b.barcode && b.barcode === product.barcode)) && b.currentQuantity > 0);
  const activeValidBatches = productBatches.filter(b => b.status === 'ACTIVE' && b.expirationDate >= todayStr);
  const expiredBatches = productBatches.filter(b => b.expirationDate < todayStr);

  if (activeValidBatches.length === 0 && expiredBatches.length > 0) {
    const expiredBatch = expiredBatches[0];
    throw new Error(`Bloqueo Sanitario / Caducidad: No se puede vender "${product.name}". El lote disponible (${expiredBatch.batchNumber}) venció el ${expiredBatch.expirationDate}. Retirar de góndola.`);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/store.ts
git commit -m "fix(store): block sale of products with expired active batches"
```

---

### Task 2: Reactively Persist Multi-Ticket Drafts in LocalStorage

**Files:**
- Modify: `src/components/SalesView.tsx:80-120`

**Interfaces:**
- Consumes: `DraftTicket` state in `SalesView.tsx`
- Produces: Synchronized `localStorage` persistence surviving F5 page reloads.

- [ ] **Step 1: Update `SalesView.tsx` state initialization and `useEffect`**

In `src/components/SalesView.tsx`:
```ts
const DRAFT_TICKETS_KEY = 'recreo_pdv_draft_tickets';
const DRAFT_ACTIVE_KEY = 'recreo_pdv_active_ticket_id';

const [tickets, setTickets] = useState<DraftTicket[]>(() => {
  try {
    const saved = localStorage.getItem(DRAFT_TICKETS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return [{ id: 't-1', name: 'Ticket 1', items: [] }];
});

const [activeTicketId, setActiveTicketId] = useState<string>(() => {
  try {
    const saved = localStorage.getItem(DRAFT_ACTIVE_KEY);
    if (saved) return saved;
  } catch {
    // ignore
  }
  return 't-1';
});

useEffect(() => {
  try {
    localStorage.setItem(DRAFT_TICKETS_KEY, JSON.stringify(tickets));
  } catch (err) {
    console.warn('Error guardando carritos en localStorage:', err);
  }
}, [tickets]);

useEffect(() => {
  try {
    localStorage.setItem(DRAFT_ACTIVE_KEY, activeTicketId);
  } catch (err) {
    console.warn('Error guardando ticket activo en localStorage:', err);
  }
}, [activeTicketId]);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SalesView.tsx
git commit -m "feat(sales): persist draft tickets reactively in localStorage"
```

---

### Task 3: Implement Scanner Multiplier `N*BARCODE` Support in SalesView

**Files:**
- Modify: `src/components/SalesView.tsx:150-250`

**Interfaces:**
- Consumes: Search input in `SalesView.tsx`
- Produces: Multiplication parser supporting `3*779123456` or `2.5*779123456`.

- [ ] **Step 1: Parse multiplier syntax in `handleSearchSubmit` in `SalesView.tsx`**

In `src/components/SalesView.tsx`:
```ts
const handleSearchSubmit = (e?: React.FormEvent) => {
  if (e) e.preventDefault();
  const trimmed = searchQuery.trim();
  if (!trimmed) return;

  let multiplier = 1;
  let codeToSearch = trimmed;

  if (trimmed.includes('*')) {
    const parts = trimmed.split('*');
    if (parts.length === 2) {
      const parsedQty = parseFloat(parts[0]);
      if (!isNaN(parsedQty) && parsedQty > 0) {
        multiplier = parsedQty;
        codeToSearch = parts[1].trim();
      }
    }
  }

  const exactMatch = products.find(p => p.barcode === codeToSearch || p.name.toLowerCase() === codeToSearch.toLowerCase());
  if (exactMatch) {
    handleAddToCart(exactMatch, multiplier);
    setSearchQuery('');
    setShowDropdown(false);
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SalesView.tsx
git commit -m "feat(sales): add N*BARCODE scanner multiplier support in SalesView"
```
