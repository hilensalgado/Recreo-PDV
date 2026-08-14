import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { Product, CartItem, Customer, CommonProduct, HoldTicket } from '../types/pos';

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
  onOpenCheckout: (
    items: CartItem[],
    total: number,
    customer?: Customer,
    onSaleSuccess?: () => void
  ) => void;
  onOpenCommonProducts: (addCommonItem: (name: string, price: number) => void) => void;
  onOpenMovements: () => void;
  onOpenHoldTickets: (
    items: CartItem[],
    customer?: Customer,
    restoreHoldTicket?: (ticket: HoldTicket) => void
  ) => void;
  activeRegisterName: string;
}

export const SalesView: React.FC<SalesViewProps> = ({
  products = [],
  customers = [],
  commonProducts = [],
  onOpenCheckout,
  onOpenCommonProducts,
  onOpenMovements,
  onOpenHoldTickets,
  activeRegisterName,
}) => {
  // Multi-Ticket Drafts State
  const [tickets, setTickets] = useState<DraftTicket[]>([
    { id: 't-1', name: 'Ticket 1', items: [] },
  ]);
  const [activeTicketId, setActiveTicketId] = useState<string>('t-1');

  // Active Draft Cart shortcuts
  const activeTicket = tickets.find((t) => t.id === activeTicketId) || tickets[0];
  const cartItems = activeTicket.items;
  const selectedCustomer = activeTicket.customer;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Weight Modal State
  const [weightedProduct, setWeightedProduct] = useState<Product | null>(null);
  const [inputWeight, setInputWeight] = useState<string>('1.000');

  // Customer Modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  // Discount/Price Modal
  const [editingItem, setEditingItem] = useState<{ index: number; item: CartItem } | null>(null);
  const [editUnitPrice, setEditUnitPrice] = useState<string>('');
  const [editDiscountPercent, setEditDiscountPercent] = useState<string>('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto focus search input on mount and whenever search modal closes
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Filter products as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const q = searchQuery.toLowerCase().trim();
    const matches = (products || []).filter(
      (p) =>
        p.barcode.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.departmentName && p.departmentName.toLowerCase().includes(q))
    );
    setSearchResults(matches.slice(0, 10));
    setShowDropdown(matches.length > 0);
  }, [searchQuery, products]);

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

  // Add Product to Cart
  const handleAddProductToCart = (product: Product, quantityToAdd: number = 1) => {
    if (product.unit === 'kg' && quantityToAdd === 1) {
      setWeightedProduct(product);
      setInputWeight('1.000');
      setShowDropdown(false);
      setSearchQuery('');
      return;
    }

    const existingIndex = cartItems.findIndex((item) => item.productId === product.id);
    let newItems = [...cartItems];

    if (existingIndex >= 0) {
      const current = newItems[existingIndex];
      const newQty = current.quantity + quantityToAdd;
      const isWholesale = newQty >= product.wholesaleMinQty && product.wholesalePrice > 0;
      const unitPrice = isWholesale ? product.wholesalePrice : product.salePrice;
      const subtotal = unitPrice * newQty;
      const discountAmount = (subtotal * current.discountPercentage) / 100;

      newItems[existingIndex] = {
        ...current,
        quantity: newQty,
        unitPrice,
        isWholesaleApplied: isWholesale,
        subtotal,
        total: subtotal - discountAmount,
      };
    } else {
      const isWholesale = quantityToAdd >= product.wholesaleMinQty && product.wholesalePrice > 0;
      const unitPrice = isWholesale ? product.wholesalePrice : product.salePrice;
      const subtotal = unitPrice * quantityToAdd;

      newItems.push({
        productId: product.id,
        product,
        quantity: quantityToAdd,
        unitPrice,
        isWholesaleApplied: isWholesale,
        discountPercentage: 0,
        subtotal,
        total: subtotal,
      });
    }

    updateActiveCart(newItems);
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

  const handleAddCommonItem = (name: string, price: number) => {
    const customProduct: Product = {
      id: `cp-${Date.now()}`,
      barcode: 'VARIO',
      name,
      departmentId: 'dep-8',
      departmentName: 'Servicios y Varios',
      costPrice: 0,
      salePrice: price,
      wholesalePrice: price,
      wholesaleMinQty: 99,
      stock: 999,
      minStock: 0,
      unit: 'piece',
      updatedAt: new Date().toISOString(),
    };

    handleAddProductToCart(customProduct, 1);
  };

  const handleRestoreHoldTicket = (holdTicket: HoldTicket) => {
    updateActiveCart(holdTicket.items || []);
  };

  // Barcode Submit (press Enter)
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const exactMatch = products.find(
      (p) => p.barcode.toLowerCase() === searchQuery.toLowerCase().trim()
    );

    if (exactMatch) {
      handleAddProductToCart(exactMatch, 1);
    } else if (searchResults.length > 0) {
      handleAddProductToCart(searchResults[0], 1);
    } else {
      alert(`Producto con código o nombre "${searchQuery}" no encontrado`);
    }
  };

  // Scanner Simulator (Pick a random item to simulate USB barcode scanner reading)
  const handleSimulateScanner = () => {
    if (products.length === 0) return;
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    handleAddProductToCart(randomProduct, randomProduct.unit === 'kg' ? 0.75 : 1);
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

    const isWholesale = newQty >= product.wholesaleMinQty && product.wholesalePrice > 0;
    const unitPrice = isWholesale ? product.wholesalePrice : item.unitPrice;
    const subtotal = unitPrice * newQty;
    const discountAmount = (subtotal * item.discountPercentage) / 100;

    newItems[index] = {
      ...item,
      quantity: Number(newQty.toFixed(3)),
      unitPrice,
      isWholesaleApplied: isWholesale,
      subtotal,
      total: subtotal - discountAmount,
    };

    updateActiveCart(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = cartItems.filter((_, i) => i !== index);
    updateActiveCart(newItems);
  };

  // Totals
  const subtotalSum = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
  const totalSum = cartItems.reduce((acc, item) => acc + item.total, 0);
  const discountSum = subtotalSum - totalSum;
  const itemCount = cartItems.reduce((acc, item) => acc + (item.product.unit === 'kg' ? 1 : item.quantity), 0);

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
    <div className="flex flex-col h-[calc(100vh-110px)] w-full p-2 gap-2 select-none">
      {/* Top Header: Multi-Ticket Tabs & Search Bar */}
      <div className="bg-white p-2.5 rounded-sm border border-slate-300 shadow-2xs flex flex-col gap-2">
        {/* Ticket Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            Ventas Activas:
          </span>
          {tickets.map((t) => {
            const isActive = t.id === activeTicketId;
            const tTotal = t.items.reduce((acc, i) => acc + i.total, 0);

            return (
              <div
                key={t.id}
                onClick={() => setActiveTicketId(t.id)}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-sm text-xs font-bold cursor-pointer transition-all ${
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
                    className="hover:text-rose-300 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={handleAddTicket}
            className="flex items-center gap-1 px-2 py-1 rounded-sm bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" /> Nuevo Ticket
          </button>
        </div>

        {/* Barcode & Search Input Bar */}
        <div className="flex gap-2 relative">
          <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
            <div className="relative flex items-center">
              <Barcode className="w-5 h-5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Escanea el código de barras o busca por nombre de producto (F10)..."
                className="w-full pl-10 pr-24 py-2 bg-slate-50 border border-slate-300 rounded-sm text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setShowDropdown(false);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-24 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                  title="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xs shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" /> AGREGAR
              </button>
            </div>

            {/* Live Search Suggestions Dropdown */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-sm shadow-xl max-h-80 overflow-y-auto z-50 divide-y divide-slate-100">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddProductToCart(p, 1)}
                    className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-blue-50 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
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
                      <div className="font-mono font-bold text-sm text-blue-600">
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
            className="flex items-center gap-1 px-2.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-sm shadow-2xs transition-colors cursor-pointer"
          >
            <Scan className="w-4 h-4" />
            <span className="hidden md:inline">Escáner</span>
          </button>
        </div>
      </div>

      {/* Center Grid: Cart Table & Summary Box */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-2 min-h-0">
        {/* Main Cart Table (3 Cols) */}
        <div className="lg:col-span-3 bg-white rounded-sm border border-slate-300 shadow-2xs flex flex-col overflow-hidden">
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
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 px-2 py-0.5 rounded-xs text-xs font-bold">
                <User className="w-3.5 h-3.5" />
                <span>Cliente: {selectedCustomer.name}</span>
                <button
                  onClick={() => updateActiveCart(cartItems, undefined)}
                  className="hover:text-rose-600 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto p-0.5 divide-y divide-slate-100">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <Barcode className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
                <p className="font-bold text-slate-600 text-sm">Ticket sin artículos</p>
                <p className="text-xs max-w-sm mt-1 text-slate-400">
                  Escanea con tu lector de código de barras o escribe el nombre del producto arriba.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
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
                  {cartItems.map((item, idx) => (
                    <tr
                      key={`${item.productId}-${idx}`}
                      className="hover:bg-blue-50/50 transition-colors"
                    >
                      <td className="p-2 font-mono text-slate-600 font-semibold">{item.product.barcode}</td>
                      <td className="p-2 font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span>{item.product.name}</span>
                          {item.isWholesaleApplied && (
                            <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1 py-0.2 rounded border border-amber-300">
                              MAYOREO
                            </span>
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
                            className="p-1 rounded-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
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
                            className="p-1 rounded-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="p-2 text-right font-mono font-semibold text-slate-700">
                        ${item.unitPrice.toFixed(2)}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-sm text-blue-700">
                        ${item.total.toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Eliminar artículo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Total & Payment Display (1 Col) - High Density Design */}
        <div className="bg-[#1e293b] text-white rounded-sm border border-slate-800 shadow-md p-3.5 flex flex-col justify-between">
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
            <div className="bg-slate-950 p-3.5 rounded-sm border border-slate-800 my-3 text-right shadow-inner">
              <span className="text-4xl xl:text-5xl font-mono font-bold text-[#4ade80] tracking-tight block">
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
              {discountSum > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Descuentos:</span>
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

          {/* Action Checkout Button */}
          <div className="mt-4 space-y-2">
            <button
              id="btn-main-checkout"
              onClick={() => {
                if (cartItems.length === 0) {
                  alert('Agrega al menos un artículo para cobrar');
                  return;
                }
                onOpenCheckout(cartItems, totalSum, selectedCustomer, () => {
                  updateActiveCart([], undefined);
                });
              }}
              disabled={cartItems.length === 0}
              className="w-full py-3.5 bg-[#16a34a] hover:bg-[#15803d] disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-base rounded-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <DollarSign className="w-5 h-5 stroke-[2.5]" />
              <span>COBRAR</span>
            </button>

            <button
              onClick={() => setShowCustomerModal(true)}
              className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>{selectedCustomer ? `Cliente: ${selectedCustomer.name}` : '[F7] Asignar Cliente / Crédito'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Shortcuts Quick Bar */}
      <div className="bg-white p-1.5 rounded-sm border border-slate-300 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => onOpenCommonProducts(handleAddCommonItem)}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-sm border border-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Grid className="w-3.5 h-3.5 text-purple-600" /> [F2] Prod. Comunes
          </button>
          <button
            onClick={onOpenMovements}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-sm border border-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ArrowDownUp className="w-3.5 h-3.5 text-amber-600" /> [F3] Entradas/Salidas
          </button>
          <button
            onClick={() => onOpenHoldTickets(cartItems, selectedCustomer, handleRestoreHoldTicket)}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-sm border border-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-600" /> [F6] Poner en Espera
          </button>
          <button
            onClick={() => setShowCustomerModal(true)}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-sm border border-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-indigo-600" /> [F7] Crédito
          </button>
        </div>

        <div className="text-slate-500 font-medium text-[11px] hidden sm:block font-mono">
          [F12] Cobrar venta | [F10] Buscar producto
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

            <input
              type="text"
              placeholder="Buscar cliente por nombre o teléfono..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border rounded-lg">
              {customers
                .filter(
                  (c) =>
                    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                    c.phone.includes(customerSearch)
                )
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      updateActiveCart(cartItems, c);
                      setShowCustomerModal(false);
                    }}
                    className="w-full p-3 text-left hover:bg-indigo-50 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{c.name}</div>
                      <div className="text-xs text-slate-400">{c.phone} - {c.address || 'Sin dirección'}</div>
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
    </div>
  );
};
