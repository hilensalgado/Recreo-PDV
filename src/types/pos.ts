export type UnitType = 'piece' | 'kg';

export interface ProductBatch {
  id: string;
  productId: string;
  productName: string;
  barcode: string;
  batchNumber: string; // e.g. "LOT-2026-081"
  expirationDate: string; // YYYY-MM-DD
  manufacturingDate?: string;
  initialQuantity: number;
  currentQuantity: number;
  remainingQuantity?: number;
  costPrice?: number;
  salePrice?: number;
  warehouseId?: string;
  supplierId?: string;
  supplierName?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'QUARANTINE' | 'DISCARDED';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  discardedAt?: string;
  discardReason?: string;
  discardedBy?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string; // e.g. "DEP-CENTRAL", "SALON-01"
  location?: string;
  address?: string;
  phone?: string;
  type?: 'CENTRAL' | 'BRANCH' | 'TRANSIT';
  isMain?: boolean;
  isCentral?: boolean;
  isActive: boolean;
  description?: string;
  notes?: string;
  createdAt?: string;
}

export interface StockTransferItem {
  productId: string;
  productName?: string;
  barcode?: string;
  unit?: UnitType;
  quantity: number;
  batchId?: string;
  batchNumber?: string;
}

export interface StockTransfer {
  id: string;
  transferNumber: string; // e.g. "TRF-00101"
  originWarehouseId: string;
  originWarehouseName: string;
  destWarehouseId: string;
  destWarehouseName: string;
  items: StockTransferItem[];
  totalUnits: number;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  notes?: string;
  responsibleName: string;
  responsibleId?: string;
  createdAt: string;
  completedAt?: string;
}

export type LabelFormat =
  | 'SHELF_50X30'
  | 'SHELF_60X40'
  | 'PRODUCT_38X25'
  | 'PRODUCT_50X25'
  | 'A4_SHEET_24'
  | 'A4_SHEET_40'
  | 'THERMAL_58MM'
  | 'THERMAL_80MM';

export interface LabelConfig {
  format: LabelFormat;
  showStoreName: boolean;
  storeNameText?: string;
  showBarcode: boolean;
  showBarcodeText: boolean;
  showSalePrice: boolean;
  showCostCode: boolean;
  showUnitMetric: boolean;
  showExpirationDate: boolean;
  showPackagingDate: boolean;
  customText?: string;
  barcodeType: 'CODE128' | 'EAN13' | 'QR';
  fontSize: 'sm' | 'md' | 'lg';
}

export interface LabelPrintItem {
  productId: string;
  product: Product;
  quantityToPrint: number;
  batchNumber?: string;
  expirationDate?: string;
  packagingDate?: string;
  customPrice?: number;
}

export interface LoyaltyProgramConfig {
  enabled: boolean;
  pointsPerAmount: number; // e.g. 1 point for every $100 spent
  pointValueInCurrency: number; // e.g. 1 point = $5 discount
  minPointsToRedeem: number; // Minimum points required to redeem
  maxDiscountPercentagePerSale: number; // e.g. 50% max discount from total
  welcomeBonusPoints?: number;
}

export interface CustomerPointsMovement {
  id: string;
  customerId: string;
  customerName?: string;
  type: 'EARNED' | 'REDEEMED' | 'ADJUSTMENT' | 'EXPIRED' | 'BONUS';
  points: number;
  balanceAfter: number;
  saleId?: string;
  ticketNumber?: number;
  amountSpent?: number;
  discountApplied?: number;
  description: string;
  date?: string;
  timestamp: string;
  cashierName?: string;
}

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
  // Logical Deletion & Active Status
  isActive?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  // Batches & Expirations
  hasBatches?: boolean;
  batches?: ProductBatch[];
  nearestExpiration?: string;
  expiringBatchesCount?: number;
  defaultExpirationDays?: number;
  // Multi-Warehouse Stock
  warehouseStock?: Record<string, number>; // warehouseId -> quantity
}

export interface Department {
  id: string;
  name: string;
  color: string;
  isActive?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
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
  isEmployee?: boolean;
  cashierId?: string;
  employeeDiscountPercentage?: number;
  // Logical Deletion & Active Status
  isActive?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  // Loyalty & Rewards Points
  points?: number;
  /** @deprecated use points */
  pointsBalance?: number;
  /** @deprecated use points */
  loyaltyPoints?: number;
  totalPointsEarned?: number;
  totalPointsRedeemed?: number;
  pointsHistory?: CustomerPointsMovement[];
  // Fiscal Data
  taxId?: string; // RFC / CUIT / RUT / NIT
  taxRegime?: string; // e.g. '601 - General de Ley Personas Morales', '612 - Personas Físicas con Actividades Empresariales', '626 - RESICO', 'Responsable Inscripto', 'Monotributo'
  cfdiUsage?: string; // e.g. 'G01 - Adquisición de mercancías', 'G03 - Gastos en general', 'P01 - Por definir'
  fiscalAddress?: string;
  postalCode?: string;
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
  originalUnitPrice?: number;
  isWholesaleApplied: boolean;
  discountPercentage: number;
  subtotal: number;
  total: number;
  notes?: string;
  isPromotion?: boolean;
  promotionId?: string;
  promotionCode?: string;
  promotionItems?: PromotionItem[];
  appliedPromotionId?: string;
  appliedPromotionName?: string;
  appliedPromotionType?: PromotionType;
  promoDiscountAmount?: number;
}

export type PaymentMethod = 'EFECTIVO' | 'TARJETA' | 'CREDITO' | 'MIXTO' | 'TRANSFERENCIA' | 'QR';

export interface Sale {
  id: string;
  ticketNumber: number | string;
  formattedTicketNumber?: string;
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
  clientTransactionId?: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
  pointsDiscountAmount?: number;
  customerPhone?: string;
  customerEmail?: string;
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
  activeDeviceName?: string;
  lastHeartbeat?: number;
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
  totalSalesTransfer?: number;
  totalSalesQR?: number;
  totalIncomes: number;
  totalExpenses: number;
  notes?: string;
  status: 'OPEN' | 'CLOSED';
}

export type ReturnRefundType = 'CASH' | 'CUSTOMER_CREDIT' | 'CURRENT_CART';

export interface ReturnItem {
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit?: UnitType;
}

export interface SaleReturn {
  id: string;
  returnNumber: number;
  saleId?: string;
  ticketNumber?: number;
  registerId: string;
  registerName: string;
  cashierId: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  items: ReturnItem[];
  totalAmount: number;
  refundType: ReturnRefundType;
  reason?: string;
  timestamp: string;
  shiftId?: string;
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
  allowDeleteSales?: boolean;
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
  email?: string;
  pin?: string;
  hasPin?: boolean;
  role: 'ADMIN' | 'CASHIER';
  permissions: CashierPermissions;
  employeeDiscountPercentage?: number;
  customerId?: string;
  activeDeviceId?: string;
  activeDeviceName?: string;
  activeRegisterId?: string;
  isLoggedIn?: boolean;
  lastHeartbeat?: number;
}

export interface EmployeeDiscountConfig {
  defaultDiscountPercentage: number;
  cashierDiscounts: Record<string, number>;
  allowManualDiscountOverride?: boolean;
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

export interface PromotionItem {
  productId: string;
  productName: string;
  productBarcode?: string;
  quantity: number;
  unitPrice?: number;
}

export type PromotionType =
  | 'COMBO' // Precio especial por paquete de productos
  | 'BOGO_2X1' // 2x1 o Lleva X Paga Y
  | 'SECOND_UNIT_DISCOUNT' // % Descuento en la 2da unidad (ej. 70% off)
  | 'PERCENTAGE_DISCOUNT' // % Descuento directo en producto/departamento
  | 'FIXED_DISCOUNT' // $ Monto fijo de descuento
  | 'BULK_PRICE'; // Descuento por cantidad (ej. llevando >= 3 unidades)

export interface Promotion {
  id: string;
  code: string; // unique promotion code (e.g. COMBO001, PROMO2X1)
  name: string;
  type?: PromotionType; // default 'COMBO'
  description?: string;
  price: number; // Precio fijado (para combos o precio unitario promocional)
  discountPercentage?: number; // Para PERCENTAGE_DISCOUNT o SECOND_UNIT_DISCOUNT
  discountAmount?: number; // Para FIXED_DISCOUNT ($)
  targetProductId?: string; // Para 2x1, 3x2, 2da unidad o descuento directo a producto
  targetDepartmentId?: string; // Para descuento por departamento completo
  minQuantity?: number; // Cantidad mínima para activar (ej. 2 para 2x1, 3 para 3x2 o por volumen)
  payQuantity?: number; // Cantidad a pagar (ej. 1 en 2x1, 2 en 3x2)
  secondUnitDiscountPercent?: number; // % en la 2da unidad (ej. 50, 70, 80)
  status: 'ACTIVE' | 'INACTIVE';
  items: PromotionItem[]; // Para combos
  activeDays?: number[]; // [0, 1, 2, 3, 4, 5, 6] (0 = Domingo, 1 = Lunes, ...)
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm (ej. 18:00)
  endTime?: string; // HH:mm (ej. 21:00)
  createdAt: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  taxId: string; // CUIT / RUT / RFC / DNI
  name: string; // Razón Social o Nombre Comercial
  contactName?: string;
  phone: string;
  email?: string;
  address?: string;
  category?: string; // e.g. Abarrotes, Bebidas, Lácteos, Golosinas, etc.
  paymentTermsDays: number; // 0 = Contado, 15, 30, 45, 60 días
  balance: number; // Saldo deudor pendiente
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  unitCost: number;
  newSalePrice?: number;
  taxRate?: number; // e.g. 21, 10.5, 0
  subtotal: number;
  unit: UnitType;
}

export type PurchasePaymentMethod = 'EFECTIVO_CAJA' | 'TRANSFERENCIA' | 'CUENTA_CORRIENTE' | 'OTRO';
export type PurchasePaymentStatus = 'PAID' | 'PENDING' | 'PARTIAL';

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string; // ej. FAC-A-0001-00045231 o REM-00129
  supplierId: string;
  supplierName: string;
  supplierTaxId?: string;
  invoiceDate: string;
  dueDate?: string;
  paymentMethod: PurchasePaymentMethod;
  paymentStatus: PurchasePaymentStatus;
  items: PurchaseItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  notes?: string;
  registerId?: string; // If paid with register cash
  shiftId?: string;
  cashierId: string;
  cashierName: string;
  createdAt: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplierName: string;
  purchaseId?: string;
  purchaseInvoiceNumber?: string;
  amount: number;
  paymentMethod: 'EFECTIVO_CAJA' | 'TRANSFERENCIA' | 'CHEQUE' | 'OTRO';
  date: string;
  receiptNumber?: string;
  notes?: string;
  registerId?: string;
  shiftId?: string;
  cashierId: string;
  cashierName: string;
}

export interface FiscalInvoiceItem {
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  vatRate: number; // e.g. 16, 21, 10.5, 0, 8
  vatAmount: number;
  iepsRate?: number; // e.g. 8, 3, 0
  iepsAmount?: number;
  total: number;
  satProductCode?: string; // e.g. 50192100
  satUnitCode?: string; // e.g. H87 (Pieza), KGM (Kilogramo)
}

export interface FiscalInvoice {
  id: string;
  uuid: string; // UUID Fiscal Timbre / Folio Fiscal Digital
  series: string; // e.g. 'FAC' o 'A' o 'B'
  folio: number; // e.g. 1024
  saleId?: string;
  ticketNumber?: number;
  type: 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C' | 'CFDI_INGRESO';
  emitter: {
    businessName: string;
    taxId: string;
    taxRegime: string;
    fiscalAddress: string;
    postalCode: string;
    phone?: string;
    email?: string;
    economicActivity?: string;
  };
  receiver: {
    customerId?: string;
    name: string;
    taxId: string;
    taxRegime: string;
    cfdiUsage: string;
    fiscalAddress: string;
    postalCode: string;
    email?: string;
  };
  items: FiscalInvoiceItem[];
  subtotal: number;
  discount: number;
  vatTotal: number;
  iepsTotal: number;
  retentionTotal: number;
  total: number;
  currency: 'MXN' | 'ARS' | 'USD';
  paymentMethod: string; // 'PUE' (Pago en una sola exhibición) / 'PPD'
  paymentForm: string; // '01 - Efectivo', '04 - Tarjeta de crédito', '03 - Transferencia', etc.
  digitalStampEmitter?: string; // Sello Digital del Emisor
  digitalStampSat?: string; // Sello SAT / CAE
  caeOrStampNumber?: string; // Código de Autorización de Emisión / Folio Fiscal
  caeExpirationDate?: string;
  qrCodeUrl?: string;
  status: 'EMITTED' | 'CANCELLED';
  cancellationReason?: string;
  emittedAt: string;
  cancelledAt?: string;
  registerId: string;
  registerName: string;
  cashierId: string;
  cashierName: string;
}

export interface StoreFiscalConfig {
  businessName: string;
  tradeName: string;
  taxId: string; // RFC o CUIT
  taxRegime: string; // Régimen fiscal del emisor
  economicActivity?: string;
  fiscalAddress: string;
  postalCode: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  email: string;
  invoiceSeries: string;
  nextInvoiceFolio: number;
  defaultVatRate: number; // 16 o 21
  defaultIepsRate: number; // 0 o 8
  digitalCertificateNumber: string;
  autoGenerateInvoiceOnSale: boolean;
}

export type AuditActionType =
  | 'PRICE_CHANGE'
  | 'STOCK_ADJUSTMENT'
  | 'SALE_COMPLETED'
  | 'SALE_CANCELLED'
  | 'SALE_DELETED'
  | 'RETURN_PROCESSED'
  | 'PURCHASE_CREATED'
  | 'SUPPLIER_PAYMENT'
  | 'SHIFT_OPEN'
  | 'SHIFT_CLOSED'
  | 'SHIFT_DELETED'
  | 'CASH_MOVEMENT'
  | 'PROMOTION_SAVED'
  | 'PROMOTION_DELETED'
  | 'PRODUCT_CREATED'
  | 'PRODUCT_DELETED'
  | 'CUSTOMER_EDIT'
  | 'BATCH_CREATED'
  | 'BATCH_UPDATED'
  | 'BATCH_DELETED'
  | 'BATCH_DISCARDED'
  | 'STOCK_TRANSFER'
  | 'STOCK_TRANSFERRED'
  | 'WAREHOUSE_CREATED'
  | 'WAREHOUSE_UPDATED'
  | 'POINTS_REDEEMED'
  | 'POINTS_ADJUSTED'
  | 'LOYALTY_CONFIG_UPDATED'
  | 'LOYALTY_POINTS_ADJUSTED';

export interface AuditLog {
  id: string;
  action: AuditActionType;
  entityType: 'PRODUCT' | 'SALE' | 'STOCK' | 'RETURN' | 'CASH' | 'PROMO' | 'CUSTOMER' | 'PURCHASE' | 'SHIFT' | 'FISCAL' | 'SYSTEM' | 'BATCH' | 'WAREHOUSE' | 'TRANSFER' | 'LOYALTY';
  entityId?: string;
  entityName?: string;
  userId?: string;
  userName: string;
  userRole?: 'ADMIN' | 'CASHIER';
  registerId?: string;
  registerName?: string;
  shiftId?: string;
  timestamp: string;
  summary: string;
  details?: Record<string, any>;
  previousValue?: string | number | Record<string, any>;
  newValue?: string | number | Record<string, any>;
  ipAddress?: string;
}



