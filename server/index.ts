/**
 * Main Backend Server for Tunisian Accounting Application.
 * Express REST API & RPC handlers.
 * 
 * STRICT COMPLIANCE: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRouter from './routes/auth.router.js';
import partiesRouter from './routes/parties.router.js';
import invoicesRouter from './routes/invoices.router.js';
import accountingRouter from './routes/accounting.router.js';
import fiscalRouter from './routes/fiscal.router.js';
import archiveRouter from './routes/archive.router.js';
import payrollRouter from './routes/payroll.router.js';
import assetsRouter from './routes/assets.router.js';
import reconciliationRouter from './routes/reconciliation.router.js';
import taxPackageRouter from './routes/taxPackage.router.js';
import closingRouter from './routes/closing.router.js';
import adminRouter from './routes/admin.router.js';

function getDirectory(): string {
  try {
    if (typeof __dirname !== 'undefined' && __dirname) return __dirname;
  } catch {}
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {}
  return process.cwd();
}

const currentDir = getDirectory();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Tunisian Accounting API (SCE Loi 96-112)', timestamp: new Date().toISOString() });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/parties', partiesRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/accounting', accountingRouter);
app.use('/api/fiscal', fiscalRouter);
app.use('/api/archive', archiveRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/reconciliation', reconciliationRouter);
app.use('/api/tax-package', taxPackageRouter);
app.use('/api/closing', closingRouter);
app.use('/api/admin', adminRouter);

// Serve static frontend files if built
const distPath = path.join(currentDir, '../dist');
app.use(express.static(distPath));

// For SPA routing in production
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api')) {
    next();
    return;
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // In dev mode, frontend is served by Vite on port 5173
      res.status(200).send('Tunisian Accounting API running. Frontend dev server is at http://localhost:5173');
    }
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  TUNISIAN ACCOUNTING BACKEND SERVER READY (TypeScript)`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});

