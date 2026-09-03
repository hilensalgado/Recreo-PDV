import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Download,
  Copy,
  Printer,
  X,
  AlertTriangle,
  Check,
  Search,
  Filter,
  Package,
  DollarSign,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Product, Department } from '../types/pos';
import { exportPurchaseListCSV } from '../utils/exportUtils';

interface PurchaseListModalProps {
  products: Product[];
  departments: Department[];
  onClose: () => void;
}

export const PurchaseListModal: React.FC<PurchaseListModalProps> = ({
  products,
  departments,
  onClose,
}) => {
  // Filter products with low stock (stock <= minStock)
  const initialLowStockItems = useMemo(() => {
    return (products || []).filter((p) => p.stock <= p.minStock);
  }, [products]);

  // Order quantities map (productId -> quantity to buy)
  const [quantities, setQuantities] = useState<{ [productId: string]: number }>(() => {
    const initialMap: { [productId: string]: number } = {};
    initialLowStockItems.forEach((p) => {
      // Suggested replenishment: bring to 2x minStock or at least 1 unit / round number
      const deficit = Math.max(1, (p.minStock || 5) * 2 - (p.stock || 0));
      initialMap[p.id] = deficit;
    });
    return initialMap;
  });

  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [copied, setCopied] = useState(false);

  // Filtered list
  const filteredItems = useMemo(() => {
    return initialLowStockItems.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.toLowerCase().includes(search.toLowerCase()) ||
        (p.departmentName && p.departmentName.toLowerCase().includes(search.toLowerCase()));

      const matchesDept = selectedDept === 'ALL' || p.departmentId === selectedDept;

      return matchesSearch && matchesDept;
    });
  }, [initialLowStockItems, search, selectedDept]);

  // Total calculations
  const totalCost = useMemo(() => {
    return filteredItems.reduce((acc, p) => {
      const qty = quantities[p.id] !== undefined ? quantities[p.id] : 1;
      return acc + qty * (p.costPrice || 0);
    }, 0);
  }, [filteredItems, quantities]);

  const totalItemsCount = filteredItems.length;
  const totalUnitsToBuy = useMemo(() => {
    return filteredItems.reduce((acc, p) => {
      const qty = quantities[p.id] !== undefined ? quantities[p.id] : 1;
      return acc + qty;
    }, 0);
  }, [filteredItems, quantities]);

  const handleQtyChange = (productId: string, val: string) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setQuantities((prev) => ({
      ...prev,
      [productId]: num,
    }));
  };

  // Export CSV
  const handleExportCSV = () => {
    const exportData = filteredItems.map((p) => ({
      barcode: p.barcode,
      name: p.name,
      departmentName: p.departmentName,
      stock: p.stock,
      minStock: p.minStock,
      unit: p.unit,
      costPrice: p.costPrice || 0,
      suggestedQty: quantities[p.id] !== undefined ? quantities[p.id] : Math.max(1, p.minStock * 2 - p.stock),
    }));

    exportPurchaseListCSV(exportData);
  };

  // Copy to clipboard for WhatsApp / Supplier
  const handleCopyToClipboard = async () => {
    const dateStr = new Date().toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    let text = `📦 *LISTA DE COMPRAS / REPOSICIÓN - RECREO PDV*\n`;
    text += `📅 Fecha: ${dateStr}\n`;
    text += `📊 Total Productos: ${totalItemsCount} | Total Unidades: ${totalUnitsToBuy}\n`;
    text += `💰 Inversión Estimada: $${totalCost.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;
    text += `----------------------------------------\n`;

    filteredItems.forEach((p, idx) => {
      const qty = quantities[p.id] !== undefined ? quantities[p.id] : 1;
      const unit = p.unit === 'kg' ? 'kg' : 'unid.';
      text += `${idx + 1}. *${p.name}*\n`;
      text += `   • Pedir: *${qty} ${unit}* (Stock actual: ${p.stock} | Mínimo: ${p.minStock})\n`;
      if (p.barcode) text += `   • Cód: ${p.barcode}\n`;
      if (p.costPrice > 0) text += `   • Costo Unit: $${p.costPrice.toFixed(2)} | Subtotal: $${(qty * p.costPrice).toFixed(2)}\n`;
      text += `\n`;
    });

    text += `----------------------------------------\n`;
    text += `Generado automáticamente desde Recreo PDV.`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
      alert('No se pudo copiar automáticamente. Por favor descarga el archivo CSV.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg">Lista de Compras y Reposición</h3>
                <span className="bg-white/20 text-white font-bold text-[11px] px-2 py-0.5 rounded-full">
                  {totalItemsCount} productos con stock bajo
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-0.5">
                Genera tu orden de compra a proveedores ajustando las cantidades a pedir
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats and Summary Banner */}
        <div className="bg-amber-50/80 border-b border-amber-200/70 p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-xs shrink-0">
          <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-sm flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">Artículos a Reponer</span>
              <span className="font-black text-slate-900 text-sm">{totalItemsCount} productos</span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-sm flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-800 rounded-lg shrink-0">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">Unidades a Comprar</span>
              <span className="font-black text-slate-900 text-sm">{totalUnitsToBuy} unidades</span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-sm flex items-center gap-2.5 col-span-2 sm:col-span-1">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">Inversión Estimada (Costo)</span>
              <span className="font-black text-emerald-700 text-sm font-mono">
                ${totalCost.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-2 text-xs shrink-0">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por producto, código o depto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="flex-1 sm:flex-none p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none min-h-[34px]"
            >
              <option value="ALL">Todos los Departamentos</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table / List Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Check className="w-6 h-6 text-emerald-500" />
              </div>
              <h4 className="font-bold text-slate-700 text-sm">
                {initialLowStockItems.length === 0
                  ? '¡Excelente! No tienes productos con inventario bajo.'
                  : 'No hay productos con los filtros seleccionados.'}
              </h4>
              <p className="text-xs text-slate-500">
                {initialLowStockItems.length === 0
                  ? 'Todos tus productos están por encima de sus niveles mínimos de stock.'
                  : 'Intenta cambiar el término de búsqueda o el departamento.'}
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider sticky top-0 bg-slate-100 z-10">
                    <th className="p-2.5">Producto / Código</th>
                    <th className="p-2.5 text-center">Stock Actual</th>
                    <th className="p-2.5 text-center">Mínimo</th>
                    <th className="p-2.5 text-right">Precio Costo</th>
                    <th className="p-2.5 text-center bg-amber-50 text-amber-900 border-x border-amber-200">
                      Cant. a Pedir
                    </th>
                    <th className="p-2.5 text-right">Subtotal Est.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredItems.map((p) => {
                    const qty = quantities[p.id] !== undefined ? quantities[p.id] : Math.max(1, p.minStock * 2 - p.stock);
                    const subtotal = qty * (p.costPrice || 0);
                    const isZero = p.stock <= 0;

                    return (
                      <tr key={`pl-${p.id}`} className="hover:bg-amber-50/30 transition-colors">
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {isZero && (
                              <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-1.5 py-0.2 rounded border border-rose-200">
                                AGOTADO
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                            <span>Cód: {p.barcode}</span>
                            <span>•</span>
                            <span className="bg-slate-100 px-1 rounded">{p.departmentName || 'General'}</span>
                          </div>
                        </td>

                        <td className="p-2.5 text-center font-mono">
                          <span
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded font-black text-xs ${
                              isZero
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.stock} {p.unit === 'kg' ? 'kg' : 'pzs'}
                          </span>
                        </td>

                        <td className="p-2.5 text-center font-mono text-slate-600">
                          {p.minStock} {p.unit === 'kg' ? 'kg' : 'pzs'}
                        </td>

                        <td className="p-2.5 text-right font-mono text-slate-600">
                          ${p.costPrice.toFixed(2)}
                        </td>

                        <td className="p-2 text-center bg-amber-50/50 border-x border-amber-200/60">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step={p.unit === 'kg' ? '0.1' : '1'}
                              value={quantities[p.id] !== undefined ? quantities[p.id] : ''}
                              onChange={(e) => handleQtyChange(p.id, e.target.value)}
                              className="w-20 px-2 py-1 bg-white border border-amber-300 rounded font-mono font-black text-center text-xs text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                            />
                            <span className="text-[10px] text-slate-400 font-mono">
                              {p.unit === 'kg' ? 'kg' : 'u'}
                            </span>
                          </div>
                        </td>

                        <td className="p-2.5 text-right font-mono font-black text-slate-900">
                          ${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-bold">Total Estimado de Compra:</span>
            <span className="font-mono font-black text-emerald-700 text-sm sm:text-base">
              ${totalCost.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleCopyToClipboard}
              className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title="Copiar lista de compras para WhatsApp o proveedor"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>¡Copiado al portapapeles!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>Copiar para WhatsApp</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportCSV}
              disabled={filteredItems.length === 0}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Descargar archivo Excel / CSV de lista de compras"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel / CSV</span>
            </button>

            <button
              onClick={onClose}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
