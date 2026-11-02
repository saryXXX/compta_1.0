/**
 * Tax Package Router: Liasse Fiscale & Passage Résultat Comptable au Fiscal.
 * 
 * STRICT COMPLIANCE: ZERO TYPE NULL.
 */

import { Router, Response } from 'express';
import { prisma, softDeleteRecord } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';
import { requireAccountantOrSuperAdmin } from '../rbac.js';
import { computeFinancialStatements } from '../services/accountingEngine.js';
import {
  TunisianTaxReconciliationEngine,
  FiscalAdjustmentItem,
} from '../services/taxReconciliationEngine.js';

const router = Router();

router.use(requireAuth);
router.use(requireAccountantOrSuperAdmin);

// GET /api/tax-package/adjustments - List fiscal adjustments for a year
router.get('/adjustments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();

    const adjustments = await prisma.fiscalAdjustment.findMany({
      where: {
        tenantId,
        year,
        isDeleted: false,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.json(adjustments);
  } catch (err: any) {
    console.error('Error fetching fiscal adjustments:', err);
    res.status(500).json({ error: err.message || 'Error fetching adjustments' });
  }
});

// POST /api/tax-package/adjustments - Add a fiscal adjustment
router.post('/adjustments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { year, adjustmentType, label, amount, notes } = req.body;

    if (!adjustmentType || !label || amount === undefined) {
      res.status(400).json({ error: 'adjustmentType, label, and amount are required' });
      return;
    }

    const y = year ? parseInt(year, 10) : new Date().getFullYear();

    const created = await prisma.fiscalAdjustment.create({
      data: {
        tenantId,
        year: y,
        adjustmentType, // REINTEGRATION or DEDUCTION
        label,
        amount: parseFloat(amount),
        notes: notes || undefined,
      },
    });

    res.status(201).json(created);
  } catch (err: any) {
    console.error('Error creating fiscal adjustment:', err);
    res.status(500).json({ error: err.message || 'Error creating adjustment' });
  }
});

// DELETE /api/tax-package/adjustments/:id - Soft delete adjustment
router.delete('/adjustments/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { id } = req.params;

    const ok = await softDeleteRecord('fiscalAdjustment', id, tenantId);
    if (!ok) {
      res.status(404).json({ error: 'Adjustment not found' });
      return;
    }

    res.json({ success: true, message: 'Adjustment deleted' });
  } catch (err: any) {
    console.error('Error deleting adjustment:', err);
    res.status(500).json({ error: err.message || 'Error deleting adjustment' });
  }
});

// GET /api/tax-package/reconciliation - Full Liasse Fiscale & Passage Comptable au Fiscal
router.get('/reconciliation', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();

    // 1. Get Financial Statements for the year
    const fin = await computeFinancialStatements(tenantId, year);
    const accountingProfitBeforeTax = fin.incomeStatement.ordinaryResultBeforeTax;
    const turnoverHt = fin.incomeStatement.operatingRevenues.total;

    // 2. Invoices turnover TTC
    const salesInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        invoiceType: 'SALE',
        isDeleted: false,
        invoiceDate: {
          startsWith: String(year),
        },
      },
    });
    const turnoverTtc = salesInvoices.reduce((sum, inv) => sum + inv.totalTtc, 0);

    // 3. Fiscal adjustments registered
    const adjustmentsRaw = await prisma.fiscalAdjustment.findMany({
      where: {
        tenantId,
        year,
        isDeleted: false,
      },
    });

    const adjustments: FiscalAdjustmentItem[] = adjustmentsRaw.map((a) => ({
      id: a.id,
      adjustmentType: a.adjustmentType as any,
      label: a.label,
      amount: a.amount,
      notes: a.notes || undefined,
    }));

    // 4. AP Payments made
    const apPayments = await prisma.provisionalPaymentAP.findMany({
      where: {
        tenantId,
        year,
        isDeleted: false,
      },
    });
    const apPaidTotal = apPayments.reduce((sum, ap) => sum + ap.netPayable, 0);

    // 5. Withholding tax suffered (Compte 4348)
    const rsLines = await prisma.entryLine.findMany({
      where: {
        accountCode: { startsWith: '4348' },
        isDeleted: false,
        entry: {
          tenantId,
          isDeleted: false,
          entryDate: { startsWith: String(year) },
        },
      },
    });
    const withholdingTaxSuffered = rsLines.reduce((sum, l) => sum + (l.debit - l.credit), 0);

    // 6. Compute reconciliation
    const result = TunisianTaxReconciliationEngine.computeTaxReconciliation({
      accountingProfitBeforeTax,
      turnoverTtc: turnoverTtc > 0 ? turnoverTtc : turnoverHt,
      turnoverHt,
      adjustments,
      apPaidTotal,
      withholdingTaxSuffered: Math.max(0, withholdingTaxSuffered),
    });

    res.json({
      year,
      incomeStatement: fin.incomeStatement,
      adjustments,
      result,
    });
  } catch (err: any) {
    console.error('Error generating tax reconciliation:', err);
    res.status(500).json({ error: err.message || 'Error generating tax reconciliation' });
  }
});

export default router;

