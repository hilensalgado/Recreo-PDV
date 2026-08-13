import React, { useState } from 'react';
import { Keyboard, X, Settings, RotateCcw, Save, Check, Edit2, ShieldAlert } from 'lucide-react';
import { KeyboardShortcutConfig } from '../types/pos';

interface ShortcutsHelpModalProps {
  shortcutsConfig: KeyboardShortcutConfig[];
  isAdmin?: boolean;
  onSaveShortcuts: (newConfig: KeyboardShortcutConfig[]) => Promise<void>;
  onClose: () => void;
}

const DEFAULT_SHORTCUTS: KeyboardShortcutConfig[] = [
  { id: 'sales', actionName: 'Ventas', defaultKey: 'F1', currentKey: 'F1', description: 'Ir a la pantalla principal de Ventas' },
  { id: 'common', actionName: 'Prod. Comunes', defaultKey: 'F2', currentKey: 'F2', description: 'Ver catálogo de Productos Comunes / Sin Código' },
  { id: 'movements', actionName: 'Entradas/Salidas', defaultKey: 'F3', currentKey: 'F3', description: 'Registrar Entrada o Salida de Dinero en Caja' },
  { id: 'hold', actionName: 'En Espera', defaultKey: 'F6', currentKey: 'F6', description: 'Poner Ticket actual en Espera / Ver Guardados' },
  { id: 'customers', actionName: 'Clientes / Crédito', defaultKey: 'F7', currentKey: 'F7', description: 'Directorio de Clientes, Créditos y Fiado' },
  { id: 'inventory', actionName: 'Inventario', defaultKey: 'F8', currentKey: 'F8', description: 'Catálogo de Productos e Inventario (Solo Admin)' },
  { id: 'search', actionName: 'Buscador Rápido', defaultKey: 'F10', currentKey: 'F10', description: 'Enfocar buscador de producto / Código de barras' },
  { id: 'history', actionName: 'Ventas Realizadas', defaultKey: 'F11', currentKey: 'F11', description: 'Historial de Ventas Realizadas y Re-impresión' },
  { id: 'cashcut', actionName: 'Corte de Caja', defaultKey: 'F12', currentKey: 'F12', description: 'Módulo de Cobro Rápido / Arqueo y Corte de Caja' },
];

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({
  shortcutsConfig = [],
  isAdmin = false,
  onSaveShortcuts,
  onClose,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  // Local editable draft state initialized from props or fallback default
  const activeList = shortcutsConfig.length > 0 ? shortcutsConfig : DEFAULT_SHORTCUTS;
  const [editList, setEditList] = useState<KeyboardShortcutConfig[]>(activeList);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleKeyChange = (id: string, newKey: string) => {
    setEditList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, currentKey: newKey.toUpperCase().trim() } : item))
    );
  };

  const handleDescChange = (id: string, newDesc: string) => {
    setEditList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, description: newDesc } : item))
    );
  };

  const handleResetDefault = () => {
    if (confirm('¿Deseas restaurar todas las teclas de función rápidas a sus valores predeterminados (F1 - F12)?')) {
      setEditList(DEFAULT_SHORTCUTS);
    }
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveShortcuts(editList);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        setIsEditing(false);
      }, 1000);
    } catch (err) {
      alert('Error al guardar la configuración de teclas');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1e293b] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white leading-none">
                Referencia de Teclas Rápidas (Recreo PDV)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isEditing ? 'Personaliza la asignación de teclas a tu preferencia' : 'Atajos de teclado para una operación ultrarrápida'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border ${
                isEditing
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Configurar y editar asignación de teclas"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Ver Lista' : 'Editar Teclas'}</span>
            </button>

            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {savedSuccess && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>¡Preferencias de teclas guardadas con éxito!</span>
            </div>
          )}

          {!isEditing ? (
            /* VIEW MODE */
            <div className="space-y-2 text-xs">
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                {activeList.map((s) => (
                  <div key={s.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <span className="bg-slate-900 text-amber-400 border border-slate-800 font-mono font-black px-2.5 py-1 rounded-md text-xs shadow-2xs">
                      [{s.currentKey || s.defaultKey}]
                    </span>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-800 block text-xs">{s.actionName}</span>
                      <span className="text-[11px] text-slate-500 font-medium">{s.description}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                <span>¿Deseas modificar estas teclas?</span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Settings className="w-3.5 h-3.5" /> Personalizar Asignación
                </button>
              </div>
            </div>
          ) : (
            /* EDIT MODE FORM */
            <form onSubmit={handleSaveSubmit} className="space-y-3 text-xs">
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-900 font-medium">
                <span>Ingresa la tecla o combinación de teclas preferida para cada acción:</span>
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="px-2 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded font-bold text-amber-800 flex items-center gap-1 shrink-0"
                  title="Restaurar F1 - F12 por defecto"
                >
                  <RotateCcw className="w-3 h-3" /> Restaurar Predeterminados
                </button>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {editList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        {item.actionName}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Tecla:</span>
                        <input
                          type="text"
                          required
                          value={item.currentKey}
                          onChange={(e) => handleKeyChange(item.id, e.target.value)}
                          placeholder="ej. F1"
                          className="w-20 p-1.5 bg-white border border-slate-300 rounded text-center font-mono font-black text-xs text-blue-700 uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                        />
                      </div>
                    </div>

                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleDescChange(item.id, e.target.value)}
                      placeholder="Descripción de la función"
                      className="w-full p-2 bg-white border border-slate-200 rounded text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-400"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-2 flex gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Guardando...' : 'Guardar Preferencias'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-[10px] text-slate-500 font-semibold">
            Las teclas de función te permiten operar sin ratón / mouse
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
          >
            Cerrar (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
