import React from 'react';
import { Printer, X, CheckCircle, CreditCard, DollarSign } from 'lucide-react';
import { Customer, CustomerCreditMovement } from '../types/pos';

interface CustomerPaymentReceiptModalProps {
  customer: Customer;
  movement: CustomerCreditMovement;
  cashierName?: string;
  registerName?: string;
  onClose: () => void;
}

export const CustomerPaymentReceiptModal: React.FC<CustomerPaymentReceiptModalProps> = ({
  customer,
  movement,
  cashierName = 'Cajero',
  registerName = 'Caja',
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
    });
  };

  const previousBalance = customer.creditBalance + movement.amount;
  const remainingBalance = customer.creditBalance;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
      <div className="bg-[#1e293b] border border-slate-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-700/80 flex items-center justify-between bg-slate-800/60">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Comprobante de Abono</h3>
              <p className="text-[10px] text-slate-400">Recibo para el Cliente</p>
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
            className="bg-white text-slate-900 w-[290px] p-5 shadow-md font-mono text-[11px] leading-tight select-text rounded-sm border border-slate-200"
          >
            {/* Ticket Header */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
              <h2 className="font-black text-sm uppercase tracking-wider">RECREO PDV</h2>
              <p className="text-[10px] text-slate-600 font-bold uppercase">COMPROBANTE DE ABONO A CRÉDITO</p>
              <div className="text-[9px] text-slate-500 font-sans">====================================</div>
            </div>

            {/* Info Metadata */}
            <div className="py-2.5 space-y-1 border-b border-dashed border-slate-400 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-500">FECHA:</span>
                <span className="font-medium">{formatDate(movement.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CLIENTE:</span>
                <span className="font-bold">{customer.name}</span>
              </div>
              {customer.phone && (
                <div className="flex justify-between">
                  <span className="text-slate-500">TELÉFONO:</span>
                  <span>{customer.phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">CAJERO:</span>
                <span>{cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CAJA:</span>
                <span>{registerName}</span>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="py-3 space-y-2 border-b border-dashed border-slate-400">
              <div className="flex justify-between">
                <span>Saldo Anterior:</span>
                <span>${previousBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-black text-emerald-700 bg-emerald-50 p-1 rounded">
                <span>MONTO ABONADO:</span>
                <span>${movement.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800">
                <span>SALDO RESTANTE:</span>
                <span>${remainingBalance.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-6 pb-2 text-center text-[9px] text-slate-500 space-y-3">
              <div className="border-t border-slate-400 w-36 mx-auto pt-1">
                <span>Firma de Conformidad</span>
              </div>
              <p className="text-[9px] font-bold text-slate-700">¡Gracias por su pago puntual!</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-5 py-3.5 bg-slate-800/80 border-t border-slate-700/80 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Recibo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
