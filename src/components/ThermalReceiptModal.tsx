import React, { useRef, useState } from 'react';
import {
  Printer,
  X,
  Check,
  Store,
  Barcode,
  Share2,
  Mail,
  MessageCircle,
  Copy,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { Sale } from '../types/pos';
import { formatCurrency } from '../utils/pricingEngine';

interface ThermalReceiptModalProps {
  sale: Sale;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({ sale, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [customPhone, setCustomPhone] = useState(sale.customerPhone || '');
  const [customEmail, setCustomEmail] = useState('');

  const handlePrint = () => {
    window.print();
  };

  // Build clean text receipt for digital sharing
  const generateReceiptText = () => {
    const dateStr = new Date(sale.timestamp).toLocaleString('es-AR');
    let text = `🧾 *COMPROBANTE DE COMPRA DIGITAL*\n`;
    text += `🏬 *RECREO PDV - PUNTO DE VENTA*\n`;
    text += `📍 Av. Corrientes 1234, CABA\n`;
    text += `📞 Tel: 011-4567-8900 | CUIT: 30-71234567-8\n`;
    text += `--------------------------------\n`;
    text += `*Ticket:* #${sale.ticketNumber}\n`;
    text += `*Fecha:* ${dateStr}\n`;
    text += `*Caja:* ${sale.registerName} | *Cajero:* ${sale.cashierName}\n`;
    if (sale.customerName) {
      text += `*Cliente:* ${sale.customerName}\n`;
    }
    text += `--------------------------------\n`;
    text += `*DETALLE DE PRODUCTOS:*\n`;
    sale.items.forEach((item) => {
      text += `• ${item.quantity}x ${item.product.name} - $${item.total.toFixed(2)}\n`;
    });
    text += `--------------------------------\n`;
    text += `*Subtotal:* $${sale.subtotal.toFixed(2)}\n`;
    if (sale.discount > 0) {
      text += `*Descuento:* -$${sale.discount.toFixed(2)}\n`;
    }
    text += `*TOTAL A PAGAR: $${sale.total.toFixed(2)} ARS*\n`;
    text += `*Forma de Pago:* ${sale.paymentMethod}\n`;
    if (sale.paymentMethod === 'EFECTIVO' && sale.cashPaid) {
      text += `*Abonó con:* $${sale.cashPaid.toFixed(2)} | *Cambio:* $${(sale.changeGiven || 0).toFixed(2)}\n`;
    }
    if (sale.pointsEarned && sale.pointsEarned > 0) {
      text += `\n⭐ *¡Sumaste ${sale.pointsEarned} puntos de fidelización!*`;
    }
    if (sale.pointsRedeemed && sale.pointsRedeemed > 0) {
      text += `\n🎁 *Puntos canjeados:* ${sale.pointsRedeemed} pts`;
    }
    text += `\n--------------------------------\n`;
    text += `✨ *¡Muchas gracias por su compra!*`;
    return text;
  };

  const handleShareWhatsApp = (phoneOverride?: string) => {
    const text = generateReceiptText();
    const phone = (phoneOverride || customPhone || '').replace(/\D/g, '');
    let url = `https://wa.me/`;
    if (phone) {
      url += `${phone}?text=${encodeURIComponent(text)}`;
    } else {
      url += `?text=${encodeURIComponent(text)}`;
    }
    window.open(url, '_blank');
  };

  const handleShareEmail = () => {
    const text = generateReceiptText();
    const subject = encodeURIComponent(`Comprobante de Compra #${sale.ticketNumber} - Recreo PDV`);
    const body = encodeURIComponent(text);
    window.open(`mailto:${customEmail || ''}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleNativeShare = async () => {
    const text = generateReceiptText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket #${sale.ticketNumber} - Recreo PDV`,
          text: text,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopyText();
    }
  };

  const handleCopyText = () => {
    const text = generateReceiptText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">Ticket de Venta #{sale.ticketNumber}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Ticket Render Area */}
        <div className="p-4 sm:p-6 bg-slate-200 overflow-y-auto flex justify-center flex-1">
          <div
            ref={receiptRef}
            id="printable-ticket"
            className="printable-receipt bg-white text-slate-900 p-6 rounded-sm shadow-md font-mono text-[11px] w-[300px] border border-slate-300 leading-tight select-text"
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

            {/* Loyalty Points Section */}
            {((sale.pointsEarned && sale.pointsEarned > 0) || (sale.pointsRedeemed && sale.pointsRedeemed > 0)) && (
              <div className="py-2 border-b border-dashed border-slate-400 text-[10px] bg-amber-50/70 p-1.5 rounded">
                <div className="font-bold text-amber-900 flex items-center gap-1">
                  <Award className="w-3 h-3 text-amber-600" /> PROGRAMA DE PUNTOS
                </div>
                {sale.pointsEarned && sale.pointsEarned > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Puntos Sumados:</span>
                    <span>+{sale.pointsEarned} pts</span>
                  </div>
                )}
                {sale.pointsRedeemed && sale.pointsRedeemed > 0 && (
                  <div className="flex justify-between text-rose-700">
                    <span>Puntos Canjeados:</span>
                    <span>-{sale.pointsRedeemed} pts</span>
                  </div>
                )}
                {sale.customerPointsBalance !== undefined && (
                  <div className="flex justify-between font-bold text-slate-800 pt-0.5">
                    <span>Nuevo Saldo de Puntos:</span>
                    <span>{sale.customerPointsBalance} pts</span>
                  </div>
                )}
              </div>
            )}

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

        {/* Digital Share Section & Modal Actions */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-2.5">
          {/* Digital Send Bar */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleShareWhatsApp()}
              className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" /> Enviar por WhatsApp
            </button>

            <button
              type="button"
              onClick={handleShareEmail}
              className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title="Enviar por Email"
            >
              <Mail className="w-4 h-4" /> Email
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className={`py-2 px-3 font-bold text-xs rounded-xl border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                copied
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
              title="Copiar texto del comprobante"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex gap-2 pt-1 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Imprimir en Papel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
