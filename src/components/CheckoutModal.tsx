import React, { useState } from 'react';
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
} from 'lucide-react';
import { CartItem, Customer, PaymentMethod } from '../types/pos';

interface CheckoutModalProps {
  items: CartItem[];
  total: number;
  customer?: Customer;
  activeRegisterName: string;
  onClose: () => void;
  onCompleteSale: (data: {
    paymentMethod: PaymentMethod;
    cashPaid: number;
    cardPaid: number;
    shouldPrintReceipt: boolean;
  }) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  items,
  total,
  customer,
  activeRegisterName,
  onClose,
  onCompleteSale,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('EFECTIVO');
  const [cashPaidInput, setCashPaidInput] = useState<string>(total.toFixed(2));
  const [cardPaidInput, setCardPaidInput] = useState<string>('0.00');
  const [shouldPrintReceipt, setShouldPrintReceipt] = useState<boolean>(true);

  const numericCash = parseFloat(cashPaidInput) || 0;
  const numericCard = parseFloat(cardPaidInput) || 0;

  // Change logic
  let changeGiven = 0;
  let isPaymentValid = true;

  if (paymentMethod === 'EFECTIVO') {
    changeGiven = Math.max(0, numericCash - total);
    isPaymentValid = numericCash >= total;
  } else if (paymentMethod === 'TARJETA') {
    changeGiven = 0;
    isPaymentValid = true;
  } else if (paymentMethod === 'CREDITO') {
    changeGiven = 0;
    if (!customer) {
      isPaymentValid = false;
    } else {
      const remainingLimit = customer.creditLimit - customer.creditBalance;
      isPaymentValid = remainingLimit >= total;
    }
  } else if (paymentMethod === 'MIXTO') {
    const totalPaid = numericCash + numericCard;
    changeGiven = Math.max(0, totalPaid - total);
    isPaymentValid = totalPaid >= total;
  }

  // Fast cash bill buttons
  const addBill = (amount: number) => {
    setCashPaidInput(amount.toFixed(2));
  };

  const handleProcess = () => {
    if (!isPaymentValid) return;

    onCompleteSale({
      paymentMethod,
      cashPaid: paymentMethod === 'TARJETA' ? 0 : numericCash,
      cardPaid: paymentMethod === 'TARJETA' ? total : numericCard,
      shouldPrintReceipt,
    });
  };

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
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Big Amount Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Total de la Venta
              </span>
              <span className="text-xs text-slate-500">
                {items.length} artículos en la transacción
              </span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-emerald-600 tracking-tight">
                ${total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-slate-400 block font-bold">ARS ($)</span>
            </div>
          </div>

          {/* Payment Method Tabs */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
              Método de Pago:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('EFECTIVO');
                  setCashPaidInput(total.toFixed(2));
                }}
                className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 transition-all ${
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
                className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 transition-all ${
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
                onClick={() => setPaymentMethod('CREDITO')}
                className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 transition-all ${
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
                  setCashPaidInput((total / 2).toFixed(2));
                  setCardPaidInput((total / 2).toFixed(2));
                }}
                className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 transition-all ${
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
                  { label: 'Exacto', value: total },
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
                    <div>Límite de Crédito: ${customer.creditLimit.toFixed(2)}</div>
                    <div>Saldo Deudor Actual: ${customer.creditBalance.toFixed(2)}</div>
                    <div className="font-bold">
                      Crédito Disponible: ${(customer.creditLimit - customer.creditBalance).toFixed(2)}
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
            className="flex-1 py-3 bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleProcess}
            disabled={!isPaymentValid}
            className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>FINALIZAR VENTA</span>
          </button>
        </div>
      </div>
    </div>
  );
};
