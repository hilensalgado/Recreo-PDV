import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  Search,
  Receipt,
  User,
  DollarSign,
  PackageCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Printer,
  Plus,
  Minus,
  Trash2,
  Barcode,
  ArrowRight,
  Wallet,
  ShoppingCart,
  Building2,
  Calendar,
} from 'lucide-react';
import {
  Sale,
  Product,
  Customer,
  CashRegister,
  CashShift,
  Cashier,
  SaleReturn,
  ReturnRefundType,
} from '../types/pos';

interface ReturnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  activeRegister: CashRegister | null;
  activeShift: CashShift | null;
  activeCashier: Cashier | null;
  preselectedSale?: Sale | null;
  onProcessReturn: (data: {
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
    refundType: ReturnRefundType;
    reason?: string;
  }) => Promise<SaleReturn>;
  onApplyReturnCreditToCart?: (creditAmount: number, description: string) => void;
}

interface ReturnCartLine {
  productId: string;
  productName: string;
  barcode: string;
  maxQuantity?: number;
  quantity: number;
  unitPrice: number;
  unit?: string;
  selected: boolean;
}

export const ReturnsModal: React.FC<ReturnsModalProps> = ({
  isOpen,
  onClose,
  sales = [],
  products = [],
  customers = [],
  activeRegister,
  activeShift,
  activeCashier,
  preselectedSale,
  onProcessReturn,
  onApplyReturnCreditToCart,
}) => {
  // Navigation Tabs
  const [returnMode, setReturnMode] = useState<'BY_TICKET' | 'DIRECT'>('BY_TICKET');

  // Selected Sale state (for BY_TICKET mode)
  const [ticketSearch, setTicketSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Return items state
  const [returnItems, setReturnItems] = useState<ReturnCartLine[]>([]);

  // Direct Product Search state (for DIRECT mode)
  const [prodSearchQuery, setProdSearchQuery] = useState('');
  const [prodSearchResults, setProdSearchResults] = useState<Product[]>([]);

  // Refund Destination state
  const [refundType, setRefundType] = useState<ReturnRefundType>('CASH');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  // Reason
  const [returnReason, setReturnReason] = useState('Cambio / Devolución de mercadería');

  // Submission & Receipt state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedReturn, setCompletedReturn] = useState<SaleReturn | null>(null);

  const receiptPrintRef = useRef<HTMLDivElement>(null);

  // Initialize with preselected sale if provided
  useEffect(() => {
    if (preselectedSale) {
      handleSelectSale(preselectedSale);
      setReturnMode('BY_TICKET');
    }
  }, [preselectedSale]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (!preselectedSale) {
        setSelectedSale(null);
        setReturnItems([]);
        setTicketSearch('');
      }
      setCompletedReturn(null);
      setErrorMsg(null);
      setRefundType('CASH');
    }
  }, [isOpen, preselectedSale]);

  // Update return items when a sale is selected
  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
    const lines: ReturnCartLine[] = (sale.items || []).map((item) => ({
      productId: item.productId,
      productName: item.product.name,
      barcode: item.product.barcode || '',
      maxQuantity: item.quantity,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      unit: item.product.unit,
      selected: true,
    }));
    setReturnItems(lines);

    // Pre-select customer if sale had one
    if (sale.customerId) {
      const cust = customers.find((c) => c.id === sale.customerId);
      if (cust) {
        setSelectedCustomer(cust);
      }
    }
  };

  // Add a product directly in DIRECT mode
  const handleAddDirectProduct = (product: Product) => {
    const existingIndex = returnItems.findIndex((i) => i.productId === product.id);
    if (existingIndex >= 0) {
      const updated = [...returnItems];
      updated[existingIndex].quantity += 1;
      setReturnItems(updated);
    } else {
      setReturnItems([
        ...returnItems,
        {
          productId: product.id,
          productName: product.name,
          barcode: product.barcode,
          quantity: 1,
          unitPrice: product.salePrice,
          unit: product.unit,
          selected: true,
        },
      ]);
    }
    setProdSearchQuery('');
    setProdSearchResults([]);
  };

  // Filter products for direct mode
  useEffect(() => {
    if (returnMode === 'DIRECT' && prodSearchQuery.trim().length > 0) {
      const q = prodSearchQuery.toLowerCase().trim();
      const filtered = products
        .filter((p) => p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q))
        .slice(0, 8);
      setProdSearchResults(filtered);
    } else {
      setProdSearchResults([]);
    }
  }, [prodSearchQuery, returnMode, products]);

  // Handle quantity changes
  const handleQuantityChange = (index: number, newQty: number) => {
    const updated = [...returnItems];
    const item = updated[index];
    const max = item.maxQuantity !== undefined ? item.maxQuantity : 9999;
    const validatedQty = Math.max(0.001, Math.min(max, newQty));
    item.quantity = Number(validatedQty.toFixed(3));
    setReturnItems(updated);
  };

  // Toggle item selection
  const handleToggleSelect = (index: number) => {
    const updated = [...returnItems];
    updated[index].selected = !updated[index].selected;
    setReturnItems(updated);
  };

  // Remove line from direct mode
  const handleRemoveLine = (index: number) => {
    setReturnItems(returnItems.filter((_, i) => i !== index));
  };

  // Active selected items to return
  const activeSelectedItems = returnItems.filter((i) => i.selected && i.quantity > 0);

  // Calculate total refund amount
  const totalRefundAmount = activeSelectedItems.reduce(
    (acc, item) => acc + item.quantity * item.unitPrice,
    0
  );

  // Filtered sales for BY_TICKET mode
  const filteredSales = sales
    .filter((s) => s.status !== 'CANCELLED')
    .filter((s) => {
      if (!ticketSearch.trim()) return true;
      const q = ticketSearch.toLowerCase().trim();
      return (
        s.ticketNumber.toString().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        s.cashierName.toLowerCase().includes(q)
      );
    })
    .slice(0, 15);

  // Submit return
  const handleSubmitReturn = async () => {
    if (activeSelectedItems.length === 0) {
      setErrorMsg('Selecciona al menos un artículo para realizar la devolución.');
      return;
    }

    if (totalRefundAmount <= 0) {
      setErrorMsg('El monto a devolver debe ser mayor a 0.');
      return;
    }

    if (refundType === 'CUSTOMER_CREDIT' && !selectedCustomer) {
      setErrorMsg('Debes seleccionar un cliente para asignar el saldo a favor.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const payload = {
        saleId: selectedSale?.id,
        ticketNumber: selectedSale?.ticketNumber,
        registerId: activeRegister?.id || 'reg-1',
        shiftId: activeShift?.id,
        cashierId: activeCashier?.id || 'cash-1',
        cashierName: activeCashier?.name || 'Cajero',
        customerId: selectedCustomer?.id,
        items: activeSelectedItems.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          barcode: i.barcode,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          unit: i.unit,
        })),
        refundType,
        reason: returnReason,
      };

      const result = await onProcessReturn(payload);
      setCompletedReturn(result);

      // If user chose to apply credit to current cart in SalesView
      if (refundType === 'CURRENT_CART' && onApplyReturnCreditToCart) {
        onApplyReturnCreditToCart(
          totalRefundAmount,
          `Devolución #${result.returnNumber} (${activeSelectedItems.length} art.)`
        );
      }
    } catch (err: any) {
      console.error('Error procesando devolución:', err);
      setErrorMsg(err.message || 'Error al procesar la devolución.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg flex items-center gap-2">
                Devolución de Mercadería / Reembolso
              </h2>
              <p className="text-xs text-slate-400">
                Reintegro de stock y devolución en efectivo o saldo a favor del cliente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: If completed, show thermal receipt */}
        {completedReturn ? (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 flex flex-col items-center justify-center gap-4">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 w-full max-w-md shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <div className="font-bold text-sm">¡Devolución Procesada con Éxito!</div>
                <div>Los productos han reingresado automáticamente al inventario.</div>
              </div>
            </div>

            {/* Printable Thermal Receipt Card */}
            <div
              ref={receiptPrintRef}
              id="printable-ticket"
              className="printable-receipt bg-white text-slate-900 p-6 rounded-sm shadow-md font-mono text-[11px] w-[320px] border border-slate-300 leading-tight select-text"
            >
              {/* Store Header */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
                <div className="font-black text-sm uppercase tracking-wider">RECREO PDV</div>
                <div className="text-[10px] text-slate-600">COMPROBANTE DE DEVOLUCIÓN</div>
                <div className="font-bold text-xs bg-slate-100 py-0.5 rounded text-slate-800">
                  DEVOLUCIÓN #{completedReturn.returnNumber}
                </div>
              </div>

              {/* Details */}
              <div className="py-2.5 space-y-0.5 border-b border-dashed border-slate-400 text-[10px]">
                {completedReturn.ticketNumber && (
                  <div className="flex justify-between">
                    <span>TICKET ORIGINAL:</span>
                    <span className="font-bold">#{completedReturn.ticketNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>FECHA:</span>
                  <span>{new Date(completedReturn.timestamp).toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between">
                  <span>CAJA:</span>
                  <span>{completedReturn.registerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>CAJERO:</span>
                  <span>{completedReturn.cashierName}</span>
                </div>
                {completedReturn.customerName && (
                  <div className="flex justify-between">
                    <span>CLIENTE:</span>
                    <span className="font-bold">{completedReturn.customerName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>DESTINO:</span>
                  <span className="font-bold text-indigo-700">
                    {completedReturn.refundType === 'CASH'
                      ? 'REEMBOLSO EN EFECTIVO'
                      : completedReturn.refundType === 'CUSTOMER_CREDIT'
                      ? 'SALDO A FAVOR DEL CLIENTE'
                      : 'APLICADO A COMPRA ACTUAL'}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="py-2.5 space-y-1.5 border-b border-dashed border-slate-400">
                <div className="font-bold text-[10px] text-slate-500 uppercase pb-0.5">
                  ARTÍCULOS DEVUELTOS (AL STOCK)
                </div>
                {completedReturn.items.map((it, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-semibold text-slate-800 truncate">{it.productName}</div>
                    <div className="flex justify-between text-slate-600 text-[10px]">
                      <span>
                        {it.quantity} x ${it.unitPrice.toFixed(2)}
                      </span>
                      <span className="font-bold text-slate-900">${it.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Refunded */}
              <div className="pt-3 pb-2 space-y-1">
                <div className="flex justify-between text-xs font-black">
                  <span>TOTAL DEVUELTO:</span>
                  <span>${completedReturn.totalAmount.toFixed(2)}</span>
                </div>
                {completedReturn.reason && (
                  <div className="text-[9px] text-slate-500 italic mt-1">
                    Motivo: {completedReturn.reason}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="text-center pt-3 border-t border-dashed border-slate-400 text-[9px] text-slate-500">
                Firma y Aclaración del Cliente
                <div className="border-b border-slate-300 mt-6 mb-1"></div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full max-w-md">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Imprimir Comprobante
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors cursor-pointer"
              >
                Listo / Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <button
                onClick={() => {
                  setReturnMode('BY_TICKET');
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  returnMode === 'BY_TICKET'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Receipt className="w-4 h-4" /> Devolución por Ticket de Venta
              </button>
              <button
                onClick={() => {
                  setReturnMode('DIRECT');
                  setSelectedSale(null);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  returnMode === 'DIRECT'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Barcode className="w-4 h-4" /> Devolución Directa de Producto (Sin Ticket)
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Mode 1: Search & Select Sale */}
            {returnMode === 'BY_TICKET' && (
              <div className="space-y-3">
                {!selectedSale ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Buscar venta por número de ticket (#1001), cliente o cajero..."
                        value={ticketSearch}
                        onChange={(e) => setTicketSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                        autoFocus
                      />
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="p-2.5">Ticket</th>
                            <th className="p-2.5">Fecha y Hora</th>
                            <th className="p-2.5">Cliente</th>
                            <th className="p-2.5">Cajero / Caja</th>
                            <th className="p-2.5 text-right">Total</th>
                            <th className="p-2.5 text-center">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredSales.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                                No se encontraron ventas con los criterios ingresados.
                              </td>
                            </tr>
                          ) : (
                            filteredSales.map((sale) => (
                              <tr
                                key={sale.id}
                                className="hover:bg-blue-50/60 transition-colors cursor-pointer"
                                onClick={() => handleSelectSale(sale)}
                              >
                                <td className="p-2.5 font-mono font-bold text-blue-700">
                                  #{sale.ticketNumber}
                                </td>
                                <td className="p-2.5 text-slate-600 font-mono">
                                  {new Date(sale.timestamp).toLocaleString('es-AR', {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                  })}
                                </td>
                                <td className="p-2.5 font-medium text-slate-800">
                                  {sale.customerName || (
                                    <span className="text-slate-400 italic">Consumidor Final</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-slate-600 text-[11px]">
                                  {sale.cashierName} ({sale.registerName})
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                  ${sale.total.toFixed(2)}
                                </td>
                                <td className="p-2.5 text-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectSale(sale);
                                    }}
                                    className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                  >
                                    Seleccionar
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* Selected Sale Banner & Items Selector */
                  <div className="space-y-3">
                    <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-800 rounded-lg font-mono font-black text-sm">
                          #{selectedSale.ticketNumber}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                            <span>Venta Original</span>
                            <span className="text-slate-500 font-normal">
                              ({new Date(selectedSale.timestamp).toLocaleString('es-AR')})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600">
                            Cliente:{' '}
                            <span className="font-semibold">
                              {selectedSale.customerName || 'Consumidor Final'}
                            </span>{' '}
                            | Total: ${selectedSale.total.toFixed(2)} | Pago:{' '}
                            <span className="font-semibold">{selectedSale.paymentMethod}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedSale(null)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                      >
                        Cambiar Ticket
                      </button>
                    </div>

                    <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Selecciona los artículos y cantidades a devolver:</span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        ({activeSelectedItems.length} seleccionados)
                      </span>
                    </div>

                    {/* Return Items Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5 w-8 text-center"></th>
                            <th className="p-2.5">Producto</th>
                            <th className="p-2.5 text-center">Cant. Vendida</th>
                            <th className="p-2.5 text-center">Cant. a Devolver</th>
                            <th className="p-2.5 text-right">Precio Unit.</th>
                            <th className="p-2.5 text-right">Subtotal Reembolso</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {returnItems.map((item, idx) => (
                            <tr
                              key={`${item.productId}-${idx}`}
                              className={`transition-colors ${
                                item.selected ? 'bg-rose-50/30' : 'bg-slate-50/50 opacity-60'
                              }`}
                            >
                              <td className="p-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() => handleToggleSelect(idx)}
                                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                                />
                              </td>
                              <td className="p-2.5">
                                <div className="font-bold text-slate-800">{item.productName}</div>
                                {item.barcode && (
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    {item.barcode}
                                  </div>
                                )}
                              </td>
                              <td className="p-2.5 text-center font-mono font-semibold text-slate-600">
                                {item.maxQuantity} {item.unit || 'pza'}
                              </td>
                              <td className="p-2.5">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() =>
                                      handleQuantityChange(
                                        idx,
                                        item.quantity - (item.unit === 'kg' ? 0.1 : 1)
                                      )
                                    }
                                    disabled={!item.selected || item.quantity <= 0.001}
                                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 cursor-pointer text-slate-700"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="number"
                                    step={item.unit === 'kg' ? '0.001' : '1'}
                                    min="0"
                                    max={item.maxQuantity}
                                    value={item.quantity}
                                    disabled={!item.selected}
                                    onChange={(e) =>
                                      handleQuantityChange(idx, parseFloat(e.target.value) || 0)
                                    }
                                    className="w-14 text-center font-mono font-bold text-slate-900 border border-slate-300 rounded px-1 py-0.5 text-xs bg-white focus:outline-none focus:border-rose-500 disabled:bg-slate-100"
                                  />
                                  <button
                                    onClick={() =>
                                      handleQuantityChange(
                                        idx,
                                        item.quantity + (item.unit === 'kg' ? 0.1 : 1)
                                      )
                                    }
                                    disabled={
                                      !item.selected ||
                                      (item.maxQuantity !== undefined &&
                                        item.quantity >= item.maxQuantity)
                                    }
                                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 cursor-pointer text-slate-700"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                              <td className="p-2.5 text-right font-mono text-slate-700">
                                ${item.unitPrice.toFixed(2)}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-rose-700">
                                ${item.selected ? (item.quantity * item.unitPrice).toFixed(2) : '0.00'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Direct Product Return */}
            {returnMode === 'DIRECT' && (
              <div className="space-y-3">
                <div className="relative">
                  <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar producto por nombre o escanear código de barras para devolver..."
                    value={prodSearchQuery}
                    onChange={(e) => setProdSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                    autoFocus
                  />
                  {prodSearchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {prodSearchResults.map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => handleAddDirectProduct(prod)}
                          className="p-2.5 hover:bg-blue-50 flex items-center justify-between cursor-pointer text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-800">{prod.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {prod.barcode} | Stock actual: {prod.stock} {prod.unit}
                            </div>
                          </div>
                          <span className="font-mono font-bold text-blue-700">
                            ${prod.salePrice.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Direct Items List */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Producto</th>
                        <th className="p-2.5 text-center">Cantidad</th>
                        <th className="p-2.5 text-right">Precio Reembolso</th>
                        <th className="p-2.5 text-right">Subtotal</th>
                        <th className="p-2.5 text-center">Quitar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {returnItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                            Usa el buscador superior para agregar productos a la lista de devolución.
                          </td>
                        </tr>
                      ) : (
                        returnItems.map((item, idx) => (
                          <tr key={`${item.productId}-${idx}`} className="hover:bg-slate-50">
                            <td className="p-2.5">
                              <div className="font-bold text-slate-800">{item.productName}</div>
                              {item.barcode && (
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {item.barcode}
                                </div>
                              )}
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() =>
                                    handleQuantityChange(
                                      idx,
                                      item.quantity - (item.unit === 'kg' ? 0.1 : 1)
                                    )
                                  }
                                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 cursor-pointer text-slate-700"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  step={item.unit === 'kg' ? '0.001' : '1'}
                                  min="0.001"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleQuantityChange(idx, parseFloat(e.target.value) || 0)
                                  }
                                  className="w-14 text-center font-mono font-bold text-slate-900 border border-slate-300 rounded px-1 py-0.5 text-xs bg-white focus:outline-none focus:border-rose-500"
                                />
                                <button
                                  onClick={() =>
                                    handleQuantityChange(
                                      idx,
                                      item.quantity + (item.unit === 'kg' ? 0.1 : 1)
                                    )
                                  }
                                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 cursor-pointer text-slate-700"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-700">
                              ${item.unitPrice.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-rose-700">
                              ${(item.quantity * item.unitPrice).toFixed(2)}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => handleRemoveLine(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Refund Total & Destination Section */}
            {activeSelectedItems.length > 0 && (
              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-4 shadow-md">
                {/* Total Display */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Total a Reembolsar ({activeSelectedItems.length} art.)
                    </span>
                    <span className="text-[11px] text-emerald-400">
                      Stock será reintegrado automáticamente
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-mono font-black text-rose-400">
                      ${totalRefundAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Refund Method Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    ¿Qué hacer con el monto de la devolución?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Option 1: Cash Refund */}
                    <div
                      onClick={() => setRefundType('CASH')}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        refundType === 'CASH'
                          ? 'bg-rose-500/20 border-rose-400 text-white shadow-sm'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-bold text-xs">Devolver el Dinero</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Reembolso en efectivo. Se registra un egreso en la caja registradora activa.
                      </p>
                    </div>

                    {/* Option 2: Customer Credit */}
                    <div
                      onClick={() => setRefundType('CUSTOMER_CREDIT')}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        refundType === 'CUSTOMER_CREDIT'
                          ? 'bg-indigo-500/20 border-indigo-400 text-white shadow-sm'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Wallet className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="font-bold text-xs">Saldo a Favor Cliente</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Acredita el dinero en la cuenta del cliente para futuras compras o descuento de deuda.
                      </p>
                    </div>

                    {/* Option 3: Apply to current cart */}
                    <div
                      onClick={() => setRefundType('CURRENT_CART')}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        refundType === 'CURRENT_CART'
                          ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <ShoppingCart className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="font-bold text-xs">Cambio / Venta Actual</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Aplica el crédito inmediatamente al carrito actual de ventas para llevarse otros productos.
                      </p>
                    </div>
                  </div>
                </div>

                {/* If Customer Credit selected: Customer Selector */}
                {refundType === 'CUSTOMER_CREDIT' && (
                  <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-400" /> Cliente Destinatario del Saldo:
                      </span>
                      {selectedCustomer && (
                        <button
                          onClick={() => setShowCustomerPicker(true)}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                        >
                          Cambiar Cliente
                        </button>
                      )}
                    </div>

                    {selectedCustomer ? (
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-700 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-white">{selectedCustomer.name}</div>
                          <div className="text-[10px] text-slate-400">
                            Deuda actual: ${selectedCustomer.creditBalance.toFixed(2)} | Límite: $
                            {selectedCustomer.creditLimit.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-400 block font-semibold">
                            Nuevo Saldo Proyectado:
                          </span>
                          <span className="font-mono font-bold text-white">
                            ${(selectedCustomer.creditBalance - totalRefundAmount).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            placeholder="Buscar cliente por nombre o teléfono..."
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="max-h-32 overflow-y-auto divide-y divide-slate-700 border border-slate-700 rounded-lg bg-slate-900">
                          {customers
                            .filter((c) =>
                              c.name.toLowerCase().includes(customerSearch.toLowerCase().trim())
                            )
                            .map((cust) => (
                              <div
                                key={cust.id}
                                onClick={() => setSelectedCustomer(cust)}
                                className="p-2 hover:bg-slate-800 flex items-center justify-between text-xs cursor-pointer"
                              >
                                <span className="font-semibold text-white">{cust.name}</span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  Saldo: ${cust.creditBalance.toFixed(2)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Reason input */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Motivo de la Devolución:
                  </label>
                  <input
                    type="text"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Ej: Cambio de talle, producto defectuoso, error en cobro..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        {!completedReturn && (
          <div className="p-3 sm:p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              onClick={handleSubmitReturn}
              disabled={isSubmitting || activeSelectedItems.length === 0}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs sm:text-sm font-black shadow-md transition-all flex items-center gap-2 cursor-pointer uppercase font-mono"
            >
              <RotateCcw className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>
                {isSubmitting
                  ? 'Procesando...'
                  : `PROCESAR DEVOLUCIÓN (${
                      totalRefundAmount > 0 ? `$${totalRefundAmount.toFixed(2)}` : '$0.00'
                    })`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
