import React, { useState, useMemo } from 'react';
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
  ShoppingCart,
  Layers,
  TrendingDown,
  Sparkles,
  Tag,
  Boxes,
  ShieldCheck,
  FileSpreadsheet,
  Lock,
  Barcode as BarcodeIcon,
  Calendar,
  Building2,
  ArrowRightLeft,
  Clock,
  Printer,
  CheckCircle2,
  AlertCircle,
  History,
} from 'lucide-react';
import {
  Product,
  Department,
  Promotion,
  PromotionItem,
  ProductBatch,
  Warehouse,
  StockTransfer,
  CashierPermissions,
} from '../types/pos';
import { exportInventoryCSV, exportPurchaseListCSV } from '../utils/exportUtils';
import { ImportProductsModal } from './ImportProductsModal';
import { PurchaseListModal } from './PurchaseListModal';
import { PromotionsManager } from './PromotionsManager';
import { BarcodeLabelGeneratorModal } from './BarcodeLabelGeneratorModal';
import { BatchModal } from './BatchModal';
import { DiscardBatchModal } from './DiscardBatchModal';
import { StockTransferModal } from './StockTransferModal';
import { formatCurrency, roundCurrency } from '../utils/pricingEngine';

interface InventoryViewProps {
  products: Product[];
  departments: Department[];
  promotions?: Promotion[];
  batches?: ProductBatch[];
  warehouses?: Warehouse[];
  stockTransfers?: StockTransfer[];
  isAdmin?: boolean;
  permissions?: CashierPermissions;
  onSaveProduct: (prod: Partial<Product> & { barcode: string; name: string }) => void;
  onImportProducts?: (items: any[]) => Promise<any>;
  onDeleteProduct: (id: string) => void;
  onAdjustStock: (productId: string, delta: number, reason: string) => void;
  onSavePromotion?: (promo: Partial<Promotion> & { code: string; name: string }) => Promise<void>;
  onDeletePromotion?: (id: string) => Promise<void>;
  onTogglePromotionStatus?: (id: string) => Promise<void>;
  onSaveBatch?: (data: Partial<ProductBatch> & { productId: string; expirationDate: string; initialQuantity: number }) => Promise<void>;
  onDiscardBatch?: (batchId: string, reason: string, userName?: string) => Promise<void>;
  onStockTransfer?: (data: {
    originWarehouseId: string;
    destWarehouseId: string;
    items: { productId: string; quantity: number; batchId?: string; batchNumber?: string }[];
    notes?: string;
    responsibleName?: string;
  }) => Promise<void>;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products = [],
  departments = [],
  promotions = [],
  batches = [],
  warehouses = [],
  stockTransfers = [],
  isAdmin = false,
  permissions,
  onSaveProduct,
  onImportProducts,
  onDeleteProduct,
  onAdjustStock,
  onSavePromotion = async () => {},
  onDeletePromotion = async () => {},
  onTogglePromotionStatus = async () => {},
  onSaveBatch,
  onDiscardBatch,
  onStockTransfer,
}) => {
  const canEditInventory = isAdmin || (permissions ? permissions.allowInventoryEdit !== false : true);

  // Submodule navigation tab
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'batches' | 'warehouses' | 'promotions'>('products');

  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPurchaseListModal, setShowPurchaseListModal] = useState(false);

  // New Modals for Batches, Barcodes & Warehouses
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodePreselectedProduct, setBarcodePreselectedProduct] = useState<Product | null>(null);

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchPreselectedProduct, setBatchPreselectedProduct] = useState<Product | null>(null);

  const [showDiscardBatchModal, setShowDiscardBatchModal] = useState(false);
  const [batchToDiscard, setBatchToDiscard] = useState<ProductBatch | null>(null);

  const [showTransferModal, setShowTransferModal] = useState(false);

  // Batches filter
  const [batchFilterStatus, setBatchFilterStatus] = useState<'ALL' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED'>('ALL');
  const [batchSearch, setBatchSearch] = useState('');

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
  const [adjustReason, setAdjustReason] = useState('Entrada / Reposición de mercadería');

  // Counts
  const lowStockProducts = useMemo(() => (products || []).filter((p) => p.stock <= p.minStock), [products]);
  const outOfStockProducts = useMemo(() => (products || []).filter((p) => p.stock <= 0), [products]);

  // Batch analytics & alerts
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const thirtyDaysFromNow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  }, []);

  const expiredBatches = useMemo(() => {
    return (batches || []).filter((b) => b.status === 'EXPIRED' || (b.status === 'ACTIVE' && b.expirationDate < today));
  }, [batches, today]);

  const expiringSoonBatches = useMemo(() => {
    return (batches || []).filter(
      (b) => b.status === 'ACTIVE' && b.expirationDate >= today && b.expirationDate <= thirtyDaysFromNow && b.remainingQuantity > 0
    );
  }, [batches, today, thirtyDaysFromNow]);

  const activeBatchesCount = useMemo(() => {
    return (batches || []).filter((b) => b.status === 'ACTIVE' && b.remainingQuantity > 0).length;
  }, [batches]);

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

  // Filter Batches
  const filteredBatches = useMemo(() => {
    return (batches || []).filter((b) => {
      const p = products.find((prod) => prod.id === b.productId);
      const matchesText =
        b.batchNumber.toLowerCase().includes(batchSearch.toLowerCase()) ||
        b.productName.toLowerCase().includes(batchSearch.toLowerCase()) ||
        (p && p.barcode.toLowerCase().includes(batchSearch.toLowerCase()));

      if (!matchesText) return false;

      if (batchFilterStatus === 'EXPIRED') {
        return b.status === 'EXPIRED' || (b.status === 'ACTIVE' && b.expirationDate < today);
      }
      if (batchFilterStatus === 'EXPIRING_SOON') {
        return b.status === 'ACTIVE' && b.expirationDate >= today && b.expirationDate <= thirtyDaysFromNow && b.remainingQuantity > 0;
      }
      if (batchFilterStatus === 'ACTIVE') {
        return b.status === 'ACTIVE' && b.remainingQuantity > 0 && b.expirationDate >= today;
      }

      return true;
    });
  }, [batches, batchSearch, batchFilterStatus, products, today, thirtyDaysFromNow]);

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

  const handleOpenAdjust = (p: Product) => {
    setAdjustProd(p);
    setAdjustDelta('');
    setAdjustReason(isAdmin ? 'Ajuste de inventario' : 'Entrada / Reposición de mercadería');
    setShowAdjustModal(true);
  };

  const handleDeleteProduct = (p: Product) => {
    if (!isAdmin) {
      alert('Acción no permitida: Solo los administradores pueden eliminar productos del catálogo.');
      return;
    }
    if (confirm(`¿Eliminar definitivamente el producto ${p.name}? Esta acción no se puede deshacer.`)) {
      onDeleteProduct(p.id);
    }
  };

  const handleSaveProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim() || !name.trim()) {
      alert('Ingresa el código de barras y el nombre del producto');
      return;
    }

    // Cashiers cannot reduce stock of existing product via edit form
    if (!isAdmin && editProdId) {
      const existing = products.find((p) => p.id === editProdId);
      const enteredStock = parseFloat(stock) || 0;
      if (existing && enteredStock < existing.stock) {
        alert(
          `Acción no permitida: Como cajero no puedes disminuir las existencias de este producto (Stock actual: ${existing.stock} ${existing.unit === 'kg' ? 'kg' : 'pzs'}). Para agregar mercadería ingresa una cantidad igual o superior, o utiliza el botón de Entrada de Stock (+).`
        );
        return;
      }
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
      alert(isAdmin ? 'Ingresa una cantidad válida para ajustar' : 'Ingresa una cantidad válida a sumar al stock (+)');
      return;
    }

    if (!isAdmin && deltaVal < 0) {
      alert('Acción restringida: Los cajeros no tienen permisos para restar existencias ni registrar mermas/salidas. Solo pueden registrar entradas (+).');
      return;
    }

    onAdjustStock(
      adjustProd.id,
      deltaVal,
      adjustReason.trim() || (deltaVal > 0 ? 'Entrada de mercadería' : 'Ajuste de inventario')
    );
    setShowAdjustModal(false);
    setAdjustProd(null);
    setAdjustDelta('');
  };

  const getDaysUntilExpiration = (dateStr: string) => {
    const exp = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-3 space-y-3 sm:space-y-4 select-none pb-16">
      {/* Top Bar with Submodule Navigation */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
            <Package className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-extrabold text-base sm:text-lg text-slate-800">
                [F8] Control de Inventario Avanzado
              </h2>
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full font-bold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  Admin: Control Total
                </span>
              ) : canEditInventory ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full font-bold text-[11px]">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Cajero: Crear productos y sumar existencias (+)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-full font-bold text-[11px]">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  Modo Consulta: Solo Lectura
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Lotes con vencimiento, múltiples depósitos, transferencias, etiquetas y combos
            </p>
          </div>
        </div>

        {/* Submodule Tabs Switcher */}
        <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('products')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'products'
                ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-4 h-4 text-emerald-600" />
            <span>Catálogo ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('batches')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'batches'
                ? 'bg-amber-600 text-white shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-amber-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Lotes & Vencimientos</span>
            {(expiredBatches.length > 0 || expiringSoonBatches.length > 0) && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeSubTab === 'batches' ? 'bg-white/20 text-white' : 'bg-rose-500 text-white'
              }`}>
                {expiredBatches.length + expiringSoonBatches.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('warehouses')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'warehouses'
                ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-indigo-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Depósitos ({warehouses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('promotions')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'promotions'
                ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-blue-700'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Promociones ({promotions.length})</span>
          </button>
        </div>
      </div>

      {/* ===================== TAB 1: PRODUCTS CATALOG ===================== */}
      {activeSubTab === 'products' && (
        <>
          {/* Action Bar for Products */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500 font-medium">
              Catálogo de artículos, existencias, precios y generador de etiquetas
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => {
                  setBarcodePreselectedProduct(null);
                  setShowBarcodeModal(true);
                }}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-800 font-bold text-xs rounded-xl border border-blue-200 shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px]"
                title="Generar e imprimir etiquetas de código de barras (Góndola, 58mm, 80mm, Zebra)"
              >
                <BarcodeIcon className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">Imprimir Etiquetas</span>
              </button>

              <button
                onClick={() => setShowPurchaseListModal(true)}
                className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:from-amber-700 active:to-orange-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px]"
                title="Armar y exportar lista de compras para reposición"
              >
                <ShoppingCart className="w-4 h-4 shrink-0" />
                <span className="truncate">Lista de Compras</span>
                {lowStockProducts.length > 0 && (
                  <span className="bg-white text-orange-600 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                    {lowStockProducts.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => exportInventoryCSV(filteredProducts)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer min-h-[38px]"
                title="Exportar inventario filtrado a Excel/CSV"
              >
                <Download className="w-4 h-4 text-slate-600 shrink-0" /> <span className="truncate">Exportar</span>
              </button>
              {canEditInventory && (
                <>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-300 transition-colors flex items-center justify-center gap-1 cursor-pointer min-h-[38px]"
                    title="Importar productos masivamente desde Excel/CSV"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" /> <span className="truncate">Importar</span>
                  </button>
                  <button
                    onClick={handleOpenAdd}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1 cursor-pointer min-h-[38px]"
                  >
                    <Plus className="w-4 h-4 shrink-0" /> <span className="truncate">Nuevo Producto</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Interactive Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs">
            {/* Card 1: Total Catálogo */}
            <button
              type="button"
              onClick={() => setOnlyLowStock(false)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                !onlyLowStock
                  ? 'bg-emerald-50 border-emerald-300 shadow-sm ring-1 ring-emerald-400'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                  Total Catálogo
                </span>
                <span className="text-base sm:text-lg font-black text-slate-800">
                  {products.length} <span className="text-xs font-normal text-slate-500">artículos</span>
                </span>
              </div>
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                <Boxes className="w-4 h-4" />
              </div>
            </button>

            {/* Card 2: Stock Bajo */}
            <button
              type="button"
              onClick={() => setOnlyLowStock(true)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                onlyLowStock
                  ? 'bg-amber-50 border-amber-400 shadow-sm ring-1 ring-amber-400'
                  : 'bg-white border-slate-200 hover:bg-amber-50/40'
              }`}
            >
              <div>
                <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">
                  Stock Bajo
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base sm:text-lg font-black text-amber-800">
                    {lowStockProducts.length}
                  </span>
                  <span className="text-[10px] text-amber-600 font-semibold">
                    Por reponer
                  </span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </button>

            {/* Card 3: Sin Existencias */}
            <button
              type="button"
              onClick={() => setOnlyLowStock(true)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                onlyLowStock && outOfStockProducts.length > 0
                  ? 'bg-rose-50 border-rose-300 shadow-sm'
                  : 'bg-white border-slate-200 hover:bg-rose-50/40'
              }`}
            >
              <div>
                <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider block">
                  Sin Existencias
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base sm:text-lg font-black text-rose-700">
                    {outOfStockProducts.length}
                  </span>
                  <span className="text-[10px] text-rose-500 font-semibold">
                    Agotados
                  </span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0">
                <TrendingDown className="w-4 h-4" />
              </div>
            </button>

            {/* Card 4: Generar Etiquetas */}
            <button
              type="button"
              onClick={() => {
                setBarcodePreselectedProduct(null);
                setShowBarcodeModal(true);
              }}
              className="p-3 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-left transition-all cursor-pointer flex items-center justify-between shadow-sm"
            >
              <div>
                <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block">
                  Impresión Etiquetas
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-blue-950 flex items-center gap-1">
                  <span>Góndola / Zebra</span>
                  <Printer className="w-3 h-3 text-blue-700" />
                </span>
              </div>
              <div className="p-2 rounded-lg bg-blue-200 text-blue-800 shrink-0">
                <BarcodeIcon className="w-4 h-4" />
              </div>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs font-medium">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por código, nombre, depto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="flex-1 sm:flex-none p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none min-h-[36px]"
              >
                <option value="ALL">Todos los Departamentos</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setOnlyLowStock(!onlyLowStock)}
                className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 border transition-colors min-h-[36px] cursor-pointer shrink-0 ${
                  onlyLowStock
                    ? 'bg-amber-500 border-amber-600 text-white shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${onlyLowStock ? 'text-white' : 'text-amber-500'} shrink-0`} />
                <span>Stock Bajo ({lowStockProducts.length})</span>
              </button>
            </div>
          </div>

          {/* Active Low Stock Contextual Banner */}
          {onlyLowStock && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-200 text-amber-900 rounded-lg shrink-0">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <div className="font-extrabold text-amber-950">
                    Mostrando únicamente productos con inventario bajo ({filteredProducts.length} productos)
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Productos con existencias iguales o inferiores al stock mínimo de alerta.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setShowPurchaseListModal(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Armar Lista de Compras</span>
                </button>
                <button
                  onClick={() => setOnlyLowStock(false)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-amber-300 cursor-pointer transition-colors"
                >
                  Ver Todo
                </button>
              </div>
            </div>
          )}

          {/* Products Display (Mobile Cards + Desktop Table) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Mobile Product Cards (md:hidden) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No se encontraron productos con los filtros aplicados.
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isLowStock = p.stock <= p.minStock;
                  const prodBatches = (batches || []).filter((b) => b.productId === p.id && b.status === 'ACTIVE' && b.remainingQuantity > 0);
                  const nearestBatch = prodBatches.sort((a, b) => a.expirationDate.localeCompare(b.expirationDate))[0];

                  return (
                    <div key={`m-prod-${p.id}`} className="p-3 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.unit === 'kg' && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-extrabold flex items-center gap-0.5">
                                <Scale className="w-3 h-3" /> kg
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                            <span>Cód: {p.barcode}</span>
                            <span className="text-slate-400">•</span>
                            <span>{p.departmentName || 'General'}</span>
                          </div>
                          {nearestBatch && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                nearestBatch.expirationDate < today
                                  ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                  : nearestBatch.expirationDate <= thirtyDaysFromNow
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                Lote {nearestBatch.batchNumber}: Vence {nearestBatch.expirationDate}
                              </span>
                            </div>
                          )}
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-extrabold font-mono shrink-0 ${
                            isLowStock
                              ? 'bg-rose-100 text-rose-700 border border-rose-300'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isLowStock && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                          {p.stock} {p.unit === 'kg' ? 'kg' : 'pzs'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-3 text-xs font-mono">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Venta</span>
                            <span className="font-black text-slate-900">{formatCurrency(p.salePrice)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Costo</span>
                            <span className="text-slate-600">{formatCurrency(p.costPrice)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setBarcodePreselectedProduct(p);
                              setShowBarcodeModal(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 bg-slate-50 rounded border border-slate-200 transition-colors cursor-pointer"
                            title="Imprimir Etiqueta de Código de Barras"
                          >
                            <BarcodeIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setBatchPreselectedProduct(p);
                              setShowBatchModal(true);
                            }}
                            className="p-1.5 text-amber-700 hover:bg-amber-50 bg-slate-50 rounded border border-slate-200 transition-colors cursor-pointer"
                            title="Registrar Lote con Vencimiento"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>
                          {canEditInventory ? (
                            <>
                              <button
                                onClick={() => handleOpenAdjust(p)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 bg-slate-50 rounded border border-slate-200 transition-colors cursor-pointer"
                                title={isAdmin ? "Ajustar Stock / Inventario" : "Entrada de Mercadería (Sumar Stock +)"}
                              >
                                {isAdmin ? <ArrowDownUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-emerald-600 font-bold" />}
                              </button>
                              <button
                                onClick={() => handleOpenEdit(p)}
                                className="p-1.5 text-slate-700 hover:bg-slate-100 bg-slate-50 rounded border border-slate-200 transition-colors cursor-pointer"
                                title="Editar Producto"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteProduct(p)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 bg-slate-50 rounded border border-slate-200 transition-colors cursor-pointer"
                                  title="Eliminar Producto (Solo Admin)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic px-1">Solo lectura</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider sticky top-0 select-none">
                    <th className="p-2.5">Código</th>
                    <th className="p-2.5">Descripción</th>
                    <th className="p-2.5 text-right">Precio Costo</th>
                    <th className="p-2.5 text-right">Precio Venta</th>
                    <th className="p-2.5 text-right">Precio Mayoreo</th>
                    <th className="p-2.5 text-center">Inventario</th>
                    <th className="p-2.5 text-center">Lotes Activos</th>
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
                      const prodBatches = (batches || []).filter((b) => b.productId === p.id && b.status === 'ACTIVE' && b.remainingQuantity > 0);
                      const nearestBatch = prodBatches.sort((a, b) => a.expirationDate.localeCompare(b.expirationDate))[0];

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
                            {formatCurrency(p.costPrice)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-black text-slate-900 text-xs">
                            {formatCurrency(p.salePrice)}
                          </td>
                          <td className="p-2.5 text-right text-amber-700 font-mono text-[11px] font-bold">
                            {formatCurrency(p.wholesalePrice)}{' '}
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
                          <td className="p-2.5 text-center">
                            {prodBatches.length > 0 ? (
                              <button
                                onClick={() => {
                                  setBatchSearch(p.barcode);
                                  setActiveSubTab('batches');
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                                title={`Ver ${prodBatches.length} lotes de ${p.name}`}
                              >
                                <Calendar className="w-3 h-3 text-amber-600" />
                                <span>{prodBatches.length} lotes</span>
                                {nearestBatch && (
                                  <span className={`px-1 py-0.2 rounded text-[9px] ${
                                    nearestBatch.expirationDate < today ? 'bg-rose-500 text-white' : 'bg-amber-200 text-amber-900'
                                  }`}>
                                    Vence {nearestBatch.expirationDate.slice(5)}
                                  </span>
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setBatchPreselectedProduct(p);
                                  setShowBatchModal(true);
                                }}
                                className="text-[10px] text-slate-400 hover:text-amber-700 font-semibold cursor-pointer underline flex items-center justify-center gap-0.5 mx-auto"
                              >
                                <Plus className="w-3 h-3" /> Añadir Lote
                              </button>
                            )}
                          </td>
                          <td className="p-2.5">
                            <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] px-2 py-0.5 rounded font-bold">
                              {p.departmentName || 'General'}
                            </span>
                          </td>
                          <td className="p-2.5 text-center space-x-1">
                            <button
                              onClick={() => {
                                setBarcodePreselectedProduct(p);
                                setShowBarcodeModal(true);
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Imprimir Etiqueta de Código de Barras"
                            >
                              <BarcodeIcon className="w-3.5 h-3.5" />
                            </button>
                            {canEditInventory ? (
                              <>
                                <button
                                  onClick={() => handleOpenAdjust(p)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                  title={isAdmin ? "Ajustar Inventario / Stock" : "Entrada de Mercadería (Sumar Stock +)"}
                                >
                                  {isAdmin ? <ArrowDownUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-emerald-600 font-bold" />}
                                </button>
                                <button
                                  onClick={() => handleOpenEdit(p)}
                                  className="p-1 text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                  title="Editar Producto"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={() => handleDeleteProduct(p)}
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                    title="Eliminar Producto (Solo Admin)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic px-1">Solo lectura</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ===================== TAB 2: BATCHES & EXPIRATION DATES ===================== */}
      {activeSubTab === 'batches' && (
        <div className="space-y-4">
          {/* Batches Header & KPI Cards */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-600" />
                Control de Lotes y Fechas de Vencimiento
              </h3>
              <p className="text-xs text-slate-500">
                Monitoreo automático y alertas tempranas para productos perecederos (alimentos, bebidas, lácteos, carnes)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setBatchPreselectedProduct(null);
                  setShowBatchModal(true);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Lote</span>
              </button>
            </div>
          </div>

          {/* KPI Alert Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <button
              onClick={() => setBatchFilterStatus('ALL')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                batchFilterStatus === 'ALL' ? 'bg-slate-100 border-slate-400 ring-1 ring-slate-400' : 'bg-white border-slate-200'
              }`}
            >
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Total Lotes</span>
              <span className="text-lg font-black text-slate-900">{batches.length}</span>
            </button>

            <button
              onClick={() => setBatchFilterStatus('ACTIVE')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                batchFilterStatus === 'ACTIVE' ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400' : 'bg-white border-slate-200'
              }`}
            >
              <span className="text-[10px] text-emerald-700 font-bold block uppercase tracking-wider">Lotes Activos / Vigentes</span>
              <span className="text-lg font-black text-emerald-800">{activeBatchesCount}</span>
            </button>

            <button
              onClick={() => setBatchFilterStatus('EXPIRING_SOON')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                batchFilterStatus === 'EXPIRING_SOON' ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400' : 'bg-white border-slate-200'
              }`}
            >
              <span className="text-[10px] text-amber-700 font-bold block uppercase tracking-wider">Por Vencer (&lt; 30 días)</span>
              <span className="text-lg font-black text-amber-800 flex items-center gap-1">
                {expiringSoonBatches.length}
                {expiringSoonBatches.length > 0 && <AlertTriangle className="w-4 h-4 text-amber-600" />}
              </span>
            </button>

            <button
              onClick={() => setBatchFilterStatus('EXPIRED')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                batchFilterStatus === 'EXPIRED' ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-400' : 'bg-white border-slate-200'
              }`}
            >
              <span className="text-[10px] text-rose-700 font-bold block uppercase tracking-wider">Vencidos / Caducados</span>
              <span className="text-lg font-black text-rose-800 flex items-center gap-1">
                {expiredBatches.length}
                {expiredBatches.length > 0 && <AlertCircle className="w-4 h-4 text-rose-600" />}
              </span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar lote por código de lote, producto o código de barras..."
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs font-bold">Estado:</span>
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                <button
                  onClick={() => setBatchFilterStatus('ALL')}
                  className={`px-2.5 py-1 rounded ${batchFilterStatus === 'ALL' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'}`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setBatchFilterStatus('ACTIVE')}
                  className={`px-2.5 py-1 rounded ${batchFilterStatus === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}
                >
                  Vigentes
                </button>
                <button
                  onClick={() => setBatchFilterStatus('EXPIRING_SOON')}
                  className={`px-2.5 py-1 rounded ${batchFilterStatus === 'EXPIRING_SOON' ? 'bg-amber-500 text-white' : 'text-slate-600'}`}
                >
                  Por Vencer
                </button>
                <button
                  onClick={() => setBatchFilterStatus('EXPIRED')}
                  className={`px-2.5 py-1 rounded ${batchFilterStatus === 'EXPIRED' ? 'bg-rose-600 text-white' : 'text-slate-600'}`}
                >
                  Vencidos
                </button>
              </div>
            </div>
          </div>

          {/* Batches Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider sticky top-0 select-none">
                    <th className="p-2.5">Lote #</th>
                    <th className="p-2.5">Producto</th>
                    <th className="p-2.5">Fecha Elaboración</th>
                    <th className="p-2.5">Fecha Vencimiento</th>
                    <th className="p-2.5 text-center">Estado / Alerta</th>
                    <th className="p-2.5 text-center">Disponible / Inicial</th>
                    <th className="p-2.5 text-right">Costo Unit.</th>
                    <th className="p-2.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredBatches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No se encontraron lotes registrados con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredBatches.map((b) => {
                      const daysLeft = getDaysUntilExpiration(b.expirationDate);
                      const isExpired = daysLeft < 0 || b.status === 'EXPIRED';
                      const isExpiringSoon = !isExpired && daysLeft <= 30;
                      const percentLeft = Math.round((b.remainingQuantity / (b.initialQuantity || 1)) * 100);
                      const prod = products.find((p) => p.id === b.productId);

                      return (
                        <tr
                          key={b.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            isExpired ? 'bg-rose-50/40' : isExpiringSoon ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          <td className="p-2.5 font-mono font-bold text-slate-900">{b.batchNumber}</td>
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900">{b.productName}</div>
                            {prod && <div className="text-[10px] font-mono text-slate-400">Cód: {prod.barcode}</div>}
                          </td>
                          <td className="p-2.5 text-slate-600 font-mono text-[11px]">
                            {b.manufacturingDate || 'N/A'}
                          </td>
                          <td className="p-2.5 font-mono font-bold">
                            <span className={isExpired ? 'text-rose-700' : isExpiringSoon ? 'text-amber-800' : 'text-slate-800'}>
                              {b.expirationDate}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            {isExpired ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                VENCIDO hace {Math.abs(daysLeft)} días
                              </span>
                            ) : isExpiringSoon ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                Vence en {daysLeft} días
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Vigente ({daysLeft} d)
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-mono">
                            <div className="font-extrabold text-slate-900 text-xs">
                              {b.remainingQuantity} / {b.initialQuantity}
                            </div>
                            <div className="w-20 bg-slate-200 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                              <div
                                className={`h-full ${
                                  isExpired ? 'bg-rose-500' : isExpiringSoon ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, percentLeft))}%` }}
                              />
                            </div>
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold text-slate-700">
                            {b.costPrice ? formatCurrency(b.costPrice) : '-'}
                          </td>
                          <td className="p-2.5 text-center space-x-1">
                            <button
                              onClick={() => {
                                if (prod) {
                                  setBarcodePreselectedProduct(prod);
                                  setShowBarcodeModal(true);
                                }
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Imprimir Etiqueta para este Lote"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {b.remainingQuantity > 0 && b.status === 'ACTIVE' && (
                              <button
                                onClick={() => {
                                  setBatchToDiscard(b);
                                  setShowDiscardBatchModal(true);
                                }}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Descartar por Vencimiento / Registrar Merma"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: MULTIPLE WAREHOUSES & TRANSFERS ===================== */}
      {activeSubTab === 'warehouses' && (
        <div className="space-y-4">
          {/* Warehouses Top Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Múltiples Depósitos y Transferencias de Stock
              </h3>
              <p className="text-xs text-slate-500">
                Control de inventario segmentado entre Depósito Central, Salón de Ventas y Sucursales
              </p>
            </div>

            <button
              onClick={() => setShowTransferModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Nueva Transferencia</span>
            </button>
          </div>

          {/* Warehouse Location Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {warehouses.map((w) => {
              const isCentral = w.code === 'DEP-CENTRAL' || w.type === 'CENTRAL';
              return (
                <div
                  key={w.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${isCentral ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">{w.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400">{w.code}</span>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isCentral ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {isCentral ? 'Depósito Principal' : 'Punto de Venta'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs flex justify-between items-center font-mono">
                    <span className="text-slate-500 font-bold">Estado:</span>
                    <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Activo & Sincronizado
                    </span>
                  </div>

                  {w.address && (
                    <div className="text-[11px] text-slate-500">
                      <strong>Ubicación:</strong> {w.address}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Transfers History Log */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <History className="w-4 h-4 text-indigo-600" />
                Historial de Transferencias de Mercadería
              </h4>
              <span className="text-xs text-slate-400 font-medium">
                {stockTransfers.length} movimientos
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="p-2">Fecha</th>
                    <th className="p-2">Origen</th>
                    <th className="p-2">Destino</th>
                    <th className="p-2">Artículos Transferidos</th>
                    <th className="p-2">Responsable</th>
                    <th className="p-2 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockTransfers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No hay transferencias de stock registradas aún.
                      </td>
                    </tr>
                  ) : (
                    stockTransfers.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="p-2 font-mono text-slate-600 text-[11px]">
                          {t.createdAt.slice(0, 16).replace('T', ' ')}
                        </td>
                        <td className="p-2 font-bold text-slate-800">
                          {t.originWarehouseName || t.originWarehouseId}
                        </td>
                        <td className="p-2 font-bold text-indigo-700">
                          {t.destWarehouseName || t.destWarehouseId}
                        </td>
                        <td className="p-2">
                          <div className="space-y-0.5">
                            {t.items.map((item, idx) => (
                              <div key={idx} className="font-mono text-[11px] text-slate-700">
                                • {item.productName || item.productId}: <strong>{item.quantity}</strong> pzs
                                {item.batchNumber && (
                                  <span className="text-amber-700 text-[10px] ml-1">(Lote: {item.batchNumber})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-2 text-slate-600 text-[11px]">
                          {t.responsibleName || 'Sistema'}
                        </td>
                        <td className="p-2 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                            COMPLETADA
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 4: PROMOTIONS & COMBOS ===================== */}
      {activeSubTab === 'promotions' && (
        <PromotionsManager
          promotions={promotions}
          products={products}
          departments={departments}
          isAdmin={isAdmin}
          onSavePromotion={onSavePromotion}
          onDeletePromotion={onDeletePromotion}
          onToggleStatus={onTogglePromotionStatus}
        />
      )}

      {/* ===================== MODALS ===================== */}

      {/* MODAL: Barcode Label Generator */}
      {showBarcodeModal && (
        <BarcodeLabelGeneratorModal
          isOpen={showBarcodeModal}
          onClose={() => setShowBarcodeModal(false)}
          products={products}
          batches={batches}
          preselectedProduct={barcodePreselectedProduct}
        />
      )}

      {/* MODAL: Batch Create / Edit */}
      {showBatchModal && (
        <BatchModal
          isOpen={showBatchModal}
          onClose={() => setShowBatchModal(false)}
          products={products}
          preselectedProduct={batchPreselectedProduct}
          onSaveBatch={async (batchData) => {
            if (onSaveBatch) {
              await onSaveBatch(batchData);
            }
            setShowBatchModal(false);
          }}
        />
      )}

      {/* MODAL: Discard Batch / Merma */}
      {showDiscardBatchModal && batchToDiscard && (
        <DiscardBatchModal
          isOpen={showDiscardBatchModal}
          batch={batchToDiscard}
          onClose={() => {
            setShowDiscardBatchModal(false);
            setBatchToDiscard(null);
          }}
          onDiscard={async (batchId, reason, userName) => {
            if (onDiscardBatch) {
              await onDiscardBatch(batchId, reason, userName);
            }
            setShowDiscardBatchModal(false);
            setBatchToDiscard(null);
          }}
        />
      )}

      {/* MODAL: Stock Transfer Between Warehouses */}
      {showTransferModal && (
        <StockTransferModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          products={products}
          warehouses={warehouses}
          batches={batches}
          onTransferCreated={async (transferData) => {
            if (onStockTransfer) {
              await onStockTransfer(transferData);
            }
            setShowTransferModal(false);
          }}
        />
      )}

      {/* MODAL: Create/Edit Product */}
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
                  <label className="font-bold text-slate-700 block mb-1">
                    {editProdId ? 'Stock Actual:' : 'Stock Inicial:'}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
                  />
                  {!isAdmin && editProdId && (
                    <p className="text-[10px] text-amber-700 font-medium mt-1">
                      * Cajero: No puedes ingresar un valor menor al stock actual registrado.
                    </p>
                  )}
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
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow cursor-pointer"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Adjust Stock / Entrada de Mercadería */}
      {showAdjustModal && adjustProd && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <>
                    <ArrowDownUp className="w-6 h-6 text-blue-600" />
                    <h3 className="font-extrabold text-lg text-slate-900">Ajustar Inventario</h3>
                  </>
                ) : (
                  <>
                    <Plus className="w-6 h-6 text-emerald-600 font-bold" />
                    <h3 className="font-extrabold text-lg text-slate-900">Entrada de Mercadería (Sumar Stock)</h3>
                  </>
                )}
              </div>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!isAdmin && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />
                <span>
                  <strong>Modo Cajero:</strong> Ingresa las unidades recibidas para <strong>sumar al inventario (+)</strong>. Las reducciones de stock están bloqueadas para este perfil.
                </span>
              </div>
            )}

            <form onSubmit={handleConfirmStockAdjust} className="space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 text-sm">{adjustProd.name}</div>
                <div className="text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>Código: <strong className="font-mono">{adjustProd.barcode}</strong></span>
                  <span>•</span>
                  <span>Stock Actual: <strong className="text-slate-800">{adjustProd.stock}</strong> {adjustProd.unit === 'kg' ? 'kg' : 'pzs'}</span>
                </div>
              </div>

              {/* Quick Add Buttons for Cashier */}
              {!isAdmin && (
                <div>
                  <div className="text-[11px] text-slate-500 font-semibold mb-1.5">Sumar rápido:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 5, 10, 20, 50, 100].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => {
                          const curr = parseFloat(adjustDelta) || 0;
                          setAdjustDelta((curr + qty).toString());
                        }}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-lg border border-emerald-300 transition-colors cursor-pointer"
                      >
                        +{qty}
                      </button>
                    ))}
                    {adjustDelta && (
                      <button
                        type="button"
                        onClick={() => setAdjustDelta('')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-lg border border-slate-200 cursor-pointer"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isAdmin
                    ? 'Cantidad a Ajustar (+ para agregar, - para merma/pérdida):'
                    : 'Cantidad a Sumar al Stock (+):'}
                </label>
                <div className="relative">
                  {!isAdmin && (
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-xl text-emerald-600 select-none">
                      +
                    </span>
                  )}
                  <input
                    type="number"
                    step="0.001"
                    min={isAdmin ? undefined : "0.001"}
                    autoFocus
                    placeholder={isAdmin ? "ej. +10 o -2" : "10"}
                    value={adjustDelta}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!isAdmin && val.includes('-')) return;
                      setAdjustDelta(val);
                    }}
                    className={`w-full p-3 ${!isAdmin ? 'pl-8' : ''} bg-white border-2 ${
                      !isAdmin ? 'border-emerald-500 text-emerald-950' : 'border-blue-500 text-slate-900'
                    } rounded-xl text-xl font-black focus:outline-none`}
                  />
                </div>

                {adjustProd && adjustDelta && (
                  <div className="mt-1.5 text-xs text-slate-600 font-medium">
                    Nuevo Stock estimado:{' '}
                    <strong className="text-emerald-700 font-mono font-bold">
                      {Math.max(0, adjustProd.stock + (parseFloat(adjustDelta) || 0))} {adjustProd.unit === 'kg' ? 'kg' : 'pzs'}
                    </strong>
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Motivo / Factura de compra:</label>
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
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 ${
                    isAdmin ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  } text-white font-extrabold rounded-xl shadow cursor-pointer`}
                >
                  {isAdmin ? 'Aplicar Ajuste' : '+ Sumar al Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Import Excel / CSV Modal */}
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

      {/* MODAL: Purchase / Restock List Modal */}
      {showPurchaseListModal && (
        <PurchaseListModal
          products={products}
          departments={departments}
          onClose={() => setShowPurchaseListModal(false)}
        />
      )}
    </div>
  );
};
