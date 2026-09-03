import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  Laptop,
  Share,
  PlusSquare,
  CheckCircle2,
  Sparkles,
  X,
  ShieldCheck,
  Zap,
  MonitorSmartphone,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

interface PWADownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWADownloadModal: React.FC<PWADownloadModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'android' | 'ios' | 'desktop'>('android');
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
    }

    // Auto-detect OS for initial tab
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setSelectedPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setSelectedPlatform('android');
    } else {
      setSelectedPlatform('desktop');
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallSuccess(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstallSuccess(true);
        setDeferredPrompt(null);
      }
    } else {
      // Direct to platform specific instructions
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-5 text-white flex items-center justify-between relative">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
              <MonitorSmartphone className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg sm:text-xl text-white">
                  Instalar Recreo PDV (App PWA)
                </h3>
                <span className="bg-emerald-500/30 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-400/40 uppercase tracking-wide">
                  PWA Nativa
                </span>
              </div>
              <p className="text-xs text-blue-100/80 mt-0.5">
                Usa el Punto de Venta como una aplicación nativa en tu teléfono, tablet o PC
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Quick Install Banner if Prompt is Available */}
          {deferredPrompt && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400/60 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800">
                    Instalación Rápida con 1 Clic
                  </h4>
                  <p className="text-xs text-slate-600">
                    Tu navegador es compatible con la instalación directa inmediata.
                  </p>
                </div>
              </div>
              <button
                onClick={handleInstallClick}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" /> Instalar Ahora
              </button>
            </div>
          )}

          {/* Already Installed Alert */}
          {isInstalled && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-3 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold">¡Recreo PDV ya está instalado en este dispositivo!</span> Puedes abrirlo directamente desde tu pantalla de inicio o escritorio.
              </div>
            </div>
          )}

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
              <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-xs text-slate-800">Pantalla Completa</h5>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                  Sin barras del navegador, mayor espacio para tickets y cobro.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
              <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-xs text-slate-800">Acceso Ultrarrápido</h5>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                  Abre la caja con un toque desde tu pantalla de inicio o escritorio.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
              <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-xs text-slate-800">Nube Sincronizada</h5>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                  Tus inventarios y cortes seguros en Firestore en tiempo real.
                </p>
              </div>
            </div>
          </div>

          {/* Platform Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
                Guía de Instalación por Dispositivo
              </h4>
              <span className="text-[11px] text-slate-400">Selecciona tu plataforma:</span>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setSelectedPlatform('android')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedPlatform === 'android'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-4 h-4" /> Android / Chrome
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlatform('ios')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedPlatform === 'ios'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-4 h-4" /> iPhone / iPad (Safari)
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlatform('desktop')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedPlatform === 'desktop'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Laptop className="w-4 h-4" /> PC / Mac / Chrome
              </button>
            </div>
          </div>

          {/* Platform Instructions Details */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            {selectedPlatform === 'android' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-xs border-b border-slate-200 pb-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Pasos para instalar en Celulares y Tablets Android:</span>
                </div>
                <ol className="space-y-2.5 text-xs text-slate-700 list-decimal list-inside">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Abre este sistema en el navegador <strong>Google Chrome</strong> o <strong>Edge</strong> en tu dispositivo Android.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Toca el menú de opciones (los <strong>tres puntos verticales ⋮</strong> en la esquina superior derecha).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Selecciona la opción <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      4
                    </span>
                    <span>
                      Confirma en <strong>"Instalar"</strong>. ¡Listo! El icono de Recreo PDV aparecerá en tu cajón de aplicaciones.
                    </span>
                  </li>
                </ol>
              </div>
            )}

            {selectedPlatform === 'ios' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-xs border-b border-slate-200 pb-2">
                  <Share className="w-4 h-4 text-blue-600" />
                  <span>Pasos para instalar en iPhone y iPad (Apple iOS):</span>
                </div>
                <ol className="space-y-2.5 text-xs text-slate-700 list-decimal list-inside">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Abre el enlace del sistema en el navegador <strong>Safari</strong> de tu iPhone o iPad.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Toca el botón <strong>Compartir</strong> (el ícono del cuadrado con una flecha hacia arriba <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> en la barra inferior).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Desliza hacia abajo en el menú y toca <strong>"Agregar a inicio"</strong> (<PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-slate-700" />).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      4
                    </span>
                    <span>
                      Toca <strong>"Agregar"</strong> en la esquina superior derecha. Se creará la app con icono nativo en tu pantalla de inicio.
                    </span>
                  </li>
                </ol>
              </div>
            )}

            {selectedPlatform === 'desktop' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-xs border-b border-slate-200 pb-2">
                  <Laptop className="w-4 h-4 text-indigo-600" />
                  <span>Pasos para instalar en Computadoras (Windows, Mac o Linux):</span>
                </div>
                <ol className="space-y-2.5 text-xs text-slate-700 list-decimal list-inside">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Abre el sistema en <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong> o <strong>Brave</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      En la barra de direcciones (a la derecha de la URL), haz clic en el ícono de instalación <strong>⊕</strong> o <strong>"Instalar Recreo PDV"</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      O bien, haz clic en el menú del navegador (<strong>⋮</strong>) y selecciona <strong>"Instalar Recreo PDV..."</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      4
                    </span>
                    <span>
                      Haz clic en <strong>"Instalar"</strong>. Se abrirá en una ventana independiente sin barras de navegador y con acceso directo en tu Escritorio.
                    </span>
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 text-center sm:text-left flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span>Compatible con Progressive Web App (PWA) y sincronización Firestore</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {deferredPrompt && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Instalar 1-Clic
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Entendido / Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
