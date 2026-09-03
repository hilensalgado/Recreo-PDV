import React, { useState } from 'react';
import {
  X,
  Calendar,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Package,
} from 'lucide-react';
import { Product, ProductBatch } from '../types/pos';
import { formatCurrency } from '../utils/pricingEngine';

interface BatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  preselectedProduct?: Product | null;
  onSaveBatch: (data: Partial<ProductBatch> & { productId: string; expirationDate: string; initialQuantity: number }) => Promise<void>;
}

export const BatchModal: React.FC<BatchModalProps> = ({
  isOpen,
  onClose,
  products = [],
  preselectedProduct,
  onSaveBatch,
}) => {
  const [productId, setProductId] = useState(preselectedProduct?.id || products[0]?.id || '');
  const [batchNumber, setBatchNumber] = useState(() => `LOT-${Date.now().toString().slice(-6)}`);
  const [expirationDate, setExpirationDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });
  const [manufacturingDate, setManufacturingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [initialQuantity, setInitialQuantity] = useState('20');
  const [costPrice, setCostPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (preselectedProduct) {
      setProductId(preselectedProduct.id);
      if (preselectedProduct.costPrice > 0) {
        setCostPrice(preselectedProduct.costPrice.toString());
      }
    }
  }, [preselectedProduct]);

  if (!isOpen) return null;

  const selectedProd = products.find((p) => p.id === productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!productId) {
      setError('Debes seleccionar un producto.');
      return;
    }

    const qty = parseFloat(initialQuantity);
    if (isNaN(qty) || qty <= 0) {
      setError('La cantidad inicial debe ser mayor a 0.');
      return;
    }

    if (!expirationDate) {
      setError('La fecha de vencimiento es obligatoria.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSaveBatch({
        productId,
        productName: selectedProd?.name,
        barcode: selectedProd?.barcode,
        batchNumber: batchNumber.trim() || `LOT-${Date.now().toString().slice(-6)}`,
        expirationDate,
        manufacturingDate: manufacturingDate || undefined,
        initialQuantity: qty,
        currentQuantity: qty,
        costPrice: parseFloat(costPrice) || selectedProd?.costPrice || 0,
        notes: notes.trim() || undefined,
        status: 'ACTIVE',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el lote.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Registrar Nuevo Lote y Vencimiento</h2>
              <p className="text-xs text-slate-400">Control estricto de trazabilidad y fechas de caducidad</p>
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
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Producto Asociado
            </label>
            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                const p = products.find((x) => x.id === e.target.value);
                if (p && p.costPrice > 0) setCostPrice(p.costPrice.toString());
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 font-medium"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.barcode}) - Stock actual: {p.stock} {p.unit}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Batch Number */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Número de Lote / Código
              </label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="Ej: LOTE-2025-08"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                required
              />
            </div>

            {/* Expiration Date */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1 text-rose-600 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Fecha de Vencimiento
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-rose-300 rounded-lg focus:ring-2 focus:ring-rose-500 font-bold bg-rose-50/50"
                required
              />
            </div>

            {/* Manufacturing Date */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Fecha de Fabricación / Envasado
              </label>
              <input
                type="date"
                value={manufacturingDate}
                onChange={(e) => setManufacturingDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Initial Quantity */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Cantidad Ingresada ({selectedProd?.unit || 'u'})
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-bold"
                required
              />
            </div>
          </div>

          {/* Cost Price & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Costo Unitario ($) (Opcional)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="Costo por unidad..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Notas / Ubicación física
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Estante 4B o Heladera 2"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
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
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : 'Guardar Lote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
