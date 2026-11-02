/**
 * Accounting Router: Journals, Ledger, 6-column Trial Balance, and NCT 01 Statements.
 * Strictly adheres to Tunisian Accounting Standard NCT 01 & Loi 96-112.
 * 
 * STRICT COMPLIANCE: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';
import { requireAccountantOrSuperAdmin } from '../rbac.js';
import {
  createAccountingEntry,
  computeTrialBalance,
  computeFinancialStatements,
} from '../services/accountingEngine.js';

const router = Router();

router.use(requireAuth);
router.use(requireAccountantOrSuperAdmin);

// GET /api/accounting/accounts
router.get('/accounts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const accounts = await prisma.account.findMany({
      where: { tenantId, isDeleted: false },
      orderBy: { accountCode: 'asc' },
    });
    res.json({ accounts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounting/entries
router.get('/entries', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const journalCode = req.query.journal as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const whereClause: any = {
      tenantId,
      isDeleted: false,
    };
    if (journalCode) {
      whereClause.journalCode = journalCode;
    }
    if (startDate && endDate) {
      whereClause.entryDate = { gte: startDate, lte: endDate };
    }

    const entries = await prisma.accountingEntry.findMany({
      where: whereClause,
      include: {
        lines: {
          where: { isDeleted: false },
        },
      },
      orderBy: { entryDate: 'desc' },
    });

    res.json({ entries });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounting/entries (Manual entry in OD, BQ, CA)
router.post('/entries', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { journalCode, entryDate, referenceNumber, description, lines } = req.body;

    if (!journalCode || !entryDate || !referenceNumber || !description || !lines || !lines.length) {
      res.status(400).json({ error: 'Tous les champs obligatoires doivent être renseignés.' });
      return;
    }

    const result = await createAccountingEntry({
      tenantId,
      journalCode,
      entryDate,
      referenceNumber,
      description,
      lines,
    });

    res.status(201).json({ success: true, id: result.id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/accounting/balance (6-column Trial Balance)
router.get('/balance', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const balance = await computeTrialBalance(tenantId, startDate, endDate);
    res.json({ balance });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounting/ledger (Grand Livre)
router.get('/ledger', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const accountCode = req.query.account as string | undefined;

    const whereClause: any = {
      isDeleted: false,
      entry: {
        tenantId,
        isDeleted: false,
      },
    };

    if (accountCode) {
      whereClause.accountCode = accountCode;
    }

    const lines = await prisma.entryLine.findMany({
      where: whereClause,
      include: {
        entry: true,
      },
      orderBy: [{ accountCode: 'asc' }, { entry: { entryDate: 'asc' } }],
    });

    // Group lines by account
    const accountsMap = new Map<string, any[]>();
    for (const l of lines) {
      const existing = accountsMap.get(l.accountCode) || [];
      existing.push({
        id: l.id,
        date: l.entry.entryDate,
        journal: l.entry.journalCode,
        reference: l.entry.referenceNumber,
        description: l.description || l.entry.description,
        debit: l.debit,
        credit: l.credit,
      });
      accountsMap.set(l.accountCode, existing);
    }

    const ledger = Array.from(accountsMap.entries()).map(([code, entries]) => {
      let balance = 0;
      let totalDebit = 0;
      let totalCredit = 0;

      const entriesWithBalance = entries.map((e) => {
        balance += e.debit - e.credit;
        totalDebit += e.debit;
        totalCredit += e.credit;
        return {
          ...e,
          runningBalance: Math.round(balance * 1000) / 1000,
        };
      });

      return {
        accountCode: code,
        totalDebit: Math.round(totalDebit * 1000) / 1000,
        totalCredit: Math.round(totalCredit * 1000) / 1000,
        finalBalance: Math.round(balance * 1000) / 1000,
        entries: entriesWithBalance,
      };
    });

    res.json({ ledger });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounting/statements (Bilan & État de Résultat NCT 01)
router.get('/statements', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();

    const statements = await computeFinancialStatements(tenantId, year);
    res.json({ statements, year });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

