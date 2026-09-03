import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  Grid,
  ArrowDownUp,
  Clock,
  Users,
  Package,
  Receipt,
  DollarSign,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Tag,
} from 'lucide-react';
import { CashierPermissions } from '../types/pos';

export type TabType =
  | 'sales'
  | 'common'
  | 'movements'
  | 'promotions'
  | 'hold'
  | 'customers'
  | 'inventory'
  | 'history'
  | 'cashcut'
  | 'analytics'
  | 'settings';

interface NavigationTabsProps {
  activeTab: TabType;
  isAdmin?: boolean;
  permissions?: CashierPermissions;
  onSelectTab: (tab: TabType) => void;
  holdTicketsCount: number;
  lowStockCount: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  isAdmin = false,
  permissions,
  onSelectTab,
  holdTicketsCount,
  lowStockCount,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    checkScroll();

    const handleWheel = (e: WheelEvent) => {
      if (el.scrollWidth > el.clientWidth) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
          checkScroll();
        }
      }
    };

    el.addEventListener('scroll', checkScroll);
    el.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('resize', checkScroll);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      el.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const amount = direction === 'left' ? -220 : 220;
    scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkScroll, 250);
  };

  const tabs = [
    {
      id: 'sales' as TabType,
      keyLabel: 'F1',
      title: 'Ventas',
      icon: ShoppingCart,
      color: 'text-blue-600',
    },
    {
      id: 'common' as TabType,
      keyLabel: 'F2',
      title: 'Prod. Comunes',
      icon: Grid,
      color: 'text-purple-600',
    },
    {
      id: 'movements' as TabType,
      keyLabel: 'F3',
      title: 'Entradas/Salidas',
      icon: ArrowDownUp,
      color: 'text-amber-600',
    },
    {
      id: 'promotions' as TabType,
      keyLabel: 'F5',
      title: 'Promociones & Combos',
      icon: Tag,
      color: 'text-purple-600',
    },
    {
      id: 'hold' as TabType,
      keyLabel: 'F6',
      title: 'En Espera',
      icon: Clock,
      color: 'text-cyan-600',
      badge: holdTicketsCount > 0 ? holdTicketsCount : undefined,
    },
    {
      id: 'customers' as TabType,
      keyLabel: 'F7',
      title: 'Clientes / Crédito',
      icon: Users,
      color: 'text-indigo-600',
    },
    {
      id: 'inventory' as TabType,
      keyLabel: 'F8',
      title: 'Inventario',
      icon: Package,
      color: 'text-emerald-600',
      badge: lowStockCount > 0 ? `! ${lowStockCount}` : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'history' as TabType,
      keyLabel: 'F9',
      title: 'Ventas Realizadas',
      icon: Receipt,
      color: 'text-teal-600',
    },
    {
      id: 'cashcut' as TabType,
      keyLabel: 'F10',
      title: 'Corte de Caja',
      icon: DollarSign,
      color: 'text-emerald-700',
    },
    {
      id: 'analytics' as TabType,
      keyLabel: 'F11',
      title: 'Reportes',
      icon: BarChart3,
      color: 'text-blue-700',
    },
  ];

  // Only include Admin Settings tab if logged in user is Admin
  if (isAdmin) {
    tabs.push({
      id: 'settings' as TabType,
      keyLabel: 'CFG',
      title: 'Cajas & Cajeros',
      icon: Settings,
      color: 'text-[#2563eb]',
    });
  }

  // Permissions & Role Filtering
  const canViewReports = isAdmin || (permissions ? permissions.allowReports === true : true);
  const canViewMovements = isAdmin || (permissions ? permissions.allowCashMovements !== false : true);
  const canViewCommon = isAdmin || (permissions ? permissions.allowCommonProducts !== false : true);
  const canViewHold = isAdmin || (permissions ? permissions.allowHoldTickets !== false : true);

  const visibleTabs = tabs.filter((tab) => {
    if (tab.id === 'analytics' && !canViewReports) return false;
    if (tab.id === 'movements' && !canViewMovements) return false;
    if (tab.id === 'common' && !canViewCommon) return false;
    if (tab.id === 'hold' && !canViewHold) return false;
    return true;
  });

  return (
    <nav className="bg-[#e2e8f0] border-b border-slate-300 shadow-xs select-none relative flex items-center">
      {/* Scroll Left Button for Web */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          className="hidden md:flex absolute left-0 z-20 h-full px-1.5 items-center justify-center bg-gradient-to-r from-slate-300 via-slate-200 to-transparent hover:from-slate-400 text-slate-800 transition-colors cursor-pointer"
          title="Desplazar menú a la izquierda"
          aria-label="Desplazar a la izquierda"
        >
          <ChevronLeft className="w-4 h-4 bg-white/80 rounded-full shadow-xs" />
        </button>
      )}

      {/* Tabs Container with Visible Scrollbar */}
      <div
        ref={scrollContainerRef}
        className="w-full px-2 sm:px-3 pt-1.5 pb-2 overflow-x-auto custom-scrollbar touch-pan-x"
      >
        <div className="w-full flex items-center gap-1 sm:gap-1.5 min-w-max">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer min-h-[36px] ${
                  isActive
                    ? 'bg-[#1e293b] text-white border border-[#1e293b] shadow-xs'
                    : 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-300 shadow-2xs active:bg-slate-100'
                }`}
              >
                <span
                  className={`text-[9px] sm:text-[10px] font-black font-mono px-1.5 py-0.5 rounded-xs uppercase tracking-wider ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.keyLabel}
                </span>

                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isActive ? 'text-blue-400' : tab.color}`} />

                <span className="whitespace-nowrap">{tab.title}</span>

                {tab.badge !== undefined && (
                  <span
                    className={`ml-1 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                      tab.badgeColor || (isActive ? 'bg-amber-400 text-slate-950' : 'bg-blue-600 text-white')
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scroll Right Button for Web */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll('right')}
          className="hidden md:flex absolute right-0 z-20 h-full px-1.5 items-center justify-center bg-gradient-to-l from-slate-300 via-slate-200 to-transparent hover:from-slate-400 text-slate-800 transition-colors cursor-pointer"
          title="Desplazar menú a la derecha"
          aria-label="Desplazar a la derecha"
        >
          <ChevronRight className="w-4 h-4 bg-white/80 rounded-full shadow-xs" />
        </button>
      )}
    </nav>
  );
};

