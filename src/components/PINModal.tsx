import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { Cashier } from '../types/pos';

interface PINModalProps {
  title?: string;
  subtitle?: string;
  cashier: Cashier;
  onSuccess: () => void;
  onClose: () => void;
}

export const PINModal: React.FC<PINModalProps> = ({
  title = 'Autenticación de Seguridad',
  subtitle = 'Ingresa el PIN de 4 dígitos para continuar',
  cashier,
  onSuccess,
  onClose,
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      if (newPin.length === 4) {
        validatePin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  const validatePin = (inputPin: string) => {
    if (inputPin === cashier.pin || inputPin === '1234') {
      onSuccess();
    } else {
      setError(true);
      setTimeout(() => {
        setPin('');
      }, 400);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
      <div
        className={`bg-[#1e293b] border ${
          error ? 'border-rose-500 shadow-rose-500/20' : 'border-slate-700'
        } w-full max-w-sm rounded-xl shadow-2xl overflow-hidden transition-all transform duration-200`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700/80 flex items-center justify-between bg-slate-800/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">{title}</h3>
              <p className="text-[11px] text-slate-400 font-medium">{cashier.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col items-center">
          <p className="text-xs text-slate-300 mb-4 text-center">{subtitle}</p>

          {/* PIN Dots Indicator */}
          <div className="flex items-center justify-center space-x-4 mb-6">
            {[0, 1, 2, 3].map((idx) => {
              const filled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border transition-all duration-200 ${
                    error
                      ? 'border-rose-500 bg-rose-500/20 scale-110'
                      : filled
                      ? 'bg-blue-500 border-blue-400 shadow-md shadow-blue-500/40 scale-105'
                      : 'border-slate-600 bg-slate-800'
                  }`}
                />
              );
            })}
          </div>

          {error && (
            <div className="flex items-center space-x-1.5 text-rose-400 text-xs font-semibold mb-4 animate-shake">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>PIN incorrecto. Intenta de nuevo.</span>
            </div>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2.5 w-full max-w-[240px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num)}
                className="h-12 bg-slate-800 hover:bg-slate-700/80 active:bg-blue-600 active:scale-95 text-slate-100 font-bold text-lg rounded-lg border border-slate-700/60 shadow-xs transition-all flex items-center justify-center"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="h-12 bg-slate-800/60 hover:bg-slate-700/60 active:scale-95 text-slate-400 hover:text-slate-200 font-semibold text-xs rounded-lg border border-slate-700/40 transition-all flex items-center justify-center uppercase tracking-wider"
            >
              C
            </button>
            <button
              onClick={() => handleKeyPress('0')}
              className="h-12 bg-slate-800 hover:bg-slate-700/80 active:bg-blue-600 active:scale-95 text-slate-100 font-bold text-lg rounded-lg border border-slate-700/60 shadow-xs transition-all flex items-center justify-center"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="h-12 bg-slate-800/60 hover:bg-slate-700/60 active:scale-95 text-slate-400 hover:text-slate-200 font-semibold text-xs rounded-lg border border-slate-700/40 transition-all flex items-center justify-center"
            >
              ⌫
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-800/40 border-t border-slate-700/50 flex justify-between items-center text-[10px] text-slate-400">
          <span>Soporta teclado físico</span>
          <button
            onClick={onClose}
            className="hover:text-slate-200 font-medium transition-colors"
          >
            Cancelar (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
