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
  onLogoutAuth?: () => void;
  onSelectRegister: (reg: CashRegister) => void;
  onSelectSupervisorMode?: () => void;
  onSelectCashier: (cashier: Cashier) => void;
  onOpenRegisterModal: () => void;
  onOpenShortcutsModal: () => void;
  onRefreshData: () => void;
  todaySalesTotal: number;
  isRealtimeConnected?: boolean;
  isSyncing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  registers,
  activeRegister,
  cashiers,
  activeCashier,
  activeShift,
  onLogoutAuth,
  onSelectRegister,
  onSelectSupervisorMode,
  onSelectCashier,
  onOpenRegisterModal,
  onOpenShortcutsModal,
  onRefreshData,
  todaySalesTotal,
  isRealtimeConnected = true,
  isSyncing = false,
}) => {
  const [showRegDropdown, setShowRegDropdown] = useState(false);
  const [showCashierDropdown, setShowCashierDropdown] = useState(false);

  const isSupervisorMode = !activeRegister && activeCashier?.role === 'ADMIN';

  return (
    <header className="bg-[#1e293b] text-white border-b border-slate-700 shadow-md sticky top-0 z-30 select-none min-h-[3.5rem] flex items-center">
      <div className="w-full px-2 sm:px-4 py-1.5 flex items-center justify-between gap-1.5 sm:gap-3 flex-wrap sm:flex-nowrap">
        {/* Logo & Brand */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-white shadow-inner shrink-0">
            <Store className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white leading-none">
              Recreo <span className="text-blue-400 font-bold text-xs">PDV</span>
            </h1>
            <span className="hidden xs:inline-block bg-blue-500/20 text-blue-300 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-500/30 uppercase tracking-wide">
              v5.2
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-700 hidden lg:block" />

        {/* Terminal & Cashier Info Pills */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Active Register Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setShowRegDropdown(!showRegDropdown);
                setShowCashierDropdown(false);
              }}
              className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded border text-xs transition-colors min-h-[36px] ${
                isSupervisorMode
                  ? 'bg-purple-950/60 hover:bg-purple-900/80 border-purple-600/50 text-purple-200'
                  : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isSupervisorMode
                    ? 'bg-purple-400 shadow-xs shadow-purple-400'
                    : activeRegister?.isOpen
                    ? 'bg-emerald-400 shadow-xs shadow-emerald-400'
                    : 'bg-rose-500'
                }`}
              />
              <div className="text-left max-w-[110px] sm:max-w-none truncate">
                <div className="text-[8px] sm:text-[9px] uppercase tracking-wider font-bold leading-none hidden xs:block text-slate-400">
                  {isSupervisorMode ? 'ESTADO' : 'CAJA'}
                </div>
                <div className={`font-semibold text-[11px] sm:text-xs leading-tight truncate ${isSupervisorMode ? 'text-purple-200' : 'text-blue-100'}`}>
                  {isSupervisorMode
                    ? 'Modo Supervisor'
                    : activeRegister
                    ? activeRegister.name
                    : 'Sin Caja'}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {showRegDropdown && (
              <div className="fixed sm:absolute inset-x-3 top-16 sm:inset-x-auto sm:left-0 sm:top-auto sm:mt-1 sm:w-72 bg-slate-800 border border-slate-700 rounded-xl sm:rounded shadow-2xl py-1 z-50 text-xs max-h-[80vh] overflow-y-auto">
                <div className="px-3 py-2 border-b border-slate-700 font-semibold text-slate-400 text-[10px] uppercase tracking-wider flex justify-between items-center bg-slate-850">
                  <span>Cajas y Modalidad</span>
                  <button
                    onClick={() => {
                      setShowRegDropdown(false);
                      onOpenRegisterModal();
                    }}
                    className="text-blue-400 hover:underline flex items-center gap-1 p-1"
                  >
                    <SlidersHorizontal className="w-3 h-3" /> Config
                  </button>
                </div>

                {/* Supervisor mode option for Admins */}
                {activeCashier?.role === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowRegDropdown(false);
                      onSelectSupervisorMode?.();
                    }}
                    className={`w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-slate-700/80 transition-colors border-b border-slate-700/50 ${
                      isSupervisorMode
                        ? 'bg-purple-600/20 text-purple-300 font-bold border-l-4 border-purple-500'
                        : 'text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-purple-200">Modo Supervisor / Auditoría</div>
                        <div className="text-[10px] text-slate-400">Sin asignar caja física (libre monitoreo)</div>
                      </div>
                    </div>
                    {isSupervisorMode && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-purple-500/25 text-purple-200 border border-purple-500/40">
                        Activo
                      </span>
                    )}
                  </button>
                )}

                {registers.map((reg) => {
                  const myDevId = typeof window !== 'undefined' ? localStorage.getItem('recreo_device_id') || '' : '';
                  const isLockedElsewhere =
                    reg.activeDeviceId &&
                    reg.activeDeviceId !== myDevId &&
                    reg.lastHeartbeat &&
                    Date.now() - reg.lastHeartbeat < 60000;

                  return (
                    <button
                      key={reg.id}
                      onClick={() => {
                        onSelectRegister(reg);
                        setShowRegDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-slate-700/80 transition-colors border-b border-slate-700/50 last:border-0 ${
                        activeRegister?.id === reg.id
                          ? 'bg-blue-600/20 text-blue-300 font-bold border-l-4 border-blue-500'
                          : 'text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-slate-200">{reg.name}</div>
                        <div className="text-[10px] text-slate-400">{reg.location}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isLockedElsewhere && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-rose-900/80 text-rose-200 border border-rose-700">
                            🔒 En otro equipo
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            reg.isOpen
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-700 text-slate-400'
                          }`}
                        >
                          {reg.isOpen ? (reg.currentCashierName ? `Abierta (${reg.currentCashierName})` : 'Abierta') : 'Cerrada'}
                        </span>
                      </div>
                    </button>
                  );
                })}
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
              className="flex items-center gap-1.5 sm:gap-2 bg-slate-800/90 hover:bg-slate-800 px-2 sm:px-3 py-1 sm:py-1.5 rounded border border-slate-700 text-xs transition-colors min-h-[36px]"
            >
              <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 shrink-0" />
              <div className="text-left max-w-[90px] sm:max-w-none truncate">
                <div className="text-[8px] sm:text-[9px] uppercase tracking-wider text-slate-400 font-bold leading-none hidden xs:block">CAJERO</div>
                <div className="font-semibold text-blue-100 text-[11px] sm:text-xs leading-tight truncate">
                  {activeCashier ? activeCashier.name : 'Cajero'}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {showCashierDropdown && (
              <div className="fixed sm:absolute inset-x-3 top-16 sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-1 sm:w-64 bg-slate-800 border border-slate-700 rounded-xl sm:rounded shadow-2xl py-1 z-50 text-xs max-h-[80vh] overflow-y-auto">
                <div className="px-3 py-2 border-b border-slate-700 font-semibold text-slate-400 text-[10px] uppercase tracking-wider bg-slate-850">
                  Cambiar Cajero
                </div>
                {cashiers.map((c) => {
                  const myDevId = typeof window !== 'undefined' ? localStorage.getItem('recreo_device_id') || '' : '';
                  const isLockedElsewhere =
                    c.isLoggedIn &&
                    c.activeDeviceId &&
                    c.activeDeviceId !== myDevId &&
                    c.lastHeartbeat &&
                    Date.now() - c.lastHeartbeat < 60000;

                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        onSelectCashier(c);
                        setShowCashierDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-slate-700/80 border-b border-slate-700/50 last:border-0 ${
                        activeCashier?.id === c.id
                          ? 'bg-blue-600/20 text-blue-300 font-bold border-l-4 border-blue-500'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="font-medium text-slate-200">{c.name}</span>
                      <div className="flex items-center gap-1">
                        {isLockedElsewhere ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold bg-rose-900/80 text-rose-200 border border-rose-700">
                            🔒 En otro equipo
                          </span>
                        ) : c.isLoggedIn && c.id !== activeCashier?.id ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            🔒 Ocupado
                          </span>
                        ) : null}
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold bg-slate-700 text-slate-300">
                          {c.role}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {onLogoutAuth && (
                  <div className="p-1 border-t border-slate-700 bg-slate-850">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCashierDropdown(false);
                        onLogoutAuth();
                      }}
                      className="w-full text-left px-3 py-2 text-rose-300 hover:text-white hover:bg-rose-600/80 font-bold rounded flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Cerrar Sesión / Salir</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Stats & Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Real-time Status Badge */}
          <div
            title={isRealtimeConnected ? 'Sincronización instantánea activa (tiempo real)' : 'Reconectando sincronización...'}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-[11px] font-medium"
          >
            <span className="relative flex h-2 w-2">
              {isRealtimeConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isRealtimeConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              ></span>
            </span>
            <span className="text-slate-300 text-[10px] tracking-wide">
              {isRealtimeConnected ? 'En vivo' : 'Conectando'}
            </span>
          </div>

          {/* Today's Sales Summary Badge */}
          <div className="hidden xl:flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded border border-slate-700 text-xs">
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">VENTAS DÍA</div>
            <div className="font-mono font-bold text-emerald-400 text-xs">
              ${todaySalesTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <button
            onClick={onRefreshData}
            title={isSyncing ? 'Sincronizando...' : 'Sincronizar datos'}
            disabled={isSyncing}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <button
            onClick={onOpenShortcutsModal}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded border border-slate-700 transition-colors"
          >
            <Keyboard className="w-3.5 h-3.5 text-amber-400" />
            <span>Teclas</span>
          </button>

          {/* Logout / Switch User */}
          {onLogoutAuth && (
            <button
              onClick={onLogoutAuth}
              title="Cerrar sesión de usuario y salir"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-black rounded-lg shadow-sm transition-colors cursor-pointer min-h-[36px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
