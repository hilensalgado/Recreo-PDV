import React from 'react';
import { Printer, X, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { CashShift, CashRegister } from '../types/pos';

interface CashCutReceiptModalProps {
  shift: CashShift;
  register?: CashRegister | null;
  onClose: () => void;
}

export const CashCutReceiptModal: React.FC<CashCutReceiptModalProps> = ({
  shift,
  register,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '---';
    const date = new Date(isoString);
    return date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
      <div className="bg-[#1e293b] border border-slate-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-700/80 flex items-center justify-between bg-slate-800/60">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Comprobante Corte Z</h3>
              <p className="text-[10px] text-slate-400">Resumen Oficial de Cierre de Caja</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Ticket Area */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-900 flex justify-center">
          <div
            id="printable-ticket"
            className="bg-white text-slate-900 w-[300px] p-5 shadow-md font-mono text-[11px] leading-tight select-text rounded-sm border border-slate-200"
          >
            {/* Ticket Header */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
              <h2 className="font-black text-sm uppercase tracking-wider">RECREO PDV</h2>
              <p className="text-[10px] text-slate-600 font-bold uppercase">Reporte de Arqueo y Corte Z</p>
              <div className="text-[9px] text-slate-500 font-sans">====================================</div>
            </div>

            {/* Info Metadata */}
            <div className="py-2.5 space-y-1 border-b border-dashed border-slate-400 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-500">TURNO ID:</span>
                <span className="font-bold">{shift.id.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">TERMINAL:</span>
                <span className="font-bold">{register?.name || shift.registerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CAJERO:</span>
                <span className="font-bold">{shift.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">APERTURA:</span>
                <span className="font-medium text-[9px]">{formatDate(shift.openedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CIERRE:</span>
                <span className="font-medium text-[9px]">{formatDate(shift.closedAt)}</span>
              </div>
            </div>

            {/* Shift Breakdown */}
            <div className="py-3 space-y-1.5 border-b border-dashed border-slate-400">
              <div className="font-bold text-[11px] text-slate-800 mb-1 uppercase tracking-wide">
                Desglose Operativo
              </div>
              <div className="flex justify-between">
                <span>Fondo Inicial de Caja:</span>
                <span className="font-bold">${shift.initialCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ventas en Efectivo (+):</span>
                <span className="font-bold text-emerald-700">${shift.totalSalesCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ventas con Tarjeta:</span>
                <span className="font-bold text-blue-700">${shift.totalSalesCard.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ventas a Crédito:</span>
                <span className="font-bold text-amber-700">${shift.totalSalesCredit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Entradas de Dinero (+):</span>
                <span className="font-bold text-emerald-700">${shift.totalIncomes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Salidas / Gastos (-):</span>
                <span className="font-bold text-rose-700">${shift.totalExpenses.toFixed(2)}</span>
              </div>
            </div>

            {/* Final Cash Balance */}
            <div className="py-3 space-y-2 border-b border-dashed border-slate-400">
              <div className="flex justify-between text-xs font-bold">
                <span>EFECTIVO ESPERADO:</span>
                <span>${shift.expectedCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-blue-800">
                <span>EFECTIVO DECLARADO:</span>
                <span>${(shift.declaredCash || 0).toFixed(2)}</span>
              </div>

              {shift.difference !== undefined && (
                <div
                  className={`flex justify-between text-xs font-black p-1.5 rounded ${
                    shift.difference === 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : shift.difference > 0
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  <span>DIFERENCIA:</span>
                  <span>
                    {shift.difference > 0 ? `+${shift.difference.toFixed(2)} (Sobrante)` : shift.difference < 0 ? `${shift.difference.toFixed(2)} (Faltante)` : '$0.00 (Exacto)'}
                  </span>
                </div>
              )}
            </div>

            {shift.notes && (
              <div className="py-2.5 border-b border-dashed border-slate-400 text-[10px]">
                <span className="font-bold block mb-0.5">NOTAS / OBSERVACIONES:</span>
                <p className="italic text-slate-700">{shift.notes}</p>
              </div>
            )}

            {/* Signatures */}
            <div className="pt-8 pb-3 space-y-6 text-center text-[9px] text-slate-500">
              <div className="flex justify-between gap-4">
                <div className="flex-1 border-t border-slate-400 pt-1">
                  <span>Firma Cajero</span>
                </div>
                <div className="flex-1 border-t border-slate-400 pt-1">
                  <span>Firma Encargado</span>
                </div>
              </div>
              <p className="text-[8px] uppercase text-slate-400">*** FIN DEL COMPROBANTE CORTE Z ***</p>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-800/80 border-t border-slate-700/80 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Ticket Z</span>
          </button>
        </div>
      </div>
    </div>
  );
};
