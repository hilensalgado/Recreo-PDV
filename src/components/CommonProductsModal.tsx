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
  Edit,
  Trash2,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { CommonProduct } from '../types/pos';

interface CommonProductsModalProps {
  commonProducts: CommonProduct[];
  isAdmin?: boolean;
  onAddCommonItem: (name: string, price: number) => void;
  onSaveCommonProduct?: (cp: Partial<CommonProduct> & { name: string; price: number }) => void;
  onDeleteCommonProduct?: (id: string) => void;
  onClose: () => void;
}

export const CommonProductsModal: React.FC<CommonProductsModalProps> = ({
  commonProducts,
  isAdmin = false,
  onAddCommonItem,
  onSaveCommonProduct,
  onDeleteCommonProduct,
  onClose,
}) => {
  // Free custom concept state
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  // Admin New / Edit Preset Modal State
  const [showAdminPresetModal, setShowAdminPresetModal] = useState(false);
  const [editPresetId, setEditPresetId] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');
  const [presetPrice, setPresetPrice] = useState('');
  const [presetIcon, setPresetIcon] = useState('Grid');

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

  const handleOpenAddPreset = () => {
    setEditPresetId(null);
    setPresetName('');
    setPresetPrice('');
    setPresetIcon('Grid');
    setShowAdminPresetModal(true);
  };

  const handleOpenEditPreset = (e: React.MouseEvent, cp: CommonProduct) => {
    e.stopPropagation();
    setEditPresetId(cp.id);
    setPresetName(cp.name);
    setPresetPrice(cp.price.toString());
    setPresetIcon(cp.iconName || 'Grid');
    setShowAdminPresetModal(true);
  };

  const handleDeletePreset = (e: React.MouseEvent, cp: CommonProduct) => {
    e.stopPropagation();
    if (confirm(`¿Seguro que deseas eliminar el producto común predeterminado "${cp.name}"?`)) {
      if (onDeleteCommonProduct) {
        onDeleteCommonProduct(cp.id);
      }
    }
  };

  const handleSavePresetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(presetPrice);
    if (!presetName.trim() || isNaN(p) || p <= 0) return;

    if (onSaveCommonProduct) {
      onSaveCommonProduct({
        id: editPresetId || undefined,
        name: presetName.trim(),
        price: p,
        iconName: presetIcon,
      });
    }

    setShowAdminPresetModal(false);
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

          <div className="flex items-center gap-3">
            {isAdmin ? (
              <button
                onClick={handleOpenAddPreset}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center gap-1 border border-purple-400"
              >
                <Plus className="w-3.5 h-3.5" /> Nuevo Predeterminado
              </button>
            ) : (
              <span className="text-[10px] bg-purple-800 text-purple-200 px-2 py-1 rounded font-semibold flex items-center gap-1 border border-purple-700">
                <Lock className="w-3 h-3 text-purple-300" /> Edición restringida a Administrador
              </span>
            )}

            <button onClick={onClose} className="text-purple-200 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Preset Buttons Grid */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Selecciona un producto rápido predeterminado:
              </span>
              {isAdmin && (
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  Modo Administrador Activo
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {commonProducts.map((cp) => {
                const IconComp = getIcon(cp.iconName);

                return (
                  <div
                    key={cp.id}
                    onClick={() => {
                      onAddCommonItem(cp.name, cp.price);
                      onClose();
                    }}
                    className="relative p-3.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 hover:border-purple-400 rounded-xl flex flex-col items-center text-center gap-2 transition-all transform active:scale-95 group shadow-sm cursor-pointer"
                  >
                    {/* Admin Action Overlay Buttons */}
                    {isAdmin && (
                      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditPreset(e, cp)}
                          className="p-1 bg-white hover:bg-slate-100 text-slate-700 rounded shadow-xs border border-slate-300"
                          title="Editar producto común"
                        >
                          <Edit className="w-3 h-3 text-indigo-600" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeletePreset(e, cp)}
                          className="p-1 bg-white hover:bg-rose-50 text-rose-600 rounded shadow-xs border border-slate-300"
                          title="Eliminar producto común"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

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
                  </div>
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
                placeholder="Nombre del servicio o producto libre (ej. Copia doble cara)"
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

      {/* ADMIN PRESET MODAL: Add / Edit Common Product Preset */}
      {showAdminPresetModal && isAdmin && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-purple-700">
                <Grid className="w-6 h-6" />
                <h3 className="font-extrabold text-base text-slate-900">
                  {editPresetId ? 'Editar Producto Común Predeterminado' : 'Nuevo Producto Común Predeterminado'}
                </h3>
              </div>
              <button onClick={() => setShowAdminPresetModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePresetSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre del Producto / Servicio *:</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Bolsa Ecológica Chica"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Precio de Venta ($) *:</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  placeholder="15.00"
                  value={presetPrice}
                  onChange={(e) => setPresetPrice(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-black text-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ícono Representativo:</label>
                <select
                  value={presetIcon}
                  onChange={(e) => setPresetIcon(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
                >
                  <option value="Grid">Cuadrícula (Predeterminado)</option>
                  <option value="ShoppingBag">Bolsa de Compras</option>
                  <option value="Snowflake">Hielo / Refrigerado</option>
                  <option value="Copy">Copia / Impresión</option>
                  <option value="Printer">Impresora / Documentos</option>
                  <option value="Smartphone">Recarga Celular</option>
                  <option value="Utensils">Comida / Snacks</option>
                  <option value="Box">Caja / Empaque</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminPresetModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow"
                >
                  {editPresetId ? 'Guardar Cambios' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
