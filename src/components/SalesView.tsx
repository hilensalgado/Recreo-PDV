import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  Scale,
  User,
  Tag,
  Grid,
  Clock,
  ArrowDownUp,
  AlertCircle,
  Percent,
  CheckCircle2,
  PackageCheck,
  X,
  Scan,
  RotateCcw,
  BadgePercent,
  Sparkles,
  Users,
} from 'lucide-react';
import { Product, CartItem, Customer, CommonProduct, HoldTicket, Sale, Promotion } from '../types/pos';
import {
  calculateItemPricing,
  calculateCartTotals,
  evaluateAutomaticPromotions,
  isPromotionActiveNow,
  roundCurrency,
  formatCurrency,
} from '../utils/pricingEngine';

interface DraftTicket {
  id: string;
  name: string;
  items: CartItem[];
  customer?: Customer;
}

interface SalesViewProps {
  products: Product[];
  customers: Customer[];
  commonProducts: CommonProduct[];
  promotions?: Promotion[];
  onOpenCheckout: (
    items: CartItem[],
    total: number,
    customer?: Customer,
    onSaleSuccess?: () => void
  ) => void;
  onOpenCommonProducts: (addCommonItem: (name: string, price: number) => void) => void;
  onRegisterAddCommonItem?: (addCommonItem: (name: string, price: number) => void) => void;
  onOpenMovements: () => void;
  onOpenHoldTickets: (
    items: CartItem[],
    customer?: Customer,
    restoreHoldTicket?: (ticket: HoldTicket) => void
  ) => void;
  onOpenReturns?: (sale?: Sale) => void;
  activeRegisterName: string;
}

export const SalesView: React.FC<SalesViewProps> = ({
  products = [],
  customers = [],
  commonProducts = [],
  promotions = [],
  onOpenCheckout,
  onOpenCommonProducts,
  onRegisterAddCommonItem,
  onOpenMovements,
  onOpenHoldTickets,
  onOpenReturns,
  activeRegisterName,
}) => {
  const DRAFT_TICKETS_KEY = 'recreo_pdv_draft_tickets';
  const DRAFT_ACTIVE_KEY = 'recreo_pdv_active_ticket_id';

  // Multi-Ticket Drafts State with LocalStorage Persistence
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

  // Active Draft Cart shortcuts
  const activeTicket = tickets.find((t) => t.id === activeTicketId) || tickets[0] || { id: 't-1', name: 'Ticket 1', items: [] };
  const cartItems = activeTicket.items || [];
  const selectedCustomer = activeTicket.customer;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchPromoResults, setSearchPromoResults] = useState<Promotion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Weight Modal State
  const [weightedProduct, setWeightedProduct] = useState<Product | null>(null);
  const [inputWeight, setInputWeight] = useState<string>('1.000');

  // Customer Modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFilterTab, setCustomerFilterTab] = useState<'all' | 'employees' | 'clients'>('all');

  // Promos Quick Modal
  const [showPromosModal, setShowPromosModal] = useState(false);
  const [promoSearch, setPromoSearch] = useState('');
  const [promoTypeFilter, setPromoTypeFilter] = useState<'ALL' | 'COMBO' | 'BOGO_2X1' | 'SECOND_UNIT_DISCOUNT' | 'PERCENTAGE_DISCOUNT' | 'FIXED_DISCOUNT' | 'BULK_PRICE'>('ALL');

  // Discount/Price Modal
  const [editingItem, setEditingItem] = useState<{ index: number; item: CartItem } | null>(null);
  const [editUnitPrice, setEditUnitPrice] = useState<string>('');
  const [editDiscountPercent, setEditDiscountPercent] = useState<string>('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto focus search input on mount and whenever search modal closes
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Helper to recalculate discount on a list of cart items given a customer
  const applyCustomerDiscountToItems = (items: CartItem[], cust?: Customer): CartItem[] => {
    const empDiscount =
      cust && (cust.isEmployee || (cust.employeeDiscountPercentage && cust.employeeDiscountPercentage > 0))
        ? cust.employeeDiscountPercentage || 10
        : 0;

    return items.map((item) => {
      const discountPercentage = empDiscount > 0 ? empDiscount : 0;
      const pricing = calculateItemPricing(
        item.product,
        item.quantity,
        discountPercentage,
        item.isPromotion,
        item.isPromotion ? item.unitPrice : undefined
      );
      return {
        ...item,
        unitPrice: pricing.unitPrice,
        isWholesaleApplied: pricing.isWholesaleApplied,
        discountPercentage,
        subtotal: pricing.itemSubtotal,
        total: pricing.itemTotal,
      };
    });
  };

  // Filter products and promotions as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchPromoResults([]);
      setShowDropdown(false);
      return;
    }

    const q = searchQuery.toLowerCase().trim();
    const matchesProds = (products || []).filter(
      (p) =>
        p.barcode.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.departmentName && p.departmentName.toLowerCase().includes(q))
    );

    const matchesPromos = (promotions || []).filter(
      (promo) =>
        promo.status === 'ACTIVE' &&
        (promo.code.toLowerCase().includes(q) ||
          promo.name.toLowerCase().includes(q) ||
          (promo.description && promo.description.toLowerCase().includes(q)))
    );

    setSearchResults(matchesProds.slice(0, 8));
    setSearchPromoResults(matchesPromos.slice(0, 5));
    setShowDropdown(matchesProds.length > 0 || matchesPromos.length > 0);
  }, [searchQuery, products, promotions]);

  // Helper to update current ticket's items
  const updateActiveCart = (newItems: CartItem[], newCustomer?: Customer) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === activeTicketId
          ? {
              ...t,
              items: newItems,
              customer: newCustomer !== undefined ? newCustomer : t.customer,
            }
          : t
      )
    );
  };

  // Helper to assign a customer and auto-recalculate cart discounts if employee
  const handleSelectCustomer = (customer?: Customer) => {
    const updatedItems = applyCustomerDiscountToItems(cartItems, customer);
    updateActiveCart(updatedItems, customer);
    setShowCustomerModal(false);
  };

  // Add Promotion Combo to Cart with Stock Verification
  const handleAddPromotionToCart = (promo: Promotion, quantityToAdd: number = 1) => {
    // 1. Verify stock sufficiency for every component product
    for (const item of promo.items) {
      const prod = products.find((p) => p.id === item.productId);
      const totalNeeded = item.quantity * quantityToAdd;
      if (!prod || prod.stock < totalNeeded) {
        alert(
          `⚠️ Stock insuficiente para la promoción "${promo.name}".\n` +
          `El artículo "${item.productName}" tiene existencia de ${prod ? prod.stock : 0} ` +
          `(se requieren ${totalNeeded} para este combo).`
        );
        return;
      }
    }

    setTickets((prev) => {
      const activeIdx = prev.findIndex((t) => t.id === activeTicketId);
      const targetIdx = activeIdx >= 0 ? activeIdx : 0;
      const activeT = prev[targetIdx] || { id: 't-1', name: 'Ticket 1', items: [] };
      const currentItems = activeT.items || [];
      const currentCust = activeT.customer;
      const empDiscount =
        currentCust && (currentCust.isEmployee || (currentCust.employeeDiscountPercentage && currentCust.employeeDiscountPercentage > 0))
          ? currentCust.employeeDiscountPercentage || 10
          : 0;

      const promoVirtualProductId = `promo-${promo.id}`;
      const existingIndex = currentItems.findIndex(
        (item) => item.isPromotion && item.promotionId === promo.id
      );

      let newItems = [...currentItems];

      if (existingIndex >= 0) {
        const current = newItems[existingIndex];
        const newQty = current.quantity + quantityToAdd;

        // Check if total newQty exceeds stock
        for (const item of promo.items) {
          const prod = products.find((p) => p.id === item.productId);
          const totalNeeded = item.quantity * newQty;
          if (!prod || prod.stock < totalNeeded) {
            alert(
              `⚠️ Stock insuficiente para agregar más combos de "${promo.name}".\n` +
              `El artículo "${item.productName}" solo cuenta con ${prod ? prod.stock : 0} en existencia.`
            );
            return prev;
          }
        }

        const subtotal = promo.price * newQty;
        const discountPct = current.discountPercentage || empDiscount;
        const discountAmount = (subtotal * discountPct) / 100;

        newItems[existingIndex] = {
          ...current,
          quantity: newQty,
          subtotal,
          total: subtotal - discountAmount,
        };
      } else {
        const customProduct: Product = {
          id: promoVirtualProductId,
          barcode: promo.code,
          name: promo.name,
          departmentId: 'dep-promotions',
          departmentName: 'Promociones',
          costPrice: 0,
          salePrice: promo.price,
          wholesalePrice: promo.price,
          wholesaleMinQty: 999,
          stock: 999,
          minStock: 0,
          unit: 'piece',
          updatedAt: new Date().toISOString(),
        };

        const subtotal = promo.price * quantityToAdd;
        const discountPct = empDiscount;
        const discountAmount = (subtotal * discountPct) / 100;

        newItems.push({
          productId: promoVirtualProductId,
          product: customProduct,
          quantity: quantityToAdd,
          unitPrice: promo.price,
          isWholesaleApplied: false,
          discountPercentage: discountPct,
          subtotal,
          total: subtotal - discountAmount,
          isPromotion: true,
          promotionId: promo.id,
          promotionCode: promo.code,
          promotionItems: promo.items,
          notes: promo.description,
        });
      }

      const newTickets = [...prev];
      newTickets[targetIdx] = {
        ...activeT,
        items: newItems,
      };
      return newTickets;
    });

    setSearchQuery('');
    setShowDropdown(false);
    setShowPromosModal(false);
    searchInputRef.current?.focus();
  };

  // Add Product to Cart
  const handleAddProductToCart = (product: Product, quantityToAdd: number = 1) => {
    if (product.unit === 'kg' && quantityToAdd === 1) {
      setWeightedProduct(product);
      setInputWeight('1.000');
      setShowDropdown(false);
      setSearchQuery('');
      return;
    }

    setTickets((prev) => {
      const activeIdx = prev.findIndex((t) => t.id === activeTicketId);
      const targetIdx = activeIdx >= 0 ? activeIdx : 0;
      const activeT = prev[targetIdx] || { id: 't-1', name: 'Ticket 1', items: [] };
      const currentItems = activeT.items || [];
      const currentCust = activeT.customer;
      const empDiscount =
        currentCust && (currentCust.isEmployee || (currentCust.employeeDiscountPercentage && currentCust.employeeDiscountPercentage > 0))
          ? currentCust.employeeDiscountPercentage || 10
          : 0;

      const existingIndex = currentItems.findIndex((item) => item.productId === product.id);
      let newItems = [...currentItems];

      if (existingIndex >= 0) {
        const current = newItems[existingIndex];
        const newQty = current.quantity + quantityToAdd;
        const discountPct = current.discountPercentage || empDiscount;
        const pricing = calculateItemPricing(product, newQty, discountPct);

        newItems[existingIndex] = {
          ...current,
          quantity: Number(newQty.toFixed(3)),
          unitPrice: pricing.unitPrice,
          isWholesaleApplied: pricing.isWholesaleApplied,
          discountPercentage: discountPct,
          subtotal: pricing.itemSubtotal,
          total: pricing.itemTotal,
        };
      } else {
        const discountPct = empDiscount;
        const pricing = calculateItemPricing(product, quantityToAdd, discountPct);

        newItems.push({
          productId: product.id,
          product,
          quantity: Number(quantityToAdd.toFixed(3)),
          unitPrice: pricing.unitPrice,
          isWholesaleApplied: pricing.isWholesaleApplied,
          discountPercentage: discountPct,
          subtotal: pricing.itemSubtotal,
          total: pricing.itemTotal,
        });
      }

      const newTickets = [...prev];
      newTickets[targetIdx] = {
        ...activeT,
        items: newItems,
      };
      return newTickets;
    });

    setSearchQuery('');
    setShowDropdown(false);
    searchInputRef.current?.focus();
  };

  // Add Weight Product Confirm
  const handleConfirmWeight = () => {
    if (!weightedProduct) return;
    const weightVal = parseFloat(inputWeight);
    if (isNaN(weightVal) || weightVal <= 0) return;

    handleAddProductToCart(weightedProduct, weightVal);
    setWeightedProduct(null);
  };

  // Add Common Item (Product Común / Sin Código)
  const handleAddCommonItem = useCallback((name: string, price: number) => {
    const cleanName = (name || 'Venta Libre').trim();
    const cleanPrice = typeof price === 'number' && !isNaN(price) ? Math.max(0, price) : 0;

    setTickets((prev) => {
      const activeIdx = prev.findIndex((t) => t.id === activeTicketId);
      const targetIdx = activeIdx >= 0 ? activeIdx : 0;
      const activeT = prev[targetIdx] || { id: 't-1', name: 'Ticket 1', items: [] };
      const currentItems = activeT.items || [];
      const currentCust = activeT.customer;
      const empDiscount =
        currentCust && (currentCust.isEmployee || (currentCust.employeeDiscountPercentage && currentCust.employeeDiscountPercentage > 0))
          ? currentCust.employeeDiscountPercentage || 10
          : 0;

      // Check if identical common product exists in this ticket
      const existingIndex = currentItems.findIndex(
        (item) =>
          item.product.barcode === 'VARIO' &&
          item.product.name.trim().toLowerCase() === cleanName.toLowerCase() &&
          item.unitPrice === cleanPrice
      );

      let newItems = [...currentItems];

      if (existingIndex >= 0) {
        const current = newItems[existingIndex];
        const newQty = current.quantity + 1;
        const subtotal = cleanPrice * newQty;
        const discountPct = current.discountPercentage || empDiscount;
        const discountAmount = (subtotal * discountPct) / 100;

        newItems[existingIndex] = {
          ...current,
          quantity: newQty,
          discountPercentage: discountPct,
          subtotal,
          total: subtotal - discountAmount,
        };
      } else {
        const customProduct: Product = {
          id: `cp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          barcode: 'VARIO',
          name: cleanName,
          departmentId: 'dep-8',
          departmentName: 'Servicios y Varios',
          costPrice: 0,
          salePrice: cleanPrice,
          wholesalePrice: cleanPrice,
          wholesaleMinQty: 999,
          stock: 999,
          minStock: 0,
          unit: 'piece',
          updatedAt: new Date().toISOString(),
        };

        const subtotal = cleanPrice;
        const discountPct = empDiscount;
        const discountAmount = (subtotal * discountPct) / 100;

        newItems.push({
          productId: customProduct.id,
          product: customProduct,
          quantity: 1,
          unitPrice: cleanPrice,
          isWholesaleApplied: false,
          discountPercentage: discountPct,
          subtotal,
          total: subtotal - discountAmount,
        });
      }

      const newTickets = [...prev];
      newTickets[targetIdx] = {
        ...activeT,
        items: newItems,
      };
      return newTickets;
    });

    searchInputRef.current?.focus();
  }, [activeTicketId]);

  // Register common product handler globally & via props
  useEffect(() => {
    if (onRegisterAddCommonItem) {
      onRegisterAddCommonItem(handleAddCommonItem);
    }
  }, [handleAddCommonItem, onRegisterAddCommonItem]);

  useEffect(() => {
    const handleGlobalCommon = (e: Event) => {
      const customEvt = e as CustomEvent<{ name: string; price: number }>;
      if (customEvt.detail && customEvt.detail.name && typeof customEvt.detail.price === 'number') {
        handleAddCommonItem(customEvt.detail.name, customEvt.detail.price);
      }
    };
    window.addEventListener('recreo-add-common-product', handleGlobalCommon);
    const handleOpenPromosEvt = () => {
      setShowPromosModal(true);
    };
    window.addEventListener('recreo-open-promos-modal', handleOpenPromosEvt);

    return () => {
      window.removeEventListener('recreo-add-common-product', handleGlobalCommon);
      window.removeEventListener('recreo-open-promos-modal', handleOpenPromosEvt);
    };
  }, [handleAddCommonItem]);

  const handleRestoreHoldTicket = (holdTicket: HoldTicket) => {
    updateActiveCart(holdTicket.items || []);
  };

  // Listen for applied return credit to current active cart
  useEffect(() => {
    const handleReturnCredit = (e: Event) => {
      const customEvt = e as CustomEvent<{ creditAmount: number; description: string }>;
      if (customEvt.detail && typeof customEvt.detail.creditAmount === 'number' && customEvt.detail.creditAmount > 0) {
        const { creditAmount, description } = customEvt.detail;
        const creditProduct: Product = {
          id: `credit-dev-${Date.now()}`,
          barcode: 'DEV-CREDITO',
          name: `CREDITO A FAVOR: ${description}`,
          departmentId: 'dep-8',
          departmentName: 'Servicios y Varios',
          costPrice: 0,
          salePrice: -creditAmount,
          wholesalePrice: -creditAmount,
          wholesaleMinQty: 999,
          stock: 999,
          minStock: 0,
          unit: 'piece',
          updatedAt: new Date().toISOString(),
        };

        const newItems: CartItem[] = [
          ...cartItems,
          {
            productId: creditProduct.id,
            product: creditProduct,
            quantity: 1,
            unitPrice: -creditAmount,
            isWholesaleApplied: false,
            discountPercentage: 0,
            subtotal: -creditAmount,
            total: -creditAmount,
          },
        ];
        updateActiveCart(newItems);
      }
    };
    window.addEventListener('recreo-apply-return-credit', handleReturnCredit);
    return () => {
      window.removeEventListener('recreo-apply-return-credit', handleReturnCredit);
    };
  }, [cartItems, updateActiveCart]);

  // Barcode Submit (press Enter)
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    let multiplier = 1;
    let rawQuery = searchQuery.trim();

    // Check for N*BARCODE syntax (e.g. 5*779123456 or 2.5*779123456)
    if (rawQuery.includes('*')) {
      const parts = rawQuery.split('*');
      if (parts.length === 2) {
        const parsedQty = parseFloat(parts[0]);
        if (!isNaN(parsedQty) && parsedQty > 0) {
          multiplier = parsedQty;
          rawQuery = parts[1].trim();
        }
      }
    }

    const q = rawQuery.toLowerCase();

    // Check exact match for active promotion code
    const exactPromo = (promotions || []).find(
      (promo) => promo.status === 'ACTIVE' && promo.code.toLowerCase() === q
    );
    if (exactPromo) {
      handleAddPromotionToCart(exactPromo, multiplier);
      return;
    }

    // Check exact match for product barcode
    const exactProd = products.find(
      (p) => p.barcode.toLowerCase() === q
    );
    if (exactProd) {
      handleAddProductToCart(exactProd, multiplier);
      return;
    }

    // If no exact match, add first promo result or product result
    if (searchPromoResults.length > 0) {
      handleAddPromotionToCart(searchPromoResults[0], multiplier);
    } else if (searchResults.length > 0) {
      handleAddProductToCart(searchResults[0], multiplier);
    } else {
      alert(`Producto o promoción con código "${rawQuery}" no encontrado`);
    }
  };

  // Scanner Simulator (Pick a random item to simulate USB barcode scanner reading)
  const handleSimulateScanner = () => {
    if (products.length === 0) return;
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    handleAddProductToCart(randomProduct, randomProduct.unit === 'kg' ? 0.75 : 1);
  };

  const handleApplyPromoShortcut = (promo: Promotion) => {
    if (promo.type === 'COMBO') {
      handleAddPromotionToCart(promo, 1);
      setShowPromosModal(false);
      return;
    }

    let targetProduct: Product | undefined;
    if (promo.targetProductId) {
      targetProduct = products.find((p) => p.id === promo.targetProductId);
    }
    if (!targetProduct && promo.targetDepartmentId) {
      targetProduct = products.find((p) => p.departmentId === promo.targetDepartmentId);
    }
    if (!targetProduct && promo.items && promo.items.length > 0) {
      targetProduct = products.find((p) => promo.items.some((pi) => pi.productId === p.id));
    }

    if (!targetProduct) {
      alert(`No se encontró un producto participante disponible para "${promo.name}"`);
      return;
    }

    let qtyToAdd = 1;
    if (promo.type === 'BOGO_2X1') {
      qtyToAdd = promo.minQuantity || 2;
    } else if (promo.type === 'SECOND_UNIT_DISCOUNT') {
      qtyToAdd = 2;
    } else if (promo.type === 'BULK_PRICE' && promo.minQuantity) {
      qtyToAdd = promo.minQuantity;
    }

    handleAddProductToCart(targetProduct, qtyToAdd);
    setShowPromosModal(false);
  };

  // Cart Operations
  const handleQuantityChange = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }

    let newItems = [...cartItems];
    const item = newItems[index];
    const product = item.product;

    const pricing = calculateItemPricing(
      product,
      newQty,
      item.discountPercentage,
      item.isPromotion,
      item.isPromotion ? item.unitPrice : undefined
    );

    newItems[index] = {
      ...item,
      quantity: Number(newQty.toFixed(3)),
      unitPrice: pricing.unitPrice,
      isWholesaleApplied: pricing.isWholesaleApplied,
      subtotal: pricing.itemSubtotal,
      total: pricing.itemTotal,
    };

    updateActiveCart(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = cartItems.filter((_, i) => i !== index);
    updateActiveCart(newItems);
  };

  // Totals using Unified Engine with Automatic Promotions
  const evaluatedCart = React.useMemo(() => {
    return evaluateAutomaticPromotions(cartItems, promotions || [], selectedCustomer);
  }, [cartItems, promotions, selectedCustomer]);

  const displayCartItems = evaluatedCart.items || [];
  const subtotalSum = Number(evaluatedCart.subtotal ?? evaluatedCart.totalOriginalSubtotal ?? 0);
  const totalSum = Number(evaluatedCart.total ?? 0);
  const discountSum = Number(evaluatedCart.totalDiscount ?? 0);
  const promoSavingsSum = Number(evaluatedCart.totalPromoSavings ?? 0);
  const itemCount = displayCartItems.reduce((acc, item) => acc + (item.product.unit === 'kg' ? 1 : item.quantity), 0);

  // Multi Ticket Actions
  const handleAddTicket = () => {
    const nextId = `t-${Date.now()}`;
    const nextNum = tickets.length + 1;
    const newTicket = { id: nextId, name: `Ticket ${nextNum}`, items: [] };
    setTickets([...tickets, newTicket]);
    setActiveTicketId(nextId);
  };

  const handleRemoveTicket = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tickets.length === 1) {
      updateActiveCart([], undefined);
      return;
    }
    const filtered = tickets.filter((t) => t.id !== id);
    setTickets(filtered);
    if (activeTicketId === id) {
      setActiveTicketId(filtered[0].id);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-115px)] lg:h-[calc(100vh-110px)] w-full p-2 sm:p-2.5 gap-2 select-none pb-28 lg:pb-2">
      {/* Top Header: Multi-Ticket Tabs & Search Bar */}
      <div className="bg-white p-2.5 rounded-sm border border-slate-300 shadow-2xs flex flex-col gap-2">
        {/* Ticket Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar touch-pan-x">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1 shrink-0">
            Ventas Activas:
          </span>
          {tickets.map((t) => {
            const isActive = t.id === activeTicketId;
            const tTotal = t.items.reduce((acc, i) => acc + i.total, 0);

            return (
              <div
                key={t.id}
                onClick={() => setActiveTicketId(t.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:py-1 rounded-md sm:rounded-sm text-xs font-bold cursor-pointer transition-all shrink-0 min-h-[32px] ${
                  isActive
                    ? 'bg-[#1e293b] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                <span>{t.name}</span>
                {t.items.length > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-xs text-[10px] font-mono font-bold ${
                      isActive ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    ${tTotal.toFixed(2)}
                  </span>
                )}
                {tickets.length > 1 && (
                  <button
                    onClick={(e) => handleRemoveTicket(t.id, e)}
                    className="hover:text-rose-300 p-0.5 ml-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={handleAddTicket}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:py-1 rounded-md sm:rounded-sm bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition-colors shrink-0 min-h-[32px] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" /> Nuevo
          </button>
        </div>

        {/* Barcode & Search Input Bar */}
        <div className="flex gap-1.5 sm:gap-2 relative">
          <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
            <div className="relative flex items-center">
              <Barcode className="w-5 h-5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Escanear código de barras o buscar producto..."
                className="w-full pl-10 pr-20 sm:pr-24 py-2 sm:py-2.5 bg-slate-50 border border-slate-300 rounded-lg sm:rounded-sm text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setShowDropdown(false);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-20 sm:right-24 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                  title="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1 px-2.5 sm:px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md sm:rounded-xs shadow-2xs transition-colors flex items-center gap-1 cursor-pointer min-h-[32px]"
              >
                <Search className="w-3.5 h-3.5" /> <span className="hidden xs:inline">AGREGAR</span>
              </button>
            </div>

            {/* Live Search Suggestions Dropdown */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg sm:rounded-sm shadow-xl max-h-80 overflow-y-auto z-50 divide-y divide-slate-100">
                {/* Promotions Matches */}
                {searchPromoResults.map((promo) => (
                  <button
                    key={promo.id}
                    type="button"
                    onClick={() => handleAddPromotionToCart(promo, 1)}
                    className="w-full px-3 py-2.5 text-left flex items-center justify-between hover:bg-purple-50 active:bg-purple-100 transition-colors cursor-pointer bg-purple-50/40"
                  >
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-purple-950 flex items-center gap-2">
                        <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.2 rounded font-black tracking-wide flex items-center gap-1">
                          <Tag className="w-3 h-3" /> COMBO
                        </span>
                        <span>{promo.name}</span>
                      </div>
                      <div className="text-[11px] text-purple-700/80 flex items-center gap-3 font-mono mt-0.5">
                        <span>Cód: {promo.code}</span>
                        <span>({promo.items.map((i) => `${i.quantity}x ${i.productName}`).join(' + ')})</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-sm sm:text-base text-purple-700">
                        ${promo.price.toFixed(2)}
                      </div>
                      <span className="text-[9px] text-purple-500 font-bold uppercase">Promoción</span>
                    </div>
                  </button>
                ))}

                {/* Products Matches */}
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddProductToCart(p, 1)}
                    className="w-full px-3 py-2.5 text-left flex items-center justify-between hover:bg-blue-50 active:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
                        {p.name}
                        {p.unit === 'kg' && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                            <Scale className="w-3 h-3" /> Kilo
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-3 font-mono">
                        <span>Cód: {p.barcode}</span>
                        <span>Exist: {p.stock} {p.unit === 'kg' ? 'kg' : 'pzs'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm sm:text-base text-blue-600">
                        ${p.salePrice.toFixed(2)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Quick Scanner Simulator */}
          <button
            onClick={handleSimulateScanner}
            title="Simula un disparo de pistola láser escáner"
            className="flex items-center gap-1 px-2.5 sm:px-3 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs rounded-lg sm:rounded-sm shadow-2xs transition-colors cursor-pointer shrink-0"
          >
            <Scan className="w-4 h-4" />
            <span className="hidden md:inline">Escáner</span>
          </button>
        </div>
      </div>

      {/* Center Grid: Cart Table & Summary Box */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-2 min-h-0">
        {/* Main Cart Table (3 Cols) */}
        <div className="lg:col-span-3 bg-white rounded-lg sm:rounded-sm border border-slate-300 shadow-2xs flex flex-col overflow-hidden">
          {/* Cart Header */}
          <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 flex items-center justify-between font-bold text-xs text-slate-700 uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-blue-600" />
              <span>Lista de Artículos</span>
              <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded-xs font-mono font-bold text-xs">
                {cartItems.length} art / {itemCount} pzs
              </span>
            </div>

            {selectedCustomer && (
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-xs text-xs font-bold ${
                selectedCustomer.isEmployee || (selectedCustomer.employeeDiscountPercentage && selectedCustomer.employeeDiscountPercentage > 0)
                  ? 'bg-emerald-100 border border-emerald-300 text-emerald-900 shadow-2xs'
                  : 'bg-blue-50 border border-blue-200 text-blue-800'
              }`}>
                {selectedCustomer.isEmployee || (selectedCustomer.employeeDiscountPercentage && selectedCustomer.employeeDiscountPercentage > 0) ? (
                  <BadgePercent className="w-3.5 h-3.5 text-emerald-700" />
                ) : (
                  <User className="w-3.5 h-3.5" />
                )}
                <span className="truncate max-w-[140px] sm:max-w-none">
                  {selectedCustomer.isEmployee ? 'Empleado' : 'Cliente'}: {selectedCustomer.name}
                </span>
                {(selectedCustomer.isEmployee || (selectedCustomer.employeeDiscountPercentage && selectedCustomer.employeeDiscountPercentage > 0)) && (
                  <span className="bg-emerald-600 text-white font-black text-[10px] px-1.5 py-0.2 rounded">
                    {selectedCustomer.employeeDiscountPercentage || 10}% DESC
                  </span>
                )}
                <button
                  onClick={() => handleSelectCustomer(undefined)}
                  className="hover:text-rose-600 ml-1 cursor-pointer"
                  title="Quitar cliente"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Table / Cards Body */}
          <div className="flex-1 overflow-y-auto p-1 divide-y divide-slate-100">
            {displayCartItems.length === 0 ? (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center p-6 sm:p-8 text-center text-slate-400">
                <Barcode className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
                <p className="font-bold text-slate-600 text-sm">Ticket sin artículos</p>
                <p className="text-xs max-w-sm mt-1 text-slate-400">
                  Escanea con tu lector de código de barras o escribe el nombre del producto arriba.
                </p>
              </div>
            ) : (
              <>
                {/* 1. Mobile Cards View (sm:hidden) */}
                <div className="sm:hidden space-y-2 p-1">
                  {displayCartItems.map((item, idx) => (
                    <div
                      key={`mob-${item.productId}-${idx}`}
                      className={`bg-slate-50/80 p-2.5 rounded-lg border shadow-2xs space-y-2 ${
                        item.appliedPromotionName
                          ? 'border-purple-300 bg-purple-50/20'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-xs leading-tight flex items-center gap-1.5 flex-wrap">
                            {item.isPromotion && (
                              <span className="bg-purple-600 text-white font-black text-[9px] px-1.5 py-0.2 rounded border border-purple-700 flex items-center gap-0.5">
                                <Tag className="w-2.5 h-2.5" /> COMBO
                              </span>
                            )}
                            {item.appliedPromotionName && (
                              <span className="bg-purple-100 text-purple-800 font-extrabold text-[9px] px-1.5 py-0.2 rounded border border-purple-300 flex items-center gap-0.5 animate-pulse">
                                <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                                {item.appliedPromotionName}
                              </span>
                            )}
                            <span>{item.product.name}</span>
                          </div>
                          {item.isPromotion && item.promotionItems && (
                            <div className="text-[10px] text-purple-700 font-mono mt-0.5 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                              📦 Incluye: {item.promotionItems.map((pi) => `${pi.quantity}x ${pi.productName}`).join(' + ')}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-mono flex-wrap">
                            <span>{item.product.barcode}</span>
                            {item.isWholesaleApplied && (
                              <span className="bg-amber-100 text-amber-800 font-bold px-1 py-0.2 rounded border border-amber-300">
                                MAYOREO
                              </span>
                            )}
                            {item.discountPercentage > 0 && (
                              <span className="bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.2 rounded border border-emerald-300 flex items-center gap-0.5">
                                <BadgePercent className="w-2.5 h-2.5" /> -{item.discountPercentage}%
                              </span>
                            )}
                            {item.promoDiscountAmount && item.promoDiscountAmount > 0 ? (
                              <span className="bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.2 rounded border border-emerald-300">
                                Ahorro Promo: ${item.promoDiscountAmount.toFixed(2)}
                              </span>
                            ) : null}
                            {item.product.unit === 'kg' && (
                              <span className="bg-emerald-100 text-emerald-800 font-bold px-1 py-0.2 rounded">
                                Báscula
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 active:text-rose-700 bg-white rounded border border-slate-200 transition-colors cursor-pointer"
                          title="Eliminar artículo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-1.5 bg-white p-0.5 rounded-lg border border-slate-300">
                          <button
                            onClick={() =>
                              handleQuantityChange(
                                idx,
                                item.quantity - (item.product.unit === 'kg' ? 0.1 : 1)
                              )
                            }
                            className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 active:bg-slate-300 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            step={item.product.unit === 'kg' ? '0.001' : '1'}
                            value={item.quantity}
                            onChange={(e) =>
                              handleQuantityChange(idx, parseFloat(e.target.value) || 0)
                            }
                            className="w-12 text-center font-mono font-bold text-slate-900 text-xs focus:outline-none"
                          />
                          <button
                            onClick={() =>
                              handleQuantityChange(
                                idx,
                                item.quantity + (item.product.unit === 'kg' ? 0.1 : 1)
                              )
                            }
                            className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 active:bg-slate-300 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Price & Total */}
                        <div className="text-right font-mono">
                          <div className="text-[10px] text-slate-500">
                            {item.originalUnitPrice && item.originalUnitPrice !== item.unitPrice && (
                              <span className="line-through text-slate-400 mr-1">
                                ${(item.originalUnitPrice || item.unitPrice || 0).toFixed(2)}
                              </span>
                            )}
                            ${(item.unitPrice || 0).toFixed(2)} c/u
                          </div>
                          <div className="font-extrabold text-sm text-blue-700">
                            ${(item.total || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2. Desktop Table View (hidden sm:table) */}
                <table className="hidden sm:table w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-[11px] font-bold text-slate-500 border-b border-slate-200 bg-slate-50 sticky top-0">
                      <th className="p-2">Código</th>
                      <th className="p-2">Descripción</th>
                      <th className="p-2 text-center">Cantidad</th>
                      <th className="p-2 text-right">Precio Unid.</th>
                      <th className="p-2 text-right">Importe</th>
                      <th className="p-2 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {displayCartItems.map((item, idx) => (
                      <tr
                        key={`${item.productId}-${idx}`}
                        className={`hover:bg-blue-50/50 transition-colors ${
                          item.appliedPromotionName ? 'bg-purple-50/30' : ''
                        }`}
                      >
                        <td className="p-2 font-mono text-slate-600 font-semibold">{item.product.barcode}</td>
                        <td className="p-2 font-bold text-slate-800">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.isPromotion && (
                                <span className="bg-purple-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded border border-purple-700 flex items-center gap-0.5">
                                  <Tag className="w-2.5 h-2.5" /> COMBO
                                </span>
                              )}
                              {item.appliedPromotionName && (
                                <span className="bg-purple-100 text-purple-800 text-[9px] font-black px-1.5 py-0.2 rounded border border-purple-300 flex items-center gap-0.5">
                                  <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                                  {item.appliedPromotionName}
                                </span>
                              )}
                              <span>{item.product.name}</span>
                              {item.isWholesaleApplied && (
                                <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1 py-0.2 rounded border border-amber-300">
                                  MAYOREO
                                </span>
                              )}
                              {item.discountPercentage > 0 && (
                                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.2 rounded border border-emerald-300 flex items-center gap-0.5">
                                  <BadgePercent className="w-2.5 h-2.5" /> -{item.discountPercentage}%
                                </span>
                              )}
                              {item.promoDiscountAmount && item.promoDiscountAmount > 0 ? (
                                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded border border-emerald-300">
                                  -${item.promoDiscountAmount.toFixed(2)}
                                </span>
                              ) : null}
                            </div>
                            {item.isPromotion && item.promotionItems && (
                              <div className="text-[10px] text-purple-700 font-mono">
                                📦 Incluye: {item.promotionItems.map((pi) => `${pi.quantity}x ${pi.productName}`).join(' + ')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() =>
                                handleQuantityChange(
                                  idx,
                                  item.quantity - (item.product.unit === 'kg' ? 0.1 : 1)
                                )
                              }
                              className="p-1 rounded-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              step={item.product.unit === 'kg' ? '0.001' : '1'}
                              value={item.quantity}
                              onChange={(e) =>
                                handleQuantityChange(idx, parseFloat(e.target.value) || 0)
                              }
                              className="w-14 text-center font-mono font-bold text-slate-900 border border-slate-300 rounded-xs px-1 py-0.5 text-xs bg-white focus:outline-none focus:border-blue-500"
                            />
                            <button
                              onClick={() =>
                                handleQuantityChange(
                                  idx,
                                  item.quantity + (item.product.unit === 'kg' ? 0.1 : 1)
                                )
                              }
                              className="p-1 rounded-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="p-2 text-right font-mono font-semibold text-slate-700">
                          {item.originalUnitPrice && item.originalUnitPrice !== item.unitPrice && (
                            <span className="line-through text-slate-400 mr-1.5 text-[11px]">
                              ${(item.originalUnitPrice || item.unitPrice || 0).toFixed(2)}
                            </span>
                          )}
                          ${(item.unitPrice || 0).toFixed(2)}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-sm text-blue-700">
                          ${(item.total || 0).toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Eliminar artículo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>

        {/* Right Total & Payment Display (1 Col) - High Density Design */}
        <div className="bg-[#1e293b] text-white rounded-lg sm:rounded-sm border border-slate-800 shadow-md p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                PAGO PENDIENTE
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 uppercase font-bold">
                VENTA EN CURSO
              </span>
            </div>

            {/* Giant Total Display High Density */}
            <div className="bg-slate-950 p-3.5 rounded-lg sm:rounded-sm border border-slate-800 my-3 text-right shadow-inner">
              <span className="text-3xl sm:text-4xl xl:text-5xl font-mono font-bold text-[#4ade80] tracking-tight block">
                ${totalSum.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block uppercase font-mono">
                PESOS ARGENTINOS (ARS)
              </span>
            </div>

            {/* Breakdown List */}
            <div className="space-y-1.5 text-xs border-t border-slate-800 pt-2.5 font-mono">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal:</span>
                <span className="font-semibold">${subtotalSum.toFixed(2)}</span>
              </div>
              {promoSavingsSum > 0 && (
                <div className="flex justify-between text-purple-400 font-bold bg-purple-950/60 px-2 py-1 rounded border border-purple-800">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-400" /> Ahorro Ofertas:
                  </span>
                  <span>-${promoSavingsSum.toFixed(2)}</span>
                </div>
              )}
              {discountSum > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Descuentos Clientes:</span>
                  <span>-${discountSum.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Total Artículos:</span>
                <span className="font-bold text-white">{itemCount}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Caja:</span>
                <span className="font-semibold text-blue-300">{activeRegisterName}</span>
              </div>
            </div>
          </div>

          {/* Action Checkout Button (Desktop) */}
          <div className="mt-4 space-y-2">
            <button
              id="btn-main-checkout"
              onClick={() => {
                if (displayCartItems.length === 0) {
                  alert('Agrega al menos un artículo para cobrar');
                  return;
                }
                onOpenCheckout(displayCartItems, totalSum, selectedCustomer, () => {
                  updateActiveCart([], undefined);
                });
              }}
              disabled={displayCartItems.length === 0}
              className="w-full py-3.5 bg-[#16a34a] hover:bg-[#15803d] active:bg-[#166534] disabled:bg-slate-800 disabled:text-slate-600 text-white font-black text-base rounded-md sm:rounded-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <DollarSign className="w-5 h-5 stroke-[2.5]" />
              <span>[F12] COBRAR (${totalSum.toFixed(2)})</span>
            </button>

            <button
              onClick={() => setShowCustomerModal(true)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 border border-slate-700 text-xs font-semibold rounded-md sm:rounded-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px]"
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span className="truncate">{selectedCustomer ? `Cliente: ${selectedCustomer.name}` : '[F7] Asignar Cliente / Crédito'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Shortcuts Quick Bar (Mobile 2x2 Grid / Desktop Inline) */}
      <div className="bg-white p-2 rounded-lg sm:rounded-sm border border-slate-300 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700">
        <div className="w-full sm:w-auto grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5">
          <button
            onClick={() => {
              if (displayCartItems.length === 0) {
                alert('Agrega al menos un artículo para cobrar');
                return;
              }
              onOpenCheckout(displayCartItems, totalSum, selectedCustomer, () => {
                updateActiveCart([], undefined);
              });
            }}
            className="px-2.5 py-2 sm:py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-md sm:rounded-sm shadow-xs flex items-center justify-center gap-1 transition-colors cursor-pointer min-h-[36px] font-black"
          >
            <DollarSign className="w-3.5 h-3.5 stroke-[2.5]" /> <span>[F12] Cobrar</span>
          </button>
          <button
            onClick={() => onOpenCommonProducts(handleAddCommonItem)}
            className="px-2.5 py-2 sm:py-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-md sm:rounded-sm border border-slate-300 flex items-center justify-center gap-1 transition-colors cursor-pointer min-h-[36px]"
          >
            <Grid className="w-3.5 h-3.5 text-purple-600" /> <span>[F2] Comunes</span>
          </button>
          <button
            onClick={onOpenMovements}
            className="px-2.5 py-2 sm:py-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-md sm:rounded-sm border border-slate-300 flex items-center justify-center gap-1 transition-colors cursor-pointer min-h-[36px]"
          >
            <ArrowDownUp className="w-3.5 h-3.5 text-amber-600" /> <span>[F3] Movim.</span>
          </button>
          <button
            onClick={() => onOpenReturns && onOpenReturns()}
            className="px-2.5 py-2 sm:py-1 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-800 rounded-md sm:rounded-sm border border-rose-300 flex items-center justify-center gap-1 transition-colors cursor-pointer min-h-[36px]"
            title="Devolución de mercadería / Reembolso"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" /> <span>[F4] Devolución</span>
          </button>
          <button
            onClick={() => setShowPromosModal(true)}
            className="px-2.5 py-2 sm:py-1 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-800 rounded-md sm:rounded-sm border border-purple-300 flex items-center justify-center gap-1 transition-colors cursor-pointer min-h-[36px]"
            title="Catálogo de promociones y combos"
          >
            <Tag className="w-3.5 h-3.5 text-purple-600" /> <span>[F5] Combos</span>
          </button>
          <button
            onClick={() => onOpenHoldTickets(cartItems, selectedCustomer, handleRestoreHoldTicket)}
            className="px-2.5 py-2 sm:py-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-md sm:rounded-sm border border-slate-300 flex items-center justify-center gap-1 transition-colors cursor-pointer min-h-[36px]"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-600" /> <span>[F6] En Espera</span>
          </button>
          <button
            onClick={() => setShowCustomerModal(true)}
            className="px-2.5 py-2 sm:py-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-md sm:rounded-sm border border-slate-300 flex items-center justify-center gap-1 transition-colors cursor-pointer min-h-[36px]"
          >
            <User className="w-3.5 h-3.5 text-indigo-600" /> <span>[F7] Crédito</span>
          </button>
        </div>

        <div className="text-slate-500 font-medium text-[11px] hidden sm:block font-mono">
          [F12] Cobrar | [F2] Comunes | [F4] Devolución | [F10] Buscar
        </div>
      </div>

      {/* Sticky Mobile Bottom Checkout Bar (lg:hidden) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0f172a] text-white p-2.5 border-t border-slate-800 shadow-2xl z-40 flex items-center justify-between gap-2 select-none">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold">
            {displayCartItems.length} art ({itemCount} pzs)
          </span>
          <span className="text-xl font-mono font-black text-[#4ade80] leading-none">
            ${totalSum.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onOpenReturns && onOpenReturns()}
            className="p-2.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-xl border border-rose-800 text-xs font-bold transition-colors"
            title="Devolución"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowCustomerModal(true)}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-xs font-bold transition-colors"
            title="Asignar Cliente"
          >
            <User className="w-5 h-5 text-indigo-400" />
          </button>

          <button
            id="btn-mobile-checkout"
            onClick={() => {
              if (displayCartItems.length === 0) {
                alert('Agrega al menos un artículo para cobrar');
                return;
              }
              onOpenCheckout(displayCartItems, totalSum, selectedCustomer, () => {
                updateActiveCart([], undefined);
              });
            }}
            disabled={displayCartItems.length === 0}
            className="px-5 py-2.5 bg-[#16a34a] hover:bg-[#15803d] active:bg-[#166534] disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center gap-1.5 uppercase font-mono cursor-pointer"
          >
            <DollarSign className="w-5 h-5 stroke-[2.5]" />
            <span>[F12] COBRAR</span>
          </button>
        </div>
      </div>

      {/* MODAL 1: Weight Scale Prompt */}
      {weightedProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-emerald-600 border-b border-slate-100 pb-3">
              <Scale className="w-8 h-8" />
              <div>
                <h3 className="font-extrabold text-lg text-slate-800">Producto por Báscula / Peso</h3>
                <p className="text-xs text-slate-500">{weightedProduct.name}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600">
                Ingresa el peso en Kilogramos (kg):
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  autoFocus
                  value={inputWeight}
                  onChange={(e) => setInputWeight(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmWeight()}
                  className="w-full p-3 bg-slate-50 border-2 border-emerald-500 rounded-xl text-2xl font-black text-slate-900 focus:outline-none text-center"
                />
                <span className="absolute right-4 top-3.5 font-bold text-slate-400 text-sm">
                  kg
                </span>
              </div>

              <div className="flex justify-between text-xs text-slate-500 pt-1">
                <span>Precio por Kilo: ${weightedProduct.salePrice.toFixed(2)}</span>
                <span className="font-bold text-emerald-700">
                  Importe: $
                  {((parseFloat(inputWeight) || 0) * weightedProduct.salePrice).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setWeightedProduct(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmWeight}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow transition-colors"
              >
                Confirmar Peso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Assign Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600">
                <User className="w-6 h-6" />
                <h3 className="font-bold text-lg text-slate-800">Asignar Cliente al Ticket</h3>
              </div>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Filter Tabs */}
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setCustomerFilterTab('all')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                  customerFilterTab === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setCustomerFilterTab('employees')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
                  customerFilterTab === 'employees'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <BadgePercent className="w-3.5 h-3.5" />
                Empleados ({customers.filter((c) => c.isEmployee).length})
              </button>
              <button
                type="button"
                onClick={() => setCustomerFilterTab('clients')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                  customerFilterTab === 'clients'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Clientes ({customers.filter((c) => !c.isEmployee).length})
              </button>
            </div>

            <input
              type="text"
              placeholder="Buscar cliente por nombre o teléfono..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border rounded-lg">
              {customers
                .filter((c) => {
                  if (customerFilterTab === 'employees' && !c.isEmployee) return false;
                  if (customerFilterTab === 'clients' && c.isEmployee) return false;
                  if (!customerSearch.trim()) return true;
                  return (
                    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                    (c.phone && c.phone.includes(customerSearch))
                  );
                })
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className={`w-full p-3 text-left flex items-center justify-between transition-colors ${
                      c.isEmployee ? 'hover:bg-emerald-50/70 bg-emerald-50/20' : 'hover:bg-indigo-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span>{c.name}</span>
                        {c.isEmployee && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                            <BadgePercent className="w-3 h-3" />
                            {c.employeeDiscountPercentage || 10}% DESC EMPLEADO
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {c.phone || 'Sin teléfono'} {c.address ? `• ${c.address}` : ''}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-semibold text-slate-600">
                        Crédito Disp: ${(c.creditLimit - c.creditBalance).toFixed(2)}
                      </div>
                      <div className="text-rose-600 text-[10px]">
                        Deuda: ${c.creditBalance.toFixed(2)}
                      </div>
                    </div>
                  </button>
                ))}

              {customers.filter((c) => {
                if (customerFilterTab === 'employees' && !c.isEmployee) return false;
                if (customerFilterTab === 'clients' && c.isEmployee) return false;
                if (!customerSearch.trim()) return true;
                return (
                  c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                  (c.phone && c.phone.includes(customerSearch))
                );
              }).length === 0 && (
                <div className="p-6 text-center text-slate-400 text-xs font-medium">
                  No se encontraron clientes coincidentes
                </div>
              )}
            </div>

            <button
              onClick={() => setShowCustomerModal(false)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: Promos / Combos Catalog Modal */}
      {showPromosModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-purple-200 max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-purple-700">
                <Tag className="w-6 h-6" />
                <div>
                  <h3 className="font-bold text-lg text-slate-800">Catálogo de Promociones y Ofertas</h3>
                  <p className="text-xs text-slate-500">Agrega combos o activa promociones con un solo clic</p>
                </div>
              </div>
              <button
                onClick={() => setShowPromosModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs font-semibold custom-scrollbar">
              {[
                { id: 'ALL', label: 'Todas' },
                { id: 'COMBO', label: '🍱 Combos' },
                { id: 'BOGO_2X1', label: '🎁 2x1 / 3x2' },
                { id: 'SECOND_UNIT_DISCOUNT', label: '🥈 2da Unidad' },
                { id: 'PERCENTAGE_DISCOUNT', label: '🏷️ % Descuento' },
                { id: 'FIXED_DISCOUNT', label: '💵 $ Fijo' },
                { id: 'BULK_PRICE', label: '📦 Volumen' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPromoTypeFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                    promoTypeFilter === tab.id
                      ? 'bg-purple-600 text-white font-bold shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Buscar promoción por código, nombre o descripción..."
              value={promoSearch}
              onChange={(e) => setPromoSearch(e.target.value)}
              autoFocus
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {promotions
                .filter((promo) => {
                  if (promo.status !== 'ACTIVE') return false;
                  if (promoTypeFilter !== 'ALL') {
                    const promoType = promo.type || 'COMBO';
                    if (promoType !== promoTypeFilter) return false;
                  }
                  if (!promoSearch.trim()) return true;
                  const q = promoSearch.toLowerCase();
                  return (
                    promo.name.toLowerCase().includes(q) ||
                    promo.code.toLowerCase().includes(q) ||
                    (promo.description && promo.description.toLowerCase().includes(q))
                  );
                })
                .map((promo) => {
                  const pType = promo.type || 'COMBO';
                  const isCombo = pType === 'COMBO';

                  // Calculate available combo units based on product stock
                  let availableCombos = Infinity;
                  if (isCombo && promo.items && promo.items.length > 0) {
                    for (const pi of promo.items) {
                      const prod = products.find((p) => p.id === pi.productId);
                      const stock = prod ? prod.stock : 0;
                      const canMake = pi.quantity > 0 ? Math.floor(stock / pi.quantity) : 0;
                      if (canMake < availableCombos) {
                        availableCombos = canMake;
                      }
                    }
                  } else {
                    availableCombos = 999;
                  }
                  if (availableCombos === Infinity) availableCombos = 0;

                  return (
                    <div
                      key={promo.id}
                      className="p-3 bg-purple-50/40 hover:bg-purple-50 rounded-xl border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded">
                            {promo.code}
                          </span>
                          <span className="font-bold text-slate-800 text-sm">{promo.name}</span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                            {pType === 'COMBO' && '🍱 Combo Especial'}
                            {pType === 'BOGO_2X1' && `🎁 Lleva ${promo.minQuantity || 2} Paga ${promo.payQuantity || 1}`}
                            {pType === 'SECOND_UNIT_DISCOUNT' && `🥈 2da al ${promo.secondUnitDiscountPercent || 70}% OFF`}
                            {pType === 'PERCENTAGE_DISCOUNT' && `🏷️ ${promo.discountPercentage || 10}% OFF`}
                            {pType === 'FIXED_DISCOUNT' && `💵 $${promo.discountAmount || 0} OFF`}
                            {pType === 'BULK_PRICE' && `📦 Mayoreo x${promo.minQuantity || 3} a $${promo.price || 0} c/u`}
                          </span>
                        </div>

                        {promo.description && (
                          <p className="text-xs text-slate-500">{promo.description}</p>
                        )}

                        {isCombo && promo.items && promo.items.length > 0 && (
                          <div className="text-[11px] text-purple-700 font-mono bg-white/80 p-1.5 rounded border border-purple-100">
                            📦 Contiene: {promo.items.map((pi) => `${pi.quantity}x ${pi.productName}`).join(' + ')}
                          </div>
                        )}

                        {isCombo && (
                          <div className="text-[10px] font-semibold text-slate-500">
                            Combos disponibles en stock:{' '}
                            <span className={availableCombos > 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                              {availableCombos} u.
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-right flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-purple-100">
                        <div className="font-mono font-black text-base text-purple-700">
                          {isCombo ? `$${(promo.price || 0).toFixed(2)}` : 'Oferta Automática'}
                        </div>
                        <button
                          onClick={() => handleApplyPromoShortcut(promo)}
                          disabled={isCombo && availableCombos <= 0}
                          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isCombo ? 'Agregar Combo' : 'Agregar al Ticket'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

              {promotions.filter((p) => p.status === 'ACTIVE').length === 0 && (
                <div className="p-6 text-center text-slate-400 text-xs font-medium">
                  No hay promociones activas registradas en el inventario.
                </div>
              )}
            </div>

            <button
              onClick={() => setShowPromosModal(false)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
