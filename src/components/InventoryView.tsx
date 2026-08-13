import React, { useState } from 'react';
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  Edit,
  Trash2,
  ArrowDownUp,
  Scale,
  X,
  Check,
  Download,
  Filter,
} from 'lucide-react';
import { Product, Department } from '../types/pos';
import { exportInventoryCSV } from '../utils/exportUtils';
import { ImportProductsModal } from './ImportProductsModal';
import { FileSpreadsheet, Lock } from 'lucide-react';

interface InventoryViewProps {
  products: Product[];
  departments: Department[];
  isAdmin?: boolean;
  onSaveProduct: (prod: Partial<Product> & { barcode: string; name: string }) => void;
  onImportProducts?: (items: any[]) => Promise<any>;
  onDeleteProduct: (id: string) => void;
  onAdjustStock: (productId: string, delta: number, reason: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products = [],
  departments = [],
  isAdmin = false,
  onSaveProduct,
  onImportProducts,
  onDeleteProduct,
  onAdjustStock,
}) => {
  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center select-none">
        <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-md space-y-4">
          <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-200">
            <Lock className="w-10 h-10" />
          </div>
          <h2 className="font-extrabold text-2xl text-slate-800">
            Acceso Denegado - Solo Administradores
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto font-medium">
            El catálogo e inventario de productos está restringido únicamente a usuarios con perfil de Administrador.
          </p>
        </div>
      </div>
    );
  }
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Modal Product State
  const [showProdModal, setShowProdModal] = useState(false);
  const [editProdId, setEditProdId] = useState<string | null>(null);
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('dep-1');
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [wholesaleMinQty, setWholesaleMinQty] = useState('6');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [unit, setUnit] = useState<'piece' | 'kg'>('piece');

  // Adjust Stock Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustProd, setAdjustProd] = useState<Product | null>(null);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustReason, setAdjustReason] = useState('Entrada por factura de compra');

  // Filter Products
  const filteredProducts = (products || []).filter((p) => {
    const matchesSearch =
      p.barcode.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.departmentName && p.departmentName.toLowerCase().includes(search.toLowerCase()));

    const matchesDept = selectedDept === 'ALL' || p.departmentId === selectedDept;
    const matchesLowStock = !onlyLowStock || p.stock <= p.minStock;

    return matchesSearch && matchesDept && matchesLowStock;
  });

  const handleOpenAdd = () => {
    setEditProdId(null);
    setBarcode(Math.floor(100000000000 + Math.random() * 900000000000).toString());
    setName('');
    setDepartmentId(departments[0]?.id || 'dep-1');
    setCostPrice('');
    setSalePrice('');
    setWholesalePrice('');
    setWholesaleMinQty('6');
    setStock('10');
    setMinStock('5');
    setUnit('piece');
    setShowProdModal(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditProdId(p.id);
    setBarcode(p.barcode);
    setName(p.name);
    setDepartmentId(p.departmentId);
    setCostPrice(p.costPrice.toString());
    setSalePrice(p.salePrice.toString());
    setWholesalePrice(p.wholesalePrice.toString());
    setWholesaleMinQty(p.wholesaleMinQty.toString());
    setStock(p.stock.toString());
    setMinStock(p.minStock.toString());
    setUnit(p.unit);
    setShowProdModal(true);
  };

  const handleSaveProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim() || !name.trim()) {
      alert('Ingresa el código de barras y el nombre del producto');
      return;
    }

    onSaveProduct({
      id: editProdId || undefined,
      barcode: barcode.trim(),
      name: name.trim(),
      departmentId,
      costPrice: parseFloat(costPrice) || 0,
      salePrice: parseFloat(salePrice) || 0,
      wholesalePrice: parseFloat(wholesalePrice) || parseFloat(salePrice) || 0,
      wholesaleMinQty: parseInt(wholesaleMinQty) || 6,
      stock: parseFloat(stock) || 0,
      minStock: parseFloat(minStock) || 5,
      unit,
    });

    setShowProdModal(false);
  };

  const handleConfirmStockAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProd) return;
    const deltaVal = parseFloat(adjustDelta);
    if (isNaN(deltaVal) || deltaVal === 0) {
      alert('Ingresa una cantidad válida para ajustar');
      return;
    }

    onAdjustStock(adjustProd.id, deltaVal, adjustReason);
    setShowAdjustModal(false);
    setAdjustProd(null);
    setAdjustDelta('');
  };

  return (
    <div className="max-w-7xl mx-auto p-3 space-y-4 select-none">
      {/* Top Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-slate-800">
              [F8] Catálogo e Inventario de Productos
            </h2>
            <p className="text-xs text-slate-500">
              {products.length} productos registrados en catálogo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportInventoryCSV(filteredProducts)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Exportar inventario a Excel/CSV"
          >
            <Download className="w-4 h-4 text-slate-600" /> Exportar Excel
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Importar productos masivamente desde Excel/CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Importar Excel
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 text-xs font-medium">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por código de barras, descripción o departamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Department Select */}
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
        >
          <option value="ALL">Todos los Departamentos</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        {/* Low Stock Filter */}
        <button
          onClick={() => setOnlyLowStock(!onlyLowStock)}
          className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 border transition-colors ${
            onlyLowStock
              ? 'bg-rose-50 border-rose-300 text-rose-700'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          <span>Stock Bajo ({(products || []).filter((p) => p.stock <= p.minStock).length})</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-sm border border-slate-300 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider sticky top-0 select-none">
                <th className="p-2.5">Codigo</th>
                <th className="p-2.5">Descripcion</th>
                <th className="p-2.5 text-right">Precio Costo</th>
                <th className="p-2.5 text-right">Precio Venta</th>
                <th className="p-2.5 text-right">Precio Mayoreo</th>
                <th className="p-2.5 text-center">Inventario</th>
                <th className="p-2.5 text-center">Inv. Minimo</th>
                <th className="p-2.5">Departamento</th>
                <th className="p-2.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No se encontraron productos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLowStock = p.stock <= p.minStock;

                  return (
                    <tr key={p.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="p-2.5 font-mono text-slate-600 font-bold">{p.barcode}</td>
                      <td className="p-2.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {p.unit === 'kg' && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1 py-0.2 rounded font-extrabold flex items-center gap-0.5">
                              <Scale className="w-3 h-3" /> kg
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2.5 text-right text-slate-600 font-mono font-semibold">
                        ${p.costPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-right font-mono font-black text-slate-900 text-xs">
                        ${p.salePrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-right text-amber-700 font-mono text-[11px] font-bold">
                        ${p.wholesalePrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">({p.wholesaleMinQty}+)</span>
                      </td>
                      <td className="p-2.5 text-center font-mono">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-extrabold ${
                            isLowStock
                              ? 'bg-rose-100 text-rose-700 border border-rose-300'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isLowStock && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                          {p.stock} {p.unit === 'kg' ? 'kg' : 'pzs'}
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-600 font-semibold">
                        {p.minStock} {p.unit === 'kg' ? 'kg' : 'pzs'}
                      </td>
                      <td className="p-2.5">
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] px-2 py-0.5 rounded font-bold">
                          {p.departmentName || 'General'}
                        </span>
                      </td>
                      <td className="p-2.5 text-center space-x-1">
                        <button
                          onClick={() => {
                            setAdjustProd(p);
                            setAdjustDelta('');
                            setShowAdjustModal(true);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Ajustar Inventario / Stock"
                        >
                          <ArrowDownUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                          title="Editar Producto"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar producto ${p.name}?`)) {
                              onDeleteProduct(p.id);
                            }
                          }}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Eliminar Producto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Create/Edit Product */}
      {showProdModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <Package className="w-6 h-6" />
                <h3 className="font-extrabold text-lg text-slate-900">
                  {editProdId ? 'Editar Producto' : 'Registrar Nuevo Producto'}
                </h3>
              </div>
              <button onClick={() => setShowProdModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProductSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Código de Barras *:</label>
                  <input
                    type="text"
                    required
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Unidad de Venta:</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as 'piece' | 'kg')}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
                  >
                    <option value="piece">Por Pieza (Unidad)</option>
                    <option value="kg">Por Kilo (Báscula)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Descripción / Nombre del Producto *:</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Leche LALA Entera 1L"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Departamento / Categoría:</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Precio Costo ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Precio Venta ($) *:</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full p-2.5 bg-emerald-50 border border-emerald-400 rounded-lg font-black text-emerald-800 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200">
                <div>
                  <label className="font-bold text-amber-900 block mb-1">Precio Mayoreo ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={wholesalePrice}
                    onChange={(e) => setWholesalePrice(e.target.value)}
                    className="w-full p-2 bg-white border border-amber-300 rounded font-bold text-amber-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-amber-900 block mb-1">A partir de (pzs):</label>
                  <input
                    type="number"
                    value={wholesaleMinQty}
                    onChange={(e) => setWholesaleMinQty(e.target.value)}
                    className="w-full p-2 bg-white border border-amber-300 rounded font-bold text-amber-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Stock Existencia Inicial:</label>
                  <input
                    type="number"
                    step="0.001"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Stock Mínimo (Alerta):</label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProdModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Adjust Stock */}
      {showAdjustModal && adjustProd && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-blue-600">
                <ArrowDownUp className="w-6 h-6" />
                <h3 className="font-extrabold text-lg text-slate-900">Ajustar Inventario</h3>
              </div>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmStockAdjust} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 text-sm">{adjustProd.name}</div>
                <div className="text-slate-500 mt-0.5">
                  Stock Actual: <strong>{adjustProd.stock}</strong> {adjustProd.unit}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Cantidad a Ajustar (+ para agregar, - para merma/pérdida):
                </label>
                <input
                  type="number"
                  step="0.001"
                  autoFocus
                  placeholder="ej. +10 o -2"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  className="w-full p-3 bg-white border-2 border-blue-500 rounded-xl text-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Motivo del ajuste:</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow"
                >
                  Aplicar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Import Excel / CSV Modal */}
      {showImportModal && (
        <ImportProductsModal
          onImportSuccess={async (items) => {
            if (onImportProducts) {
              await onImportProducts(items);
            }
          }}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
};
