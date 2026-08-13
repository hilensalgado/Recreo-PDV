import React, { useState } from 'react';
import {
  Grid,
  X,
  Plus,
  ShoppingBag,
  Snowflake,
  Copy,
  Printer,
  Smartphone,
  Utensils,
  Box,
  DollarSign,
} from 'lucide-react';
import { CommonProduct } from '../types/pos';

interface CommonProductsModalProps {
  commonProducts: CommonProduct[];
  onAddCommonItem: (name: string, price: number) => void;
  onClose: () => void;
}

export const CommonProductsModal: React.FC<CommonProductsModalProps> = ({
  commonProducts,
  onAddCommonItem,
  onClose,
}) => {
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShoppingBag':
        return ShoppingBag;
      case 'Snowflake':
        return Snowflake;
      case 'Copy':
        return Copy;
      case 'Printer':
        return Printer;
      case 'Smartphone':
        return Smartphone;
      case 'Utensils':
        return Utensils;
      case 'Box':
        return Box;
      default:
        return Grid;
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(customPrice);
    if (!customName.trim() || isNaN(p) || p <= 0) return;

    onAddCommonItem(customName.trim(), p);
    setCustomName('');
    setCustomPrice('');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-purple-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid className="w-6 h-6 text-purple-300" />
            <div>
              <h2 className="font-extrabold text-lg text-white leading-none">
                [F2] Productos Comunes y Servicios
              </h2>
              <p className="text-xs text-purple-200 mt-0.5">
                Artículos de venta rápida sin código de barras
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-purple-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Preset Buttons Grid */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">
              Selecciona un producto rápido:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {commonProducts.map((cp) => {
                const IconComp = getIcon(cp.iconName);

                return (
                  <button
                    key={cp.id}
                    onClick={() => {
                      onAddCommonItem(cp.name, cp.price);
                      onClose();
                    }}
                    className="p-3.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 hover:border-purple-400 rounded-xl flex flex-col items-center text-center gap-2 transition-all transform active:scale-95 group shadow-sm"
                  >
                    <div className="p-2 bg-purple-200 group-hover:bg-purple-300 text-purple-800 rounded-lg">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-800 group-hover:text-purple-900">
                        {cp.name}
                      </div>
                      <div className="text-sm font-black text-purple-700 mt-0.5">
                        ${cp.price.toFixed(2)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Non-Barcode Item Form */}
          <div className="border-t border-slate-200 pt-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">
              O ingresa un concepto manual libre:
            </span>
            <form onSubmit={handleAddCustom} className="flex gap-2">
              <input
                type="text"
                placeholder="Nombre del servicio o producto (ej. Copia doble cara)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="flex-2 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Precio"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full pl-6 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
