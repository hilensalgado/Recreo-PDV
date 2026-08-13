import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  History,
  CheckCircle2,
  X,
  AlertCircle,
  Receipt,
} from 'lucide-react';
import { Customer, CustomerCreditMovement } from '../types/pos';

interface CustomersViewProps {
  customers: Customer[];
  movements: CustomerCreditMovement[];
  onSaveCustomer: (data: Partial<Customer> & { name: string }) => void;
  onAddPayment: (customerId: string, amount: number) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers = [],
  movements = [],
  onSaveCustomer,
  onAddPayment,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    (customers || [])[0]?.id || null
  );

  // New Customer Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLimit, setNewLimit] = useState('2000');
  const [newNotes, setNewNotes] = useState('');

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  const selectedCustomer = (customers || []).find((c) => c.id === selectedCustomerId) || (customers || [])[0];
  const customerHistory = (movements || []).filter((m) => m.customerId === selectedCustomer?.id);

  const filteredCustomers = (customers || []).filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert('Ingresa el nombre del cliente');
      return;
    }

    onSaveCustomer({
      name: newName.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim() || undefined,
      address: newAddress.trim() || undefined,
      creditLimit: parseFloat(newLimit) || 1000,
      creditBalance: 0,
      notes: newNotes.trim() || undefined,
    });

    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewAddress('');
    setNewLimit('2000');
    setNewNotes('');
    setShowNewModal(false);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Ingresa un monto de abono válido');
      return;
    }

    onAddPayment(selectedCustomer.id, amt);
    setPaymentAmount('');
    setShowPaymentModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-3 space-y-4 select-none">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-slate-800">
              [F7] Gestión de Clientes y Créditos (Fiado)
            </h2>
            <p className="text-xs text-slate-500">
              Directorio de clientes, estados de cuenta, límite de crédito y abonos
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Registrar Nuevo Cliente
        </button>
      </div>

      {/* Main Grid: Left List / Right Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left List Column */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-3 flex flex-col h-[650px]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar cliente por nombre o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 border rounded-lg">
            {filteredCustomers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No se encontraron clientes.
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const isSelected = selectedCustomer?.id === c.id;
                const creditUsedPercent = Math.min(100, (c.creditBalance / (c.creditLimit || 1)) * 100);

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className={`w-full p-3 text-left transition-colors flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-50 border-l-4 border-indigo-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-800 text-xs">{c.name}</span>
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                          c.creditBalance > 0
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {c.creditBalance > 0 ? `Deuda $${c.creditBalance.toFixed(2)}` : 'Sin Deuda'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>{c.phone}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full ${
                          creditUsedPercent > 90 ? 'bg-rose-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${creditUsedPercent}%` }}
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Details Column (2 Cols) */}
        {selectedCustomer ? (
          <div className="md:col-span-2 space-y-4">
            {/* Customer Info Box */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">{selectedCustomer.name}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> {selectedCustomer.phone}
                    </span>
                    {selectedCustomer.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" /> {selectedCustomer.email}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setShowPaymentModal(true)}
                  disabled={selectedCustomer.creditBalance <= 0}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5"
                >
                  <DollarSign className="w-4 h-4" /> ABONAR A CRÉDITO
                </button>
              </div>

              {/* Credit Status Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Límite de Crédito
                  </span>
                  <span className="text-base font-black text-slate-800">
                    ${selectedCustomer.creditLimit.toFixed(2)}
                  </span>
                </div>

                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">
                    Saldo Deudor (Deuda)
                  </span>
                  <span className="text-base font-black text-rose-600">
                    ${selectedCustomer.creditBalance.toFixed(2)}
                  </span>
                </div>

                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                    Crédito Disponible
                  </span>
                  <span className="text-base font-black text-emerald-700">
                    ${(selectedCustomer.creditLimit - selectedCustomer.creditBalance).toFixed(2)}
                  </span>
                </div>
              </div>

              {selectedCustomer.notes && (
                <div className="bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100 text-xs text-indigo-900 font-medium">
                  <strong>Notas del Cliente:</strong> {selectedCustomer.notes}
                </div>
              )}
            </div>

            {/* Customer Movements History */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2 font-extrabold text-sm text-slate-800 border-b border-slate-100 pb-2">
                <History className="w-4 h-4 text-indigo-600" />
                <span>Estado de Cuenta e Historial de Movimientos</span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border rounded-lg">
                {customerHistory.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Sin cargos ni abonos registrados para este cliente.
                  </div>
                ) : (
                  customerHistory.map((m) => (
                    <div key={m.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <div className="font-bold text-slate-800">{m.description}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(m.date).toLocaleString('es-MX')} por {m.cashierId}
                        </div>
                      </div>

                      <div
                        className={`font-black text-sm ${
                          m.type === 'CHARGE' ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {m.type === 'CHARGE' ? '+' : '-'}${m.amount.toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex items-center justify-center text-slate-400 text-sm font-semibold">
            Selecciona un cliente para ver su estado de cuenta.
          </div>
        )}
      </div>

      {/* MODAL 1: New Customer Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600">
                <Users className="w-6 h-6" />
                <h3 className="font-extrabold text-lg text-slate-900">Registrar Nuevo Cliente</h3>
              </div>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre Completo *:</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Doña Rosa / Don Carlos"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Teléfono:</label>
                  <input
                    type="text"
                    placeholder="555-000-0000"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Límite Crédito ($):</label>
                  <input
                    type="number"
                    step="500"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Dirección:</label>
                <input
                  type="text"
                  placeholder="Calle, Número, Colonia"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notas / Referencias:</label>
                <textarea
                  rows={2}
                  placeholder="ej. Paga los días 15 y 30 de cada mes"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Credit Payment */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <DollarSign className="w-6 h-6" />
                <h3 className="font-extrabold text-lg text-slate-900">Abono a Deuda de Cliente</h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800 text-sm">{selectedCustomer.name}</div>
                <div className="text-rose-600 font-bold mt-1">
                  Saldo Deudor Actual: ${selectedCustomer.creditBalance.toFixed(2)}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Monto del Abono en Efectivo ($):</label>
                <input
                  type="number"
                  step="0.5"
                  autoFocus
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-3 bg-white border-2 border-emerald-500 rounded-xl text-2xl font-black text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow"
                >
                  Registrar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
