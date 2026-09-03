import React, { useState } from 'react';
import {
  X,
  ArrowRightLeft,
  Search,
  Plus,
  Trash2,
  Package,
  Building2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Product, Warehouse, ProductBatch } from '../types/pos';
import { formatCurrency } from '../utils/pricingEngine';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  warehouses: Warehouse[];
  batches?: ProductBatch[];
  currentUserName?: string;
  onTransferCreated: (data: {
    originWarehouseId: string;
    destWarehouseId: string;
    items: { productId: string; quantity: number; batchId?: string; batchNumber?: string }[];
    notes?: string;
    responsibleName?: string;
  }) => Promise<void>;
}

interface TransferItemRow {
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  availableStock: number;
  batchId?: string;
  batchNumber?: string;
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({
  isOpen,
  onClose,
  products = [],
  warehouses = [],
  batches = [],
  currentUserName = 'Administrador',
  onTransferCreated,
}) => {
  const [originWarehouseId, setOriginWarehouseId] = useState<string>(
    warehouses[0]?.id || 'wh-central'
  );
  const [destWarehouseId, setDestWarehouseId] = useState<string>(
    warehouses[1]?.id || warehouses[0]?.id || 'wh-salon'
  );
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<TransferItemRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const originWh = warehouses.find((w) => w.id === originWarehouseId);
  const destWh = warehouses.find((w) => w.id === destWarehouseId);

  // Search filtered products
  const searchResults = searchTerm.trim()
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.barcode.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, 8)
    : [];

  const handleAddItem = (prod: Product) => {
    // Check if origin warehouse has specific stock or use total product stock
    const whStock = prod.warehouseStock?.[originWarehouseId] ?? prod.stock;
    
    // Check available batches for this product if any
    const prodBatches = batches.filter((b) => b.productId === prod.id && b.status === 'ACTIVE' && b.currentQuantity > 0);
    const defaultBatch = prodBatches[0];

    const exists = items.find((it) => it.productId === prod.id && it.batchId === (defaultBatch?.id || undefined));
    if (exists) {
      setItems((prev) =>
        prev.map((it) =>
          it === exists ? { ...it, quantity: Math.min(it.availableStock, it.quantity + 1) } : it
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          barcode: prod.barcode,
          quantity: 1,
          availableStock: whStock,
          batchId: defaultBatch?.id,
          batchNumber: defaultBatch?.batchNumber,
        },
      ]);
    }
    setSearchTerm('');
  };

  const handleUpdateQty = (index: number, qty: number) => {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx === index) {
          const validated = Math.max(0.01, Math.min(it.availableStock > 0 ? it.availableStock : 99999, qty));
          return { ...it, quantity: validated };
        }
        return it;
      })
    );
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (originWarehouseId === destWarehouseId) {
      setError('El depósito de origen y destino no pueden ser el mismo.');
      return;
    }

    if (items.length === 0) {
      setError('Debes agregar al menos un producto a transferir.');
      return;
    }

    // Check invalid quantities
    for (const it of items) {
      if (it.quantity <= 0) {
        setError(`La cantidad a transferir de "${it.productName}" debe ser mayor a cero.`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await onTransferCreated({
        originWarehouseId,
        destWarehouseId,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          batchId: it.batchId,
          batchNumber: it.batchNumber,
        })),
        notes,
        responsibleName: currentUserName,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al procesar la transferencia de stock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Transferencia de Stock entre Depósitos / Sucursales</h2>
              <p className="text-xs text-slate-400">
                Mueve inventario entre Depósito Central, Salón de Ventas o Sucursales
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Warehouses selector (Origin -> Destination) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" /> Depósito de Origen (Sale stock)
              </label>
              <select
                value={originWarehouseId}
                onChange={(e) => setOriginWarehouseId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code}) {w.isMain ? '★ Principal' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Depósito de Destino (Ingresa stock)
              </label>
              <select
                value={destWarehouseId}
                onChange={(e) => setDestWarehouseId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id} disabled={w.id === originWarehouseId}>
                    {w.name} ({w.code}) {w.id === originWarehouseId ? '(Origen seleccionado)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Product search to add items */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Agregar Productos a la Transferencia
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Escribe el nombre o código de barras del producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((p) => {
                    const avail = p.warehouseStock?.[originWarehouseId] ?? p.stock;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddItem(p)}
                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{p.name}</span>
                          <span className="text-[11px] text-slate-500 block font-mono">{p.barcode}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-slate-700">Stock Origen: {avail} {p.unit}</span>
                          <span className="text-[11px] text-blue-600 block font-bold">+ Agregar</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Table of items to transfer */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 flex justify-between">
              <span>Productos a Transferir ({items.length})</span>
              <span>Cantidad</span>
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
              {items.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Package className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                  No hay productos en esta transferencia. Usa el buscador arriba.
                </div>
              ) : (
                items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 truncate">{item.productName}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {item.barcode} {item.batchNumber ? `| Lote: ${item.batchNumber}` : ''} &bull; Disp. Origen: {item.availableStock}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleUpdateQty(idx, parseFloat(e.target.value) || 0)}
                        className="w-20 px-2.5 py-1.5 text-center text-sm font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notes & Responsible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Responsable del Traslado
              </label>
              <input
                type="text"
                value={currentUserName}
                disabled
                className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-100 rounded-lg text-slate-600 font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Observaciones / Motivo
              </label>
              <input
                type="text"
                placeholder="Ej: Reposición para salón de ventas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4" />
              {isSubmitting ? 'Procesando...' : 'Confirmar Transferencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
