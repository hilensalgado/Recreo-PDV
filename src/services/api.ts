import {
  Product,
  Department,
  Customer,
  CustomerCreditMovement,
  Sale,
  CashRegister,
  CashShift,
  CashMovement,
  Cashier,
  HoldTicket,
  CommonProduct,
  PosSummaryStats,
} from '../types/pos';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorData.error || 'Error en la solicitud al servidor');
  }

  return res.json();
}

export const api = {
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

  // Departments
  getDepartments: () => fetchJson<Department[]>('/api/departments'),

  // Cash Registers
  getRegisters: () => fetchJson<CashRegister[]>('/api/registers'),
  saveRegister: (reg: Partial<CashRegister> & { name: string }) =>
    fetchJson<CashRegister>('/api/registers', { method: 'POST', body: JSON.stringify(reg) }),
  deleteRegister: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/registers/${id}`, { method: 'DELETE' }),

  // Shifts
  getShifts: () => fetchJson<CashShift[]>('/api/shifts'),
  openShift: (registerId: string, cashierId: string, initialCash: number) =>
    fetchJson<CashShift>('/api/shifts/open', {
      method: 'POST',
      body: JSON.stringify({ registerId, cashierId, initialCash }),
    }),
  closeShift: (shiftId: string, declaredCash: number, notes?: string) =>
    fetchJson<CashShift>('/api/shifts/close', {
      method: 'POST',
      body: JSON.stringify({ shiftId, declaredCash, notes }),
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
    items: { productId: string; quantity: number; unitPrice: number; discountPercentage?: number }[];
    paymentMethod: 'EFECTIVO' | 'TARJETA' | 'CREDITO' | 'MIXTO';
    cashPaid: number;
    cardPaid: number;
  }) => fetchJson<Sale>('/api/sales', { method: 'POST', body: JSON.stringify(data) }),
  cancelSale: (saleId: string, cashierName: string) =>
    fetchJson<Sale>(`/api/sales/${saleId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ cashierName }),
    }),

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

  // Common Products
  getCommonProducts: () => fetchJson<CommonProduct[]>('/api/common-products'),
  saveCommonProduct: (data: Partial<CommonProduct> & { name: string; price: number }) =>
    fetchJson<CommonProduct>('/api/common-products', { method: 'POST', body: JSON.stringify(data) }),
  deleteCommonProduct: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/common-products/${id}`, { method: 'DELETE' }),

  // Summary Stats
  getSummaryStats: () => fetchJson<PosSummaryStats>('/api/stats/summary'),

  // Reset Seed
  resetSeed: () => fetchJson<{ success: boolean; message: string }>('/api/seed/reset', { method: 'POST' }),
};
