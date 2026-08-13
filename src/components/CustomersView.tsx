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
  Edit,
  Trash2,
} from 'lucide-react';
import { Customer, CustomerCreditMovement } from '../types/pos';

interface CustomersViewProps {
  customers: Customer[];
  movements: CustomerCreditMovement[];
  onSaveCustomer: (data: Partial<Customer> & { name: string }) => void;
  onDeleteCustomer?: (id: string) => void;
  onAddPayment: (customerId: string, amount: number) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers = [],
  movements = [],
  onSaveCustomer,
  onDeleteCustomer,
  onAddPayment,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    (customers || [])[0]?.id || null
  );

  // New / Edit Customer Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null);
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

  const handleOpenAddCustomer = () => {
    setEditCustomerId(null);
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewAddress('');
    setNewLimit('2000');
    setNewNotes('');
    setShowNewModal(true);
  };

  const handleOpenEditCustomer = (c: Customer) => {
    setEditCustomerId(c.id);
    setNewName(c.name);
    setNewPhone(c.phone || '');
    setNewEmail(c.email || '');
    setNewAddress(c.address || '');
    setNewLimit((c.creditLimit || 2000).toString());
    setNewNotes(c.notes || '');
    setShowNewModal(true);
  };

  const handleDeleteCustomer = (c: Customer) => {
    if (c.creditBalance > 0) {
      alert(`No se puede eliminar el cliente "${c.name}" porque tiene un saldo deudor pendiente de $${c.creditBalance.toFixed(2)}. Liquida el saldo primero.`);
      return;
    }

    if (confirm(`¿Seguro que deseas eliminar al cliente "${c.name}"?`)) {
      if (onDeleteCustomer) {
        onDeleteCustomer(c.id);
      }
    }
  };

  const handleSaveCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert('Ingresa el nombre del cliente');
      return;
    }

    onSaveCustomer({
      id: editCustomerId || undefined,
      name: newName.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim() || undefined,
      address: newAddress.trim() || undefined,
      creditLimit: parseFloat(newLimit) || 1000,
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
          onClick={handleOpenAddCustomer}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Nuevo Cliente
        </button>
      </div>

      {/* Grid Display: Left List / Right Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left Customer List (1 Col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar cliente por nombre o tel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5 max-h-[550px] overflow-y-auto pr-1">
            {filteredCustomers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No se encontraron clientes registrados.
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const isSelected = selectedCustomer?.id === c.id;
                const creditUsedPercent = Math.min(
                  100,
                  (c.creditBalance / (c.creditLimit || 1)) * 100
                );

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-500 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-xs text-slate-900">{c.name}</div>
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                          c.creditBalance > 0
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        ${c.creditBalance.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{c.phone || 'Sin teléfono'}</span>
                    </div>

                    {/* Progress Bar of Credit Limit */}
                    <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
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
                      <Phone className="w-3.5 h-3.5" /> {selectedCustomer.phone || 'Sin teléfono'}
                    </span>
                    {selectedCustomer.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" /> {selectedCustomer.email}
                      </span>
                    )}
                    {selectedCustomer.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {selectedCustomer.address}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditCustomer(selectedCustomer)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1"
                    title="Editar datos del cliente"
                  >
                    <Edit className="w-3.5 h-3.5 text-indigo-600" /> Editar
                  </button>

                  <button
                    onClick={() => handleDeleteCustomer(selectedCustomer)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200"
                    title="Eliminar cliente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setShowPaymentModal(true)}
                    disabled={selectedCustomer.creditBalance <= 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5"
                  >
                    <DollarSign className="w-4 h-4" /> ABONAR A CRÉDITO
                  </button>
                </div>
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
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <History className="w-4 h-4 text-indigo-600" /> Historial de Cargos y Abonos
                </span>
                <span className="text-xs text-slate-400">{customerHistory.length} movimientos</span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
                {customerHistory.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    Este cliente no registra compras a crédito ni abonos recientes.
                  </div>
                ) : (
                  customerHistory.map((m) => (
                    <div key={m.id} className="py-2.5 px-2 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          <span>{m.description}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                              m.type === 'CHARGE'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {m.type === 'CHARGE' ? 'CARGO (+) ' : 'ABONO (-) '}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(m.date).toLocaleString('es-MX')}
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
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
            Selecciona un cliente de la lista para ver su estado de cuenta.
          </div>
        )}
      </div>

      {/* MODAL 1: New / Edit Customer Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600">
                <Users className="w-6 h-6" />
                <h3 className="font-extrabold text-lg text-slate-900">
                  {editCustomerId ? 'Editar Datos del Cliente' : 'Registrar Nuevo Cliente'}
                </h3>
              </div>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre Completo *:</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Juan Pérez G."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Teléfono:</label>
                  <input
                    type="text"
                    placeholder="ej. 555-0192"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Límite Crédito ($):</label>
                  <input
                    type="number"
                    step="100"
                    placeholder="2000"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-black text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Correo Electrónico:</label>
                <input
                  type="email"
                  placeholder="ej. cliente@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Dirección / Domicilio:</label>
                <input
                  type="text"
                  placeholder="ej. Av. Hidalgo #120, Col. Centro"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notas / Observaciones:</label>
                <textarea
                  rows={2}
                  placeholder="ej. Preferencia de pago quincenal"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
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
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow"
                >
                  {editCustomerId ? 'Guardar Cambios' : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Payment Modal */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <DollarSign className="w-6 h-6" />
                <h3 className="font-extrabold text-lg text-slate-900">Registrar Abono a Crédito</h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Cliente:</span>
                <span className="font-bold text-slate-900">{selectedCustomer.name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Saldo Deudor Actual:</span>
                <span className="font-black text-rose-600">
                  ${selectedCustomer.creditBalance.toFixed(2)}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Monto del Abono en Efectivo ($) *:
                </label>
                <input
                  type="number"
                  step="1"
                  autoFocus
                  required
                  max={selectedCustomer.creditBalance}
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-3 bg-white border-2 border-emerald-500 rounded-xl text-xl font-black text-slate-900"
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
                  Confirmar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
