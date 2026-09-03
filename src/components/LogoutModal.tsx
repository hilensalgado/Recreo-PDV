import React from 'react';
import { LogOut, X, AlertTriangle, UserCheck, Calculator, Store, Lock } from 'lucide-react';
import { Cashier, CashShift, CashRegister } from '../types/pos';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLogout: () => void;
  currentUser?: {
    name: string;
    role: 'ADMIN' | 'CASHIER';
    cashier?: Cashier;
  } | null;
  activeCashier?: Cashier | null;
  activeShift?: CashShift | null;
  activeRegister?: CashRegister | null;
  onSwitchCashier?: () => void;
  onStartCashCut?: () => void;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onClose,
  onConfirmLogout,
  currentUser,
  activeCashier,
  activeShift,
  activeRegister,
  onSwitchCashier,
  onStartCashCut,
}) => {
  if (!isOpen) return null;

  const displayName = activeCashier?.name || currentUser?.name || 'Usuario Actual';
  const displayRole = activeCashier?.role || currentUser?.role || 'CASHIER';
  const hasOpenShift = Boolean(activeShift && activeShift.status === 'OPEN');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div
          className={`p-4 text-white flex items-center justify-between ${
            hasOpenShift
              ? 'bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900'
              : 'bg-gradient-to-r from-rose-600 via-rose-700 to-slate-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
              {hasOpenShift ? (
                <Calculator className="w-5 h-5 text-amber-200" />
              ) : (
                <LogOut className="w-5 h-5 text-rose-200" />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white leading-tight">
                {hasOpenShift ? 'Cierre Obligatorio de Caja' : 'Cerrar Sesión'}
              </h3>
              <p className="text-[11px] text-white/80">
                {hasOpenShift
                  ? 'Turno abierto en ' + (activeRegister?.name || 'Caja')
                  : 'Salir del Punto de Venta Recreo PDV'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-800 truncate">{displayName}</span>
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                    displayRole === 'ADMIN'
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                  }`}
                >
                  {displayRole}
                </span>
              </div>
              <div className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                <Store className="w-3 h-3 text-slate-400" />
                <span>Caja asignada: {activeRegister?.name || 'No asignada'}</span>
              </div>
            </div>
          </div>

          {hasOpenShift ? (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-amber-900 text-xs">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-extrabold text-amber-950 block">
                    No puedes salir sin realizar el arqueo y cierre de caja.
                  </span>
                  <span className="text-[11px] text-amber-800 leading-relaxed block">
                    Por normativa de seguridad estricta, un cajero no puede abandonar la sesión manteniendo una caja abierta. Debes realizar el conteo del efectivo y confirmar el cierre de turno.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-slate-600 text-xs">
              <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <span>
                  Al cerrar sesión se liberará el usuario en esta terminal y volverás a la pantalla de selección de cajero y PIN.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer order-2 sm:order-1"
          >
            Cancelar
          </button>

          {hasOpenShift ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onStartCashCut) onStartCashCut();
              }}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer order-1 sm:order-2"
            >
              <Calculator className="w-4 h-4" />
              <span>Realizar Conteo y Cierre de Caja</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onConfirmLogout}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer order-1 sm:order-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sí, Cerrar Sesión</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

