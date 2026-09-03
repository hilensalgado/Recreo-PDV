import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/store';
import { verifyToken, TokenPayload } from './server/auth';
import { CashierPermissions } from './src/types/pos';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Global Session Authentication Middleware
  app.use((req: any, _res, next) => {
    const authHeader = req.headers.authorization;
    const tokenHeader = req.headers['x-session-token'];
    let token: string | undefined;

    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (tokenHeader && typeof tokenHeader === 'string') {
      token = tokenHeader.trim();
    }

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        req.user = payload;
      }
    }
    next();
  });

  // Guard Middlewares for Backend Access Control
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado. Se requiere una sesión válida con token de seguridad.',
        code: 'UNAUTHORIZED',
      });
    }
    next();
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado. Inicia sesión para realizar esta operación.',
        code: 'UNAUTHORIZED',
      });
    }
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Acceso denegado: Esta operación requiere privilegios de Administrador.',
        code: 'FORBIDDEN_ROLE',
      });
    }
    next();
  };

  const requirePermission = (permKey: keyof CashierPermissions) => {
    return (req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'No autenticado. Inicia sesión para realizar esta operación.',
          code: 'UNAUTHORIZED',
        });
      }
      if (req.user.role === 'ADMIN') {
        return next();
      }
      const hasPerm = req.user.permissions && req.user.permissions[permKey] === true;
      if (!hasPerm) {
        return res.status(403).json({
          error: `Acceso denegado: El usuario "${req.user.cashierName}" no cuenta con el permiso requerido (${permKey}).`,
          code: 'FORBIDDEN_PERMISSION',
          permission: permKey,
        });
      }
      next();
    };
  };

  // Initialize Firebase sync asynchronously in background so server binds port 3000 immediately
  db.init().catch((err) => {
    console.error('[Store] Error durante la inicialización de Firebase/Store:', err);
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Real-time Immediate Synchronization Stream (SSE)
  app.get('/api/sync/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send initial connected confirmation
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

    // Subscribe to immediate backend DB events
    const unsubscribe = db.onEvent((event) => {
      try {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (err) {
        console.warn('[SSE] Error enviando evento a cliente:', err);
      }
    });

    // Keep-alive ping every 20s
    const pingInterval = setInterval(() => {
      try {
        res.write(`: ping\n\n`);
      } catch (err) {
        clearInterval(pingInterval);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(pingInterval);
      unsubscribe();
      res.end();
    });
  });

  // Fast Full Bootstrap Payload (Single network roundtrip for all initial entities)
  app.get('/api/bootstrap', async (req, res) => {
    try {
      if (!db.isInitialized) {
        await db.init();
      }
      const data = db.getBootstrapData();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
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

  app.post('/api/products', requirePermission('allowInventoryEdit'), (req, res) => {
    try {
      const product = db.saveProduct(req.body);
      res.json(product);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/products/import', requirePermission('allowInventoryEdit'), (req, res) => {
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

  app.delete('/api/products/:id', requirePermission('allowInventoryEdit'), (req, res) => {
    try {
      db.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/products/adjust-stock', requirePermission('allowInventoryEdit'), (req, res) => {
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

  // Promotions
  app.get('/api/promotions', (req, res) => {
    try {
      res.json(db.getPromotions());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/promotions', requireAdmin, (req, res) => {
    try {
      const promo = db.savePromotion(req.body);
      res.json(promo);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/promotions/:id', requireAdmin, (req, res) => {
    try {
      const success = db.deletePromotion(req.params.id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/promotions/:id/toggle', requireAdmin, (req, res) => {
    try {
      const updated = db.togglePromotionStatus(req.params.id);
      if (!updated) {
        return res.status(404).json({ error: 'Promoción no encontrada' });
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

  app.post('/api/departments', requireAdmin, (req, res) => {
    try {
      const dept = db.saveDepartment(req.body);
      res.json(dept);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/departments/:id', requireAdmin, (req, res) => {
    try {
      db.deleteDepartment(req.params.id);
      res.json({ success: true });
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

  app.post('/api/registers', requireAdmin, (req, res) => {
    try {
      const reg = db.saveRegister(req.body);
      res.json(reg);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/registers/:id', requireAdmin, (req, res) => {
    try {
      db.deleteRegister(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/registers/:id/force-close', requireAdmin, (req, res) => {
    try {
      const shift = db.forceCloseRegisterShift(req.params.id);
      res.json({ success: true, shift });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Shifts & Device Concurrency Sessions
  app.get('/api/shifts', (req, res) => {
    try {
      res.json(db.getShifts());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/shifts/open', (req, res) => {
    try {
      const { registerId, cashierId, initialCash, deviceId } = req.body;
      const shift = db.openShift(registerId, cashierId, initialCash, deviceId);
      res.json(shift);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/shifts/close', (req, res) => {
    try {
      const { shiftId, declaredCash, notes, deviceId } = req.body;
      const shift = db.closeShift(shiftId, declaredCash, notes, deviceId);
      res.json(shift);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/shifts/:id', requireAdmin, async (req, res) => {
    try {
      const result = await db.deleteShift(req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/shifts/batch-delete', requireAdmin, async (req, res) => {
    try {
      const { shiftIds } = req.body;
      if (!Array.isArray(shiftIds) || shiftIds.length === 0) {
        return res.status(400).json({ error: 'Se requiere una lista de IDs de turnos a eliminar' });
      }
      const result = await db.deleteShiftsBatch(shiftIds);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Concurrency Lock Endpoints
  app.post('/api/sessions/cashier/claim', (req, res) => {
    try {
      const { cashierId, deviceId, registerId, force } = req.body;
      const cashier = db.verifyAndClaimCashier(cashierId, deviceId, registerId, Boolean(force));
      res.json(cashier);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/sessions/cashier/release', (req, res) => {
    try {
      const { cashierId, deviceId, force } = req.body;
      db.releaseCashierSession(cashierId, deviceId, Boolean(force));
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/sessions/register/claim', (req, res) => {
    try {
      const { registerId, deviceId, cashierId, force } = req.body;
      const register = db.verifyAndClaimRegister(registerId, deviceId, cashierId, Boolean(force));
      res.json(register);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/sessions/register/release', (req, res) => {
    try {
      const { registerId, deviceId, force } = req.body;
      db.releaseRegisterSession(registerId, deviceId, Boolean(force));
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/sessions/heartbeat', (req, res) => {
    try {
      const { deviceId, cashierId, registerId } = req.body;
      const result = db.heartbeat(deviceId, cashierId, registerId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sessions/force-unlock', requireAdmin, (req, res) => {
    try {
      const { type, id } = req.body;
      const result = db.forceUnlockSession(type, id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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

  app.post('/api/cash-movements', requirePermission('allowCashMovements'), (req, res) => {
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

  app.delete('/api/customers/:id', async (req, res) => {
    try {
      await db.deleteCustomer(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      if (err.message && err.message.includes('saldo adeudado')) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: err.message || 'Error al eliminar cliente' });
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

  app.post('/api/sales/:id/cancel', requirePermission('allowDeleteSales'), (req, res) => {
    try {
      const sale = db.cancelSale(req.params.id, req.body.cashierName || 'Admin');
      if (!sale) return res.status(400).json({ error: 'No se pudo cancelar la venta' });
      res.json(sale);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/sales/:id', requirePermission('allowDeleteSales'), (req, res) => {
    try {
      const restoreStock = req.query.restoreStock !== 'false' && req.body?.restoreStock !== false;
      const success = db.deleteSale(req.params.id, restoreStock);
      if (!success) return res.status(404).json({ error: 'Venta no encontrada' });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Returns / Devoluciones
  app.get('/api/returns', (req, res) => {
    try {
      res.json(db.getReturns());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/returns', (req, res) => {
    try {
      const returnRecord = db.processReturn(req.body);
      res.json(returnRecord);
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

  // Auth & Email / User / PIN / Register Verification
  app.post('/api/auth/verify-email', (req, res) => {
    try {
      const { email, pin, registerId, deviceId, force } = req.body;
      const result = db.verifyUserAuth({ identifier: email, pin, registerId, deviceId, force: Boolean(force) });
      if (!result.authorized) {
        return res.status(403).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/auth/verify-user', (req, res) => {
    try {
      const { cashierId, identifier, pin, registerId, deviceId, force } = req.body;
      const result = db.verifyUserAuth({ cashierId, identifier, pin, registerId, deviceId, force: Boolean(force) });
      if (!result.authorized) {
        return res.status(403).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/auth/verify-pin', (req, res) => {
    try {
      const { cashierId, pin } = req.body;
      const result = db.verifyCashierPin(cashierId, pin);
      if (!result.authorized) {
        return res.status(401).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ authorized: false, error: err.message });
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

  app.post('/api/cashiers', requireAdmin, (req, res) => {
    try {
      const cashier = db.saveCashier(req.body);
      res.json(cashier);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/cashiers/:id', requireAdmin, (req, res) => {
    try {
      db.deleteCashier(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Employee Discounts & Linked Accounts
  app.get('/api/employees/discount-config', (req, res) => {
    try {
      res.json(db.getEmployeeDiscountConfig());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/employees/discount-config', requireAdmin, (req, res) => {
    try {
      const config = db.saveEmployeeDiscountConfig(req.body);
      res.json(config);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/employees/sync-customers', async (req, res) => {
    try {
      const result = await db.syncEmployeeCustomers();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/employees/:cashierId/discount', (req, res) => {
    try {
      const { discountPercentage } = req.body;
      const cashier = db.updateCashierEmployeeDiscount(req.params.cashierId, Number(discountPercentage));
      if (!cashier) return res.status(404).json({ error: 'Cajero no encontrado' });
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
  app.get('/api/stats/summary', requirePermission('allowReports'), (req, res) => {
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

  app.post('/api/shortcuts', requirePermission('allowConfigEdit'), (req, res) => {
    try {
      const config = db.saveShortcutsConfig(req.body.shortcuts || req.body);
      res.json(config);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // Suppliers & Purchases API Endpoints (Feature 1)
  // ==========================================
  app.get('/api/suppliers', (req, res) => {
    try {
      res.json(db.getSuppliers());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/suppliers', (req, res) => {
    try {
      const supplier = db.saveSupplier(req.body);
      res.json(supplier);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/suppliers/:id', (req, res) => {
    try {
      db.deleteSupplier(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/purchases', (req, res) => {
    try {
      res.json(db.getPurchases());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/purchases', (req, res) => {
    try {
      const purchase = db.createPurchase(req.body);
      res.json(purchase);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/suppliers/payments', (req, res) => {
    try {
      res.json(db.getSupplierPayments());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/suppliers/payments', (req, res) => {
    try {
      const payment = db.addSupplierPayment(req.body);
      res.json(payment);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Fiscal Invoices & Tax Configuration
  app.get('/api/fiscal/invoices', (req, res) => {
    try {
      res.json(db.getFiscalInvoices());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/fiscal/invoices', async (req, res) => {
    try {
      const invoice = await db.emitFiscalInvoice(req.body);
      res.json(invoice);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/fiscal/invoices/:id/cancel', async (req, res) => {
    try {
      const invoice = await db.cancelFiscalInvoice(req.params.id, req.body.reason);
      res.json(invoice);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/fiscal/config', (req, res) => {
    try {
      res.json(db.getStoreFiscalConfig());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/fiscal/config', requireAdmin, async (req, res) => {
    try {
      const config = await db.saveStoreFiscalConfig(req.body);
      res.json(config);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Audit Logs (Registro de Auditoría de Movimientos)
  app.get('/api/audit-logs', requireAdmin, (req, res) => {
    try {
      res.json(db.getAuditLogs());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/audit-logs', (req, res) => {
    try {
      const log = db.logAudit(req.body);
      res.json(log);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // Batches / Lotes y Fechas de Vencimiento
  // ==========================================
  app.get('/api/batches', (req, res) => {
    try {
      res.json(db.getProductBatches());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/batches', requirePermission('allowInventoryEdit'), (req, res) => {
    try {
      const batch = db.saveProductBatch(req.body);
      res.json(batch);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/batches/:id', requirePermission('allowInventoryEdit'), (req, res) => {
    try {
      const success = db.deleteProductBatch(req.params.id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/batches/:id/discard', requirePermission('allowInventoryEdit'), (req, res) => {
    try {
      const { reason, userName } = req.body;
      const batch = db.discardProductBatch(req.params.id, reason, userName);
      if (!batch) return res.status(404).json({ error: 'Lote no encontrado' });
      res.json(batch);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // Warehouses / Múltiples Depósitos y Sucursales
  // ==========================================
  app.get('/api/warehouses', (req, res) => {
    try {
      res.json(db.getWarehouses());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/warehouses', (req, res) => {
    try {
      const wh = db.saveWarehouse(req.body);
      res.json(wh);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/warehouses/:id', (req, res) => {
    try {
      const success = db.deleteWarehouse(req.params.id);
      res.json({ success });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Stock Transfers
  app.get('/api/stock-transfers', (req, res) => {
    try {
      res.json(db.getStockTransfers());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/stock-transfers', (req, res) => {
    try {
      const transfer = db.createStockTransfer(req.body);
      res.json(transfer);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // Loyalty / Programa de Puntos y Recompensas
  // ==========================================
  app.get('/api/loyalty/config', (req, res) => {
    try {
      res.json(db.getLoyaltyConfig());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/loyalty/config', (req, res) => {
    try {
      const config = db.updateLoyaltyConfig(req.body);
      res.json(config);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/loyalty/movements', (req, res) => {
    try {
      const customerId = req.query.customerId as string | undefined;
      res.json(db.getCustomerPointsMovements(customerId));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/customers/:id/adjust-points', (req, res) => {
    try {
      const customer = db.adjustCustomerPoints(req.params.id, req.body);
      res.json(customer);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Reset Seed / Clean Database
  app.post('/api/seed/reset', async (req, res) => {
    try {
      await db.resetSeed();
      res.json({ success: true, message: 'Base de datos restaurada y limpia' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Purge Test / Sample Data
  app.post('/api/purge-test-data', async (req, res) => {
    try {
      const result = await db.purgeTestData();
      res.json({ success: true, message: 'Datos de prueba eliminados exitosamente', result });
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
