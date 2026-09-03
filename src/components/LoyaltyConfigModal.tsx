import React, { useState } from 'react';
import {
  X,
  Award,
  Sparkles,
  DollarSign,
  Gift,
  CheckCircle2,
  AlertCircle,
  History,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { LoyaltyProgramConfig, CustomerPointsMovement, Customer } from '../types/pos';
import { formatCurrency } from '../utils/pricingEngine';

interface LoyaltyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LoyaltyProgramConfig;
  customers: Customer[];
  movements?: CustomerPointsMovement[];
  onSaveConfig: (config: Partial<LoyaltyProgramConfig>) => Promise<void>;
  onAdjustPoints?: (customerId: string, data: { pointsDelta: number; reason: string; cashierName?: string }) => Promise<void>;
}

export const LoyaltyConfigModal: React.FC<LoyaltyConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  customers = [],
  movements = [],
  onSaveConfig,
  onAdjustPoints,
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'movements' | 'customers'>('config');

  // Config Form State
  const [enabled, setEnabled] = useState(config.enabled ?? true);
  const [pointsPerAmount, setPointsPerAmount] = useState(config.pointsPerAmount?.toString() || '100');
  const [pointValueInCurrency, setPointValueInCurrency] = useState(
    config.pointValueInCurrency?.toString() || '1'
  );
  const [minPointsToRedeem, setMinPointsToRedeem] = useState(
    config.minPointsToRedeem?.toString() || '10'
  );
  const [welcomeBonusPoints, setWelcomeBonusPoints] = useState(
    config.welcomeBonusPoints?.toString() || '50'
  );
  const [allowPartialRedemption, setAllowPartialRedemption] = useState(
    config.allowPartialRedemption ?? true
  );

  // Manual Adjustment State
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [pointsDelta, setPointsDelta] = useState('10');
  const [adjustReason, setAdjustReason] = useState('Bonificación de Cortesía / Fidelización');
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackMsg(null);

    const pPerAmt = parseFloat(pointsPerAmount);
    const pVal = parseFloat(pointValueInCurrency);
    const minPts = parseInt(minPointsToRedeem, 10);
    const bonus = parseInt(welcomeBonusPoints, 10);

    if (isNaN(pPerAmt) || pPerAmt <= 0) {
      setErrorMsg('El monto por punto debe ser mayor a 0.');
      return;
    }
    if (isNaN(pVal) || pVal <= 0) {
      setErrorMsg('El valor de cada punto debe ser mayor a 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSaveConfig({
        enabled,
        pointsPerAmount: pPerAmt,
        pointValueInCurrency: pVal,
        minPointsToRedeem: minPts >= 0 ? minPts : 0,
        welcomeBonusPoints: bonus >= 0 ? bonus : 0,
        allowPartialRedemption,
      });
      setFeedbackMsg('Configuración del programa de puntos guardada correctamente.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la configuración.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAdjustPoints || !selectedCustomerId) return;
    setErrorMsg(null);
    setFeedbackMsg(null);

    const deltaNum = parseInt(pointsDelta, 10);
    if (isNaN(deltaNum) || deltaNum <= 0) {
      setErrorMsg('La cantidad de puntos debe ser mayor a 0.');
      return;
    }

    const finalDelta = adjustType === 'add' ? deltaNum : -deltaNum;

    try {
      setIsSubmitting(true);
      await onAdjustPoints(selectedCustomerId, {
        pointsDelta: finalDelta,
        reason: adjustReason.trim() || 'Ajuste manual administrativo',
      });
      setFeedbackMsg('Puntos del cliente actualizados exitosamente.');
      setPointsDelta('10');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al ajustar los puntos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg text-white">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Programa de Puntos & Fidelización</h2>
              <p className="text-xs text-slate-400">
                Premia a tus clientes con puntos acumulables canjeables por descuentos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-100 px-5 pt-2 shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'config'
                ? 'bg-white text-blue-600 border-blue-600 shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Parámetros del Programa
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'customers'
                ? 'bg-white text-blue-600 border-blue-600 shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> Puntos por Cliente & Ajuste
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'movements'
                ? 'bg-white text-blue-600 border-blue-600 shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Historial de Movimientos
          </button>
        </div>

        {/* Messages */}
        {feedbackMsg && (
          <div className="mx-5 mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mx-5 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'config' && (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* Enable Switch */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Activar Programa de Fidelización</h4>
                  <p className="text-xs text-slate-500">
                    Los clientes acumularán puntos automáticamente en cada venta cobrada
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Conversion Rules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    1. Acumulación de Puntos
                  </label>
                  <p className="text-xs text-slate-500">
                    ¿Cuántos pesos de compra equivalen a <strong>1 Punto</strong>?
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm font-bold text-slate-600">$</span>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={pointsPerAmount}
                      onChange={(e) => setPointsPerAmount(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-500 whitespace-nowrap">= 1 Punto</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Ej: $100 = 1 punto significa que una compra de $1.000 suma 10 puntos.
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    2. Canje y Descuento
                  </label>
                  <p className="text-xs text-slate-500">
                    ¿A cuánto equivale <strong>1 Punto</strong> al canjearlo en caja?
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-500 whitespace-nowrap">1 Punto =</span>
                    <span className="text-sm font-bold text-slate-600">$</span>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={pointValueInCurrency}
                      onChange={(e) => setPointValueInCurrency(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-500 whitespace-nowrap">de descuento</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Ej: 1 punto = $1 de descuento directo en el total a pagar.
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    3. Mínimo para Canjear
                  </label>
                  <p className="text-xs text-slate-500">
                    Mínimo de puntos acumulados para poder aplicar descuento
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      min="0"
                      value={minPointsToRedeem}
                      onChange={(e) => setMinPointsToRedeem(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-500 whitespace-nowrap">puntos</span>
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    4. Bono de Bienvenida
                  </label>
                  <p className="text-xs text-slate-500">
                    Puntos de regalo al registrar un cliente nuevo
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      min="0"
                      value={welcomeBonusPoints}
                      onChange={(e) => setWelcomeBonusPoints(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-500 whitespace-nowrap">pts de regalo</span>
                  </div>
                </div>
              </div>

              {/* Partial redemption checkbox */}
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowPartialRedemption}
                  onChange={(e) => setAllowPartialRedemption(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Permitir canje parcial (el cliente puede elegir cuántos puntos usar)</span>
              </label>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting ? 'Guardando...' : 'Guardar Configuración de Puntos'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'customers' && (
            <div className="space-y-5">
              {/* Manual Adjustment Card */}
              {onAdjustPoints && (
                <form
                  onSubmit={handleManualAdjust}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                >
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-amber-600" /> Bonificación / Ajuste Manual de Puntos
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Cliente</label>
                      <select
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                      >
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.pointsBalance || 0} pts)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Operación</label>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => setAdjustType('add')}
                          className={`py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                            adjustType === 'add'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-500'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          + Sumar
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdjustType('deduct')}
                          className={`py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                            adjustType === 'deduct'
                              ? 'bg-rose-50 text-rose-700 border-rose-500'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          - Restar
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Cantidad de Puntos</label>
                      <input
                        type="number"
                        min="1"
                        value={pointsDelta}
                        onChange={(e) => setPointsDelta(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Motivo del ajuste..."
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shrink-0"
                    >
                      Aplicar Ajuste
                    </button>
                  </div>
                </form>
              )}

              {/* Customers Points Balance Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 flex justify-between">
                  <span>Saldos de Puntos de Clientes</span>
                  <span>Total Clientes: {customers.length}</span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {customers.map((c) => {
                    const discountVal = (c.pointsBalance || 0) * (config.pointValueInCurrency || 1);
                    return (
                      <div key={c.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                        <div>
                          <p className="font-bold text-slate-800">{c.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{c.phone || c.email || 'Sin contacto'}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-amber-600 text-sm">{c.pointsBalance || 0} pts</span>
                          <span className="text-[11px] text-slate-500 block">
                            Equivale a {formatCurrency(discountVal)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'movements' && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 flex justify-between">
                <span>Historial de Puntos Emitidos y Canjeados</span>
                <span>{movements.length} movimientos</span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {movements.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">
                    Aún no hay movimientos de puntos registrados.
                  </p>
                ) : (
                  movements.map((m) => (
                    <div key={m.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              m.pointsDelta > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {m.type === 'EARNED_PURCHASE' && 'Compra'}
                            {m.type === 'REDEEMED_DISCOUNT' && 'Canje'}
                            {m.type === 'WELCOME_BONUS' && 'Bienvenida'}
                            {m.type === 'MANUAL_ADJUSTMENT' && 'Ajuste'}
                          </span>
                          <span className="font-bold text-slate-800">{m.customerName}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{m.reason}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{new Date(m.date).toLocaleString('es-AR')}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-black text-sm ${
                            m.pointsDelta > 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {m.pointsDelta > 0 ? `+${m.pointsDelta}` : m.pointsDelta} pts
                        </span>
                        <span className="text-[11px] text-slate-500 block">Saldo: {m.balanceAfter} pts</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
