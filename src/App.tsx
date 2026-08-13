import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import {
  Product,
  Department,
  Customer,
  Sale,
  CashRegister,
  CashShift,
  Cashier,
  HoldTicket,
  CommonProduct,
  CartItem,
  PaymentMethod,
} from './types/pos';

// Components
import { Navbar } from './components/Navbar';
import { NavigationTabs, TabType } from './components/NavigationTabs';
import { SalesView } from './components/SalesView';
import { InventoryView } from './components/InventoryView';
import { CustomersView } from './components/CustomersView';
import { SalesHistoryView } from './components/SalesHistoryView';
import { CashCutView } from './components/CashCutView';
import { AnalyticsView } from './components/AnalyticsView';
import { RegistersCashiersView } from './components/RegistersCashiersView';

// Modals
import { OpenShiftModal } from './components/OpenShiftModal';
import { CheckoutModal } from './components/CheckoutModal';
import { CashMovementsModal } from './components/CashMovementsModal';
import { CommonProductsModal } from './components/CommonProductsModal';
import { HoldTicketsModal } from './components/HoldTicketsModal';
import { ThermalReceiptModal } from './components/ThermalReceiptModal';
import { ShortcutsHelpModal } from './components/ShortcutsHelpModal';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<TabType>('sales');

  // Master Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [shifts, setShifts] = useState<CashShift[]>([]);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [holdTickets, setHoldTickets] = useState<HoldTicket[]>([]);
  const [commonProducts, setCommonProducts] = useState<CommonProduct[]>([]);

  // Selection state
  const [activeRegister, setActiveRegister] = useState<CashRegister | null>(null);
  const [activeCashier, setActiveCashier] = useState<Cashier | null>(null);
  const [activeShift, setActiveShift] = useState<CashShift | null>(null);

  // Modals state
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutCart, setCheckoutCart] = useState<{ items: CartItem[]; total: number; customer?: Customer }>({
    items: [],
    total: 0,
  });
  const [checkoutSuccessCb, setCheckoutSuccessCb] = useState<(() => void) | null>(null);
  const [addCommonItemCb, setAddCommonItemCb] = useState<((name: string, price: number) => void) | null>(null);
  const [restoreHoldCb, setRestoreHoldCb] = useState<((ticket: HoldTicket) => void) | null>(null);

  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [showCommonModal, setShowCommonModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [pendingHoldCart, setPendingHoldCart] = useState<{ items: CartItem[]; customer?: Customer } | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [completedSaleReceipt, setCompletedSaleReceipt] = useState<Sale | null>(null);

  // Loading & error state
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Initial Data from Server
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [pData, dData, cData, sData, rData, shData, caData, htData, cpData] = await Promise.all([
        api.getProducts(),
        api.getDepartments(),
        api.getCustomers(),
        api.getSales(),
        api.getRegisters(),
        api.getShifts(),
        api.getCashiers(),
        api.getHoldTickets(),
        api.getCommonProducts(),
      ]);

      setProducts(pData || []);
      setDepartments(dData || []);
      setCustomers(cData || []);
      setSales(sData || []);
      setRegisters(rData || []);
      setShifts(shData || []);
      setCashiers(caData || []);
      setHoldTickets(htData || []);
      setCommonProducts(cpData || []);

      // Default register & cashier selection
      if (rData && rData.length > 0) {
        const currentReg = activeRegister ? rData.find((r) => r.id === activeRegister.id) || rData[0] : rData[0];
        setActiveRegister(currentReg);

        // Find active open shift for this register
        const openShift = shData.find((s) => s.registerId === currentReg.id && s.status === 'OPEN');
        setActiveShift(openShift || null);

        if (!openShift && currentReg.isOpen) {
          // Open shift modal
          setShowOpenShiftModal(true);
        }
      }

      if (caData && caData.length > 0 && !activeCashier) {
        setActiveCashier(caData[0]);
      }
    } catch (err: any) {
      console.error('Error al cargar datos del sistema:', err);
      setErrorMsg(err.message || 'Ocurrió un problema al comunicar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [activeRegister, activeCashier]);

  useEffect(() => {
    loadData();
  }, []);

  // Handle register change
  const handleSelectRegister = (reg: CashRegister) => {
    setActiveRegister(reg);
    const openShift = shifts.find((s) => s.registerId === reg.id && s.status === 'OPEN');
    setActiveShift(openShift || null);
    if (!openShift) {
      setShowOpenShiftModal(true);
    }
  };

  // Keyboard Shortcuts (F1 to F12)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'F10') {
          e.preventDefault();
          const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
          searchInput?.focus();
        }
        return;
      }

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          setActiveTab('sales');
          break;
        case 'F2':
          e.preventDefault();
          setShowCommonModal(true);
          break;
        case 'F3':
          e.preventDefault();
          setShowMovementsModal(true);
          break;
        case 'F6':
          e.preventDefault();
          setShowHoldModal(true);
          break;
        case 'F7':
          e.preventDefault();
          setActiveTab('customers');
          break;
        case 'F8':
          e.preventDefault();
          setActiveTab('inventory');
          break;
        case 'F10':
          e.preventDefault();
          setActiveTab('sales');
          setTimeout(() => {
            const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
            searchInput?.focus();
          }, 100);
          break;
        case 'F11':
          e.preventDefault();
          setActiveTab('history');
          break;
        case 'F12':
          e.preventDefault();
          setActiveTab('sales');
          break;
        case 'Escape':
          setShowCheckoutModal(false);
          setShowCommonModal(false);
          setShowMovementsModal(false);
          setShowHoldModal(false);
          setShowShortcutsModal(false);
          setCompletedSaleReceipt(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Open Shift Handler
  const handleOpenShift = async (initialCash: number) => {
    if (!activeRegister || !activeCashier) return;
    try {
      const newShift = await api.openShift(activeRegister.id, activeCashier.id, initialCash);
      setShifts((prev) => [newShift, ...prev]);
      setActiveShift(newShift);
      setShowOpenShiftModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al abrir caja');
    }
  };

  // Close Shift Handler
  const handleCloseShift = async (declaredCash: number, notes?: string) => {
    if (!activeShift) return;
    try {
      const closed = await api.closeShift(activeShift.id, declaredCash, notes);
      setActiveShift(null);
      loadData();
      alert('Corte de caja guardado con éxito');
    } catch (err: any) {
      alert(err.message || 'Error al cerrar corte de caja');
    }
  };

  // Checkout Handler
  const handleOpenCheckout = (
    items: CartItem[],
    total: number,
    customer?: Customer,
    onSuccess?: () => void
  ) => {
    if (!activeShift) {
      alert('Debes abrir un turno de caja antes de realizar cobros');
      setShowOpenShiftModal(true);
      return;
    }
    setCheckoutCart({ items, total, customer });
    if (onSuccess) {
      setCheckoutSuccessCb(() => onSuccess);
    } else {
      setCheckoutSuccessCb(null);
    }
    setShowCheckoutModal(true);
  };

  // Complete Sale
  const handleCompleteSale = async (paymentData: {
    paymentMethod: PaymentMethod;
    cashPaid: number;
    cardPaid: number;
    shouldPrintReceipt: boolean;
  }) => {
    if (!activeRegister || !activeCashier || !activeShift) return;

    try {
      const newSale = await api.createSale({
        registerId: activeRegister.id,
        shiftId: activeShift.id,
        cashierId: activeCashier.id,
        cashierName: activeCashier.name,
        customerId: checkoutCart.customer?.id,
        items: checkoutCart.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountPercentage: i.discountPercentage,
        })),
        paymentMethod: paymentData.paymentMethod,
        cashPaid: paymentData.cashPaid,
        cardPaid: paymentData.cardPaid,
      });

      setShowCheckoutModal(false);

      if (checkoutSuccessCb) {
        checkoutSuccessCb();
        setCheckoutSuccessCb(null);
      }

      if (paymentData.shouldPrintReceipt) {
        setCompletedSaleReceipt(newSale);
      }

      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al procesar la venta');
    }
  };

  // Calculate Today Sales Total
  const todaySalesTotal = (sales || [])
    .filter((s) => s.status === 'COMPLETED')
    .reduce((acc, s) => acc + s.total, 0);

  const lowStockCount = (products || []).filter((p) => p.stock <= p.minStock).length;

  if (loading && products.length === 0) {
    return (
      <div className="h-screen w-screen bg-[#f0f2f5] flex flex-col items-center justify-center font-sans text-slate-800 p-4">
        <div className="bg-[#1e293b] p-6 rounded-sm shadow-xl text-white max-w-sm w-full text-center space-y-3 border border-slate-700">
          <div className="w-10 h-10 bg-blue-500 rounded flex items-center justify-center mx-auto text-white font-black text-xl animate-bounce">
            e
          </div>
          <h2 className="font-extrabold text-lg text-white">Cargando Eleventa PDV</h2>
          <p className="text-xs text-slate-400">Iniciando base de datos multi-caja y catálogo de productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-800 flex flex-col font-sans select-none overflow-hidden">
      {/* Top High-Density Navbar */}
      <Navbar
        registers={registers}
        activeRegister={activeRegister}
        cashiers={cashiers}
        activeCashier={activeCashier}
        activeShift={activeShift}
        onSelectRegister={handleSelectRegister}
        onSelectCashier={setActiveCashier}
        onOpenRegisterModal={() => setActiveTab('settings')}
        onOpenShortcutsModal={() => setShowShortcutsModal(true)}
        onRefreshData={loadData}
        todaySalesTotal={todaySalesTotal}
      />

      {/* Function Key Tabs Navigation */}
      <NavigationTabs
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        holdTicketsCount={holdTickets.length}
        lowStockCount={lowStockCount}
      />

      {/* Main View Display Area */}
      <main className="flex-1 overflow-hidden p-1">
        {activeTab === 'sales' && (
          <SalesView
            products={products}
            customers={customers}
            commonProducts={commonProducts}
            onOpenCheckout={handleOpenCheckout}
            onOpenCommonProducts={(addFn) => {
              setAddCommonItemCb(() => addFn);
              setShowCommonModal(true);
            }}
            onOpenMovements={() => setShowMovementsModal(true)}
            onOpenHoldTickets={(items, customer, restoreFn) => {
              setPendingHoldCart({ items, customer });
              if (restoreFn) setRestoreHoldCb(() => restoreFn);
              setShowHoldModal(true);
            }}
            activeRegisterName={activeRegister ? activeRegister.name : 'Caja 1'}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            products={products}
            departments={departments}
            onSaveProduct={async (prod) => {
              await api.saveProduct(prod);
              loadData();
            }}
            onDeleteProduct={async (id) => {
              await api.deleteProduct(id);
              loadData();
            }}
            onAdjustStock={async (productId, delta, reason) => {
              await api.adjustStock(productId, delta, reason);
              loadData();
            }}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersView
            customers={customers}
            onSaveCustomer={async (c) => {
              await api.saveCustomer(c);
              loadData();
            }}
            onAddPayment={async (customerId, amount) => {
              if (!activeCashier || !activeRegister) return;
              await api.addCustomerPayment({
                customerId,
                amount,
                cashierId: activeCashier.id,
                cashierName: activeCashier.name,
                registerId: activeRegister.id,
              });
              loadData();
            }}
          />
        )}

        {activeTab === 'history' && (
          <SalesHistoryView
            sales={sales}
            onCancelSale={async (saleId) => {
              if (!activeCashier) return;
              await api.cancelSale(saleId, activeCashier.name);
              loadData();
            }}
            onPrintReceipt={(sale) => setCompletedSaleReceipt(sale)}
          />
        )}

        {activeTab === 'cashcut' && (
          <CashCutView
            activeShift={activeShift}
            sales={sales}
            registers={registers}
            activeRegister={activeRegister}
            onCloseShift={handleCloseShift}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView sales={sales} products={products} registers={registers} />
        )}

        {activeTab === 'settings' && (
          <RegistersCashiersView
            registers={registers}
            cashiers={cashiers}
            onSaveRegister={async (reg) => {
              await api.saveRegister(reg);
              loadData();
            }}
            onSaveCashier={async (c) => {
              await api.saveCashier(c);
              loadData();
            }}
            onResetSeed={async () => {
              await api.resetSeed();
              await loadData();
            }}
          />
        )}
      </main>

      {/* MODALS */}
      {showOpenShiftModal && activeRegister && (
        <OpenShiftModal
          registerName={activeRegister.name}
          cashierName={activeCashier ? activeCashier.name : 'Cajero'}
          onConfirm={handleOpenShift}
        />
      )}

      {showCheckoutModal && activeRegister && (
        <CheckoutModal
          items={checkoutCart.items}
          total={checkoutCart.total}
          customer={checkoutCart.customer}
          activeRegisterName={activeRegister.name}
          onClose={() => setShowCheckoutModal(false)}
          onCompleteSale={handleCompleteSale}
        />
      )}

      {showMovementsModal && activeRegister && activeCashier && activeShift && (
        <CashMovementsModal
          registerId={activeRegister.id}
          shiftId={activeShift.id}
          cashierId={activeCashier.id}
          cashierName={activeCashier.name}
          onClose={() => setShowMovementsModal(false)}
          onSuccess={() => {
            setShowMovementsModal(false);
            loadData();
          }}
        />
      )}

      {showCommonModal && (
        <CommonProductsModal
          commonProducts={commonProducts}
          onAddCommonItem={(name, price) => {
            if (addCommonItemCb) addCommonItemCb(name, price);
            setShowCommonModal(false);
          }}
          onClose={() => setShowCommonModal(false)}
        />
      )}

      {showHoldModal && activeRegister && (
        <HoldTicketsModal
          holdTickets={holdTickets}
          currentCartItems={pendingHoldCart?.items || []}
          currentCustomer={pendingHoldCart?.customer}
          activeRegisterName={activeRegister.name}
          onClose={() => {
            setShowHoldModal(false);
            setPendingHoldCart(null);
          }}
          onSaveCurrentHold={async (label) => {
            if (!pendingHoldCart || pendingHoldCart.items.length === 0) return;
            await api.saveHoldTicket({
              label,
              registerId: activeRegister.id,
              items: pendingHoldCart.items,
              customerId: pendingHoldCart.customer?.id,
            });
            setShowHoldModal(false);
            setPendingHoldCart(null);
            loadData();
          }}
          onRestoreHoldTicket={async (ticket) => {
            if (restoreHoldCb) restoreHoldCb(ticket);
            await api.deleteHoldTicket(ticket.id);
            setShowHoldModal(false);
            setPendingHoldCart(null);
            loadData();
          }}
          onDeleteHoldTicket={async (id) => {
            await api.deleteHoldTicket(id);
            loadData();
          }}
        />
      )}

      {completedSaleReceipt && (
        <ThermalReceiptModal
          sale={completedSaleReceipt}
          onClose={() => setCompletedSaleReceipt(null)}
        />
      )}

      {showShortcutsModal && (
        <ShortcutsHelpModal onClose={() => setShowShortcutsModal(false)} />
      )}
    </div>
  );
}
