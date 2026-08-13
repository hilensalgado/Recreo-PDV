import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/store';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Products
  app.get('/api/products', (req, res) => {
    try {
      const products = db.getProducts();
      res.json(products);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/products', (req, res) => {
    try {
      const product = db.saveProduct(req.body);
      res.json(product);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/products/import', (req, res) => {
    try {
      const items = req.body.items || req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Se requiere un arreglo de productos' });
      }
      const result = db.importProductsBatch(items);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/products/:id', (req, res) => {
    try {
      db.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/products/adjust-stock', (req, res) => {
    try {
      const { productId, delta, reason } = req.body;
      const updated = db.adjustStock(productId, Number(delta), reason || 'Ajuste de inventario');
      if (!updated) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Departments
  app.get('/api/departments', (req, res) => {
    try {
      res.json(db.getDepartments());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Cash Registers
  app.get('/api/registers', (req, res) => {
    try {
      res.json(db.getRegisters());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/registers', (req, res) => {
    try {
      const reg = db.saveRegister(req.body);
      res.json(reg);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/registers/:id', (req, res) => {
    try {
      db.deleteRegister(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Shifts
  app.get('/api/shifts', (req, res) => {
    try {
      res.json(db.getShifts());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/shifts/open', (req, res) => {
    try {
      const { registerId, cashierId, initialCash } = req.body;
      const shift = db.openShift(registerId, cashierId, initialCash);
      res.json(shift);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/shifts/close', (req, res) => {
    try {
      const { shiftId, declaredCash, notes } = req.body;
      const shift = db.closeShift(shiftId, declaredCash, notes);
      res.json(shift);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Cash Movements (Incomes/Expenses)
  app.get('/api/cash-movements', (req, res) => {
    try {
      res.json(db.getCashMovements());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/cash-movements', (req, res) => {
    try {
      const movement = db.addCashMovement(req.body);
      res.json(movement);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Customers & Credit
  app.get('/api/customers', (req, res) => {
    try {
      res.json(db.getCustomers());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/customers', (req, res) => {
    try {
      const customer = db.saveCustomer(req.body);
      res.json(customer);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/customers/:id', (req, res) => {
    try {
      db.deleteCustomer(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/customers/movements', (req, res) => {
    try {
      res.json(db.getCustomerMovements());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/customers/payment', (req, res) => {
    try {
      const { customerId, amount, cashierId, cashierName, registerId } = req.body;
      const movement = db.addCustomerPayment(customerId, Number(amount), cashierId, cashierName, registerId);
      if (!movement) return res.status(400).json({ error: 'No se pudo procesar el abono' });
      res.json(movement);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Sales
  app.get('/api/sales', (req, res) => {
    try {
      res.json(db.getSales());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sales', (req, res) => {
    try {
      const sale = db.createSale(req.body);
      res.json(sale);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/sales/:id/cancel', (req, res) => {
    try {
      const sale = db.cancelSale(req.params.id, req.body.cashierName || 'Admin');
      if (!sale) return res.status(400).json({ error: 'No se pudo cancelar la venta' });
      res.json(sale);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Hold Tickets
  app.get('/api/hold-tickets', (req, res) => {
    try {
      res.json(db.getHoldTickets());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/hold-tickets', (req, res) => {
    try {
      const ticket = db.saveHoldTicket(req.body);
      res.json(ticket);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/hold-tickets/:id', (req, res) => {
    try {
      db.deleteHoldTicket(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Cashiers
  app.get('/api/cashiers', (req, res) => {
    try {
      res.json(db.getCashiers());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/cashiers', (req, res) => {
    try {
      const cashier = db.saveCashier(req.body);
      res.json(cashier);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Common Products
  app.get('/api/common-products', (req, res) => {
    try {
      res.json(db.getCommonProducts());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/common-products', (req, res) => {
    try {
      const cp = db.saveCommonProduct(req.body);
      res.json(cp);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/common-products/:id', (req, res) => {
    try {
      db.deleteCommonProduct(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Summary Stats
  app.get('/api/stats/summary', (req, res) => {
    try {
      res.json(db.getSummaryStats());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Shortcuts Config
  app.get('/api/shortcuts', (req, res) => {
    try {
      res.json(db.getShortcutsConfig());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/shortcuts', (req, res) => {
    try {
      const config = db.saveShortcutsConfig(req.body.shortcuts || req.body);
      res.json(config);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Reset Seed
  app.post('/api/seed/reset', (req, res) => {
    try {
      db.resetSeed();
      res.json({ success: true, message: 'Base de datos restaurada' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Recreo PDV Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
