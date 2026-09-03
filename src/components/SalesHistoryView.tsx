import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Printer,
  RotateCcw,
  Trash2,
  Download,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  PackageCheck,
  X,
  Clock,
  User,
  CreditCard,
} from 'lucide-react';
import { Sale, CashRegister, Cashier } from '../types/pos';
import { exportSalesCSV } from '../utils/exportUtils';

interface SalesHistoryViewProps {
  sales: Sale[];
  registers: CashRegister[];
  activeCashier?: Cashier | null;
  isAdmin?: boolean;
  onCancelSale: (saleId: string) => void;
  onDeleteSale?: (saleId: string, restoreStock?: boolean) => Promise<void>;
  onOpenReceiptModal: (sale: Sale) => void;
  onOpenReturnModal?: (sale: Sale) => void;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({
  sales = [],
  registers = [],
  activeCashier = null,
  isAdmin = false,
  onCancelSale,
  onDeleteSale,
  onOpenReceiptModal,
  onOpenReturnModal,
}) => {
  const [search, setSearch] = useState('');
  const [selectedRegisterId, setSelectedRegisterId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');

  // Deletion Modal State
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [restoreStockOnDelete, setRestoreStockOnDelete] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const canDeleteSales = isAdmin || Boolean(activeCashier?.permissions?.allowDeleteSales);

  const filteredSales = (sales || []).filter((s) => {
    const matchesSearch =
      s.ticketNumber.toString().includes(search) ||
      (s.customerName && s.customerName.toLowerCase().includes(search.toLowerCase())) ||
      s.cashierName.toLowerCase().includes(search.toLowerCase());

    const matchesReg = selectedRegisterId === 'ALL' || s.registerId === selectedRegisterId;
    const matchesStatus = selectedStatus === 'ALL' || s.status === selectedStatus;

    return matchesSearch && matchesReg && matchesStatus;
  });

  const handleConfirmDelete = async () => {
    if (!saleToDelete || !onDeleteSale) return;
    try {
      setIsDeleting(true);
      await onDeleteSale(saleToDelete.id, restoreStockOnDelete);
      setActionSuccessMsg(`Venta #${saleToDelete.ticketNumber} eliminada permanentemente del sistema.`);
      setSaleToDelete(null);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Error al eliminar la venta: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-3 space-y-3 sm:space-y-4 select-none pb-16">
      {/* Success Notification Banner */}
      {actionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center justify-between text-xs font-semibold shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-100 text-teal-700 rounded-xl shrink-0">
            <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-extrabold text-base sm:text-lg text-slate-800">
                [F11] Historial de Ventas y Comprobantes
              </h2>
              {canDeleteSales && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  <ShieldAlert className="w-3 h-3" /> Modo Admin (Borrado Habilitado)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Consulta transacciones pasadas, re-imprime comprobantes, realiza cancelaciones o borra registros
            </p>
          </div>
        </div>

        <button
          onClick={() => exportSalesCSV(filteredSales)}
          className="w-full sm:w-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px]"
          title="Exportar reporte de ventas a Excel/CSV"
        >
          <Download className="w-4 h-4 text-teal-600" /> Exportar Ventas CSV
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs font-medium">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por # Ticket, cliente o cajero..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <select
            value={selectedRegisterId}
            onChange={(e) => setSelectedRegisterId(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none min-h-[36px]"
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
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none min-h-[36px]"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="COMPLETED">Completadas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
        </div>
      </div>

      {/* Sales Display (Mobile Cards + Desktop Table) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Mobile Sales Cards (md:hidden) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredSales.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No hay ventas registradas con los filtros seleccionados.
            </div>
          ) : (
            filteredSales.map((sale) => (
              <div key={`mob-sale-${sale.id}`} className="p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-teal-700 text-sm">#{sale.ticketNumber}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          sale.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {sale.status === 'COMPLETED' ? 'Completada' : 'Cancelada'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {new Date(sale.timestamp).toLocaleString('es-AR')} • {sale.registerName}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-black text-base text-slate-900 block">
                      ${sale.total.toFixed(2)}
                    </span>
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.2 rounded uppercase">
                      {sale.paymentMethod}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                  <div className="text-slate-600 truncate max-w-[180px]">
                    <span className="text-slate-400">Cliente: </span>
                    <span className="font-bold text-indigo-900">{sale.customerName || 'Público General'}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenReceiptModal(sale)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="Ver / Imprimir Ticket"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {sale.status === 'COMPLETED' && onOpenReturnModal && (
                      <button
                        onClick={() => onOpenReturnModal(sale)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 bg-rose-50/50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                        title="Procesar Devolución / Reembolso / Saldo a Favor"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}

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
                        className="p-1.5 text-amber-700 hover:bg-amber-50 bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="Cancelar Venta Completa"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}

                    {canDeleteSales && (
                      <button
                        onClick={() => {
                          setSaleToDelete(sale);
                          setRestoreStockOnDelete(sale.status !== 'CANCELLED');
                        }}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 bg-rose-50/50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                        title="Borrar Venta Permanentemente (Admin)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
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
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onOpenReceiptModal(sale)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Ver / Imprimir Ticket"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {sale.status === 'COMPLETED' && onOpenReturnModal && (
                          <button
                            onClick={() => onOpenReturnModal(sale)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Procesar Devolución / Saldo a Favor"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}

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
                            className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Cancelar Venta Completa"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}

                        {canDeleteSales && (
                          <button
                            onClick={() => {
                              setSaleToDelete(sale);
                              setRestoreStockOnDelete(sale.status !== 'CANCELLED');
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Borrar Venta Definitivamente (Admin)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Delete Sale Confirmation Modal */}
      {saleToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-rose-950">
                      Eliminar Venta Permanentemente
                    </h3>
                    <span className="text-[10px] font-bold bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded-md uppercase">
                      Admin
                    </span>
                  </div>
                  <p className="text-xs text-rose-800 font-medium">
                    Ticket #{saleToDelete.ticketNumber} • ${saleToDelete.total.toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => !isDeleting && setSaleToDelete(null)}
                disabled={isDeleting}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3.5 overflow-y-auto text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-medium flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">
                  Esta acción <strong>eliminará por completo el registro de la venta</strong> de la base de datos.
                  No aparecerá más en los reportes ni en el historial.
                </p>
              </div>

              {/* Summary details card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Detalles de la Transacción:
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(saleToDelete.timestamp).toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">Cajero: {saleToDelete.cashierName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Pago: {saleToDelete.paymentMethod}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-normal">Cliente:</span>
                    <span className="text-indigo-900 font-bold truncate">
                      {saleToDelete.customerName || 'Público General'}
                    </span>
                  </div>
                </div>

                {/* Items List Preview */}
                <div className="pt-2 border-t border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500">
                    Artículos ({saleToDelete.items?.length || 0}):
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                    {saleToDelete.items?.map((item, idx) => (
                      <div key={`del-item-${idx}`} className="flex justify-between text-slate-600 bg-white p-1.5 rounded border border-slate-100">
                        <span className="truncate">
                          {item.quantity}x {item.product?.name || item.productId}
                        </span>
                        <span className="font-bold text-slate-800 shrink-0 ml-2">
                          ${(item.total || item.quantity * item.unitPrice).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stock Restoration Option */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/80 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={restoreStockOnDelete}
                  onChange={(e) => setRestoreStockOnDelete(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                    <PackageCheck className="w-4 h-4 text-teal-600" />
                    <span>Devolver existencias al inventario</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Reintegrar automáticamente las cantidades vendidas al stock de cada producto.
                    {saleToDelete.paymentMethod === 'CREDITO' && (
                      <span className="block text-indigo-700 font-semibold mt-0.5">
                        • Se descontará el importe adeudado de la cuenta corriente del cliente.
                      </span>
                    )}
                  </div>
                </div>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSaleToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sí, Eliminar Venta</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
