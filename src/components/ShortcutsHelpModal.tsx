import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutsHelpModalProps {
  onClose: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ onClose }) => {
  const shortcuts = [
    { key: 'F1', desc: 'Ir a la pantalla principal de Ventas' },
    { key: 'F2', desc: 'Ver catálogo de Productos Comunes / Sin Código' },
    { key: 'F3', desc: 'Registrar Entrada o Salida de Dinero en Caja' },
    { key: 'F6', desc: 'Poner Ticket actual en Espera / Ver Tickets Guardados' },
    { key: 'F7', desc: 'Directorio de Clientes, Créditos y Venta a Fiado' },
    { key: 'F8', desc: 'Catálogo de Productos e Inventario' },
    { key: 'F10', desc: 'Enfocar buscador de producto / Código de barras' },
    { key: 'F11', desc: 'Historial de Ventas Realizadas y Re-impresión de Tickets' },
    { key: 'F12', desc: 'Módulo de Cobro Rápido / Arqueo y Corte de Caja' },
    { key: 'ESC', desc: 'Cerrar ventanas modales / Cancelar operación' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 max-w-md w-full overflow-hidden">
        <div className="bg-[#1e293b] text-white p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">Atajos de Teclado Rápido (Eleventa)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-2 text-xs">
          <div className="divide-y divide-slate-100 border border-slate-200 rounded">
            {shortcuts.map((s) => (
              <div key={s.key} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                <span className="bg-slate-100 border border-slate-300 text-slate-800 font-mono font-bold px-2 py-1 rounded text-xs">
                  [{s.key}]
                </span>
                <span className="font-semibold text-slate-700 text-right">{s.desc}</span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 text-center pt-2">
            Usa las teclas de función en tu teclado para una navegación ultrarrápida.
          </p>

          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded text-xs transition-colors mt-2"
          >
            Entendido (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
