import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  UserCheck,
  Plus,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Shield,
  Key,
  Check,
  X,
  Sliders,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Mail,
  CheckCircle2,
  Download,
  Smartphone,
  MonitorSmartphone,
  Sparkles,
  Laptop,
  Percent,
  BadgePercent,
  Users,
  RefreshCw,
  Tag,
  CreditCard,
} from 'lucide-react';
import { CashRegister, Cashier, CashierPermissions, Customer } from '../types/pos';
import { PWADownloadModal } from './PWADownloadModal';
import { api } from '../services/api';

interface RegistersCashiersViewProps {
  registers: CashRegister[];
  cashiers: Cashier[];
  customers?: Customer[];
  isAdmin?: boolean;
  onSaveRegister: (reg: Partial<CashRegister> & { name: string }) => void;
  onDeleteRegister?: (id: string) => void;
  onSaveCashier: (data: Partial<Cashier> & { name: string; pin: string; employeeDiscountPercentage?: number }) => void;
  onDeleteCashier?: (id: string) => void;
  onOpenShiftRegister?: (reg: CashRegister) => void;
  onCloseShiftRegister?: (reg: CashRegister) => void;
  onReloadData?: () => void;
}

export const RegistersCashiersView: React.FC<RegistersCashiersViewProps> = ({
  registers = [],
  cashiers = [],
  customers = [],
  isAdmin = false,
  onSaveRegister,
  onDeleteRegister,
  onSaveCashier,
  onDeleteCashier,
  onOpenShiftRegister,
  onCloseShiftRegister,
  onReloadData,
}) => {
  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center select-none">
        <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-md space-y-4">
          <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-200">
            <Lock className="w-10 h-10" />
          </div>
          <h2 className="font-extrabold text-2xl text-slate-800">
            Acceso Denegado - Solo Administradores
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto font-medium">
            El apartado de configuración de Cajas y Cajeros está restringido únicamente a perfiles de Administrador General.
          </p>
        </div>
      </div>
    );
  }

  // Active Sub-Tab: Registers & Cashiers vs Employee Discounts
  const [activeSubTab, setActiveSubTab] = useState<'registers_cashiers' | 'employee_discounts'>('registers_cashiers');

  // Employee Discounts Config State
  const [defaultDiscount, setDefaultDiscount] = useState<number>(10);
  const [cashierDiscounts, setCashierDiscounts] = useState<Record<string, number>>({});
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    // Load Employee Discount Config
    api.getEmployeeDiscountConfig()
      .then((cfg) => {
        if (cfg) {
          setDefaultDiscount(cfg.defaultDiscountPercentage ?? 10);
          setCashierDiscounts(cfg.cashierDiscounts ?? {});
        }
      })
      .catch((err) => console.warn('No se pudo cargar la config de descuentos:', err));
  }, []);

  // New / Edit Register Modal State
  const [showRegModal, setShowRegModal] = useState(false);
  const [editRegId, setEditRegId] = useState<string | null>(null);
  const [regName, setRegName] = useState('');
  const [regLocation, setRegLocation] = useState('');
  const [regIsMain, setRegIsMain] = useState(false);

  // New / Edit Cashier Modal State
  const [showCashierModal, setShowCashierModal] = useState(false);
  const [editCashierId, setEditCashierId] = useState<string | null>(null);
  const [cashierName, setCashierName] = useState('');
  const [cashierEmail, setCashierEmail] = useState('');
  const [cashierPin, setCashierPin] = useState('');
  const [cashierRole, setCashierRole] = useState<'ADMIN' | 'CASHIER'>('CASHIER');
  const [cashierDiscountInput, setCashierDiscountInput] = useState<number>(10);
  const [showPinInput, setShowPinInput] = useState(false);
  // Show all PINs toggle
  const [showAllPins, setShowAllPins] = useState(false);
  // PWA Download & Install Modal
  const [showPWAModal, setShowPWAModal] = useState(false);

  const defaultCashierPermissions: CashierPermissions = {
    allowPriceChange: false,
    allowDiscounts: true,
    allowReturns: false,
    allowDeleteSales: false,
    allowReports: false,
    allowInventoryEdit: false,
    allowCashDrawOpen: true,
    allowCashMovements: true,
    allowCustomerPayments: true,
    allowHoldTickets: true,
    allowCommonProducts: true,
    allowConfigEdit: false,
  };

  const defaultAdminPermissions: CashierPermissions = {
    allowPriceChange: true,
    allowDiscounts: true,
    allowReturns: true,
    allowDeleteSales: true,
    allowReports: true,
    allowInventoryEdit: true,
    allowCashDrawOpen: true,
    allowCashMovements: true,
    allowCustomerPayments: true,
    allowHoldTickets: true,
    allowCommonProducts: true,
    allowConfigEdit: true,
  };

  const [permissions, setPermissions] = useState<CashierPermissions>(defaultCashierPermissions);

  // Open Add Register Modal
  const handleOpenAddReg = () => {
    setEditRegId(null);
    setRegName(`Caja ${registers.length + 1}`);
    setRegLocation('Local Comercial');
    setRegIsMain(registers.length === 0);
    setShowRegModal(true);
  };

  // Open Edit Register Modal
  const handleOpenEditReg = (r: CashRegister) => {
    setEditRegId(r.id);
    setRegName(r.name);
    setRegLocation(r.location);
    setRegIsMain(r.isMain);
    setShowRegModal(true);
  };

  // Save Register Submit
  const handleSaveRegSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) return;

    onSaveRegister({
      id: editRegId || undefined,
      name: regName.trim(),
      location: regLocation.trim() || 'Local Comercial',
      isMain: regIsMain,
    });

    setShowRegModal(false);
  };

  // Delete Register
  const handleDeleteReg = (r: CashRegister) => {
    const confirmMsg = r.isOpen
      ? `La caja "${r.name}" tiene un turno abierto. ¿Deseas cerrar el turno automáticamente y eliminar la caja de forma definitiva?`
      : `¿Seguro que deseas eliminar la caja "${r.name}"?`;

    if (confirm(confirmMsg)) {
      if (onDeleteRegister) {
        onDeleteRegister(r.id);
      }
    }
  };

  // Direct Force Close Shift
  const handleForceCloseShift = async (r: CashRegister) => {
    if (confirm(`¿Deseas forzar el cierre del turno abierto en "${r.name}"? Esto liberará la caja y al cajero asignado.`)) {
      try {
        await api.forceCloseRegisterShift(r.id);
        setSyncStatusMsg(`Turno de la caja "${r.name}" cerrado correctamente.`);
        setTimeout(() => setSyncStatusMsg(null), 4000);
        if (onReloadData) onReloadData();
      } catch (err: any) {
        alert('Error al cerrar el turno: ' + err.message);
      }
    }
  };

  // Open Add Cashier Modal
  const handleOpenNewCashier = () => {
    setEditCashierId(null);
    setCashierName('');
    setCashierEmail('');
    setCashierPin(Math.floor(1000 + Math.random() * 9000).toString());
    setCashierRole('CASHIER');
    setCashierDiscountInput(defaultDiscount || 10);
    setPermissions(defaultCashierPermissions);
    setShowPinInput(false);
    setShowCashierModal(true);
  };

  // Open Edit Cashier Modal
  const handleOpenEditCashier = (c: Cashier) => {
    setEditCashierId(c.id);
    setCashierName(c.name);
    setCashierEmail(c.email || '');
    setCashierPin(c.pin);
    setCashierRole(c.role);
    setCashierDiscountInput(c.employeeDiscountPercentage ?? cashierDiscounts[c.id] ?? defaultDiscount ?? 10);
    setPermissions(c.permissions || (c.role === 'ADMIN' ? defaultAdminPermissions : defaultCashierPermissions));
    setShowPinInput(false);
    setShowCashierModal(true);
  };

  // Save Cashier Submit
  const handleSaveCashierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashierName.trim() || !cashierPin.trim()) return;

    onSaveCashier({
      id: editCashierId || undefined,
      name: cashierName.trim(),
      email: cashierEmail.trim().toLowerCase() || undefined,
      pin: cashierPin.trim(),
      role: cashierRole,
      permissions,
      employeeDiscountPercentage: Number(cashierDiscountInput) || 0,
    });

    setShowCashierModal(false);
  };

  const setRolePreset = (role: 'ADMIN' | 'CASHIER') => {
    setCashierRole(role);
    if (role === 'ADMIN') {
      setPermissions(defaultAdminPermissions);
    } else {
      setPermissions(defaultCashierPermissions);
    }
  };

  // Save Global Default Discount
  const handleSaveDefaultDiscount = async () => {
    try {
      await api.saveEmployeeDiscountConfig({
        defaultDiscountPercentage: Number(defaultDiscount) || 0,
      });
      setSyncStatusMsg(`Porcentaje predeterminado actualizado a ${defaultDiscount}%.`);
      setTimeout(() => setSyncStatusMsg(null), 4000);
      if (onReloadData) onReloadData();
    } catch (err: any) {
      alert('Error al guardar configuración de descuento: ' + err.message);
    }
  };

  // Save Individual Cashier Discount
  const handleSaveSingleCashierDiscount = async (cashierId: string, disc: number) => {
    try {
      await api.updateCashierEmployeeDiscount(cashierId, disc);
      setCashierDiscounts((prev) => ({ ...prev, [cashierId]: disc }));
      setSyncStatusMsg(`Descuento de empleado actualizado para el cajero.`);
      setTimeout(() => setSyncStatusMsg(null), 3000);
      if (onReloadData) onReloadData();
    } catch (err: any) {
      alert('Error al actualizar descuento: ' + err.message);
    }
  };

  // Sync Employee Customers Manually
  const handleSyncEmployeeCustomers = async () => {
    setIsSyncing(true);
    try {
      await api.syncEmployeeCustomers();
      setSyncStatusMsg('¡Cuentas de clientes empleados sincronizadas correctamente!');
      setTimeout(() => setSyncStatusMsg(null), 4000);
      if (onReloadData) onReloadData();
    } catch (err: any) {
      alert('Error al sincronizar cuentas de empleados: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-3 space-y-3 sm:space-y-4 select-none pb-16">
      {/* Top Header */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-800 rounded-xl shrink-0">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-extrabold text-base sm:text-lg text-slate-800">
                [F9 / Config] Cajas, Cajeros y Descuento de Empleados
              </h2>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-200">
                PWA Ready
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Administración de cajas, cajeros, cuentas de empleados con descuento y permisos
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* PWA Download / Install Button */}
          <button
            type="button"
            onClick={() => setShowPWAModal(true)}
            className="flex-1 sm:flex-initial px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[38px]"
            title="Descargar o instalar Recreo PDV como aplicación nativa en celular, tablet o PC"
          >
            <MonitorSmartphone className="w-4 h-4 text-blue-200" />
            <span>Descargar App PWA</span>
            <span className="bg-white/20 text-white text-[9px] font-black px-1.5 py-0.5 rounded ml-0.5">
              APK / WebApp
            </span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs Switcher */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-xl shadow-xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('registers_cashiers')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'registers_cashiers'
              ? 'bg-slate-900 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Cajas y Cajeros</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-200">
            {cashiers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('employee_discounts')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'employee_discounts'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BadgePercent className="w-4 h-4 text-emerald-300" />
          <span>Descuento de Empleados</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-700 text-emerald-100 font-black">
            {cashiers.length} Cuentas
          </span>
        </button>
      </div>

      {syncStatusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs rounded-xl flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncStatusMsg}</span>
          </div>
          <button onClick={() => setSyncStatusMsg(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* VIEW 1: REGISTERS & CASHIERS */}
      {activeSubTab === 'registers_cashiers' && (
        <>
          {/* PWA Quick Info Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-3 sm:p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-blue-800/40">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg text-blue-300 shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-2">
                  <span>¿Quieres instalar Recreo PDV en tu Celular, Tablet o Computadora de Caja?</span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-1.5 py-0.2 rounded border border-emerald-500/30">
                    100% Gratis
                  </span>
                </div>
                <p className="text-[11px] text-blue-200/80 mt-0.5">
                  Instala la aplicación web progresiva (PWA) para operar a pantalla completa sin barras de navegador y con sincronización en tiempo real.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPWAModal(true)}
              className="w-full sm:w-auto px-3.5 py-1.5 bg-white hover:bg-blue-50 text-blue-900 font-black text-xs rounded-lg shadow transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Ver Instrucciones / Descargar</span>
            </button>
          </div>

          {/* Grid: Left Registers / Right Cashiers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Registers Column */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 font-extrabold text-sm text-slate-800">
                  <Store className="w-4 h-4 text-blue-600" />
                  <span>Cajas Registradoras ({registers.length})</span>
                </div>
                <button
                  onClick={handleOpenAddReg}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center gap-1 cursor-pointer min-h-[34px]"
                >
                  <Plus className="w-3.5 h-3.5" /> Nueva Caja
                </button>
              </div>

              <div className="space-y-2">
                {registers.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs font-semibold">
                    No hay cajas registradoras creadas.
                  </div>
                ) : (
                  registers.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:border-slate-300 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                          <span>{r.name}</span>
                          {r.isMain && (
                            <span className="bg-blue-100 text-blue-800 text-[9px] px-1.5 py-0.2 rounded font-extrabold">
                              Principal
                            </span>
                          )}
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                              r.isOpen
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {r.isOpen ? 'Turno Abierto' : 'Caja Cerrada'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {r.location || 'Local Comercial'} • ID: {r.id}
                          {r.isOpen && r.currentCashierName && (
                            <span className="ml-2 text-emerald-700 font-semibold">
                              (Cajero: {r.currentCashierName})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {r.isOpen && (
                          <button
                            type="button"
                            onClick={() => handleForceCloseShift(r)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            title="Cerrar turno abierto de esta caja"
                          >
                            <Unlock className="w-3 h-3 text-amber-600" />
                            <span>Cerrar Turno</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEditReg(r)}
                          className="p-2 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                          title="Editar Caja"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {registers.length > 1 && (
                          <button
                            onClick={() => handleDeleteReg(r)}
                            className="p-2 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar Caja"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Cashiers Column */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 font-extrabold text-sm text-slate-800">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <span>Cajeros y Permisos ({cashiers.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAllPins(!showAllPins)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    title="Mostrar/Ocultar PINs configurados"
                  >
                    {showAllPins ? <Lock className="w-3 h-3 text-indigo-600" /> : <Key className="w-3 h-3 text-slate-600" />}
                    <span>{showAllPins ? 'Ocultar PINs' : 'Ver PINs'}</span>
                  </button>
                  <button
                    onClick={handleOpenNewCashier}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nuevo Cajero
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {cashiers.map((c) => {
                  const empDiscount = c.employeeDiscountPercentage ?? cashierDiscounts[c.id] ?? defaultDiscount ?? 10;
                  return (
                    <div
                      key={c.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:border-slate-300 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                          <span>{c.name}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                              c.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {c.role}
                          </span>
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.2 rounded font-extrabold border border-emerald-200 flex items-center gap-0.5">
                            <Tag className="w-2.5 h-2.5 text-emerald-600" />
                            {empDiscount}% Desc. Empleado
                          </span>
                        </div>

                        {/* Authorized Email Display */}
                        <div className="text-[10px] text-slate-600 flex items-center gap-1.5 font-medium">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          {c.email ? (
                            <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {c.email}
                            </span>
                          ) : (
                            <span className="text-amber-600 text-[10px] italic">
                              Sin correo asignado (Acceso por PIN)
                            </span>
                          )}
                        </div>

                        {/* PIN status */}
                        <div className="text-[10px] text-slate-600 flex items-center gap-1.5 font-medium">
                          <Key className="w-3 h-3 text-indigo-500" />
                          <span>PIN de acceso:</span>
                          <span className="font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                            {c.hasPin || c.pin ? '•••• (Protegido)' : 'No asignado'}
                          </span>
                        </div>

                        {/* Cashier Concurrency Status */}
                        <div className="mt-1 flex items-center gap-1 text-[10px]">
                          {c.isLoggedIn && c.activeDeviceId && c.lastHeartbeat && Date.now() - c.lastHeartbeat < 60000 ? (
                            <div className="flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded font-semibold">
                              <Laptop className="w-3 h-3 text-rose-600 shrink-0" />
                              <span>Sesión iniciada en: {c.activeDeviceId.slice(0, 10)}...</span>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm(`¿Cerrar y liberar la sesión remota de "${c.name}" para permitirle iniciar sesión aquí?`)) {
                                    await api.forceUnlockSession('cashier', c.id);
                                    window.location.reload();
                                  }
                                }}
                                className="ml-1 text-[9px] bg-rose-600 hover:bg-rose-700 text-white font-bold px-1.5 py-0.5 rounded cursor-pointer"
                              >
                                Cerrar Sesión Remota
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-slate-400" /> Disponible para iniciar sesión
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenEditCashier(c)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 shadow-2xs transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5 text-indigo-600" /> Permisos y Acceso
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* VIEW 2: EMPLOYEE DISCOUNTS & LINKED ACCOUNTS */}
      {activeSubTab === 'employee_discounts' && (
        <div className="space-y-4">
          {/* Top Info & Global Discount Configuration */}
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-emerald-700/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg">
                  <BadgePercent className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-white">
                    Gestión de Descuentos para Empleados y Cajeros
                  </h3>
                  <p className="text-xs text-emerald-200/80">
                    Cada cajero tiene creada automáticamente una cuenta de cliente vinculada <span className="font-mono bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30 text-emerald-300">[Empleado] Nombre</span> para aplicar descuentos y compras a cuenta de nómina o al contado.
                  </p>
                </div>
              </div>
            </div>

            {/* Global Default Setup */}
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/15 flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <div className="text-left w-full sm:w-auto">
                <label className="text-[11px] font-bold text-emerald-200 block">
                  Descuento Predeterminado Global:
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={defaultDiscount}
                    onChange={(e) => setDefaultDiscount(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    className="w-20 p-2 bg-white text-slate-900 font-black text-center text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <span className="font-black text-emerald-300 text-sm">%</span>
                </div>
              </div>

              <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveDefaultDiscount}
                  className="flex-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-extrabold text-xs rounded-lg shadow transition-colors cursor-pointer text-center"
                >
                  Guardar Global
                </button>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleSyncEmployeeCustomers}
                  className="flex-1 px-3 py-2 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-lg border border-white/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Cuentas'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Percentage Presets Helper */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-slate-500" /> Atajos de porcentaje rápido global:
            </span>
            {[5, 10, 15, 20, 25, 30, 50].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => {
                  setDefaultDiscount(pct);
                }}
                className={`px-2.5 py-1 text-xs font-extrabold rounded-lg border transition-all cursor-pointer ${
                  defaultDiscount === pct
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>

          {/* Cashiers List with Employee Discount configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {cashiers.map((c) => {
              const currentDiscount = c.employeeDiscountPercentage ?? cashierDiscounts[c.id] ?? defaultDiscount ?? 10;
              const linkedCustomer = customers.find(
                (cust) => cust.cashierId === c.id || (cust.isEmployee && cust.name.toLowerCase().includes(c.name.toLowerCase()))
              );

              return (
                <div
                  key={c.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center border border-emerald-200">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{c.name}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                              c.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {c.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          ID Cajero: {c.id} {c.email ? `• ${c.email}` : ''}
                        </div>
                      </div>
                    </div>

                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black px-2 py-1 rounded-lg flex items-center gap-1">
                      <Percent className="w-3 h-3 text-emerald-600" />
                      {currentDiscount}% Activo
                    </span>
                  </div>

                  {/* Linked Customer Account Details */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-600 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        Cuenta de Cliente Vinculada:
                      </span>
                      <span className="font-extrabold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px]">
                        {linkedCustomer ? linkedCustomer.name : `[Empleado] ${c.name}`}
                      </span>
                    </div>

                    {linkedCustomer && (
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600">
                        <div>
                          <span className="text-slate-400 block">Saldo Pendiente (Fiado):</span>
                          <span className={`font-bold ${linkedCustomer.creditBalance > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                            ${linkedCustomer.creditBalance.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Límite de Crédito:</span>
                          <span className="font-bold text-slate-700">
                            ${linkedCustomer.creditLimit.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Modify Discount for this employee */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">
                        Porcentaje de Descuento Asignado:
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium">Aplicable a productos</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {[5, 10, 15, 20, 25, 30].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleSaveSingleCashierDiscount(c.id, pct)}
                          className={`flex-1 py-1.5 text-xs font-extrabold rounded-lg border transition-all cursor-pointer ${
                            currentDiscount === pct
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:border-emerald-300'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={cashierDiscounts[c.id] ?? currentDiscount}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                            setCashierDiscounts((prev) => ({ ...prev, [c.id]: val }));
                          }}
                          placeholder="Personalizado..."
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 pr-7"
                        />
                        <span className="absolute right-2.5 top-2 text-xs font-bold text-slate-400">%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const val = cashierDiscounts[c.id] ?? currentDiscount;
                          handleSaveSingleCashierDiscount(c.id, val);
                        }}
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        Actualizar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Operational Instructions Banner */}
          <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-1.5 text-xs text-indigo-950">
            <div className="font-extrabold flex items-center gap-1.5 text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>¿Cómo utilizar el descuento de empleado en el Punto de Venta?</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px] pl-1">
              <li>
                En la pantalla de ventas, presiona <kbd className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 font-mono font-bold text-indigo-700">[F7] Clientes</kbd> o busca por el nombre del cajero.
              </li>
              <li>
                Selecciona al cliente con la etiqueta <span className="bg-emerald-100 text-emerald-800 font-bold px-1 rounded text-[10px]">[Empleado]</span>.
              </li>
              <li>
                El sistema aplicará de forma automática el porcentaje de descuento configurado para ese empleado a todos los productos del ticket.
              </li>
              <li>
                Al cobrar, el empleado puede pagar en <strong>Efectivo</strong>, <strong>Tarjeta</strong> o registrarlo a <strong>Crédito / Cuenta Corriente</strong> con su cupo disponible.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* MODAL 1: Add/Edit Register Modal */}
      {showRegModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-blue-600">
                <Store className="w-6 h-6" />
                <h3 className="font-extrabold text-lg text-slate-900">
                  {editRegId ? 'Editar Caja Registradora' : 'Agregar Nueva Caja Registradora'}
                </h3>
              </div>
              <button onClick={() => setShowRegModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRegSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre de la Caja *:</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Caja 1 - Mostrador"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ubicación / Módulo:</label>
                <input
                  type="text"
                  placeholder="ej. Entrada Principal / Módulo 2"
                  value={regLocation}
                  onChange={(e) => setRegLocation(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
                />
              </div>

              <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={regIsMain}
                  onChange={(e) => setRegIsMain(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="font-bold text-slate-800 text-xs">Caja Principal (Terminal Central)</span>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow cursor-pointer"
                >
                  {editRegId ? 'Guardar Cambios' : 'Guardar Caja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create/Edit Cashier & Full Permissions */}
      {showCashierModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600">
                <UserCheck className="w-6 h-6" />
                <h3 className="font-extrabold text-lg text-slate-900">
                  {editCashierId ? 'Editar Permisos, PIN y Descuento del Cajero' : 'Registrar Nuevo Cajero'}
                </h3>
              </div>
              <button
                onClick={() => setShowCashierModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCashierSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre Completo del Cajero / Admin *:</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Juan Pérez o Administrador Principal"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-700">PIN de Acceso (4-6 dígitos) *:</label>
                    <button
                      type="button"
                      onClick={() => setShowPinInput(!showPinInput)}
                      className="text-[10px] text-indigo-600 hover:underline font-bold cursor-pointer"
                    >
                      {showPinInput ? 'Ocultar' : 'Ver PIN'}
                    </button>
                  </div>
                  <input
                    type={showPinInput ? 'text' : 'password'}
                    maxLength={6}
                    minLength={4}
                    required
                    placeholder="2711"
                    value={cashierPin}
                    onChange={(e) => setCashierPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-black text-center text-slate-800 tracking-widest text-base"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Clave numérica para ingreso al sistema.</p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Perfil / Rol:</label>
                  <select
                    value={cashierRole}
                    onChange={(e) => setRolePreset(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
                  >
                    <option value="CASHIER">Cajero Estándar</option>
                    <option value="ADMIN">Administrador General</option>
                  </select>
                </div>
              </div>

              {/* Employee Discount Percentage for this Cashier */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <BadgePercent className="w-4 h-4 text-emerald-600" />
                    <span>Descuento de Empleado para este Cajero (%):</span>
                  </label>
                  <span className="text-emerald-700 font-extrabold">{cashierDiscountInput}%</span>
                </div>
                <div className="flex items-center gap-2">
                  {[5, 10, 15, 20, 25, 30].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setCashierDiscountInput(pct)}
                      className={`flex-1 py-1 text-xs font-extrabold rounded-lg border transition-all cursor-pointer ${
                        cashierDiscountInput === pct
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-100'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={cashierDiscountInput}
                    onChange={(e) => setCashierDiscountInput(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    className="w-16 p-1.5 bg-white border border-slate-300 rounded-lg font-bold text-center text-xs"
                  />
                </div>
                <p className="text-[10px] text-emerald-800 font-medium">
                  Se creará automáticamente la cuenta de cliente <span className="font-bold">[Empleado] {cashierName || 'Nombre'}</span> para compras con este beneficio.
                </p>
              </div>

              {/* Role Presets */}
              <div className="flex items-center gap-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                <span className="font-bold text-indigo-900 text-[11px]">Cargar accesos rápidos:</span>
                <button
                  type="button"
                  onClick={() => setRolePreset('CASHIER')}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-800 font-bold text-[10px] rounded border border-indigo-300 transition-colors cursor-pointer"
                >
                  Perfil Cajero
                </button>
                <button
                  type="button"
                  onClick={() => setRolePreset('ADMIN')}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded transition-colors cursor-pointer"
                >
                  Perfil Administrador
                </button>
              </div>

              {/* Permissions Toggles */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-2">
                  Permisos de Operación Detallados:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: 'allowDiscounts', label: 'Aplicar Descuentos en Ventas', desc: 'Permite reducir precios por ítem' },
                    { key: 'allowCommonProducts', label: 'Productos Comunes (F2)', desc: 'Ventas libres sin código' },
                    { key: 'allowCashMovements', label: 'Entradas/Salidas Dinero (F3)', desc: 'Retiros e ingresos de caja' },
                    { key: 'allowHoldTickets', label: 'Ventas en Espera (F6)', desc: 'Retener y recuperar tickets' },
                    { key: 'allowCustomerPayments', label: 'Abonos de Clientes (F7)', desc: 'Cobro de saldo a crédito' },
                    { key: 'allowCashDrawOpen', label: 'Abrir Cajón de Dinero', desc: 'Apertura manual de cajón' },
                    { key: 'allowPriceChange', label: 'Modificar Precio Libre', desc: 'Editar precio venta libremente' },
                    { key: 'allowReturns', label: 'Cancelar Ventas / Devoluciones', desc: 'Reintegrar stock e historial' },
                    { key: 'allowDeleteSales', label: 'Borrar Ventas Definitivamente', desc: 'Eliminación permanente de tickets y registros' },
                    { key: 'allowInventoryEdit', label: 'Editar Inventario (F8)', desc: 'Crear/modificar productos' },
                    { key: 'allowReports', label: 'Ver Reportes y Analítica', desc: 'Gráficos de ventas y ganancia' },
                    { key: 'allowConfigEdit', label: 'Administrar Cajas y Cajeros', desc: 'Editar cajas/cajeros del negocio' },
                  ].map((perm) => (
                    <label
                      key={perm.key}
                      className="flex items-start justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/80 cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="font-bold text-slate-800 text-[11px]">{perm.label}</div>
                        <div className="text-[9px] text-slate-400">{perm.desc}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean((permissions as any)[perm.key])}
                        onChange={(e) =>
                          setPermissions({
                            ...permissions,
                            [perm.key]: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 mt-0.5"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {editCashierId && onDeleteCashier && editCashierId !== 'cash-1' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Eliminar al cajero "${cashierName}" del sistema?`)) {
                        onDeleteCashier(editCashierId);
                        setShowCashierModal(false);
                      }
                    }}
                    className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 transition-colors cursor-pointer"
                  >
                    Eliminar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowCashierModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow cursor-pointer"
                >
                  Guardar Cajero
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* PWA Download / Install Modal */}
      <PWADownloadModal
        isOpen={showPWAModal}
        onClose={() => setShowPWAModal(false)}
      />
    </div>
  );
};