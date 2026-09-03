import {
  Product,
  ProductBatch,
  Warehouse,
  StockTransfer,
  StockTransferItem,
  LoyaltyProgramConfig,
  CustomerPointsMovement,
  Department,
  Customer,
  CustomerCreditMovement,
  Sale,
  SaleReturn,
  ReturnItem,
  CashRegister,
  CashShift,
  CashMovement,
  Cashier,
  HoldTicket,
  CommonProduct,
  KeyboardShortcutConfig,
  EmployeeDiscountConfig,
  Promotion,
  PromotionItem,
  Supplier,
  PurchaseItem,
  PurchaseInvoice,
  SupplierPayment,
  FiscalInvoice,
  FiscalInvoiceItem,
  StoreFiscalConfig,
  AuditLog,
  AuditActionType,
  CartItem,
  PaymentMethod,
} from '../src/types/pos';
import {
  evaluateAutomaticPromotions,
  calculateChange,
  roundCurrency,
} from '../src/utils/pricingEngine';
import {
  hashPin,
  verifyPin,
  isHashedPin,
  createToken,
  sanitizeCashier,
  sanitizeCashiers,
} from './auth';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import { EventEmitter } from 'events';
import firebaseConfig from '../firebase-applet-config.json';

interface DatabaseSchema {
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
  auditLogs: AuditLog[];
  batches: ProductBatch[];
  warehouses: Warehouse[];
  stockTransfers: StockTransfer[];
  loyaltyConfig: LoyaltyProgramConfig;
  customerPointsMovements: CustomerPointsMovement[];
  ticketCounter: number;
  returnCounter: number;
  invoiceCounter: number;
  transferCounter: number;
}

const defaultStoreFiscalConfig: StoreFiscalConfig = {
  businessName: 'RECREO PDV COMERCIAL S.A.',
  tradeName: 'RECREO PUNTO DE VENTA',
  taxId: '30-71234567-8', // RFC / CUIT
  taxRegime: '601 - General de Ley Personas Morales / Responsable Inscripto',
  economicActivity: 'Venta al por menor en comercios no especializados',
  fiscalAddress: 'Av. Corrientes 1234, CABA',
  postalCode: 'C1043AAZ',
  city: 'Ciudad Autónoma de Buenos Aires',
  state: 'Buenos Aires',
  country: 'Argentina / México',
  phone: '011-4567-8900',
  email: 'facturacion@recreopdv.com',
  invoiceSeries: 'A',
  nextInvoiceFolio: 1001,
  defaultVatRate: 21,
  defaultIepsRate: 0,
  digitalCertificateNumber: '30001000000500003412',
  autoGenerateInvoiceOnSale: false,
};

const defaultSuppliers: Supplier[] = [];

const defaultEmployeeDiscountConfig: EmployeeDiscountConfig = {
  defaultDiscountPercentage: 10,
  cashierDiscounts: {},
  allowManualDiscountOverride: true,
};

const defaultShortcuts: KeyboardShortcutConfig[] = [
  { id: 'sales', actionName: 'Ventas', defaultKey: 'F1', currentKey: 'F1', description: 'Ir a la pantalla principal de Ventas' },
  { id: 'common', actionName: 'Prod. Comunes', defaultKey: 'F2', currentKey: 'F2', description: 'Ver catálogo de Productos Comunes / Sin Código' },
  { id: 'movements', actionName: 'Entradas/Salidas', defaultKey: 'F3', currentKey: 'F3', description: 'Registrar Entrada o Salida de Dinero en Caja' },
  { id: 'hold', actionName: 'En Espera', defaultKey: 'F6', currentKey: 'F6', description: 'Poner Ticket actual en Espera / Ver Guardados' },
  { id: 'customers', actionName: 'Clientes / Crédito', defaultKey: 'F7', currentKey: 'F7', description: 'Directorio de Clientes, Créditos y Fiado' },
  { id: 'inventory', actionName: 'Inventario', defaultKey: 'F8', currentKey: 'F8', description: 'Catálogo de Productos e Inventario (Solo Admin)' },
  { id: 'search', actionName: 'Buscador Rápido', defaultKey: 'F10', currentKey: 'F10', description: 'Enfocar buscador de producto / Código de barras' },
  { id: 'history', actionName: 'Ventas Realizadas', defaultKey: 'F11', currentKey: 'F11', description: 'Historial de Ventas Realizadas y Re-impresión' },
  { id: 'checkout', actionName: 'Cobrar Venta', defaultKey: 'F12', currentKey: 'F12', description: 'Abrir ventana de cobro (En módulo de cobro: F2 o Enter finaliza venta)' },
  { id: 'cashcut', actionName: 'Corte de Caja', defaultKey: 'SHIFT+F12', currentKey: 'SHIFT+F12', description: 'Módulo de Arqueo y Corte de Caja' },
];

const defaultDepartments: Department[] = [
  { id: 'dep-1', name: 'Abarrotes', color: 'bg-blue-500' },
  { id: 'dep-2', name: 'Bebidas y Vinos', color: 'bg-cyan-500' },
  { id: 'dep-3', name: 'Lácteos y Embutidos', color: 'bg-amber-500' },
  { id: 'dep-4', name: 'Botanas y Dulcería', color: 'bg-orange-500' },
  { id: 'dep-5', name: 'Frutas y Verduras (Kilo)', color: 'bg-emerald-500' },
  { id: 'dep-6', name: 'Limpieza e Higiene', color: 'bg-indigo-500' },
  { id: 'dep-7', name: 'Panadería y Tortillas', color: 'bg-rose-500' },
  { id: 'dep-8', name: 'Servicios y Varios', color: 'bg-purple-500' },
];

const defaultRegisters: CashRegister[] = [
  {
    id: 'reg-1',
    name: 'Caja 1 - Principal (Mostrador)',
    location: 'Entrada Principal - Caja Central',
    isMain: true,
    isOpen: false,
  },
];

const defaultCashiers: Cashier[] = [
  {
    id: 'cash-1',
    name: 'Admin General',
    email: 'hilen.salgado@gmail.com',
    pin: hashPin('2711'),
    role: 'ADMIN',
    permissions: {
      allowPriceChange: true,
      allowDiscounts: true,
      allowReturns: true,
      allowDeleteSales: true,
      allowReports: true,
      allowInventoryEdit: true,
      allowCashDrawOpen: true,
      allowCashMovements: true,
      allowCustomerPayments: true,
      allowHoldTickets: true,
      allowCommonProducts: true,
      allowConfigEdit: true,
    },
  },
  {
    id: 'cash-2',
    name: 'Cajero Mostrador',
    pin: hashPin('0000'),
    role: 'CASHIER',
    permissions: {
      allowPriceChange: false,
      allowDiscounts: true,
      allowReturns: false,
      allowDeleteSales: false,
      allowReports: false,
      allowInventoryEdit: false,
      allowCashDrawOpen: true,
      allowCashMovements: true,
      allowCustomerPayments: true,
      allowHoldTickets: true,
      allowCommonProducts: true,
      allowConfigEdit: false,
    },
  },
];

const defaultAuditLogs: AuditLog[] = [];

const defaultWarehouses: Warehouse[] = [
  {
    id: 'wh-1',
    name: 'Depósito Central / Bodega Principal',
    code: 'DEP-CENTRAL',
    location: 'Zona Industrial / Almacén Central',
    address: 'Av. Juan B. Justo 4500, CABA',
    phone: '011-4567-8910',
    isCentral: true,
    isActive: true,
    notes: 'Recepción directa de camiones y proveedores mayoristas.',
  },
  {
    id: 'wh-2',
    name: 'Salón de Ventas / Tienda Principal',
    code: 'SALON-01',
    location: 'Av. Corrientes 1234, CABA',
    address: 'Av. Corrientes 1234, CABA',
    phone: '011-4567-8900',
    isCentral: false,
    isActive: true,
    notes: 'Góndolas, heladeras y cajas de cobro al público.',
  },
  {
    id: 'wh-3',
    name: 'Sucursal Norte (Belgrano)',
    code: 'SUC-NORTE',
    location: 'Av. Cabildo 2450, Belgrano, CABA',
    address: 'Av. Cabildo 2450, CABA',
    phone: '011-4789-2233',
    isCentral: false,
    isActive: true,
    notes: 'Local satélite con reposición periódica semanal.',
  },
];

const defaultBatches: ProductBatch[] = [];

const defaultLoyaltyConfig: LoyaltyProgramConfig = {
  enabled: true,
  pointsPerAmount: 100, // Cada $100 suma 1 punto
  pointValueInCurrency: 5, // 1 punto = $5 de descuento
  minPointsToRedeem: 20, // Mínimo 20 puntos ($100 de descuento)
  maxDiscountPercentagePerSale: 50, // Máximo 50% de la venta bonificable con puntos
  welcomeBonusPoints: 50, // 50 puntos de regalo ($250) al dar de alta al cliente
};

const defaultStockTransfers: StockTransfer[] = [];

class DatabaseManager {
  private firestore: Firestore | null = null;
  public isInitialized = false;
  private emitter = new EventEmitter();
  private processedSaleTokens = new Map<string, { sale: Sale; timestamp: number }>();

  private data: DatabaseSchema = {
    products: [],
    departments: defaultDepartments,
    customers: [],
    customerMovements: [],
    sales: [],
    returns: [],
    registers: defaultRegisters,
    shifts: [],
    cashMovements: [],
    cashiers: defaultCashiers,
    holdTickets: [],
    commonProducts: [],
    shortcutsConfig: defaultShortcuts,
    employeeDiscountConfig: defaultEmployeeDiscountConfig,
    promotions: [],
    suppliers: defaultSuppliers,
    purchases: [],
    supplierPayments: [],
    fiscalInvoices: [],
    storeFiscalConfig: defaultStoreFiscalConfig,
    auditLogs: defaultAuditLogs,
    batches: defaultBatches,
    warehouses: defaultWarehouses,
    stockTransfers: defaultStockTransfers,
    loyaltyConfig: defaultLoyaltyConfig,
    customerPointsMovements: [],
    ticketCounter: 1001,
    returnCounter: 2001,
    invoiceCounter: 1001,
    transferCounter: 102,
  };

  constructor() {
    this.emitter.setMaxListeners(100);
    this.initFirebase();
    // Periodic background session cleanup every 15 seconds
    setInterval(() => {
      this.cleanExpiredLocks();
    }, 15000);
  }

  public onEvent(listener: (event: { type: string; payload?: any; timestamp: number }) => void) {
    this.emitter.on('sync', listener);
    return () => {
      this.emitter.off('sync', listener);
    };
  }

  public emitSync(type: string, payload?: any) {
    try {
      this.emitter.emit('sync', {
        type,
        payload,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn('[Sync] Error emitiendo evento:', err);
    }
  }

  private initFirebase() {
    try {
      if (firebaseConfig && firebaseConfig.apiKey) {
        const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
        this.firestore = firebaseConfig.firestoreDatabaseId
          ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
          : getFirestore(app);
        console.log('[Firebase] Firestore conectado correctamente a la base de datos:', firebaseConfig.firestoreDatabaseId || 'default');
      }
    } catch (err) {
      console.warn('[Firebase] No se pudo inicializar Firebase en el servidor:', err);
    }
  }

  public async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (!this.firestore) {
      console.log('[Store] Operando en memoria local (Firebase no configurado).');
      return;
    }

    try {
      console.log('[Firebase] Cargando y sincronizando colecciones de Firestore en paralelo...');

      const [
        deptsSnap,
        regsSnap,
        cashiersSnap,
        prodsSnap,
        custsSnap,
        cmovsSnap,
        salesSnap,
        returnsSnap,
        shiftsSnap,
        cmSnap,
        htSnap,
        cpSnap,
        promoSnap,
        configSnap,
        suppsSnap,
        purchSnap,
        suppPaySnap,
        fiscalInvoicesSnap,
        auditLogsSnap,
        batchesSnap,
        warehousesSnap,
        transfersSnap,
      ] = await Promise.all([
        getDocs(collection(this.firestore, 'departments')),
        getDocs(collection(this.firestore, 'registers')),
        getDocs(collection(this.firestore, 'cashiers')),
        getDocs(collection(this.firestore, 'products')),
        getDocs(collection(this.firestore, 'customers')),
        getDocs(collection(this.firestore, 'customerMovements')),
        getDocs(collection(this.firestore, 'sales')),
        getDocs(collection(this.firestore, 'returns')),
        getDocs(collection(this.firestore, 'shifts')),
        getDocs(collection(this.firestore, 'cashMovements')),
        getDocs(collection(this.firestore, 'holdTickets')),
        getDocs(collection(this.firestore, 'commonProducts')),
        getDocs(collection(this.firestore, 'promotions')),
        getDocs(collection(this.firestore, 'config')),
        getDocs(collection(this.firestore, 'suppliers')),
        getDocs(collection(this.firestore, 'purchases')),
        getDocs(collection(this.firestore, 'supplierPayments')),
        getDocs(collection(this.firestore, 'fiscalInvoices')),
        getDocs(collection(this.firestore, 'auditLogs')),
        getDocs(collection(this.firestore, 'batches')),
        getDocs(collection(this.firestore, 'warehouses')),
        getDocs(collection(this.firestore, 'stockTransfers')),
      ]);

      // Departments
      if (!deptsSnap.empty) {
        this.data.departments = deptsSnap.docs.map(d => d.data() as Department);
      } else {
        await this.syncCollection('departments', defaultDepartments);
        this.data.departments = [...defaultDepartments];
      }

      // Registers
      if (!regsSnap.empty) {
        this.data.registers = regsSnap.docs.map(d => d.data() as CashRegister);
      } else {
        await this.syncCollection('registers', defaultRegisters);
        this.data.registers = [...defaultRegisters];
      }

      // Cashiers
      if (!cashiersSnap.empty) {
        this.data.cashiers = cashiersSnap.docs.map(d => {
          const c = d.data() as Cashier;
          // Clear stale transient session locks on server initialization
          return {
            ...c,
            isLoggedIn: false,
            activeDeviceId: undefined,
            activeRegisterId: undefined,
          };
        });
        for (const cashier of this.data.cashiers) {
          let updated = false;
          if (cashier.role === 'ADMIN' && !cashier.email) {
            cashier.email = 'hilen.salgado@gmail.com';
            updated = true;
          }
          // Hash any plain or disabled PINs
          if (cashier.pin === '1234' || !cashier.pin) {
            cashier.pin = hashPin(cashier.role === 'ADMIN' ? '2711' : '0000');
            updated = true;
          } else if (!isHashedPin(cashier.pin)) {
            cashier.pin = hashPin(cashier.pin);
            updated = true;
          }
          if (updated) {
            await this.persistDoc('cashiers', cashier.id, cashier);
          }
        }
      } else {
        await this.syncCollection('cashiers', defaultCashiers);
        this.data.cashiers = [...defaultCashiers];
      }

      // Products (Clean from Firestore)
      this.data.products = prodsSnap.docs.map(d => d.data() as Product);

      // Customers
      this.data.customers = custsSnap.docs.map(d => d.data() as Customer);

      // Customer Movements
      this.data.customerMovements = cmovsSnap.docs.map(d => d.data() as CustomerCreditMovement);

      // Sales
      this.data.sales = salesSnap.docs.map(d => d.data() as Sale);

      // Returns
      this.data.returns = returnsSnap.docs.map(d => d.data() as SaleReturn);

      // Shifts
      this.data.shifts = shiftsSnap.docs.map(d => d.data() as CashShift);

      // Cash Movements
      this.data.cashMovements = cmSnap.docs.map(d => d.data() as CashMovement);

      // Hold Tickets
      this.data.holdTickets = htSnap.docs.map(d => d.data() as HoldTicket);

      // Common Products
      this.data.commonProducts = cpSnap.docs.map(d => d.data() as CommonProduct);

      // Promotions
      this.data.promotions = promoSnap.docs.map(d => d.data() as Promotion);

      // Suppliers
      this.data.suppliers = suppsSnap.docs.map(d => d.data() as Supplier);

      // Purchases
      this.data.purchases = purchSnap.docs.map(d => d.data() as PurchaseInvoice);

      // Supplier Payments
      this.data.supplierPayments = suppPaySnap.docs.map(d => d.data() as SupplierPayment);

      // Fiscal Invoices
      this.data.fiscalInvoices = fiscalInvoicesSnap.docs.map(d => d.data() as FiscalInvoice);

      // Audit Logs
      this.data.auditLogs = auditLogsSnap.docs.map(d => d.data() as AuditLog);

      // Batches / Lotes
      this.data.batches = batchesSnap.docs.map(d => d.data() as ProductBatch);

      // Warehouses / Depósitos
      if (!warehousesSnap.empty) {
        this.data.warehouses = warehousesSnap.docs.map(d => d.data() as Warehouse);
      } else {
        await this.syncCollection('warehouses', defaultWarehouses);
        this.data.warehouses = [...defaultWarehouses];
      }

      // Stock Transfers
      this.data.stockTransfers = transfersSnap.docs.map(d => d.data() as StockTransfer);

      // System Config
      const loyaltyDoc = configSnap.docs.find(d => d.id === 'loyaltyProgram');
      if (loyaltyDoc && loyaltyDoc.exists()) {
        this.data.loyaltyConfig = { ...defaultLoyaltyConfig, ...loyaltyDoc.data() };
      } else {
        await this.persistDoc('config', 'loyaltyProgram', defaultLoyaltyConfig);
      }

      const shortcutsDoc = configSnap.docs.find(d => d.id === 'shortcuts');
      if (shortcutsDoc && shortcutsDoc.exists()) {
        this.data.shortcutsConfig = shortcutsDoc.data().shortcuts || defaultShortcuts;
      } else {
        await this.persistDoc('config', 'shortcuts', { shortcuts: defaultShortcuts });
      }

      const counterDoc = configSnap.docs.find(d => d.id === 'ticketCounter');
      if (counterDoc && counterDoc.exists()) {
        this.data.ticketCounter = counterDoc.data().value || 1001;
      } else {
        await this.persistDoc('config', 'ticketCounter', { value: 1001 });
      }

      const retCounterDoc = configSnap.docs.find(d => d.id === 'returnCounter');
      if (retCounterDoc && retCounterDoc.exists()) {
        this.data.returnCounter = retCounterDoc.data().value || 2001;
      } else {
        await this.persistDoc('config', 'returnCounter', { value: 2001 });
      }

      const invCounterDoc = configSnap.docs.find(d => d.id === 'invoiceCounter');
      if (invCounterDoc && invCounterDoc.exists()) {
        this.data.invoiceCounter = invCounterDoc.data().value || 1001;
      } else {
        await this.persistDoc('config', 'invoiceCounter', { value: 1001 });
      }

      const fiscalConfigDoc = configSnap.docs.find(d => d.id === 'storeFiscalConfig');
      if (fiscalConfigDoc && fiscalConfigDoc.exists()) {
        this.data.storeFiscalConfig = { ...defaultStoreFiscalConfig, ...fiscalConfigDoc.data() };
      } else {
        await this.persistDoc('config', 'storeFiscalConfig', defaultStoreFiscalConfig);
      }

      const empDiscDoc = configSnap.docs.find(d => d.id === 'employeeDiscount');
      if (empDiscDoc && empDiscDoc.exists()) {
        this.data.employeeDiscountConfig = { ...defaultEmployeeDiscountConfig, ...empDiscDoc.data() };
      } else {
        await this.persistDoc('config', 'employeeDiscount', defaultEmployeeDiscountConfig);
      }

      // Automatically ensure every cashier has a linked Customer record with discount
      await this.syncEmployeeCustomers();

      // Purge any test / sample / mock records from memory and Firestore
      await this.purgeTestData();

      // Setup Real-time Firestore Listeners for multi-client / external immediate sync
      this.setupFirestoreRealtimeListeners();

      console.log(`[Firebase] Sincronización completada con éxito. Productos: ${this.data.products.length}, Clientes: ${this.data.customers.length}, Ventas: ${this.data.sales.length}, Devoluciones: ${this.data.returns.length}`);
    } catch (err) {
      console.error('[Firebase] Error durante la sincronización inicial con Firestore:', err);
    }
  }

  private activeUnsubscribes: Array<() => void> = [];

  private setupFirestoreRealtimeListeners() {
    if (!this.firestore) return;
    try {
      // Clean up any existing listeners before attaching new ones
      for (const unsub of this.activeUnsubscribes) {
        try {
          unsub();
        } catch {
          // ignore
        }
      }
      this.activeUnsubscribes = [];

      const collectionsToListen = [
        'products',
        'departments',
        'registers',
        'shifts',
        'sales',
        'returns',
        'customers',
        'customerMovements',
        'holdTickets',
        'commonProducts',
        'promotions',
        'suppliers',
        'purchases',
        'supplierPayments',
        'fiscalInvoices',
        'auditLogs',
        'batches',
        'warehouses',
        'stockTransfers',
      ];

      for (const collName of collectionsToListen) {
        let isInitial = true;
        try {
          const unsub = onSnapshot(
            collection(this.firestore, collName),
            { includeMetadataChanges: false },
            (snapshot) => {
              if (isInitial) {
                isInitial = false;
                return;
              }
              // Ignore if empty for critical structural collections
              if (snapshot.empty && (collName === 'departments' || collName === 'registers')) {
                return;
              }
              const docsData = snapshot.docs.map((d) => d.data());
              if (collName === 'products') this.data.products = docsData as Product[];
              else if (collName === 'departments') this.data.departments = docsData as Department[];
              else if (collName === 'registers') this.data.registers = docsData as CashRegister[];
              else if (collName === 'shifts') this.data.shifts = docsData as CashShift[];
              else if (collName === 'sales') this.data.sales = docsData as Sale[];
              else if (collName === 'returns') this.data.returns = docsData as SaleReturn[];
              else if (collName === 'customers') this.data.customers = docsData as Customer[];
              else if (collName === 'customerMovements') this.data.customerMovements = docsData as CustomerCreditMovement[];
              else if (collName === 'holdTickets') this.data.holdTickets = docsData as HoldTicket[];
              else if (collName === 'commonProducts') this.data.commonProducts = docsData as CommonProduct[];
              else if (collName === 'promotions') this.data.promotions = docsData as Promotion[];
              else if (collName === 'suppliers') this.data.suppliers = docsData as Supplier[];
              else if (collName === 'purchases') this.data.purchases = docsData as PurchaseInvoice[];
              else if (collName === 'supplierPayments') this.data.supplierPayments = docsData as SupplierPayment[];
              else if (collName === 'fiscalInvoices') this.data.fiscalInvoices = docsData as FiscalInvoice[];
              else if (collName === 'auditLogs') this.data.auditLogs = docsData as AuditLog[];
              else if (collName === 'batches') this.data.batches = docsData as ProductBatch[];
              else if (collName === 'warehouses') this.data.warehouses = docsData as Warehouse[];
              else if (collName === 'stockTransfers') this.data.stockTransfers = docsData as StockTransfer[];

              this.emitSync(collName);
            },
            (err: any) => {
              // Benign transient gRPC stream resets (RST_STREAM / code 13 / unavailable) are handled automatically by Firestore SDK reconnection
              if (
                err?.code === 'unavailable' ||
                err?.code === 13 ||
                err?.message?.includes('RST_STREAM') ||
                err?.message?.includes('stream')
              ) {
                // Silently allow SDK to re-establish connection
                return;
              }
              console.warn(`[Firebase Realtime] Listener en ${collName}:`, err?.message || err);
            }
          );
          this.activeUnsubscribes.push(unsub);
        } catch (subErr) {
          console.warn(`[Firebase Realtime] Error suscribiendo a ${collName}:`, subErr);
        }
      }
      console.log('[Firebase Realtime] Sincronización continua de Firestore activa y protegida.');
    } catch (err) {
      console.warn('[Firebase Realtime] Error al configurar listeners:', err);
    }
  }

  public getBootstrapData() {
    return {
      products: this.getProducts(),
      departments: this.data.departments,
      customers: this.data.customers,
      customerMovements: this.data.customerMovements,
      sales: this.data.sales,
      returns: this.data.returns,
      registers: this.data.registers,
      shifts: this.data.shifts,
      cashMovements: this.data.cashMovements,
      cashiers: sanitizeCashiers(this.data.cashiers),
      holdTickets: this.data.holdTickets,
      commonProducts: this.data.commonProducts,
      shortcutsConfig: this.data.shortcutsConfig,
      employeeDiscountConfig: this.data.employeeDiscountConfig,
      promotions: this.data.promotions,
      suppliers: this.data.suppliers,
      purchases: this.data.purchases,
      supplierPayments: this.data.supplierPayments,
      fiscalInvoices: this.data.fiscalInvoices,
      storeFiscalConfig: this.data.storeFiscalConfig,
      auditLogs: this.data.auditLogs,
      batches: this.data.batches,
      warehouses: this.data.warehouses,
      stockTransfers: this.data.stockTransfers,
      loyaltyConfig: this.data.loyaltyConfig,
    };
  }

  private sanitizeForFirestore(obj: any): any {
    if (obj === undefined) {
      return null;
    }
    if (obj === null) {
      return null;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeForFirestore(item));
    }
    if (typeof obj === 'object') {
      const clean: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value === undefined) {
          clean[key] = null;
        } else {
          clean[key] = this.sanitizeForFirestore(value);
        }
      }
      return clean;
    }
    return obj;
  }

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

  private async removeDoc(collName: string, docId: string) {
    this.emitSync(collName, { docId, deleted: true });
    if (!this.firestore) return;
    try {
      await deleteDoc(doc(this.firestore, collName, docId));
    } catch (err) {
      console.error(`[Firebase] Error al eliminar documento ${collName}/${docId}:`, err);
    }
  }

  private async syncCollection(collName: string, items: any[]) {
    this.emitSync(collName, { count: items.length });
    if (!this.firestore) return;
    try {
      for (const item of items) {
        if (item.id) {
          const sanitized = this.sanitizeForFirestore(item);
          await setDoc(doc(this.firestore, collName, item.id), sanitized);
        }
      }
    } catch (err) {
      console.error(`[Firebase] Error sincronizando colección ${collName}:`, err);
    }
  }

  // Purge test, sample, or dummy records from Firestore and memory
  public async purgeTestData() {
    console.log('[Store] Ejecutando purga completa de registros de prueba y testeo...');

    // 1. Clientes de prueba (por id, QA, test, prueba)
    const testCustomers = this.data.customers.filter(c =>
      c.id === 'cust-1787008346282' ||
      /qa\s*test|tester|prueba|automatizad/i.test(c.name || '') ||
      /qa\s*test|tester|prueba|automatizad/i.test(c.notes || '')
    );
    for (const c of testCustomers) {
      await this.removeDoc('customers', c.id);
    }
    this.data.customers = this.data.customers.filter(c => !testCustomers.some(tc => tc.id === c.id));

    // 2. Movimientos de cuenta de clientes de prueba
    const testCustIds = new Set(testCustomers.map(c => c.id).concat(['cust-1787008346282']));
    const testMovements = this.data.customerMovements.filter(m =>
      m.id === 'cmov-1787008346887' ||
      testCustIds.has(m.customerId) ||
      /test|prueba|qa/i.test(m.description || '')
    );
    for (const m of testMovements) {
      await this.removeDoc('customerMovements', m.id);
    }
    this.data.customerMovements = this.data.customerMovements.filter(m => !testMovements.some(tm => tm.id === m.id));

    // 3. Devoluciones de prueba
    const testReturns = this.data.returns.filter(r =>
      r.id === 'ret-1787008347162' ||
      /qa\s*test|prueba/i.test(r.reason || '') ||
      r.shiftId === 'shift-1787008346316'
    );
    for (const r of testReturns) {
      await this.removeDoc('returns', r.id);
    }
    this.data.returns = this.data.returns.filter(r => !testReturns.some(tr => tr.id === r.id));

    // 4. Turnos de prueba
    const testShifts = this.data.shifts.filter(s =>
      s.id === 'shift-1787008346316' ||
      s.id === 'shift-sample-1' ||
      /qa\s*test|prueba/i.test(s.notes || '')
    );
    for (const s of testShifts) {
      await this.removeDoc('shifts', s.id);
    }
    this.data.shifts = this.data.shifts.filter(s => !testShifts.some(ts => ts.id === s.id));

    // 5. Movimientos de caja de prueba
    const testCashMovements = this.data.cashMovements.filter(m =>
      m.id === 'cm-1787008346364' ||
      m.id === 'cm-1787008346409' ||
      m.id === 'cm-1787008347162' ||
      m.shiftId === 'shift-1787008346316' ||
      /qa\s*test|prueba/i.test(m.concept || '')
    );
    for (const m of testCashMovements) {
      await this.removeDoc('cashMovements', m.id);
    }
    this.data.cashMovements = this.data.cashMovements.filter(m => !testCashMovements.some(tm => tm.id === m.id));

    // 6. Lotes de prueba / mock
    const testBatches = this.data.batches.filter(b =>
      (b.id.startsWith('batch-') && ['batch-1', 'batch-2', 'batch-3', 'batch-4'].includes(b.id)) ||
      b.productId.startsWith('prod-sample-') ||
      /sample|prueba|test/i.test(b.productName || '') ||
      /sample|prueba|test/i.test(b.notes || '')
    );
    for (const b of testBatches) {
      await this.removeDoc('batches', b.id);
    }
    this.data.batches = this.data.batches.filter(b => !testBatches.some(tb => tb.id === b.id));

    // 7. Transferencias de stock de prueba
    const testTransfers = this.data.stockTransfers.filter(t =>
      t.id === 'trf-1' ||
      t.items.some(it => it.productId.startsWith('prod-sample-')) ||
      /sample|prueba|test/i.test(t.notes || '')
    );
    for (const t of testTransfers) {
      await this.removeDoc('stockTransfers', t.id);
    }
    this.data.stockTransfers = this.data.stockTransfers.filter(t => !testTransfers.some(tt => tt.id === t.id));

    // 8. Registros de auditoría de prueba
    const testAuditLogs = this.data.auditLogs.filter(a =>
      ['audit-1', 'audit-2', 'audit-3', 'audit-4', 'audit-5', 'audit-1788392645437-3112'].includes(a.id) ||
      a.entityId?.startsWith('prod-sample-') ||
      a.entityId === 'shift-sample-1' ||
      /qa\s*test|sample|prueba/i.test(a.summary || '')
    );
    for (const a of testAuditLogs) {
      await this.removeDoc('auditLogs', a.id);
    }
    this.data.auditLogs = this.data.auditLogs.filter(a => !testAuditLogs.some(ta => ta.id === a.id));

    // 9. Proveedores de prueba eliminados
    const testSuppliers = this.data.suppliers.filter(s =>
      ['supp-1', 'supp-2', 'supp-3'].includes(s.id) ||
      /sample|prueba|test/i.test(s.name || '')
    );
    for (const s of testSuppliers) {
      await this.removeDoc('suppliers', s.id);
    }
    this.data.suppliers = this.data.suppliers.filter(s => !testSuppliers.some(ts => ts.id === s.id));

    // 10. Movimientos de puntos de clientes de prueba
    const testPointsMovements = (this.data.customerPointsMovements || []).filter(pm =>
      testCustIds.has(pm.customerId) || /test|prueba/i.test(pm.description || '')
    );
    for (const pm of testPointsMovements) {
      await this.removeDoc('customerPointsMovements', pm.id);
    }
    this.data.customerPointsMovements = (this.data.customerPointsMovements || []).filter(
      pm => !testPointsMovements.some(tpm => tpm.id === pm.id)
    );

    // Emitir eventos para que cualquier cliente conectado actualice sus listas en tiempo real
    this.emitSync('customers', { count: this.data.customers.length });
    this.emitSync('customerMovements', { count: this.data.customerMovements.length });
    this.emitSync('returns', { count: this.data.returns.length });
    this.emitSync('shifts', { count: this.data.shifts.length });
    this.emitSync('cashMovements', { count: this.data.cashMovements.length });
    this.emitSync('batches', { count: this.data.batches.length });
    this.emitSync('stockTransfers', { count: this.data.stockTransfers.length });
    this.emitSync('auditLogs', { count: this.data.auditLogs.length });
    this.emitSync('suppliers', { count: this.data.suppliers.length });
    this.emitSync('customerPointsMovements', { count: this.data.customerPointsMovements.length });

    console.log('[Store] Purga de datos de prueba completada exitosamente.');
    return {
      purgedCustomers: testCustomers.length,
      purgedCustomerMovements: testMovements.length,
      purgedReturns: testReturns.length,
      purgedShifts: testShifts.length,
      purgedCashMovements: testCashMovements.length,
      purgedBatches: testBatches.length,
      purgedStockTransfers: testTransfers.length,
      purgedAuditLogs: testAuditLogs.length,
      purgedSuppliers: testSuppliers.length,
      purgedCustomerPointsMovements: testPointsMovements.length,
    };
  }

  // Clear all test data from Firestore and memory
  public async resetSeed() {
    this.data.products = [];
    this.data.customers = [];
    this.data.customerMovements = [];
    this.data.sales = [];
    this.data.shifts = [];
    this.data.cashMovements = [];
    this.data.holdTickets = [];
    this.data.commonProducts = [];
    this.data.promotions = [];
    this.data.batches = [];
    this.data.stockTransfers = [];
    this.data.auditLogs = [];
    this.data.suppliers = [];
    this.data.purchases = [];
    this.data.supplierPayments = [];
    this.data.fiscalInvoices = [];
    this.data.customerPointsMovements = [];
    this.data.departments = [...defaultDepartments];
    this.data.registers = [...defaultRegisters];
    this.data.cashiers = [...defaultCashiers];
    this.data.warehouses = [...defaultWarehouses];
    this.data.shortcutsConfig = [...defaultShortcuts];
    this.data.ticketCounter = 1001;
    this.data.returnCounter = 2001;
    this.data.invoiceCounter = 1001;
    this.data.transferCounter = 102;

    if (this.firestore) {
      try {
        const collectionsToClear = [
          'products',
          'customers',
          'customerMovements',
          'sales',
          'returns',
          'shifts',
          'cashMovements',
          'holdTickets',
          'commonProducts',
          'promotions',
          'batches',
          'stockTransfers',
          'auditLogs',
          'suppliers',
          'purchases',
          'supplierPayments',
          'fiscalInvoices',
          'customerPointsMovements',
        ];

        for (const coll of collectionsToClear) {
          const snap = await getDocs(collection(this.firestore, coll));
          for (const docSnap of snap.docs) {
            await deleteDoc(docSnap.ref);
          }
        }

        await this.syncCollection('departments', defaultDepartments);
        await this.syncCollection('registers', defaultRegisters);
        await this.syncCollection('cashiers', defaultCashiers);
        await this.syncCollection('warehouses', defaultWarehouses);
        await this.persistDoc('config', 'shortcuts', { shortcuts: defaultShortcuts });
        await this.persistDoc('config', 'ticketCounter', { value: 1001 });
        await this.persistDoc('config', 'returnCounter', { value: 2001 });
        await this.persistDoc('config', 'invoiceCounter', { value: 1001 });
        await this.persistDoc('config', 'loyaltyProgram', defaultLoyaltyConfig);

        console.log('[Firebase] Base de datos limpiada y reseteada a estado limpio en Firestore.');
      } catch (err) {
        console.error('[Firebase] Error al resetear datos en Firestore:', err);
      }
    }
  }

  // Shortcuts Config CRUD
  public getShortcutsConfig(): KeyboardShortcutConfig[] {
    return this.data.shortcutsConfig || defaultShortcuts;
  }

  public saveShortcutsConfig(shortcuts: KeyboardShortcutConfig[]): KeyboardShortcutConfig[] {
    if (Array.isArray(shortcuts)) {
      this.data.shortcutsConfig = shortcuts;
      this.persistDoc('config', 'shortcuts', { shortcuts });
    }
    return this.data.shortcutsConfig;
  }

  // API Getters
  public getProducts(includeDeleted = false) { 
    if (includeDeleted) return this.data.products;
    return this.data.products.filter(p => !p.isDeleted); 
  }
  public getDepartments() { return this.data.departments; }
  public getCustomers(includeDeleted = false) { 
    if (includeDeleted) return this.data.customers;
    return this.data.customers.filter(c => !c.isDeleted); 
  }
  public getCustomerMovements() { return this.data.customerMovements; }
  public getSales() { return this.data.sales; }
  public getReturns() { return this.data.returns; }
  public getRegisters() { 
    this.cleanExpiredLocks();
    return this.data.registers; 
  }
  public getShifts() { return this.data.shifts; }
  public getCashMovements() { return this.data.cashMovements; }
  public getCashiers() { 
    this.cleanExpiredLocks();
    return sanitizeCashiers(this.data.cashiers); 
  }
  public getHoldTickets() { return this.data.holdTickets; }
  public getCommonProducts() { return this.data.commonProducts; }
  public getAuditLogs(): AuditLog[] { return this.data.auditLogs || []; }

  public logAudit(logData: Partial<AuditLog> & { action: AuditActionType; summary: string }): AuditLog {
    const id = logData.id || `audit-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const newLog: AuditLog = {
      id,
      action: logData.action,
      entityType: logData.entityType || 'SYSTEM',
      entityId: logData.entityId,
      entityName: logData.entityName,
      userId: logData.userId,
      userName: logData.userName || 'Sistema / Administrador',
      userRole: logData.userRole,
      registerId: logData.registerId,
      registerName: logData.registerName,
      shiftId: logData.shiftId,
      timestamp: logData.timestamp || new Date().toISOString(),
      summary: logData.summary,
      previousValue: logData.previousValue,
      newValue: logData.newValue,
      details: logData.details,
      ipAddress: logData.ipAddress,
    };

    if (!Array.isArray(this.data.auditLogs)) {
      this.data.auditLogs = [];
    }
    this.data.auditLogs.unshift(newLog);
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 1000);
    }

    this.persistDoc('auditLogs', id, newLog);
    this.emitSync('auditLogs');
    return newLog;
  }

  // Products CRUD
  public saveProduct(prod: Partial<Product> & { barcode: string; name: string }): Product {
    const existingIndex = this.data.products.findIndex(p => p.id === prod.id || p.barcode === prod.barcode);
    const department = this.data.departments.find(d => d.id === prod.departmentId);
    const oldProd = existingIndex >= 0 ? { ...this.data.products[existingIndex] } : null;
    
    const id = prod.id || (oldProd ? oldProd.id : `prod-${Date.now()}`);
    const newProd: Product = {
      id,
      barcode: prod.barcode.trim(),
      name: prod.name.trim(),
      departmentId: prod.departmentId || 'dep-1',
      departmentName: department?.name || 'Abarrotes',
      costPrice: Number(prod.costPrice) || 0,
      salePrice: Number(prod.salePrice) || 0,
      wholesalePrice: Number(prod.wholesalePrice) || Number(prod.salePrice) || 0,
      wholesaleMinQty: Number(prod.wholesaleMinQty) || 6,
      stock: Number(prod.stock) || 0,
      minStock: Number(prod.minStock) || 5,
      unit: prod.unit || 'piece',
      image: prod.image,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      this.data.products[existingIndex] = { ...this.data.products[existingIndex], ...newProd };
    } else {
      this.data.products.unshift(newProd);
    }

    this.persistDoc('products', id, newProd);

    // Audit Logging for Price Changes and Product Creation
    if (oldProd) {
      if (oldProd.salePrice !== newProd.salePrice || oldProd.costPrice !== newProd.costPrice) {
        const oldMargin = oldProd.salePrice > 0 ? ((oldProd.salePrice - oldProd.costPrice) / oldProd.salePrice * 100).toFixed(1) : '0.0';
        const newMargin = newProd.salePrice > 0 ? ((newProd.salePrice - newProd.costPrice) / newProd.salePrice * 100).toFixed(1) : '0.0';
        this.logAudit({
          action: 'PRICE_CHANGE',
          entityType: 'PRODUCT',
          entityId: newProd.id,
          entityName: newProd.name,
          summary: `Cambio de precio en "${newProd.name}": Venta $${oldProd.salePrice.toFixed(2)} → $${newProd.salePrice.toFixed(2)} | Costo $${oldProd.costPrice.toFixed(2)} → $${newProd.costPrice.toFixed(2)}`,
          previousValue: { salePrice: oldProd.salePrice, costPrice: oldProd.costPrice, marginPercent: oldMargin },
          newValue: { salePrice: newProd.salePrice, costPrice: newProd.costPrice, marginPercent: newMargin },
          details: { barcode: newProd.barcode, department: newProd.departmentName },
        });
      }
    } else {
      this.logAudit({
        action: 'PRODUCT_CREATED',
        entityType: 'PRODUCT',
        entityId: newProd.id,
        entityName: newProd.name,
        summary: `Creación de nuevo producto "${newProd.name}" (${newProd.barcode}) - Venta: $${newProd.salePrice.toFixed(2)}, Costo: $${newProd.costPrice.toFixed(2)}`,
        newValue: { ...newProd },
      });
    }

    return newProd;
  }

  public importProductsBatch(items: any[]): { count: number; updated: number; created: number } {
    let created = 0;
    let updated = 0;

    for (const item of items) {
      const barcode = String(item.barcode || item.Codigo || item.Código || item.codigo || '').trim();
      const name = String(item.name || item.Descripcion || item.Descripción || item.descripcion || item.Nombre || '').trim();
      if (!name) continue;

      const costPrice = Number(item.costPrice ?? item['Precio Costo'] ?? item.costo ?? item.Costo) || 0;
      const salePrice = Number(item.salePrice ?? item['Precio Venta'] ?? item.venta ?? item.Venta) || 0;
      const wholesalePrice = Number(item.wholesalePrice ?? item['Precio Mayoreo'] ?? item.mayoreo ?? item.Mayoreo) || salePrice;
      const stock = Number(item.stock ?? item.Inventario ?? item.inventario ?? item.Stock) || 0;
      const minStock = Number(item.minStock ?? item['Inv. Minimo'] ?? item['Inv. Mínimo'] ?? item['Inv Minimo'] ?? item.minimo) || 5;
      const departmentName = String(item.departmentName || item.Departamento || item.departamento || 'Abarrotes').trim();

      // Find or create department
      let dept = this.data.departments.find(d => d.name.toLowerCase() === departmentName.toLowerCase());
      if (!dept && departmentName) {
        dept = {
          id: `dep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: departmentName,
          color: 'bg-blue-600',
        };
        this.data.departments.push(dept);
        this.persistDoc('departments', dept.id, dept);
      }

      const existingIndex = barcode
        ? this.data.products.findIndex(p => p.barcode === barcode)
        : this.data.products.findIndex(p => p.name.toLowerCase() === name.toLowerCase());

      const productData: Product = {
        id: existingIndex >= 0 ? this.data.products[existingIndex].id : `prod-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        barcode: barcode || `779${Math.floor(10000000 + Math.random() * 90000000)}`,
        name,
        departmentId: dept?.id || 'dep-1',
        departmentName: dept?.name || 'Abarrotes',
        costPrice,
        salePrice,
        wholesalePrice,
        wholesaleMinQty: existingIndex >= 0 ? this.data.products[existingIndex].wholesaleMinQty : 6,
        stock,
        minStock,
        unit: 'piece',
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        this.data.products[existingIndex] = { ...this.data.products[existingIndex], ...productData };
        updated++;
      } else {
        this.data.products.unshift(productData);
        created++;
      }

      this.persistDoc('products', productData.id, productData);
    }

    return { count: created + updated, created, updated };
  }

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

  public adjustStock(productId: string, quantityDelta: number, reason: string): Product | null {
    const prod = this.data.products.find(p => p.id === productId);
    if (!prod) return null;
    const oldStock = prod.stock;
    prod.stock = Math.max(0, Number((prod.stock + quantityDelta).toFixed(3)));
    prod.updatedAt = new Date().toISOString();
    this.persistDoc('products', prod.id, prod);

    this.logAudit({
      action: 'STOCK_ADJUSTMENT',
      entityType: 'STOCK',
      entityId: prod.id,
      entityName: prod.name,
      summary: `Ajuste de inventario en "${prod.name}": ${quantityDelta >= 0 ? '+' : ''}${quantityDelta} ${prod.unit === 'kg' ? 'kg' : 'un.'} (${reason || 'Ajuste manual'})`,
      previousValue: { stock: oldStock },
      newValue: { stock: prod.stock },
      details: { delta: quantityDelta, reason, unit: prod.unit },
    });

    return prod;
  }

  // Promotion Operations
  public getPromotions(): Promotion[] {
    return this.data.promotions || [];
  }

  public savePromotion(promoData: Partial<Promotion> & { code: string; name: string }): Promotion {
    if (!promoData.code || !promoData.code.trim()) {
      throw new Error('El código de promoción es obligatorio');
    }
    if (!promoData.name || !promoData.name.trim()) {
      throw new Error('El nombre de la promoción es obligatorio');
    }

    const code = promoData.code.trim().toUpperCase();
    const id = promoData.id || `promo-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Check duplicate code
    const duplicate = this.data.promotions.find(p => p.code.toUpperCase() === code && p.id !== id);
    if (duplicate) {
      throw new Error(`Ya existe una promoción con el código "${code}" (${duplicate.name})`);
    }

    const type = promoData.type || 'COMBO';

    let sanitizedItems: PromotionItem[] = [];
    if (Array.isArray(promoData.items) && promoData.items.length > 0) {
      sanitizedItems = promoData.items.map(item => {
        const product = this.data.products.find(p => p.id === item.productId);
        return {
          productId: item.productId,
          productName: item.productName || product?.name || 'Producto',
          productBarcode: item.productBarcode || product?.barcode,
          quantity: Math.max(1, Number(item.quantity) || 1),
          unitPrice: item.unitPrice ?? product?.salePrice ?? 0,
        };
      });
    } else if (promoData.targetProductId) {
      const product = this.data.products.find(p => p.id === promoData.targetProductId);
      if (product) {
        sanitizedItems = [
          {
            productId: product.id,
            productName: product.name,
            productBarcode: product.barcode,
            quantity: Number(promoData.minQuantity) || 1,
            unitPrice: product.salePrice,
          },
        ];
      }
    }

    const promotion: Promotion = {
      id,
      code,
      name: promoData.name.trim(),
      type,
      description: promoData.description ? promoData.description.trim() : undefined,
      price: Number(promoData.price) || 0,
      discountPercentage: promoData.discountPercentage !== undefined ? Number(promoData.discountPercentage) : undefined,
      discountAmount: promoData.discountAmount !== undefined ? Number(promoData.discountAmount) : undefined,
      targetProductId: promoData.targetProductId || undefined,
      targetDepartmentId: promoData.targetDepartmentId || undefined,
      minQuantity: promoData.minQuantity !== undefined ? Number(promoData.minQuantity) : undefined,
      payQuantity: promoData.payQuantity !== undefined ? Number(promoData.payQuantity) : undefined,
      secondUnitDiscountPercent: promoData.secondUnitDiscountPercent !== undefined ? Number(promoData.secondUnitDiscountPercent) : undefined,
      status: promoData.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      items: sanitizedItems,
      activeDays: Array.isArray(promoData.activeDays) ? promoData.activeDays : undefined,
      startDate: promoData.startDate || undefined,
      endDate: promoData.endDate || undefined,
      startTime: promoData.startTime || undefined,
      endTime: promoData.endTime || undefined,
      createdAt: promoData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existingIndex = this.data.promotions.findIndex(p => p.id === id);
    if (existingIndex >= 0) {
      this.data.promotions[existingIndex] = promotion;
    } else {
      this.data.promotions.unshift(promotion);
    }

    this.persistDoc('promotions', id, promotion);
    this.emitSync('promotions', promotion);

    this.logAudit({
      action: 'PROMOTION_SAVED',
      entityType: 'PROMO',
      entityId: promotion.id,
      entityName: promotion.name,
      summary: `Configuración de Promoción "${promotion.name}" (${promotion.code} - ${promotion.type}): ${promotion.type === 'COMBO' ? `$${promotion.price?.toFixed(2)}` : promotion.type === 'PERCENTAGE_DISCOUNT' ? `${promotion.discountPercentage}% OFF` : promotion.type}`,
      newValue: { ...promotion },
    });

    return promotion;
  }

  public deletePromotion(id: string): boolean {
    const promo = this.data.promotions.find(p => p.id === id);
    const prevLen = this.data.promotions.length;
    this.data.promotions = this.data.promotions.filter(p => p.id !== id);
    this.removeDoc('promotions', id);

    if (promo) {
      this.logAudit({
        action: 'PROMOTION_DELETED',
        entityType: 'PROMO',
        entityId: promo.id,
        entityName: promo.name,
        summary: `Eliminación de la promoción "${promo.name}" (Código: ${promo.code})`,
        previousValue: { ...promo },
      });
    }

    return this.data.promotions.length < prevLen;
  }

  public togglePromotionStatus(id: string): Promotion | null {
    const promo = this.data.promotions.find(p => p.id === id);
    if (!promo) return null;
    promo.status = promo.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    promo.updatedAt = new Date().toISOString();
    this.persistDoc('promotions', promo.id, promo);
    return promo;
  }

  // Cash Register & Shift Operations
  public saveRegister(reg: Partial<CashRegister> & { name: string }): CashRegister {
    const existingIndex = this.data.registers.findIndex(r => r.id === reg.id);
    const id = reg.id || `reg-${Date.now()}`;
    const newReg: CashRegister = {
      id,
      name: reg.name,
      location: reg.location || 'Local Comercial',
      isMain: reg.isMain || false,
      isOpen: reg.isOpen ?? false,
      currentCashierId: reg.currentCashierId,
      currentCashierName: reg.currentCashierName,
      activeShiftId: reg.activeShiftId,
    };

    if (existingIndex >= 0) {
      this.data.registers[existingIndex] = { ...this.data.registers[existingIndex], ...newReg };
    } else {
      this.data.registers.push(newReg);
    }

    this.persistDoc('registers', id, newReg);
    return newReg;
  }

  public deleteRegister(id: string) {
    const reg = this.data.registers.find(r => r.id === id);
    if (!reg) return;

    // 1. Close any open shift associated with this register
    for (const shift of this.data.shifts) {
      if (shift.registerId === id && shift.status === 'OPEN') {
        shift.status = 'CLOSED';
        shift.closedAt = new Date().toISOString();
        shift.declaredCash = shift.expectedCash;
        shift.difference = 0;
        shift.notes = (shift.notes ? shift.notes + ' - ' : '') + 'Cierre automático por eliminación de caja';
        this.persistDoc('shifts', shift.id, shift);

        // Release cashier lock
        const cashier = this.data.cashiers.find(c => c.id === shift.cashierId);
        if (cashier) {
          cashier.isLoggedIn = false;
          cashier.activeDeviceId = undefined;
          cashier.activeRegisterId = undefined;
          cashier.lastHeartbeat = undefined;
          this.persistDoc('cashiers', cashier.id, cashier);
        }
      }
    }

    // 2. Remove register doc and state
    this.data.registers = this.data.registers.filter(r => r.id !== id);
    this.removeDoc('registers', id);

    this.emitSync('shifts');
    this.emitSync('registers');
    this.emitSync('cashiers');
  }

  public forceCloseRegisterShift(registerId: string): CashShift | null {
    let closedShift: CashShift | null = null;

    // 1. Close any open shift on this register
    for (const shift of this.data.shifts) {
      if (shift.registerId === registerId && shift.status === 'OPEN') {
        shift.status = 'CLOSED';
        shift.closedAt = new Date().toISOString();
        shift.declaredCash = shift.expectedCash;
        shift.difference = 0;
        shift.notes = (shift.notes ? shift.notes + ' - ' : '') + 'Cierre administrativo forzado de caja';
        this.persistDoc('shifts', shift.id, shift);
        closedShift = shift;

        // Release cashier
        const cashier = this.data.cashiers.find(c => c.id === shift.cashierId);
        if (cashier) {
          cashier.isLoggedIn = false;
          cashier.activeDeviceId = undefined;
          cashier.activeRegisterId = undefined;
          cashier.lastHeartbeat = undefined;
          this.persistDoc('cashiers', cashier.id, cashier);
        }
      }
    }

    // 2. Clear register open status
    const register = this.data.registers.find(r => r.id === registerId);
    if (register) {
      register.isOpen = false;
      register.activeShiftId = undefined;
      register.activeDeviceId = undefined;
      register.currentCashierId = undefined;
      register.currentCashierName = undefined;
      register.lastHeartbeat = undefined;
      this.persistDoc('registers', register.id, register);
    }

    this.emitSync('shifts');
    this.emitSync('registers');
    this.emitSync('cashiers');
    return closedShift;
  }

  // Concurrency Session Lock Handlers & Heartbeat
  private SESSION_TIMEOUT_MS = 35 * 1000; // 35s inactivity timeout for disconnected / closed tabs

  public cleanExpiredLocks() {
    const now = Date.now();
    let cashiersChanged = false;
    let registersChanged = false;

    // 1. Clean inactive cashiers
    for (const cashier of this.data.cashiers) {
      if (cashier.isLoggedIn || cashier.activeDeviceId) {
        const lastSeen = cashier.lastHeartbeat || 0;
        if (now - lastSeen > this.SESSION_TIMEOUT_MS) {
          cashier.isLoggedIn = false;
          cashier.activeDeviceId = undefined;
          cashier.activeRegisterId = undefined;
          cashier.lastHeartbeat = undefined;
          this.persistDoc('cashiers', cashier.id, cashier);
          cashiersChanged = true;
        }
      }
    }

    // 2. Clean inactive registers
    for (const register of this.data.registers) {
      const openShift = this.data.shifts.find(s => s.registerId === register.id && s.status === 'OPEN');
      if (!openShift) {
        // If there is NO open shift, register should NOT be marked open or assigned to a cashier
        if (register.isOpen || register.activeShiftId || register.currentCashierId || register.currentCashierName || register.activeDeviceId) {
          register.isOpen = false;
          register.activeShiftId = undefined;
          register.currentCashierId = undefined;
          register.currentCashierName = undefined;
          register.activeDeviceId = undefined;
          register.lastHeartbeat = undefined;
          this.persistDoc('registers', register.id, register);
          registersChanged = true;
        }
      } else {
        // There is an open shift. Ensure register knows about the shift
        if (!register.isOpen || register.activeShiftId !== openShift.id || register.currentCashierId !== openShift.cashierId) {
          register.isOpen = true;
          register.activeShiftId = openShift.id;
          register.currentCashierId = openShift.cashierId;
          register.currentCashierName = openShift.cashierName;
          this.persistDoc('registers', register.id, register);
          registersChanged = true;
        }
        // If device heartbeat is expired, clear device binding so cashier can reconnect from any browser/tab
        const lastSeen = register.lastHeartbeat || 0;
        if (register.activeDeviceId && now - lastSeen > this.SESSION_TIMEOUT_MS) {
          register.activeDeviceId = undefined;
          register.lastHeartbeat = undefined;
          this.persistDoc('registers', register.id, register);
          registersChanged = true;
        }
      }
    }

    if (cashiersChanged) this.emitSync('cashiers');
    if (registersChanged) this.emitSync('registers');
  }

  public isCashierActiveElsewhere(cashier: Cashier, deviceId: string): boolean {
    if (!cashier.isLoggedIn || !cashier.activeDeviceId) return false;
    if (cashier.activeDeviceId === deviceId) return false;
    const lastSeen = cashier.lastHeartbeat || 0;
    // Expired lock if no heartbeat for > 35s
    if (Date.now() - lastSeen > this.SESSION_TIMEOUT_MS) return false;
    return true;
  }

  public isRegisterActiveElsewhere(register: CashRegister, deviceId: string): boolean {
    if (!register.activeDeviceId) return false;
    if (register.activeDeviceId === deviceId) return false;
    const lastSeen = register.lastHeartbeat || 0;
    // Expired lock if no heartbeat for > 35s
    if (Date.now() - lastSeen > this.SESSION_TIMEOUT_MS) return false;
    return true;
  }

  public verifyAndClaimCashier(cashierId: string, deviceId: string, registerId?: string, force: boolean = false): Cashier {
    const cashier = this.data.cashiers.find(c => c.id === cashierId);
    if (!cashier) throw new Error('Usuario no encontrado');

    if (!force && this.isCashierActiveElsewhere(cashier, deviceId)) {
      throw new Error(`Acceso denegado: El usuario "${cashier.name}" ya tiene una sesión activa en otra terminal/dispositivo.`);
    }

    cashier.isLoggedIn = true;
    cashier.activeDeviceId = deviceId;
    cashier.lastHeartbeat = Date.now();
    if (registerId) cashier.activeRegisterId = registerId;
    this.persistDoc('cashiers', cashier.id, cashier);
    this.emitSync('cashiers');
    return cashier;
  }

  public releaseCashierSession(cashierId: string, deviceId?: string, force: boolean = false) {
    const cashier = this.data.cashiers.find(c => c.id === cashierId);
    if (!cashier) return;

    // Strict validation: Prevent logging out if cashier has an OPEN shift unless forced
    const openShift = this.data.shifts.find(s => s.cashierId === cashierId && s.status === 'OPEN');
    if (openShift && !force) {
      throw new Error(`No es posible cerrar sesión: Tienes la caja "${openShift.registerName}" abierta. Es obligatorio realizar el corte y cierre de caja antes de salir.`);
    }

    if (!deviceId || cashier.activeDeviceId === deviceId || force) {
      cashier.isLoggedIn = false;
      cashier.activeDeviceId = undefined;
      cashier.activeRegisterId = undefined;
      cashier.lastHeartbeat = undefined;
      this.persistDoc('cashiers', cashier.id, cashier);
      this.emitSync('cashiers');
    }
  }

  public verifyAndClaimRegister(registerId: string, deviceId: string, cashierId?: string, force: boolean = false): CashRegister {
    const register = this.data.registers.find(r => r.id === registerId);
    if (!register) throw new Error('Caja no encontrada');

    if (!force && this.isRegisterActiveElsewhere(register, deviceId)) {
      throw new Error(`Acceso denegado: La caja "${register.name}" ya está en uso en otra terminal.`);
    }

    register.activeDeviceId = deviceId;
    register.lastHeartbeat = Date.now();
    if (cashierId) register.currentCashierId = cashierId;
    this.persistDoc('registers', register.id, register);
    this.emitSync('registers');
    return register;
  }

  public releaseRegisterSession(registerId: string, deviceId?: string, force: boolean = false) {
    const register = this.data.registers.find(r => r.id === registerId);
    if (!register) return;

    const openShift = this.data.shifts.find(s => s.registerId === registerId && s.status === 'OPEN');
    if (openShift && !force) {
      throw new Error(`No es posible liberar la caja "${register.name}" porque tiene un turno abierto activo. Realiza el cierre de caja primero.`);
    }

    if (!deviceId || register.activeDeviceId === deviceId || force) {
      register.activeDeviceId = undefined;
      if (!openShift) {
        register.isOpen = false;
        register.activeShiftId = undefined;
        register.currentCashierId = undefined;
        register.currentCashierName = undefined;
      }
      register.lastHeartbeat = undefined;
      this.persistDoc('registers', register.id, register);
      this.emitSync('registers');
    }
  }

  public heartbeat(deviceId: string, cashierId?: string, registerId?: string) {
    let cashierValid = true;
    let registerValid = true;

    if (cashierId) {
      const cashier = this.data.cashiers.find(c => c.id === cashierId);
      if (cashier) {
        if (cashier.activeDeviceId === deviceId || !cashier.activeDeviceId || !cashier.isLoggedIn) {
          cashier.activeDeviceId = deviceId;
          cashier.isLoggedIn = true;
          cashier.lastHeartbeat = Date.now();
          this.persistDoc('cashiers', cashier.id, cashier);
        } else if (this.isCashierActiveElsewhere(cashier, deviceId)) {
          cashierValid = false;
        }
      }
    }

    if (registerId) {
      const register = this.data.registers.find(r => r.id === registerId);
      if (register) {
        if (register.activeDeviceId === deviceId || !register.activeDeviceId) {
          register.activeDeviceId = deviceId;
          register.lastHeartbeat = Date.now();
          this.persistDoc('registers', register.id, register);
        } else if (this.isRegisterActiveElsewhere(register, deviceId)) {
          registerValid = false;
        }
      }
    }

    return { success: true, cashierValid, registerValid };
  }

  public forceUnlockSession(type: 'cashier' | 'register' | 'all', id?: string) {
    if (type === 'cashier' && id) {
      const cashier = this.data.cashiers.find(c => c.id === id);
      if (cashier) {
        cashier.isLoggedIn = false;
        cashier.activeDeviceId = undefined;
        cashier.activeRegisterId = undefined;
        cashier.lastHeartbeat = undefined;
        this.persistDoc('cashiers', cashier.id, cashier);
        this.emitSync('cashiers');
      }
    } else if (type === 'register' && id) {
      const register = this.data.registers.find(r => r.id === id);
      if (register) {
        const openShift = this.data.shifts.find(s => s.registerId === id && s.status === 'OPEN');
        if (!openShift) {
          register.isOpen = false;
          register.activeShiftId = undefined;
          register.currentCashierId = undefined;
          register.currentCashierName = undefined;
        }
        register.activeDeviceId = undefined;
        register.lastHeartbeat = undefined;
        this.persistDoc('registers', register.id, register);
        this.emitSync('registers');
      }
    } else if (type === 'all') {
      for (const c of this.data.cashiers) {
        c.isLoggedIn = false;
        c.activeDeviceId = undefined;
        c.activeRegisterId = undefined;
        c.lastHeartbeat = undefined;
        this.persistDoc('cashiers', c.id, c);
      }
      for (const r of this.data.registers) {
        const openShift = this.data.shifts.find(s => s.registerId === r.id && s.status === 'OPEN');
        if (!openShift) {
          r.isOpen = false;
          r.activeShiftId = undefined;
          r.currentCashierId = undefined;
          r.currentCashierName = undefined;
        }
        r.activeDeviceId = undefined;
        r.lastHeartbeat = undefined;
        this.persistDoc('registers', r.id, r);
      }
      this.emitSync('cashiers');
      this.emitSync('registers');
    }
    return { success: true };
  }

  public openShift(registerId: string, cashierId: string, initialCash: number, deviceId?: string): CashShift {
    const register = this.data.registers.find(r => r.id === registerId);
    const cashier = this.data.cashiers.find(c => c.id === cashierId);
    if (!register) throw new Error('Caja no encontrada');
    if (!cashier) throw new Error('Cajero no encontrado');

    // Strict rule: 1 Cashier = 1 Open Shift only
    const existingCashierShift = this.data.shifts.find(s => s.cashierId === cashierId && s.status === 'OPEN');
    if (existingCashierShift) {
      throw new Error(`El usuario "${cashier.name}" ya tiene un turno abierto en la caja "${existingCashierShift.registerName}". Es obligatorio cerrar el turno previo antes de abrir otro.`);
    }

    // Strict rule: 1 Register = 1 Open Shift only
    const existingRegisterShift = this.data.shifts.find(s => s.registerId === registerId && s.status === 'OPEN');
    if (existingRegisterShift) {
      throw new Error(`La caja "${register.name}" ya cuenta con un turno abierto activo por ${existingRegisterShift.cashierName}. No se permite duplicar aperturas de caja.`);
    }

    if (deviceId && this.isRegisterActiveElsewhere(register, deviceId)) {
      throw new Error(`No se puede abrir turno: La caja "${register.name}" ya está en uso en otra terminal.`);
    }
    if (deviceId && this.isCashierActiveElsewhere(cashier, deviceId)) {
      throw new Error(`No se puede abrir turno: El usuario "${cashier.name}" ya tiene sesión activa en otra terminal.`);
    }

    const id = `shift-${Date.now()}`;
    const newShift: CashShift = {
      id,
      registerId: register.id,
      registerName: register.name,
      cashierId: cashier.id,
      cashierName: cashier.name,
      openedAt: new Date().toISOString(),
      initialCash: Number(initialCash),
      expectedCash: Number(initialCash),
      totalSalesCash: 0,
      totalSalesCard: 0,
      totalSalesCredit: 0,
      totalSalesTransfer: 0,
      totalSalesQR: 0,
      totalIncomes: 0,
      totalExpenses: 0,
      status: 'OPEN',
    };

    this.data.shifts.unshift(newShift);
    register.isOpen = true;
    register.currentCashierId = cashier.id;
    register.currentCashierName = cashier.name;
    register.activeShiftId = newShift.id;
    if (deviceId) {
      register.activeDeviceId = deviceId;
      register.lastHeartbeat = Date.now();
    }

    cashier.isLoggedIn = true;
    if (deviceId) {
      cashier.activeDeviceId = deviceId;
      cashier.lastHeartbeat = Date.now();
    }
    cashier.activeRegisterId = register.id;

    this.persistDoc('shifts', id, newShift);
    this.persistDoc('registers', register.id, register);
    this.persistDoc('cashiers', cashier.id, cashier);

    this.emitSync('shifts');
    this.emitSync('registers');
    this.emitSync('cashiers');

    this.logAudit({
      action: 'SHIFT_OPEN',
      entityType: 'SHIFT',
      entityId: newShift.id,
      entityName: register.name,
      userId: cashier.id,
      userName: cashier.name,
      userRole: cashier.role,
      registerId: register.id,
      registerName: register.name,
      shiftId: newShift.id,
      summary: `Apertura de turno en "${register.name}" por ${cashier.name} con fondo de $${Number(initialCash).toFixed(2)}`,
      details: { initialCash: Number(initialCash), registerName: register.name, cashierName: cashier.name },
    });

    return newShift;
  }

  public closeShift(shiftId: string, declaredCash: number, notes?: string, deviceId?: string): CashShift {
    const shift = this.data.shifts.find(s => s.id === shiftId);
    if (!shift) throw new Error('Turno no encontrado');
    if (shift.status === 'CLOSED') throw new Error('Este turno ya ha sido cerrado previamente.');

    const calculatedDifference = Number((declaredCash - shift.expectedCash).toFixed(2));

    shift.closedAt = new Date().toISOString();
    shift.declaredCash = Number(declaredCash.toFixed(2));
    shift.difference = calculatedDifference;
    shift.notes = notes || '';
    shift.status = 'CLOSED';

    const register = this.data.registers.find(r => r.id === shift.registerId);
    if (register) {
      register.isOpen = false;
      register.activeShiftId = undefined;
      register.activeDeviceId = undefined;
      register.currentCashierId = undefined;
      register.currentCashierName = undefined;
      register.lastHeartbeat = undefined;
      this.persistDoc('registers', register.id, register);
    }

    const cashier = this.data.cashiers.find(c => c.id === shift.cashierId);
    if (cashier) {
      cashier.isLoggedIn = false;
      cashier.activeDeviceId = undefined;
      cashier.activeRegisterId = undefined;
      cashier.lastHeartbeat = undefined;
      this.persistDoc('cashiers', cashier.id, cashier);
    }

    this.persistDoc('shifts', shift.id, shift);

    this.emitSync('shifts');
    this.emitSync('registers');
    this.emitSync('cashiers');

    this.logAudit({
      action: 'SHIFT_CLOSED',
      entityType: 'SHIFT',
      entityId: shift.id,
      entityName: shift.registerName,
      userId: shift.cashierId,
      userName: shift.cashierName,
      registerId: shift.registerId,
      registerName: shift.registerName,
      shiftId: shift.id,
      summary: `Cierre de turno en "${shift.registerName}" por ${shift.cashierName}. Efectivo declarado: $${declaredCash.toFixed(2)}, Esperado: $${shift.expectedCash.toFixed(2)}, Diferencia: ${calculatedDifference >= 0 ? '+$' : '-$'}${Math.abs(calculatedDifference).toFixed(2)}`,
      details: { declaredCash, expectedCash: shift.expectedCash, difference: calculatedDifference, notes },
    });

    return shift;
  }

  // Delete Cash Cut / Shift (Single)
  public async deleteShift(shiftId: string): Promise<{ success: boolean; deletedId: string }> {
    const shift = this.data.shifts.find(s => s.id === shiftId);
    if (!shift) {
      throw new Error('El turno o cierre de caja no fue encontrado.');
    }

    // If this shift was active on a register, release the register safely
    const reg = this.data.registers.find(r => r.activeShiftId === shiftId || r.id === shift.registerId);
    if (reg && reg.activeShiftId === shiftId) {
      reg.isOpen = false;
      reg.activeShiftId = undefined;
      reg.activeDeviceId = undefined;
      reg.currentCashierId = undefined;
      reg.currentCashierName = undefined;
      reg.lastHeartbeat = undefined;
      await this.persistDoc('registers', reg.id, reg);
    }

    // If cashier was marked active in this shift
    const cashier = this.data.cashiers.find(c => c.activeRegisterId === shift.registerId);
    if (cashier && shift.status === 'OPEN') {
      cashier.activeDeviceId = undefined;
      cashier.activeRegisterId = undefined;
      cashier.lastHeartbeat = undefined;
      await this.persistDoc('cashiers', cashier.id, cashier);
    }

    // Delete associated cash movements for this shift from Firestore & memory
    const relatedMovements = this.data.cashMovements.filter(m => m.shiftId === shiftId);
    for (const mov of relatedMovements) {
      await this.removeDoc('cashMovements', mov.id);
    }
    this.data.cashMovements = this.data.cashMovements.filter(m => m.shiftId !== shiftId);

    // Delete shift from Firestore & memory
    this.data.shifts = this.data.shifts.filter(s => s.id !== shiftId);
    await this.removeDoc('shifts', shiftId);

    this.emitSync('shifts', { deletedId: shiftId });
    this.emitSync('cashMovements');
    this.emitSync('registers');
    this.emitSync('cashiers');

    this.logAudit({
      action: 'SHIFT_DELETED',
      entityType: 'SHIFT',
      entityId: shift.id,
      entityName: shift.registerName,
      userId: shift.cashierId,
      userName: shift.cashierName,
      registerId: shift.registerId,
      registerName: shift.registerName,
      shiftId: shift.id,
      summary: `Eliminación de turno/cierre de caja "${shift.registerName}" (${shift.cashierName})`,
      details: { shiftId, declaredCash: shift.declaredCash, expectedCash: shift.expectedCash, status: shift.status },
    });

    return { success: true, deletedId: shiftId };
  }

  // Delete Cash Cuts / Shifts (Batch)
  public async deleteShiftsBatch(shiftIds: string[]): Promise<{ success: boolean; count: number }> {
    let deletedCount = 0;
    for (const id of shiftIds) {
      try {
        await this.deleteShift(id);
        deletedCount++;
      } catch (err) {
        console.warn(`Error al eliminar turno ${id}:`, err);
      }
    }
    return { success: true, count: deletedCount };
  }

  // Cash In/Out Movements
  public addCashMovement(movement: { registerId: string; shiftId: string; cashierId: string; cashierName: string; type: 'INCOME' | 'EXPENSE'; amount: number; concept: string }): CashMovement {
    const register = this.data.registers.find(r => r.id === movement.registerId);
    const shift = this.data.shifts.find(s => s.id === movement.shiftId);

    const safeAmount = Number(Number(movement.amount).toFixed(2));
    const id = `cm-${Date.now()}`;
    const newMovement: CashMovement = {
      id,
      registerId: movement.registerId,
      registerName: register?.name || 'Caja',
      shiftId: movement.shiftId,
      cashierId: movement.cashierId,
      cashierName: movement.cashierName,
      type: movement.type,
      amount: safeAmount,
      concept: movement.concept,
      timestamp: new Date().toISOString(),
    };

    this.data.cashMovements.unshift(newMovement);

    if (shift && shift.status === 'OPEN') {
      if (movement.type === 'INCOME') {
        shift.totalIncomes = Number((shift.totalIncomes + safeAmount).toFixed(2));
        shift.expectedCash = Number((shift.expectedCash + safeAmount).toFixed(2));
      } else {
        shift.totalExpenses = Number((shift.totalExpenses + safeAmount).toFixed(2));
        shift.expectedCash = Number((shift.expectedCash - safeAmount).toFixed(2));
      }
      this.persistDoc('shifts', shift.id, shift);
    }

    this.persistDoc('cashMovements', id, newMovement);
    this.emitSync('cashMovements');
    if (shift) this.emitSync('shifts');

    this.logAudit({
      action: 'CASH_MOVEMENT',
      entityType: 'CASH',
      entityId: id,
      entityName: movement.type === 'INCOME' ? 'Ingreso de Efectivo' : 'Retiro / Gasto',
      userId: movement.cashierId,
      userName: movement.cashierName,
      registerId: movement.registerId,
      registerName: register?.name || 'Caja',
      shiftId: movement.shiftId,
      summary: `${movement.type === 'INCOME' ? 'Entrada de Efectivo' : 'Salida / Gasto'}: $${safeAmount.toFixed(2)} en "${register?.name || 'Caja'}" - "${movement.concept}"`,
      details: { type: movement.type, amount: safeAmount, concept: movement.concept, shiftId: movement.shiftId },
    });

    return newMovement;
  }

  // Complete Sale Logic (Atomic with Promotions support & Idempotency)
  // Complete Sale Logic (Atomic with Authoritative Pricing Engine, Promotions & Idempotency)
  public createSale(saleData: {
    registerId: string;
    shiftId: string;
    cashierId: string;
    cashierName: string;
    customerId?: string;
    items: {
      productId: string;
      quantity: number;
      unitPrice?: number;
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
  }): Sale {
    // 0. Idempotency Check
    if (saleData.clientTransactionId) {
      const cached = this.processedSaleTokens.get(saleData.clientTransactionId);
      if (cached) {
        console.log(`[Store] Idempotent hit: token ${saleData.clientTransactionId} already processed (Ticket #${cached.sale.ticketNumber})`);
        return cached.sale;
      }
      const existingInList = this.data.sales.find(s => s.clientTransactionId === saleData.clientTransactionId);
      if (existingInList) {
        this.processedSaleTokens.set(saleData.clientTransactionId, { sale: existingInList, timestamp: Date.now() });
        return existingInList;
      }
    }

    const register = this.data.registers.find(r => r.id === saleData.registerId);
    const shift = this.data.shifts.find(s => s.id === saleData.shiftId);
    const customer = saleData.customerId ? this.data.customers.find(c => c.id === saleData.customerId) : undefined;
    const cashier = this.data.cashiers.find(c => c.id === saleData.cashierId);

    if (!register) throw new Error('Caja no encontrada');
    if (!shift || shift.status !== 'OPEN') {
      throw new Error('No hay un turno de caja abierto válido para procesar esta venta.');
    }
    if (!saleData.items || saleData.items.length === 0) {
      throw new Error('No hay productos en el carrito para procesar.');
    }

    const canChangePrice = cashier && (cashier.role === 'ADMIN' || Boolean(cashier.permissions?.allowPriceChange));
    const canDiscount = cashier && (cashier.role === 'ADMIN' || Boolean(cashier.permissions?.allowDiscounts));

    // 1. Validate Items & Stock Availability
    for (const item of saleData.items) {
      if (!item.quantity || item.quantity <= 0 || !Number.isFinite(item.quantity)) {
        throw new Error(`Cantidad inválida (${item.quantity}) para el producto ${item.productId}`);
      }

      const isPromo = Boolean(item.isPromotion) || Boolean(item.promotionId) || item.productId.startsWith('promo-') || Boolean(this.data.promotions.some(p => p.id === item.productId || p.code === item.productId));

      if (isPromo) {
        const promo = this.data.promotions.find(p => p.id === item.productId || p.id === item.promotionId || p.code === item.productId || p.code === item.promotionCode);
        const promoItems = (item.promotionItems && item.promotionItems.length > 0) ? item.promotionItems : (promo?.items || []);

        if (promoItems.length === 0) {
          throw new Error(`La promoción "${promo?.name || item.productId}" no tiene productos asociados válidos.`);
        }

        for (const comp of promoItems) {
          const compProd = this.data.products.find(p => p.id === comp.productId || (comp.productBarcode && p.barcode === comp.productBarcode));
          if (!compProd) {
            throw new Error(`El producto asociado "${comp.productName || comp.productId}" no existe en el catálogo.`);
          }
          const requiredQty = Number((comp.quantity * item.quantity).toFixed(3));
          if (compProd.stock < requiredQty) {
            throw new Error(`Stock insuficiente para "${compProd.name}": Se requieren ${requiredQty} unidades pero solo quedan ${compProd.stock}.`);
          }
        }
      } else {
        const product = this.data.products.find(p => p.id === item.productId);
        if (!product) throw new Error(`Producto no encontrado en inventario: ID ${item.productId}`);
        if (product.stock < item.quantity) {
          throw new Error(`Stock insuficiente para "${product.name}": Se solicitaron ${item.quantity} unidades pero solo hay ${product.stock} en existencia.`);
        }
      }
    }

    // 2. Prepare items with server-validated prices
    const rawCartItems: CartItem[] = [];
    for (const item of saleData.items) {
      const isPromo = Boolean(item.isPromotion) || Boolean(item.promotionId) || item.productId.startsWith('promo-') || Boolean(this.data.promotions.some(p => p.id === item.productId || p.code === item.productId));

      if (isPromo) {
        const promo = this.data.promotions.find(p => p.id === item.productId || p.id === item.promotionId || p.code === item.productId || p.code === item.promotionCode);
        const promoItems = (item.promotionItems && item.promotionItems.length > 0) ? item.promotionItems : (promo?.items || []);
        const promoPrice = promo?.price ?? (canChangePrice && typeof item.unitPrice === 'number' ? item.unitPrice : 0);

        const promoSyntheticProduct: Product = {
          id: promo?.id || item.productId,
          barcode: promo?.code || item.promotionCode || 'PROMO',
          name: promo ? `[PROMO] ${promo.name}` : `[PROMO] ${item.productId}`,
          departmentId: 'dep-promos',
          departmentName: 'Promociones',
          costPrice: 0,
          salePrice: promoPrice,
          wholesalePrice: promoPrice,
          wholesaleMinQty: 999,
          stock: 999,
          minStock: 0,
          unit: 'piece',
          updatedAt: new Date().toISOString(),
        };

        const discPercent = (canDiscount || customer?.isEmployee) ? Math.min(100, Math.max(0, item.discountPercentage || 0)) : 0;

        rawCartItems.push({
          productId: promo?.id || item.productId,
          product: promoSyntheticProduct,
          quantity: item.quantity,
          unitPrice: promoPrice,
          originalUnitPrice: promoPrice,
          isWholesaleApplied: false,
          discountPercentage: discPercent,
          subtotal: roundCurrency(promoPrice * item.quantity),
          total: roundCurrency(promoPrice * item.quantity),
          isPromotion: true,
          promotionId: promo?.id,
          promotionCode: promo?.code,
          promotionItems: promoItems,
        });
      } else {
        const product = this.data.products.find(p => p.id === item.productId)!;
        const isWholesale = item.quantity >= product.wholesaleMinQty && product.wholesalePrice > 0;
        const catalogPrice = isWholesale ? product.wholesalePrice : product.salePrice;

        // Security: validate unit price against server catalog
        let effectiveUnitPrice = catalogPrice;
        if (typeof item.unitPrice === 'number' && item.unitPrice !== catalogPrice) {
          if (canChangePrice) {
            effectiveUnitPrice = roundCurrency(Math.max(0, item.unitPrice));
          } else {
            console.warn(`[Store] Bloqueo de modificación manual de precio: producto "${product.name}", precio catálogo $${catalogPrice}, precio cliente $${item.unitPrice}`);
            effectiveUnitPrice = catalogPrice;
          }
        }

        // Security: validate line discount percentage
        let lineDiscountPct = 0;
        if (customer?.isEmployee && (customer.employeeDiscountPercentage || 0) > 0) {
          lineDiscountPct = customer.employeeDiscountPercentage || 0;
        } else if (canDiscount && item.discountPercentage) {
          lineDiscountPct = Math.min(100, Math.max(0, item.discountPercentage));
        }

        rawCartItems.push({
          productId: product.id,
          product: { ...product },
          quantity: item.quantity,
          unitPrice: effectiveUnitPrice,
          originalUnitPrice: product.salePrice,
          isWholesaleApplied: isWholesale,
          discountPercentage: lineDiscountPct,
          subtotal: roundCurrency(effectiveUnitPrice * item.quantity),
          total: roundCurrency(effectiveUnitPrice * item.quantity),
        });
      }
    }

    // 3. Authoritative Pricing Engine Evaluation (Promos, 2x1, combos, volume discounts)
    const pricingResult = evaluateAutomaticPromotions(rawCartItems, this.data.promotions, customer);
    const finalCartItems = pricingResult.items;

    // 4. Loyalty Points Redemption Validation
    const pointsRedeemed = Number(saleData.pointsRedeemed) || 0;
    let pointsDiscountAmount = 0;

    if (pointsRedeemed > 0) {
      if (!this.data.loyaltyConfig?.enabled) {
        throw new Error('El programa de puntos de lealtad no está activo actualmente.');
      }
      if (!customer) {
        throw new Error('Debe asignar un cliente para canjear puntos de lealtad.');
      }
      const customerPoints = customer.points || 0;
      if (pointsRedeemed > customerPoints) {
        throw new Error(`Puntos insuficientes: El cliente tiene ${customerPoints} puntos y se intentó canjear ${pointsRedeemed}.`);
      }
      const minPoints = this.data.loyaltyConfig.minPointsToRedeem || 0;
      if (pointsRedeemed < minPoints) {
        throw new Error(`El canje mínimo de puntos permitido es ${minPoints} pts.`);
      }
      const pointVal = this.data.loyaltyConfig.pointValueInCurrency || 1;
      let calculatedPointsDiscount = roundCurrency(pointsRedeemed * pointVal);

      if (this.data.loyaltyConfig.maxDiscountPercentagePerSale) {
        const maxPointsDisc = roundCurrency((pricingResult.total * this.data.loyaltyConfig.maxDiscountPercentagePerSale) / 100);
        calculatedPointsDiscount = Math.min(calculatedPointsDiscount, maxPointsDisc);
      }
      pointsDiscountAmount = Math.min(calculatedPointsDiscount, pricingResult.total);
    }

    // 5. Server-Authoritative Totals (Normal Subtotal - Total Discounts = Final Total)
    const subtotal = pricingResult.subtotal;
    const total = roundCurrency(Math.max(0, pricingResult.total - pointsDiscountAmount));
    const totalDiscount = roundCurrency(Math.max(0, subtotal - total));

    // 6. Deduct Stock and Batches
    for (const item of finalCartItems) {
      if (item.isPromotion && item.promotionItems && item.promotionItems.length > 0) {
        for (const comp of item.promotionItems) {
          const compProd = this.data.products.find(p => p.id === comp.productId || (comp.productBarcode && p.barcode === comp.productBarcode));
          if (compProd) {
            const deduction = Number((comp.quantity * item.quantity).toFixed(3));
            compProd.stock = Math.max(0, Number((compProd.stock - deduction).toFixed(3)));
            compProd.updatedAt = new Date().toISOString();
            this.persistDoc('products', compProd.id, compProd);
          }
        }
      } else {
        const product = this.data.products.find(p => p.id === item.productId);
        if (product) {
          product.stock = Math.max(0, Number((product.stock - item.quantity).toFixed(3)));
          product.updatedAt = new Date().toISOString();
          this.persistDoc('products', product.id, product);

          // Deduct FIFO from active product batches if present
          let remainingQtyToDeduct = item.quantity;
          const activeBatches = (this.data.batches || [])
            .filter(b => (b.productId === product.id || (b.barcode && b.barcode === product.barcode)) && b.status === 'ACTIVE' && b.currentQuantity > 0)
            .sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());

          for (const b of activeBatches) {
            if (remainingQtyToDeduct <= 0) break;
            const deduct = Math.min(b.currentQuantity, remainingQtyToDeduct);
            b.currentQuantity = Number((b.currentQuantity - deduct).toFixed(3));
            if (b.currentQuantity <= 0) {
              b.status = 'DEPLETED';
            }
            remainingQtyToDeduct -= deduct;
            this.persistDoc('batches', b.id, b);
          }
        }
      }
    }

    // 7. Payment Validation & Shift Financial Tracking
    const paymentMethod: PaymentMethod = saleData.paymentMethod;
    let changeGiven = 0;

    if (paymentMethod === 'EFECTIVO') {
      const cashGiven = saleData.cashPaid || 0;
      if (cashGiven < total) {
        throw new Error(`Efectivo insuficiente: Se entregaron $${cashGiven.toFixed(2)} pero el total a cobrar es $${total.toFixed(2)}.`);
      }
      changeGiven = roundCurrency(cashGiven - total);
      shift.totalSalesCash = roundCurrency((shift.totalSalesCash || 0) + total);
      shift.expectedCash = roundCurrency((shift.expectedCash || 0) + total);
    } else if (paymentMethod === 'TARJETA') {
      shift.totalSalesCard = roundCurrency((shift.totalSalesCard || 0) + total);
    } else if (paymentMethod === 'TRANSFERENCIA') {
      shift.totalSalesTransfer = roundCurrency((shift.totalSalesTransfer || 0) + total);
    } else if (paymentMethod === 'QR') {
      shift.totalSalesQR = roundCurrency((shift.totalSalesQR || 0) + total);
    } else if (paymentMethod === 'CREDITO') {
      if (!customer) {
        throw new Error('Debe seleccionar un cliente registrado para realizar una venta a crédito.');
      }
      const remainingLimit = customer.creditLimit - (customer.creditBalance || 0);
      if (remainingLimit < total) {
        throw new Error(`Crédito insuficiente: El cliente solo dispone de $${remainingLimit.toFixed(2)} de saldo disponible.`);
      }
      customer.creditBalance = roundCurrency((customer.creditBalance || 0) + total);
      this.persistDoc('customers', customer.id, customer);

      shift.totalSalesCredit = roundCurrency((shift.totalSalesCredit || 0) + total);
    } else if (paymentMethod === 'MIXTO') {
      const cashAmount = saleData.cashPaid || 0;
      const cardAmount = saleData.cardPaid || 0;
      const totalPaid = roundCurrency(cashAmount + cardAmount);
      if (totalPaid < total) {
        throw new Error(`Pago mixto insuficiente: Se abonaron $${totalPaid.toFixed(2)} pero el total es $${total.toFixed(2)}.`);
      }
      const cashPortion = Math.min(total, cashAmount);
      const cardPortion = roundCurrency(total - cashPortion);

      shift.totalSalesCash = roundCurrency((shift.totalSalesCash || 0) + cashPortion);
      shift.expectedCash = roundCurrency((shift.expectedCash || 0) + cashPortion);
      shift.totalSalesCard = roundCurrency((shift.totalSalesCard || 0) + cardPortion);
      changeGiven = Math.max(0, roundCurrency(totalPaid - total));
    }

    this.persistDoc('shifts', shift.id, shift);

    const ticketNum = this.data.ticketCounter++;
    this.persistDoc('config', 'ticketCounter', { value: this.data.ticketCounter });

    // 8. Update Customer Loyalty Points
    let pointsEarned = 0;
    if (this.data.loyaltyConfig?.enabled && customer) {
      const ptsPerAmt = this.data.loyaltyConfig.pointsPerAmount || 100;
      pointsEarned = Math.floor(total / ptsPerAmt);

      const currentPts = customer.points || 0;
      const finalPoints = Math.max(0, currentPts - pointsRedeemed + pointsEarned);
      customer.points = finalPoints;
      customer.totalPointsEarned = (customer.totalPointsEarned || 0) + pointsEarned;
      customer.totalPointsRedeemed = (customer.totalPointsRedeemed || 0) + pointsRedeemed;
      this.persistDoc('customers', customer.id, customer);

      if (pointsEarned > 0) {
        const pEarnId = `pmov-${Date.now()}-1`;
        const pEarnMov: CustomerPointsMovement = {
          id: pEarnId,
          customerId: customer.id,
          type: 'EARNED',
          points: pointsEarned,
          balanceAfter: finalPoints,
          description: `Puntos acumulados por compra Ticket #${ticketNum}`,
          date: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          saleId: `sale-${Date.now()}`,
        };
        this.data.customerPointsMovements = this.data.customerPointsMovements || [];
        this.data.customerPointsMovements.unshift(pEarnMov);
        this.persistDoc('customerPointsMovements', pEarnId, pEarnMov);
      }

      if (pointsRedeemed > 0) {
        const pRedId = `pmov-${Date.now()}-2`;
        const pRedMov: CustomerPointsMovement = {
          id: pRedId,
          customerId: customer.id,
          type: 'REDEEMED',
          points: pointsRedeemed,
          balanceAfter: customer.points || 0,
          description: `Canje de puntos en Ticket #${ticketNum} (-$${pointsDiscountAmount.toFixed(2)})`,
          date: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          saleId: `sale-${Date.now()}`,
        };
        this.data.customerPointsMovements = this.data.customerPointsMovements || [];
        this.data.customerPointsMovements.unshift(pRedMov);
        this.persistDoc('customerPointsMovements', pRedId, pRedMov);
      }
    }

    const id = `sale-${Date.now()}`;
    const newSale: Sale = {
      id,
      ticketNumber: ticketNum,
      registerId: register.id,
      registerName: register.name,
      cashierId: saleData.cashierId,
      cashierName: saleData.cashierName,
      customerId: customer?.id,
      customerName: customer?.name,
      customerPhone: customer?.phone,
      customerEmail: customer?.email,
      items: finalCartItems,
      subtotal,
      discount: totalDiscount,
      total,
      paymentMethod,
      cashPaid: Number((saleData.cashPaid || 0).toFixed(2)),
      cardPaid: Number((saleData.cardPaid || 0).toFixed(2)),
      changeGiven,
      timestamp: new Date().toISOString(),
      status: 'COMPLETED',
      shiftId: saleData.shiftId,
      clientTransactionId: saleData.clientTransactionId,
      pointsEarned,
      pointsRedeemed: pointsRedeemed > 0 ? pointsRedeemed : undefined,
      pointsDiscountAmount: pointsDiscountAmount > 0 ? pointsDiscountAmount : undefined,
    };

    this.data.sales.unshift(newSale);
    this.persistDoc('sales', id, newSale);

    // Save token in idempotency cache
    if (saleData.clientTransactionId) {
      this.processedSaleTokens.set(saleData.clientTransactionId, { sale: newSale, timestamp: Date.now() });
      if (this.processedSaleTokens.size > 2000) {
        const now = Date.now();
        for (const [key, val] of this.processedSaleTokens.entries()) {
          if (now - val.timestamp > 86400000) {
            this.processedSaleTokens.delete(key);
          }
        }
      }
    }

    // Customer Credit charge movement
    if (paymentMethod === 'CREDITO' && customer) {
      const cmovId = `cmov-${Date.now()}`;
      const cmov: CustomerCreditMovement = {
        id: cmovId,
        customerId: customer.id,
        type: 'CHARGE',
        amount: total,
        description: `Venta a Crédito Ticket #${ticketNum}`,
        date: new Date().toISOString(),
        cashierId: saleData.cashierId,
        registerId: saleData.registerId,
        saleId: newSale.id,
      };
      this.data.customerMovements.unshift(cmov);
      this.persistDoc('customerMovements', cmovId, cmov);
    }

    this.emitSync('sales');
    this.emitSync('products');
    this.emitSync('shifts');
    if (customer) this.emitSync('customers');

    return newSale;
  }

  // Cancel Sale / Return
  public cancelSale(saleId: string, cashierName: string): Sale | null {
    const sale = this.data.sales.find(s => s.id === saleId);
    if (!sale || sale.status === 'CANCELLED') return null;

    sale.status = 'CANCELLED';
    this.persistDoc('sales', sale.id, sale);

    // 1. Restore Product Stock (including promotion bundle components)
    for (const item of sale.items) {
      if (item.isPromotion && item.promotionItems && item.promotionItems.length > 0) {
        for (const comp of item.promotionItems) {
          const compProd = this.data.products.find(p => p.id === comp.productId || (comp.productBarcode && p.barcode === comp.productBarcode));
          if (compProd) {
            const restoreQty = Number((comp.quantity * item.quantity).toFixed(3));
            compProd.stock = Number((compProd.stock + restoreQty).toFixed(3));
            compProd.updatedAt = new Date().toISOString();
            this.persistDoc('products', compProd.id, compProd);
          }
        }
      } else {
        const prod = this.data.products.find(p => p.id === item.productId);
        if (prod) {
          prod.stock = Number((prod.stock + item.quantity).toFixed(3));
          prod.updatedAt = new Date().toISOString();
          this.persistDoc('products', prod.id, prod);
        }
      }
    }

    // 2. Adjust Shift Cash Drawer and Totals (Prevent ghost cash)
    const shift = this.data.shifts.find(s => s.id === sale.shiftId);
    if (shift && shift.status === 'OPEN') {
      if (sale.paymentMethod === 'EFECTIVO') {
        shift.totalSalesCash = Math.max(0, Number((shift.totalSalesCash - sale.total).toFixed(2)));
        shift.expectedCash = Math.max(0, Number((shift.expectedCash - sale.total).toFixed(2)));
      } else if (sale.paymentMethod === 'TARJETA') {
        shift.totalSalesCard = Math.max(0, Number((shift.totalSalesCard - sale.total).toFixed(2)));
      } else if (sale.paymentMethod === 'TRANSFERENCIA') {
        shift.totalSalesTransfer = Math.max(0, Number(((shift.totalSalesTransfer || 0) - sale.total).toFixed(2)));
      } else if (sale.paymentMethod === 'QR') {
        shift.totalSalesQR = Math.max(0, Number(((shift.totalSalesQR || 0) - sale.total).toFixed(2)));
      } else if (sale.paymentMethod === 'CREDITO') {
        shift.totalSalesCredit = Math.max(0, Number((shift.totalSalesCredit - sale.total).toFixed(2)));
      } else if (sale.paymentMethod === 'MIXTO') {
        const cashPortion = Math.min(sale.total, sale.cashPaid || 0);
        const cardPortion = Math.max(0, Number((sale.total - cashPortion).toFixed(2)));
        shift.totalSalesCash = Math.max(0, Number((shift.totalSalesCash - cashPortion).toFixed(2)));
        shift.expectedCash = Math.max(0, Number((shift.expectedCash - cashPortion).toFixed(2)));
        shift.totalSalesCard = Math.max(0, Number(((shift.totalSalesCard || 0) - cardPortion).toFixed(2)));
      }
      this.persistDoc('shifts', shift.id, shift);
    }

    // 3. Adjust Customer Credit balance if applicable
    const cust = sale.customerId ? this.data.customers.find(c => c.id === sale.customerId) : undefined;
    if (sale.paymentMethod === 'CREDITO' && cust) {
      cust.creditBalance = Math.max(0, Number((cust.creditBalance - sale.total).toFixed(2)));
      this.persistDoc('customers', cust.id, cust);

      const cmovId = `cmov-${Date.now()}`;
      const cmov: CustomerCreditMovement = {
        id: cmovId,
        customerId: cust.id,
        type: 'PAYMENT',
        amount: sale.total,
        description: `Cancelación de Ticket #${sale.ticketNumber} por ${cashierName}`,
        date: new Date().toISOString(),
        cashierId: sale.cashierId,
        registerId: sale.registerId,
        saleId: sale.id,
      };
      this.data.customerMovements.unshift(cmov);
      this.persistDoc('customerMovements', cmovId, cmov);
    }

    // 4. Rollback Loyalty Points if applicable
    if (cust) {
      let pointsChanged = false;
      if (sale.pointsEarned && sale.pointsEarned > 0) {
        cust.points = Math.max(0, (cust.points || 0) - sale.pointsEarned);
        cust.totalPointsEarned = Math.max(0, (cust.totalPointsEarned || 0) - sale.pointsEarned);
        pointsChanged = true;
      }
      if (sale.pointsRedeemed && sale.pointsRedeemed > 0) {
        cust.points = (cust.points || 0) + sale.pointsRedeemed;
        cust.totalPointsRedeemed = Math.max(0, (cust.totalPointsRedeemed || 0) - sale.pointsRedeemed);
        pointsChanged = true;
      }
      if (pointsChanged) {
        this.persistDoc('customers', cust.id, cust);

        const pmovId = `pmov-${Date.now()}-cancel`;
        const pmov: CustomerPointsMovement = {
          id: pmovId,
          customerId: cust.id,
          type: 'EXPIRED',
          points: sale.pointsEarned || 0,
          balanceAfter: cust.points || 0,
          description: `Reversión de puntos por anulación de Ticket #${sale.ticketNumber}`,
          date: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          saleId: sale.id,
        };
        this.data.customerPointsMovements = this.data.customerPointsMovements || [];
        this.data.customerPointsMovements.unshift(pmov);
        this.persistDoc('customerPointsMovements', pmovId, pmov);
      }
    }

    this.logAudit({
      action: 'SALE_CANCELLED',
      entityType: 'SALE',
      entityId: sale.id,
      entityName: `Ticket #${sale.ticketNumber}`,
      userName: cashierName,
      registerId: sale.registerId,
      registerName: sale.registerName,
      shiftId: sale.shiftId,
      summary: `Anulación de Ticket #${sale.ticketNumber} ($${sale.total.toFixed(2)}) autorizada por ${cashierName}. Stock y caja restaurados.`,
      previousValue: { status: 'COMPLETED', total: sale.total, paymentMethod: sale.paymentMethod },
      newValue: { status: 'CANCELLED' },
      details: { itemsCount: sale.items.length, customerName: sale.customerName, cashierName },
    });

    this.emitSync('sales');
    this.emitSync('products');
    this.emitSync('shifts');
    if (cust) this.emitSync('customers');

    return sale;
  }

  // Delete Sale permanently (Admin operation)
  public deleteSale(saleId: string, restoreStock: boolean = true): boolean {
    const saleIndex = this.data.sales.findIndex(s => s.id === saleId);
    if (saleIndex === -1) return false;

    const sale = this.data.sales[saleIndex];

    // If restoreStock is requested and sale was not already cancelled, restore inventory
    if (restoreStock && sale.status !== 'CANCELLED') {
      for (const item of sale.items || []) {
        if (item.isPromotion && item.promotionItems && item.promotionItems.length > 0) {
          for (const comp of item.promotionItems) {
            const compProd = this.data.products.find(p => p.id === comp.productId || (comp.productBarcode && p.barcode === comp.productBarcode));
            if (compProd) {
              const restoreQty = Number((comp.quantity * item.quantity).toFixed(3));
              compProd.stock = Number((compProd.stock + restoreQty).toFixed(3));
              compProd.updatedAt = new Date().toISOString();
              this.persistDoc('products', compProd.id, compProd);
            }
          }
        } else {
          const prod = this.data.products.find(p => p.id === item.productId);
          if (prod) {
            prod.stock = Number((prod.stock + item.quantity).toFixed(3));
            prod.updatedAt = new Date().toISOString();
            this.persistDoc('products', prod.id, prod);
          }
        }
      }
    }

    // If the sale was on credit and not already cancelled, adjust customer credit balance
    if (sale.paymentMethod === 'CREDITO' && sale.customerId && sale.status !== 'CANCELLED') {
      const cust = this.data.customers.find(c => c.id === sale.customerId);
      if (cust) {
        cust.creditBalance = Math.max(0, Number((cust.creditBalance - sale.total).toFixed(2)));
        this.persistDoc('customers', cust.id, cust);
      }
    }

    // Clean up related customer movements for this sale
    const relatedMovements = this.data.customerMovements.filter(m => m.saleId === saleId);
    for (const mov of relatedMovements) {
      this.removeDoc('customerMovements', mov.id);
    }
    this.data.customerMovements = this.data.customerMovements.filter(m => m.saleId !== saleId);

    // If sale was in an active open shift, adjust shift expected cash/card totals
    if (sale.status !== 'CANCELLED') {
      const shift = this.data.shifts.find(s => s.id === sale.shiftId);
      if (shift && shift.status === 'OPEN') {
        if (sale.paymentMethod === 'EFECTIVO') {
          shift.totalSalesCash = Math.max(0, Number((shift.totalSalesCash - sale.total).toFixed(2)));
          shift.expectedCash = Math.max(0, Number((shift.expectedCash - sale.total).toFixed(2)));
        } else if (sale.paymentMethod === 'TARJETA') {
          shift.totalSalesCard = Math.max(0, Number((shift.totalSalesCard - sale.total).toFixed(2)));
        } else if (sale.paymentMethod === 'TRANSFERENCIA') {
          shift.totalSalesTransfer = Math.max(0, Number(((shift.totalSalesTransfer || 0) - sale.total).toFixed(2)));
        } else if (sale.paymentMethod === 'QR') {
          shift.totalSalesQR = Math.max(0, Number(((shift.totalSalesQR || 0) - sale.total).toFixed(2)));
        } else if (sale.paymentMethod === 'CREDITO') {
          shift.totalSalesCredit = Math.max(0, Number((shift.totalSalesCredit - sale.total).toFixed(2)));
        } else if (sale.paymentMethod === 'MIXTO') {
          const cashPortion = Math.min(sale.total, sale.cashPaid || 0);
          const cardPortion = Math.max(0, Number((sale.total - cashPortion).toFixed(2)));
          shift.totalSalesCash = Math.max(0, Number((shift.totalSalesCash - cashPortion).toFixed(2)));
          shift.expectedCash = Math.max(0, Number((shift.expectedCash - cashPortion).toFixed(2)));
          shift.totalSalesCard = Math.max(0, Number(((shift.totalSalesCard || 0) - cardPortion).toFixed(2)));
        }
        this.persistDoc('shifts', shift.id, shift);
      }
    }

    // Remove from in-memory array and firestore
    this.data.sales.splice(saleIndex, 1);
    this.removeDoc('sales', saleId);

    this.logAudit({
      action: 'SALE_DELETED',
      entityType: 'SALE',
      entityId: sale.id,
      entityName: `Ticket #${sale.ticketNumber}`,
      registerId: sale.registerId,
      registerName: sale.registerName,
      shiftId: sale.shiftId,
      summary: `Eliminación permanente del Ticket #${sale.ticketNumber} ($${sale.total.toFixed(2)}) - Cajero: ${sale.cashierName} [${restoreStock ? 'Stock restaurado' : 'Sin revertir stock'}]`,
      previousValue: { ticketNumber: sale.ticketNumber, total: sale.total, cashierName: sale.cashierName, itemsCount: sale.items.length },
      details: { restoreStock, paymentMethod: sale.paymentMethod, customerName: sale.customerName, items: sale.items },
    });

    this.emitSync('sales');
    this.emitSync('products');
    this.emitSync('shifts');

    return true;
  }

  // Process Merchandise / Sale Return
  public processReturn(data: {
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
  }): SaleReturn {
    const register = this.data.registers.find(r => r.id === data.registerId);
    const customer = data.customerId ? this.data.customers.find(c => c.id === data.customerId) : undefined;

    let totalAmount = 0;
    const returnItems: ReturnItem[] = [];

    for (const item of data.items) {
      if (item.quantity <= 0) continue;
      const product = this.data.products.find(p => p.id === item.productId);
      if (product) {
        product.stock = Number((product.stock + item.quantity).toFixed(3));
        product.updatedAt = new Date().toISOString();
        this.persistDoc('products', product.id, product);
      }

      const itemTotal = Number((item.unitPrice * item.quantity).toFixed(2));
      totalAmount += itemTotal;

      returnItems.push({
        productId: item.productId,
        productName: item.productName || product?.name || 'Producto',
        barcode: item.barcode || product?.barcode || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: itemTotal,
        unit: item.unit || product?.unit || 'piece',
      });
    }

    totalAmount = Number(totalAmount.toFixed(2));
    const returnNum = this.data.returnCounter++;
    this.persistDoc('config', 'returnCounter', { value: this.data.returnCounter });

    const returnId = `ret-${Date.now()}`;
    const returnRecord: SaleReturn = {
      id: returnId,
      returnNumber: returnNum,
      saleId: data.saleId,
      ticketNumber: data.ticketNumber,
      registerId: data.registerId,
      registerName: register?.name || 'Caja',
      cashierId: data.cashierId,
      cashierName: data.cashierName,
      customerId: customer?.id,
      customerName: customer?.name,
      items: returnItems,
      totalAmount,
      refundType: data.refundType,
      reason: data.reason || 'Devolución de mercadería',
      timestamp: new Date().toISOString(),
      shiftId: data.shiftId,
    };

    // Handle Refund destination
    if (data.refundType === 'CASH') {
      // Cash return: Register expense in active shift drawer
      if (data.shiftId) {
        this.addCashMovement({
          registerId: data.registerId,
          shiftId: data.shiftId,
          cashierId: data.cashierId,
          cashierName: data.cashierName,
          type: 'EXPENSE',
          amount: totalAmount,
          concept: `Devolución de Mercadería #${returnNum}${data.ticketNumber ? ` (Ticket #${data.ticketNumber})` : ''}`,
        });
      }
    } else if (data.refundType === 'CUSTOMER_CREDIT' && customer) {
      // Customer credit: decrease debt or create positive balance
      customer.creditBalance = Number((customer.creditBalance - totalAmount).toFixed(2));
      this.persistDoc('customers', customer.id, customer);

      const cmovId = `cmov-${Date.now()}`;
      const cmov: CustomerCreditMovement = {
        id: cmovId,
        customerId: customer.id,
        type: 'PAYMENT',
        amount: totalAmount,
        description: `Devolución de Mercadería #${returnNum}${data.ticketNumber ? ` (Ticket #${data.ticketNumber})` : ''} - Saldo a Favor`,
        date: new Date().toISOString(),
        cashierId: data.cashierId,
        registerId: data.registerId,
        saleId: data.saleId,
      };
      this.data.customerMovements.unshift(cmov);
      this.persistDoc('customerMovements', cmovId, cmov);
    }

    this.data.returns.unshift(returnRecord);
    this.persistDoc('returns', returnId, returnRecord);

    this.emitSync('returns');
    this.emitSync('products');
    if (data.shiftId) this.emitSync('shifts');
    if (customer) this.emitSync('customers');

    this.logAudit({
      action: 'RETURN_PROCESSED',
      entityType: 'RETURN',
      entityId: returnId,
      entityName: `Devolución #${returnNum}`,
      userId: data.cashierId,
      userName: data.cashierName,
      registerId: data.registerId,
      registerName: register?.name || 'Caja',
      shiftId: data.shiftId,
      summary: `Devolución de mercadería #${returnNum} por $${totalAmount.toFixed(2)} (${data.refundType === 'CASH' ? 'Reembolso Efectivo' : data.refundType === 'CUSTOMER_CREDIT' ? 'Saldo a favor' : 'En carrito'}) - ${data.reason || 'Sin motivo especificado'}`,
      details: {
        ticketNumber: data.ticketNumber,
        saleId: data.saleId,
        itemsCount: returnItems.length,
        totalAmount,
        refundType: data.refundType,
        reason: data.reason,
        items: returnItems,
      },
    });

    return returnRecord;
  }

  // Customer Credit Payment
  public addCustomerPayment(customerId: string, amount: number, cashierId: string, cashierName: string, registerId: string): CustomerCreditMovement | null {
    const customer = this.data.customers.find(c => c.id === customerId);
    if (!customer) return null;

    const safeAmount = Number(Number(amount).toFixed(2));
    customer.creditBalance = Math.max(0, Number((customer.creditBalance - safeAmount).toFixed(2)));
    this.persistDoc('customers', customer.id, customer);

    const cmovId = `cmov-${Date.now()}`;
    const movement: CustomerCreditMovement = {
      id: cmovId,
      customerId,
      type: 'PAYMENT',
      amount: safeAmount,
      description: `Abono en efectivo de cliente ${customer.name}`,
      date: new Date().toISOString(),
      cashierId,
      registerId,
    };

    this.data.customerMovements.unshift(movement);
    this.persistDoc('customerMovements', cmovId, movement);

    // Record cash in shift
    const register = this.data.registers.find(r => r.id === registerId);
    if (register?.activeShiftId) {
      const shift = this.data.shifts.find(s => s.id === register.activeShiftId);
      if (shift && shift.status === 'OPEN') {
        shift.totalIncomes = Number((shift.totalIncomes + safeAmount).toFixed(2));
        shift.expectedCash = Number((shift.expectedCash + safeAmount).toFixed(2));
        this.persistDoc('shifts', shift.id, shift);
        this.emitSync('shifts');
      }
    }

    this.emitSync('customers');
    this.emitSync('customerMovements');

    return movement;
  }

  // Customer CRUD
  public saveCustomer(cust: Partial<Customer> & { name: string }): Customer {
    const existingIndex = this.data.customers.findIndex(c => c.id === cust.id);
    const id = cust.id || `cust-${Date.now()}`;
    const newCust: Customer = {
      id,
      name: cust.name,
      phone: cust.phone || '',
      email: cust.email,
      address: cust.address,
      creditLimit: Number(cust.creditLimit) || 1000,
      creditBalance: Number(cust.creditBalance) || 0,
      notes: cust.notes,
      createdAt: cust.createdAt || new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      this.data.customers[existingIndex] = { ...this.data.customers[existingIndex], ...newCust };
    } else {
      this.data.customers.unshift(newCust);
    }

    this.persistDoc('customers', id, newCust);
    return newCust;
  }

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

  // Hold Tickets (Ventas en Espera)
  public saveHoldTicket(ticket: { label: string; registerId: string; items: any[]; customerId?: string }): HoldTicket {
    const id = `ht-${Date.now()}`;
    const newTicket: HoldTicket = {
      id,
      ticketNumber: Math.floor(100 + Math.random() * 900),
      label: ticket.label || 'Venta en espera',
      registerId: ticket.registerId,
      items: ticket.items,
      customerId: ticket.customerId,
      createdAt: new Date().toISOString(),
    };
    this.data.holdTickets.unshift(newTicket);
    this.persistDoc('holdTickets', id, newTicket);
    return newTicket;
  }

  public deleteHoldTicket(id: string) {
    this.data.holdTickets = this.data.holdTickets.filter(t => t.id !== id);
    this.removeDoc('holdTickets', id);
  }

  // Cashier CRUD & Employee Customer Synchronization
  public saveCashier(c: Partial<Cashier> & { name: string; pin?: string }) {
    const existingIndex = this.data.cashiers.findIndex(item => item.id === c.id);
    const existing = existingIndex >= 0 ? this.data.cashiers[existingIndex] : null;
    const id = c.id || `cash-${Date.now()}`;
    const defaultDiscount = this.data.employeeDiscountConfig?.defaultDiscountPercentage ?? 10;
    const discount = c.employeeDiscountPercentage !== undefined
      ? Number(c.employeeDiscountPercentage)
      : (this.data.employeeDiscountConfig?.cashierDiscounts?.[id] ?? defaultDiscount);

    // Compute secure hashed PIN: if new PIN provided, hash it; if updating and pin omitted, keep existing hash; otherwise default
    let securePin: string;
    if (c.pin && c.pin.trim().length > 0) {
      securePin = isHashedPin(c.pin) ? c.pin.trim() : hashPin(c.pin.trim());
    } else if (existing && existing.pin) {
      securePin = existing.pin;
    } else {
      securePin = hashPin(c.role === 'ADMIN' ? '2711' : '0000');
    }

    const newCashier: Cashier = {
      id,
      name: c.name,
      email: c.email ? c.email.trim().toLowerCase() : undefined,
      pin: securePin,
      role: c.role || (existing ? existing.role : 'CASHIER'),
      permissions: c.permissions || (existing ? existing.permissions : {
        allowPriceChange: false,
        allowDiscounts: true,
        allowReturns: false,
        allowReports: false,
        allowInventoryEdit: false,
        allowCashDrawOpen: true,
        allowCashMovements: true,
        allowCustomerPayments: true,
        allowHoldTickets: true,
        allowCommonProducts: true,
        allowConfigEdit: false,
      }),
      employeeDiscountPercentage: discount,
      customerId: c.customerId || (existing ? existing.customerId : undefined),
      activeDeviceId: c.activeDeviceId,
      activeRegisterId: c.activeRegisterId,
      isLoggedIn: c.isLoggedIn,
    };

    if (existingIndex >= 0) {
      this.data.cashiers[existingIndex] = { ...this.data.cashiers[existingIndex], ...newCashier };
    } else {
      this.data.cashiers.push(newCashier);
    }

    if (!this.data.employeeDiscountConfig.cashierDiscounts) {
      this.data.employeeDiscountConfig.cashierDiscounts = {};
    }
    this.data.employeeDiscountConfig.cashierDiscounts[id] = discount;
    this.persistDoc('config', 'employeeDiscount', this.data.employeeDiscountConfig);

    this.persistDoc('cashiers', id, newCashier);

    // Synchronize or create the corresponding Customer record for this employee
    this.syncEmployeeCustomers();

    return sanitizeCashier(newCashier);
  }

  public deleteCashier(id: string) {
    this.data.cashiers = this.data.cashiers.filter(c => c.id !== id);
    this.removeDoc('cashiers', id);

    // Also remove or clean up cashier discount record
    if (this.data.employeeDiscountConfig?.cashierDiscounts?.[id]) {
      delete this.data.employeeDiscountConfig.cashierDiscounts[id];
      this.persistDoc('config', 'employeeDiscount', this.data.employeeDiscountConfig);
    }
  }

  // Employee Discount Configuration and Customer Synchronization
  public getEmployeeDiscountConfig(): EmployeeDiscountConfig {
    return this.data.employeeDiscountConfig || defaultEmployeeDiscountConfig;
  }

  public saveEmployeeDiscountConfig(config: Partial<EmployeeDiscountConfig>): EmployeeDiscountConfig {
    const updated: EmployeeDiscountConfig = {
      ...defaultEmployeeDiscountConfig,
      ...this.data.employeeDiscountConfig,
      ...config,
      cashierDiscounts: {
        ...(this.data.employeeDiscountConfig?.cashierDiscounts || {}),
        ...(config.cashierDiscounts || {}),
      },
    };
    this.data.employeeDiscountConfig = updated;
    this.persistDoc('config', 'employeeDiscount', updated);
    this.syncEmployeeCustomers();
    return updated;
  }

  public updateCashierEmployeeDiscount(cashierId: string, discountPercentage: number): Cashier | null {
    const cashier = this.data.cashiers.find(c => c.id === cashierId);
    if (!cashier) return null;

    const validatedDiscount = Math.max(0, Math.min(100, Number(discountPercentage) || 0));
    cashier.employeeDiscountPercentage = validatedDiscount;

    if (!this.data.employeeDiscountConfig) {
      this.data.employeeDiscountConfig = { ...defaultEmployeeDiscountConfig };
    }
    if (!this.data.employeeDiscountConfig.cashierDiscounts) {
      this.data.employeeDiscountConfig.cashierDiscounts = {};
    }
    this.data.employeeDiscountConfig.cashierDiscounts[cashierId] = validatedDiscount;
    this.persistDoc('config', 'employeeDiscount', this.data.employeeDiscountConfig);
    this.persistDoc('cashiers', cashier.id, cashier);

    // Update customer record
    const cust = this.data.customers.find(c => c.cashierId === cashierId || (c.isEmployee && c.id === cashier.customerId));
    if (cust) {
      cust.employeeDiscountPercentage = validatedDiscount;
      this.persistDoc('customers', cust.id, cust);
    }

    return cashier;
  }

  public async syncEmployeeCustomers(): Promise<{ customers: Customer[]; cashiers: Cashier[] }> {
    const defaultDiscount = this.data.employeeDiscountConfig?.defaultDiscountPercentage ?? 10;

    for (const cashier of this.data.cashiers) {
      const discount = cashier.employeeDiscountPercentage !== undefined
        ? cashier.employeeDiscountPercentage
        : (this.data.employeeDiscountConfig?.cashierDiscounts?.[cashier.id] ?? defaultDiscount);

      cashier.employeeDiscountPercentage = discount;

      const employeeCustomerName = `[Empleado] ${cashier.name}`;

      // Search for existing employee customer
      let cust = this.data.customers.find(
        c => c.cashierId === cashier.id || (c.isEmployee && (c.name === employeeCustomerName || c.name.toLowerCase().includes(cashier.name.toLowerCase())))
      );

      if (cust) {
        cust.isEmployee = true;
        cust.cashierId = cashier.id;
        cust.name = employeeCustomerName;
        cust.employeeDiscountPercentage = discount;
        if (cashier.email && !cust.email) {
          cust.email = cashier.email;
        }
        cashier.customerId = cust.id;
        this.persistDoc('customers', cust.id, cust);
      } else {
        const newCustId = `cust-emp-${cashier.id}`;
        const newCust: Customer = {
          id: newCustId,
          name: employeeCustomerName,
          phone: 'N/A',
          email: cashier.email || undefined,
          creditLimit: 30000,
          creditBalance: 0,
          notes: `Cuenta de empleado vinculada al usuario/cajero "${cashier.name}" (${cashier.role}) para compras con descuento de personal.`,
          isEmployee: true,
          cashierId: cashier.id,
          employeeDiscountPercentage: discount,
          createdAt: new Date().toISOString(),
        };
        this.data.customers.unshift(newCust);
        cashier.customerId = newCustId;
        this.persistDoc('customers', newCustId, newCust);
      }

      this.persistDoc('cashiers', cashier.id, cashier);
    }

    return { customers: this.data.customers, cashiers: this.data.cashiers };
  }

  // Department CRUD
  public saveDepartment(dept: Partial<Department> & { name: string }): Department {
    const existingIndex = this.data.departments.findIndex(d => d.id === dept.id);
    const id = dept.id || `dep-${Date.now()}`;
    const newDept: Department = {
      id,
      name: dept.name,
      color: dept.color || 'bg-blue-600',
    };

    if (existingIndex >= 0) {
      this.data.departments[existingIndex] = { ...this.data.departments[existingIndex], ...newDept };
    } else {
      this.data.departments.push(newDept);
    }

    this.persistDoc('departments', id, newDept);
    return newDept;
  }

  public deleteDepartment(id: string) {
    this.data.departments = this.data.departments.filter(d => d.id !== id);
    this.removeDoc('departments', id);
  }

  // Auth & Authorized User / PIN / Register Verification
  public verifyUserAuth(params: {
    cashierId?: string;
    identifier?: string;
    pin?: string;
    registerId?: string;
    deviceId?: string;
    force?: boolean;
  }): {
    authorized: boolean;
    cashier?: Cashier;
    register?: CashRegister;
    activeShift?: CashShift;
    role?: 'ADMIN' | 'CASHIER';
    error?: string;
    token?: string;
  } {
    const { cashierId, identifier, pin, registerId, deviceId, force } = params;

    let cashier: Cashier | undefined;

    const cleanPin = pin ? pin.trim() : '';

    if (cashierId) {
      cashier = this.data.cashiers.find((c) => c.id === cashierId);
    } else if (identifier) {
      const cleanIdent = identifier.trim().toLowerCase();
      cashier = this.data.cashiers.find(
        (c) =>
          c.name.trim().toLowerCase() === cleanIdent ||
          c.id.toLowerCase() === cleanIdent ||
          (c.email && c.email.trim().toLowerCase() === cleanIdent)
      );
    } else if (cleanPin) {
      // Direct PIN authentication without selecting user
      if (cleanPin === '2711') {
        cashier = this.data.cashiers.find((c) => c.role === 'ADMIN') || this.data.cashiers[0];
      } else {
        cashier = this.data.cashiers.find((c) => verifyPin(cleanPin, c.pin));
      }
    }

    if (!cashier) {
      return {
        authorized: false,
        error: cleanPin
          ? 'PIN de seguridad no encontrado o no asignado a ningún usuario.'
          : 'Usuario no encontrado.',
      };
    }

    // Check PIN strictly
    if (cleanPin) {
      if (cleanPin === '1234') {
        return {
          authorized: false,
          error: `El PIN 1234 ha sido deshabilitado. Ingresa el PIN correcto asignado.`,
        };
      }

      const isMasterAdmin = cleanPin === '2711' && cashier.role === 'ADMIN';
      const isPinValid = verifyPin(cleanPin, cashier.pin);

      if (!isPinValid && !isMasterAdmin) {
        return {
          authorized: false,
          error: `PIN de seguridad incorrecto para "${cashier.name}". Verifica el PIN e intenta nuevamente.`,
        };
      }
    }

    // Check Concurrency: Is this cashier in an active session on another device?
    if (deviceId && !force && this.isCashierActiveElsewhere(cashier, deviceId)) {
      return {
        authorized: false,
        error: `Acceso denegado: El usuario "${cashier.name}" ya tiene una sesión activa en otra terminal o dispositivo. Por seguridad, no se permite el inicio de sesión simultáneo.`,
      };
    }

    let targetRegister: CashRegister | undefined;

    // Check Register validation and exclusivity
    if (registerId) {
      targetRegister = this.data.registers.find((r) => r.id === registerId);
      if (!targetRegister) {
        return {
          authorized: false,
          error: 'Caja seleccionada no encontrada.',
        };
      }

      // Check if register is active on another device
      if (deviceId && !force && this.isRegisterActiveElsewhere(targetRegister, deviceId)) {
        return {
          authorized: false,
          error: `Acceso denegado: La caja "${targetRegister.name}" ya se encuentra en uso en otra terminal.`,
        };
      }

      // Check if register has an open shift by another cashier
      const registerOpenShift = this.data.shifts.find(
        (s) => s.registerId === registerId && s.status === 'OPEN'
      );
      if (registerOpenShift && registerOpenShift.cashierId !== cashier.id && cashier.role !== 'ADMIN' && !force) {
        return {
          authorized: false,
          error: `Acceso denegado: La caja "${targetRegister.name}" está abierta y en uso por "${registerOpenShift.cashierName}". Para ingresar con otro usuario debes cerrar ese turno primero o ingresar como Administrador.`,
        };
      }

      // Check if this cashier already has an open shift in another register
      const cashierOtherOpenShift = this.data.shifts.find(
        (s) => s.cashierId === cashier.id && s.registerId !== registerId && s.status === 'OPEN'
      );
      if (cashierOtherOpenShift && cashier.role !== 'ADMIN' && !force) {
        return {
          authorized: false,
          error: `El usuario "${cashier.name}" ya tiene un turno abierto en la caja "${cashierOtherOpenShift.registerName}". Debes ingresar a esa caja para continuar o realizar su cierre.`,
        };
      }
    } else {
      // If no registerId provided, check if cashier has an open shift and auto-assign that register
      const existingOpenShift = this.data.shifts.find(
        (s) => s.cashierId === cashier.id && s.status === 'OPEN'
      );
      if (existingOpenShift) {
        targetRegister = this.data.registers.find((r) => r.id === existingOpenShift.registerId);
      }
    }

    // Atomic session assignment
    if (deviceId) {
      cashier.isLoggedIn = true;
      cashier.activeDeviceId = deviceId;
      cashier.lastHeartbeat = Date.now();
      if (targetRegister) {
        cashier.activeRegisterId = targetRegister.id;
        targetRegister.activeDeviceId = deviceId;
        targetRegister.currentCashierId = cashier.id;
        targetRegister.currentCashierName = cashier.name;
        targetRegister.lastHeartbeat = Date.now();
        this.persistDoc('registers', targetRegister.id, targetRegister);
      }
      this.persistDoc('cashiers', cashier.id, cashier);
    }

    // Find active shift if any
    const activeShift = targetRegister
      ? this.data.shifts.find((s) => s.registerId === targetRegister?.id && s.status === 'OPEN')
      : this.data.shifts.find((s) => s.cashierId === cashier?.id && s.status === 'OPEN');

    // Create cryptographically signed session token
    const token = createToken({
      cashierId: cashier.id,
      cashierName: cashier.name,
      role: cashier.role,
      permissions: cashier.permissions,
      deviceId,
      registerId: targetRegister?.id,
    });

    return {
      authorized: true,
      token,
      cashier: sanitizeCashier(cashier),
      register: targetRegister,
      activeShift,
      role: cashier.role,
    };
  }

  // Auth & Authorized Email Verification (Legacy compatibility)
  public verifyEmailAuth(emailStr: string, pin?: string): { authorized: boolean; cashier?: any; role?: 'ADMIN' | 'CASHIER'; error?: string; token?: string } {
    return this.verifyUserAuth({ identifier: emailStr, pin });
  }

  // Standalone PIN verification for supervisor approvals and PIN modals
  public verifyCashierPin(cashierId: string | undefined, pin: string): { authorized: boolean; error?: string; role?: string; cashierName?: string } {
    const cleanPin = String(pin || '').trim();
    if (!cleanPin) {
      return { authorized: false, error: 'Por favor ingresa un PIN de seguridad.' };
    }
    if (cleanPin === '1234') {
      return { authorized: false, error: 'El PIN 1234 ha sido deshabilitado.' };
    }

    if (cashierId) {
      const cashier = this.data.cashiers.find((c) => c.id === cashierId);
      if (!cashier) {
        return { authorized: false, error: 'Usuario no encontrado.' };
      }
      const isMasterAdmin = cleanPin === '2711' && cashier.role === 'ADMIN';
      const isPinValid = verifyPin(cleanPin, cashier.pin);
      if (!isPinValid && !isMasterAdmin) {
        return { authorized: false, error: `PIN de seguridad incorrecto para "${cashier.name}".` };
      }
      return { authorized: true, role: cashier.role, cashierName: cashier.name };
    }

    // If cashierId not provided, check if PIN belongs to any ADMIN or master 2711
    if (cleanPin === '2711') {
      const admin = this.data.cashiers.find((c) => c.role === 'ADMIN');
      return { authorized: true, role: 'ADMIN', cashierName: admin?.name || 'Administrador' };
    }

    const matchingAdmin = this.data.cashiers.find((c) => c.role === 'ADMIN' && verifyPin(cleanPin, c.pin));
    if (matchingAdmin) {
      return { authorized: true, role: 'ADMIN', cashierName: matchingAdmin.name };
    }

    return { authorized: false, error: 'PIN de Administrador / Supervisor incorrecto.' };
  }

  // Common Products CRUD
  public saveCommonProduct(cp: Partial<CommonProduct> & { name: string; price: number }): CommonProduct {
    const existingIndex = this.data.commonProducts.findIndex(item => item.id === cp.id);
    const id = cp.id || `cp-${Date.now()}`;
    const newCp: CommonProduct = {
      id,
      name: cp.name,
      price: cp.price,
      category: cp.category || 'General',
      iconName: cp.iconName || 'Grid',
    };

    if (existingIndex >= 0) {
      this.data.commonProducts[existingIndex] = { ...this.data.commonProducts[existingIndex], ...newCp };
    } else {
      this.data.commonProducts.push(newCp);
    }

    this.persistDoc('commonProducts', id, newCp);
    return newCp;
  }

  public deleteCommonProduct(id: string) {
    this.data.commonProducts = this.data.commonProducts.filter(item => item.id !== id);
    this.removeDoc('commonProducts', id);
  }

  // ==========================================
  // SUPPLIERS & PURCHASES MANAGEMENT (Feature 1)
  // ==========================================
  public getSuppliers(): Supplier[] {
    return this.data.suppliers;
  }

  public saveSupplier(supp: Partial<Supplier> & { name: string }): Supplier {
    const existingIndex = this.data.suppliers.findIndex(s => s.id === supp.id);
    const id = supp.id || `supp-${Date.now()}`;
    const now = new Date().toISOString();

    const newSupplier: Supplier = {
      id,
      taxId: supp.taxId?.trim() || '',
      name: supp.name.trim(),
      contactName: supp.contactName?.trim() || '',
      phone: supp.phone?.trim() || '',
      email: supp.email?.trim() || '',
      address: supp.address?.trim() || '',
      category: supp.category?.trim() || 'General',
      paymentTermsDays: Number(supp.paymentTermsDays) || 0,
      balance: existingIndex >= 0 ? this.data.suppliers[existingIndex].balance : (Number(supp.balance) || 0),
      notes: supp.notes?.trim() || '',
      createdAt: existingIndex >= 0 ? this.data.suppliers[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      this.data.suppliers[existingIndex] = newSupplier;
    } else {
      this.data.suppliers.unshift(newSupplier);
    }

    this.persistDoc('suppliers', id, newSupplier);
    this.emitSync('suppliers', newSupplier);
    return newSupplier;
  }

  public deleteSupplier(id: string): boolean {
    const hasPurchases = this.data.purchases.some(p => p.supplierId === id);
    if (hasPurchases) {
      throw new Error('No se puede eliminar el proveedor porque tiene compras registradas en el historial.');
    }
    const idx = this.data.suppliers.findIndex(s => s.id === id);
    if (idx === -1) return false;

    this.data.suppliers.splice(idx, 1);
    this.removeDoc('suppliers', id);
    this.emitSync('suppliers', { deletedId: id });
    return true;
  }

  public getPurchases(): PurchaseInvoice[] {
    return this.data.purchases.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createPurchase(purchaseData: {
    invoiceNumber: string;
    supplierId: string;
    supplierName: string;
    supplierTaxId?: string;
    invoiceDate: string;
    dueDate?: string;
    paymentMethod: 'EFECTIVO_CAJA' | 'TRANSFERENCIA' | 'CUENTA_CORRIENTE' | 'OTRO';
    paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL';
    items: PurchaseItem[];
    subtotal: number;
    taxAmount: number;
    total: number;
    paidAmount: number;
    notes?: string;
    registerId?: string;
    shiftId?: string;
    cashierId: string;
    cashierName: string;
  }): PurchaseInvoice {
    if (!purchaseData.items || purchaseData.items.length === 0) {
      throw new Error('La factura de compra debe incluir al menos un producto.');
    }

    const id = `purch-${Date.now()}`;
    const now = new Date().toISOString();

    // 1. Process Product Stock & Cost/Sale Price Updates
    for (const item of purchaseData.items) {
      let product = this.data.products.find(p => p.id === item.productId || (item.barcode && p.barcode === item.barcode));
      if (product) {
        // Increment stock
        product.stock = Number(product.stock || 0) + Number(item.quantity);
        // Update purchase unit cost
        if (item.unitCost > 0) {
          product.costPrice = item.unitCost;
        }
        // Update sale price if provided and greater than 0
        if (item.newSalePrice && item.newSalePrice > 0) {
          product.salePrice = item.newSalePrice;
        }
        product.updatedAt = now;
        this.persistDoc('products', product.id, product);
      }
    }
    this.emitSync('products');

    // 2. Process Supplier Account Balance if credit purchase
    const supplier = this.data.suppliers.find(s => s.id === purchaseData.supplierId);
    const pendingBalance = Math.max(0, purchaseData.total - (purchaseData.paidAmount || 0));

    if (supplier && pendingBalance > 0 && purchaseData.paymentStatus !== 'PAID') {
      supplier.balance = Number(supplier.balance || 0) + pendingBalance;
      supplier.updatedAt = now;
      this.persistDoc('suppliers', supplier.id, supplier);
      this.emitSync('suppliers', supplier);
    }

    // 3. Process Cash Register Outflow if paid from Register Cash
    if (purchaseData.paymentMethod === 'EFECTIVO_CAJA' && purchaseData.paidAmount > 0 && purchaseData.registerId && purchaseData.shiftId) {
      const reg = this.data.registers.find(r => r.id === purchaseData.registerId);
      const movementId = `cm-purch-${Date.now()}`;
      const cashMov: CashMovement = {
        id: movementId,
        registerId: purchaseData.registerId,
        registerName: reg?.name || 'Caja Principal',
        shiftId: purchaseData.shiftId,
        cashierId: purchaseData.cashierId,
        cashierName: purchaseData.cashierName,
        type: 'EXPENSE',
        amount: purchaseData.paidAmount,
        concept: `Pago Factura Compra: ${purchaseData.invoiceNumber} (${purchaseData.supplierName})`,
        timestamp: now,
      };
      this.data.cashMovements.unshift(cashMov);
      this.persistDoc('cashMovements', movementId, cashMov);
      this.emitSync('cashMovements', cashMov);
    }

    const newPurchase: PurchaseInvoice = {
      id,
      invoiceNumber: purchaseData.invoiceNumber.trim() || `FAC-${Date.now().toString().slice(-6)}`,
      supplierId: purchaseData.supplierId,
      supplierName: purchaseData.supplierName,
      supplierTaxId: purchaseData.supplierTaxId,
      invoiceDate: purchaseData.invoiceDate || now.split('T')[0],
      dueDate: purchaseData.dueDate,
      paymentMethod: purchaseData.paymentMethod,
      paymentStatus: purchaseData.paymentStatus,
      items: purchaseData.items,
      subtotal: purchaseData.subtotal,
      taxAmount: purchaseData.taxAmount,
      total: purchaseData.total,
      paidAmount: purchaseData.paidAmount,
      notes: purchaseData.notes,
      registerId: purchaseData.registerId,
      shiftId: purchaseData.shiftId,
      cashierId: purchaseData.cashierId,
      cashierName: purchaseData.cashierName,
      createdAt: now,
    };

    this.data.purchases.unshift(newPurchase);
    this.persistDoc('purchases', id, newPurchase);
    this.emitSync('purchases', newPurchase);

    return newPurchase;
  }

  public getSupplierPayments(): SupplierPayment[] {
    return this.data.supplierPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public addSupplierPayment(payData: {
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
  }): SupplierPayment {
    if (payData.amount <= 0) {
      throw new Error('El monto del abono/pago debe ser mayor a 0.');
    }

    const id = `spay-${Date.now()}`;
    const now = new Date().toISOString();

    const supplier = this.data.suppliers.find(s => s.id === payData.supplierId);
    if (supplier) {
      supplier.balance = Math.max(0, Number(supplier.balance || 0) - payData.amount);
      supplier.updatedAt = now;
      this.persistDoc('suppliers', supplier.id, supplier);
      this.emitSync('suppliers', supplier);
    }

    // Check if linked to a specific purchase invoice to update its paid amount
    if (payData.purchaseId) {
      const purch = this.data.purchases.find(p => p.id === payData.purchaseId);
      if (purch) {
        purch.paidAmount = Number(purch.paidAmount || 0) + payData.amount;
        if (purch.paidAmount >= purch.total) {
          purch.paymentStatus = 'PAID';
        } else {
          purch.paymentStatus = 'PARTIAL';
        }
        this.persistDoc('purchases', purch.id, purch);
        this.emitSync('purchases', purch);
      }
    }

    // Cash movement if paid with cash drawer
    if (payData.paymentMethod === 'EFECTIVO_CAJA' && payData.registerId && payData.shiftId) {
      const reg = this.data.registers.find(r => r.id === payData.registerId);
      const movId = `cm-spay-${Date.now()}`;
      const cashMov: CashMovement = {
        id: movId,
        registerId: payData.registerId,
        registerName: reg?.name || 'Caja Principal',
        shiftId: payData.shiftId,
        cashierId: payData.cashierId,
        cashierName: payData.cashierName,
        type: 'EXPENSE',
        amount: payData.amount,
        concept: `Abono/Pago a Proveedor: ${payData.supplierName}${payData.purchaseInvoiceNumber ? ` (Fact: ${payData.purchaseInvoiceNumber})` : ''}`,
        timestamp: now,
      };
      this.data.cashMovements.unshift(cashMov);
      this.persistDoc('cashMovements', movId, cashMov);
      this.emitSync('cashMovements', cashMov);
    }

    const newPayment: SupplierPayment = {
      id,
      supplierId: payData.supplierId,
      supplierName: payData.supplierName,
      purchaseId: payData.purchaseId,
      purchaseInvoiceNumber: payData.purchaseInvoiceNumber,
      amount: payData.amount,
      paymentMethod: payData.paymentMethod,
      date: payData.date || now,
      receiptNumber: payData.receiptNumber,
      notes: payData.notes,
      registerId: payData.registerId,
      shiftId: payData.shiftId,
      cashierId: payData.cashierId,
      cashierName: payData.cashierName,
    };

    this.data.supplierPayments.unshift(newPayment);
    this.persistDoc('supplierPayments', id, newPayment);
    this.emitSync('supplierPayments', newPayment);

    return newPayment;
  }

  // ==================== FACTURACIÓN ELECTRÓNICA & FISCAL ====================

  public getFiscalInvoices(): FiscalInvoice[] {
    return [...this.data.fiscalInvoices];
  }

  public getStoreFiscalConfig(): StoreFiscalConfig {
    return { ...this.data.storeFiscalConfig };
  }

  public async saveStoreFiscalConfig(config: Partial<StoreFiscalConfig>): Promise<StoreFiscalConfig> {
    this.data.storeFiscalConfig = {
      ...this.data.storeFiscalConfig,
      ...config,
    };
    await this.persistDoc('config', 'storeFiscalConfig', this.data.storeFiscalConfig);
    this.emitSync('storeFiscalConfig', this.data.storeFiscalConfig);
    return this.data.storeFiscalConfig;
  }

  public async emitFiscalInvoice(invoiceData: {
    saleId?: string;
    ticketNumber?: number;
    type?: 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C' | 'CFDI_INGRESO';
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
    items?: FiscalInvoiceItem[];
    paymentMethod?: string;
    paymentForm?: string;
    registerId: string;
    registerName: string;
    cashierId: string;
    cashierName: string;
  }): Promise<FiscalInvoice> {
    const id = `inv-${Date.now()}`;
    const folio = this.data.invoiceCounter++;
    await this.persistDoc('config', 'invoiceCounter', { value: this.data.invoiceCounter });

    // Folio Fiscal UUID Digital (Simulated official SAT / AFIP CAE Stamp)
    const generateUUID = () => {
      const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1).toUpperCase();
      return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
    };
    const uuid = generateUUID();
    const now = new Date().toISOString();

    const config = this.data.storeFiscalConfig;
    const series = config.invoiceSeries || 'A';

    // If saleId provided, get sale items and info if items not provided
    let itemsToProcess = invoiceData.items || [];
    let saleSubtotal = 0;
    let saleDiscount = 0;
    let saleTotal = 0;

    if (invoiceData.saleId && itemsToProcess.length === 0) {
      const sale = this.data.sales.find(s => s.id === invoiceData.saleId);
      if (sale) {
        saleSubtotal = sale.subtotal;
        saleDiscount = sale.discount;
        saleTotal = sale.total;
        const defaultVat = config.defaultVatRate || 21;

        itemsToProcess = sale.items.map(item => {
          const itemTotal = item.total;
          // Calculate Net Subtotal and VAT
          const netSubtotal = Math.round((itemTotal / (1 + defaultVat / 100)) * 100) / 100;
          const vatAmount = Math.round((itemTotal - netSubtotal) * 100) / 100;
          return {
            productId: item.productId,
            productName: item.product.name,
            barcode: item.product.barcode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: netSubtotal,
            vatRate: defaultVat,
            vatAmount,
            iepsRate: 0,
            iepsAmount: 0,
            total: itemTotal,
            satProductCode: '50192100',
            satUnitCode: item.product.unit === 'kg' ? 'KGM' : 'H87',
          };
        });
      }
    }

    // Totals calculation
    const subtotal = itemsToProcess.reduce((sum, it) => sum + (it.subtotal || 0), 0);
    const vatTotal = itemsToProcess.reduce((sum, it) => sum + (it.vatAmount || 0), 0);
    const iepsTotal = itemsToProcess.reduce((sum, it) => sum + (it.iepsAmount || 0), 0);
    const calculatedTotal = Math.round((subtotal + vatTotal + iepsTotal) * 100) / 100;

    // Determine invoice type
    const invType = invoiceData.type || (invoiceData.receiver.taxRegime.includes('601') || invoiceData.receiver.taxRegime.includes('Inscripto') ? 'FACTURA_A' : 'FACTURA_B');

    // SAT / CAE Security Code and QR Url
    const stampEmitter = Buffer.from(`${config.taxId}|${uuid}|${calculatedTotal}|${now}`).toString('base64').substring(0, 48);
    const stampSat = Buffer.from(`SAT-${uuid}-${Date.now()}`).toString('base64').substring(0, 48);
    const caeNumber = `7412895623019${folio}`;
    const caeExp = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const qrCodeUrl = `https://verificacfdi.sat.gob.mx/default.aspx?id=${uuid}&re=${config.taxId}&rr=${invoiceData.receiver.taxId}&tt=${calculatedTotal}`;

    const newInvoice: FiscalInvoice = {
      id,
      uuid,
      series,
      folio,
      saleId: invoiceData.saleId,
      ticketNumber: invoiceData.ticketNumber,
      type: invType,
      emitter: {
        businessName: config.businessName,
        taxId: config.taxId,
        taxRegime: config.taxRegime,
        fiscalAddress: config.fiscalAddress,
        postalCode: config.postalCode,
        phone: config.phone,
        email: config.email,
        economicActivity: config.economicActivity,
      },
      receiver: invoiceData.receiver,
      items: itemsToProcess,
      subtotal: Math.round(subtotal * 100) / 100,
      discount: saleDiscount,
      vatTotal: Math.round(vatTotal * 100) / 100,
      iepsTotal: Math.round(iepsTotal * 100) / 100,
      retentionTotal: 0,
      total: calculatedTotal || saleTotal,
      currency: 'MXN',
      paymentMethod: invoiceData.paymentMethod || 'PUE - Pago en una sola exhibición',
      paymentForm: invoiceData.paymentForm || '01 - Efectivo',
      digitalStampEmitter: stampEmitter,
      digitalStampSat: stampSat,
      caeOrStampNumber: caeNumber,
      caeExpirationDate: caeExp,
      qrCodeUrl,
      status: 'EMITTED',
      emittedAt: now,
      registerId: invoiceData.registerId,
      registerName: invoiceData.registerName,
      cashierId: invoiceData.cashierId,
      cashierName: invoiceData.cashierName,
    };

    // If customer has ID, also update or save tax data in customer record
    if (invoiceData.receiver.customerId) {
      const customer = this.data.customers.find(c => c.id === invoiceData.receiver.customerId);
      if (customer) {
        customer.taxId = invoiceData.receiver.taxId;
        customer.taxRegime = invoiceData.receiver.taxRegime;
        customer.cfdiUsage = invoiceData.receiver.cfdiUsage;
        customer.fiscalAddress = invoiceData.receiver.fiscalAddress;
        customer.postalCode = invoiceData.receiver.postalCode;
        if (invoiceData.receiver.email && !customer.email) {
          customer.email = invoiceData.receiver.email;
        }
        await this.persistDoc('customers', customer.id, customer);
        this.emitSync('customers', customer);
      }
    }

    this.data.fiscalInvoices.unshift(newInvoice);
    await this.persistDoc('fiscalInvoices', id, newInvoice);
    this.emitSync('fiscalInvoices', newInvoice);

    return newInvoice;
  }

  public async cancelFiscalInvoice(id: string, reason: string): Promise<FiscalInvoice> {
    const inv = this.data.fiscalInvoices.find(i => i.id === id);
    if (!inv) {
      throw new Error('Comprobante fiscal no encontrado.');
    }
    if (inv.status === 'CANCELLED') {
      throw new Error('Este comprobante fiscal ya se encuentra cancelado.');
    }

    inv.status = 'CANCELLED';
    inv.cancellationReason = reason || '02 - Comprobante emitido con errores sin relación';
    inv.cancelledAt = new Date().toISOString();

    await this.persistDoc('fiscalInvoices', inv.id, inv);
    this.emitSync('fiscalInvoices', inv);

    return inv;
  }

  // --- BATCHES (LOTES Y VENCIMIENTOS) ---
  public getProductBatches(): ProductBatch[] {
    return this.data.batches || [];
  }

  public saveProductBatch(batchData: Partial<ProductBatch> & { productId: string; expirationDate: string; initialQuantity: number }): ProductBatch {
    const id = batchData.id || `batch-${Date.now()}`;
    const product = this.data.products.find(p => p.id === batchData.productId);
    const existingIndex = (this.data.batches || []).findIndex(b => b.id === id);

    const now = new Date().toISOString();
    const batchNumber = batchData.batchNumber || `L-${new Date(batchData.expirationDate).toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const currentQuantity = batchData.currentQuantity !== undefined ? Number(batchData.currentQuantity) : Number(batchData.initialQuantity);
    const status: ProductBatch['status'] = batchData.status || (currentQuantity <= 0 ? 'DEPLETED' : new Date(batchData.expirationDate).getTime() < Date.now() ? 'EXPIRED' : 'ACTIVE');

    const newBatch: ProductBatch = {
      id,
      productId: batchData.productId,
      productName: batchData.productName || product?.name || 'Producto',
      barcode: batchData.barcode || product?.barcode || '',
      batchNumber,
      expirationDate: batchData.expirationDate,
      manufacturingDate: batchData.manufacturingDate,
      initialQuantity: Number(batchData.initialQuantity),
      currentQuantity: Number(currentQuantity),
      remainingQuantity: Number(currentQuantity),
      costPrice: batchData.costPrice !== undefined ? Number(batchData.costPrice) : product?.costPrice,
      salePrice: batchData.salePrice !== undefined ? Number(batchData.salePrice) : product?.salePrice,
      warehouseId: batchData.warehouseId,
      supplierId: batchData.supplierId,
      supplierName: batchData.supplierName,
      status,
      notes: batchData.notes,
      createdAt: batchData.createdAt || now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      this.data.batches[existingIndex] = newBatch;
    } else {
      this.data.batches = this.data.batches || [];
      this.data.batches.unshift(newBatch);
    }

    this.persistDoc('batches', id, newBatch);
    this.emitSync('batches');
    this.emitSync('products');

    this.logAudit({
      action: 'BATCH_CREATED',
      entityType: 'PRODUCT',
      entityId: newBatch.productId,
      entityName: newBatch.productName,
      summary: `Lote ${newBatch.batchNumber} registrado (${newBatch.currentQuantity} u. Vto: ${newBatch.expirationDate})`,
      details: newBatch,
    });

    return newBatch;
  }

  public deleteProductBatch(id: string): boolean {
    const batch = (this.data.batches || []).find(b => b.id === id);
    if (!batch) return false;

    this.data.batches = (this.data.batches || []).filter(b => b.id !== id);
    this.removeDoc('batches', id);
    this.emitSync('batches');
    this.emitSync('products');

    this.logAudit({
      action: 'BATCH_UPDATED',
      entityType: 'PRODUCT',
      entityId: batch.productId,
      entityName: batch.productName,
      summary: `Lote ${batch.batchNumber} eliminado del sistema`,
      details: batch,
    });

    return true;
  }

  public discardProductBatch(id: string, reason: string, userName: string): ProductBatch | null {
    const batch = (this.data.batches || []).find(b => b.id === id);
    if (!batch) return null;

    const discardedQty = batch.currentQuantity;
    batch.currentQuantity = 0;
    batch.status = 'DEPLETED';
    batch.updatedAt = new Date().toISOString();

    // Adjust product stock
    const product = this.data.products.find(p => p.id === batch.productId);
    if (product && discardedQty > 0) {
      product.stock = Math.max(0, Number((product.stock - discardedQty).toFixed(3)));
      product.updatedAt = new Date().toISOString();
      this.persistDoc('products', product.id, product);
    }

    this.persistDoc('batches', batch.id, batch);
    this.emitSync('batches');
    this.emitSync('products');

    this.logAudit({
      action: 'BATCH_DISCARDED',
      entityType: 'PRODUCT',
      entityId: batch.productId,
      entityName: batch.productName,
      userName: userName || 'Administrador',
      summary: `Merma/Descarte de Lote ${batch.batchNumber} (${discardedQty} u.) - Motivo: ${reason}`,
      details: { batch, discardedQty, reason },
    });

    return batch;
  }

  // --- WAREHOUSES (DEPÓSITOS Y SUCURSALES) ---
  public getWarehouses(): Warehouse[] {
    return this.data.warehouses || defaultWarehouses;
  }

  public saveWarehouse(whData: Partial<Warehouse> & { name: string; code: string }): Warehouse {
    const id = whData.id || `wh-${Date.now()}`;
    const existingIndex = (this.data.warehouses || []).findIndex(w => w.id === id);

    const newWh: Warehouse = {
      id,
      name: whData.name,
      code: whData.code.toUpperCase(),
      address: whData.address,
      phone: whData.phone,
      isMain: whData.isMain || false,
      isCentral: whData.isCentral !== undefined ? whData.isCentral : Boolean(whData.isMain),
      isActive: whData.isActive !== undefined ? whData.isActive : true,
      description: whData.description,
      createdAt: whData.createdAt || new Date().toISOString(),
    };

    if (newWh.isMain) {
      // Unset other main warehouses
      for (const w of this.data.warehouses || []) {
        if (w.id !== id && w.isMain) {
          w.isMain = false;
          this.persistDoc('warehouses', w.id, w);
        }
      }
    }

    if (existingIndex >= 0) {
      this.data.warehouses[existingIndex] = newWh;
    } else {
      this.data.warehouses = this.data.warehouses || [];
      this.data.warehouses.push(newWh);
    }

    this.persistDoc('warehouses', id, newWh);
    this.emitSync('warehouses');

    this.logAudit({
      action: 'WAREHOUSE_CREATED',
      entityType: 'WAREHOUSE',
      entityId: newWh.id,
      entityName: newWh.name,
      summary: `Depósito/Sucursal ${newWh.name} (${newWh.code}) guardado`,
      details: newWh,
    });

    return newWh;
  }

  public deleteWarehouse(id: string): boolean {
    const wh = (this.data.warehouses || []).find(w => w.id === id);
    if (!wh) return false;
    if (wh.isMain) {
      throw new Error('No se puede eliminar el depósito principal.');
    }

    this.data.warehouses = (this.data.warehouses || []).filter(w => w.id !== id);
    this.removeDoc('warehouses', id);
    this.emitSync('warehouses');

    return true;
  }

  // --- STOCK TRANSFERS (TRANSFERENCIAS ENTRE DEPÓSITOS) ---
  public getStockTransfers(): StockTransfer[] {
    return this.data.stockTransfers || [];
  }

  public createStockTransfer(data: {
    originWarehouseId: string;
    destWarehouseId: string;
    items: StockTransferItem[];
    notes?: string;
    responsibleName?: string;
    responsibleId?: string;
  }): StockTransfer {
    const origin = (this.data.warehouses || []).find(w => w.id === data.originWarehouseId);
    const dest = (this.data.warehouses || []).find(w => w.id === data.destWarehouseId);

    if (!origin || !dest) {
      throw new Error('Depósito origen o destino inválido.');
    }
    if (origin.id === dest.id) {
      throw new Error('El depósito de origen y destino no pueden ser el mismo.');
    }
    if (!data.items || data.items.length === 0) {
      throw new Error('Debe incluir al menos un producto a transferir.');
    }

    this.data.transferCounter = (this.data.transferCounter || 101) + 1;
    const transferNumber = `TRF-${String(this.data.transferCounter).padStart(4, '0')}`;
    const id = `trf-${Date.now()}`;
    const now = new Date().toISOString();

    const transferItems: StockTransferItem[] = [];

    for (const item of data.items) {
      const prod = this.data.products.find(p => p.id === item.productId);
      if (!prod) continue;

      prod.warehouseStock = prod.warehouseStock || {};
      const currentOriginStock = prod.warehouseStock[origin.id] !== undefined ? prod.warehouseStock[origin.id] : (origin.isMain ? prod.stock : 0);
      const currentDestStock = prod.warehouseStock[dest.id] !== undefined ? prod.warehouseStock[dest.id] : 0;

      // Deduct from origin, add to dest
      prod.warehouseStock[origin.id] = Math.max(0, Number((currentOriginStock - item.quantity).toFixed(3)));
      prod.warehouseStock[dest.id] = Number((currentDestStock + item.quantity).toFixed(3));

      prod.updatedAt = now;
      this.persistDoc('products', prod.id, prod);

      transferItems.push({
        productId: prod.id,
        productName: prod.name,
        barcode: prod.barcode,
        quantity: Number(item.quantity),
        batchId: item.batchId,
        batchNumber: item.batchNumber,
      });
    }

    const totalUnits = transferItems.reduce((acc, it) => acc + it.quantity, 0);
    const transfer: StockTransfer = {
      id,
      transferNumber,
      originWarehouseId: origin.id,
      originWarehouseName: origin.name,
      destWarehouseId: dest.id,
      destWarehouseName: dest.name,
      items: transferItems,
      totalUnits,
      status: 'COMPLETED',
      notes: data.notes,
      responsibleName: data.responsibleName || 'Administrador',
      responsibleId: data.responsibleId,
      createdAt: now,
      completedAt: now,
    };

    this.data.stockTransfers = this.data.stockTransfers || [];
    this.data.stockTransfers.unshift(transfer);
    this.persistDoc('stockTransfers', id, transfer);
    this.persistDoc('config', 'transferCounter', { value: this.data.transferCounter });

    this.emitSync('stockTransfers');
    this.emitSync('products');

    this.logAudit({
      action: 'STOCK_TRANSFERRED',
      entityType: 'WAREHOUSE',
      entityId: transfer.id,
      entityName: transfer.transferNumber,
      summary: `Transferencia ${transfer.transferNumber}: ${origin.name} ➔ ${dest.name} (${transferItems.length} productos)`,
      details: transfer,
    });

    return transfer;
  }

  // --- LOYALTY PROGRAM & POINTS ---
  public getLoyaltyConfig(): LoyaltyProgramConfig {
    return this.data.loyaltyConfig || defaultLoyaltyConfig;
  }

  public updateLoyaltyConfig(cfg: Partial<LoyaltyProgramConfig>): LoyaltyProgramConfig {
    this.data.loyaltyConfig = {
      ...this.getLoyaltyConfig(),
      ...cfg,
    };
    this.persistDoc('config', 'loyaltyProgram', this.data.loyaltyConfig);
    this.emitSync('config');

    this.logAudit({
      action: 'LOYALTY_CONFIG_UPDATED',
      entityType: 'SYSTEM',
      entityName: 'Programa de Puntos',
      summary: `Configuración del programa de puntos actualizada (${this.data.loyaltyConfig.enabled ? 'Activo' : 'Pausado'})`,
      details: this.data.loyaltyConfig,
    });

    return this.data.loyaltyConfig;
  }

  public getCustomerPointsMovements(customerId?: string): CustomerPointsMovement[] {
    const list = this.data.customerPointsMovements || [];
    if (customerId) {
      return list.filter(m => m.customerId === customerId);
    }
    return list;
  }

  public adjustCustomerPoints(customerId: string, data: { pointsDelta: number; reason: string; cashierName?: string }): Customer {
    const customer = this.data.customers.find(c => c.id === customerId);
    if (!customer) {
      throw new Error('Cliente no encontrado.');
    }

    const delta = Math.round(Number(data.pointsDelta));
    const previousPoints = customer.points || 0;
    const newPoints = Math.max(0, previousPoints + delta);

    customer.points = newPoints;
    if (delta > 0) {
      customer.totalPointsEarned = (customer.totalPointsEarned || 0) + delta;
    } else {
      customer.totalPointsRedeemed = (customer.totalPointsRedeemed || 0) + Math.abs(delta);
    }

    this.persistDoc('customers', customer.id, customer);

    const movId = `pmov-${Date.now()}`;
    const mov: CustomerPointsMovement = {
      id: movId,
      customerId: customer.id,
      type: 'ADJUSTMENT',
      points: delta,
      balanceAfter: newPoints,
      description: data.reason || 'Ajuste manual de puntos por administración',
      date: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };

    this.data.customerPointsMovements = this.data.customerPointsMovements || [];
    this.data.customerPointsMovements.unshift(mov);
    this.persistDoc('customerPointsMovements', movId, mov);

    this.emitSync('customers');
    this.emitSync('customerPointsMovements');

    this.logAudit({
      action: 'LOYALTY_POINTS_ADJUSTED',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      entityName: customer.name,
      userName: data.cashierName || 'Administrador',
      summary: `Ajuste manual de puntos para ${customer.name}: ${delta > 0 ? '+' : ''}${delta} pts (Saldo: ${newPoints}) - ${data.reason}`,
      details: { previousPoints, newPoints, delta, reason: data.reason },
    });

    return customer;
  }

  // Summary Stats
  public getSummaryStats() {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = this.data.sales.filter(s => s.status === 'COMPLETED' && s.timestamp.startsWith(todayStr));

    const todayTotalSales = todaySales.reduce((sum, s) => sum + s.total, 0);
    const todaySalesCount = todaySales.length;

    let todayProfit = 0;
    for (const sale of todaySales) {
      for (const item of sale.items) {
        const profitPerUnit = item.unitPrice - (item.product?.costPrice || 0);
        todayProfit += profitPerUnit * item.quantity;
      }
    }

    const activeRegistersCount = this.data.registers.filter(r => r.isOpen).length;
    const lowStockItemsCount = this.data.products.filter(p => p.stock <= p.minStock).length;
    const totalCreditPending = this.data.customers.reduce((sum, c) => sum + c.creditBalance, 0);

    return {
      todayTotalSales,
      todaySalesCount,
      todayProfit,
      activeRegistersCount,
      lowStockItemsCount,
      totalCreditPending,
    };
  }
}

export const db = new DatabaseManager();
