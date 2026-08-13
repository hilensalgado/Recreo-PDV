import React, { useRef } from 'react';
import { Printer, X, Check, Store, Barcode } from 'lucide-react';
import { Sale } from '../types/pos';

interface ThermalReceiptModalProps {
  sale: Sale;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({ sale, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">Ticket de Venta #${sale.ticketNumber}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Ticket Render Area */}
        <div className="p-6 bg-slate-200 overflow-y-auto flex justify-center flex-1">
          <div
            ref={receiptRef}
            className="bg-white text-slate-900 p-6 rounded-sm shadow-md font-mono text-[11px] w-[300px] border border-slate-300 leading-tight select-text"
          >
            {/* Store Header */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
              <div className="font-black text-sm uppercase tracking-wider">
                RECREO PDV - PUNTO DE VENTA
              </div>
              <div className="text-[10px] text-slate-600">
                SUCURSAL CENTRAL - BUENOS AIRES
              </div>
              <div className="text-[10px] text-slate-600">CUIT: 30-71234567-8</div>
              <div className="text-[10px] text-slate-600">
                AV. CORRIENTES #1234, CABA, ARGENTINA
              </div>
              <div className="text-[10px] text-slate-600">TEL: 011-4567-8900</div>
            </div>

            {/* Ticket Info */}
            <div className="py-2.5 space-y-0.5 border-b border-dashed border-slate-400 text-[10px]">
              <div className="flex justify-between">
                <span>TICKET #:</span>
                <span className="font-bold">{sale.ticketNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>FECHA:</span>
                <span>{new Date(sale.timestamp).toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between">
                <span>CAJA:</span>
                <span className="font-bold">{sale.registerName}</span>
              </div>
              <div className="flex justify-between">
                <span>CAJERO:</span>
                <span>{sale.cashierName}</span>
              </div>
              {sale.customerName && (
                <div className="flex justify-between font-bold text-indigo-800">
                  <span>CLIENTE:</span>
                  <span>{sale.customerName}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-2">
              <div className="grid grid-cols-12 font-bold border-b border-slate-300 pb-1 text-[10px]">
                <span className="col-span-2">CANT</span>
                <span className="col-span-6">CONCEPTO</span>
                <span className="col-span-4 text-right">IMPORTE</span>
              </div>

              {sale.items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 text-[10px]">
                  <span className="col-span-2 font-bold">{item.quantity}</span>
                  <span className="col-span-6 truncate">{item.product.name}</span>
                  <span className="col-span-4 text-right font-bold">
                    ${item.total.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1">
              <div className="flex justify-between text-[10px]">
                <span>SUBTOTAL:</span>
                <span>${sale.subtotal.toFixed(2)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-[10px] text-rose-700 font-bold">
                  <span>DESCUENTO:</span>
                  <span>-${sale.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-black pt-1">
                <span>TOTAL:</span>
                <span>${sale.total.toFixed(2)} ARS</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2 border-b border-dashed border-slate-400 space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>FORMA PAGO:</span>
                <span className="font-bold">{sale.paymentMethod}</span>
              </div>
              {sale.paymentMethod === 'EFECTIVO' && (
                <>
                  <div className="flex justify-between">
                    <span>PAGÓ CON:</span>
                    <span>${sale.cashPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>CAMBIO:</span>
                    <span>${sale.changeGiven.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 text-center space-y-2">
              <div className="text-[10px] font-bold">
                *** ¡GRACIAS POR SU COMPRA! ***
              </div>
              <div className="text-[9px] text-slate-500">
                Conserve este comprobante para cualquier aclaración o devolución.
              </div>

              {/* Barcode Visual */}
              <div className="flex flex-col items-center pt-1">
                <Barcode className="w-48 h-8 text-slate-800" />
                <span className="text-[9px] font-mono tracking-widest text-slate-500">
                  *{sale.id}*
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> Imprimir Ticket
          </button>
        </div>
      </div>
    </div>
  );
};
