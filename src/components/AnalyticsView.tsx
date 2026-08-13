import React from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Store,
  Users,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { Sale, Product, CashRegister, Department, PosSummaryStats } from '../types/pos';

interface AnalyticsViewProps {
  sales: Sale[];
  products: Product[];
  registers: CashRegister[];
  departments: Department[];
  stats: PosSummaryStats | null;
}

const COLORS = ['#2563eb', '#0284c7', '#0d9488', '#059669', '#d97706', '#dc2626', '#7c3aed'];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  sales = [],
  products = [],
  registers = [],
  departments = [],
  stats = null,
}) => {
  const safeSales = sales || [];

  // Aggregate Sales by Department
  const deptSalesMap: Record<string, number> = {};
  for (const s of safeSales) {
    if (s.status !== 'COMPLETED') continue;
    for (const item of s.items || []) {
      const deptName = item.product?.departmentName || 'Abarrotes';
      deptSalesMap[deptName] = (deptSalesMap[deptName] || 0) + item.total;
    }
  }

  const deptData = Object.keys(deptSalesMap).map((key) => ({
    name: key,
    value: Number(deptSalesMap[key].toFixed(2)),
  }));

  // Aggregate Sales by Register
  const regSalesMap: Record<string, number> = {};
  for (const s of safeSales) {
    if (s.status !== 'COMPLETED') continue;
    const regName = s.registerName || 'Caja';
    regSalesMap[regName] = (regSalesMap[regName] || 0) + s.total;
  }

  const regData = Object.keys(regSalesMap).map((key) => ({
    name: key,
    total: Number(regSalesMap[key].toFixed(2)),
  }));

  // Top Products
  const prodQtyMap: Record<string, { name: string; qty: number; total: number }> = {};
  for (const s of safeSales) {
    if (s.status !== 'COMPLETED') continue;
    for (const item of s.items || []) {
      if (!prodQtyMap[item.productId]) {
        prodQtyMap[item.productId] = { name: item.product?.name || 'Producto', qty: 0, total: 0 };
      }
      prodQtyMap[item.productId].qty += item.quantity;
      prodQtyMap[item.productId].total += item.total;
    }
  }

  const topProducts = Object.values(prodQtyMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto p-3 space-y-4 select-none">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-slate-800">
              Reportes y Métricas del Negocio (Analytics)
            </h2>
            <p className="text-xs text-slate-500">
              Estadísticas en tiempo real de ventas por caja, departamento y ganancias
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Ventas Totales Hoy
            </span>
            <span className="text-xl font-black text-emerald-600">
              ${(stats?.todayTotalSales || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Ganancia Est. Hoy
            </span>
            <span className="text-xl font-black text-blue-600">
              ${(stats?.todayProfit || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Cajas Activas
            </span>
            <span className="text-xl font-black text-slate-800">
              {stats?.activeRegistersCount || 0} Cajas
            </span>
          </div>
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl">
            <Store className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Crédito Pendiente
            </span>
            <span className="text-xl font-black text-indigo-600">
              ${(stats?.totalCreditPending || 0).toFixed(2)}
            </span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Register Sales Bar Chart */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-extrabold text-sm text-slate-800">Ventas por Caja Registradora</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: any) => `$${value}`} />
                <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Sales Pie Chart */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-extrabold text-sm text-slate-800">Ventas por Departamento</h3>
          <div className="h-64 w-full">
            {deptData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sin ventas para desglosar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deptData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {deptData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => `$${val}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Top 5 Products Table */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="font-extrabold text-sm text-slate-800">Top 5 Productos Más Vendidos</h3>
        <div className="divide-y divide-slate-100">
          {topProducts.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">Sin datos de venta</div>
          ) : (
            topProducts.map((p, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-black text-slate-400 w-4">#{idx + 1}</span>
                  <span className="font-bold text-slate-800">{p.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-blue-600 block">{p.qty} unidades</span>
                  <span className="text-slate-400 font-semibold">${p.total.toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
