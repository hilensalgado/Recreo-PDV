import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  CreditCard,
  UserCheck,
  Split,
  X,
  CheckCircle2,
  Printer,
  Coins,
  AlertCircle,
  BadgePercent,
  Award,
  Sparkles,
  QrCode,
  ArrowRightLeft,
} from 'lucide-react';
import { CartItem, Customer, PaymentMethod, LoyaltyProgramConfig } from '../types/pos';
import { calculateChange, roundCurrency, formatCurrency } from '../utils/pricingEngine';

interface CheckoutModalProps {
  items: CartItem[];
  total: number;
  customer?: Customer;
  loyaltyConfig?: LoyaltyProgramConfig;
  activeRegisterName: string;
  onClose: () => void;
  onCompleteSale: (data: {
    paymentMethod: PaymentMethod;
    cashPaid: number;
    cardPaid: number;
    shouldPrintReceipt: boolean;
    clientTransactionId?: string;
    pointsRedeemed?: number;
    pointsDiscountAmount?: number;
  }) => Promise<void> | void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  items,
  total,
  customer,
  loyaltyConfig,
  activeRegisterName,
  onClose,
  onCompleteSale,
}) => {
  const baseTotal = typeof total === 'number' && !isNaN(total) ? total : 0;
  
  // Loyalty points redemption state
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [pointsToRedeemInput, setPointsToRedeemInput] = useState<string>('0');

  const customerPoints = customer?.points ?? customer?.pointsBalance ?? 0;
  const pointVal = loyaltyConfig?.pointValueInCurrency || 1;
  const minPoints = loyaltyConfig?.minPointsToRedeem || 10;
  const isLoyaltyActive = Boolean(loyaltyConfig?.enabled && customer && customerPoints >= minPoints);

  // Calculate points discount
  const pointsToRedeemNum = redeemPoints ? Math.min(customerPoints, parseInt(pointsToRedeemInput, 10) || 0) : 0;
  const pointsDiscountAmount = roundCurrency(pointsToRedeemNum * pointVal);
  const safeTotal = Math.max(0, roundCurrency(baseTotal - pointsDiscountAmount));

  // Projected points to earn
  const pointsPerAmt = loyaltyConfig?.pointsPerAmount || 100;
  const projectedPointsEarned = loyaltyConfig?.enabled ? Math.floor(safeTotal / pointsPerAmt) : 0;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('EFECTIVO');
  const [cashPaidInput, setCashPaidInput] = useState<string>(safeTotal.toFixed(2));
  const [cardPaidInput, setCardPaidInput] = useState<string>('0.00');
  const [shouldPrintReceipt, setShouldPrintReceipt] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [transactionToken] = useState<string>(() => `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

  // Update cash paid input whenever total after points discount changes
  useEffect(() => {
    if (paymentMethod === 'EFECTIVO') {
      setCashPaidInput(safeTotal.toFixed(2));
    }
  }, [safeTotal, paymentMethod]);

  const numericCash = parseFloat(cashPaidInput) || 0;
  const numericCard = parseFloat(cardPaidInput) || 0;

  // Change calculation using unified engine
  const safeCash = roundCurrency(numericCash);
  const safeCard = roundCurrency(numericCard);
  const changeGiven = calculateChange(paymentMethod, safeTotal, safeCash, safeCard);
  let isPaymentValid = true;

  if (safeTotal === 0 && pointsDiscountAmount >= baseTotal) {
    isPaymentValid = true;
  } else if (paymentMethod === 'EFECTIVO') {
    isPaymentValid = safeCash >= safeTotal;
  } else if (paymentMethod === 'TARJETA' || paymentMethod === 'TRANSFERENCIA' || paymentMethod === 'QR') {
    isPaymentValid = true;
  } else if (paymentMethod === 'CREDITO') {
    if (!customer) {
      isPaymentValid = false;
    } else {
      const remainingLimit = roundCurrency((customer.creditLimit || 0) - (customer.creditBalance || 0));
      isPaymentValid = remainingLimit >= safeTotal;
    }
  } else if (paymentMethod === 'MIXTO') {
    const totalPaid = roundCurrency(safeCash + safeCard);
    isPaymentValid = totalPaid >= safeTotal;
  }

  // Fast cash bill buttons
  const addBill = (amount: number) => {
    setCashPaidInput((amount || 0).toFixed(2));
  };

  const handleProcess = async () => {
    if (!isPaymentValid || isSubmitting) return;

    try {
      setIsSubmitting(true);
      let finalCash = 0;
      let finalCard = 0;

      if (paymentMethod === 'EFECTIVO') {
        finalCash = numericCash;
      } else if (paymentMethod === 'TARJETA') {
        finalCard = safeTotal;
      } else if (paymentMethod === 'MIXTO') {
        finalCash = numericCash;
        finalCard = numericCard;
      }

      await onCompleteSale({
        paymentMethod,
        cashPaid: finalCash,
        cardPaid: finalCard,
        shouldPrintReceipt,
        clientTransactionId: transactionToken,
        pointsRedeemed: pointsToRedeemNum,
        pointsDiscountAmount,
      });
    } catch (err) {
      console.error('Error in checkout:', err);
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcut listener inside Checkout Modal (F2 or Enter to finalize payment)
  useEffect(() => {
    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (isSubmitting) return;

      if (e.key === 'F2' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (isPaymentValid && !isSubmitting) {
          handleProcess();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (!isSubmitting) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleModalKeyDown, true);
    return () => window.removeEventListener('keydown', handleModalKeyDown, true);
  }, [isPaymentValid, isSubmitting, paymentMethod, numericCash, numericCard, shouldPrintReceipt, safeTotal, customer, transactionToken, pointsToRedeemNum, pointsDiscountAmount]);

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="font-extrabold text-lg text-white leading-none">Módulo de Cobro</h2>
              <p className="text-xs text-slate-400 mt-0.5">{activeRegisterName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Employee Discount Banner if active */}
          {customer && (customer.isEmployee || (customer.employeeDiscountPercentage && customer.employeeDiscountPercentage > 0)) && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-lg">
                  <BadgePercent className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                    <span>Descuento de Empleado Aplicado</span>
                  </div>
                  <div className="text-[11px] text-emerald-800 font-medium">
                    Empleado: <strong className="text-emerald-950">{customer.name}</strong>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded-md shadow-2xs">
                  {customer.employeeDiscountPercentage || 10}% DESC
                </span>
              </div>
            </div>
          )}

          {/* Loyalty Points Redemption Box */}
          {customer && loyaltyConfig?.enabled && (
            <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500 text-white rounded-lg">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">
                      Programa de Fidelización: {customer.name}
                    </span>
                    <span className="text-[11px] text-amber-800">
                      Saldo disponible: <strong>{customerPoints} puntos</strong> ({formatCurrency(customerPoints * pointVal)} de dto)
                    </span>
                  </div>
                </div>

                {customerPoints >= minPoints ? (
                  <button
                    type="button"
                    onClick={() => {
                      const next = !redeemPoints;
                      setRedeemPoints(next);
                      if (next) {
                        const maxRedeem = Math.min(customerPoints, Math.ceil(baseTotal / pointVal));
                        setPointsToRedeemInput(maxRedeem.toString());
                      }
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      redeemPoints
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                        : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    {redeemPoints ? '✓ Canje Aplicado' : 'Canjear Puntos'}
                  </button>
                ) : (
                  <span className="text-[10px] text-amber-700 bg-amber-100/80 px-2 py-1 rounded font-medium">
                    Mínimo {minPoints} pts para canjear
                  </span>
                )}
              </div>

              {redeemPoints && (
                <div className="pt-2 border-t border-amber-200 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-amber-900">Puntos a canjear:</span>
                    <input
                      type="number"
                      min="1"
                      max={customerPoints}
                      value={pointsToRedeemInput}
                      onChange={(e) => setPointsToRedeemInput(e.target.value)}
                      className="w-20 px-2 py-1 text-center font-bold border border-amber-300 rounded bg-white"
                    />
                  </div>
                  <div className="font-black text-amber-900">
                    Descuento: -{formatCurrency(pointsDiscountAmount)}
                  </div>
                </div>
              )}

              {projectedPointsEarned > 0 && (
                <div className="text-[10px] text-amber-800 flex items-center gap-1 font-medium">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Esta compra sumará <strong>+{projectedPointsEarned} puntos</strong> al cliente</span>
                </div>
              )}
            </div>
          )}

          {/* Big Amount Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Total a Cobrar
              </span>
              <span className="text-xs text-slate-500">
                {items.length} artículos {pointsDiscountAmount > 0 ? `(Descuento puntos: -$${pointsDiscountAmount.toFixed(2)})` : ''}
              </span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-emerald-600 tracking-tight">
                ${safeTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-slate-400 block font-bold">ARS ($)</span>
            </div>
          </div>

          {/* Payment Method Tabs */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
              Método de Pago:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('EFECTIVO');
                  setCashPaidInput(safeTotal.toFixed(2));
                }}
                className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'EFECTIVO'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Coins className="w-5 h-5 text-emerald-600" />
                <span>Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('TARJETA')}
                className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'TARJETA'
                    ? 'bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-500/20 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>Tarjeta TPV</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('TRANSFERENCIA')}
                className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'TRANSFERENCIA'
                    ? 'bg-teal-50 border-teal-500 text-teal-800 ring-2 ring-teal-500/20 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowRightLeft className="w-5 h-5 text-teal-600" />
                <span>Transferencia</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('QR')}
                className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'QR'
                    ? 'bg-cyan-50 border-cyan-500 text-cyan-800 ring-2 ring-cyan-500/20 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-5 h-5 text-cyan-600" />
                <span>QR / Billetera</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CREDITO')}
                className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'CREDITO'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-800 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <span>A Crédito (Fiado)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('MIXTO');
                  setCashPaidInput((safeTotal / 2).toFixed(2));
                  setCardPaidInput((safeTotal / 2).toFixed(2));
                }}
                className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'MIXTO'
                    ? 'bg-purple-50 border-purple-500 text-purple-800 ring-2 ring-purple-500/20 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Split className="w-5 h-5 text-purple-600" />
                <span>Pago Mixto</span>
              </button>
            </div>
          </div>

          {/* TARJETA Details */}
          {paymentMethod === 'TARJETA' && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-1.5 text-xs text-blue-900">
              <div className="font-bold flex items-center gap-1.5 text-blue-800">
                <CreditCard className="w-4 h-4" /> Cobro con Tarjeta (Débito / Crédito)
              </div>
              <p className="text-blue-700">
                Ingrese el monto exacto de <strong>${safeTotal.toFixed(2)}</strong> en el lector Posnet / Terminal de Pago.
              </p>
            </div>
          )}

          {/* TRANSFERENCIA Details */}
          {paymentMethod === 'TRANSFERENCIA' && (
            <div className="bg-teal-50 border border-teal-200 p-4 rounded-xl space-y-1.5 text-xs text-teal-900">
              <div className="font-bold flex items-center gap-1.5 text-teal-800">
                <ArrowRightLeft className="w-4 h-4" /> Cobro por Transferencia Bancaria (CBU / Alias / CVU)
              </div>
              <p className="text-teal-700">
                Verifique que la transferencia por <strong>${safeTotal.toFixed(2)}</strong> impactó en la cuenta del comercio antes de finalizar la venta.
              </p>
            </div>
          )}

          {/* QR Details */}
          {paymentMethod === 'QR' && (
            <div className="bg-cyan-50 border border-cyan-200 p-4 rounded-xl space-y-1.5 text-xs text-cyan-900">
              <div className="font-bold flex items-center gap-1.5 text-cyan-800">
                <QrCode className="w-4 h-4" /> Cobro con Código QR (Mercado Pago, MODO, Cuenta DNI)
              </div>
              <p className="text-cyan-700">
                Muestre el código QR al cliente para el cobro de <strong>${safeTotal.toFixed(2)}</strong> y confirme la acreditación en pantalla.
              </p>
            </div>
          )}

          {/* EFECTIVO Details */}
          {paymentMethod === 'EFECTIVO' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-700 block">
                Monto Recibido del Cliente ($ ARS):
              </label>

              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  autoFocus
                  value={cashPaidInput}
                  onChange={(e) => setCashPaidInput(e.target.value)}
                  className="w-full p-3 bg-white border-2 border-emerald-500 rounded-xl text-2xl font-extrabold text-slate-900 focus:outline-none"
                />
              </div>

              {/* Fast Bill Shortcuts (Pesos Argentinos ARS) */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-400 w-full mb-1">
                  Billetes de Pesos Argentinos (ARS):
                </span>
                {[
                  { label: 'Exacto', value: safeTotal },
                  { label: '$500', value: 500 },
                  { label: '$1.000', value: 1000 },
                  { label: '$2.000', value: 2000 },
                  { label: '$5.000', value: 5000 },
                  { label: '$10.000', value: 10000 },
                  { label: '$20.000', value: 20000 },
                ].map((bill) => (
                  <button
                    key={bill.label}
                    type="button"
                    onClick={() => addBill(bill.value)}
                    className="px-3 py-1.5 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-800 font-bold text-xs rounded-lg border border-slate-300 shadow-xs transition-all flex items-center gap-1"
                  >
                    <span>💵</span> {bill.label}
                  </button>
                ))}
              </div>

              {/* Change Box */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  changeGiven < 0
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900'
                }`}
              >
                <span className="font-extrabold text-xs uppercase tracking-wider">
                  {changeGiven < 0 ? 'Monto Restante por Pagar:' : 'VUELTO / CAMBIO A ENTREGAR:'}
                </span>
                <span className="text-2xl font-black font-mono">
                  ${Math.abs(changeGiven).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS
                </span>
              </div>
            </div>
          )}

          {/* CREDITO Details */}
          {paymentMethod === 'CREDITO' && (
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl space-y-2">
              {customer ? (
                <div>
                  <div className="font-bold text-indigo-900 text-sm">
                    Cliente Seleccionado: {customer.name}
                  </div>
                  <div className="text-xs text-indigo-700 mt-1 space-y-0.5">
                    <div>Límite de Crédito: ${(customer.creditLimit || 0).toFixed(2)}</div>
                    <div>Saldo Deudor Actual: ${(customer.creditBalance || 0).toFixed(2)}</div>
                    <div className="font-bold">
                      Crédito Disponible: ${((customer.creditLimit || 0) - (customer.creditBalance || 0)).toFixed(2)}
                    </div>
                  </div>
                  {!isPaymentValid && (
                    <div className="mt-2 text-xs font-bold text-rose-600 flex items-center gap-1 bg-rose-50 p-2 rounded border border-rose-200">
                      <AlertCircle className="w-4 h-4" /> El total de la compra excede el crédito disponible del cliente.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-indigo-900 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-indigo-600" />
                  Debes asignar un cliente al ticket para vender a crédito (Fiado).
                </div>
              )}
            </div>
          )}

          {/* MIXTO Details */}
          {paymentMethod === 'MIXTO' && (
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Monto en Efectivo ($):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cashPaidInput}
                  onChange={(e) => setCashPaidInput(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Monto en Tarjeta ($):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cardPaidInput}
                  onChange={(e) => setCardPaidInput(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800"
                />
              </div>
            </div>
          )}

          {/* Print Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
            <input
              type="checkbox"
              checked={shouldPrintReceipt}
              onChange={(e) => setShouldPrintReceipt(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Imprimir Ticket de Venta al finalizar</span>
          </label>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-white hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            id="btn-process-checkout"
            type="button"
            onClick={handleProcess}
            disabled={!isPaymentValid || isSubmitting}
            className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300 disabled:text-slate-500 text-white font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>PROCESANDO VENTA...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>[F2 / Enter] FINALIZAR VENTA</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
