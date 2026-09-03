import {
  Product,
  Department,
  Customer,
  CustomerCreditMovement,
  Sale,
  SaleReturn,
  CashRegister,
  CashShift,
  CashMovement,
  Cashier,
  HoldTicket,
  CommonProduct,
  PosSummaryStats,
  KeyboardShortcutConfig,
  EmployeeDiscountConfig,
  Promotion,
  PromotionItem,
  Supplier,
  PurchaseInvoice,
  SupplierPayment,
  FiscalInvoice,
  StoreFiscalConfig,
  AuditLog,
  AuditActionType,
  ProductBatch,
  Warehouse,
  StockTransfer,
  LoyaltyProgramConfig,
  CustomerPointsMovement,
  PaymentMethod,
} from '../types/pos';

let sessionToken: string | null = null;

export const setApiAuthToken = (token: string | null) => {
  sessionToken = token;
  try {
    if (token) {
      localStorage.setItem('recreo_auth_token', token);
    } else {
      localStorage.removeItem('recreo_auth_token');
    }
  } catch {
    // localStorage unavailable
  }
};

export const getApiAuthToken = (): string | null => {
  if (!sessionToken) {
    try {
      sessionToken = localStorage.getItem('recreo_auth_token');
    } catch {
      // localStorage unavailable
    }
  }
  return sessionToken;
};

async function fetchJson<T>(url: string, options?: RequestInit, retries: number = 2): Promise<T> {
  const token = getApiAuthToken();
  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
    authHeaders['x-session-token'] = token;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options?.headers || {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    if (!res.ok) {
      let errorMsg = res.statusText || 'Error en la solicitud al servidor';
      try {
        const errorJson = JSON.parse(text);
        if (errorJson.error) errorMsg = errorJson.error;
      } catch {
        // Not JSON error body
      }
      throw new Error(errorMsg);
    }

    if (!contentType.includes('application/json') && text.trim().startsWith('<')) {
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 400));
        return fetchJson<T>(url, options, retries - 1);
      }
      throw new Error('El servidor está inicializando o respondiendo con formato no válido.');
    }

    return JSON.parse(text) as T;
  } catch (err: any) {
    if (retries > 0 && err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
      await new Promise((r) => setTimeout(r, 400));
      return fetchJson<T>(url, options, retries - 1);
    }
    throw err;
  }
}

export const api = {
  // Fast Full Bootstrap Payload
  getBootstrap: () =>
    fetchJson<{
      products: Product[];
      departments: Department[];
      customers: Customer[];
      customerMovements: CustomerCreditMovement[];
      sales: Sale[];
      returns: SaleReturn[];
      registers: CashRegister[];
      shifts: CashShift[];
      cashMovements: CashMovement[];
      cashiers: Cashier[];
      holdTickets: HoldTicket[];
      commonProducts: CommonProduct[];
      shortcutsConfig: KeyboardShortcutConfig[];
      employeeDiscountConfig: EmployeeDiscountConfig;
      promotions: Promotion[];
      suppliers: Supplier[];
      purchases: PurchaseInvoice[];
      supplierPayments: SupplierPayment[];
      fiscalInvoices: FiscalInvoice[];
      storeFiscalConfig: StoreFiscalConfig;
      batches: ProductBatch[];
      warehouses: Warehouse[];
      stockTransfers: StockTransfer[];
      loyaltyConfig: LoyaltyProgramConfig;
    }>('/api/bootstrap'),

  // Products
  getProducts: () => fetchJson<Product[]>('/api/products'),
  saveProduct: (prod: Partial<Product> & { barcode: string; name: string }) =>
    fetchJson<Product>('/api/products', { method: 'POST', body: JSON.stringify(prod) }),
  importProducts: (items: any[]) =>
    fetchJson<{ count: number; created: number; updated: number }>('/api/products/import', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  deleteProduct: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/products/${id}`, { method: 'DELETE' }),
  adjustStock: (productId: string, delta: number, reason: string) =>
    fetchJson<Product>('/api/products/adjust-stock', {
      method: 'POST',
      body: JSON.stringify({ productId, delta, reason }),
    }),

  // Promotions
  getPromotions: () => fetchJson<Promotion[]>('/api/promotions'),
  savePromotion: (promo: Partial<Promotion> & { code: string; name: string }) =>
    fetchJson<Promotion>('/api/promotions', { method: 'POST', body: JSON.stringify(promo) }),
  deletePromotion: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/promotions/${id}`, { method: 'DELETE' }),
  togglePromotionStatus: (id: string) =>
    fetchJson<Promotion>(`/api/promotions/${id}/toggle`, { method: 'POST' }),

  // Departments
  getDepartments: () => fetchJson<Department[]>('/api/departments'),
  saveDepartment: (dept: Partial<Department> & { name: string }) =>
    fetchJson<Department>('/api/departments', { method: 'POST', body: JSON.stringify(dept) }),
  deleteDepartment: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/departments/${id}`, { method: 'DELETE' }),

  // Cash Registers
  getRegisters: () => fetchJson<CashRegister[]>('/api/registers'),
  saveRegister: (reg: Partial<CashRegister> & { name: string }) =>
    fetchJson<CashRegister>('/api/registers', { method: 'POST', body: JSON.stringify(reg) }),
  deleteRegister: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/registers/${id}`, { method: 'DELETE' }),
  forceCloseRegisterShift: (registerId: string) =>
    fetchJson<{ success: boolean; shift?: CashShift }>('/api/registers/' + registerId + '/force-close', { method: 'POST' }),

  // Shifts & Concurrency
  getShifts: () => fetchJson<CashShift[]>('/api/shifts'),
  openShift: (registerId: string, cashierId: string, initialCash: number, deviceId?: string) =>
    fetchJson<CashShift>('/api/shifts/open', {
      method: 'POST',
      body: JSON.stringify({ registerId, cashierId, initialCash, deviceId }),
    }),
  closeShift: (shiftId: string, declaredCash: number, notes?: string, deviceId?: string) =>
    fetchJson<CashShift>('/api/shifts/close', {
      method: 'POST',
      body: JSON.stringify({ shiftId, declaredCash, notes, deviceId }),
    }),
  deleteShift: (id: string) =>
    fetchJson<{ success: boolean; deletedId: string }>(`/api/shifts/${id}`, {
      method: 'DELETE',
    }),
  deleteShiftsBatch: (shiftIds: string[]) =>
    fetchJson<{ success: boolean; count: number }>('/api/shifts/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ shiftIds }),
    }),

  claimCashierSession: (cashierId: string, deviceId: string, registerId?: string, force: boolean = false) =>
    fetchJson<Cashier>('/api/sessions/cashier/claim', {
      method: 'POST',
      body: JSON.stringify({ cashierId, deviceId, registerId, force }),
    }),
  releaseCashierSession: (cashierId: string, deviceId?: string, force: boolean = false) =>
    fetchJson<{ success: boolean }>('/api/sessions/cashier/release', {
      method: 'POST',
      body: JSON.stringify({ cashierId, deviceId, force }),
    }),
  claimRegisterSession: (registerId: string, deviceId: string, cashierId?: string, force: boolean = false) =>
    fetchJson<CashRegister>('/api/sessions/register/claim', {
      method: 'POST',
      body: JSON.stringify({ registerId, deviceId, cashierId, force }),
    }),
  releaseRegisterSession: (registerId: string, deviceId?: string, force: boolean = false) =>
    fetchJson<{ success: boolean }>('/api/sessions/register/release', {
      method: 'POST',
      body: JSON.stringify({ registerId, deviceId, force }),
    }),
  sendHeartbeat: (data: { deviceId: string; cashierId?: string; registerId?: string }) =>
    fetchJson<{ success: boolean; cashierValid: boolean; registerValid: boolean }>('/api/sessions/heartbeat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  forceUnlockSession: (type: 'cashier' | 'register' | 'all', id?: string) =>
    fetchJson<{ success: boolean }>('/api/sessions/force-unlock', {
      method: 'POST',
      body: JSON.stringify({ type, id: id || '' }),
    }),

  // Cash Movements
  getCashMovements: () => fetchJson<CashMovement[]>('/api/cash-movements'),
  addCashMovement: (data: {
    registerId: string;
    shiftId: string;
    cashierId: string;
    cashierName: string;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    concept: string;
  }) => fetchJson<CashMovement>('/api/cash-movements', { method: 'POST', body: JSON.stringify(data) }),

  // Customers & Credit
  getCustomers: () => fetchJson<Customer[]>('/api/customers'),
  saveCustomer: (cust: Partial<Customer> & { name: string }) =>
    fetchJson<Customer>('/api/customers', { method: 'POST', body: JSON.stringify(cust) }),
  deleteCustomer: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/customers/${id}`, { method: 'DELETE' }),
  getCustomerMovements: () => fetchJson<CustomerCreditMovement[]>('/api/customers/movements'),
  addCustomerPayment: (data: {
    customerId: string;
    amount: number;
    cashierId: string;
    cashierName: string;
    registerId: string;
  }) => fetchJson<CustomerCreditMovement>('/api/customers/payment', { method: 'POST', body: JSON.stringify(data) }),

  // Sales
  getSales: () => fetchJson<Sale[]>('/api/sales'),
  createSale: (data: {
    registerId: string;
    shiftId: string;
    cashierId: string;
    cashierName: string;
    customerId?: string;
    items: {
      productId: string;
      quantity: number;
      unitPrice: number;
      discountPercentage?: number;
      isPromotion?: boolean;
      promotionId?: string;
      promotionCode?: string;
      promotionItems?: PromotionItem[];
    }[];
    paymentMethod: PaymentMethod;
    cashPaid: number;
    cardPaid: number;
    clientTransactionId?: string;
    pointsRedeemed?: number;
    pointsDiscountAmount?: number;
  }) => fetchJson<Sale>('/api/sales', { method: 'POST', body: JSON.stringify(data) }),
  cancelSale: (saleId: string, cashierName: string) =>
    fetchJson<Sale>(`/api/sales/${saleId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ cashierName }),
    }),
  deleteSale: (saleId: string, restoreStock: boolean = true) =>
    fetchJson<{ success: boolean }>(`/api/sales/${saleId}`, {
      method: 'DELETE',
      body: JSON.stringify({ restoreStock }),
    }),

  // Returns
  getReturns: () => fetchJson<SaleReturn[]>('/api/returns'),
  processReturn: (data: {
    saleId?: string;
    ticketNumber?: number;
    registerId: string;
    shiftId?: string;
    cashierId: string;
    cashierName: string;
    customerId?: string;
    items: {
      productId: string;
      quantity: number;
      unitPrice: number;
      productName?: string;
      barcode?: string;
      unit?: any;
    }[];
    refundType: 'CASH' | 'CUSTOMER_CREDIT' | 'CURRENT_CART';
    reason?: string;
  }) => fetchJson<SaleReturn>('/api/returns', { method: 'POST', body: JSON.stringify(data) }),

  // Hold Tickets
  getHoldTickets: () => fetchJson<HoldTicket[]>('/api/hold-tickets'),
  saveHoldTicket: (data: { label: string; registerId: string; items: any[]; customerId?: string }) =>
    fetchJson<HoldTicket>('/api/hold-tickets', { method: 'POST', body: JSON.stringify(data) }),
  deleteHoldTicket: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/hold-tickets/${id}`, { method: 'DELETE' }),

  // Cashiers
  getCashiers: () => fetchJson<Cashier[]>('/api/cashiers'),
  saveCashier: (data: Partial<Cashier> & { name: string; pin: string }) =>
    fetchJson<Cashier>('/api/cashiers', { method: 'POST', body: JSON.stringify(data) }),
  deleteCashier: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/cashiers/${id}`, { method: 'DELETE' }),

  // Employee Discounts & Linked Accounts
  getEmployeeDiscountConfig: () => fetchJson<EmployeeDiscountConfig>('/api/employees/discount-config'),
  saveEmployeeDiscountConfig: (config: Partial<EmployeeDiscountConfig>) =>
    fetchJson<EmployeeDiscountConfig>('/api/employees/discount-config', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
  syncEmployeeCustomers: () =>
    fetchJson<{ customers: Customer[]; cashiers: Cashier[] }>('/api/employees/sync-customers', {
      method: 'POST',
    }),
  updateCashierEmployeeDiscount: (cashierId: string, discountPercentage: number) =>
    fetchJson<Cashier>(`/api/employees/${cashierId}/discount`, {
      method: 'POST',
      body: JSON.stringify({ discountPercentage }),
    }),

  // Auth & Email / User / PIN / Register Verification
  verifyEmailAuth: async (email: string, pin?: string, registerId?: string, deviceId?: string, force?: boolean) => {
    const result = await fetchJson<{
      authorized: boolean;
      token?: string;
      cashier?: Cashier;
      register?: CashRegister;
      activeShift?: CashShift;
      role?: 'ADMIN' | 'CASHIER';
      error?: string;
    }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, pin, registerId, deviceId, force }),
    });
    if (result.authorized && result.token) {
      setApiAuthToken(result.token);
    }
    return result;
  },

  verifyUserAuth: async (data: { cashierId?: string; identifier?: string; pin?: string; registerId?: string; deviceId?: string; force?: boolean }) => {
    const result = await fetchJson<{
      authorized: boolean;
      token?: string;
      cashier?: Cashier;
      register?: CashRegister;
      activeShift?: CashShift;
      role?: 'ADMIN' | 'CASHIER';
      error?: string;
    }>('/api/auth/verify-user', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (result.authorized && result.token) {
      setApiAuthToken(result.token);
    }
    return result;
  },

  verifyPin: (data: { cashierId?: string; pin: string }) =>
    fetchJson<{
      authorized: boolean;
      role?: 'ADMIN' | 'CASHIER';
      cashierName?: string;
      error?: string;
    }>('/api/auth/verify-pin', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Common Products
  getCommonProducts: () => fetchJson<CommonProduct[]>('/api/common-products'),
  saveCommonProduct: (data: Partial<CommonProduct> & { name: string; price: number }) =>
    fetchJson<CommonProduct>('/api/common-products', { method: 'POST', body: JSON.stringify(data) }),
  deleteCommonProduct: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/common-products/${id}`, { method: 'DELETE' }),

  // Shortcuts Config
  getShortcuts: () => fetchJson<KeyboardShortcutConfig[]>('/api/shortcuts'),
  saveShortcuts: (shortcuts: KeyboardShortcutConfig[]) =>
    fetchJson<KeyboardShortcutConfig[]>('/api/shortcuts', {
      method: 'POST',
      body: JSON.stringify({ shortcuts }),
    }),

  // Suppliers & Purchases (Feature 1)
  getSuppliers: () => fetchJson<Supplier[]>('/api/suppliers'),
  saveSupplier: (data: Partial<Supplier> & { name: string }) =>
    fetchJson<Supplier>('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteSupplier: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/suppliers/${id}`, {
      method: 'DELETE',
    }),
  getPurchases: () => fetchJson<PurchaseInvoice[]>('/api/purchases'),
  createPurchase: (data: {
    invoiceNumber: string;
    supplierId: string;
    supplierName: string;
    supplierTaxId?: string;
    invoiceDate: string;
    dueDate?: string;
    paymentMethod: string;
    paymentStatus: string;
    items: any[];
    subtotal: number;
    taxAmount: number;
    total: number;
    paidAmount: number;
    notes?: string;
    registerId?: string;
    shiftId?: string;
    cashierId: string;
    cashierName: string;
  }) =>
    fetchJson<PurchaseInvoice>('/api/purchases', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getSupplierPayments: () => fetchJson<SupplierPayment[]>('/api/suppliers/payments'),
  addSupplierPayment: (data: {
    supplierId: string;
    supplierName: string;
    purchaseId?: string;
    purchaseInvoiceNumber?: string;
    amount: number;
    paymentMethod: string;
    date: string;
    receiptNumber?: string;
    notes?: string;
    registerId?: string;
    shiftId?: string;
    cashierId: string;
    cashierName: string;
  }) =>
    fetchJson<SupplierPayment>('/api/suppliers/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Reset Seed
  resetSeed: () => fetchJson<{ success: boolean; message: string }>('/api/seed/reset', { method: 'POST' }),

  // Fiscal Invoices & Tax Configuration
  getFiscalInvoices: () => fetchJson<FiscalInvoice[]>('/api/fiscal/invoices'),
  emitFiscalInvoice: (data: any) =>
    fetchJson<FiscalInvoice>('/api/fiscal/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  cancelFiscalInvoice: (id: string, reason: string) =>
    fetchJson<FiscalInvoice>(`/api/fiscal/invoices/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  getFiscalConfig: () => fetchJson<StoreFiscalConfig>('/api/fiscal/config'),
  saveFiscalConfig: (data: Partial<StoreFiscalConfig>) =>
    fetchJson<StoreFiscalConfig>('/api/fiscal/config', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Audit Logs (Registro de Auditoría de Movimientos)
  getAuditLogs: () => fetchJson<AuditLog[]>('/api/audit-logs'),
  logAudit: (data: Partial<AuditLog> & { action: AuditActionType; summary: string }) =>
    fetchJson<AuditLog>('/api/audit-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Batches / Lotes y Vencimientos
  getBatches: () => fetchJson<ProductBatch[]>('/api/batches'),
  saveBatch: (batch: Partial<ProductBatch> & { productId: string; expirationDate: string; initialQuantity: number }) =>
    fetchJson<ProductBatch>('/api/batches', { method: 'POST', body: JSON.stringify(batch) }),
  deleteBatch: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/batches/${id}`, { method: 'DELETE' }),
  discardBatch: (id: string, reason: string, userName?: string) =>
    fetchJson<ProductBatch>(`/api/batches/${id}/discard`, {
      method: 'POST',
      body: JSON.stringify({ reason, userName }),
    }),

  // Warehouses / Depósitos y Sucursales
  getWarehouses: () => fetchJson<Warehouse[]>('/api/warehouses'),
  saveWarehouse: (wh: Partial<Warehouse> & { name: string; code: string }) =>
    fetchJson<Warehouse>('/api/warehouses', { method: 'POST', body: JSON.stringify(wh) }),
  deleteWarehouse: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/warehouses/${id}`, { method: 'DELETE' }),

  // Stock Transfers
  getStockTransfers: () => fetchJson<StockTransfer[]>('/api/stock-transfers'),
  createStockTransfer: (data: {
    originWarehouseId: string;
    destWarehouseId: string;
    items: { productId: string; quantity: number; batchId?: string; batchNumber?: string }[];
    notes?: string;
    responsibleName?: string;
    responsibleId?: string;
  }) => fetchJson<StockTransfer>('/api/stock-transfers', { method: 'POST', body: JSON.stringify(data) }),

  // Loyalty Program / Fidelización
  getLoyaltyConfig: () => fetchJson<LoyaltyProgramConfig>('/api/loyalty/config'),
  saveLoyaltyConfig: (config: Partial<LoyaltyProgramConfig>) =>
    fetchJson<LoyaltyProgramConfig>('/api/loyalty/config', { method: 'POST', body: JSON.stringify(config) }),
  getLoyaltyMovements: (customerId?: string) =>
    fetchJson<CustomerPointsMovement[]>(customerId ? `/api/loyalty/movements?customerId=${customerId}` : '/api/loyalty/movements'),
  adjustCustomerPoints: (customerId: string, data: { pointsDelta: number; reason: string; cashierName?: string }) =>
    fetchJson<Customer>(`/api/customers/${customerId}/adjust-points`, { method: 'POST', body: JSON.stringify(data) }),

  // Real-time Event Subscription (SSE)
  subscribeToSyncEvents: (
    onEvent: (event: { type: string; payload?: any; timestamp: number }) => void,
    onStatusChange?: (connected: boolean) => void
  ) => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;
    let isUnmounted = false;

    function connect() {
      if (isUnmounted) return;
      try {
        eventSource = new EventSource('/api/sync/events');

        eventSource.onopen = () => {
          onStatusChange?.(true);
        };

        eventSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            onEvent(data);
          } catch (err) {
            console.warn('[Sync Client] Error parsing event data:', err);
          }
        };

        eventSource.onerror = () => {
          onStatusChange?.(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Exponential / auto reconnect after 3 seconds
          if (!isUnmounted) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };
      } catch (err) {
        console.warn('[Sync Client] EventSource error:', err);
        onStatusChange?.(false);
      }
    }

    connect();

    return () => {
      isUnmounted = true;
      clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  },
};
