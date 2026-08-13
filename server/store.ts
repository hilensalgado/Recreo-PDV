import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
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
} from '../src/types/pos';

// Initialize Firebase App & Firestore
const app = getApps().length > 0 ? getApp() : initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

const firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);

interface DatabaseSchema {
  products: Product[];
  departments: Department[];
  customers: Customer[];
  customerMovements: CustomerCreditMovement[];
  sales: Sale[];
  registers: CashRegister[];
  shifts: CashShift[];
  cashMovements: CashMovement[];
  cashiers: Cashier[];
  holdTickets: HoldTicket[];
  commonProducts: CommonProduct[];
  ticketCounter: number;
}

const initialDepartments: Department[] = [
  { id: 'dep-1', name: 'Abarrotes', color: 'bg-blue-500' },
  { id: 'dep-2', name: 'Bebidas y Vinos', color: 'bg-cyan-500' },
  { id: 'dep-3', name: 'Lácteos y Embutidos', color: 'bg-amber-500' },
  { id: 'dep-4', name: 'Botanas y Dulcería', color: 'bg-orange-500' },
  { id: 'dep-5', name: 'Frutas y Verduras (Kilo)', color: 'bg-emerald-500' },
  { id: 'dep-6', name: 'Limpieza e Higiene', color: 'bg-indigo-500' },
  { id: 'dep-7', name: 'Panadería y Tortillas', color: 'bg-rose-500' },
  { id: 'dep-8', name: 'Servicios y Varios', color: 'bg-purple-500' },
];

const initialRegisters: CashRegister[] = [
  {
    id: 'reg-1',
    name: 'Caja 1 - Principal (Mostrador)',
    location: 'Entrada Principal - Caja Central',
    isMain: true,
    isOpen: false,
  },
  {
    id: 'reg-2',
    name: 'Caja 2 - Salida',
    location: 'Área Secundaria',
    isMain: false,
    isOpen: false,
  },
];

const initialCashiers: Cashier[] = [
  {
    id: 'cash-1',
    name: 'Admin General',
    pin: '1234',
    role: 'ADMIN',
    permissions: {
      allowPriceChange: true,
      allowDiscounts: true,
      allowReturns: true,
      allowReports: true,
      allowInventoryEdit: true,
      allowCashDrawOpen: true,
    },
  },
];

const initialCommonProducts: CommonProduct[] = [
  { id: 'cp-1', name: 'Bolsa Ecológica', price: 5, category: 'General', iconName: 'ShoppingBag' },
  { id: 'cp-2', name: 'Bolsa de Hielo 5kg', price: 35, category: 'Abarrotes', iconName: 'Snowflake' },
  { id: 'cp-3', name: 'Copia Fotostática B/N', price: 2, category: 'Servicios', iconName: 'Copy' },
  { id: 'cp-4', name: 'Impresión Hoja Color', price: 5, category: 'Servicios', iconName: 'Printer' },
  { id: 'cp-5', name: 'Recarga Telefónica', price: 50, category: 'Servicios', iconName: 'Smartphone' },
  { id: 'cp-6', name: 'Envase Retornable Refresco', price: 20, category: 'Depósitos', iconName: 'Box' },
];

class DatabaseManager {
  private data: DatabaseSchema = {
    products: [],
    departments: initialDepartments,
    customers: [],
    customerMovements: [],
    sales: [],
    registers: initialRegisters,
    shifts: [],
    cashMovements: [],
    cashiers: initialCashiers,
    holdTickets: [],
    commonProducts: [],
    ticketCounter: 1001,
  };

  constructor() {
    this.init();
  }

  private async init() {
    try {
      console.log('Synchronizing with Firebase Firestore...');
      // Load collections from Firestore
      const [
        prodsSnap,
        depsSnap,
        custsSnap,
        custMovsSnap,
        salesSnap,
        regsSnap,
        shiftsSnap,
        cashMovsSnap,
        cashiersSnap,
        holdsSnap,
        commonSnap,
        metaSnap,
      ] = await Promise.all([
        getDocs(collection(firestoreDb, 'products')),
        getDocs(collection(firestoreDb, 'departments')),
        getDocs(collection(firestoreDb, 'customers')),
        getDocs(collection(firestoreDb, 'customerMovements')),
        getDocs(collection(firestoreDb, 'sales')),
        getDocs(collection(firestoreDb, 'registers')),
        getDocs(collection(firestoreDb, 'shifts')),
        getDocs(collection(firestoreDb, 'cashMovements')),
        getDocs(collection(firestoreDb, 'cashiers')),
        getDocs(collection(firestoreDb, 'holdTickets')),
        getDocs(collection(firestoreDb, 'commonProducts')),
        getDoc(doc(firestoreDb, 'meta', 'counter')),
      ]);

      if (metaSnap.exists()) {
        this.data.ticketCounter = metaSnap.data().ticketCounter || 1001;
      }

      if (!depsSnap.empty) {
        this.data.departments = depsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Department));
      } else {
        // Seed default departments in Firestore
        for (const dep of initialDepartments) {
          await setDoc(doc(firestoreDb, 'departments', dep.id), dep);
        }
      }

      if (!regsSnap.empty) {
        this.data.registers = regsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CashRegister));
      } else {
        // Seed default registers
        for (const reg of initialRegisters) {
          await setDoc(doc(firestoreDb, 'registers', reg.id), reg);
        }
      }

      if (!cashiersSnap.empty) {
        this.data.cashiers = cashiersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Cashier));
      } else {
        // Seed default admin cashier
        for (const c of initialCashiers) {
          await setDoc(doc(firestoreDb, 'cashiers', c.id), c);
        }
      }

      this.data.products = prodsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      this.data.customers = custsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
      this.data.customerMovements = custMovsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerCreditMovement));
      this.data.sales = salesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Sale));
      this.data.shifts = shiftsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CashShift));
      this.data.cashMovements = cashMovsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CashMovement));
      this.data.holdTickets = holdsSnap.docs.map(d => ({ id: d.id, ...d.data() } as HoldTicket));
      if (!commonSnap.empty) {
        this.data.commonProducts = commonSnap.docs.map(d => ({ id: d.id, ...d.data() } as CommonProduct));
      } else {
        for (const cp of initialCommonProducts) {
          await setDoc(doc(firestoreDb, 'commonProducts', cp.id), cp);
        }
        this.data.commonProducts = initialCommonProducts;
      }

      console.log('Firebase Firestore synchronized successfully!');
    } catch (err) {
      console.error('Error initializing from Firebase Firestore:', err);
    }
  }

  public async resetSeed() {
    this.data = {
      products: [],
      departments: initialDepartments,
      customers: [],
      customerMovements: [],
      sales: [],
      registers: initialRegisters,
      shifts: [],
      cashMovements: [],
      cashiers: initialCashiers,
      holdTickets: [],
      commonProducts: [],
      ticketCounter: 1001,
    };

    try {
      await setDoc(doc(firestoreDb, 'meta', 'counter'), { ticketCounter: 1001 });
      for (const dep of initialDepartments) {
        await setDoc(doc(firestoreDb, 'departments', dep.id), dep);
      }
      for (const reg of initialRegisters) {
        await setDoc(doc(firestoreDb, 'registers', reg.id), reg);
      }
      for (const c of initialCashiers) {
        await setDoc(doc(firestoreDb, 'cashiers', c.id), c);
      }
    } catch (err) {
      console.error('Error resetting Firebase seed:', err);
    }
  }

  // API Methods
  public getProducts() { return this.data.products; }
  public getDepartments() { return this.data.departments; }
  public getCustomers() { return this.data.customers; }
  public getCustomerMovements() { return this.data.customerMovements; }
  public getSales() { return this.data.sales; }
  public getRegisters() { return this.data.registers; }
  public getShifts() { return this.data.shifts; }
  public getCashMovements() { return this.data.cashMovements; }
  public getCashiers() { return this.data.cashiers; }
  public getHoldTickets() { return this.data.holdTickets; }
  public getCommonProducts() { return this.data.commonProducts; }

  // Products CRUD
  public saveProduct(prod: Partial<Product> & { barcode: string; name: string }): Product {
    const existingIndex = this.data.products.findIndex(p => p.id === prod.id || p.barcode === prod.barcode);
    const department = this.data.departments.find(d => d.id === prod.departmentId);
    
    const id = prod.id || `prod-${Date.now()}`;
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

    // Persist to Firestore asynchronously
    setDoc(doc(firestoreDb, 'products', id), newProd).catch(console.error);

    return newProd;
  }

  public deleteProduct(id: string) {
    this.data.products = this.data.products.filter(p => p.id !== id);
    deleteDoc(doc(firestoreDb, 'products', id)).catch(console.error);
  }

  public adjustStock(productId: string, quantityDelta: number, reason: string): Product | null {
    const prod = this.data.products.find(p => p.id === productId);
    if (!prod) return null;
    prod.stock = Math.max(0, Number((prod.stock + quantityDelta).toFixed(3)));
    prod.updatedAt = new Date().toISOString();
    
    setDoc(doc(firestoreDb, 'products', productId), prod).catch(console.error);
    return prod;
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

    setDoc(doc(firestoreDb, 'registers', id), newReg).catch(console.error);
    return newReg;
  }

  public openShift(registerId: string, cashierId: string, initialCash: number): CashShift {
    const register = this.data.registers.find(r => r.id === registerId);
    const cashier = this.data.cashiers.find(c => c.id === cashierId);
    if (!register) throw new Error('Register not found');

    const id = `shift-${Date.now()}`;
    const newShift: CashShift = {
      id,
      registerId: register.id,
      registerName: register.name,
      cashierId: cashier?.id || 'cash-1',
      cashierName: cashier?.name || 'Cajero',
      openedAt: new Date().toISOString(),
      initialCash: Number(initialCash),
      expectedCash: Number(initialCash),
      totalSalesCash: 0,
      totalSalesCard: 0,
      totalSalesCredit: 0,
      totalIncomes: 0,
      totalExpenses: 0,
      status: 'OPEN',
    };

    this.data.shifts.unshift(newShift);
    register.isOpen = true;
    register.currentCashierId = cashier?.id;
    register.currentCashierName = cashier?.name;
    register.activeShiftId = newShift.id;

    setDoc(doc(firestoreDb, 'shifts', id), newShift).catch(console.error);
    setDoc(doc(firestoreDb, 'registers', register.id), register).catch(console.error);

    return newShift;
  }

  public closeShift(shiftId: string, declaredCash: number, notes?: string): CashShift {
    const shift = this.data.shifts.find(s => s.id === shiftId);
    if (!shift) throw new Error('Shift not found');

    shift.closedAt = new Date().toISOString();
    shift.declaredCash = Number(declaredCash);
    shift.difference = Number((declaredCash - shift.expectedCash).toFixed(2));
    shift.notes = notes;
    shift.status = 'CLOSED';

    const register = this.data.registers.find(r => r.id === shift.registerId);
    if (register && register.activeShiftId === shiftId) {
      register.isOpen = false;
      register.activeShiftId = undefined;
      setDoc(doc(firestoreDb, 'registers', register.id), register).catch(console.error);
    }

    setDoc(doc(firestoreDb, 'shifts', shiftId), shift).catch(console.error);

    return shift;
  }

  // Cash In/Out Movements
  public addCashMovement(movement: { registerId: string; shiftId: string; cashierId: string; cashierName: string; type: 'INCOME' | 'EXPENSE'; amount: number; concept: string }): CashMovement {
    const register = this.data.registers.find(r => r.id === movement.registerId);
    const shift = this.data.shifts.find(s => s.id === movement.shiftId);

    const id = `cm-${Date.now()}`;
    const newMovement: CashMovement = {
      id,
      registerId: movement.registerId,
      registerName: register?.name || 'Caja',
      shiftId: movement.shiftId,
      cashierId: movement.cashierId,
      cashierName: movement.cashierName,
      type: movement.type,
      amount: Number(movement.amount),
      concept: movement.concept,
      timestamp: new Date().toISOString(),
    };

    this.data.cashMovements.unshift(newMovement);

    if (shift && shift.status === 'OPEN') {
      if (movement.type === 'INCOME') {
        shift.totalIncomes += movement.amount;
        shift.expectedCash += movement.amount;
      } else {
        shift.totalExpenses += movement.amount;
        shift.expectedCash -= movement.amount;
      }
      setDoc(doc(firestoreDb, 'shifts', shift.id), shift).catch(console.error);
    }

    setDoc(doc(firestoreDb, 'cashMovements', id), newMovement).catch(console.error);
    return newMovement;
  }

  // Complete Sale Logic (Atomic)
  public createSale(saleData: {
    registerId: string;
    shiftId: string;
    cashierId: string;
    cashierName: string;
    customerId?: string;
    items: { productId: string; quantity: number; unitPrice: number; discountPercentage?: number }[];
    paymentMethod: 'EFECTIVO' | 'TARJETA' | 'CREDITO' | 'MIXTO';
    cashPaid: number;
    cardPaid: number;
  }): Sale {
    const register = this.data.registers.find(r => r.id === saleData.registerId);
    const shift = this.data.shifts.find(s => s.id === saleData.shiftId);
    const customer = saleData.customerId ? this.data.customers.find(c => c.id === saleData.customerId) : undefined;

    if (!register) throw new Error('Caja no encontrada');

    // Build Cart Items & Update Stock
    let subtotal = 0;
    let totalDiscount = 0;
    const cartItems = [];

    for (const item of saleData.items) {
      const product = this.data.products.find(p => p.id === item.productId);
      if (!product) throw new Error(`Producto no encontrado ID: ${item.productId}`);

      if (product.stock < item.quantity) {
        console.warn(`Venta con stock insuficiente para ${product.name}. Stock actual: ${product.stock}`);
      }

      // Deduct Stock
      product.stock = Math.max(0, Number((product.stock - item.quantity).toFixed(3)));
      product.updatedAt = new Date().toISOString();
      setDoc(doc(firestoreDb, 'products', product.id), product).catch(console.error);

      const itemUnitPrice = item.unitPrice || product.salePrice;
      const isWholesale = item.quantity >= product.wholesaleMinQty && product.wholesalePrice > 0;
      const itemSubtotal = itemUnitPrice * item.quantity;
      const discPercent = item.discountPercentage || 0;
      const itemDiscount = (itemSubtotal * discPercent) / 100;
      const itemTotal = itemSubtotal - itemDiscount;

      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;

      cartItems.push({
        productId: product.id,
        product: { ...product },
        quantity: item.quantity,
        unitPrice: itemUnitPrice,
        isWholesaleApplied: isWholesale,
        discountPercentage: discPercent,
        subtotal: itemSubtotal,
        total: itemTotal,
      });
    }

    const total = subtotal - totalDiscount;
    const ticketNum = this.data.ticketCounter++;
    setDoc(doc(firestoreDb, 'meta', 'counter'), { ticketCounter: this.data.ticketCounter }).catch(console.error);

    let changeGiven = 0;
    if (saleData.paymentMethod === 'EFECTIVO') {
      changeGiven = Math.max(0, saleData.cashPaid - total);
    } else if (saleData.paymentMethod === 'MIXTO') {
      const totalPaid = saleData.cashPaid + saleData.cardPaid;
      changeGiven = Math.max(0, totalPaid - total);
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
      items: cartItems,
      subtotal,
      discount: totalDiscount,
      total,
      paymentMethod: saleData.paymentMethod,
      cashPaid: saleData.cashPaid,
      cardPaid: saleData.cardPaid,
      changeGiven,
      timestamp: new Date().toISOString(),
      status: 'COMPLETED',
      shiftId: saleData.shiftId,
    };

    this.data.sales.unshift(newSale);
    setDoc(doc(firestoreDb, 'sales', id), newSale).catch(console.error);

    // Update Shift calculations
    if (shift && shift.status === 'OPEN') {
      if (saleData.paymentMethod === 'EFECTIVO') {
        shift.totalSalesCash += total;
        shift.expectedCash += total;
      } else if (saleData.paymentMethod === 'TARJETA') {
        shift.totalSalesCard += total;
      } else if (saleData.paymentMethod === 'CREDITO') {
        shift.totalSalesCredit += total;
      } else if (saleData.paymentMethod === 'MIXTO') {
        shift.totalSalesCash += Math.min(total, saleData.cashPaid);
        shift.totalSalesCard += saleData.cardPaid;
        shift.expectedCash += Math.min(total, saleData.cashPaid);
      }
      setDoc(doc(firestoreDb, 'shifts', shift.id), shift).catch(console.error);
    }

    // Update Customer Credit balance if paid by CREDIT
    if (saleData.paymentMethod === 'CREDITO' && customer) {
      customer.creditBalance += total;
      setDoc(doc(firestoreDb, 'customers', customer.id), customer).catch(console.error);

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
      setDoc(doc(firestoreDb, 'customerMovements', cmovId), cmov).catch(console.error);
    }

    return newSale;
  }

  // Cancel Sale / Return
  public cancelSale(saleId: string, cashierName: string): Sale | null {
    const sale = this.data.sales.find(s => s.id === saleId);
    if (!sale || sale.status === 'CANCELLED') return null;

    sale.status = 'CANCELLED';
    setDoc(doc(firestoreDb, 'sales', saleId), sale).catch(console.error);

    // Restore Product Stock
    for (const item of sale.items) {
      const prod = this.data.products.find(p => p.id === item.productId);
      if (prod) {
        prod.stock = Number((prod.stock + item.quantity).toFixed(3));
        prod.updatedAt = new Date().toISOString();
        setDoc(doc(firestoreDb, 'products', prod.id), prod).catch(console.error);
      }
    }

    // Deduct from shift if active
    const shift = this.data.shifts.find(s => s.id === sale.shiftId);
    if (shift && shift.status === 'OPEN') {
      if (sale.paymentMethod === 'EFECTIVO') {
        shift.totalSalesCash -= sale.total;
        shift.expectedCash -= sale.total;
      } else if (sale.paymentMethod === 'TARJETA') {
        shift.totalSalesCard -= sale.total;
      } else if (sale.paymentMethod === 'CREDITO') {
        shift.totalSalesCredit -= sale.total;
      }
      setDoc(doc(firestoreDb, 'shifts', shift.id), shift).catch(console.error);
    }

    // Adjust customer credit if applicable
    if (sale.paymentMethod === 'CREDITO' && sale.customerId) {
      const cust = this.data.customers.find(c => c.id === sale.customerId);
      if (cust) {
        cust.creditBalance = Math.max(0, cust.creditBalance - sale.total);
        setDoc(doc(firestoreDb, 'customers', cust.id), cust).catch(console.error);

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
        setDoc(doc(firestoreDb, 'customerMovements', cmovId), cmov).catch(console.error);
      }
    }

    return sale;
  }

  // Customer Credit Payment
  public addCustomerPayment(customerId: string, amount: number, cashierId: string, cashierName: string, registerId: string): CustomerCreditMovement | null {
    const customer = this.data.customers.find(c => c.id === customerId);
    if (!customer) return null;

    customer.creditBalance = Math.max(0, Number((customer.creditBalance - amount).toFixed(2)));
    setDoc(doc(firestoreDb, 'customers', customer.id), customer).catch(console.error);

    const cmovId = `cmov-${Date.now()}`;
    const movement: CustomerCreditMovement = {
      id: cmovId,
      customerId,
      type: 'PAYMENT',
      amount,
      description: `Abono en efectivo de cliente ${customer.name}`,
      date: new Date().toISOString(),
      cashierId,
      registerId,
    };

    this.data.customerMovements.unshift(movement);
    setDoc(doc(firestoreDb, 'customerMovements', cmovId), movement).catch(console.error);

    // Record cash in shift
    const register = this.data.registers.find(r => r.id === registerId);
    if (register?.activeShiftId) {
      const shift = this.data.shifts.find(s => s.id === register.activeShiftId);
      if (shift && shift.status === 'OPEN') {
        shift.totalIncomes += amount;
        shift.expectedCash += amount;
        setDoc(doc(firestoreDb, 'shifts', shift.id), shift).catch(console.error);
      }
    }

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

    setDoc(doc(firestoreDb, 'customers', id), newCust).catch(console.error);
    return newCust;
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
    setDoc(doc(firestoreDb, 'holdTickets', id), newTicket).catch(console.error);
    return newTicket;
  }

  public deleteHoldTicket(id: string) {
    this.data.holdTickets = this.data.holdTickets.filter(t => t.id !== id);
    deleteDoc(doc(firestoreDb, 'holdTickets', id)).catch(console.error);
  }

  // Cashier CRUD
  public saveCashier(c: Partial<Cashier> & { name: string; pin: string }): Cashier {
    const existingIndex = this.data.cashiers.findIndex(item => item.id === c.id);
    const id = c.id || `cash-${Date.now()}`;
    const newCashier: Cashier = {
      id,
      name: c.name,
      pin: c.pin,
      role: c.role || 'CASHIER',
      permissions: c.permissions || {
        allowPriceChange: false,
        allowDiscounts: true,
        allowReturns: false,
        allowReports: false,
        allowInventoryEdit: false,
        allowCashDrawOpen: true,
      },
    };

    if (existingIndex >= 0) {
      this.data.cashiers[existingIndex] = { ...this.data.cashiers[existingIndex], ...newCashier };
    } else {
      this.data.cashiers.push(newCashier);
    }

    setDoc(doc(firestoreDb, 'cashiers', id), newCashier).catch(console.error);
    return newCashier;
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
