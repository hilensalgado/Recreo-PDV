import React, { useState } from 'react';
import { Receipt, Search, Printer, RotateCcw, Calendar, Filter, X, Download } from 'lucide-react';
import { Sale, CashRegister } from '../types/pos';
import { exportSalesCSV } from '../utils/exportUtils';

interface SalesHistoryViewProps {
  sales: Sale[];
  registers: CashRegister[];
  onCancelSale: (saleId: string) => void;
  onOpenReceiptModal: (sale: Sale) => void;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({
  sales = [],
  registers = [],
  onCancelSale,
  onOpenReceiptModal,
}) => {
  const [search, setSearch] = useState('');
  const [selectedRegisterId, setSelectedRegisterId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');

  const filteredSales = (sales || []).filter((s) => {
    const matchesSearch =
      s.ticketNumber.toString().includes(search) ||
      (s.customerName && s.customerName.toLowerCase().includes(search.toLowerCase())) ||
      s.cashierName.toLowerCase().includes(search.toLowerCase());

    const matchesReg = selectedRegisterId === 'ALL' || s.registerId === selectedRegisterId;
    const matchesStatus = selectedStatus === 'ALL' || s.status === selectedStatus;

    return matchesSearch && matchesReg && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto p-3 space-y-4 select-none">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-100 text-teal-700 rounded-xl">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-slate-800">
              [F11] Historial de Ventas y Devoluciones
            </h2>
            <p className="text-xs text-slate-500">
              Consulta transacciones pasadas, re-imprime comprobantes y realiza cancelaciones
            </p>
          </div>
        </div>

        <button
          onClick={() => exportSalesCSV(filteredSales)}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5"
          title="Exportar reporte de ventas a Excel/CSV"
        >
          <Download className="w-4 h-4 text-teal-600" /> Exportar Ventas CSV
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 text-xs font-medium">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por # de Ticket, cliente o cajero..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <select
          value={selectedRegisterId}
          onChange={(e) => setSelectedRegisterId(e.target.value)}
          className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
        >
          <option value="ALL">Todas las Cajas</option>
          {registers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as any)}
          className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
        >
          <option value="ALL">Todos los Estados</option>
          <option value="COMPLETED">Completadas</option>
          <option value="CANCELLED">Canceladas / Devueltas</option>
        </select>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="p-3"># Ticket</th>
                <th className="p-3">Hora / Fecha</th>
                <th className="p-3">Caja</th>
                <th className="p-3">Cajero</th>
                <th className="p-3">Cliente</th>
                <th className="p-3 text-center">Método Pago</th>
                <th className="p-3 text-right">Total ($)</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No hay ventas registradas.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-teal-700">#{sale.ticketNumber}</td>
                    <td className="p-3 text-slate-600">
                      {new Date(sale.timestamp).toLocaleString('es-AR')}
                    </td>
                    <td className="p-3 text-slate-700 font-semibold">{sale.registerName}</td>
                    <td className="p-3 text-slate-600">{sale.cashierName}</td>
                    <td className="p-3 text-indigo-800 font-bold">
                      {sale.customerName || 'Público General'}
                    </td>
                    <td className="p-3 text-center">
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2 py-0.5 rounded border border-slate-200 uppercase">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3 text-right font-black text-sm text-slate-900">
                      ${sale.total.toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          sale.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {sale.status === 'COMPLETED' ? 'Completada' : 'Cancelada'}
                      </span>
                    </td>
                    <td className="p-3 text-center space-x-1">
                      <button
                        onClick={() => onOpenReceiptModal(sale)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Ver / Imprimir Ticket"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {sale.status === 'COMPLETED' && (
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `¿Seguro que deseas cancelar el ticket #${sale.ticketNumber}? Esto regresará las existencias al inventario.`
                              )
                            ) {
                              onCancelSale(sale.id);
                            }
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Cancelar Venta / Devolución"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
