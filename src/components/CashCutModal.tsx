import React, { useState } from 'react';
import {
  DollarSign,
  Calculator,
  Coins,
  Store,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  CreditCard,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
  ArrowRightLeft,
  QrCode,
} from 'lucide-react';
import { CashShift, CashRegister, Cashier } from '../types/pos';

interface CashCutModalProps {
  isOpen: boolean;
  shift: CashShift;
  register: CashRegister | null;
  cashier: Cashier | null;
  onClose: () => void;
  onConfirmCloseShift: (declaredCash: number, notes?: string) => Promise<void> | void;
}

export const CashCutModal: React.FC<CashCutModalProps> = ({
  isOpen,
  shift,
  register,
  cashier,
  onClose,
  onConfirmCloseShift,
}) => {
  if (!isOpen) return null;

  // ARS Currency Denominations (Billetes de curso legal en Argentina)
  const [b20000, setB20000] = useState<number>(0);
  const [b10000, setB10000] = useState<number>(0);
  const [b2000, setB2000] = useState<number>(0);
  const [b1000, setB1000] = useState<number>(0);
  const [b500, setB500] = useState<number>(0);
  const [b200, setB200] = useState<number>(0);
  const [b100, setB100] = useState<number>(0);
  const [b50, setB50] = useState<number>(0);
  const [b20, setB20] = useState<number>(0);
  const [b10, setB10] = useState<number>(0);

  // Manual direct cash input toggle
  const [countMode, setCountMode] = useState<'DENOMINATIONS' | 'DIRECT'>('DENOMINATIONS');
  const [directCashInput, setDirectCashInput] = useState<string>('');

  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBlindRevealed, setIsBlindRevealed] = useState<boolean>(false);

  const resetDenominations = () => {
    setB20000(0);
    setB10000(0);
    setB2000(0);
    setB1000(0);
    setB500(0);
    setB200(0);
    setB100(0);
    setB50(0);
    setB20(0);
    setB10(0);
  };

  // Calculate physical cash
  const calculatedBreakdownCash =
    b20000 * 20000 +
    b10000 * 10000 +
    b2000 * 2000 +
    b1000 * 1000 +
    b500 * 500 +
    b200 * 200 +
    b100 * 100 +
    b50 * 50 +
    b20 * 20 +
    b10 * 10;

  const physicalCash =
    countMode === 'DENOMINATIONS'
      ? calculatedBreakdownCash
      : parseFloat(directCashInput) || 0;

  const expectedCash = shift?.expectedCash || 0;
  const difference = Number((physicalCash - expectedCash).toFixed(2));
  const totalSales = (shift?.totalSalesCash || 0) + (shift?.totalSalesCard || 0) + (shift?.totalSalesCredit || 0);

  const formatCurrency = (amount?: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return '---';
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await onConfirmCloseShift(physicalCash, notes);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar el cierre de caja.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in select-none overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg text-white">
                  Cierre de Caja y Arqueo de Dinero
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Obligatorio
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Realiza el conteo físico del efectivo para cerrar la caja de forma segura antes de salir
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Cancelar y permanecer en el sistema"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info & Shift details strip */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-indigo-600" />
              Caja: <strong className="text-slate-900">{register?.name || shift.registerName}</strong>
            </span>
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Cajero: <strong className="text-slate-900">{cashier?.name || shift.cashierName}</strong>
            </span>
          </div>
          <div className="text-slate-500 flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Apertura: {formatDateTime(shift.openedAt)}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Operational Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Fondo Inicial</span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-800">
                {formatCurrency(shift.initialCash)}
              </span>
            </div>
            <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block flex items-center gap-1">
                <ArrowDownRight className="w-3 h-3" /> Efectivo
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-emerald-800">
                +{formatCurrency(shift.totalSalesCash)}
              </span>
            </div>
            <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-blue-700 block flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Tarjeta
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-blue-800">
                {formatCurrency(shift.totalSalesCard || 0)}
              </span>
            </div>
            <div className="p-2.5 bg-teal-50/80 border border-teal-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-teal-700 block flex items-center gap-1">
                <ArrowRightLeft className="w-3 h-3" /> Transferencia
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-teal-800">
                {formatCurrency(shift.totalSalesTransfer || 0)}
              </span>
            </div>
            <div className="p-2.5 bg-cyan-50/80 border border-cyan-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-cyan-700 block flex items-center gap-1">
                <QrCode className="w-3 h-3" /> QR
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-cyan-800">
                {formatCurrency(shift.totalSalesQR || 0)}
              </span>
            </div>
            <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-amber-700 block">Movimientos</span>
              <span className="text-[11px] font-bold text-amber-900 block truncate">
                +{formatCurrency(shift.totalIncomes)} / -{formatCurrency(shift.totalExpenses)}
              </span>
            </div>
          </div>

          {/* Money Count Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-600" />
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase tracking-wide">
                  Conteo de Dinero Físico en Caja
                </h3>
              </div>
              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setCountMode('DENOMINATIONS')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    countMode === 'DENOMINATIONS'
                      ? 'bg-white text-indigo-700 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Calculadora ARS
                </button>
                <button
                  type="button"
                  onClick={() => setCountMode('DIRECT')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    countMode === 'DIRECT'
                      ? 'bg-white text-indigo-700 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ingreso Directo
                </button>
              </div>
            </div>

            {countMode === 'DENOMINATIONS' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Billetes de Curso Legal (ARS):
                  </span>
                  <button
                    type="button"
                    onClick={resetDenominations}
                    className="text-[11px] text-slate-500 hover:text-rose-600 font-bold underline cursor-pointer"
                  >
                    Poner en cero
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  {[
                    { label: '$20.000', sub: 'Alberdi', val: b20000, set: setB20000, mult: 20000 },
                    { label: '$10.000', sub: 'Belgrano', val: b10000, set: setB10000, mult: 10000 },
                    { label: '$2.000', sub: 'Carrillo', val: b2000, set: setB2000, mult: 2000 },
                    { label: '$1.000', sub: 'San Martín / Hornero', val: b1000, set: setB1000, mult: 1000 },
                    { label: '$500', sub: 'Yaguareté', val: b500, set: setB500, mult: 500 },
                    { label: '$200', sub: 'Ballena Franca', val: b200, set: setB200, mult: 200 },
                    { label: '$100', sub: 'Evita / Roca / Taruca', val: b100, set: setB100, mult: 100 },
                    { label: '$50', sub: 'Cóndor / Malvinas', val: b50, set: setB50, mult: 50 },
                    { label: '$20', sub: 'Guanaco / Rosas', val: b20, set: setB20, mult: 20 },
                    { label: '$10', sub: 'Manuel Belgrano', val: b10, set: setB10, mult: 10 },
                  ].map((denom) => (
                    <div
                      key={denom.label}
                      className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col justify-between gap-1 shadow-2xs hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-800 text-xs">{denom.label}</span>
                        <input
                          type="number"
                          min="0"
                          value={denom.val === 0 ? '' : denom.val}
                          placeholder="0"
                          onChange={(e) => denom.set(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-14 px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded-md text-right font-black text-slate-900 text-xs focus:bg-white focus:outline-indigo-500"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100 pt-1">
                        <span className="truncate max-w-[65px]" title={denom.sub}>{denom.sub}</span>
                        <span className="font-mono font-bold text-slate-700">
                          ${(denom.val * denom.mult).toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-3">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Monto total de dinero en efectivo contado en caja ($):
                </label>
                <div className="relative max-w-sm">
                  <span className="absolute left-3.5 top-2.5 font-black text-slate-400 text-lg">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    autoFocus
                    placeholder="0.00"
                    value={directCashInput}
                    onChange={(e) => setDirectCashInput(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-white border-2 border-indigo-500 rounded-xl text-xl font-black text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Arqueo Balance & Difference Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Arqueo de Efectivo
                </span>
                {!isBlindRevealed ? (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-extrabold uppercase">
                    🔒 Arqueo Ciego
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-extrabold uppercase">
                    👁️ Revelado
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsBlindRevealed(!isBlindRevealed)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {isBlindRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-amber-400" />}
                <span>{isBlindRevealed ? 'Ocultar' : 'Revelar Arqueo'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                  1. Efectivo Esperado en Caja
                </span>
                <span className="text-lg sm:text-xl font-extrabold text-slate-200 font-mono">
                  {isBlindRevealed ? formatCurrency(expectedCash) : '••••••••'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {isBlindRevealed ? '(Fondo inicial + Ventas + Entradas - Gastos)' : 'Oculto para evitar sesgo en el conteo'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                  2. Efectivo Físico Contado
                </span>
                <span className="text-lg sm:text-xl font-black text-indigo-300 font-mono">
                  {formatCurrency(physicalCash)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Total declarado por el cajero
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                  3. Diferencia de Caja (Contado - Esperado)
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-lg sm:text-xl font-black px-2.5 py-1 rounded-xl font-mono ${
                      !isBlindRevealed
                        ? 'bg-slate-800 text-slate-400 border border-slate-700'
                        : difference === 0
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : difference > 0
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {!isBlindRevealed
                      ? '••••••••'
                      : difference > 0
                      ? `+${formatCurrency(difference)}`
                      : formatCurrency(difference)}
                  </span>
                </div>
                <span className="text-[10px] font-bold block mt-1">
                  {!isBlindRevealed && <span className="text-amber-400/80">Conteo físico requerido</span>}
                  {isBlindRevealed && difference === 0 && <span className="text-emerald-400">✓ Saldo Exacto</span>}
                  {isBlindRevealed && difference > 0 && <span className="text-blue-400">▲ Sobrante de dinero</span>}
                  {isBlindRevealed && difference < 0 && <span className="text-rose-400">▼ Faltante de dinero</span>}
                </span>
              </div>
            </div>

            {/* Notes & Observations */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Observaciones o Justificación de Cierre:
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  difference !== 0
                    ? 'Indica el motivo del sobrante o faltante de dinero registrado...'
                    : 'Observaciones generales del turno (opcional)...'
                }
                className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors"
          >
            Cancelar y Seguir en la Sesión
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Cerrando caja y guardando arqueo...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>CONFIRMAR CIERRE DE CAJA Y SALIR</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
