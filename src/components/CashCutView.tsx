import React, { useState } from 'react';
import {
  DollarSign,
  Calculator,
  Printer,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Store,
  Clock,
  Lock,
  PlusCircle,
  ShieldAlert,
  Banknote,
  Trash2,
  Search,
  CheckSquare,
  Square,
  History,
  X,
  Filter,
  Eye,
  EyeOff,
  QrCode,
  ArrowRightLeft,
} from 'lucide-react';
import { CashShift, CashRegister, Sale, CashMovement } from '../types/pos';

interface CashCutViewProps {
  activeShift: CashShift | null;
  activeRegister: CashRegister | null;
  registers: CashRegister[];
  shifts?: CashShift[];
  sales: Sale[];
  movements: CashMovement[];
  isAdmin?: boolean;
  onCloseShift: (declaredCash: number, notes?: string) => void;
  onOpenReceiptModal?: (shift: CashShift) => void;
  onOpenShiftModal?: () => void;
  onSelectRegister?: (register: CashRegister) => void;
  onDeleteShift?: (shiftId: string) => Promise<void> | void;
  onDeleteShiftsBatch?: (shiftIds: string[]) => Promise<void> | void;
}

export const CashCutView: React.FC<CashCutViewProps> = ({
  activeShift,
  activeRegister,
  registers = [],
  shifts = [],
  sales = [],
  movements = [],
  isAdmin = true,
  onCloseShift,
  onOpenReceiptModal,
  onOpenShiftModal,
  onSelectRegister,
  onDeleteShift,
  onDeleteShiftsBatch,
}) => {
  // Navigation when activeShift exists: allows jumping to history view
  const [showHistoryTab, setShowHistoryTab] = useState(false);

  // Search & Filters for closed shifts
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCashierFilter, setSelectedCashierFilter] = useState('');
  const [selectedRegisterFilter, setSelectedRegisterFilter] = useState('');

  // Shift selection for batch operations
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([]);

  // Deletion modals state
  const [shiftToDelete, setShiftToDelete] = useState<CashShift | null>(null);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Argentine Peso (ARS) Cash Denomination Calculator (Solo Billetes de Curso Legal)
  const [b20000, setB20000] = useState(0);
  const [b10000, setB10000] = useState(0);
  const [b2000, setB2000] = useState(0);
  const [b1000, setB1000] = useState(0);
  const [b500, setB500] = useState(0);
  const [b200, setB200] = useState(0);
  const [b100, setB100] = useState(0);
  const [b50, setB50] = useState(0);
  const [b20, setB20] = useState(0);
  const [b10, setB10] = useState(0);

  const [notes, setNotes] = useState('');

  // Blind Count: Keep system expected cash masked until cashier enters their count or explicitly reveals
  const [isBlindRevealed, setIsBlindRevealed] = useState<boolean>(false);

  // Selected shift for inspection in supervisor mode
  const [inspectedShift, setInspectedShift] = useState<CashShift | null>(null);

  const targetShift = activeShift || inspectedShift;

  const resetAllDenominations = () => {
    setB20000(0);
    setB10000(0);
    setB2000(0);
    setB1000(0);
    setB500(0);
    setB200(0);
    setB100(0);
    setB50(0);
    setB20(0);
    setB10(0);
  };

  const calculatedPhysicalCash =
    b20000 * 20000 +
    b10000 * 10000 +
    b2000 * 2000 +
    b1000 * 1000 +
    b500 * 500 +
    b200 * 200 +
    b100 * 100 +
    b50 * 50 +
    b20 * 20 +
    b10 * 10;

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const expectedCash = targetShift ? targetShift.expectedCash : 0;
  const difference = calculatedPhysicalCash - expectedCash;

  const handleConfirmClose = () => {
    if (!targetShift) return;
    setShowConfirmModal(true);
  };

  const executeCloseShift = () => {
    setShowConfirmModal(false);
    onCloseShift(calculatedPhysicalCash, notes);
  };

  const handleExecuteDeleteSingle = async () => {
    if (!shiftToDelete || !onDeleteShift) return;
    setIsDeleting(true);
    try {
      await onDeleteShift(shiftToDelete.id);
      setSelectedShiftIds((prev) => prev.filter((id) => id !== shiftToDelete.id));
      const deletedName = shiftToDelete.cashierName || 'Cajero';
      setShiftToDelete(null);
      setActionFeedback({
        type: 'success',
        message: `El cierre de caja de ${deletedName} fue eliminado exitosamente.`,
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Error al eliminar el cierre de caja.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExecuteDeleteBatch = async () => {
    if (selectedShiftIds.length === 0 || !onDeleteShiftsBatch) return;
    setIsDeleting(true);
    try {
      const count = selectedShiftIds.length;
      await onDeleteShiftsBatch(selectedShiftIds);
      setSelectedShiftIds([]);
      setShowBatchDeleteModal(false);
      setActionFeedback({
        type: 'success',
        message: `Se eliminaron ${count} cierres de caja exitosamente.`,
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Error al eliminar los cierres de caja seleccionados.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const allClosedShifts = (shifts || [])
    .filter((s) => s.status === 'CLOSED')
    .sort(
      (a, b) =>
        new Date(b.closedAt || b.openedAt).getTime() -
        new Date(a.closedAt || a.openedAt).getTime()
    );

  const uniqueCashiers = Array.from(
    new Map(
      allClosedShifts.filter((s) => s.cashierName).map((s) => [s.cashierId, s.cashierName])
    ).entries()
  );

  const uniqueRegisters = Array.from(
    new Map(
      allClosedShifts.filter((s) => s.registerName).map((s) => [s.registerId, s.registerName])
    ).entries()
  );

  const filteredClosedShifts = allClosedShifts.filter((cs) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      (cs.registerName || '').toLowerCase().includes(term) ||
      (cs.cashierName || '').toLowerCase().includes(term) ||
      (cs.notes || '').toLowerCase().includes(term) ||
      (cs.id || '').toLowerCase().includes(term);
    const matchesCashier = !selectedCashierFilter || cs.cashierId === selectedCashierFilter;
    const matchesRegister = !selectedRegisterFilter || cs.registerId === selectedRegisterFilter;
    return matchesSearch && matchesCashier && matchesRegister;
  });

  const toggleSelectShift = (id: string) => {
    setSelectedShiftIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedShiftIds.length === filteredClosedShifts.length && filteredClosedShifts.length > 0) {
      setSelectedShiftIds([]);
    } else {
      setSelectedShiftIds(filteredClosedShifts.map((s) => s.id));
    }
  };

  // If no shift is open in current terminal and not inspecting one, show supervisor monitor
  if (!targetShift || targetShift.status === 'CLOSED' || showHistoryTab) {
    const openShifts = shifts.filter((s) => s.status === 'OPEN');

    return (
      <div className="max-w-7xl mx-auto p-3 sm:p-4 space-y-4 select-none pb-16">
        {/* Supervisor Monitor Header */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 text-purple-800 rounded-xl shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-lg text-slate-800">
                  Panel de Supervisión de Cajas y Turnos
                </h2>
                <span className="bg-purple-100 text-purple-800 font-black text-[10px] uppercase px-2 py-0.5 rounded-full border border-purple-200">
                  Modo Auditoría
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Monitorea en tiempo real los turnos abiertos por los cajeros, ventas acumuladas y arqueos de caja
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeShift && showHistoryTab && (
              <button
                type="button"
                onClick={() => setShowHistoryTab(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                ← Volver a Mi Arqueo Activo ({activeShift.registerName || 'Caja'})
              </button>
            )}

            {onOpenShiftModal && !activeShift && (
              <button
                type="button"
                onClick={onOpenShiftModal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> Abrir Turno en esta Caja
              </button>
            )}
          </div>
        </div>

        {/* Feedback alert message */}
        {actionFeedback && (
          <div
            className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs font-semibold ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{actionFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionFeedback(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ALERTA DESTACADA: Cuando no hay cajas abiertas */}
        {openShifts.length === 0 && (
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-0.5 rounded-2xl shadow-md">
            <div className="bg-white p-5 sm:p-6 rounded-[14px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl shrink-0 border border-amber-200">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-900 font-black text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-amber-300">
                      Alerta de Operación
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Terminales Inactivas</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    No hay cajas con turnos abiertos en este momento
                  </h3>
                  <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                    Actualmente ninguna terminal cuenta con un turno activo de caja. Para realizar arqueos de corte de caja, registrar ventas o cobros, es necesario abrir un turno con su correspondiente fondo de caja inicial.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                {onOpenShiftModal && (
                  <button
                    type="button"
                    onClick={onOpenShiftModal}
                    className="flex-1 md:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" /> Abrir Turno de Caja
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Active Shifts Section */}
        {openShifts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" /> Turnos Activos en Cajas ({openShifts.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {openShifts.map((s) => {
                const shiftSales = (sales || []).filter((sl) => sl.shiftId === s.id && sl.status !== 'CANCELLED');
                const totalSales = (s.totalSalesCash || 0) + (s.totalSalesCard || 0) + (s.totalSalesCredit || 0) || shiftSales.reduce((sum, sl) => sum + (sl.total || 0), 0);

                return (
                  <div
                    key={s.id}
                    className="bg-white p-4 rounded-xl border-2 border-emerald-200 shadow-sm space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div>
                        <div className="font-extrabold text-slate-800 text-sm">{s.registerName || 'Caja'}</div>
                        <div className="text-[11px] text-slate-500 font-medium">Cajero: <strong className="text-slate-700">{s.cashierName || 'Cajero'}</strong></div>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 font-black text-[9px] uppercase px-2 py-0.5 rounded border border-emerald-300">
                        ● EN VIVO
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div className="text-[9px] uppercase text-slate-400 font-bold">Fondo Inicial</div>
                        <div className="font-mono font-bold text-slate-700">
                          ${(s.initialCash || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div className="text-[9px] uppercase text-slate-400 font-bold">Ventas Totales</div>
                        <div className="font-mono font-bold text-emerald-600">
                          ${totalSales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100 flex items-center justify-between">
                      <div className="text-[10px] uppercase text-emerald-800 font-bold">Efectivo en Gaveta</div>
                      <div className="font-mono font-black text-emerald-800 text-sm">
                        ${(s.expectedCash || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {onOpenReceiptModal && (
                        <button
                          type="button"
                          onClick={() => onOpenReceiptModal(s)}
                          className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" /> Ticket Z
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setInspectedShift(s)}
                        className="flex-1 py-1.5 px-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Calculator className="w-3.5 h-3.5" /> Arqueo / Cierre
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Estado de las Cajas Registradas */}
        {registers && registers.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-black text-sm text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Store className="w-4 h-4 text-slate-500" /> Terminales Registradas ({registers.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {registers.map((reg) => {
                const isRegOpen = (shifts || []).some((s) => s.registerId === reg.id && s.status === 'OPEN');
                return (
                  <div
                    key={reg.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isRegOpen
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-sm text-slate-800">{reg.name}</span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isRegOpen
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {isRegOpen ? 'Abierta' : 'Cerrada'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">{reg.location || 'Ubicación estándar'}</p>
                    {!isRegOpen && onSelectRegister && (
                      <button
                        type="button"
                        onClick={() => onSelectRegister(reg)}
                        className="w-full py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Abrir esta caja
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* History of Closed Shifts with Search, Filters and Delete Actions */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-slate-600" />
                Historial de Cierres de Caja y Arqueos
              </h3>
              <span className="bg-slate-200 text-slate-700 font-bold text-xs px-2 py-0.5 rounded-full">
                {allClosedShifts.length} {allClosedShifts.length === 1 ? 'cierre' : 'cierres'}
              </span>
            </div>

            {/* Quick Actions */}
            {allClosedShifts.length > 0 && (
              <div className="flex items-center gap-2">
                {selectedShiftIds.length > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowBatchDeleteModal(true)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar seleccionados ({selectedShiftIds.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedShiftIds([])}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl border border-slate-200 cursor-pointer"
                    >
                      Deseleccionar
                    </button>
                  </>
                ) : (
                  filteredClosedShifts.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                      <span>Seleccionar todos ({filteredClosedShifts.length})</span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Search and Filters Bar */}
          {allClosedShifts.length > 0 && (
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por cajero, caja, notas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {uniqueCashiers.length > 1 && (
                <div className="flex items-center gap-1 text-xs">
                  <select
                    value={selectedCashierFilter}
                    onChange={(e) => setSelectedCashierFilter(e.target.value)}
                    className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Todos los cajeros</option>
                    {uniqueCashiers.map(([id, name]) => (
                      <option key={id} value={id}>
                        Cajero: {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {uniqueRegisters.length > 1 && (
                <div className="flex items-center gap-1 text-xs">
                  <select
                    value={selectedRegisterFilter}
                    onChange={(e) => setSelectedRegisterFilter(e.target.value)}
                    className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Todas las cajas</option>
                    {uniqueRegisters.map(([id, name]) => (
                      <option key={id} value={id}>
                        Caja: {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(searchTerm || selectedCashierFilter || selectedRegisterFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCashierFilter('');
                    setSelectedRegisterFilter('');
                  }}
                  className="px-2.5 py-1.5 text-xs text-purple-700 hover:text-purple-900 font-bold underline cursor-pointer"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}

          {/* Batch Selection Banner */}
          {selectedShiftIds.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                <CheckSquare className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  {selectedShiftIds.length} {selectedShiftIds.length === 1 ? 'cierre seleccionado' : 'cierres seleccionados'}.
                </span>
                <span className="text-rose-700 font-normal hidden sm:inline">
                  Puedes eliminarlos juntos si fueron pruebas ficticias.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBatchDeleteModal(true)}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-lg shadow transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar ({selectedShiftIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedShiftIds([])}
                  className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 text-xs font-semibold rounded-lg border border-rose-200 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredClosedShifts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredClosedShifts.length > 0 &&
                            selectedShiftIds.length === filteredClosedShifts.length
                          }
                          onChange={toggleSelectAll}
                          className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer w-4 h-4"
                          title="Seleccionar todos"
                        />
                      </th>
                      <th className="p-3">Caja / Terminal</th>
                      <th className="p-3">Cajero</th>
                      <th className="p-3">Apertura - Cierre</th>
                      <th className="p-3 text-right">Fondo</th>
                      <th className="p-3 text-right">Ventas</th>
                      <th className="p-3 text-right">Efectivo Decl.</th>
                      <th className="p-3 text-right">Diferencia</th>
                      <th className="p-3">Notas</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClosedShifts.map((cs) => {
                      const diff = (cs.declaredCash || 0) - (cs.expectedCash || 0);
                      const shiftTotalSales =
                        (cs.totalSalesCash || 0) +
                        (cs.totalSalesCard || 0) +
                        (cs.totalSalesCredit || 0);
                      const isSelected = selectedShiftIds.includes(cs.id);

                      return (
                        <tr
                          key={cs.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-purple-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectShift(cs.id)}
                              className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer w-4 h-4"
                            />
                          </td>
                          <td className="p-3 font-semibold text-slate-800">
                            {cs.registerName || 'Caja'}
                          </td>
                          <td className="p-3 text-slate-600">{cs.cashierName || 'Cajero'}</td>
                          <td className="p-3 text-[11px] text-slate-500">
                            <div className="font-medium text-slate-700">
                              {cs.closedAt
                                ? new Date(cs.closedAt).toLocaleDateString('es-AR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                  })
                                : cs.openedAt
                                ? new Date(cs.openedAt).toLocaleDateString('es-AR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                  })
                                : ''}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {cs.openedAt
                                ? new Date(cs.openedAt).toLocaleTimeString('es-AR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '--:--'}{' '}
                              -{' '}
                              {cs.closedAt
                                ? new Date(cs.closedAt).toLocaleTimeString('es-AR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '-'}
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono font-medium">
                            ${(cs.initialCash || 0).toLocaleString('es-AR', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="p-3 text-right font-mono font-medium text-emerald-600">
                            ${shiftTotalSales.toLocaleString('es-AR', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            ${(cs.declaredCash || 0).toLocaleString('es-AR', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                Math.abs(diff) < 1
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : diff < 0
                                  ? 'bg-rose-100 text-rose-800 font-black'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {diff >= 0 ? '+' : ''}
                              ${diff.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 max-w-[140px] truncate text-[11px]" title={cs.notes}>
                            {cs.notes || '-'}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {onOpenReceiptModal && (
                                <button
                                  type="button"
                                  onClick={() => onOpenReceiptModal(cs)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="Ver comprobante / Ticket Z"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              )}
                              {onDeleteShift && (
                                <button
                                  type="button"
                                  onClick={() => setShiftToDelete(cs)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar este cierre de caja ficticio / de prueba"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <Search className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-700 text-sm">
                  {allClosedShifts.length === 0
                    ? 'No hay cierres de caja registrados'
                    : 'No se encontraron cierres con los filtros aplicados'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {allClosedShifts.length === 0
                    ? 'Los cierres y arqueos realizados aparecerán en este panel para consulta y auditoría.'
                    : 'Prueba modificando los términos de búsqueda o limpiando los filtros.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal: Confirm Delete Single Shift */}
        {shiftToDelete && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
              <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">¿Eliminar Cierre de Caja?</h3>
                  <p className="text-xs text-rose-700">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <p className="text-slate-600">
                  Se eliminará permanentemente el registro de este turno y arqueo de la base de datos Firestore:
                </p>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 font-medium">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Caja / Terminal:</span>
                    <span className="font-bold text-slate-800">{shiftToDelete.registerName || 'Caja'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cajero:</span>
                    <span className="font-bold text-slate-800">{shiftToDelete.cashierName || 'Cajero'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Apertura:</span>
                    <span className="text-slate-700">
                      {shiftToDelete.openedAt ? new Date(shiftToDelete.openedAt).toLocaleString('es-AR') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cierre:</span>
                    <span className="text-slate-700">
                      {shiftToDelete.closedAt ? new Date(shiftToDelete.closedAt).toLocaleString('es-AR') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Efectivo Declarado:</span>
                    <span className="font-bold text-slate-800 font-mono">
                      ${(shiftToDelete.declaredCash || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {shiftToDelete.notes && (
                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500">Notas:</span>
                      <span className="italic text-slate-600">{shiftToDelete.notes}</span>
                    </div>
                  )}
                </div>
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2 text-[11px] text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Si este cierre era ficticio o de prueba, se liberarán los registros y movimientos asociados.</span>
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShiftToDelete(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleExecuteDeleteSingle}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'Eliminando...' : 'Sí, eliminar cierre'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Confirm Batch Delete Shifts */}
        {showBatchDeleteModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
              <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    ¿Eliminar {selectedShiftIds.length} Cierres Seleccionados?
                  </h3>
                  <p className="text-xs text-rose-700">Eliminación masiva de turnos de prueba</p>
                </div>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <p className="text-slate-600">
                  Se eliminarán permanentemente los <strong className="text-slate-800">{selectedShiftIds.length}</strong> cierres de caja seleccionados de la base de datos Firestore.
                </p>
                <div className="max-h-40 overflow-y-auto bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                  {selectedShiftIds.map((id) => {
                    const shift = allClosedShifts.find((s) => s.id === id);
                    if (!shift) return null;
                    return (
                      <div key={id} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100 last:border-b-0">
                        <span className="font-semibold text-slate-700">
                          {shift.registerName || 'Caja'} - {shift.cashierName || 'Cajero'}
                        </span>
                        <span className="text-slate-500 font-mono text-[10px]">
                          {shift.closedAt
                            ? new Date(shift.closedAt).toLocaleDateString('es-AR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2 text-[11px] text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Esta operación limpiará los cierres ficticios y los movimientos vinculados. No se puede revertir.</span>
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowBatchDeleteModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleExecuteDeleteBatch}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'Eliminando...' : `Sí, eliminar (${selectedShiftIds.length}) cierres`}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-3 space-y-3 sm:space-y-4 select-none pb-16">
      {/* Top Header */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-base sm:text-lg text-slate-800">
              [F12] Corte de Caja y Cierre de Turno (Ticket Z)
            </h2>
            <p className="text-xs text-slate-500">
              Arqueo de dinero en efectivo, desglose por denominaciones (ARS) y declaración de saldo de cierre
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {inspectedShift && !activeShift && (
            <button
              type="button"
              onClick={() => setInspectedShift(null)}
              className="px-3.5 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs rounded-xl border border-purple-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px]"
            >
              ← Volver al Panel de Supervisión
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowHistoryTab(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px]"
            title="Ver historial de turnos y administrar cierres ficticios"
          >
            <History className="w-4 h-4 text-purple-600" /> Historial de Cierres
          </button>

          {onOpenReceiptModal && targetShift && (
            <button
              type="button"
              onClick={() => onOpenReceiptModal(targetShift)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px]"
            >
              <Printer className="w-4 h-4 text-slate-600" /> Prevista Ticket Z
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirmClose}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px]"
          >
            <CheckCircle2 className="w-4 h-4" /> CERRAR TURNO AHORA
          </button>
        </div>
      </div>

      {/* Grid Display: Left Summary Cards / Right Denomination Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Left Column (2 Cols): Financial Summary & Result */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          {/* Shift Details Box */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
              <div>
                <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-blue-600" /> Registro de Cierre: {targetShift?.registerName || activeRegister?.name || 'Caja'}
                </span>
                <span className="text-[11px] text-slate-500">
                  Cajero a cargo: <strong className="text-slate-700">{targetShift?.cashierName || 'Usuario'}</strong>
                </span>
              </div>
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Abierto:{' '}
                {targetShift?.openedAt
                  ? new Date(targetShift.openedAt).toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '--:--'}
              </span>
            </div>

            {/* Stats Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Fondo Inicial
                </span>
                <span className="text-sm font-black text-slate-800">
                  ${(targetShift?.initialCash || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Ventas Efectivo
                </span>
                <span className="text-sm font-black text-emerald-800">
                  +${(targetShift?.totalSalesCash || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                  Ventas Tarjeta
                </span>
                <span className="text-sm font-black text-blue-800">
                  ${(targetShift?.totalSalesCard || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-teal-50 p-2.5 rounded-xl border border-teal-200">
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
                  Transferencias
                </span>
                <span className="text-sm font-black text-teal-800">
                  ${(targetShift?.totalSalesTransfer || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-cyan-50 p-2.5 rounded-xl border border-cyan-200">
                <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider block">
                  Cobros QR
                </span>
                <span className="text-sm font-black text-cyan-800">
                  ${(targetShift?.totalSalesQR || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-200">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                  Ventas Crédito
                </span>
                <span className="text-sm font-black text-indigo-800">
                  ${(targetShift?.totalSalesCredit || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Incomes & Expenses Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs">
              <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                  Entradas de Efectivo
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-700">
                  +${(targetShift?.totalIncomes || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
                  Salidas (Pagos / Retiros)
                </span>
                <span className="text-base sm:text-lg font-black text-rose-600">
                  -${(targetShift?.totalExpenses || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Expected Cash in Drawer Card - Blind Count Aware */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Efectivo Esperado en Cajón
                  </span>
                  {!isBlindRevealed ? (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-extrabold uppercase">
                      🔒 Arqueo Ciego Activo
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-extrabold uppercase">
                      👁️ Conteo Revelado
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {!isBlindRevealed
                    ? 'Oculto por política de arqueo ciego para evitar manipulación del conteo físico.'
                    : 'Calculado por ventas en efectivo, fondo inicial, entradas y salidas.'}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-left sm:text-right">
                  {isBlindRevealed ? (
                    <>
                      <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                        ${expectedCash.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-slate-400 block font-bold">ARS ($)</span>
                    </>
                  ) : (
                    <div className="flex flex-col items-start sm:items-end">
                      <span className="text-2xl sm:text-3xl font-black tracking-widest text-slate-500 font-mono">
                        ••••••••
                      </span>
                      <span className="text-[11px] text-amber-400/80 font-bold">Conteo físico requerido</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsBlindRevealed(!isBlindRevealed)}
                  className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer shrink-0 ${
                    isBlindRevealed
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500 shadow-md'
                  }`}
                  title={isBlindRevealed ? 'Ocultar efectivo esperado' : 'Revelar arqueo de caja'}
                >
                  {isBlindRevealed ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      <span className="hidden sm:inline">Ocultar</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Revelar Arqueo</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Physical Cash vs Expected Comparison Box */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span>Resultado del Arqueo de Efectivo</span>
                </h3>
                {!isBlindRevealed && calculatedPhysicalCash > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsBlindRevealed(true)}
                    className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Finalizar conteo y ver diferencia</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-center text-xs">
                <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block">Efectivo Calculado (Sistema)</span>
                  <span className="text-sm sm:text-base font-extrabold text-slate-800 font-mono">
                    {isBlindRevealed ? `$${expectedCash.toFixed(2)}` : '••••••••'}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block">Efectivo Declarado (Contado)</span>
                  <span className="text-sm sm:text-base font-extrabold text-blue-600 font-mono">
                    ${calculatedPhysicalCash.toFixed(2)}
                  </span>
                </div>

                <div
                  className={`p-2.5 sm:p-3 rounded-lg border font-bold transition-all ${
                    !isBlindRevealed
                      ? 'bg-slate-100 border-slate-200 text-slate-600'
                      : Math.abs(difference) < 0.01
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : difference > 0
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <span className="text-[10px] uppercase block">Diferencia de Arqueo</span>
                  <span className="text-sm sm:text-base font-black font-mono">
                    {!isBlindRevealed
                      ? 'Pendiente de Revelar'
                      : Math.abs(difference) < 0.01
                      ? '$0.00 (Exacto)'
                      : difference > 0
                      ? `+$${difference.toFixed(2)} (Sobrante)`
                      : `-$${Math.abs(difference).toFixed(2)} (Faltante)`}
                  </span>
                </div>
              </div>

              {!isBlindRevealed && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Modo <strong>Arqueo Ciego</strong>: cuente los billetes de la caja sin influencias. Al terminar, pulse "Revelar Arqueo" o proceda directamente al cierre.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBlindRevealed(true)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shrink-0 cursor-pointer shadow-xs transition-colors"
                  >
                    Revelar Ahora
                  </button>
                </div>
              )}

              <textarea
                rows={2}
                placeholder="Notas opcionales del cierre de turno (ej. Se dejaron $20.000 para cambio del siguiente turno)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Cash Denomination Calculator (ARS) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 font-extrabold text-sm text-slate-800">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>Contador de Billetes (ARS)</span>
            </div>
            <button
              type="button"
              onClick={resetAllDenominations}
              className="text-[11px] text-slate-500 hover:text-rose-600 font-bold underline cursor-pointer"
            >
              Poner en cero
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {/* Billetes */}
            <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 block">
              Billetes de Curso Legal (ARS):
            </span>

            {[
              { label: '$20.000', sub: 'Alberdi', val: b20000, setVal: setB20000, mul: 20000 },
              { label: '$10.000', sub: 'Belgrano', val: b10000, setVal: setB10000, mul: 10000 },
              { label: '$2.000', sub: 'Carrillo', val: b2000, setVal: setB2000, mul: 2000 },
              { label: '$1.000', sub: 'San Martín / Hornero', val: b1000, setVal: setB1000, mul: 1000 },
              { label: '$500', sub: 'Yaguareté', val: b500, setVal: setB500, mul: 500 },
              { label: '$200', sub: 'Ballena Franca', val: b200, setVal: setB200, mul: 200 },
              { label: '$100', sub: 'Evita / Roca / Taruca', val: b100, setVal: setB100, mul: 100 },
              { label: '$50', sub: 'Cóndor / Malvinas', val: b50, setVal: setB50, mul: 50 },
              { label: '$20', sub: 'Guanaco / Rosas', val: b20, setVal: setB20, mul: 20 },
              { label: '$10', sub: 'Manuel Belgrano', val: b10, setVal: setB10, mul: 10 },
            ].map((row, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 py-0.5">
                <div className="w-24">
                  <span className="font-bold text-slate-700 block">{row.label}</span>
                  <span className="text-[9px] text-slate-400 truncate block leading-tight">{row.sub}</span>
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={row.val || ''}
                  onChange={(e) => row.setVal(parseInt(e.target.value) || 0)}
                  className="w-16 p-1 bg-slate-50 border border-slate-300 rounded text-right font-bold text-slate-900 focus:bg-white focus:outline-indigo-500"
                />
                <span className="font-mono text-slate-600 font-bold text-right w-24">
                  ${(row.val * row.mul).toLocaleString('es-AR')}
                </span>
              </div>
            ))}

            <div className="border-t border-slate-200 pt-3 flex justify-between items-center font-black text-sm text-blue-700">
              <span>Total Billetes Contados (ARS):</span>
              <span>${calculatedPhysicalCash.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* In-App Shift Close Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-up">
            <div className="bg-gradient-to-r from-rose-600 to-slate-900 p-4 text-white flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <DollarSign className="w-6 h-6 text-rose-200" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">¿Confirmar Cierre de Turno?</h3>
                <p className="text-xs text-rose-100/80">Se generará el reporte de Corte Z y se liberará la caja</p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Caja:</span>
                  <span className="font-bold text-slate-800">{activeRegister?.name || targetShift?.registerName || 'Caja Principal'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Efectivo Declarado:</span>
                  <span className="font-bold text-blue-600">${calculatedPhysicalCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Efectivo Calculado:</span>
                  <span className="font-bold text-slate-800">${expectedCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="text-slate-700 font-bold">Diferencia:</span>
                  <span className={`font-black ${difference >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {difference > 0 ? `+$${difference.toFixed(2)} (Sobrante)` : difference < 0 ? `-$${Math.abs(difference).toFixed(2)} (Faltante)` : '$0.00 (Exacto)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeCloseShift}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar y Cerrar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
