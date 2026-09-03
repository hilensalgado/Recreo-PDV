import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Trash2,
  Package,
} from 'lucide-react';
import { ProductBatch } from '../types/pos';

interface DiscardBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: ProductBatch | null;
  currentUserName?: string;
  onDiscard: (batchId: string, reason: string, userName?: string) => Promise<void>;
}

export const DiscardBatchModal: React.FC<DiscardBatchModalProps> = ({
  isOpen,
  onClose,
  batch,
  currentUserName = 'Administrador',
  onDiscard,
}) => {
  const [reason, setReason] = useState('Producto Vencido / Caducado');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !batch) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalReason = reason === 'OTRO' ? customReason.trim() : reason;
    if (!finalReason) {
      setError('Debes especificar un motivo para la baja / merma.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onDiscard(batch.id, finalReason, currentUserName);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al dar de baja el lote.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-rose-950 text-white px-5 py-4 flex items-center justify-between border-b border-rose-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-600 rounded-lg text-white">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Baja de Lote / Merma</h2>
              <p className="text-xs text-rose-300">Descartar unidades del inventario activo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-rose-300 hover:text-white hover:bg-rose-900 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Batch Info Summary */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
            <div className="flex justify-between font-semibold text-slate-800">
              <span>Producto:</span>
              <span className="text-slate-900 font-bold">{batch.productName}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Lote:</span>
              <span className="font-mono font-bold text-slate-800">{batch.batchNumber}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Vencimiento:</span>
              <span className="text-rose-600 font-bold">{batch.expirationDate}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Cantidad a dar de baja:</span>
              <span className="font-black text-rose-600 text-sm">{batch.currentQuantity} unidades</span>
            </div>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Motivo de la Baja / Merma
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-rose-500 font-medium"
            >
              <option value="Producto Vencido / Caducado">Producto Vencido / Caducado</option>
              <option value="Deterioro / Daño en Embalaje">Deterioro / Daño en Embalaje</option>
              <option value="Rotura en Manipulación">Rotura en Manipulación</option>
              <option value="Pérdida de Cadena de Frío">Pérdida de Cadena de Frío</option>
              <option value="Control de Calidad / Decomiso">Control de Calidad / Decomiso</option>
              <option value="OTRO">Otro motivo específico...</option>
            </select>
          </div>

          {reason === 'OTRO' && (
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Especificar Motivo
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Escribe el motivo detallado..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>
          )}

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
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              {isSubmitting ? 'Procesando...' : 'Confirmar Baja y Descontar Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
