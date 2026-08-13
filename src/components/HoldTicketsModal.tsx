import React, { useState } from 'react';
import { Clock, X, Check, Trash2, ArrowRight } from 'lucide-react';
import { HoldTicket, CartItem, Customer } from '../types/pos';

interface HoldTicketsModalProps {
  holdTickets: HoldTicket[];
  currentCartItems: CartItem[];
  currentCustomer?: Customer;
  activeRegisterName: string;
  onSaveCurrentHold: (label: string) => void;
  onRestoreHoldTicket: (ticket: HoldTicket) => void;
  onDeleteHoldTicket: (id: string) => void;
  onClose: () => void;
}

export const HoldTicketsModal: React.FC<HoldTicketsModalProps> = ({
  holdTickets,
  currentCartItems,
  currentCustomer,
  activeRegisterName,
  onSaveCurrentHold,
  onRestoreHoldTicket,
  onDeleteHoldTicket,
  onClose,
}) => {
  const [ticketLabel, setTicketLabel] = useState('');

  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentCartItems.length === 0) {
      alert('No hay artículos en la venta actual para poner en espera');
      return;
    }

    onSaveCurrentHold(ticketLabel.trim() || 'Venta pendiente');
    setTicketLabel('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-cyan-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-cyan-300" />
            <div>
              <h2 className="font-extrabold text-lg text-white leading-none">
                [F6] Ventas en Espera / Tickets Pendientes
              </h2>
              <p className="text-xs text-cyan-200 mt-0.5">{activeRegisterName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-cyan-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Put Current Cart on Hold */}
          <form onSubmit={handleSaveCurrent} className="bg-cyan-50 p-4 rounded-xl border border-cyan-200 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-900 block">
              Poner en espera la venta actual ({currentCartItems.length} prod):
            </span>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Identificador (ej. Cliente 2, Señor del suéter azul)"
                value={ticketLabel}
                onChange={(e) => setTicketLabel(e.target.value)}
                className="flex-1 p-2.5 bg-white border border-cyan-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="submit"
                disabled={currentCartItems.length === 0}
                className="px-4 py-2.5 bg-cyan-700 hover:bg-cyan-800 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1"
              >
                <Check className="w-4 h-4" /> Guardar en Espera
              </button>
            </div>
          </form>

          {/* List of Saved Hold Tickets */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
              Ventas Guardadas en Espera:
            </span>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border rounded-xl">
              {holdTickets.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No hay ventas pendientes en espera.
                </div>
              ) : (
                holdTickets.map((ht) => {
                  const total = ht.items.reduce((acc, i) => acc + i.total, 0);

                  return (
                    <div
                      key={ht.id}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          <span>{ht.label}</span>
                          <span className="bg-cyan-100 text-cyan-800 text-[10px] px-1.5 py-0.2 rounded font-extrabold">
                            #{ht.ticketNumber}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {ht.items.length} productos • Creado:{' '}
                          {new Date(ht.createdAt).toLocaleTimeString('es-MX')}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="font-black text-sm text-cyan-700 block">
                            ${total.toFixed(2)}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            onRestoreHoldTicket(ht);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center gap-1"
                        >
                          Restaurar <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteHoldTicket(ht.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                          title="Borrar ticket"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
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
