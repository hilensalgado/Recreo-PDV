import React from 'react';
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
  Lock,
} from 'lucide-react';

export type TabType =
  | 'sales'
  | 'common'
  | 'movements'
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
  onSelectTab: (tab: TabType) => void;
  holdTicketsCount: number;
  lowStockCount: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  isAdmin = false,
  onSelectTab,
  holdTicketsCount,
  lowStockCount,
}) => {
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
    ...(isAdmin
      ? [
          {
            id: 'inventory' as TabType,
            keyLabel: 'F8',
            title: 'Inventario',
            icon: Package,
            color: 'text-emerald-600',
            badge: lowStockCount > 0 ? `! ${lowStockCount}` : undefined,
            badgeColor: 'bg-rose-500 text-white',
          },
        ]
      : []),
    {
      id: 'history' as TabType,
      keyLabel: 'F11',
      title: 'Ventas Realizadas',
      icon: Receipt,
      color: 'text-teal-600',
    },
    {
      id: 'cashcut' as TabType,
      keyLabel: 'F12',
      title: 'Corte de Caja',
      icon: DollarSign,
      color: 'text-emerald-700',
    },
    {
      id: 'analytics' as TabType,
      keyLabel: 'REP',
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

  return (
    <nav className="bg-[#e2e8f0] border-b border-slate-300 px-3 py-1.5 shadow-xs overflow-x-auto select-none">
      <div className="w-full flex items-center gap-1.5 min-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-sm font-bold text-xs transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#1e293b] text-white border border-[#1e293b] shadow-xs'
                  : 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-300 shadow-2xs'
              }`}
            >
              <span
                className={`text-[10px] font-black font-mono px-1.5 py-0.5 rounded-xs uppercase tracking-wider ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.keyLabel}
              </span>

              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : tab.color}`} />

              <span>{tab.title}</span>

              {tab.badge !== undefined && (
                <span
                  className={`ml-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
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
    </nav>
  );
};
