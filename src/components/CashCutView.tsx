import React, { useState } from 'react';
import {
  DollarSign,
  Calculator,
  Printer,
  CheckCircle2,
  AlertCircle,
  Coins,
  Store,
  Clock,
  Lock,
} from 'lucide-react';
import { CashShift, CashRegister, Sale, CashMovement } from '../types/pos';

interface CashCutViewProps {
  activeShift: CashShift | null;
  activeRegister: CashRegister | null;
  registers: CashRegister[];
  sales: Sale[];
  movements: CashMovement[];
  onCloseShift: (declaredCash: number, notes?: string) => void;
  onOpenReceiptModal?: (shift: CashShift) => void;
}

export const CashCutView: React.FC<CashCutViewProps> = ({
  activeShift,
  activeRegister,
  registers,
  sales,
  movements,
  onCloseShift,
  onOpenReceiptModal,
}) => {
  // Argentine Peso (ARS) Cash Denomination Calculator
  const [b20000, setB20000] = useState(0);
  const [b10000, setB10000] = useState(0);
  const [b5000, setB5000] = useState(0);
  const [b2000, setB2000] = useState(0);
  const [b1000, setB1000] = useState(0);
  const [b500, setB500] = useState(0);
  const [b200, setB200] = useState(0);
  const [b100, setB100] = useState(0);

  const [m500, setM500] = useState(0);
  const [m100, setM100] = useState(0);
  const [m50, setM50] = useState(0);
  const [m10, setM10] = useState(0);
  const [m5, setM5] = useState(0);
  const [m1, setM1] = useState(0);

  const [notes, setNotes] = useState('');

  const calculatedPhysicalCash =
    b20000 * 20000 +
    b10000 * 10000 +
    b5000 * 5000 +
    b2000 * 2000 +
    b1000 * 1000 +
    b500 * 500 +
    b200 * 200 +
    b100 * 100 +
    m500 * 500 +
    m100 * 100 +
    m50 * 50 +
    m10 * 10 +
    m5 * 5 +
    m1 * 1;

  const expectedCash = activeShift ? activeShift.expectedCash : 0;
  const difference = calculatedPhysicalCash - expectedCash;

  const handleConfirmClose = () => {
    if (!activeShift) return;

    if (
      confirm(
        `¿Confirmas el Cierre de Turno para ${activeRegister?.name}? Se generará el reporte Corte Z.`
      )
    ) {
      onCloseShift(calculatedPhysicalCash, notes);
    }
  };

  if (!activeShift || activeShift.status === 'CLOSED') {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center select-none">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="font-extrabold text-xl text-slate-800">
            La caja actual ({activeRegister?.name || 'Caja'}) está CERRADA
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Para realizar operaciones en esta caja, debes iniciar un nuevo turno ingresando el fondo de caja inicial.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-3 space-y-4 select-none">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-slate-800">
              [F12] Corte de Caja y Cierre de Turno (Ticket Z)
            </h2>
            <p className="text-xs text-slate-500">
              Arqueo de dinero en efectivo, desglose por denominaciones (ARS) y declaración de saldo de cierre
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenReceiptModal && (
            <button
              onClick={() => onOpenReceiptModal(activeShift)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-slate-600" /> Prevista Ticket Z
            </button>
          )}

          <button
            onClick={handleConfirmClose}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" /> CERRAR TURNO AHORA
          </button>
        </div>
      </div>

      {/* Grid Display: Left Summary Cards / Right Denomination Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column (2 Cols): Financial Summary & Result */}
        <div className="lg:col-span-2 space-y-4">
          {/* Shift Details Box */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-blue-600" /> Registro de Cierre - Turno Activo
              </span>
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Abierto:{' '}
                {new Date(activeShift.openedAt).toLocaleTimeString('es-AR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* Stats Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Fondo Inicial
                </span>
                <span className="text-base font-black text-slate-800">
                  ${activeShift.initialCash.toFixed(2)}
                </span>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Ventas Efectivo
                </span>
                <span className="text-base font-black text-emerald-800">
                  +${activeShift.totalSalesCash.toFixed(2)}
                </span>
              </div>

              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                  Ventas Tarjeta
                </span>
                <span className="text-base font-black text-blue-800">
                  ${activeShift.totalSalesCard.toFixed(2)}
                </span>
              </div>

              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                  Ventas a Crédito
                </span>
                <span className="text-base font-black text-indigo-800">
                  ${activeShift.totalSalesCredit.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Incomes & Expenses Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                  Entradas de Efectivo
                </span>
                <span className="text-lg font-black text-emerald-700">
                  +${activeShift.totalIncomes.toFixed(2)}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
                  Salidas (Pagos / Retiros)
                </span>
                <span className="text-lg font-black text-rose-600">
                  -${activeShift.totalExpenses.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Expected Cash in Drawer Card */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Efectivo Esperado en Cajón
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculado automáticamente por ventas en efectivo, entradas y salidas
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-emerald-400">
                  ${expectedCash.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-slate-400 block font-bold">ARS ($)</span>
              </div>
            </div>

            {/* Physical Cash vs Expected Comparison Box */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>Resultado del Arqueo de Efectivo</span>
              </h3>

              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block">Efectivo Calculado</span>
                  <span className="text-base font-extrabold text-slate-800">${expectedCash.toFixed(2)}</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block">Efectivo Declarado (Contado)</span>
                  <span className="text-base font-extrabold text-blue-600">${calculatedPhysicalCash.toFixed(2)}</span>
                </div>

                <div
                  className={`p-3 rounded-lg border font-bold ${
                    Math.abs(difference) < 0.01
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : difference > 0
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <span className="text-[10px] uppercase block">Diferencia</span>
                  <span className="text-base font-black">
                    {difference > 0 ? `+${difference.toFixed(2)} (Sobrante)` : `${difference.toFixed(2)} (Faltante)`}
                  </span>
                </div>
              </div>

              <textarea
                rows={2}
                placeholder="Notas opcionales del cierre de turno (ej. Se dejaron $20.000 para cambio del siguiente turno)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Cash Denomination Calculator (ARS) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-extrabold text-sm text-slate-800 border-b border-slate-100 pb-2">
            <Coins className="w-4 h-4 text-amber-500" />
            <span>Contador de Pesos Argentinos (ARS)</span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Billetes */}
            <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 block">
              Billetes (ARS):
            </span>

            {[
              { label: '$20.000', val: b20000, setVal: setB20000, mul: 20000 },
              { label: '$10.000', val: b10000, setVal: setB10000, mul: 10000 },
              { label: '$5.000', val: b5000, setVal: setB5000, mul: 5000 },
              { label: '$2.000', val: b2000, setVal: setB2000, mul: 2000 },
              { label: '$1.000', val: b1000, setVal: setB1000, mul: 1000 },
              { label: '$500', val: b500, setVal: setB500, mul: 500 },
              { label: '$200', val: b200, setVal: setB200, mul: 200 },
              { label: '$100', val: b100, setVal: setB100, mul: 100 },
            ].map((row, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-700 w-16">{row.label}</span>
                <input
                  type="number"
                  min="0"
                  value={row.val || ''}
                  onChange={(e) => row.setVal(parseInt(e.target.value) || 0)}
                  className="w-20 p-1 bg-slate-50 border border-slate-300 rounded text-center font-bold text-slate-900"
                />
                <span className="font-mono text-slate-500 font-bold text-right w-20">
                  ${(row.val * row.mul).toFixed(0)}
                </span>
              </div>
            ))}

            {/* Monedas */}
            <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 block pt-2">
              Monedas (ARS):
            </span>

            {[
              { label: '$500', val: m500, setVal: setM500, mul: 500 },
              { label: '$100', val: m100, setVal: setM100, mul: 100 },
              { label: '$50', val: m50, setVal: setM50, mul: 50 },
              { label: '$10', val: m10, setVal: setM10, mul: 10 },
              { label: '$5', val: m5, setVal: setM5, mul: 5 },
              { label: '$1', val: m1, setVal: setM1, mul: 1 },
            ].map((row, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-700 w-16">{row.label}</span>
                <input
                  type="number"
                  min="0"
                  value={row.val || ''}
                  onChange={(e) => row.setVal(parseInt(e.target.value) || 0)}
                  className="w-20 p-1 bg-slate-50 border border-slate-300 rounded text-center font-bold text-slate-900"
                />
                <span className="font-mono text-slate-500 font-bold text-right w-20">
                  ${(row.val * row.mul).toFixed(0)}
                </span>
              </div>
            ))}

            <div className="border-t border-slate-200 pt-3 flex justify-between items-center font-black text-sm text-blue-700">
              <span>Total Contado (ARS):</span>
              <span>${calculatedPhysicalCash.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
