import React, { useState, useMemo } from 'react';
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Package,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingDown,
  Info,
  AlertTriangle,
  X,
  Boxes,
  Calendar,
  Clock,
  Copy,
  Percent,
  DollarSign,
  Gift,
  Coins,
  TrendingUp,
  Sliders,
  Filter,
} from 'lucide-react';
import { Product, Department, Promotion, PromotionItem, PromotionType } from '../types/pos';
import { formatCurrency, roundCurrency, isPromotionActiveNow } from '../utils/pricingEngine';

interface PromotionsManagerProps {
  promotions: Promotion[];
  products: Product[];
  departments?: Department[];
  isAdmin: boolean;
  onSavePromotion: (promo: Partial<Promotion> & { code: string; name: string }) => Promise<void>;
  onDeletePromotion: (id: string) => Promise<void>;
  onToggleStatus: (id: string) => Promise<void>;
}

const PROMOTION_TYPE_LABELS: Record<
  PromotionType,
  { label: string; icon: any; color: string; desc: string }
> = {
  COMBO: {
    label: 'Combo / Paquete',
    icon: Package,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    desc: 'Precio cerrado especial por un lote de 2 o más productos agrupados.',
  },
  BOGO_2X1: {
    label: '2x1 / 3x2 (Lleva X Paga Y)',
    icon: Gift,
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    desc: 'El cliente lleva una cantidad establecida de unidades y paga menos.',
  },
  SECOND_UNIT_DISCOUNT: {
    label: '2da Unidad con % Descuento',
    icon: Percent,
    color: 'bg-pink-100 text-pink-800 border-pink-300',
    desc: 'Descuento porcentual aplicado sobre la segunda unidad (ej. 70% OFF en la 2da).',
  },
  PERCENTAGE_DISCOUNT: {
    label: 'Descuento Porcentual Directo (%)',
    icon: Percent,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    desc: 'Aplica un % de rebaja directa sobre un producto o todo un departamento.',
  },
  FIXED_DISCOUNT: {
    label: 'Descuento en Monto Fijo ($)',
    icon: DollarSign,
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    desc: 'Resta un importe fijo de dinero por unidad vendida.',
  },
  BULK_PRICE: {
    label: 'Precio Especial por Volumen',
    icon: Coins,
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    desc: 'Precio unitario con descuento exclusivo al comprar a partir de N unidades.',
  },
};

const DAYS_OF_WEEK = [
  { id: 1, label: 'Lunes', short: 'L' },
  { id: 2, label: 'Martes', short: 'M' },
  { id: 3, label: 'Miércoles', short: 'M' },
  { id: 4, label: 'Jueves', short: 'J' },
  { id: 5, label: 'Viernes', short: 'V' },
  { id: 6, label: 'Sábado', short: 'S' },
  { id: 0, label: 'Domingo', short: 'D' },
];

export const PromotionsManager: React.FC<PromotionsManagerProps> = ({
  promotions = [],
  products = [],
  departments = [],
  isAdmin,
  onSavePromotion,
  onDeletePromotion,
  onToggleStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [promoToDelete, setPromoToDelete] = useState<Promotion | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formType, setFormType] = useState<PromotionType>('COMBO');
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [formPrice, setFormPrice] = useState<string>('');
  const [formDiscountPercentage, setFormDiscountPercentage] = useState<string>('');
  const [formDiscountAmount, setFormDiscountAmount] = useState<string>('');
  const [formTargetProductId, setFormTargetProductId] = useState<string>('');
  const [formTargetDepartmentId, setFormTargetDepartmentId] = useState<string>('');
  const [formMinQuantity, setFormMinQuantity] = useState<string>('2');
  const [formPayQuantity, setFormPayQuantity] = useState<string>('1');
  const [formSecondUnitDiscountPercent, setFormSecondUnitDiscountPercent] = useState<string>('70');
  const [formItems, setFormItems] = useState<PromotionItem[]>([]);
  const [formActiveDays, setFormActiveDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [formStartDate, setFormStartDate] = useState<string>('');
  const [formEndDate, setFormEndDate] = useState<string>('');
  const [formStartTime, setFormStartTime] = useState<string>('');
  const [formEndTime, setFormEndTime] = useState<string>('');

  // Product Picker in Combo
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedQty, setSelectedQty] = useState<number>(1);
  const [productPickerSearch, setProductPickerSearch] = useState('');

  // Open Create
  const handleOpenCreate = (initialType: PromotionType = 'COMBO') => {
    setEditingPromo(null);
    const prefix =
      initialType === 'COMBO'
        ? 'COMBO'
        : initialType === 'BOGO_2X1'
        ? 'PROMO2X1'
        : initialType === 'SECOND_UNIT_DISCOUNT'
        ? 'PROMO2DA'
        : 'OFERTA';
    setFormCode(`${prefix}${String(promotions.length + 1).padStart(3, '0')}`);
    setFormName('');
    setFormType(initialType);
    setFormDescription('');
    setFormPrice('');
    setFormDiscountPercentage('15');
    setFormDiscountAmount('');
    setFormTargetProductId(products[0]?.id || '');
    setFormTargetDepartmentId('');
    setFormMinQuantity('2');
    setFormPayQuantity('1');
    setFormSecondUnitDiscountPercent('70');
    setFormStatus('ACTIVE');
    setFormItems([]);
    setFormActiveDays([0, 1, 2, 3, 4, 5, 6]);
    setFormStartDate('');
    setFormEndDate('');
    setFormStartTime('');
    setFormEndTime('');
    setSelectedProductId(products[0]?.id || '');
    setSelectedQty(1);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (promo: Promotion) => {
    setEditingPromo(promo);
    setFormCode(promo.code);
    setFormName(promo.name);
    setFormType(promo.type || 'COMBO');
    setFormDescription(promo.description || '');
    setFormPrice(promo.price ? promo.price.toString() : '');
    setFormDiscountPercentage(
      promo.discountPercentage !== undefined ? promo.discountPercentage.toString() : ''
    );
    setFormDiscountAmount(promo.discountAmount !== undefined ? promo.discountAmount.toString() : '');
    setFormTargetProductId(promo.targetProductId || products[0]?.id || '');
    setFormTargetDepartmentId(promo.targetDepartmentId || '');
    setFormMinQuantity(promo.minQuantity !== undefined ? promo.minQuantity.toString() : '2');
    setFormPayQuantity(promo.payQuantity !== undefined ? promo.payQuantity.toString() : '1');
    setFormSecondUnitDiscountPercent(
      promo.secondUnitDiscountPercent !== undefined ? promo.secondUnitDiscountPercent.toString() : '70'
    );
    setFormStatus(promo.status);
    setFormItems(promo.items ? promo.items.map((i) => ({ ...i })) : []);
    setFormActiveDays(
      Array.isArray(promo.activeDays) && promo.activeDays.length > 0
        ? promo.activeDays
        : [0, 1, 2, 3, 4, 5, 6]
    );
    setFormStartDate(promo.startDate || '');
    setFormEndDate(promo.endDate || '');
    setFormStartTime(promo.startTime || '');
    setFormEndTime(promo.endTime || '');
    setSelectedProductId(products[0]?.id || '');
    setSelectedQty(1);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // Duplicate / Clone Promo
  const handleDuplicatePromo = (promo: Promotion) => {
    setEditingPromo(null);
    setFormCode(`${promo.code}_COPIA`);
    setFormName(`${promo.name} (Copia)`);
    setFormType(promo.type || 'COMBO');
    setFormDescription(promo.description || '');
    setFormPrice(promo.price ? promo.price.toString() : '');
    setFormDiscountPercentage(
      promo.discountPercentage !== undefined ? promo.discountPercentage.toString() : ''
    );
    setFormDiscountAmount(promo.discountAmount !== undefined ? promo.discountAmount.toString() : '');
    setFormTargetProductId(promo.targetProductId || products[0]?.id || '');
    setFormTargetDepartmentId(promo.targetDepartmentId || '');
    setFormMinQuantity(promo.minQuantity !== undefined ? promo.minQuantity.toString() : '2');
    setFormPayQuantity(promo.payQuantity !== undefined ? promo.payQuantity.toString() : '1');
    setFormSecondUnitDiscountPercent(
      promo.secondUnitDiscountPercent !== undefined ? promo.secondUnitDiscountPercent.toString() : '70'
    );
    setFormStatus('ACTIVE');
    setFormItems(promo.items ? promo.items.map((i) => ({ ...i })) : []);
    setFormActiveDays(
      Array.isArray(promo.activeDays) && promo.activeDays.length > 0
        ? promo.activeDays
        : [0, 1, 2, 3, 4, 5, 6]
    );
    setFormStartDate(promo.startDate || '');
    setFormEndDate(promo.endDate || '');
    setFormStartTime(promo.startTime || '');
    setFormEndTime(promo.endTime || '');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // Add product to combo
  const handleAddProductToCombo = () => {
    if (!selectedProductId) return;
    const targetProduct = products.find((p) => p.id === selectedProductId);
    if (!targetProduct) return;

    const existingIndex = formItems.findIndex((i) => i.productId === selectedProductId);
    if (existingIndex >= 0) {
      const updated = [...formItems];
      updated[existingIndex].quantity += selectedQty;
      setFormItems(updated);
    } else {
      setFormItems([
        ...formItems,
        {
          productId: targetProduct.id,
          productName: targetProduct.name,
          productBarcode: targetProduct.barcode,
          quantity: selectedQty,
          unitPrice: targetProduct.salePrice,
        },
      ]);
    }
    setSelectedQty(1);
  };

  const handleRemoveProductFromCombo = (productId: string) => {
    setFormItems(formItems.filter((i) => i.productId !== productId));
  };

  const handleUpdateItemQty = (productId: string, delta: number) => {
    setFormItems(
      formItems.map((item) => {
        if (item.productId === productId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  // Day toggle
  const toggleDay = (dayId: number) => {
    if (formActiveDays.includes(dayId)) {
      if (formActiveDays.length === 1) return; // keep at least 1 day
      setFormActiveDays(formActiveDays.filter((d) => d !== dayId));
    } else {
      setFormActiveDays([...formActiveDays, dayId]);
    }
  };

  // Financial preview calculation
  const financialPreview = useMemo(() => {
    if (formType === 'COMBO') {
      const regularTotal = formItems.reduce((acc, item) => {
        const p = products.find((prod) => prod.id === item.productId);
        const price = p ? p.salePrice : item.unitPrice || 0;
        return acc + price * item.quantity;
      }, 0);

      const costTotal = formItems.reduce((acc, item) => {
        const p = products.find((prod) => prod.id === item.productId);
        const cost = p ? p.costPrice : 0;
        return acc + cost * item.quantity;
      }, 0);

      const promoPrice = parseFloat(formPrice) || 0;
      const savings = Math.max(0, regularTotal - promoPrice);
      const savingsPercent = regularTotal > 0 ? (savings / regularTotal) * 100 : 0;
      const profit = promoPrice - costTotal;
      const margin = promoPrice > 0 ? (profit / promoPrice) * 100 : 0;

      return {
        regularTotal: roundCurrency(regularTotal),
        costTotal: roundCurrency(costTotal),
        promoPrice: roundCurrency(promoPrice),
        savings: roundCurrency(savings),
        savingsPercent: Math.round(savingsPercent),
        profit: roundCurrency(profit),
        margin: Math.round(margin),
      };
    }

    // For single target product promos (2x1, 2da unidad, %, $, Volumen)
    const targetProduct = products.find((p) => p.id === formTargetProductId);
    const regularPrice = targetProduct ? targetProduct.salePrice : 0;
    const costPrice = targetProduct ? targetProduct.costPrice : 0;

    let regularTotal = regularPrice;
    let promoPrice = regularPrice;
    let savings = 0;
    let costTotal = costPrice;

    if (formType === 'BOGO_2X1') {
      const minQ = parseInt(formMinQuantity) || 2;
      const payQ = parseInt(formPayQuantity) || 1;
      regularTotal = regularPrice * minQ;
      costTotal = costPrice * minQ;
      promoPrice = regularPrice * payQ;
      savings = regularTotal - promoPrice;
    } else if (formType === 'SECOND_UNIT_DISCOUNT') {
      const discPct = parseFloat(formSecondUnitDiscountPercent) || 50;
      regularTotal = regularPrice * 2;
      costTotal = costPrice * 2;
      const secondDiscount = (regularPrice * discPct) / 100;
      promoPrice = regularTotal - secondDiscount;
      savings = secondDiscount;
    } else if (formType === 'PERCENTAGE_DISCOUNT') {
      const discPct = parseFloat(formDiscountPercentage) || 0;
      savings = (regularPrice * discPct) / 100;
      promoPrice = regularPrice - savings;
    } else if (formType === 'FIXED_DISCOUNT') {
      const amount = parseFloat(formDiscountAmount) || 0;
      savings = Math.min(regularPrice, amount);
      promoPrice = Math.max(0, regularPrice - savings);
    } else if (formType === 'BULK_PRICE') {
      const minQ = parseInt(formMinQuantity) || 3;
      const specialPrice = parseFloat(formPrice) || regularPrice;
      regularTotal = regularPrice * minQ;
      costTotal = costPrice * minQ;
      promoPrice = specialPrice * minQ;
      savings = Math.max(0, regularTotal - promoPrice);
    }

    const savingsPercent = regularTotal > 0 ? (savings / regularTotal) * 100 : 0;
    const profit = promoPrice - costTotal;
    const margin = promoPrice > 0 ? (profit / promoPrice) * 100 : 0;

    return {
      regularTotal: roundCurrency(regularTotal),
      costTotal: roundCurrency(costTotal),
      promoPrice: roundCurrency(promoPrice),
      savings: roundCurrency(savings),
      savingsPercent: Math.round(savingsPercent),
      profit: roundCurrency(profit),
      margin: Math.round(margin),
    };
  }, [
    formType,
    formItems,
    formPrice,
    formTargetProductId,
    formMinQuantity,
    formPayQuantity,
    formSecondUnitDiscountPercent,
    formDiscountPercentage,
    formDiscountAmount,
    products,
  ]);

  // Handle Submit Promo
  const handleSubmitPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCode = formCode.trim().toUpperCase();
    const cleanName = formName.trim();

    if (!cleanCode) {
      setErrorMsg('El código de promoción es obligatorio');
      return;
    }
    if (!cleanName) {
      setErrorMsg('El nombre de la promoción es obligatorio');
      return;
    }

    if (formType === 'COMBO') {
      const numericPrice = parseFloat(formPrice);
      if (isNaN(numericPrice) || numericPrice < 0) {
        setErrorMsg('Ingresa un precio final válido para el combo (>= 0)');
        return;
      }
      if (formItems.length === 0) {
        setErrorMsg('Debes agregar al menos un producto al combo');
        return;
      }
    } else if (formType === 'PERCENTAGE_DISCOUNT') {
      const pct = parseFloat(formDiscountPercentage);
      if (isNaN(pct) || pct <= 0 || pct > 100) {
        setErrorMsg('Ingresa un porcentaje de descuento válido (entre 1% y 100%)');
        return;
      }
      if (!formTargetProductId && !formTargetDepartmentId) {
        setErrorMsg('Debes seleccionar un producto o un departamento destino');
        return;
      }
    } else if (formType === 'FIXED_DISCOUNT') {
      const amt = parseFloat(formDiscountAmount);
      if (isNaN(amt) || amt <= 0) {
        setErrorMsg('Ingresa un importe de descuento fijo válido (> 0)');
        return;
      }
      if (!formTargetProductId) {
        setErrorMsg('Debes seleccionar el producto destino');
        return;
      }
    } else if (formType === 'BOGO_2X1') {
      const minQ = parseInt(formMinQuantity);
      const payQ = parseInt(formPayQuantity);
      if (isNaN(minQ) || isNaN(payQ) || minQ <= payQ || payQ <= 0) {
        setErrorMsg('La cantidad a llevar debe ser estrictamente mayor que la cantidad a pagar (ej. 2x1)');
        return;
      }
      if (!formTargetProductId) {
        setErrorMsg('Debes seleccionar el producto destino');
        return;
      }
    } else if (formType === 'SECOND_UNIT_DISCOUNT') {
      const disc = parseFloat(formSecondUnitDiscountPercent);
      if (isNaN(disc) || disc <= 0 || disc > 100) {
        setErrorMsg('Ingresa un porcentaje válido para la 2da unidad (ej. 70%)');
        return;
      }
      if (!formTargetProductId) {
        setErrorMsg('Debes seleccionar el producto destino');
        return;
      }
    } else if (formType === 'BULK_PRICE') {
      const minQ = parseInt(formMinQuantity);
      const price = parseFloat(formPrice);
      if (isNaN(minQ) || minQ < 2) {
        setErrorMsg('La cantidad mínima por volumen debe ser al menos 2');
        return;
      }
      if (isNaN(price) || price <= 0) {
        setErrorMsg('Ingresa el precio unitario especial por volumen');
        return;
      }
      if (!formTargetProductId) {
        setErrorMsg('Debes seleccionar el producto destino');
        return;
      }
    }

    try {
      setIsSaving(true);
      await onSavePromotion({
        id: editingPromo ? editingPromo.id : undefined,
        code: cleanCode,
        name: cleanName,
        type: formType,
        description: formDescription.trim() || undefined,
        price: parseFloat(formPrice) || 0,
        discountPercentage: formDiscountPercentage ? parseFloat(formDiscountPercentage) : undefined,
        discountAmount: formDiscountAmount ? parseFloat(formDiscountAmount) : undefined,
        targetProductId: formTargetProductId || undefined,
        targetDepartmentId: formTargetDepartmentId || undefined,
        minQuantity: formMinQuantity ? parseInt(formMinQuantity) : undefined,
        payQuantity: formPayQuantity ? parseInt(formPayQuantity) : undefined,
        secondUnitDiscountPercent: formSecondUnitDiscountPercent
          ? parseFloat(formSecondUnitDiscountPercent)
          : undefined,
        status: formStatus,
        items: formType === 'COMBO' ? formItems : [],
        activeDays: formActiveDays,
        startDate: formStartDate || undefined,
        endDate: formEndDate || undefined,
        startTime: formStartTime || undefined,
        endTime: formEndTime || undefined,
      });
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la promoción');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered promotions
  const filteredPromotions = useMemo(() => {
    const now = new Date();
    return promotions.filter((promo) => {
      const matchesSearch =
        promo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promo.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (promo.description && promo.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : promo.status === statusFilter;

      const pType = promo.type || 'COMBO';
      const matchesType = typeFilter === 'ALL' ? true : pType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [promotions, searchTerm, statusFilter, typeFilter]);

  // Statistics
  const totalCount = promotions.length;
  const activeCount = promotions.filter((p) => p.status === 'ACTIVE').length;
  const activeTodayCount = promotions.filter((p) => isPromotionActiveNow(p)).length;
  const inactiveCount = totalCount - activeCount;

  // Filter available products for picker
  const filteredAvailableProducts = useMemo(() => {
    if (!productPickerSearch.trim()) return products;
    const term = productPickerSearch.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(term) || p.barcode.includes(term)
    );
  }, [products, productPickerSearch]);

  // Calculate Available Stock for combos
  const calculateAvailableComboStock = (promo: Promotion) => {
    if (!promo.items || promo.items.length === 0) return 0;
    let minCombos = Infinity;
    for (const item of promo.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) return 0;
      const possible = Math.floor(prod.stock / item.quantity);
      if (possible < minCombos) {
        minCombos = possible;
      }
    }
    return minCombos === Infinity ? 0 : minCombos;
  };

  return (
    <div className="space-y-4">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Ofertas</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{totalCount}</h3>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-emerald-200/80 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-emerald-50/40">
          <div>
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Activas Hoy</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <h3 className="text-xl sm:text-2xl font-black text-emerald-600">{activeTodayCount}</h3>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                En Caja
              </span>
            </div>
          </div>
          <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Tipos de Promos</p>
            <h3 className="text-xl sm:text-2xl font-black text-purple-700 mt-0.5">
              {new Set(promotions.map((p) => p.type || 'COMBO')).size} / 6
            </h3>
          </div>
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inactivas / Pausa</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-600 mt-0.5">{inactiveCount}</h3>
          </div>
          <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Toolbar & Filters */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código, nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Todos los Tipos</option>
            <option value="COMBO">🍱 Combos / Paquetes</option>
            <option value="BOGO_2X1">🎁 2x1 / 3x2 (Lleva X Paga Y)</option>
            <option value="SECOND_UNIT_DISCOUNT">🥈 2da Unidad al %</option>
            <option value="PERCENTAGE_DISCOUNT">🏷️ Descuento Porcentual (%)</option>
            <option value="FIXED_DISCOUNT">💵 Descuento Fijo ($)</option>
            <option value="BULK_PRICE">📊 Precio por Volumen</option>
          </select>

          {/* Status Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Activas ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                statusFilter === 'INACTIVE'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              Pausadas ({inactiveCount})
            </button>
          </div>
        </div>

        {/* Create Button Dropdown / Direct */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenCreate('COMBO')}
            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Nueva Promoción</span>
          </button>
        </div>
      </div>

      {/* Quick Type Action Chips for Fast Creation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0">
          Atajos Rápidos:
        </span>
        <button
          onClick={() => handleOpenCreate('COMBO')}
          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
        >
          <Package className="w-3.5 h-3.5" /> + Combo Armado
        </button>
        <button
          onClick={() => handleOpenCreate('BOGO_2X1')}
          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
        >
          <Gift className="w-3.5 h-3.5" /> + 2x1 / 3x2
        </button>
        <button
          onClick={() => handleOpenCreate('SECOND_UNIT_DISCOUNT')}
          className="px-2.5 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-lg font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
        >
          <Percent className="w-3.5 h-3.5" /> + 2da Unidad al 70%
        </button>
        <button
          onClick={() => handleOpenCreate('PERCENTAGE_DISCOUNT')}
          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
        >
          <Percent className="w-3.5 h-3.5" /> + Descuento %
        </button>
        <button
          onClick={() => handleOpenCreate('BULK_PRICE')}
          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
        >
          <Coins className="w-3.5 h-3.5" /> + Precio por Volumen
        </button>
      </div>

      {/* Promotions Cards Grid */}
      {filteredPromotions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-xs">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">No se encontraron promociones</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL'
              ? 'Prueba modificando los filtros de búsqueda o tipo de promoción.'
              : 'Configura ofertas automáticas, combos o descuentos 2x1 para impulsar tus ventas.'}
          </p>
          {!searchTerm && statusFilter === 'ALL' && (
            <button
              onClick={() => handleOpenCreate('COMBO')}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Crear Primera Promoción
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredPromotions.map((promo) => {
            const pType = promo.type || 'COMBO';
            const typeConfig = PROMOTION_TYPE_LABELS[pType] || PROMOTION_TYPE_LABELS.COMBO;
            const TypeIcon = typeConfig.icon;
            const isActiveNow = isPromotionActiveNow(promo);

            // Compute standalone / retail reference values
            let retailReference = 0;
            let displayPriceStr = '';
            let discountNote = '';
            const targetProd = promo.targetProductId
              ? products.find((p) => p.id === promo.targetProductId)
              : null;
            const targetDept = promo.targetDepartmentId
              ? departments.find((d) => d.id === promo.targetDepartmentId)
              : null;

            if (pType === 'COMBO') {
              retailReference = (promo.items || []).reduce((acc, item) => {
                const p = products.find((prod) => prod.id === item.productId);
                return acc + (p ? p.salePrice : item.unitPrice || 0) * item.quantity;
              }, 0);
              displayPriceStr = formatCurrency(promo.price);
              if (retailReference > promo.price) {
                discountNote = `Ahorro: ${formatCurrency(retailReference - promo.price)} (${(
                  ((retailReference - promo.price) / retailReference) *
                  100
                ).toFixed(0)}% OFF)`;
              }
            } else if (pType === 'BOGO_2X1') {
              const minQ = promo.minQuantity || 2;
              const payQ = promo.payQuantity || 1;
              displayPriceStr = `${minQ}x${payQ} (Paga ${payQ} de ${minQ})`;
              discountNote = targetProd ? `En ${targetProd.name}` : 'En producto seleccionado';
            } else if (pType === 'SECOND_UNIT_DISCOUNT') {
              const pct = promo.secondUnitDiscountPercent || 70;
              displayPriceStr = `-${pct}% en 2da unidad`;
              discountNote = targetProd ? `En ${targetProd.name}` : 'En producto seleccionado';
            } else if (pType === 'PERCENTAGE_DISCOUNT') {
              displayPriceStr = `-${promo.discountPercentage || 0}% Directo`;
              discountNote = targetProd
                ? `En ${targetProd.name}`
                : targetDept
                ? `En Dpto. ${targetDept.name}`
                : 'En producto';
            } else if (pType === 'FIXED_DISCOUNT') {
              displayPriceStr = `-${formatCurrency(promo.discountAmount || 0)} x unidad`;
              discountNote = targetProd ? `En ${targetProd.name}` : 'En producto';
            } else if (pType === 'BULK_PRICE') {
              displayPriceStr = `${formatCurrency(promo.price)} c/u (x${promo.minQuantity || 3}+ u.)`;
              discountNote = targetProd ? `En ${targetProd.name}` : 'Por volumen';
            }

            const availableCombos = pType === 'COMBO' ? calculateAvailableComboStock(promo) : null;

            return (
              <div
                key={promo.id}
                className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                  isActiveNow
                    ? 'border-blue-300 ring-1 ring-blue-100'
                    : promo.status === 'ACTIVE'
                    ? 'border-slate-200 hover:border-blue-200'
                    : 'border-slate-200 opacity-70 bg-slate-50/60'
                }`}
              >
                <div className="p-4 flex-1 flex flex-col space-y-3">
                  {/* Top Bar: Code, Type Badge, Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-[11px] font-black rounded-lg tracking-wider flex items-center gap-1 shadow-xs">
                        <Tag className="w-3 h-3 text-amber-400 shrink-0" />
                        {promo.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-extrabold rounded-lg border flex items-center gap-1 ${typeConfig.color}`}
                      >
                        <TypeIcon className="w-3 h-3" />
                        {typeConfig.label}
                      </span>
                    </div>

                    {/* Active Status Badge */}
                    {isActiveNow ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Activa Hoy
                      </span>
                    ) : promo.status === 'ACTIVE' ? (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-full shrink-0">
                        Programada
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full shrink-0">
                        Pausada
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4 className="text-sm font-black text-slate-900 line-clamp-1">{promo.name}</h4>
                    {promo.description ? (
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                        {promo.description}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-0.5">{discountNote}</p>
                    )}
                  </div>

                  {/* Price / Offer Highlight Banner */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Condición / Precio
                      </span>
                      <span className="text-base font-black text-blue-700">{displayPriceStr}</span>
                    </div>
                    {discountNote && pType === 'COMBO' && retailReference > 0 && (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 line-through block">
                          {formatCurrency(retailReference)}
                        </span>
                        <span className="text-[11px] font-extrabold text-emerald-600 flex items-center gap-0.5 justify-end">
                          <TrendingDown className="w-3 h-3" />
                          {discountNote}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Items breakdown for COMBO */}
                  {pType === 'COMBO' && promo.items && promo.items.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                        <span>Contenido del paquete:</span>
                        {availableCombos !== null && (
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                              availableCombos > 0
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {availableCombos > 0
                              ? `${availableCombos} packs listos`
                              : 'Sin stock componente'}
                          </span>
                        )}
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2 border border-slate-100 space-y-1 text-xs max-h-24 overflow-y-auto">
                        {promo.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-[11px] text-slate-700"
                          >
                            <span className="truncate pr-2">
                              • <strong>{it.quantity}x</strong> {it.productName}
                            </span>
                            <span className="font-mono text-slate-500 shrink-0">
                              {formatCurrency(it.unitPrice)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Schedule & Days pills */}
                  <div className="pt-1 flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
                    <div className="flex items-center gap-1 font-bold text-slate-600 mr-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Días:</span>
                    </div>
                    {DAYS_OF_WEEK.map((d) => {
                      const isDayActive =
                        !promo.activeDays ||
                        promo.activeDays.length === 0 ||
                        promo.activeDays.includes(d.id);
                      return (
                        <span
                          key={d.id}
                          className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center ${
                            isDayActive
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-300'
                          }`}
                          title={d.label}
                        >
                          {d.short}
                        </span>
                      );
                    })}

                    {(promo.startTime || promo.endTime) && (
                      <span className="ml-1 px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded font-bold flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {promo.startTime || '00:00'} - {promo.endTime || '23:59'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="bg-slate-50/80 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onToggleStatus(promo.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                      promo.status === 'ACTIVE'
                        ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    {promo.status === 'ACTIVE' ? 'Pausar' : 'Activar'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDuplicatePromo(promo)}
                      className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                      title="Duplicar Promoción"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(promo)}
                      className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                      title="Editar Promoción"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => setPromoToDelete(promo)}
                        className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar Promoción"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT PROMOTION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-auto overflow-hidden flex flex-col max-h-[95vh]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/30 rounded-lg text-blue-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">
                    {editingPromo ? 'Editar Promoción / Oferta' : 'Crear Nueva Promoción'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Configuración de reglas automáticas de descuento y combos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form
              onSubmit={handleSubmitPromo}
              className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs select-none"
            >
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Promotion Type Selector Tabs */}
              <div>
                <label className="font-extrabold text-slate-700 block mb-1.5 uppercase tracking-wider text-[11px]">
                  Tipo de Promoción *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(PROMOTION_TYPE_LABELS) as PromotionType[]).map((typeKey) => {
                    const cfg = PROMOTION_TYPE_LABELS[typeKey];
                    const IconComponent = cfg.icon;
                    const isSelected = formType === typeKey;
                    return (
                      <button
                        key={typeKey}
                        type="button"
                        onClick={() => setFormType(typeKey)}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-400/50 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-black text-xs text-slate-800">
                          <IconComponent
                            className={`w-4 h-4 ${
                              isSelected ? 'text-blue-600' : 'text-slate-500'
                            }`}
                          />
                          <span>{cfg.label.split('(')[0]}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                          {cfg.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Basic Details: Code, Name, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Código Único *:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. COMBO001"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-500 uppercase"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">
                    Nombre Descriptivo de la Promoción *:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Combo Merienda: Café + Medialunas"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Descripción / Letra Chica (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ej. Válido de lunes a viernes pagando en efectivo o débito"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* DYNAMIC SECTION: BASED ON PROMOTION TYPE */}

              {/* 1. COMBO / PACK BUILDER */}
              {formType === 'COMBO' && (
                <div className="space-y-3 bg-blue-50/40 p-3.5 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-blue-900 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-blue-600" />
                      Artículos incluidos en el Combo
                    </span>
                    <span className="text-[11px] text-blue-700 font-bold">
                      {formItems.length} artículo(s) asociados
                    </span>
                  </div>

                  {/* Add item to combo picker */}
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="flex-1 w-full px-3 py-2 bg-white border border-blue-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.barcode}) - Precio: {formatCurrency(p.salePrice)} (Stock: {p.stock})
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="flex items-center bg-white border border-blue-300 rounded-xl px-2 py-1">
                        <span className="text-slate-500 font-bold mr-1">Cant:</span>
                        <input
                          type="number"
                          min="1"
                          value={selectedQty}
                          onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-12 text-center font-black focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddProductToCombo}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>

                  {/* List of combo items */}
                  {formItems.length === 0 ? (
                    <div className="p-4 bg-white/80 rounded-xl border border-blue-100 text-center text-slate-400">
                      Agrega los productos que componen este paquete promocional.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {formItems.map((item) => (
                        <div
                          key={item.productId}
                          className="p-2 bg-white rounded-xl border border-blue-100 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{item.productName}</span>
                            <span className="text-slate-400 font-mono">
                              ({formatCurrency(item.unitPrice)} c/u)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(item.productId, -1)}
                                className="w-5 h-5 flex items-center justify-center font-bold text-slate-600 hover:bg-white rounded cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-6 text-center font-black">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(item.productId, 1)}
                                className="w-5 h-5 flex items-center justify-center font-bold text-slate-600 hover:bg-white rounded cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveProductFromCombo(item.productId)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Combo Sale Price Input */}
                  <div>
                    <label className="font-black text-blue-900 block mb-1">
                      Precio Final de Venta del Combo ($) *:
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-blue-400 rounded-xl text-lg font-black text-blue-700 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* 2. BOGO 2X1 / 3X2 */}
              {formType === 'BOGO_2X1' && (
                <div className="space-y-3 bg-purple-50/40 p-3.5 rounded-xl border border-purple-200">
                  <div className="font-black text-purple-900 flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-purple-600" />
                    Configuración de Oferta Lleva X Paga Y (Ej. 2x1, 3x2)
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Producto participante *:</label>
                    <select
                      value={formTargetProductId}
                      onChange={(e) => setFormTargetProductId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-bold text-slate-800"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.barcode}) - Precio Unitario: {formatCurrency(p.salePrice)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Cantidad que lleva el cliente (X):
                      </label>
                      <input
                        type="number"
                        min="2"
                        value={formMinQuantity}
                        onChange={(e) => setFormMinQuantity(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-black text-purple-800 text-center text-sm"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Cantidad que paga el cliente (Y):
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formPayQuantity}
                        onChange={(e) => setFormPayQuantity(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-black text-purple-800 text-center text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. SECOND UNIT DISCOUNT */}
              {formType === 'SECOND_UNIT_DISCOUNT' && (
                <div className="space-y-3 bg-pink-50/40 p-3.5 rounded-xl border border-pink-200">
                  <div className="font-black text-pink-900 flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-pink-600" />
                    Descuento en la 2da Unidad
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Producto participante *:</label>
                    <select
                      value={formTargetProductId}
                      onChange={(e) => setFormTargetProductId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-pink-300 rounded-xl font-bold text-slate-800"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.barcode}) - Precio Unitario: {formatCurrency(p.salePrice)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Porcentaje de descuento en la 2da unidad (%):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={formSecondUnitDiscountPercent}
                        onChange={(e) => setFormSecondUnitDiscountPercent(e.target.value)}
                        className="w-28 px-3 py-2 bg-white border border-pink-300 rounded-xl font-black text-pink-800 text-center text-sm"
                      />
                      <div className="flex items-center gap-1">
                        {[50, 70, 80].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setFormSecondUnitDiscountPercent(preset.toString())}
                            className="px-2 py-1 bg-pink-100 hover:bg-pink-200 text-pink-800 rounded-lg font-extrabold text-xs cursor-pointer"
                          >
                            {preset}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. PERCENTAGE DIRECT DISCOUNT */}
              {formType === 'PERCENTAGE_DISCOUNT' && (
                <div className="space-y-3 bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-200">
                  <div className="font-black text-emerald-900 flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-emerald-600" />
                    Descuento Porcentual Directo
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Por Producto Específico:
                      </label>
                      <select
                        value={formTargetProductId}
                        onChange={(e) => {
                          setFormTargetProductId(e.target.value);
                          if (e.target.value) setFormTargetDepartmentId('');
                        }}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-slate-800"
                      >
                        <option value="">-- Ninguno (o usar Departamento) --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({formatCurrency(p.salePrice)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        O Todo un Departamento:
                      </label>
                      <select
                        value={formTargetDepartmentId}
                        onChange={(e) => {
                          setFormTargetDepartmentId(e.target.value);
                          if (e.target.value) setFormTargetProductId('');
                        }}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-slate-800"
                      >
                        <option value="">-- Ninguno (o usar Producto) --</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Porcentaje de Descuento (%):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={formDiscountPercentage}
                        onChange={(e) => setFormDiscountPercentage(e.target.value)}
                        className="w-28 px-3 py-2 bg-white border border-emerald-300 rounded-xl font-black text-emerald-800 text-center text-sm"
                      />
                      <div className="flex items-center gap-1">
                        {[10, 15, 20, 25, 50].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setFormDiscountPercentage(preset.toString())}
                            className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg font-extrabold text-xs cursor-pointer"
                          >
                            {preset}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. FIXED AMOUNT DISCOUNT */}
              {formType === 'FIXED_DISCOUNT' && (
                <div className="space-y-3 bg-amber-50/40 p-3.5 rounded-xl border border-amber-200">
                  <div className="font-black text-amber-900 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-amber-600" />
                    Descuento en Monto Fijo ($)
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Producto participante *:</label>
                    <select
                      value={formTargetProductId}
                      onChange={(e) => setFormTargetProductId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-bold text-slate-800"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.barcode}) - Precio Normal: {formatCurrency(p.salePrice)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Monto a descontar por unidad ($) *:
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Ej. 500"
                      value={formDiscountAmount}
                      onChange={(e) => setFormDiscountAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-black text-amber-800 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* 6. BULK VOLUME PRICING */}
              {formType === 'BULK_PRICE' && (
                <div className="space-y-3 bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-200">
                  <div className="font-black text-indigo-900 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-indigo-600" />
                    Precio Especial por Cantidad (Volumen)
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Producto participante *:</label>
                    <select
                      value={formTargetProductId}
                      onChange={(e) => setFormTargetProductId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl font-bold text-slate-800"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.barcode}) - Precio Normal: {formatCurrency(p.salePrice)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        A partir de cuántas unidades (Mínimo):
                      </label>
                      <input
                        type="number"
                        min="2"
                        value={formMinQuantity}
                        onChange={(e) => setFormMinQuantity(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl font-black text-indigo-800 text-center text-sm"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Precio Unitario Especial ($):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl font-black text-indigo-800 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* FINANCIAL LIVE SIMULATOR */}
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-black text-xs text-amber-400 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    Simulador Financiero en Tiempo Real
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">Proyección por Venta</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Precio Regular:</span>
                    <span className="font-mono font-bold text-slate-200">
                      {formatCurrency(financialPreview.regularTotal)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Precio Promoción:</span>
                    <span className="font-mono font-black text-blue-400">
                      {formatCurrency(financialPreview.promoPrice)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Ahorro Cliente:</span>
                    <span className="font-mono font-black text-emerald-400">
                      {formatCurrency(financialPreview.savings)} ({financialPreview.savingsPercent}%)
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Margen Bruto Est.:</span>
                    <span
                      className={`font-mono font-black ${
                        financialPreview.margin >= 20 ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {financialPreview.margin}% ({formatCurrency(financialPreview.profit)})
                    </span>
                  </div>
                </div>
              </div>

              {/* SCHEDULE, DAYS & HAPPY HOUR */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Días y Horarios de Vigencia
                  </span>
                  <div className="flex items-center gap-1 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setFormActiveDays([0, 1, 2, 3, 4, 5, 6])}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormActiveDays([1, 2, 3, 4, 5])}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Lun-Vie
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormActiveDays([6, 0])}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Finde
                    </button>
                  </div>
                </div>

                {/* Day selector toggles */}
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = formActiveDays.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDay(d.id)}
                        className={`py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex flex-col items-center ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>{d.short}</span>
                        <span className="text-[9px] font-medium hidden sm:inline">{d.label.slice(0, 3)}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Happy Hour Time Window */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Hora Inicio (Happy Hour):
                    </label>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Hora Fin:</label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                {/* Date range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Fecha Desde (Opcional):</label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Fecha Hasta (Opcional):</label>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Status Toggle in Form */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="font-extrabold text-slate-800 block">Estado Inicial</span>
                  <span className="text-[11px] text-slate-500">
                    Puedes pausar o activar la promoción en cualquier momento.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormStatus(formStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition-colors cursor-pointer ${
                    formStatus === 'ACTIVE'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {formStatus === 'ACTIVE' ? '🟢 Activa' : '⏸️ Pausada'}
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-black shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Guardando...' : editingPromo ? 'Guardar Cambios' : 'Crear Promoción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {promoToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">¿Eliminar Promoción?</h3>
              <p className="text-xs text-slate-500">
                Estás por eliminar la promoción <strong>"{promoToDelete.name}"</strong> (Código:{' '}
                {promoToDelete.code}).
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                <strong>Nota:</strong> Esta acción no eliminará los productos de tu inventario ni
                afectará las ventas ya cobradas en el historial.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPromoToDelete(null)}
                className="px-4 py-2 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (promoToDelete) {
                    await onDeletePromotion(promoToDelete.id);
                    setPromoToDelete(null);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Sí, Eliminar Promoción
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
