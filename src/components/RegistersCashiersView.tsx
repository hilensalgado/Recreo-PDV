import React, { useState } from 'react';
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
} from 'lucide-react';
import { CashRegister, Cashier, CashierPermissions } from '../types/pos';

interface RegistersCashiersViewProps {
  registers: CashRegister[];
  cashiers: Cashier[];
  isAdmin?: boolean;
  onSaveRegister: (reg: Partial<CashRegister> & { name: string }) => void;
  onDeleteRegister?: (id: string) => void;
  onSaveCashier: (data: Partial<Cashier> & { name: string; pin: string }) => void;
  onResetSeed: () => void;
  onOpenShiftRegister?: (reg: CashRegister) => void;
  onCloseShiftRegister?: (reg: CashRegister) => void;
}

export const RegistersCashiersView: React.FC<RegistersCashiersViewProps> = ({
  registers = [],
  cashiers = [],
  isAdmin = false,
  onSaveRegister,
  onDeleteRegister,
  onSaveCashier,
  onResetSeed,
  onOpenShiftRegister,
  onCloseShiftRegister,
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
  const [cashierPin, setCashierPin] = useState('');
  const [cashierRole, setCashierRole] = useState<'ADMIN' | 'CASHIER'>('CASHIER');
  const [showPinInput, setShowPinInput] = useState(false);

  const defaultCashierPermissions: CashierPermissions = {
    allowPriceChange: false,
    allowDiscounts: true,
    allowReturns: false,
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
    if (r.isOpen) {
      alert('No puedes eliminar una caja que tiene un turno abierto. Cierra la caja primero.');
      return;
    }
    if (confirm(`¿Seguro que deseas eliminar la caja "${r.name}"?`)) {
      if (onDeleteRegister) {
        onDeleteRegister(r.id);
      }
    }
  };

  // Open Add Cashier Modal
  const handleOpenNewCashier = () => {
    setEditCashierId(null);
    setCashierName('');
    setCashierPin(Math.floor(1000 + Math.random() * 9000).toString());
    setCashierRole('CASHIER');
    setPermissions(defaultCashierPermissions);
    setShowPinInput(false);
    setShowCashierModal(true);
  };

  // Open Edit Cashier Modal
  const handleOpenEditCashier = (c: Cashier) => {
    setEditCashierId(c.id);
    setCashierName(c.name);
    setCashierPin(c.pin);
    setCashierRole(c.role);
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
      pin: cashierPin.trim(),
      role: cashierRole,
      permissions,
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

  return (
    <div className="max-w-7xl mx-auto p-3 space-y-4 select-none">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-800 rounded-xl">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-slate-800">
              [F9 / Config] Administración de Cajas Registradoras y Cajeros
            </h2>
            <p className="text-xs text-slate-500">
              Crea, edita o elimina cajas registradoras, gestiona cajeros y sus permisos de seguridad
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (confirm('¿Restaurar la base de datos completa con datos de demostración?')) {
              onResetSeed();
            }
          }}
          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" /> Reiniciar Datos Semilla
        </button>
      </div>

      {/* Grid: Left Registers / Right Cashiers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Registers Column */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 font-extrabold text-sm text-slate-800">
              <Store className="w-4 h-4 text-blue-600" />
              <span>Cajas Registradoras del Negocio ({registers.length})</span>
            </div>
            <button
              onClick={handleOpenAddReg}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva Caja
            </button>
          </div>

          <div className="space-y-2">
            {registers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No hay cajas registradas. Haz clic en "+ Nueva Caja".
              </div>
            ) : (
              registers.map((r) => (
                <div
                  key={r.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                      <span>{r.name}</span>
                      {r.isMain && (
                        <span className="bg-blue-100 text-blue-800 text-[9px] px-1.5 py-0.2 rounded font-extrabold border border-blue-200">
                          PRINCIPAL
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{r.location}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.isOpen
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {r.isOpen ? '🟢 ABIERTA' : '🔴 CERRADA'}
                    </span>

                    {/* Open / Close Quick Action Button */}
                    {r.isOpen ? (
                      <button
                        onClick={() => onCloseShiftRegister && onCloseShiftRegister(r)}
                        className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-[11px] rounded transition-colors"
                        title="Cerrar caja"
                      >
                        Cerrar
                      </button>
                    ) : (
                      <button
                        onClick={() => onOpenShiftRegister && onOpenShiftRegister(r)}
                        className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[11px] rounded transition-colors"
                        title="Abrir caja"
                      >
                        Abrir
                      </button>
                    )}

                    {/* Edit Register */}
                    <button
                      onClick={() => handleOpenEditReg(r)}
                      className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-200 rounded transition-colors"
                      title="Editar Caja"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {/* Delete Register */}
                    <button
                      onClick={() => handleDeleteReg(r)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Eliminar Caja"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
            <button
              onClick={handleOpenNewCashier}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Nuevo Cajero
            </button>
          </div>

          <div className="space-y-2">
            {cashiers.map((c) => (
              <div
                key={c.id}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:border-slate-300 transition-colors"
              >
                <div>
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
                  </div>
                  {/* PIN Display is Strictly Protected / Hidden */}
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>PIN de acceso: •••• (Protegido)</span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenEditCashier(c)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 shadow-2xs transition-colors flex items-center gap-1"
                >
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" /> Permisos y PIN
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

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
              <button onClick={() => setShowRegModal(false)} className="text-slate-400 hover:text-slate-600">
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
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow"
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
                  {editCashierId ? 'Editar Permisos y PIN del Cajero' : 'Registrar Nuevo Cajero'}
                </h3>
              </div>
              <button
                onClick={() => setShowCashierModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCashierSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre Completo del Cajero *:</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Juan Pérez"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-700">PIN de Acceso (4 dígitos) *:</label>
                    <button
                      type="button"
                      onClick={() => setShowPinInput(!showPinInput)}
                      className="text-[10px] text-indigo-600 hover:underline font-bold"
                    >
                      {showPinInput ? 'Ocultar' : 'Ver PIN'}
                    </button>
                  </div>
                  <input
                    type={showPinInput ? 'text' : 'password'}
                    maxLength={4}
                    required
                    value={cashierPin}
                    onChange={(e) => setCashierPin(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-black text-center text-slate-800 tracking-widest text-base"
                  />
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

              {/* Role Presets */}
              <div className="flex items-center gap-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                <span className="font-bold text-indigo-900 text-[11px]">Cargar accesos rápidos:</span>
                <button
                  type="button"
                  onClick={() => setRolePreset('CASHIER')}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-800 font-bold text-[10px] rounded border border-indigo-300 transition-colors"
                >
                  Perfil Cajero
                </button>
                <button
                  type="button"
                  onClick={() => setRolePreset('ADMIN')}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded transition-colors"
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
                <button
                  type="button"
                  onClick={() => setShowCashierModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow"
                >
                  Guardar Cajero
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
