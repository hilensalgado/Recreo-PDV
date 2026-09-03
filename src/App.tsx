import React, { useState, useEffect, useCallback } from 'react';
import { api, setApiAuthToken } from './services/api';
import {
  Product,
  Department,
  Customer,
  Sale,
  SaleReturn,
  CashRegister,
  CashShift,
  Cashier,
  HoldTicket,
  CommonProduct,
  CartItem,
  PaymentMethod,
  CustomerCreditMovement,
  KeyboardShortcutConfig,
  Promotion,
  PromotionItem,
  ProductBatch,
  Warehouse,
  StockTransfer,
  LoyaltyProgramConfig,
  CustomerPointsMovement,
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
import { PromotionsManager } from './components/PromotionsManager';

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
import { AuthScreen } from './components/AuthScreen';
import { LogoutModal } from './components/LogoutModal';
import { ReturnsModal } from './components/ReturnsModal';
import { CashCutModal } from './components/CashCutModal';
import { LoyaltyConfigModal } from './components/LoyaltyConfigModal';
export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<TabType>('sales');

  // Auth Session State
  const [authSession, setAuthSession] = useState<{
    name: string;
    role: 'ADMIN' | 'CASHIER';
    cashier?: Cashier;
  } | null>(() => {
    try {
      const savedUser = localStorage.getItem('recreo_auth_user');
      const savedToken = localStorage.getItem('recreo_auth_token');
      if (savedUser && savedToken) {
        setApiAuthToken(savedToken);
        return JSON.parse(savedUser);
      }
      // If user info exists without signed session token, invalidate
      if (savedUser && !savedToken) {
        localStorage.removeItem('recreo_auth_user');
      }
    } catch (e) {
      console.warn('Error reading saved user session:', e);
    }
    return null;
  });

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
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyProgramConfig>({
    enabled: true,
    pointsPerAmount: 10,
    pointValueInCurrency: 0.1,
    minPointsToRedeem: 50,
    maxDiscountPercentagePerSale: 50,
    expiryDays: 365,
    welcomeBonusPoints: 100,
  });
  const [showLoyaltyConfigModal, setShowLoyaltyConfigModal] = useState(false);

  // Selection state
  const [activeRegister, setActiveRegister] = useState<CashRegister | null>(null);
  const [activeCashier, setActiveCashier] = useState<Cashier | null>(null);
  const [activeShift, setActiveShift] = useState<CashShift | null>(null);

  // Modals state
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showReturnsModal, setShowReturnsModal] = useState(false);
  const [returnPreselectedSale, setReturnPreselectedSale] = useState<Sale | null>(null);
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
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showCashCutModal, setShowCashCutModal] = useState(false);
  const [logoutAfterCloseShift, setLogoutAfterCloseShift] = useState(false);
  const [pendingCashierChange, setPendingCashierChange] = useState<Cashier | null>(null);
  const [completedShiftReceipt, setCompletedShiftReceipt] = useState<CashShift | null>(null);
  const [completedCustomerPayment, setCompletedCustomerPayment] = useState<{
    customer: Customer;
    movement: CustomerCreditMovement;
  } | null>(null);

  // Loading & error state
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Silent granular refresh to keep data synchronized instantly across terminals without interrupting UX
  const refreshEntitySilent = useCallback(async (entityType?: string) => {
    if (entityType === 'connected') {
      return;
    }
    try {
      setIsSyncing(true);
      if (!entityType || entityType === 'all') {
        const bootstrap = await api.getBootstrap().catch(() => null);
        if (bootstrap) {
          if (bootstrap.products) setProducts(bootstrap.products);
          if (bootstrap.departments) setDepartments(bootstrap.departments);
          if (bootstrap.customers) setCustomers(bootstrap.customers);
          if (bootstrap.sales) setSales(bootstrap.sales);
          if (bootstrap.registers) setRegisters(bootstrap.registers);
          if (bootstrap.shifts) setShifts(bootstrap.shifts);
          if (bootstrap.cashiers) setCashiers(bootstrap.cashiers);
          if (bootstrap.holdTickets) setHoldTickets(bootstrap.holdTickets);
          if (bootstrap.commonProducts) setCommonProducts(bootstrap.commonProducts);
          if (bootstrap.customerMovements) setCustomerMovements(bootstrap.customerMovements);
          if (bootstrap.shortcutsConfig) setShortcutsConfig(bootstrap.shortcutsConfig);
          if (bootstrap.returns) setReturns(bootstrap.returns);
          if (bootstrap.promotions) setPromotions(bootstrap.promotions);
        }
      } else if (entityType === 'products') {
        const [pData, promoData] = await Promise.all([
          api.getProducts().catch(() => null),
          api.getPromotions().catch(() => null),
        ]);
        if (pData) setProducts(pData);
        if (promoData) setPromotions(promoData);
      } else if (entityType === 'promotions') {
        const promoData = await api.getPromotions().catch(() => null);
        if (promoData) setPromotions(promoData);
      } else if (entityType === 'departments') {
        const dData = await api.getDepartments().catch(() => null);
        if (dData) setDepartments(dData);
      } else if (entityType === 'customers') {
        const cData = await api.getCustomers().catch(() => null);
        if (cData) setCustomers(cData);
      } else if (entityType === 'customerMovements') {
        const [cData, cmData] = await Promise.all([
          api.getCustomers().catch(() => null),
          api.getCustomerMovements().catch(() => null),
        ]);
        if (cData) setCustomers(cData);
        if (cmData) setCustomerMovements(cmData);
      } else if (entityType === 'sales' || entityType === 'returns') {
        const [sData, retData, shData] = await Promise.all([
          api.getSales().catch(() => null),
          api.getReturns().catch(() => null),
          api.getShifts().catch(() => null),
        ]);
        if (sData) setSales(sData);
        if (retData) setReturns(retData);
        if (shData) setShifts(shData);
      } else if (entityType === 'shifts' || entityType === 'registers') {
        const [shData, rData] = await Promise.all([
          api.getShifts().catch(() => null),
          api.getRegisters().catch(() => null),
        ]);
        if (shData) setShifts(shData);
        if (rData) setRegisters(rData);
      } else if (entityType === 'cashiers') {
        const caData = await api.getCashiers().catch(() => null);
        if (caData) setCashiers(caData);
      } else if (entityType === 'holdTickets') {
        const htData = await api.getHoldTickets().catch(() => null);
        if (htData) setHoldTickets(htData);
      } else if (entityType === 'commonProducts') {
        const cpData = await api.getCommonProducts().catch(() => null);
        if (cpData) setCommonProducts(cpData);
      } else if (entityType === 'batches') {
        const bData = await api.getBatches().catch(() => null);
        if (bData) setBatches(bData);
      } else if (entityType === 'warehouses') {
        const wData = await api.getWarehouses().catch(() => null);
        if (wData) setWarehouses(wData);
      } else if (entityType === 'stockTransfers') {
        const [tData, bData, pData] = await Promise.all([
          api.getStockTransfers().catch(() => null),
          api.getBatches().catch(() => null),
          api.getProducts().catch(() => null),
        ]);
        if (tData) setStockTransfers(tData);
        if (bData) setBatches(bData);
        if (pData) setProducts(pData);
      } else if (entityType === 'loyalty') {
        const lCfg = await api.getLoyaltyConfig().catch(() => null);
        if (lCfg) setLoyaltyConfig(lCfg);
      } else if (entityType === 'config' || entityType === 'shortcuts') {
        const skData = await api.getShortcuts().catch(() => null);
        if (skData) setShortcutsConfig(skData);
      }
    } catch (err) {
      console.warn('[Sync Silent] Error sincronizando entidad:', entityType, err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Load Initial Data from Server (Uses fast full bootstrap payload in 1 single HTTP request)
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [bootstrap, bData, wData, tData, lCfg] = await Promise.all([
        api.getBootstrap().catch(() => null),
        api.getBatches().catch(() => []),
        api.getWarehouses().catch(() => []),
        api.getStockTransfers().catch(() => []),
        api.getLoyaltyConfig().catch(() => null),
      ]);

      if (bData) setBatches(bData);
      if (wData) setWarehouses(wData);
      if (tData) setStockTransfers(tData);
      if (lCfg) setLoyaltyConfig(lCfg);

      if (bootstrap) {
        setProducts(bootstrap.products || []);
        setDepartments(bootstrap.departments || []);
        setCustomers(bootstrap.customers || []);
        setSales(bootstrap.sales || []);
        setRegisters(bootstrap.registers || []);
        setShifts(bootstrap.shifts || []);
        setCashiers(bootstrap.cashiers || []);
        setHoldTickets(bootstrap.holdTickets || []);
        setCommonProducts(bootstrap.commonProducts || []);
        setCustomerMovements(bootstrap.customerMovements || []);
        setShortcutsConfig(bootstrap.shortcutsConfig || []);
        setReturns(bootstrap.returns || []);
        setPromotions(bootstrap.promotions || []);

        // Synchronize register & cashier selection according to auth session
        const rData = bootstrap.registers || [];
        const shData = bootstrap.shifts || [];
        const caData = bootstrap.cashiers || [];

        if (rData.length > 0) {
          setActiveRegister((prev) => {
            if (prev) {
              return rData.find((r) => r.id === prev.id) || prev;
            }
            return null;
          });
        }

        if (caData.length > 0 && authSession) {
          const matched = authSession.cashier
            ? caData.find((c) => c.id === authSession.cashier?.id)
            : caData.find((c) => c.email && c.email.toLowerCase() === localStorage.getItem('recreo_auth_email')?.toLowerCase());
          
          if (matched) {
            setActiveCashier(matched);
          }
        }
      }
    } catch (err: any) {
      console.error('Error al cargar datos del sistema:', err);
      setErrorMsg(err.message || 'Ocurrió un problema al comunicar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [authSession]);

  useEffect(() => {
    loadData();

    // Debounced SSE handler to prevent burst re-fetches
    let syncTimer: any = null;
    const pendingEntities = new Set<string>();

    const handleSyncTrigger = (entityType: string) => {
      if (entityType === 'connected') return;
      pendingEntities.add(entityType);
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        if (pendingEntities.has('all')) {
          refreshEntitySilent('all');
        } else {
          for (const entity of pendingEntities) {
            refreshEntitySilent(entity);
          }
        }
        pendingEntities.clear();
      }, 300);
    };

    // Subscribe to immediate real-time Server-Sent Events
    const unsubscribeSync = api.subscribeToSyncEvents(
      (event) => {
        if (event && event.type) {
          handleSyncTrigger(event.type);
        }
      },
      (connected) => {
        setIsRealtimeConnected(connected);
      }
    );

    // Resilient fallback sync interval (every 40s)
    const interval = setInterval(() => {
      refreshEntitySilent('all');
    }, 40000);

    return () => {
      if (syncTimer) clearTimeout(syncTimer);
      unsubscribeSync();
      clearInterval(interval);
    };
  }, [loadData, refreshEntitySilent]);

  // Auth Logout Trigger (opens custom in-app confirmation modal without blocking iframes)
  const handleLogoutAuth = () => {
    setShowLogoutModal(true);
  };

  // Auth Logout Confirmation Executor
  const executeConfirmLogout = async () => {
    try {
      const deviceId = getDeviceId();
      if (activeCashier) {
        try {
          await api.releaseCashierSession(activeCashier.id, deviceId);
        } catch (e) {
          console.warn('Release cashier session error:', e);
        }
      }
      if (activeRegister && !activeShift) {
        try {
          await api.releaseRegisterSession(activeRegister.id, deviceId);
        } catch (e) {
          console.warn('Release register session error:', e);
        }
      }
      localStorage.removeItem('recreo_auth_email');
      localStorage.removeItem('recreo_auth_user');
      setApiAuthToken(null);
      setAuthSession(null);
      setActiveCashier(null);
      setShowLogoutModal(false);
      await loadData();
    } catch (err) {
      console.error('Error during logout:', err);
      setApiAuthToken(null);
      setAuthSession(null);
      setActiveCashier(null);
      setShowLogoutModal(false);
    }
  };

  // Unique Device Identifier Helper
  const getDeviceId = () => {
    let devId = localStorage.getItem('recreo_device_id');
    if (!devId) {
      devId = 'dev-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
      localStorage.setItem('recreo_device_id', devId);
    }
    return devId;
  };

  // Release transient sessions on tab close or navigation
  useEffect(() => {
    const handleUnload = () => {
      if (activeCashier && !activeShift) {
        const deviceId = getDeviceId();
        const payload = JSON.stringify({ cashierId: activeCashier.id, deviceId });
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon?.('/api/sessions/cashier/release', blob);
        if (activeRegister) {
          const regPayload = JSON.stringify({ registerId: activeRegister.id, deviceId });
          const regBlob = new Blob([regPayload], { type: 'application/json' });
          navigator.sendBeacon?.('/api/sessions/register/release', regBlob);
        }
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [activeCashier?.id, activeRegister?.id, activeShift?.id]);

  // Periodic Heartbeat to maintain exclusive session lock & detect remote takeover ONLY when authenticated
  useEffect(() => {
    if (!authSession || !activeCashier) return;
    const deviceId = getDeviceId();

    const doHeartbeat = async () => {
      try {
        const res = await api.sendHeartbeat({
          deviceId,
          cashierId: activeCashier?.id,
          registerId: activeRegister?.id,
        });

        if (res && res.cashierValid === false && activeCashier) {
          alert(
            `⚠️ Sesión cerrada: El usuario "${activeCashier.name}" ha iniciado sesión en otro equipo o dispositivo. Por seguridad, no se permite el uso simultáneo y tu sesión en este equipo ha sido finalizada.`
          );
          setApiAuthToken(null);
          setActiveCashier(null);
          setAuthSession(null);
          localStorage.removeItem('recreo_auth_email');
          localStorage.removeItem('recreo_auth_user');
        }

        if (res && res.registerValid === false && activeRegister) {
          alert(
            `⚠️ Advertencia: La caja "${activeRegister.name}" fue asignada o abierta en otro equipo.`
          );
          loadData();
        }
      } catch (err) {
        console.warn('Heartbeat check error:', err);
      }
    };

    doHeartbeat();
    const interval = setInterval(doHeartbeat, 15000);
    return () => clearInterval(interval);
  }, [authSession, activeCashier?.id, activeRegister?.id]);

  // Handle cashier change with exclusivity check
  const handleSelectCashier = (cashier: Cashier) => {
    const deviceId = getDeviceId();
    const isLockedElsewhere =
      cashier.isLoggedIn &&
      cashier.activeDeviceId &&
      cashier.activeDeviceId !== deviceId &&
      cashier.lastHeartbeat &&
      Date.now() - cashier.lastHeartbeat < 35000;

    if (isLockedElsewhere) {
      alert(
        `Acceso denegado: El usuario "${cashier.name}" ya tiene una sesión abierta en otro equipo/dispositivo. No se permite el uso simultáneo en dos lugares. Por favor cierra la sesión en el otro equipo antes de continuar.`
      );
      return;
    }

    setPendingCashierChange(cashier);
    setShowPinModal(true);
  };

  // Handle register change with concurrency verification
  const handleSelectRegister = async (reg: CashRegister) => {
    try {
      const deviceId = getDeviceId();
      const isLockedElsewhere =
        reg.activeDeviceId &&
        reg.activeDeviceId !== deviceId &&
        reg.lastHeartbeat &&
        Date.now() - reg.lastHeartbeat < 35000;

      if (isLockedElsewhere) {
        alert(
          `Acceso denegado: La caja "${reg.name}" ya está abierta y en uso en otro equipo por ${reg.currentCashierName || 'otro usuario'}. No se permite operar la misma caja en dos lugares al mismo tiempo.`
        );
        return;
      }
      await api.claimRegisterSession(reg.id, deviceId, activeCashier?.id, false);
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

  // Handle switching back to Supervisor mode (Sin Caja)
  const handleSelectSupervisorMode = async () => {
    try {
      const deviceId = getDeviceId();
      if (activeRegister && !activeShift) {
        await api.releaseRegisterSession(activeRegister.id, deviceId);
      }
      setActiveRegister(null);
      setActiveShift(null);
    } catch (err: any) {
      console.warn('Error switching to supervisor mode:', err);
    }
  };

  // Global Browser Default Lock & Configurable POS Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isFKey = /^F(1[0-2]|[1-9])$/i.test(e.key);
      const isDevToolsShortcut = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c');
      const isViewSourceShortcut = (e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u');

      // Unconditionally block browser default actions for F-keys, DevTools, View Source, F5 refresh
      if (isFKey || isDevToolsShortcut || isViewSourceShortcut) {
        e.preventDefault();
      }

      const pressedKey = e.key.toUpperCase();

      const getAssignedKey = (actionId: string, fallbackKey: string) => {
        const item = shortcutsConfig.find((s) => s.id === actionId);
        return (item?.currentKey || fallbackKey).toUpperCase();
      };

      if (e.key === 'Escape') {
        setShowCheckoutModal(false);
        setShowCommonModal(false);
        setShowMovementsModal(false);
        setShowHoldModal(false);
        setShowShortcutsModal(false);
        setCompletedSaleReceipt(null);
        return;
      }

      // Ignore text typing inside inputs unless pressing a Function key
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (isTyping && !isFKey) {
        return;
      }

      if (pressedKey === getAssignedKey('sales', 'F1')) {
        setActiveTab('sales');
      } else if (pressedKey === getAssignedKey('checkout', 'F12') || pressedKey === 'F12') {
        // If in another tab, switch to sales
        if (activeTab !== 'sales') {
          setActiveTab('sales');
        }
        setTimeout(() => {
          const checkoutBtn = (document.getElementById('btn-main-checkout') ||
            document.getElementById('btn-mobile-checkout')) as HTMLButtonElement;
          if (checkoutBtn) {
            checkoutBtn.click();
          }
        }, 50);
      } else if (pressedKey === getAssignedKey('common', 'F2') || pressedKey === 'F2') {
        // If checkout modal is open, finalize checkout with F2
        const finalizeBtn = document.getElementById('btn-process-checkout') as HTMLButtonElement;
        if (finalizeBtn) {
          finalizeBtn.click();
        } else {
          setShowCommonModal(true);
        }
      } else if (pressedKey === getAssignedKey('movements', 'F3') || pressedKey === 'F3') {
        setShowMovementsModal(true);
      } else if (pressedKey === getAssignedKey('returns', 'F4') || pressedKey === 'F4') {
        setShowReturnsModal(true);
      } else if (pressedKey === getAssignedKey('promos', 'F5') || pressedKey === 'F5') {
        if (activeTab !== 'sales') {
          setActiveTab('sales');
        }
        window.dispatchEvent(new CustomEvent('recreo-open-promos-modal'));
      } else if (pressedKey === getAssignedKey('hold', 'F6') || pressedKey === 'F6') {
        setShowHoldModal(true);
      } else if (pressedKey === getAssignedKey('customers', 'F7') || pressedKey === 'F7') {
        setActiveTab('customers');
      } else if (pressedKey === getAssignedKey('inventory', 'F8') || pressedKey === 'F8') {
        setActiveTab('inventory');
      } else if (pressedKey === getAssignedKey('history', 'F9') || pressedKey === 'F9') {
        setActiveTab('history');
      } else if (pressedKey === getAssignedKey('cashcut', 'F10') || pressedKey === 'F10') {
        setActiveTab('cashcut');
      } else if (pressedKey === getAssignedKey('analytics', 'F11') || pressedKey === 'F11') {
        setActiveTab('analytics');
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [activeCashier, activeTab, shortcutsConfig]);

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
      setShowCashCutModal(false);
      await loadData();

      if (logoutAfterCloseShift) {
        setLogoutAfterCloseShift(false);
        // Release cashier session and log out
        if (activeCashier) {
          try {
            await api.releaseCashierSession(activeCashier.id, deviceId, true);
          } catch (e) {
            console.warn('Session release:', e);
          }
        }
        if (activeRegister) {
          try {
            await api.releaseRegisterSession(activeRegister.id, deviceId, true);
          } catch (e) {
            console.warn('Register release:', e);
          }
        }
        localStorage.removeItem('recreo_auth_email');
        localStorage.removeItem('recreo_auth_user');
        setApiAuthToken(null);
        setAuthSession(null);
        setActiveCashier(null);
      }
    } catch (err: any) {
      alert(err.message || 'Error al cerrar corte de caja');
    }
  };

  // Delete Shift Handler (allows cleanup of test/fake closures)
  const handleDeleteShift = async (shiftId: string) => {
    try {
      await api.deleteShift(shiftId);
      if (activeShift?.id === shiftId) {
        setActiveShift(null);
      }
      if (completedShiftReceipt?.id === shiftId) {
        setCompletedShiftReceipt(null);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el cierre de caja');
      throw err;
    }
  };

  // Batch Delete Shifts Handler
  const handleDeleteShiftsBatch = async (shiftIds: string[]) => {
    try {
      await api.deleteShiftsBatch(shiftIds);
      if (activeShift && shiftIds.includes(activeShift.id)) {
        setActiveShift(null);
      }
      if (completedShiftReceipt && shiftIds.includes(completedShiftReceipt.id)) {
        setCompletedShiftReceipt(null);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar los cierres de caja seleccionados');
      throw err;
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
    clientTransactionId?: string;
    pointsRedeemed?: number;
    pointsDiscountAmount?: number;
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
          isPromotion: i.isPromotion,
          promotionId: i.promotionId,
          promotionCode: i.promotionCode,
          promotionItems: i.promotionItems,
        })),
        paymentMethod: paymentData.paymentMethod,
        cashPaid: paymentData.cashPaid,
        cardPaid: paymentData.cardPaid,
        clientTransactionId: paymentData.clientTransactionId,
        pointsRedeemed: paymentData.pointsRedeemed,
        pointsDiscountAmount: paymentData.pointsDiscountAmount,
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

  if (loading && products.length === 0 && !authSession) {
    return (
      <div className="h-screen w-screen bg-[#f0f2f5] flex flex-col items-center justify-center font-sans text-slate-800 p-4">
        <div className="bg-[#1e293b] p-6 rounded-sm shadow-xl text-white max-w-sm w-full text-center space-y-3 border border-slate-700">
          <div className="w-10 h-10 bg-blue-500 rounded flex items-center justify-center mx-auto text-white font-black text-xl animate-bounce">
            R
          </div>
          <h2 className="font-extrabold text-lg text-white">Cargando Recreo PDV</h2>
          <p className="text-xs text-slate-400">Iniciando base de datos multi-caja y catálogo de productos...</p>
          {errorMsg && (
            <div className="pt-2">
              <p className="text-xs text-red-400 mb-2">{errorMsg}</p>
              <button
                type="button"
                onClick={() => loadData()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-colors cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Authentication Gate
  if (!authSession) {
    return (
      <AuthScreen
        authorizedCashiers={cashiers}
        registers={registers}
        shifts={shifts}
        onLoginSuccess={(authData) => {
          setAuthSession({
            name: authData.name,
            role: authData.role,
            cashier: authData.cashier,
          });
          if (authData.cashier) {
            setActiveCashier(authData.cashier);
          }
          if (authData.register) {
            setActiveRegister(authData.register);
          } else {
            setActiveRegister(null);
          }
          if (authData.activeShift) {
            setActiveShift(authData.activeShift);
          } else {
            setActiveShift(null);
            // Only force opening shift modal for cashiers, or if register has no shift and user isn't admin supervisor
            if (authData.role === 'CASHIER') {
              setShowOpenShiftModal(true);
            }
          }
          loadData();
        }}
      />
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
        onLogoutAuth={handleLogoutAuth}
        onSelectRegister={handleSelectRegister}
        onSelectSupervisorMode={handleSelectSupervisorMode}
        onSelectCashier={(cashier) => {
          if (activeCashier && activeCashier.id === cashier.id) return;
          setPendingCashierChange(cashier);
          setShowPinModal(true);
        }}
        onOpenRegisterModal={() => setActiveTab('settings')}
        onOpenShortcutsModal={() => setShowShortcutsModal(true)}
        onRefreshData={loadData}
        todaySalesTotal={todaySalesTotal}
        isRealtimeConnected={isRealtimeConnected}
        isSyncing={isSyncing}
      />

      {/* Function Key Tabs Navigation */}
      <NavigationTabs
        activeTab={activeTab}
        isAdmin={activeCashier?.role === 'ADMIN'}
        permissions={activeCashier?.permissions}
        onSelectTab={(tab) => {
          if (tab === 'common') {
            if (activeCashier?.role !== 'ADMIN' && activeCashier?.permissions?.allowCommonProducts === false) {
              alert('Acceso denegado: No tienes permisos para productos comunes.');
              return;
            }
            setActiveTab('sales');
            setShowCommonModal(true);
          } else if (tab === 'movements') {
            if (activeCashier?.role !== 'ADMIN' && activeCashier?.permissions?.allowCashMovements === false) {
              alert('Acceso denegado: No tienes permisos para registrar movimientos de caja.');
              return;
            }
            setActiveTab('sales');
            setShowMovementsModal(true);
          } else if (tab === 'hold') {
            if (activeCashier?.role !== 'ADMIN' && activeCashier?.permissions?.allowHoldTickets === false) {
              alert('Acceso denegado: No tienes permisos para tickets en espera.');
              return;
            }
            setActiveTab('sales');
            setShowHoldModal(true);
          } else if (tab === 'analytics' && activeCashier?.role !== 'ADMIN' && activeCashier?.permissions?.allowReports === false) {
            alert('Acceso denegado: Tu perfil no cuenta con permisos para ver reportes.');
            setActiveTab('sales');
          } else if (tab === 'settings' && activeCashier?.role !== 'ADMIN') {
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
            promotions={promotions}
            onOpenCheckout={handleOpenCheckout}
            onOpenCommonProducts={(addFn) => {
              setAddCommonItemCb(() => addFn);
              setShowCommonModal(true);
            }}
            onRegisterAddCommonItem={(addFn) => {
              setAddCommonItemCb(() => addFn);
            }}
            onOpenMovements={() => setShowMovementsModal(true)}
            onOpenHoldTickets={(cartItems, customer, restoreFn) => {
              setPendingHoldCart({ items: cartItems, customer });
              setRestoreHoldCb(() => restoreFn);
              setShowHoldModal(true);
            }}
            onOpenReturns={(sale) => {
              setReturnPreselectedSale(sale || null);
              setShowReturnsModal(true);
            }}
            activeRegisterName={activeRegister ? activeRegister.name : 'Caja 1'}
          />
        )}

        {activeTab === 'promotions' && (
          <PromotionsManager
            promotions={promotions}
            products={products}
            departments={departments}
            isAdmin={activeCashier?.role === 'ADMIN'}
            onSavePromotion={async (promo) => {
              await api.savePromotion(promo);
              loadData();
            }}
            onDeletePromotion={async (id) => {
              await api.deletePromotion(id);
              loadData();
            }}
            onToggleStatus={async (id) => {
              await api.togglePromotionStatus(id);
              loadData();
            }}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            products={products}
            departments={departments}
            promotions={promotions}
            batches={batches}
            warehouses={warehouses}
            stockTransfers={stockTransfers}
            isAdmin={activeCashier?.role === 'ADMIN'}
            permissions={activeCashier?.permissions}
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
            onSavePromotion={async (promo) => {
              await api.savePromotion(promo);
              loadData();
            }}
            onDeletePromotion={async (id) => {
              await api.deletePromotion(id);
              loadData();
            }}
            onTogglePromotionStatus={async (id) => {
              await api.togglePromotionStatus(id);
              loadData();
            }}
            onSaveBatch={async (batchData) => {
              await api.saveBatch(batchData);
              await loadData();
            }}
            onDiscardBatch={async (batchId, reason, userName) => {
              await api.discardBatch(batchId, reason, userName || activeCashier?.name);
              await loadData();
            }}
            onStockTransfer={async (transferData) => {
              await api.createStockTransfer({
                ...transferData,
                responsibleName: activeCashier?.name || 'Administrador',
              });
              await loadData();
            }}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersView
            customers={customers}
            movements={customerMovements}
            loyaltyConfig={loyaltyConfig}
            onOpenLoyaltyConfig={() => setShowLoyaltyConfigModal(true)}
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
            activeCashier={activeCashier}
            isAdmin={activeCashier?.role === 'ADMIN' || Boolean(activeCashier?.permissions?.allowDeleteSales)}
            onCancelSale={async (saleId) => {
              if (!activeCashier) return;
              await api.cancelSale(saleId, activeCashier.name);
              loadData();
            }}
            onDeleteSale={async (saleId, restoreStock) => {
              await api.deleteSale(saleId, restoreStock);
              loadData();
            }}
            onOpenReceiptModal={(sale) => setCompletedSaleReceipt(sale)}
            onOpenReturnModal={(sale) => {
              setReturnPreselectedSale(sale);
              setShowReturnsModal(true);
            }}
          />
        )}

        {activeTab === 'cashcut' && (
          <CashCutView
            activeShift={activeShift}
            shifts={shifts}
            sales={sales}
            registers={registers}
            activeRegister={activeRegister}
            movements={[]}
            isAdmin={activeCashier?.role === 'ADMIN'}
            onCloseShift={handleCloseShift}
            onDeleteShift={activeCashier?.role === 'ADMIN' ? handleDeleteShift : undefined}
            onDeleteShiftsBatch={activeCashier?.role === 'ADMIN' ? handleDeleteShiftsBatch : undefined}
            onOpenReceiptModal={(shift) => setCompletedShiftReceipt(shift)}
            onOpenShiftModal={() => setShowOpenShiftModal(true)}
            onSelectRegister={(reg) => {
              setActiveRegister(reg);
              setShowOpenShiftModal(true);
            }}
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
            customers={customers}
            onReloadData={loadData}
            isAdmin={activeCashier?.role === 'ADMIN'}
            onSaveRegister={async (reg) => {
              await api.saveRegister(reg);
              loadData();
            }}
            onDeleteRegister={async (id) => {
              try {
                await api.deleteRegister(id);
                if (activeRegister?.id === id) {
                  const remaining = registers.filter((r) => r.id !== id);
                  if (remaining.length > 0) {
                    setActiveRegister(remaining[0]);
                  }
                }
                await loadData();
              } catch (err: any) {
                alert('Error al eliminar la caja: ' + err.message);
              }
            }}
            onSaveCashier={async (c) => {
              await api.saveCashier(c);
              loadData();
            }}
            onDeleteCashier={async (id) => {
              await api.deleteCashier(id);
              loadData();
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
            const targetCashier = pendingCashierChange;
            const previousCashier = activeCashier;
            try {
              const deviceId = getDeviceId();
              await api.claimCashierSession(targetCashier.id, deviceId, activeRegister?.id, false);
              if (previousCashier && previousCashier.id !== targetCashier.id) {
                await api.releaseCashierSession(previousCashier.id, deviceId);
              }
              setActiveCashier(targetCashier);
              setShowPinModal(false);
              setPendingCashierChange(null);
            } catch (err: any) {
              alert(
                err.message ||
                  `Acceso denegado: El usuario "${targetCashier.name}" ya tiene una sesión activa en otro equipo.`
              );
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
          loyaltyConfig={loyaltyConfig}
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
            window.dispatchEvent(
              new CustomEvent('recreo-add-common-product', {
                detail: { name, price },
              })
            );
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
          onDeleteShift={activeCashier?.role === 'ADMIN' ? handleDeleteShift : undefined}
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

      {/* Logout Confirmation In-App Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirmLogout={executeConfirmLogout}
        currentUser={authSession}
        activeCashier={activeCashier}
        activeShift={activeShift}
        activeRegister={activeRegister}
        onStartCashCut={() => {
          setShowLogoutModal(false);
          setLogoutAfterCloseShift(true);
          if (activeShift) {
            setShowCashCutModal(true);
          } else {
            setActiveTab('cashcut');
          }
        }}
        onSwitchCashier={() => {
          if (cashiers.length > 0) {
            setPendingCashierChange(cashiers.find((c) => c.id !== activeCashier?.id) || cashiers[0]);
            setShowPinModal(true);
          }
        }}
      />

      {/* Mandatory Cash Cut & Shift Close Modal */}
      {showCashCutModal && activeShift && (
        <CashCutModal
          isOpen={showCashCutModal}
          shift={activeShift}
          register={activeRegister}
          cashier={activeCashier}
          onClose={() => {
            setShowCashCutModal(false);
            setLogoutAfterCloseShift(false);
          }}
          onConfirmCloseShift={async (declaredCash, notes) => {
            await handleCloseShift(declaredCash, notes);
          }}
        />
      )}

      {/* Devoluciones y Reembolsos Modal */}
      <ReturnsModal
        isOpen={showReturnsModal}
        onClose={() => {
          setShowReturnsModal(false);
          setReturnPreselectedSale(null);
        }}
        sales={sales}
        products={products}
        customers={customers}
        activeRegister={activeRegister}
        activeShift={activeShift}
        activeCashier={activeCashier}
        preselectedSale={returnPreselectedSale}
        onProcessReturn={async (returnData) => {
          const res = await api.processReturn(returnData);
          await loadData();
          return res;
        }}
        onApplyReturnCreditToCart={(creditAmount, description) => {
          setActiveTab('sales');
          window.dispatchEvent(
            new CustomEvent('recreo-apply-return-credit', {
              detail: { creditAmount, description },
            })
          );
        }}
      />

      {/* Programa de Puntos / Fidelización Config Modal */}
      {showLoyaltyConfigModal && (
        <LoyaltyConfigModal
          isOpen={showLoyaltyConfigModal}
          onClose={() => setShowLoyaltyConfigModal(false)}
          currentConfig={loyaltyConfig}
          onSaveConfig={async (newCfg) => {
            const saved = await api.saveLoyaltyConfig(newCfg);
            setLoyaltyConfig(saved);
            await loadData();
          }}
        />
      )}
    </div>
  );
}
