import React, { useState } from 'react';
import { Lock, Unlock, DollarSign, Store, UserCheck } from 'lucide-react';
import { CashRegister, Cashier } from '../types/pos';

interface OpenShiftModalProps {
  register: CashRegister;
  cashier: Cashier;
  onConfirmOpenShift: (initialCash: number) => void;
  onCancel: () => void;
}

export const OpenShiftModal: React.FC<OpenShiftModalProps> = ({
  register,
  cashier,
  onConfirmOpenShift,
  onCancel,
}) => {
  const [initialCashInput, setInitialCashInput] = useState('20000.00');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(initialCashInput);
    if (isNaN(val) || val < 0) {
      alert('Ingresa un monto válido para el fondo de caja inicial');
      return;
    }

    onConfirmOpenShift(val);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4">
        <div className="flex items-center gap-3 text-emerald-600 border-b border-slate-100 pb-3">
          <div className="p-2.5 bg-emerald-100 rounded-xl">
            <Unlock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-900">Apertura de Caja y Turno</h3>
            <p className="text-xs text-slate-500">Ingresa el fondo inicial para abrir la caja</p>
          </div>
        </div>

        <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center text-slate-700">
            <span className="font-semibold flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-blue-600" /> Caja:
            </span>
            <span className="font-bold text-slate-900">{register.name}</span>
          </div>
          <div className="flex justify-between items-center text-slate-700">
            <span className="font-semibold flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> Cajero Responsable:
            </span>
            <span className="font-bold text-slate-900">{cashier.name}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Fondo de Caja Inicial / Dinero para Cambio ($):
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 font-bold text-slate-400 text-lg">$</span>
              <input
                type="number"
                step="50"
                autoFocus
                required
                value={initialCashInput}
                onChange={(e) => setInitialCashInput(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-white border-2 border-emerald-500 rounded-xl text-2xl font-black text-slate-900 focus:outline-none"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Monto recomendado en billetes de baja denominación y monedas.
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-lg text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Unlock className="w-4 h-4" /> ABRIR TURNO DE CAJA
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
