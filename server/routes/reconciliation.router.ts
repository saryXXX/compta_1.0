/**
 * Bank Reconciliation Router: Import statement & match against account 512100.
 * 
 * STRICT COMPLIANCE: ZERO TYPE NULL.
 */

import { Router, Response } from 'express';
import { prisma, softDeleteRecord } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';
import { requireAccountantOrSuperAdmin } from '../rbac.js';
import {
  TunisianBankReconciliationEngine,
  BankStatementLineDTO,
  LedgerLineDTO,
} from '../services/bankReconciliationEngine.js';

const router = Router();

router.use(requireAuth);
router.use(requireAccountantOrSuperAdmin);

// GET /api/reconciliation/bank-lines - List active bank statement lines
router.get('/bank-lines', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const lines = await prisma.bankStatementLine.findMany({
      where: {
        tenantId,
        isDeleted: false,
      },
      orderBy: {
        operationDate: 'desc',
      },
    });

    res.json(lines);
  } catch (err: any) {
    console.error('Error fetching bank statement lines:', err);
    res.status(500).json({ error: err.message || 'Error fetching bank lines' });
  }
});

// POST /api/reconciliation/bank-lines - Add single or bulk bank statement lines
router.post('/bank-lines', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { lines } = req.body; // Can be an array or single item in req.body

    const itemsToCreate = Array.isArray(lines) ? lines : [req.body];
    const createdLines = [];

    for (const item of itemsToCreate) {
      if (!item.operationDate || !item.description) {
        continue;
      }
      const created = await prisma.bankStatementLine.create({
        data: {
          tenantId,
          operationDate: item.operationDate,
          valueDate: item.valueDate || item.operationDate,
          description: item.description,
          debit: parseFloat(item.debit || '0'),
          credit: parseFloat(item.credit || '0'),
          isReconciled: false,
        },
      });
      createdLines.push(created);
    }

    res.status(201).json({ count: createdLines.length, lines: createdLines });
  } catch (err: any) {
    console.error('Error creating bank lines:', err);
    res.status(500).json({ error: err.message || 'Error adding bank statement lines' });
  }
});

// DELETE /api/reconciliation/bank-lines/:id - Soft delete a bank line
router.delete('/bank-lines/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { id } = req.params;

    const ok = await softDeleteRecord('bankStatementLine', id, tenantId);
    if (!ok) {
      res.status(404).json({ error: 'Bank line not found' });
      return;
    }

    res.json({ success: true, message: 'Bank line deleted' });
  } catch (err: any) {
    console.error('Error deleting bank line:', err);
    res.status(500).json({ error: err.message || 'Error deleting bank line' });
  }
});

// GET /api/reconciliation/ledger-lines - Fetch lines from bank accounts (512100)
router.get('/ledger-lines', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const accountCode = (req.query.accountCode as string) || '512100';

    const lines = await prisma.entryLine.findMany({
      where: {
        isDeleted: false,
        accountCode: {
          startsWith: accountCode.substring(0, 3), // e.g. 512
        },
        entry: {
          tenantId,
          isDeleted: false,
        },
      },
      include: {
        entry: true,
      },
      orderBy: {
        entry: {
          entryDate: 'desc',
        },
      },
    });

    // Determine reconciled status from bank statement lines table
    const reconciledBankLines = await prisma.bankStatementLine.findMany({
      where: {
        tenantId,
        isDeleted: false,
        isReconciled: true,
      },
    });

    const reconciledEntryLineIds = new Set(
      reconciledBankLines
        .map((b) => b.reconciledEntryLineId)
        .filter((id): id is string => id !== null && id !== undefined && id.length > 0)
    );

    const mapped: LedgerLineDTO[] = lines.map((l) => ({
      id: l.id,
      entryId: l.entryId,
      journalCode: l.entry.journalCode,
      entryDate: l.entry.entryDate,
      referenceNumber: l.entry.referenceNumber,
      accountCode: l.accountCode,
      description: l.description || l.entry.description,
      debit: l.debit,
      credit: l.credit,
      isReconciled: reconciledEntryLineIds.has(l.id),
    }));

    res.json(mapped);
  } catch (err: any) {
    console.error('Error fetching ledger bank lines:', err);
    res.status(500).json({ error: err.message || 'Error fetching ledger lines' });
  }
});

// POST /api/reconciliation/match - Reconcile a bank line with a ledger line
router.post('/match', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { bankLineId, ledgerLineId } = req.body;

    if (!bankLineId) {
      res.status(400).json({ error: 'bankLineId is required' });
      return;
    }

    const updated = await prisma.bankStatementLine.updateMany({
      where: { id: bankLineId, tenantId },
      data: {
        isReconciled: true,
        reconciledEntryLineId: ledgerLineId || undefined,
      },
    });

    if (updated.count === 0) {
      res.status(404).json({ error: 'Bank statement line not found' });
      return;
    }

    res.json({ success: true, message: 'Line reconciled successfully' });
  } catch (err: any) {
    console.error('Error reconciling line:', err);
    res.status(500).json({ error: err.message || 'Error reconciling line' });
  }
});

// POST /api/reconciliation/unmatch - Un-reconcile a bank line
router.post('/unmatch', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { bankLineId } = req.body;

    if (!bankLineId) {
      res.status(400).json({ error: 'bankLineId is required' });
      return;
    }

    const updated = await prisma.bankStatementLine.updateMany({
      where: { id: bankLineId, tenantId },
      data: {
        isReconciled: false,
        reconciledEntryLineId: undefined,
      },
    });

    if (updated.count === 0) {
      res.status(404).json({ error: 'Bank statement line not found' });
      return;
    }

    res.json({ success: true, message: 'Line un-reconciled successfully' });
  } catch (err: any) {
    console.error('Error unmatching line:', err);
    res.status(500).json({ error: err.message || 'Error unmatching line' });
  }
});

// GET /api/reconciliation/report - Full reconciliation statement calculation
router.get('/report', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;

    const bankLinesRaw = await prisma.bankStatementLine.findMany({
      where: { tenantId, isDeleted: false },
    });

    const bankLines: BankStatementLineDTO[] = bankLinesRaw.map((b) => ({
      id: b.id,
      operationDate: b.operationDate,
      valueDate: b.valueDate,
      description: b.description,
      debit: b.debit,
      credit: b.credit,
      isReconciled: b.isReconciled,
      reconciledEntryLineId: b.reconciledEntryLineId || undefined,
    }));

    const ledgerLinesRaw = await prisma.entryLine.findMany({
      where: {
        isDeleted: false,
        accountCode: { startsWith: '512' },
        entry: { tenantId, isDeleted: false },
      },
      include: { entry: true },
    });

    const reconciledEntryLineIds = new Set(
      bankLines
        .filter((b) => b.isReconciled && b.reconciledEntryLineId)
        .map((b) => b.reconciledEntryLineId as string)
    );

    const ledgerLines: LedgerLineDTO[] = ledgerLinesRaw.map((l) => ({
      id: l.id,
      entryId: l.entryId,
      journalCode: l.entry.journalCode,
      entryDate: l.entry.entryDate,
      referenceNumber: l.entry.referenceNumber,
      accountCode: l.accountCode,
      description: l.description || l.entry.description,
      debit: l.debit,
      credit: l.credit,
      isReconciled: reconciledEntryLineIds.has(l.id),
    }));

    const report = TunisianBankReconciliationEngine.calculateReconciliation(bankLines, ledgerLines);
    const suggestions = TunisianBankReconciliationEngine.suggestMatches(
      bankLines.filter((b) => !b.isReconciled),
      ledgerLines.filter((l) => !l.isReconciled)
    );

    res.json({ report, suggestions });
  } catch (err: any) {
    console.error('Error generating reconciliation report:', err);
    res.status(500).json({ error: err.message || 'Error generating reconciliation report' });
  }
});

export default router;

