import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  UserCheck,
  RefreshCw,
  Database,
  Lock,
  Eye,
  EyeOff,
  Store,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Unlock,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import { Cashier, CashRegister, CashShift } from '../types/pos';

interface AuthScreenProps {
  onLoginSuccess: (data: {
    name: string;
    role: 'ADMIN' | 'CASHIER';
    cashier?: Cashier;
    register?: CashRegister;
    activeShift?: CashShift | null;
  }) => void;
  authorizedCashiers: Cashier[];
  registers: CashRegister[];
  shifts: CashShift[];
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
  authorizedCashiers,
  registers,
  shifts,
}) => {
  // Selected Cashier state
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(() => {
    return authorizedCashiers.length > 0 ? authorizedCashiers[0] : null;
  });

  // Selected Cash Register (Caja)
  const [selectedRegister, setSelectedRegister] = useState<CashRegister | null>(() => {
    return registers.length > 0 ? registers[0] : null;
  });

  const [pinCode, setPinCode] = useState('');
  const [showPinMask, setShowPinMask] = useState(true);

  // Status
  const [loading, setLoading] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getDeviceId = () => {
    let devId = localStorage.getItem('recreo_device_id');
    if (!devId) {
      devId = 'dev-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
      localStorage.setItem('recreo_device_id', devId);
    }
    return devId;
  };

  const myDeviceId = getDeviceId();

  // Synchronize selectedCashier when authorizedCashiers loads/updates
  useEffect(() => {
    if (authorizedCashiers.length > 0) {
      if (!selectedCashier || !authorizedCashiers.some((c) => c.id === selectedCashier.id)) {
        // Default to Admin or first cashier
        const adminCashier = authorizedCashiers.find((c) => c.role === 'ADMIN');
        setSelectedCashier(adminCashier || authorizedCashiers[0]);
      }
    }
  }, [authorizedCashiers]);

  // Synchronize selectedRegister when registers or cashier changes
  useEffect(() => {
    if (registers.length > 0) {
      if (selectedCashier?.role === 'ADMIN') {
        // For admin, if no register is selected, leave as null (Supervisor mode) unless they have an open shift
        const cashierOpenShift = shifts.find((s) => s.cashierId === selectedCashier.id && s.status === 'OPEN');
        if (cashierOpenShift) {
          const matchingReg = registers.find((r) => r.id === cashierOpenShift.registerId);
          if (matchingReg) {
            setSelectedRegister(matchingReg);
            return;
          }
        }
        // Keep null if already null (supervisor mode), or validate existing selection
        if (selectedRegister && !registers.some((r) => r.id === selectedRegister.id)) {
          setSelectedRegister(null);
        }
      } else {
        // For cashiers, ensure a register is always selected
        if (!selectedRegister || !registers.some((r) => r.id === selectedRegister.id)) {
          const cashierOpenShift = selectedCashier
            ? shifts.find((s) => s.cashierId === selectedCashier.id && s.status === 'OPEN')
            : null;
          if (cashierOpenShift) {
            const matchingReg = registers.find((r) => r.id === cashierOpenShift.registerId);
            if (matchingReg) {
              setSelectedRegister(matchingReg);
              return;
            }
          }
          setSelectedRegister(registers[0]);
        }
      }
    }
  }, [registers, selectedCashier, shifts]);

  // Select Cashier handler
  const handleSelectCashier = (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setPinCode('');
    setErrorMsg(null);

    // If this cashier has an open shift in a register, auto-select that register
    const cashierShift = shifts.find((s) => s.cashierId === cashier.id && s.status === 'OPEN');
    if (cashierShift) {
      const reg = registers.find((r) => r.id === cashierShift.registerId);
      if (reg) {
        setSelectedRegister(reg);
        return;
      }
    }

    if (cashier.role === 'ADMIN') {
      // By default, set admin to Supervisor mode (Sin Caja) so they can enter directly to manage
      setSelectedRegister(null);
    } else {
      if (!selectedRegister && registers.length > 0) {
        setSelectedRegister(registers[0]);
      }
    }
  };

  // Select Register handler
  const handleSelectRegister = (reg: CashRegister) => {
    setSelectedRegister(reg);
    setErrorMsg(null);
  };

  // Handle Force Unlock of all sessions
  const handleUnlockAll = async () => {
    try {
      setIsUnlocking(true);
      setErrorMsg(null);
      await api.forceUnlockSession('all', '');
      setSuccessMsg('¡Todas las sesiones y bloqueos de cajas han sido liberados correctamente!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg('No se pudieron liberar las sesiones: ' + (err.message || 'Error del servidor'));
    } finally {
      setIsUnlocking(false);
    }
  };

  // Handle PIN submission and secure login
  const handlePinLogin = async (pinToTest: string) => {
    const trimmedPin = pinToTest.trim();
    if (!trimmedPin) {
      setErrorMsg('Por favor ingresa tu PIN de seguridad.');
      return;
    }

    if (!selectedCashier) {
      setErrorMsg('Por favor selecciona un usuario/cajero.');
      return;
    }

    if (!selectedRegister && selectedCashier.role !== 'ADMIN') {
      setErrorMsg('Por favor selecciona la caja en la que vas a trabajar.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const deviceId = getDeviceId();
      const res = await api.verifyUserAuth({
        cashierId: selectedCashier.id,
        registerId: selectedRegister ? selectedRegister.id : undefined,
        pin: trimmedPin,
        deviceId,
        force: selectedCashier.role === 'ADMIN',
      });

      if (res && res.authorized && res.cashier) {
        setSuccessMsg(`¡Bienvenido/a, ${res.cashier.name}! Acceso concedido.`);
        
        const authData = {
          name: res.cashier.name,
          role: (res.role || res.cashier.role || 'CASHIER') as 'ADMIN' | 'CASHIER',
          cashier: res.cashier,
          register: res.register || selectedRegister || undefined,
          activeShift: res.activeShift || null,
        };

        localStorage.setItem('recreo_auth_user', JSON.stringify({
          name: authData.name,
          role: authData.role,
          cashier: authData.cashier,
        }));

        setTimeout(() => {
          onLoginSuccess(authData);
        }, 350);
      } else {
        setErrorMsg(
          res?.error ||
            `PIN incorrecto para ${selectedCashier.name}. Intenta nuevamente.`
        );
        setPinCode('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al validar credenciales y sesión.');
      setPinCode('');
    } finally {
      setLoading(false);
    }
  };

  // Onscreen numpad click
  const handleNumpadPress = (char: string) => {
    if (loading) return;
    setErrorMsg(null);
    if (pinCode.length < 6) {
      const nextPin = pinCode + char;
      setPinCode(nextPin);
      const targetLen = selectedCashier?.pin?.length || 4;
      if (nextPin.length === targetLen) {
        handlePinLogin(nextPin);
      }
    }
  };

  const handleNumpadBackspace = () => {
    setPinCode((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleNumpadClear = () => {
    setPinCode('');
    setErrorMsg(null);
  };

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading) return;
      if (e.key >= '0' && e.key <= '9') {
        handleNumpadPress(e.key);
      } else if (e.key === 'Backspace') {
        handleNumpadBackspace();
      } else if (e.key === 'Escape') {
        handleNumpadClear();
      } else if (e.key === 'Enter' && pinCode.length >= 4) {
        handlePinLogin(pinCode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pinCode, selectedCashier, selectedRegister, loading]);

  const targetPinLength = selectedCashier?.pin?.length || 4;

  // Check active shift for selected cashier
  const cashierShift = selectedCashier
    ? shifts.find((s) => s.cashierId === selectedCashier.id && s.status === 'OPEN')
    : null;

  // Check active shift for selected register
  const selectedRegisterOpenShift = selectedRegister
    ? shifts.find((s) => s.registerId === selectedRegister.id && s.status === 'OPEN')
    : null;

  const isRegisterOccupiedByOther =
    selectedRegisterOpenShift &&
    selectedCashier &&
    selectedRegisterOpenShift.cashierId !== selectedCashier.id;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between select-none relative overflow-x-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-900 to-slate-950 pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 p-4 sm:p-5 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-xl">
            R
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white tracking-tight flex items-center gap-2">
              Recreo PDV <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">Acceso Seguro</span>
            </h1>
            <p className="text-xs text-slate-400">Control de Sesiones, Cajas y Cajeros</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUnlockAll}
            disabled={isUnlocking}
            title="Liberar todas las sesiones colgadas o bloqueadas en la red"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 border border-slate-700 text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer transition-all disabled:opacity-50"
          >
            {isUnlocking ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Unlock className="w-3.5 h-3.5" />
            )}
            <span>Liberar Sesiones</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Database className="w-3.5 h-3.5" />
            <span>Servidor Activo</span>
          </div>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-3 sm:p-4 my-auto">
        <div className="w-full max-w-lg bg-slate-800/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl p-5 sm:p-7 space-y-4">
          {/* Header Title */}
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400 mb-2">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Ingreso y Asignación de Caja
            </h2>
            <p className="text-xs text-slate-400">
              Selecciona tu usuario, la caja de atención e ingresa tu PIN personal
            </p>
          </div>

          {/* Error / Success Notifications */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-600/50 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in shadow-inner">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-600/50 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="font-bold">{successMsg}</div>
            </div>
          )}

          {/* Step 1: User Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                1. Selecciona Usuario / Cajero:
              </label>
              {selectedCashier && (
                <span className="text-[10px] text-blue-300 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3 text-blue-400" />
                  {selectedCashier.name} ({selectedCashier.role})
                </span>
              )}
            </div>

            {authorizedCashiers.length === 0 ? (
              <div className="p-3 text-center rounded-xl bg-slate-900/50 border border-slate-700 text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                <span>Cargando lista de cajeros autorizados...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {authorizedCashiers.map((cashier) => {
                  const isSelected = selectedCashier?.id === cashier.id;
                  const cashierActiveShift = shifts.find(
                    (s) => s.cashierId === cashier.id && s.status === 'OPEN'
                  );
                  const isLockedElsewhere =
                    cashier.isLoggedIn &&
                    cashier.activeDeviceId &&
                    cashier.activeDeviceId !== myDeviceId &&
                    cashier.lastHeartbeat &&
                    Date.now() - cashier.lastHeartbeat < 90000;

                  return (
                    <button
                      key={cashier.id}
                      type="button"
                      onClick={() => handleSelectCashier(cashier)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between relative ${
                        isSelected
                          ? 'bg-blue-600/30 border-blue-400 ring-2 ring-blue-500/40 shadow-md shadow-blue-500/20'
                          : isLockedElsewhere
                          ? 'bg-rose-950/30 border-rose-800/60 hover:bg-rose-950/50'
                          : 'bg-slate-900/70 border-slate-700/80 hover:bg-slate-900 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            cashierActiveShift
                              ? 'bg-amber-400 animate-pulse'
                              : isSelected
                              ? 'bg-blue-400'
                              : 'bg-slate-600'
                          }`}
                        />
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                            cashier.role === 'ADMIN'
                              ? 'bg-purple-500/25 text-purple-200 border border-purple-500/40'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {cashier.role}
                        </span>
                      </div>
                      <div className="font-bold text-xs text-white truncate">{cashier.name}</div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {cashierActiveShift ? (
                          <span className="text-amber-300 font-semibold">Turno abierto</span>
                        ) : isLockedElsewhere ? (
                          <span className="text-rose-400">En otra terminal</span>
                        ) : (
                          <span className="text-slate-400">Disponible</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 2: Register Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                2. Selecciona Caja {selectedCashier?.role === 'ADMIN' ? '(Opcional para Administrador)' : 'de Atención *'}:
              </label>
              {cashierShift ? (
                <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Turno activo
                </span>
              ) : selectedCashier?.role === 'ADMIN' && !selectedRegister ? (
                <span className="text-[10px] text-purple-300 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-purple-400" /> Modo Supervisor (Sin Caja)
                </span>
              ) : null}
            </div>

            {registers.length === 0 ? (
              <div className="p-3 text-center rounded-xl bg-slate-900/50 border border-slate-700 text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                <span>Cargando cajas registradoras...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* Admin Supervisor Mode Option */}
                {selectedCashier?.role === 'ADMIN' && (
                  <button
                    key="supervisor-mode"
                    type="button"
                    onClick={() => setSelectedRegister(null)}
                    className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer relative ${
                      selectedRegister === null
                        ? 'bg-purple-600/30 border-purple-400 ring-2 ring-purple-500/40 shadow-md shadow-purple-500/20 text-white'
                        : 'bg-slate-900/70 border-slate-700/80 hover:bg-slate-900 hover:border-slate-500 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <ShieldCheck className={`w-3.5 h-3.5 ${selectedRegister === null ? 'text-purple-300' : 'text-purple-400'}`} />
                      <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Supervisión
                      </span>
                    </div>
                    <div className="font-extrabold text-xs text-white truncate">Solo Gestión / Auditoría</div>
                    <div className="text-[9px] text-slate-400 truncate mt-0.5">
                      Sin asignar caja (monitoreo)
                    </div>
                  </button>
                )}

                {registers.map((reg) => {
                  const isSelected = selectedRegister?.id === reg.id;
                  const regOpenShift = shifts.find(
                    (s) => s.registerId === reg.id && s.status === 'OPEN'
                  );
                  const isOccupiedByOther =
                    regOpenShift &&
                    selectedCashier &&
                    regOpenShift.cashierId !== selectedCashier.id;

                  const isMyShift =
                    regOpenShift &&
                    selectedCashier &&
                    regOpenShift.cashierId === selectedCashier.id;

                  return (
                    <button
                      key={reg.id}
                      type="button"
                      onClick={() => handleSelectRegister(reg)}
                      className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer relative ${
                        isSelected
                          ? 'bg-indigo-600/30 border-indigo-400 ring-2 ring-indigo-500/40 shadow-md shadow-indigo-500/20 text-white'
                          : isOccupiedByOther
                          ? 'bg-slate-900/60 border-amber-800/40 hover:bg-slate-900 hover:border-amber-700 text-slate-300'
                          : 'bg-slate-900/70 border-slate-700/80 hover:bg-slate-900 hover:border-slate-500 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Store className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-300' : 'text-indigo-400'}`} />
                        <span
                          className={`text-[8px] font-black uppercase px-1 py-0.2 rounded ${
                            isMyShift
                              ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                              : isOccupiedByOther
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {isMyShift
                            ? 'Tu turno'
                            : isOccupiedByOther
                            ? 'En uso'
                            : 'Disponible'}
                        </span>
                      </div>
                      <div className="font-extrabold text-xs text-white truncate">{reg.name}</div>
                      <div className="text-[9px] text-slate-400 truncate mt-0.5">
                        {isOccupiedByOther
                          ? `De: ${regOpenShift.cashierName}`
                          : isMyShift
                          ? 'Continuar turno'
                          : 'Lista para abrir'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Informational banner when an occupied register is selected */}
            {isRegisterOccupiedByOther && selectedRegisterOpenShift && (
              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-200 text-[11px] flex items-start gap-2 animate-in fade-in">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  Esta caja tiene un turno abierto por{' '}
                  <strong className="text-white font-bold">{selectedRegisterOpenShift.cashierName}</strong>.
                  {selectedCashier?.role === 'ADMIN' ? (
                    <span className="text-emerald-300 font-semibold block mt-0.5">
                      ⭐ Acceso Administrador: Puedes ingresar para supervisar o realizar cortes de caja.
                    </span>
                  ) : (
                    <span className="text-slate-300 block mt-0.5">
                      Ingresa el PIN correspondiente para continuar o solicita al Administrador liberar la caja.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Step 3: PIN Input & Numpad */}
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700/80 text-center space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">3. PIN de Acceso:</span>
              <span className="font-extrabold text-white flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                {selectedCashier ? selectedCashier.name : 'Selecciona cajero'}
                {selectedRegister && (
                  <span className="text-slate-400 font-normal">({selectedRegister.name})</span>
                )}
              </span>
            </div>

            {/* PIN Dots Display */}
            <div className="py-1.5 flex items-center justify-center space-x-3">
              {Array.from({ length: targetPinLength }).map((_, idx) => {
                const isFilled = pinCode.length > idx;
                const char = pinCode[idx];

                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border flex items-center justify-center font-mono font-bold text-xs transition-all duration-150 ${
                      isFilled
                        ? 'bg-blue-500 border-blue-400 shadow-md shadow-blue-500/40 text-white scale-110'
                        : 'border-slate-600 bg-slate-800 text-transparent'
                    }`}
                  >
                    {!showPinMask && isFilled ? char : ''}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <span>Ingresa {targetPinLength} dígitos (teclado físico o botones)</span>
              <button
                type="button"
                onClick={() => setShowPinMask(!showPinMask)}
                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer font-medium"
              >
                {showPinMask ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>{showPinMask ? 'Ver' : 'Ocultar'}</span>
              </button>
            </div>
          </div>

          {/* On-screen Keypad */}
          <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                disabled={loading}
                onClick={() => handleNumpadPress(num)}
                className="h-10 bg-slate-900/80 hover:bg-slate-700/80 active:bg-blue-600 active:scale-95 text-white font-bold text-base rounded-xl border border-slate-700/70 shadow-xs transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              disabled={loading}
              onClick={handleNumpadClear}
              className="h-10 bg-slate-900/50 hover:bg-slate-800 active:scale-95 text-slate-400 hover:text-slate-200 font-semibold text-xs rounded-xl border border-slate-700/40 transition-all flex items-center justify-center uppercase tracking-wider cursor-pointer"
            >
              C
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleNumpadPress('0')}
              className="h-10 bg-slate-900/80 hover:bg-slate-700/80 active:bg-blue-600 active:scale-95 text-white font-bold text-base rounded-xl border border-slate-700/70 shadow-xs transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              0
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleNumpadBackspace}
              className="h-10 bg-slate-900/50 hover:bg-slate-800 active:scale-95 text-slate-400 hover:text-slate-200 font-semibold text-xs rounded-xl border border-slate-700/40 transition-all flex items-center justify-center cursor-pointer"
            >
              ⌫
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            disabled={loading || pinCode.length < 4 || !selectedCashier || !selectedRegister}
            onClick={() => handlePinLogin(pinCode)}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Validando sesión y caja...</span>
              </>
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-3 sm:p-4 text-center text-[11px] text-slate-500 border-t border-slate-800/60 flex items-center justify-center gap-4">
        <span>Recreo PDV — Control de sesiones y cajas registradoras</span>
      </footer>
    </div>
  );
};
