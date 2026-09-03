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
  BadgePercent,
  FileText,
  Award,
  Sparkles,
} from 'lucide-react';
import { Customer, CustomerCreditMovement, LoyaltyProgramConfig } from '../types/pos';
import { formatCurrency, roundCurrency } from '../utils/pricingEngine';

interface CustomersViewProps {
  customers: Customer[];
  movements: CustomerCreditMovement[];
  loyaltyConfig?: LoyaltyProgramConfig;
  onSaveCustomer: (data: Partial<Customer> & { name: string }) => void;
  onDeleteCustomer?: (id: string) => void;
  onAddPayment: (customerId: string, amount: number) => void;
  onOpenLoyaltyConfig?: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers = [],
  movements = [],
  loyaltyConfig,
  onSaveCustomer,
  onDeleteCustomer,
  onAddPayment,
  onOpenLoyaltyConfig,
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
  const [isEmployee, setIsEmployee] = useState(false);
  const [employeeDiscountPercentage, setEmployeeDiscountPercentage] = useState('10');

  // Fiscal info state
  const [newTaxId, setNewTaxId] = useState('');
  const [newTaxRegime, setNewTaxRegime] = useState('601 - General de Ley Personas Morales');
  const [newCfdiUsage, setNewCfdiUsage] = useState('G01 - Adquisición de mercancías');
  const [newFiscalAddress, setNewFiscalAddress] = useState('');
  const [newPostalCode, setNewPostalCode] = useState('');

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
    setIsEmployee(false);
    setEmployeeDiscountPercentage('10');
    setNewTaxId('');
    setNewTaxRegime('601 - General de Ley Personas Morales');
    setNewCfdiUsage('G01 - Adquisición de mercancías');
    setNewFiscalAddress('');
    setNewPostalCode('');
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
    setIsEmployee(!!c.isEmployee);
    setEmployeeDiscountPercentage((c.employeeDiscountPercentage || 10).toString());
    setNewTaxId(c.taxId || '');
    setNewTaxRegime(c.taxRegime || '601 - General de Ley Personas Morales');
    setNewCfdiUsage(c.cfdiUsage || 'G01 - Adquisición de mercancías');
    setNewFiscalAddress(c.fiscalAddress || '');
    setNewPostalCode(c.postalCode || '');
    setShowNewModal(true);
  };

  const handleDeleteCustomer = (c: Customer) => {
    if (c.creditBalance > 0) {
      alert(`No se puede eliminar el cliente "${c.name}" porque tiene un saldo deudor pendiente de ${formatCurrency(c.creditBalance)}. Liquida el saldo primero.`);
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
      isEmployee,
      employeeDiscountPercentage: isEmployee ? Math.min(100, Math.max(0, parseFloat(employeeDiscountPercentage) || 0)) : 0,
      taxId: newTaxId.trim().toUpperCase() || undefined,
      taxRegime: newTaxRegime || undefined,
      cfdiUsage: newCfdiUsage || undefined,
      fiscalAddress: newFiscalAddress.trim() || undefined,
      postalCode: newPostalCode.trim() || undefined,
    });

    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewAddress('');
    setNewLimit('2000');
    setNewNotes('');
    setIsEmployee(false);
    setEmployeeDiscountPercentage('10');
    setNewTaxId('');
    setNewFiscalAddress('');
    setNewPostalCode('');
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
  };  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-3 space-y-3 sm:space-y-4 select-none pb-16">
      {/* Top Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-base sm:text-lg text-slate-800">
              [F7] Gestión de Clientes y Créditos (Fiado)
            </h2>
            <p className="text-xs text-slate-500">
              Directorio de clientes, estados de cuenta, límite de crédito y abonos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenLoyaltyConfig && (
            <button
              onClick={onOpenLoyaltyConfig}
              className="w-full sm:w-auto px-3.5 py-2.5 sm:py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px]"
              title="Configurar Programa de Puntos / Recompensas"
            >
              <Award className="w-4 h-4 text-amber-100" />
              <span>Programa de Puntos</span>
            </button>
          )}
          <button
            onClick={handleOpenAddCustomer}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px]"
          >
            <Plus className="w-4 h-4" /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Grid Display: Left List / Right Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Left Customer List (1 Col) - Hidden on mobile if viewing details */}
        <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-3 ${selectedCustomer ? 'hidden md:block' : 'block'}`}>
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
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-500 shadow-xs'
                        : 'bg-white hover:bg-slate-50 active:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <span>{c.name}</span>
                          {c.isEmployee && (
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.2 rounded border border-emerald-300 flex items-center gap-0.5">
                              <BadgePercent className="w-2.5 h-2.5" />
                              {c.employeeDiscountPercentage || 10}%
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                          c.creditBalance > 0
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {formatCurrency(c.creditBalance)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{c.phone || 'Sin tel.'}</span>
                      </div>
                      {(c.loyaltyPoints ?? 0) > 0 && (
                        <div className="flex items-center gap-1 font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          <Award className="w-3 h-3 text-amber-600" />
                          <span>{c.loyaltyPoints} pts</span>
                        </div>
                      )}
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
          <div className="md:col-span-2 space-y-3 sm:space-y-4">
            {/* Mobile Back Button */}
            <div className="md:hidden">
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="w-full py-2 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-indigo-600 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer min-h-[38px]"
              >
                <span>← Volver al listado de clientes</span>
              </button>
            </div>

            {/* Customer Info Box */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 sm:p-4 space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900">{selectedCustomer.name}</h3>
                    {selectedCustomer.isEmployee && (
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1">
                        <BadgePercent className="w-3.5 h-3.5" />
                        {selectedCustomer.employeeDiscountPercentage || 10}% Descuento Empleado
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-slate-500 mt-1">
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

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleOpenEditCustomer(selectedCustomer)}
                    className="flex-1 sm:flex-none px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer min-h-[36px]"
                    title="Editar datos del cliente"
                  >
                    <Edit className="w-3.5 h-3.5 text-indigo-600" /> Editar
                  </button>

                  <button
                    onClick={() => handleDeleteCustomer(selectedCustomer)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200 cursor-pointer min-h-[36px]"
                    title="Eliminar cliente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setShowPaymentModal(true)}
                    disabled={selectedCustomer.creditBalance <= 0}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px]"
                  >
                    <DollarSign className="w-4 h-4" /> ABONAR A CRÉDITO
                  </button>
                </div>
              </div>

              {/* Credit & Loyalty Status Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Límite Crédito
                  </span>
                  <span className="text-base font-black text-slate-800">
                    {formatCurrency(selectedCustomer.creditLimit)}
                  </span>
                </div>

                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">
                    Deuda Actual
                  </span>
                  <span className="text-base font-black text-rose-600">
                    {formatCurrency(selectedCustomer.creditBalance)}
                  </span>
                </div>

                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                    Disponible
                  </span>
                  <span className="text-base font-black text-emerald-700">
                    {formatCurrency(roundCurrency(selectedCustomer.creditLimit - selectedCustomer.creditBalance))}
                  </span>
                </div>

                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                      Puntos Recompensa
                    </span>
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-black text-amber-800">
                      {selectedCustomer.loyaltyPoints ?? 0}
                    </span>
                    <span className="text-[10px] text-amber-600 font-bold">pts</span>
                  </div>
                  {loyaltyConfig?.enabled && (
                    <div className="text-[10px] text-amber-700 font-mono mt-0.5">
                      ≈ {formatCurrency((selectedCustomer.loyaltyPoints ?? 0) * (loyaltyConfig.pointValueInCurrency || 0.1))} en desc.
                    </div>
                  )}
                </div>
              </div>

              {/* Fiscal Registration Information */}
              {selectedCustomer.taxId && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5 text-xs text-blue-950">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-blue-900 flex items-center gap-1.5 text-[11px]">
                      <FileText className="w-3.5 h-3.5 text-blue-600" /> RFC / CUIT: <strong className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-blue-950">{selectedCustomer.taxId}</strong>
                    </span>
                    {selectedCustomer.postalCode && (
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                        CP: {selectedCustomer.postalCode}
                      </span>
                    )}
                  </div>
                  {selectedCustomer.taxRegime && (
                    <div className="text-[11px] text-blue-800">
                      <strong>Régimen:</strong> {selectedCustomer.taxRegime}
                    </div>
                  )}
                  {selectedCustomer.cfdiUsage && (
                    <div className="text-[11px] text-blue-800">
                      <strong>Uso CFDI:</strong> {selectedCustomer.cfdiUsage}
                    </div>
                  )}
                  {selectedCustomer.fiscalAddress && (
                    <div className="text-[11px] text-blue-800">
                      <strong>Domicilio Fiscal:</strong> {selectedCustomer.fiscalAddress}
                    </div>
                  )}
                </div>
              )}

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
                          {new Date(m.date).toLocaleString('es-AR')}
                        </div>
                      </div>

                      <div
                        className={`font-black text-sm ${
                          m.type === 'CHARGE' ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {m.type === 'CHARGE' ? '+' : '-'}{formatCurrency(m.amount)}
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

              {/* Employee status and special discount */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isEmployee}
                    onChange={(e) => setIsEmployee(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                    <BadgePercent className="w-3.5 h-3.5 text-indigo-600" />
                    Es Empleado / Personal del Comercio
                  </span>
                </label>

                {isEmployee && (
                  <div className="pt-1 flex items-center gap-2">
                    <label className="font-bold text-slate-700 text-xs shrink-0">
                      % Descuento Automático en Ventas:
                    </label>
                    <div className="relative w-24">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={employeeDiscountPercentage}
                        onChange={(e) => setEmployeeDiscountPercentage(e.target.value)}
                        className="w-full p-1.5 bg-white border border-indigo-300 rounded-lg font-black text-indigo-900 text-xs pr-6"
                      />
                      <span className="absolute right-2 top-1.5 text-slate-500 font-bold text-xs">%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Fiscal Details (Facturación CFDI / Factura Fiscal) */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2.5">
                <div className="flex items-center gap-1.5 text-blue-900 font-extrabold text-xs">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Datos Fiscales para Facturación Electrónica</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-[11px]">RFC / CUIT / NIT:</label>
                    <input
                      type="text"
                      placeholder="ej. XAXX010101000"
                      value={newTaxId}
                      onChange={(e) => setNewTaxId(e.target.value)}
                      className="w-full p-2 bg-white border border-blue-300 rounded-lg font-mono font-bold text-slate-800 uppercase text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-[11px]">Código Postal Fiscal:</label>
                    <input
                      type="text"
                      placeholder="ej. 64000 / C1043"
                      value={newPostalCode}
                      onChange={(e) => setNewPostalCode(e.target.value)}
                      className="w-full p-2 bg-white border border-blue-300 rounded-lg font-semibold text-slate-800 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-[11px]">Régimen Fiscal:</label>
                    <select
                      value={newTaxRegime}
                      onChange={(e) => setNewTaxRegime(e.target.value)}
                      className="w-full p-2 bg-white border border-blue-300 rounded-lg font-medium text-slate-800 text-xs"
                    >
                      <option value="601 - General de Ley Personas Morales">601 - General de Ley Personas Morales</option>
                      <option value="605 - Sueldos y Salarios">605 - Sueldos y Salarios</option>
                      <option value="606 - Arrendamiento">606 - Arrendamiento</option>
                      <option value="612 - Personas Físicas con Actividades Empresariales">612 - Actividades Empresariales y Profesionales</option>
                      <option value="616 - Sin obligaciones fiscales">616 - Sin obligaciones fiscales</option>
                      <option value="621 - Incorporación Fiscal (RIF)">621 - Incorporación Fiscal (RIF)</option>
                      <option value="626 - Régimen Simplificado de Confianza (RESICO)">626 - Régimen Simplificado (RESICO)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-[11px]">Uso CFDI / Destino:</label>
                    <select
                      value={newCfdiUsage}
                      onChange={(e) => setNewCfdiUsage(e.target.value)}
                      className="w-full p-2 bg-white border border-blue-300 rounded-lg font-medium text-slate-800 text-xs"
                    >
                      <option value="G01 - Adquisición de mercancías">G01 - Adquisición de mercancías</option>
                      <option value="G02 - Devoluciones, descuentos o bonificaciones">G02 - Devoluciones o descuentos</option>
                      <option value="G03 - Gastos en general">G03 - Gastos en general</option>
                      <option value="I01 - Construcciones">I01 - Construcciones</option>
                      <option value="S01 - Sin efectos fiscales">S01 - Sin efectos fiscales</option>
                      <option value="CP01 - Pagos">CP01 - Pagos</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">Domicilio Fiscal Registrado:</label>
                  <input
                    type="text"
                    placeholder="ej. Av. Reforma #500, Piso 3, Cuauhtémoc"
                    value={newFiscalAddress}
                    onChange={(e) => setNewFiscalAddress(e.target.value)}
                    className="w-full p-2 bg-white border border-blue-300 rounded-lg font-medium text-slate-800 text-xs"
                  />
                </div>
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
