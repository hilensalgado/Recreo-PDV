import { CartItem, Product, Promotion, Customer, PromotionType, PaymentMethod } from '../types/pos';

/**
 * Standard rounding for currency to avoid floating-point math issues.
 * E.g., 0.1 + 0.2 -> 0.30 instead of 0.30000000000000004
 */
export function roundCurrency(value: number): number {
  if (isNaN(value) || !isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Formats a numeric currency value into standardized Argentine/Latin American currency format.
 * E.g., $ 1.250,50
 */
export function formatCurrency(value: number | undefined | null): string {
  const numeric = typeof value === 'number' && !isNaN(value) ? value : 0;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

/**
 * Checks if a promotion is currently active according to date range, active days, and time schedule.
 */
export function isPromotionActiveNow(promo: Promotion, now: Date = new Date()): boolean {
  if (promo.status !== 'ACTIVE') return false;

  const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  if (promo.activeDays && promo.activeDays.length > 0) {
    if (!promo.activeDays.includes(currentDayOfWeek)) {
      return false;
    }
  }

  // Check date range
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const currentDateStr = `${year}-${month}-${day}`;

  if (promo.startDate && currentDateStr < promo.startDate) {
    return false;
  }
  if (promo.endDate && currentDateStr > promo.endDate) {
    return false;
  }

  // Check time of day (Happy Hour)
  if (promo.startTime || promo.endTime) {
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    if (promo.startTime && currentTimeStr < promo.startTime) {
      return false;
    }
    if (promo.endTime && currentTimeStr > promo.endTime) {
      return false;
    }
  }

  return true;
}

export interface PricingCalculationResult {
  unitPrice: number;
  isWholesaleApplied: boolean;
  itemSubtotal: number;
  itemDiscount: number;
  itemTotal: number;
}

/**
 * Evaluates the effective unit price, wholesale applicability, and line totals for a product in cart.
 */
export function calculateItemPricing(
  product: Product,
  quantity: number,
  customDiscountPercent: number = 0,
  isPromotion: boolean = false,
  forcedUnitPrice?: number
): PricingCalculationResult {
  const safeQty = Math.max(0, quantity);
  let effectiveUnitPrice = product.salePrice;
  let isWholesaleApplied = false;

  if (isPromotion && typeof forcedUnitPrice === 'number') {
    effectiveUnitPrice = forcedUnitPrice;
  } else {
    // Check wholesale tier
    if (
      product.wholesalePrice > 0 &&
      product.wholesaleMinQty > 0 &&
      safeQty >= product.wholesaleMinQty
    ) {
      effectiveUnitPrice = product.wholesalePrice;
      isWholesaleApplied = true;
    } else {
      effectiveUnitPrice = product.salePrice;
    }
  }

  const roundedUnitPrice = roundCurrency(effectiveUnitPrice);
  const itemSubtotal = roundCurrency(roundedUnitPrice * safeQty);
  const discountPercent = Math.min(100, Math.max(0, customDiscountPercent || 0));
  const itemDiscount = roundCurrency((itemSubtotal * discountPercent) / 100);
  const itemTotal = roundCurrency(itemSubtotal - itemDiscount);

  return {
    unitPrice: roundedUnitPrice,
    isWholesaleApplied,
    itemSubtotal,
    itemDiscount,
    itemTotal,
  };
}

export interface EvaluatePromotionsResult {
  items: CartItem[];
  subtotal: number;
  totalOriginalSubtotal: number;
  totalPromoSavings: number;
  totalDiscount: number;
  appliedPromosCount: number;
  total: number;
}

/**
 * Automatically applies active promotions (Combos, 2x1, 3x2, % 2da unidad, Descuento directo, Volumen)
 * to the given cart items.
 */
export function evaluateAutomaticPromotions(
  items: CartItem[],
  promotions: Promotion[],
  customer?: Customer | null,
  now: Date = new Date()
): EvaluatePromotionsResult {
  const activePromos = promotions.filter((p) => isPromotionActiveNow(p, now));

  const empDiscount =
    customer &&
    (customer.isEmployee ||
      (customer.employeeDiscountPercentage && customer.employeeDiscountPercentage > 0))
      ? customer.employeeDiscountPercentage || 10
      : 0;

  let totalOriginalSubtotal = 0;
  let totalPromoSavings = 0;
  let appliedPromosCount = 0;

  const processedItems: CartItem[] = items.map((item) => {
    // If it is an explicit Bundle Combo product
    if (item.isPromotion && item.promotionItems && item.promotionItems.length > 0) {
      const lineSubtotal = roundCurrency(item.unitPrice * item.quantity);
      const lineDiscount = roundCurrency((lineSubtotal * (item.discountPercentage || empDiscount)) / 100);
      const lineTotal = roundCurrency(lineSubtotal - lineDiscount);

      // Estimate component standalone total
      const standaloneSum = item.promotionItems.reduce((acc, comp) => {
        return acc + (comp.unitPrice || 0) * comp.quantity * item.quantity;
      }, 0);

      const comboSavings = Math.max(0, roundCurrency(standaloneSum - lineSubtotal));
      totalOriginalSubtotal += standaloneSum > 0 ? standaloneSum : lineSubtotal;
      totalPromoSavings += comboSavings + lineDiscount;
      appliedPromosCount++;

      return {
        ...item,
        originalUnitPrice: standaloneSum > 0 ? roundCurrency(standaloneSum / item.quantity) : item.unitPrice,
        subtotal: lineSubtotal,
        total: lineTotal,
        appliedPromotionName: item.notes || 'Combo Especial',
        appliedPromotionType: 'COMBO' as PromotionType,
        promoDiscountAmount: comboSavings + lineDiscount,
      };
    }

    const product = item.product;
    const baseSalePrice = product ? product.salePrice : item.unitPrice;
    const originalSubtotal = roundCurrency(baseSalePrice * item.quantity);
    totalOriginalSubtotal += originalSubtotal;

    // Check matching active promotions for this item
    // Match precedence: specific targetProductId > targetDepartmentId
    const matchingPromo = activePromos.find(
      (p) =>
        (p.targetProductId && p.targetProductId === item.productId) ||
        (p.targetDepartmentId && product && p.targetDepartmentId === product.departmentId)
    );

    let effectiveUnitPrice = baseSalePrice;
    let promoDiscountForLine = 0;
    let appliedPromoName: string | undefined = undefined;
    let appliedPromoType: PromotionType | undefined = undefined;
    let isWholesale = false;

    // Wholesale check
    if (
      product &&
      product.wholesalePrice > 0 &&
      product.wholesaleMinQty > 0 &&
      item.quantity >= product.wholesaleMinQty
    ) {
      effectiveUnitPrice = product.wholesalePrice;
      isWholesale = true;
    }

    if (matchingPromo) {
      const pType = matchingPromo.type || 'PERCENTAGE_DISCOUNT';

      if (pType === 'BOGO_2X1') {
        const minQ = matchingPromo.minQuantity || 2;
        const payQ = matchingPromo.payQuantity || 1;
        if (item.quantity >= minQ) {
          const sets = Math.floor(item.quantity / minQ);
          const remainder = item.quantity % minQ;
          const paidUnits = sets * payQ + remainder;
          const costBeforeExtraDiscount = paidUnits * effectiveUnitPrice;
          promoDiscountForLine = roundCurrency(item.quantity * effectiveUnitPrice - costBeforeExtraDiscount);
          appliedPromoName = matchingPromo.name;
          appliedPromoType = 'BOGO_2X1';
        }
      } else if (pType === 'SECOND_UNIT_DISCOUNT') {
        const discPercent = matchingPromo.secondUnitDiscountPercent || matchingPromo.discountPercentage || 50;
        if (item.quantity >= 2) {
          const pairs = Math.floor(item.quantity / 2);
          const discountPerPair = roundCurrency((effectiveUnitPrice * discPercent) / 100);
          promoDiscountForLine = roundCurrency(pairs * discountPerPair);
          appliedPromoName = `${matchingPromo.name} (-${discPercent}% en 2da u.)`;
          appliedPromoType = 'SECOND_UNIT_DISCOUNT';
        }
      } else if (pType === 'PERCENTAGE_DISCOUNT') {
        const pct = matchingPromo.discountPercentage || 0;
        if (pct > 0) {
          promoDiscountForLine = roundCurrency((item.quantity * effectiveUnitPrice * pct) / 100);
          appliedPromoName = `${matchingPromo.name} (-${pct}%)`;
          appliedPromoType = 'PERCENTAGE_DISCOUNT';
        }
      } else if (pType === 'FIXED_DISCOUNT') {
        const amount = matchingPromo.discountAmount || 0;
        if (amount > 0) {
          promoDiscountForLine = roundCurrency(Math.min(item.quantity * effectiveUnitPrice, item.quantity * amount));
          appliedPromoName = `${matchingPromo.name} (-${formatCurrency(amount)}/u)`;
          appliedPromoType = 'FIXED_DISCOUNT';
        }
      } else if (pType === 'BULK_PRICE') {
        const minQ = matchingPromo.minQuantity || 3;
        if (item.quantity >= minQ && matchingPromo.price > 0) {
          effectiveUnitPrice = matchingPromo.price;
          promoDiscountForLine = roundCurrency(Math.max(0, (baseSalePrice - matchingPromo.price) * item.quantity));
          appliedPromoName = `${matchingPromo.name} (${formatCurrency(matchingPromo.price)} x ${minQ}+ u.)`;
          appliedPromoType = 'BULK_PRICE';
        }
      }
    }

    const subtotalBeforeManualDiscount = roundCurrency(effectiveUnitPrice * item.quantity);
    const manualOrEmpDiscountPct = Math.max(item.discountPercentage || 0, empDiscount);
    const extraDiscount = roundCurrency((subtotalBeforeManualDiscount * manualOrEmpDiscountPct) / 100);

    const totalLineDiscount = roundCurrency(promoDiscountForLine + extraDiscount);
    const finalLineTotal = roundCurrency(Math.max(0, originalSubtotal - totalLineDiscount));

    if (promoDiscountForLine > 0) {
      appliedPromosCount++;
      totalPromoSavings += promoDiscountForLine;
    }
    if (extraDiscount > 0) {
      totalPromoSavings += extraDiscount;
    }

    return {
      ...item,
      unitPrice: effectiveUnitPrice,
      originalUnitPrice: baseSalePrice,
      isWholesaleApplied: isWholesale,
      subtotal: subtotalBeforeManualDiscount,
      total: finalLineTotal,
      appliedPromotionId: matchingPromo?.id,
      appliedPromotionName: appliedPromoName,
      appliedPromotionType: appliedPromoType,
      promoDiscountAmount: promoDiscountForLine,
    };
  });

    const subtotal = roundCurrency(
    processedItems.reduce((sum, it) => sum + (it.subtotal || (it.unitPrice * it.quantity)), 0)
  );
  const totalCustomerDiscounts = roundCurrency(
    processedItems.reduce((acc, item) => {
      const lineSub = item.subtotal || (item.unitPrice * item.quantity);
      const manualOrEmpPct = Math.max(item.discountPercentage || 0, empDiscount);
      return acc + (lineSub * manualOrEmpPct) / 100;
    }, 0)
  );
  const finalTotal = roundCurrency(
    processedItems.reduce((sum, it) => sum + (it.total ?? (it.unitPrice * it.quantity)), 0)
  );
  const canonicalSubtotal = roundCurrency(totalOriginalSubtotal || subtotal);
  const canonicalDiscount = roundCurrency(Math.max(0, canonicalSubtotal - finalTotal));

  return {
    items: processedItems,
    subtotal: canonicalSubtotal,
    totalOriginalSubtotal: canonicalSubtotal,
    totalPromoSavings: roundCurrency(totalPromoSavings || 0),
    totalDiscount: canonicalDiscount,
    appliedPromosCount,
    total: finalTotal,
  };
}

export interface CartTotalsResult {
  subtotal: number;
  totalDiscount: number;
  total: number;
  itemsCount: number;
  piecesCount: number;
}

/**
 * Calculates cart totals accurately across all items.
 */
export function calculateCartTotals(
  items: CartItem[],
  customer?: Customer | null
): CartTotalsResult {
  let subtotal = 0;
  let totalDiscount = 0;
  let piecesCount = 0;

  for (const item of items) {
    const qty = Math.max(0, item.quantity);
    piecesCount += qty;

    const basePrice = item.originalUnitPrice || item.product?.salePrice || item.unitPrice;
    const lineOriginalSubtotal = roundCurrency(basePrice * qty);
    const lineFinalTotal = item.total !== undefined ? item.total : roundCurrency(item.unitPrice * qty);
    const lineDiscount = roundCurrency(Math.max(0, lineOriginalSubtotal - lineFinalTotal));

    subtotal = roundCurrency(subtotal + lineOriginalSubtotal);
    totalDiscount = roundCurrency(totalDiscount + lineDiscount);
  }

  const finalTotal = roundCurrency(Math.max(0, subtotal - totalDiscount));

  return {
    subtotal,
    totalDiscount,
    total: finalTotal,
    itemsCount: items.length,
    piecesCount: roundCurrency(piecesCount),
  };
}

/**
 * Calculates change given based on payment amounts.
 */
export function calculateChange(
  paymentMethod: PaymentMethod,
  total: number,
  cashPaid: number,
  cardPaid: number = 0
): number {
  if (paymentMethod === 'EFECTIVO') {
    return roundCurrency(Math.max(0, cashPaid - total));
  }
  if (paymentMethod === 'MIXTO') {
    const totalPaid = roundCurrency(cashPaid + cardPaid);
    return roundCurrency(Math.max(0, totalPaid - total));
  }
  return 0;
}

