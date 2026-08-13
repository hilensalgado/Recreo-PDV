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
  CustomerCreditMovement,
  KeyboardShortcutConfig,
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
import { PINModal } from './components/PINModal';
import { CashCutReceiptModal } from './components/CashCutReceiptModal';
import { CustomerPaymentReceiptModal } from './components/CustomerPaymentReceiptModal';

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
  const [customerMovements, setCustomerMovements] = useState<CustomerCreditMovement[]>([]);
  const [shortcutsConfig, setShortcutsConfig] = useState<KeyboardShortcutConfig[]>([]);

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
  
  // New modal states for PIN verification and additional receipts
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingCashierChange, setPendingCashierChange] = useState<Cashier | null>(null);
  const [completedShiftReceipt, setCompletedShiftReceipt] = useState<CashShift | null>(null);
  const [completedCustomerPayment, setCompletedCustomerPayment] = useState<{
    customer: Customer;
    movement: CustomerCreditMovement;
  } | null>(null);

  // Loading & error state
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Initial Data from Server
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [pData, dData, cData, sData, rData, shData, caData, htData, cpData, cmData, skData] = await Promise.all([
        api.getProducts(),
        api.getDepartments(),
        api.getCustomers(),
        api.getSales(),
        api.getRegisters(),
        api.getShifts(),
        api.getCashiers(),
        api.getHoldTickets(),
        api.getCommonProducts(),
        api.getCustomerMovements(),
        api.getShortcuts(),
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
      setCustomerMovements(cmData || []);
      setShortcutsConfig(skData || []);

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

  // Unique Device Identifier Helper
  const getDeviceId = () => {
    let devId = localStorage.getItem('recreo_device_id');
    if (!devId) {
      devId = 'dev-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
      localStorage.setItem('recreo_device_id', devId);
    }
    return devId;
  };

  // Handle register change with concurrency verification
  const handleSelectRegister = async (reg: CashRegister) => {
    try {
      const deviceId = getDeviceId();
      if (reg.isOpen && reg.activeDeviceId && reg.activeDeviceId !== deviceId) {
        alert(`Acceso denegado: La caja "${reg.name}" ya está abierta y en uso en otro equipo por ${reg.currentCashierName || 'otro usuario'}.`);
        return;
      }
      await api.claimRegisterSession(reg.id, deviceId, activeCashier?.id);
      setActiveRegister(reg);
      const openShift = shifts.find((s) => s.registerId === reg.id && s.status === 'OPEN');
      setActiveShift(openShift || null);
      if (!openShift) {
        setShowOpenShiftModal(true);
      }
    } catch (err: any) {
      alert(err.message || 'No se puede seleccionar esta caja');
    }
  };

  // Keyboard Shortcuts (Configurable per user preferences)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return;
      }

      const pressedKey = e.key.toUpperCase();

      const getAssignedKey = (actionId: string, fallbackKey: string) => {
        const item = shortcutsConfig.find((s) => s.id === actionId);
        return (item?.currentKey || fallbackKey).toUpperCase();
      };

      if (pressedKey === getAssignedKey('sales', 'F1')) {
        e.preventDefault();
        setActiveTab('sales');
      } else if (pressedKey === getAssignedKey('common', 'F2')) {
        e.preventDefault();
        setShowCommonModal(true);
      } else if (pressedKey === getAssignedKey('movements', 'F3')) {
        e.preventDefault();
        setShowMovementsModal(true);
      } else if (pressedKey === getAssignedKey('hold', 'F6')) {
        e.preventDefault();
        setShowHoldModal(true);
      } else if (pressedKey === getAssignedKey('customers', 'F7')) {
        e.preventDefault();
        setActiveTab('customers');
      } else if (pressedKey === getAssignedKey('inventory', 'F8')) {
        e.preventDefault();
        if (activeCashier?.role !== 'ADMIN') {
          alert('Acceso denegado: El apartado de Inventario solo es accesible desde un perfil de Administrador.');
          setActiveTab('sales');
        } else {
          setActiveTab('inventory');
        }
      } else if (pressedKey === getAssignedKey('search', 'F10')) {
        e.preventDefault();
        setActiveTab('sales');
        setTimeout(() => {
          const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
          searchInput?.focus();
        }, 100);
      } else if (pressedKey === getAssignedKey('history', 'F11')) {
        e.preventDefault();
        setActiveTab('history');
      } else if (pressedKey === getAssignedKey('cashcut', 'F12')) {
        e.preventDefault();
        setActiveTab('sales');
      } else if (e.key === 'Escape') {
        setShowCheckoutModal(false);
        setShowCommonModal(false);
        setShowMovementsModal(false);
        setShowHoldModal(false);
        setShowShortcutsModal(false);
        setCompletedSaleReceipt(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCashier, shortcutsConfig]);

  // Open Shift Handler with Device Concurrency Lock
  const handleOpenShift = async (initialCash: number) => {
    if (!activeRegister || !activeCashier) return;
    try {
      const deviceId = getDeviceId();
      const newShift = await api.openShift(activeRegister.id, activeCashier.id, initialCash, deviceId);
      setShifts((prev) => [newShift, ...prev]);
      setActiveShift(newShift);
      setShowOpenShiftModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al abrir caja');
    }
  };

  // Close Shift Handler with Device Concurrency Release
  const handleCloseShift = async (declaredCash: number, notes?: string) => {
    if (!activeShift) return;
    try {
      const deviceId = getDeviceId();
      const closed = await api.closeShift(activeShift.id, declaredCash, notes, deviceId);
      setActiveShift(null);
      setCompletedShiftReceipt(closed);
      loadData();
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
            R
          </div>
          <h2 className="font-extrabold text-lg text-white">Cargando Recreo PDV</h2>
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
        onSelectCashier={(cashier) => {
          if (activeCashier && activeCashier.id === cashier.id) return;
          setPendingCashierChange(cashier);
          setShowPinModal(true);
        }}
        onOpenRegisterModal={() => setActiveTab('settings')}
        onOpenShortcutsModal={() => setShowShortcutsModal(true)}
        onRefreshData={loadData}
        todaySalesTotal={todaySalesTotal}
      />

      {/* Function Key Tabs Navigation */}
      <NavigationTabs
        activeTab={activeTab}
        isAdmin={activeCashier?.role === 'ADMIN'}
        onSelectTab={(tab) => {
          if (tab === 'common') {
            setActiveTab('sales');
            setShowCommonModal(true);
          } else if (tab === 'movements') {
            setActiveTab('sales');
            setShowMovementsModal(true);
          } else if (tab === 'hold') {
            setActiveTab('sales');
            setShowHoldModal(true);
          } else if ((tab === 'settings' || tab === 'inventory') && activeCashier?.role !== 'ADMIN') {
            alert('Acceso denegado: Este apartado solo es accesible desde un perfil de Administrador.');
            setActiveTab('sales');
          } else {
            setActiveTab(tab);
          }
        }}
        holdTicketsCount={holdTickets.length}
        lowStockCount={lowStockCount}
      />

      {/* Main View Display Area */}
      <main className="flex-1 overflow-hidden p-1">
        {(activeTab === 'sales' || activeTab === 'common' || activeTab === 'movements' || activeTab === 'hold') && (
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
            onOpenHoldTickets={(cartItems, customer, restoreFn) => {
              setPendingHoldCart({ items: cartItems, customer });
              setRestoreHoldCb(() => restoreFn);
              setShowHoldModal(true);
            }}
            activeRegisterName={activeRegister ? activeRegister.name : 'Caja 1'}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            products={products}
            departments={departments}
            isAdmin={activeCashier?.role === 'ADMIN'}
            onSaveProduct={async (prod) => {
              await api.saveProduct(prod);
              loadData();
            }}
            onImportProducts={async (items) => {
              await api.importProducts(items);
              await loadData();
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
            movements={customerMovements}
            onSaveCustomer={async (c) => {
              await api.saveCustomer(c);
              loadData();
            }}
            onDeleteCustomer={async (id) => {
              await api.deleteCustomer(id);
              loadData();
            }}
            onAddPayment={async (customerId, amount) => {
              if (!activeCashier || !activeRegister) return;
              const mov = await api.addCustomerPayment({
                customerId,
                amount,
                cashierId: activeCashier.id,
                cashierName: activeCashier.name,
                registerId: activeRegister.id,
              });
              const targetCust = customers.find((c) => c.id === customerId);
              if (mov && targetCust) {
                setCompletedCustomerPayment({ customer: targetCust, movement: mov });
              }
              loadData();
            }}
          />
        )}

        {activeTab === 'history' && (
          <SalesHistoryView
            sales={sales}
            registers={registers}
            onCancelSale={async (saleId) => {
              if (!activeCashier) return;
              await api.cancelSale(saleId, activeCashier.name);
              loadData();
            }}
            onOpenReceiptModal={(sale) => setCompletedSaleReceipt(sale)}
          />
        )}

        {activeTab === 'cashcut' && (
          <CashCutView
            activeShift={activeShift}
            sales={sales}
            registers={registers}
            activeRegister={activeRegister}
            movements={[]}
            onCloseShift={handleCloseShift}
            onOpenReceiptModal={(shift) => setCompletedShiftReceipt(shift)}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            sales={sales}
            products={products}
            registers={registers}
            customers={customers}
            departments={departments}
          />
        )}

        {activeTab === 'settings' && (
          <RegistersCashiersView
            registers={registers}
            cashiers={cashiers}
            isAdmin={activeCashier?.role === 'ADMIN'}
            onSaveRegister={async (reg) => {
              await api.saveRegister(reg);
              loadData();
            }}
            onDeleteRegister={async (id) => {
              await api.deleteRegister(id);
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
            onOpenShiftRegister={(reg) => {
              setActiveRegister(reg);
              setShowOpenShiftModal(true);
            }}
            onCloseShiftRegister={(reg) => {
              setActiveRegister(reg);
              setActiveTab('cashcut');
            }}
          />
        )}
      </main>

      {/* MODALS */}
      {showPinModal && pendingCashierChange && (
        <PINModal
          cashier={pendingCashierChange}
          onSuccess={async () => {
            try {
              const deviceId = getDeviceId();
              await api.claimCashierSession(pendingCashierChange.id, deviceId, activeRegister?.id);
              if (activeCashier && activeCashier.id !== pendingCashierChange.id) {
                await api.releaseCashierSession(activeCashier.id, deviceId);
              }
              setActiveCashier(pendingCashierChange);
              setShowPinModal(false);
              setPendingCashierChange(null);
            } catch (err: any) {
              alert(err.message || 'El usuario seleccionado ya tiene una sesión activa en otro dispositivo.');
              setShowPinModal(false);
              setPendingCashierChange(null);
            }
          }}
          onClose={() => {
            setShowPinModal(false);
            setPendingCashierChange(null);
          }}
        />
      )}

      {showOpenShiftModal && activeRegister && (
        <OpenShiftModal
          register={activeRegister}
          cashier={activeCashier || cashiers[0]}
          onConfirmOpenShift={handleOpenShift}
          onCancel={() => setShowOpenShiftModal(false)}
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

      {/* F3 Cash Movements Modal */}
      {showMovementsModal && (
        activeShift ? (
          <CashMovementsModal
            movements={[]}
            activeRegisterName={activeRegister ? activeRegister.name : 'Caja 1'}
            onAddMovement={async (movData) => {
              if (!activeRegister || !activeCashier || !activeShift) return;
              await api.addCashMovement({
                registerId: activeRegister.id,
                shiftId: activeShift.id,
                cashierId: activeCashier.id,
                cashierName: activeCashier.name,
                type: movData.type,
                amount: movData.amount,
                concept: movData.concept,
              });
              setShowMovementsModal(false);
              loadData();
            }}
            onClose={() => setShowMovementsModal(false)}
          />
        ) : (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-200 select-none">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto font-bold text-xl">
                !
              </div>
              <h3 className="font-extrabold text-base text-slate-800">[F3] Turno de Caja Requerido</h3>
              <p className="text-xs text-slate-500">
                Debes abrir un turno de caja antes de poder registrar Entradas o Salidas de dinero.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMovementsModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowMovementsModal(false);
                    setShowOpenShiftModal(true);
                  }}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow"
                >
                  Abrir Turno
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {/* F2 Common Products Modal */}
      {showCommonModal && (
        <CommonProductsModal
          commonProducts={commonProducts}
          isAdmin={activeCashier?.role === 'ADMIN'}
          onAddCommonItem={(name, price) => {
            setActiveTab('sales');
            if (addCommonItemCb) {
              addCommonItemCb(name, price);
            }
            setShowCommonModal(false);
          }}
          onSaveCommonProduct={async (cp) => {
            await api.saveCommonProduct(cp);
            loadData();
          }}
          onDeleteCommonProduct={async (id) => {
            await api.deleteCommonProduct(id);
            loadData();
          }}
          onClose={() => setShowCommonModal(false)}
        />
      )}

      {/* F6 Hold Tickets Modal */}
      {showHoldModal && (
        <HoldTicketsModal
          holdTickets={holdTickets}
          currentCartItems={pendingHoldCart?.items || []}
          currentCustomer={pendingHoldCart?.customer}
          activeRegisterName={activeRegister ? activeRegister.name : 'Caja 1'}
          onClose={() => {
            setShowHoldModal(false);
            setPendingHoldCart(null);
          }}
          onSaveCurrentHold={async (label) => {
            if (!pendingHoldCart || pendingHoldCart.items.length === 0) return;
            await api.saveHoldTicket({
              label,
              registerId: activeRegister ? activeRegister.id : 'reg-1',
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

      {completedShiftReceipt && (
        <CashCutReceiptModal
          shift={completedShiftReceipt}
          register={activeRegister}
          onClose={() => setCompletedShiftReceipt(null)}
        />
      )}

      {completedCustomerPayment && (
        <CustomerPaymentReceiptModal
          customer={completedCustomerPayment.customer}
          movement={completedCustomerPayment.movement}
          cashierName={activeCashier?.name}
          registerName={activeRegister?.name}
          onClose={() => setCompletedCustomerPayment(null)}
        />
      )}

      {showShortcutsModal && (
        <ShortcutsHelpModal
          shortcutsConfig={shortcutsConfig}
          isAdmin={activeCashier?.role === 'ADMIN'}
          onSaveShortcuts={async (newConfig) => {
            await api.saveShortcuts(newConfig);
            await loadData();
          }}
          onClose={() => setShowShortcutsModal(false)}
        />
      )}
    </div>
  );
}
