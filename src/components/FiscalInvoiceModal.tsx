import React, { useRef } from 'react';
import {
  FileText,
  Printer,
  Download,
  X,
  Building2,
  UserCheck,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { FiscalInvoice } from '../types/pos';
import { downloadInvoiceXML } from '../utils/fiscalUtils';

interface FiscalInvoiceModalProps {
  invoice: FiscalInvoice;
  onClose: () => void;
}

export const FiscalInvoiceModal: React.FC<FiscalInvoiceModalProps> = ({ invoice, onClose }) => {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadXML = () => {
    downloadInvoiceXML(invoice);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 select-none overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[95vh] my-auto animate-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base">
                  Comprobante Fiscal Digital
                </span>
                <span className="bg-blue-900 text-blue-200 text-xs font-mono font-bold px-2 py-0.5 rounded-full border border-blue-700">
                  {invoice.series}-{invoice.folio}
                </span>
                {invoice.status === 'CANCELLED' ? (
                  <span className="bg-rose-900 text-rose-200 text-xs font-bold px-2 py-0.5 rounded-full border border-rose-700">
                    CANCELADA
                  </span>
                ) : (
                  <span className="bg-emerald-900 text-emerald-200 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> TIMBRADA
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate max-w-sm sm:max-w-md">
                UUID: {invoice.uuid}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Viewport */}
        <div className="p-4 sm:p-6 bg-slate-100 overflow-y-auto flex-1 select-text">
          <div
            ref={invoiceRef}
            id="printable-fiscal-invoice"
            className="printable-invoice bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow border border-slate-200 text-xs space-y-6 max-w-2xl mx-auto"
          >
            {/* Top Fiscal Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b-2 border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg text-slate-900 tracking-tight uppercase">
                    {invoice.emitter.businessName}
                  </span>
                </div>
                <p className="text-slate-600 font-semibold">
                  RFC / CUIT: <span className="font-mono text-slate-900">{invoice.emitter.taxId}</span>
                </p>
                <p className="text-slate-500 text-[11px]">{invoice.emitter.fiscalAddress}</p>
                <p className="text-slate-500 text-[11px]">C.P. {invoice.emitter.postalCode} • Tel: {invoice.emitter.phone || 'N/A'}</p>
                <p className="text-slate-500 text-[11px] font-medium">
                  Régimen Fiscal: <span className="text-slate-700">{invoice.emitter.taxRegime}</span>
                </p>
              </div>

              <div className="sm:text-right bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 min-w-[200px]">
                <div className="font-black text-sm text-blue-800 uppercase">
                  {invoice.type.replace('_', ' ')}
                </div>
                <div className="font-mono font-black text-base text-slate-900">
                  FOLIO: {invoice.series}-{invoice.folio}
                </div>
                <div className="text-[11px] text-slate-500">
                  Fecha Emisión: {new Date(invoice.emittedAt).toLocaleString('es-AR')}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {invoice.ticketNumber ? `Ticket Venta: #${invoice.ticketNumber}` : ''}
                </div>
              </div>
            </div>

            {/* Receiver Tax Info */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Datos del Receptor / Cliente
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Razón Social / Nombre:</span>
                  <span className="font-bold text-slate-900">{invoice.receiver.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">RFC / CUIT / Identificación:</span>
                  <span className="font-mono font-bold text-slate-900">{invoice.receiver.taxId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Régimen Fiscal Receptor:</span>
                  <span className="text-slate-700 font-medium">{invoice.receiver.taxRegime}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Uso CFDI / Destino:</span>
                  <span className="text-slate-700 font-medium">{invoice.receiver.cfdiUsage}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500 block text-[10px]">Domicilio Fiscal Receptor:</span>
                  <span className="text-slate-700 font-medium">{invoice.receiver.fiscalAddress} (C.P. {invoice.receiver.postalCode})</span>
                </div>
              </div>
            </div>

            {/* Concept Items Table */}
            <div>
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                Conceptos Facturados
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-[10px] font-extrabold text-slate-500 uppercase bg-slate-50">
                      <th className="py-2 px-2">Cant</th>
                      <th className="py-2 px-2">Clave SAT</th>
                      <th className="py-2 px-2">Descripción</th>
                      <th className="py-2 px-2 text-right">P. Unit</th>
                      <th className="py-2 px-2 text-right">IVA</th>
                      <th className="py-2 px-2 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-2 font-mono font-bold">{item.quantity}</td>
                        <td className="py-2 px-2 font-mono text-[11px] text-slate-500">{item.satProductCode || '50192100'}</td>
                        <td className="py-2 px-2">
                          <span className="font-semibold text-slate-900 block">{item.productName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Cod: {item.barcode}</span>
                        </td>
                        <td className="py-2 px-2 text-right font-mono">${item.unitPrice.toFixed(2)}</td>
                        <td className="py-2 px-2 text-right font-mono text-slate-600">
                          ${item.vatAmount.toFixed(2)} ({item.vatRate}%)
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                          ${item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals and Payment breakdown */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-3 border-t border-slate-200">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div>
                  <span className="font-bold text-slate-700">Método de Pago:</span> {invoice.paymentMethod}
                </div>
                <div>
                  <span className="font-bold text-slate-700">Forma de Pago:</span> {invoice.paymentForm}
                </div>
                <div>
                  <span className="font-bold text-slate-700">Moneda:</span> {invoice.currency} (Pesos)
                </div>
                <div>
                  <span className="font-bold text-slate-700">Caja / Cajero:</span> {invoice.registerName} • {invoice.cashierName}
                </div>
              </div>

              <div className="w-full sm:w-64 space-y-1.5 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Neto:</span>
                  <span className="font-mono font-bold">${invoice.subtotal.toFixed(2)}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Descuento:</span>
                    <span className="font-mono font-bold">-${invoice.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>IVA Trasladado:</span>
                  <span className="font-mono font-bold">${invoice.vatTotal.toFixed(2)}</span>
                </div>
                {invoice.iepsTotal > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>IEPS Trasladado:</span>
                    <span className="font-mono font-bold">${invoice.iepsTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-300">
                  <span>TOTAL:</span>
                  <span className="font-mono text-blue-900">${invoice.total.toFixed(2)} {invoice.currency}</span>
                </div>
              </div>
            </div>

            {/* Digital Stamp & QR Footer (CFDI / AFIP Stamp) */}
            <div className="pt-4 border-t border-dashed border-slate-300 flex flex-col sm:flex-row items-center gap-4 text-[10px] text-slate-500 font-mono">
              <div className="shrink-0 bg-white p-2 border border-slate-200 rounded-lg shadow-sm">
                {/* Visual QR Simulator */}
                <div className="w-24 h-24 bg-slate-900 flex items-center justify-center text-white rounded p-1 text-center">
                  <QrCode className="w-16 h-16 text-white" />
                </div>
              </div>

              <div className="space-y-1 overflow-hidden w-full break-all">
                <div>
                  <span className="font-bold text-slate-700">Folio Fiscal Digital (UUID): </span>
                  <span className="text-slate-900 font-bold">{invoice.uuid}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700">No. Certificado Digital Emisor: </span>
                  <span>{invoice.emitter.taxId ? '30001000000500003412' : '0000000000'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700">CAE / Timbre SAT: </span>
                  <span>{invoice.caeOrStampNumber || '74128956230191'} (Vto: {invoice.caeExpirationDate || '2026-08-30'})</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700">Sello Digital del Emisor: </span>
                  <span className="truncate block max-w-md">{invoice.digitalStampEmitter || 'c2VsbG9fZGlnaXRhbF9yZWNyZW9fcGR2XzIwMjY='}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700">Sello Digital del SAT / AFIP: </span>
                  <span className="truncate block max-w-md">{invoice.digitalStampSat || 'c2VsbG9fc2F0X3RpbWJyYWRvX29maWNpYWxfMjAyNg=='}</span>
                </div>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-2 font-medium">
              Este documento es una representación impresa de un Comprobante Fiscal Digital (CFDI / Factura Electrónica).
            </div>
          </div>
        </div>

        {/* Modal Action Bar */}
        <div className="p-3 sm:p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap gap-2 justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
          <button
            onClick={handleDownloadXML}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" /> Descargar XML Fiscal
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Imprimir Factura / Guardar PDF
          </button>
        </div>
      </div>
    </div>
  );
};
