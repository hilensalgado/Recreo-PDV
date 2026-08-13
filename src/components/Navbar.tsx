import React, { useState } from 'react';
import {
  Store,
  UserCheck,
  Clock,
  Keyboard,
  ShieldCheck,
  RefreshCw,
  LogOut,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { CashRegister, Cashier, CashShift } from '../types/pos';

interface NavbarProps {
  registers: CashRegister[];
  activeRegister: CashRegister | null;
  cashiers: Cashier[];
  activeCashier: Cashier | null;
  activeShift: CashShift | null;
  onSelectRegister: (reg: CashRegister) => void;
  onSelectCashier: (cashier: Cashier) => void;
  onOpenRegisterModal: () => void;
  onOpenShortcutsModal: () => void;
  onRefreshData: () => void;
  todaySalesTotal: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  registers,
  activeRegister,
  cashiers,
  activeCashier,
  activeShift,
  onSelectRegister,
  onSelectCashier,
  onOpenRegisterModal,
  onOpenShortcutsModal,
  onRefreshData,
  todaySalesTotal,
}) => {
  const [showRegDropdown, setShowRegDropdown] = useState(false);
  const [showCashierDropdown, setShowCashierDropdown] = useState(false);

  return (
    <header className="bg-[#1e293b] text-white border-b border-slate-700 shadow-md sticky top-0 z-30 select-none h-14 flex items-center">
      <div className="w-full px-4 flex items-center justify-between gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-white shadow-inner">
            <Store className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-base tracking-tight text-white leading-none">
              Recreo <span className="text-blue-400 font-bold text-xs">PDV</span>
            </h1>
            <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-500/30 uppercase tracking-wide">
              v5.2 Multi-Caja
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-700 hidden md:block" />

        {/* Terminal & Cashier Info Pills */}
        <div className="flex items-center gap-3">
          {/* Active Register Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setShowRegDropdown(!showRegDropdown);
                setShowCashierDropdown(false);
              }}
              className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-800 px-3 py-1.5 rounded border border-slate-700 text-xs transition-colors"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  activeRegister?.isOpen ? 'bg-emerald-400 shadow-xs shadow-emerald-400' : 'bg-rose-500'
                }`}
              />
              <div className="text-left">
                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold leading-none">TERMINAL / CAJA</div>
                <div className="font-semibold text-blue-100 text-xs leading-tight">
                  {activeRegister ? activeRegister.name : 'Seleccionar Caja'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {showRegDropdown && (
              <div className="absolute left-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded shadow-xl py-1 z-50 text-xs">
                <div className="px-3 py-1.5 border-b border-slate-700 font-semibold text-slate-400 text-[10px] uppercase tracking-wider flex justify-between items-center">
                  <span>Cajas Configuradas</span>
                  <button
                    onClick={() => {
                      setShowRegDropdown(false);
                      onOpenRegisterModal();
                    }}
                    className="text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <SlidersHorizontal className="w-3 h-3" /> Config
                  </button>
                </div>
                {registers.map((reg) => (
                  <button
                    key={reg.id}
                    onClick={() => {
                      onSelectRegister(reg);
                      setShowRegDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-700/80 transition-colors ${
                      activeRegister?.id === reg.id ? 'bg-blue-600/20 text-blue-300 font-bold border-l-2 border-blue-500' : 'text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-slate-200">{reg.name}</div>
                      <div className="text-[10px] text-slate-400">{reg.location}</div>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        reg.isOpen
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {reg.isOpen ? 'Abierta' : 'Cerrada'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Cashier Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setShowCashierDropdown(!showCashierDropdown);
                setShowRegDropdown(false);
              }}
              className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-800 px-3 py-1.5 rounded border border-slate-700 text-xs transition-colors"
            >
              <UserCheck className="w-4 h-4 text-blue-400" />
              <div className="text-left">
                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold leading-none">CAJERO ACTIVO</div>
                <div className="font-semibold text-blue-100 text-xs leading-tight">
                  {activeCashier ? activeCashier.name : 'Cajero'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {showCashierDropdown && (
              <div className="absolute right-0 mt-1 w-52 bg-slate-800 border border-slate-700 rounded shadow-xl py-1 z-50 text-xs">
                <div className="px-3 py-1.5 border-b border-slate-700 font-semibold text-slate-400 text-[10px] uppercase tracking-wider">
                  Cambiar Cajero
                </div>
                {cashiers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectCashier(c);
                      setShowCashierDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-700/80 ${
                      activeCashier?.id === c.id ? 'bg-blue-600/20 text-blue-300 font-bold' : 'text-slate-300'
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold bg-slate-700 text-slate-300">
                      {c.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Stats & Actions */}
        <div className="flex items-center gap-3">
          {/* Today's Sales Summary Badge */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded border border-slate-700 text-xs">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">VENTAS DEL DÍA</div>
            <div className="font-mono font-bold text-emerald-400 text-sm">
              ${todaySalesTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <button
            onClick={onRefreshData}
            title="Sincronizar datos"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenShortcutsModal}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded border border-slate-700 transition-colors"
          >
            <Keyboard className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Teclas</span>
          </button>
        </div>
      </div>
    </header>
  );
};
