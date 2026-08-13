import React, { useState } from 'react';
import {
  Settings,
  Store,
  UserCheck,
  Plus,
  Shield,
  Key,
  Check,
  X,
  Sliders,
  DollarSign,
  Lock,
  Unlock,
} from 'lucide-react';
import { CashRegister, Cashier, CashierPermissions } from '../types/pos';

interface RegistersCashiersViewProps {
  registers: CashRegister[];
  cashiers: Cashier[];
  onSaveRegister: (reg: Partial<CashRegister> & { name: string }) => void;
  onSaveCashier: (data: Partial<Cashier> & { name: string; pin: string }) => void;
  onResetSeed: () => void;
}

export const RegistersCashiersView: React.FC<RegistersCashiersViewProps> = ({
  registers,
  cashiers,
  onSaveRegister,
  onSaveCashier,
  onResetSeed,
}) => {
  // New Register Modal
  const [showRegModal, setShowRegModal] = useState(false);
  const [regName, setRegName] = useState('');
  const [regLocation, setRegLocation] = useState('');

  // New/Edit Cashier Modal
  const [showCashierModal, setShowCashierModal] = useState(false);
  const [editCashierId, setEditCashierId] = useState<string | null>(null);
  const [cashierName, setCashierName] = useState('');
  const [cashierPin, setCashierPin] = useState('');
  const [cashierRole, setCashierRole] = useState<'ADMIN' | 'CASHIER'>('CASHIER');
  const [permissions, setPermissions] = useState<CashierPermissions>({
    allowPriceChange: false,
    allowDiscounts: true,
    allowReturns: false,
    allowReports: false,
    allowInventoryEdit: false,
    allowCashDrawOpen: true,
  });

  const handleSaveRegSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) return;

    onSaveRegister({
      name: regName.trim(),
      location: regLocation.trim() || 'Local Comercial',
      isMain: false,
      isOpen: false,
    });

    setRegName('');
    setRegLocation('');
    setShowRegModal(false);
  };

  const handleOpenNewCashier = () => {
    setEditCashierId(null);
    setCashierName('');
    setCashierPin(Math.floor(1000 + Math.random() * 9000).toString());
    setCashierRole('CASHIER');
    setPermissions({
      allowPriceChange: false,
      allowDiscounts: true,
      allowReturns: false,
      allowReports: false,
      allowInventoryEdit: false,
      allowCashDrawOpen: true,
    });
    setShowCashierModal(true);
  };

  const handleOpenEditCashier = (c: Cashier) => {
    setEditCashierId(c.id);
    setCashierName(c.name);
    setCashierPin(c.pin);
    setCashierRole(c.role);
    setPermissions(c.permissions);
    setShowCashierModal(true);
  };

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
              Configuración Multi-Caja y Cajeros
            </h2>
            <p className="text-xs text-slate-500">
              Administra las cajas registradoras del negocio, cajeros y permisos de operación
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (confirm('¿Restaurar la base de datos completa con datos de demostración?')) {
              onResetSeed();
            }
          }}
          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg border border-rose-200 transition-colors"
        >
          Reiniciar Datos Semilla
        </button>
      </div>

      {/* Grid: Left Registers / Right Cashiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Registers Column */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 font-extrabold text-sm text-slate-800">
              <Store className="w-4 h-4 text-blue-600" />
              <span>Cajas Registradoras del Negocio ({registers.length})</span>
            </div>
            <button
              onClick={() => setShowRegModal(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva Caja
            </button>
          </div>

          <div className="space-y-2">
            {registers.map((r) => (
              <div
                key={r.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                    {r.name}
                    {r.isMain && (
                      <span className="bg-blue-100 text-blue-800 text-[9px] px-1.5 py-0.2 rounded font-extrabold">
                        CENTRAL
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{r.location}</div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      r.isOpen
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {r.isOpen ? '🟢 ABIERTA' : '🔴 CERRADA'}
                  </span>
                  {r.currentCashierName && (
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {r.currentCashierName}
                    </span>
                  )}
                </div>
              </div>
            ))}
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
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                    {c.name}
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
                  <div className="text-[10px] text-slate-400 mt-0.5">PIN Acceso: ****{c.pin.slice(-2)}</div>
                </div>

                <button
                  onClick={() => handleOpenEditCashier(c)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs rounded border border-slate-300 transition-colors"
                >
                  Permisos
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL 1: New Register Modal */}
      {showRegModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-blue-600">
                <Store className="w-6 h-6" />
                <h3 className="font-extrabold text-lg text-slate-900">Agregar Nueva Caja Registradora</h3>
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
                  placeholder="ej. Caja 4 - Carnicería"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ubicación / Módulo:</label>
                <input
                  type="text"
                  placeholder="ej. Pasillo Central"
                  value={regLocation}
                  onChange={(e) => setRegLocation(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
                />
              </div>

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
                  Guardar Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create/Edit Cashier */}
      {showCashierModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600">
                <UserCheck className="w-6 h-6" />
                <h3 className="font-extrabold text-lg text-slate-900">
                  {editCashierId ? 'Editar Permisos de Cajero' : 'Registrar Nuevo Cajero'}
                </h3>
              </div>
              <button
                onClick={() => setShowCashierModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCashierSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre del Cajero *:</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Roberto Gómez"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">PIN de Acceso (4 dígitos) *:</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={cashierPin}
                    onChange={(e) => setCashierPin(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-center text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Rol / Perfil:</label>
                  <select
                    value={cashierRole}
                    onChange={(e) => setCashierRole(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
                  >
                    <option value="CASHIER">Cajero Estándar</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
              </div>

              {/* Permissions Toggles */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Permisos de Operación:
                </span>

                {[
                  { key: 'allowDiscounts', label: 'Aplicar Descuentos en Ventas' },
                  { key: 'allowPriceChange', label: 'Cambiar Precios Libres en Venta' },
                  { key: 'allowReturns', label: 'Cancelar Ventas y Devoluciones' },
                  { key: 'allowReports', label: 'Ver Reportes y Métricas' },
                  { key: 'allowInventoryEdit', label: 'Modificar Catálogo / Inventario' },
                ].map((perm) => (
                  <label
                    key={perm.key}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer"
                  >
                    <span className="font-semibold text-slate-800">{perm.label}</span>
                    <input
                      type="checkbox"
                      checked={(permissions as any)[perm.key]}
                      onChange={(e) =>
                        setPermissions({
                          ...permissions,
                          [perm.key]: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                  </label>
                ))}
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
