export type UnitType = 'piece' | 'kg';

export interface Product {
  id: string;
  barcode: string;
  name: string;
  departmentId: string;
  departmentName?: string;
  costPrice: number;
  salePrice: number;
  wholesalePrice: number;
  wholesaleMinQty: number;
  stock: number;
  minStock: number;
  unit: UnitType; // 'piece' | 'kg'
  image?: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  color: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  creditLimit: number;
  creditBalance: number;
  notes?: string;
  createdAt: string;
}

export interface CustomerCreditMovement {
  id: string;
  customerId: string;
  type: 'CHARGE' | 'PAYMENT';
  amount: number;
  description: string;
  date: string;
  cashierId: string;
  registerId: string;
  saleId?: string;
}

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  isWholesaleApplied: boolean;
  discountPercentage: number;
  subtotal: number;
  total: number;
  notes?: string;
}

export type PaymentMethod = 'EFECTIVO' | 'TARJETA' | 'CREDITO' | 'MIXTO';

export interface Sale {
  id: string;
  ticketNumber: number;
  registerId: string;
  registerName: string;
  cashierId: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashPaid: number;
  cardPaid: number;
  changeGiven: number;
  timestamp: string;
  status: 'COMPLETED' | 'CANCELLED';
  shiftId: string;
}

export interface CashRegister {
  id: string;
  name: string;
  location: string;
  isMain: boolean;
  isOpen: boolean;
  currentCashierId?: string;
  currentCashierName?: string;
  activeShiftId?: string;
  activeDeviceId?: string;
}

export interface CashShift {
  id: string;
  registerId: string;
  registerName: string;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  initialCash: number;
  expectedCash: number;
  declaredCash?: number;
  difference?: number;
  totalSalesCash: number;
  totalSalesCard: number;
  totalSalesCredit: number;
  totalIncomes: number;
  totalExpenses: number;
  notes?: string;
  status: 'OPEN' | 'CLOSED';
}

export interface CashMovement {
  id: string;
  registerId: string;
  registerName: string;
  shiftId: string;
  cashierId: string;
  cashierName: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  concept: string;
  timestamp: string;
}

export interface CashierPermissions {
  allowPriceChange: boolean;
  allowDiscounts: boolean;
  allowReturns: boolean;
  allowReports: boolean;
  allowInventoryEdit: boolean;
  allowCashDrawOpen: boolean;
  allowCashMovements: boolean;
  allowCustomerPayments: boolean;
  allowHoldTickets: boolean;
  allowCommonProducts: boolean;
  allowConfigEdit: boolean;
}

export interface Cashier {
  id: string;
  name: string;
  pin: string;
  role: 'ADMIN' | 'CASHIER';
  permissions: CashierPermissions;
  activeDeviceId?: string;
  activeRegisterId?: string;
  isLoggedIn?: boolean;
}

export interface HoldTicket {
  id: string;
  ticketNumber: number;
  label: string;
  registerId: string;
  items: CartItem[];
  customerId?: string;
  createdAt: string;
}

export interface CommonProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  iconName: string;
}

export interface PosSummaryStats {
  todayTotalSales: number;
  todaySalesCount: number;
  todayProfit: number;
  activeRegistersCount: number;
  lowStockItemsCount: number;
  totalCreditPending: number;
}

export interface KeyboardShortcutConfig {
  id: string;
  actionName: string;
  defaultKey: string;
  currentKey: string;
  description: string;
}
