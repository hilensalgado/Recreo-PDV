import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Barcode as BarcodeIcon,
  Tag,
  Sliders,
  Check,
  Plus,
  Minus,
  Trash2,
  Layers,
  Search,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Product, ProductBatch } from '../types/pos';
import { formatCurrency } from '../utils/pricingEngine';

interface BarcodeLabelGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  batches?: ProductBatch[];
  preselectedProduct?: Product | null;
  storeName?: string;
}

export type LabelType = 'GONDOLA' | 'STICKER_58MM' | 'STICKER_80MM' | 'ZEBRA_50X30';

interface LabelItem {
  product: Product;
  batch?: ProductBatch;
  quantity: number;
}

export const BarcodeLabelGeneratorModal: React.FC<BarcodeLabelGeneratorModalProps> = ({
  isOpen,
  onClose,
  products = [],
  batches = [],
  preselectedProduct,
  storeName = 'RECREO PDV COMERCIAL',
}) => {
  const [labelType, setLabelType] = useState<LabelType>('GONDOLA');
  const [showStoreName, setShowStoreName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showWholesalePrice, setShowWholesalePrice] = useState(true);
  const [showBarcodeText, setShowBarcodeText] = useState(true);
  const [showDepartment, setShowDepartment] = useState(true);
  const [showDate, setShowDate] = useState(true);

  // Search & Selection
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<LabelItem[]>(() => {
    if (preselectedProduct) {
      return [{ product: preselectedProduct, quantity: 1 }];
    }
    return products.slice(0, 4).map((p) => ({ product: p, quantity: 1 }));
  });

  // When preselectedProduct changes
  React.useEffect(() => {
    if (preselectedProduct) {
      setSelectedItems((prev) => {
        const exists = prev.find((item) => item.product.id === preselectedProduct.id);
        if (exists) return prev;
        return [{ product: preselectedProduct, quantity: 1 }, ...prev];
      });
    }
  }, [preselectedProduct]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.barcode.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 10);
  }, [products, searchTerm]);

  const handleAddItem = (prod: Product) => {
    setSelectedItems((prev) => {
      const idx = prev.findIndex((item) => item.product.id === prod.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        return copy;
      }
      return [...prev, { product: prod, quantity: 1 }];
    });
    setSearchTerm('');
  };

  const handleRemoveItem = (productId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setSelectedItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const next = item.quantity + delta;
            return next > 0 ? { ...item, quantity: next } : null;
          }
          return item;
        })
        .filter(Boolean) as LabelItem[]
    );
  };

  const handleSelectAll = () => {
    setSelectedItems(products.map((p) => ({ product: p, quantity: 1 })));
  };

  const handleClearAll = () => {
    setSelectedItems([]);
  };

  const handlePrint = () => {
    window.print();
  };

  // Expanded array of labels to render based on quantities
  const expandedLabels = useMemo(() => {
    const list: LabelItem[] = [];
    for (const item of selectedItems) {
      for (let i = 0; i < item.quantity; i++) {
        list.push(item);
      }
    }
    return list;
  }, [selectedItems]);

  if (!isOpen) return null;

  // Simple SVG Barcode Generator (Code 128 / Code 39 lookalike)
  const renderBarcodeSvg = (code: string, height: number = 32) => {
    // Generate pseudo-deterministic bar pattern from code
    const bars: boolean[] = [];
    // Start guard
    bars.push(true, false, true);
    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      for (let bit = 0; bit < 7; bit++) {
        bars.push(((charCode >> bit) & 1) === 1);
      }
      bars.push(false);
    }
    // Stop guard
    bars.push(true, false, true, true);

    return (
      <svg className="w-full max-w-[190px] h-8 mx-auto" viewBox={`0 0 ${bars.length * 2} ${height}`}>
        {bars.map((isBlack, idx) =>
          isBlack ? (
            <rect key={idx} x={idx * 2} y="0" width="1.8" height={height} fill="#000" />
          ) : null
        )}
      </svg>
    );
  };

  return (
    <div
      id="barcode-label-modal"
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <BarcodeIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Impresión de Etiquetas de Código de Barras</h2>
              <p className="text-xs text-slate-400">
                Generador para góndola, productos fraccionados y térmicas (58mm, 80mm, Zebra)
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

        {/* Content Body: Left Controls, Right Preview */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Panel: Settings & Product Selection */}
          <div className="lg:col-span-5 border-r border-slate-200 bg-slate-50 p-4 flex flex-col gap-4 overflow-y-auto max-h-[50vh] lg:max-h-[calc(92vh-130px)]">
            {/* Format Selector */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Tipo de Etiqueta / Formato
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLabelType('GONDOLA')}
                  className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                    labelType === 'GONDOLA'
                      ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/20 font-bold'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-600" /> Góndola / Estante
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">Precio grande para estantería</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLabelType('STICKER_58MM')}
                  className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                    labelType === 'STICKER_58MM'
                      ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/20 font-bold'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Printer className="w-3.5 h-3.5 text-emerald-600" /> Térmica 58mm
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">Ticket/Sticker angosto</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLabelType('STICKER_80MM')}
                  className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                    labelType === 'STICKER_80MM'
                      ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/20 font-bold'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Printer className="w-3.5 h-3.5 text-purple-600" /> Térmica 80mm
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">Ticket/Sticker estándar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLabelType('ZEBRA_50X30')}
                  className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                    labelType === 'ZEBRA_50X30'
                      ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/20 font-bold'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <BarcodeIcon className="w-3.5 h-3.5 text-amber-600" /> Zebra (50x30 mm)
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">Etiqueta adhesiva rollo</span>
                </button>
              </div>
            </div>

            {/* Display Options */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Opciones de la Etiqueta
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showStoreName}
                    onChange={(e) => setShowStoreName(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Nombre del Local</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Precio de Venta</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showWholesalePrice}
                    onChange={(e) => setShowWholesalePrice(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Precio Mayorista</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showBarcodeText}
                    onChange={(e) => setShowBarcodeText(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Código Numérico</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showDepartment}
                    onChange={(e) => setShowDepartment(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Departamento / Rubro</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showDate}
                    onChange={(e) => setShowDate(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Fecha de Emisión</span>
                </label>
              </div>
            </div>

            {/* Product Selector */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Productos Seleccionados ({selectedItems.length})
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[11px] text-blue-600 hover:underline font-medium"
                  >
                    Todos
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[11px] text-rose-600 hover:underline font-medium"
                  >
                    Vaciar
                  </button>
                </div>
              </div>

              {/* Search input to add products */}
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar y agregar producto por nombre o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                {filteredProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddItem(p)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-slate-800">{p.name}</span>
                          <span className="text-[11px] text-slate-400 block font-mono">{p.barcode}</span>
                        </div>
                        <span className="font-bold text-blue-600">{formatCurrency(p.salePrice)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected List */}
              <div className="flex-1 overflow-y-auto max-h-52 divide-y divide-slate-100 border border-slate-100 rounded-lg">
                {selectedItems.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    No hay productos seleccionados. Busca y agrega arriba.
                  </p>
                ) : (
                  selectedItems.map((item) => (
                    <div
                      key={item.product.id}
                      className="p-2 flex items-center justify-between gap-2 hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 truncate">{item.product.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {item.product.barcode} &bull; {formatCurrency(item.product.salePrice)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.product.id, -1)}
                          className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.product.id, 1)}
                          className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.product.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Live Visual Print Preview */}
          <div className="lg:col-span-7 p-4 bg-slate-100 flex flex-col overflow-y-auto max-h-[50vh] lg:max-h-[calc(92vh-130px)]">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-600" /> Vista Previa ({expandedLabels.length} etiquetas a imprimir)
              </span>
              <span className="text-xs text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200 font-mono">
                {labelType === 'GONDOLA' && 'Góndola A4 (70x40 mm)'}
                {labelType === 'STICKER_58MM' && 'Rollo Térmico 58 mm'}
                {labelType === 'STICKER_80MM' && 'Rollo Térmico 80 mm'}
                {labelType === 'ZEBRA_50X30' && 'Zebra Adhesivo 50x30 mm'}
              </span>
            </div>

            {/* Printable Container */}
            <div
              id="printable-labels-area"
              className={`p-4 bg-white rounded-lg shadow-sm border border-slate-200 flex-1 overflow-y-auto ${
                labelType === 'GONDOLA'
                  ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3'
                  : labelType === 'STICKER_58MM'
                  ? 'flex flex-col items-center gap-4'
                  : labelType === 'STICKER_80MM'
                  ? 'flex flex-col items-center gap-4'
                  : 'grid grid-cols-2 md:grid-cols-3 gap-3'
              }`}
            >
              {expandedLabels.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-400">
                  <BarcodeIcon className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-sm">Selecciona productos para generar las etiquetas</p>
                </div>
              ) : (
                expandedLabels.map((item, idx) => {
                  const p = item.product;
                  const todayStr = new Date().toLocaleDateString('es-AR');

                  if (labelType === 'GONDOLA') {
                    return (
                      <div
                        key={`${p.id}-${idx}`}
                        className="border-2 border-dashed border-slate-400 bg-white p-2.5 rounded flex flex-col justify-between text-black relative break-inside-avoid min-h-[140px]"
                      >
                        {showStoreName && (
                          <div className="text-[10px] uppercase font-bold text-slate-700 border-b border-slate-200 pb-1 flex justify-between">
                            <span className="truncate">{storeName}</span>
                            {showDepartment && p.departmentName && (
                              <span className="text-[9px] text-slate-500">{p.departmentName}</span>
                            )}
                          </div>
                        )}

                        <div className="my-1">
                          <p className="font-bold text-xs leading-tight line-clamp-2 text-slate-900 uppercase">
                            {p.name}
                          </p>
                          {p.unit === 'kg' && (
                            <span className="text-[9px] font-semibold text-slate-500">Precio x Kilogramo</span>
                          )}
                        </div>

                        {showPrice && (
                          <div className="my-1 text-center bg-slate-100/80 rounded py-1 border border-slate-200">
                            <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                              {formatCurrency(p.salePrice)}
                            </span>
                            {showWholesalePrice && p.wholesalePrice > 0 && (
                              <div className="text-[9px] text-slate-600 font-medium mt-0.5">
                                May. ({p.wholesaleMinQty}+ u):{' '}
                                <strong className="text-slate-900">{formatCurrency(p.wholesalePrice)}</strong>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-1 pt-1 border-t border-slate-100 flex flex-col items-center">
                          {renderBarcodeSvg(p.barcode, 24)}
                          {showBarcodeText && (
                            <span className="text-[10px] font-mono tracking-widest text-slate-800 mt-0.5 font-bold">
                              {p.barcode}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (labelType === 'STICKER_58MM') {
                    return (
                      <div
                        key={`${p.id}-${idx}`}
                        className="w-[200px] border border-slate-300 bg-white p-2 text-center rounded text-black break-inside-avoid shadow-xs"
                      >
                        {showStoreName && (
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-700 mb-1 border-b pb-0.5">
                            {storeName}
                          </p>
                        )}
                        <p className="font-bold text-xs leading-tight text-slate-900 mb-1">{p.name}</p>
                        {showPrice && (
                          <p className="text-lg font-black text-slate-900 mb-1">{formatCurrency(p.salePrice)}</p>
                        )}
                        <div className="flex flex-col items-center">
                          {renderBarcodeSvg(p.barcode, 26)}
                          {showBarcodeText && (
                            <p className="text-[9px] font-mono tracking-wider font-bold mt-0.5">{p.barcode}</p>
                          )}
                        </div>
                        {showDate && (
                          <p className="text-[8px] text-slate-400 mt-1">Impreso: {todayStr}</p>
                        )}
                      </div>
                    );
                  }

                  if (labelType === 'STICKER_80MM') {
                    return (
                      <div
                        key={`${p.id}-${idx}`}
                        className="w-[260px] border border-slate-300 bg-white p-3 text-center rounded text-black break-inside-avoid shadow-xs"
                      >
                        {showStoreName && (
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1 border-b pb-1">
                            {storeName}
                          </p>
                        )}
                        <p className="font-bold text-sm leading-tight text-slate-900 mb-1 uppercase">{p.name}</p>
                        {showPrice && (
                          <div className="my-1.5 py-1 bg-slate-50 border rounded">
                            <span className="text-2xl font-black text-slate-900">{formatCurrency(p.salePrice)}</span>
                            {p.unit === 'kg' && <span className="text-xs text-slate-500 ml-1">/kg</span>}
                          </div>
                        )}
                        <div className="flex flex-col items-center my-1">
                          {renderBarcodeSvg(p.barcode, 30)}
                          {showBarcodeText && (
                            <p className="text-[10px] font-mono tracking-widest font-bold mt-0.5">{p.barcode}</p>
                          )}
                        </div>
                        {showDate && (
                          <div className="text-[9px] text-slate-400 mt-1 flex justify-between px-1">
                            <span>{p.departmentName || 'General'}</span>
                            <span>{todayStr}</span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Zebra 50x30mm
                  return (
                    <div
                      key={`${p.id}-${idx}`}
                      className="border border-slate-400 bg-white p-2 rounded text-black break-inside-avoid flex flex-col justify-between h-[120px]"
                    >
                      <p className="font-bold text-[11px] leading-tight text-slate-900 truncate uppercase">{p.name}</p>
                      {showPrice && (
                        <div className="flex items-baseline justify-between my-0.5">
                          <span className="text-base font-black text-slate-900">{formatCurrency(p.salePrice)}</span>
                          {p.unit === 'kg' && <span className="text-[9px] text-slate-500">x kg</span>}
                        </div>
                      )}
                      <div className="flex flex-col items-center">
                        {renderBarcodeSvg(p.barcode, 22)}
                        {showBarcodeText && (
                          <p className="text-[9px] font-mono font-bold tracking-wider">{p.barcode}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-600">
            Total a imprimir: <strong>{expandedLabels.length} etiquetas</strong>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={expandedLabels.length === 0}
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Imprimir Etiquetas
            </button>
          </div>
        </div>
      </div>

      {/* Print Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-labels-area, #printable-labels-area * {
            visibility: visible;
          }
          #printable-labels-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            display: grid !important;
          }
        }
      `}</style>
    </div>
  );
};
