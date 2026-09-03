/**
 * Utility functions for exporting data to CSV format compatible with Microsoft Excel.
 */

export function downloadCSV(filename: string, csvContent: string) {
  // \uFEFF is the UTF-8 Byte Order Mark (BOM) to ensure Excel opens accents/Ñ correctly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportInventoryCSV(products: any[]) {
  const headers = [
    'Codigo',
    'Descripcion',
    'Precio Costo',
    'Precio Venta',
    'Precio Mayoreo',
    'Inventario',
    'Inv. Minimo',
    'Departamento',
  ];

  const rows = products.map((p) => [
    `"${p.barcode || ''}"`,
    `"${(p.name || '').replace(/"/g, '""')}"`,
    p.costPrice || 0,
    p.salePrice || 0,
    p.wholesalePrice || 0,
    p.stock || 0,
    p.minStock || 0,
    `"${p.departmentName || 'General'}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`inventario_recreo_pdv_${dateStr}.csv`, csvContent);
}

export function exportSalesCSV(sales: any[]) {
  const headers = [
    'Ticket #',
    'Fecha y Hora',
    'Caja',
    'Cajero',
    'Cliente',
    'Método Pago',
    'Subtotal',
    'Descuento',
    'Total',
    'Estado',
  ];

  const rows = sales.map((s) => [
    s.ticketNumber,
    `"${new Date(s.timestamp).toLocaleString('es-AR')}"`,
    `"${s.registerName || ''}"`,
    `"${s.cashierName || ''}"`,
    `"${s.customerName || 'Público General'}"`,
    `"${s.paymentMethod || ''}"`,
    s.subtotal || s.total,
    s.discount || 0,
    s.total || 0,
    `"${s.status || 'COMPLETED'}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`reporte_ventas_${dateStr}.csv`, csvContent);
}

export function exportPurchaseListCSV(
  items: Array<{
    barcode: string;
    name: string;
    departmentName?: string;
    stock: number;
    minStock: number;
    unit?: string;
    costPrice: number;
    suggestedQty: number;
  }>
) {
  const headers = [
    'Codigo',
    'Producto',
    'Departamento',
    'Stock Actual',
    'Stock Minimo',
    'Unidad',
    'Cantidad a Pedir',
    'Precio Costo Unitario',
    'Total Estimado Costo',
  ];

  const rows = items.map((p) => {
    const qty = p.suggestedQty ?? Math.max(1, (p.minStock || 5) * 2 - (p.stock || 0));
    const unitCost = p.costPrice || 0;
    const totalEst = qty * unitCost;

    return [
      `"${p.barcode || ''}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.departmentName || 'General'}"`,
      p.stock ?? 0,
      p.minStock ?? 0,
      `"${p.unit === 'kg' ? 'kg' : 'pzs'}"`,
      qty,
      unitCost.toFixed(2),
      totalEst.toFixed(2),
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`lista_de_compras_recreo_${dateStr}.csv`, csvContent);
}
