import React, { useState } from 'react';
import { ArrowDownUp, ArrowDownRight, ArrowUpRight, X, Check } from 'lucide-react';
import { CashMovement } from '../types/pos';

interface CashMovementsModalProps {
  movements: CashMovement[];
  activeRegisterName: string;
  onAddMovement: (data: { type: 'INCOME' | 'EXPENSE'; amount: number; concept: string }) => void;
  onClose: () => void;
}

export const CashMovementsModal: React.FC<CashMovementsModalProps> = ({
  movements,
  activeRegisterName,
  onAddMovement,
  onClose,
}) => {
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [amountInput, setAmountInput] = useState('');
  const [conceptInput, setConceptInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amountInput);
    if (isNaN(val) || val <= 0 || !conceptInput.trim()) {
      alert('Ingresa un monto válido y un concepto descriptivo');
      return;
    }

    onAddMovement({
      type,
      amount: val,
      concept: conceptInput.trim(),
    });

    setAmountInput('');
    setConceptInput('');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-amber-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDownUp className="w-6 h-6 text-amber-300" />
            <div>
              <h2 className="font-extrabold text-lg text-white leading-none">
                [F3] Entradas y Salidas de Dinero
              </h2>
              <p className="text-xs text-amber-200 mt-0.5">{activeRegisterName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-amber-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Movement Form */}
          <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Registrar nuevo movimiento de efectivo:
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('INCOME')}
                className={`flex-1 py-2.5 rounded-lg border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  type === 'INCOME'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" /> ENTRADA (Depósito)
              </button>

              <button
                type="button"
                onClick={() => setType('EXPENSE')}
                className={`flex-1 py-2.5 rounded-lg border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  type === 'EXPENSE'
                    ? 'bg-rose-600 text-white border-rose-600 shadow'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" /> SALIDA (Pago / Retiro)
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Monto ($):</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="0.00"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-black text-slate-800"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Concepto / Motivo:</label>
                <input
                  type="text"
                  placeholder="ej. Pago a proveedor de pan / Cambio extra"
                  value={conceptInput}
                  onChange={(e) => setConceptInput(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              className={`w-full py-2.5 font-bold text-xs rounded-xl shadow text-white transition-colors flex items-center justify-center gap-1.5 ${
                type === 'INCOME' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              <Check className="w-4 h-4" /> Registrar Movimiento
            </button>
          </form>

          {/* Movements History */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
              Historial del Turno Actual:
            </span>

            <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border rounded-xl">
              {movements.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No hay entradas ni salidas registradas en este turno.
                </div>
              ) : (
                movements.map((m) => (
                  <div key={m.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      {m.type === 'INCOME' ? (
                        <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md">
                          <ArrowDownRight className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-1.5 bg-rose-100 text-rose-700 rounded-md">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-800">{m.concept}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(m.timestamp).toLocaleTimeString('es-MX')} por {m.cashierName} ({m.registerName})
                        </div>
                      </div>
                    </div>

                    <div
                      className={`font-black text-sm ${
                        m.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {m.type === 'INCOME' ? '+' : '-'}${m.amount.toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
