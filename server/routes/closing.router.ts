/**
 * Fiscal Closing Router: Year-end closing and generation of Journal des À-Nouveaux.
 * 
 * STRICT COMPLIANCE: ZERO TYPE NULL.
 */

import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';
import { requireAccountantOrSuperAdmin } from '../rbac.js';
import { TunisianFiscalClosingEngine } from '../services/fiscalClosingEngine.js';

const router = Router();

router.use(requireAuth);
router.use(requireAccountantOrSuperAdmin);

// GET /api/closing/status?year=Y - Check if closing or AN entries already exist
router.get('/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();

    const closingEntry = await prisma.accountingEntry.findFirst({
      where: {
        tenantId,
        referenceNumber: `CLOTURE-${year}`,
        isDeleted: false,
      },
    });

    const anEntry = await prisma.accountingEntry.findFirst({
      where: {
        tenantId,
        referenceNumber: `AN-${year + 1}`,
        isDeleted: false,
      },
    });

    res.json({
      year,
      isClosed: closingEntry ? true : false,
      closingEntryId: closingEntry ? closingEntry.id : undefined,
      hasAnNouveaux: anEntry ? true : false,
      anEntryId: anEntry ? anEntry.id : undefined,
    });
  } catch (err: any) {
    console.error('Error checking closing status:', err);
    res.status(500).json({ error: err.message || 'Error checking closing status' });
  }
});

// POST /api/closing/execute - Execute year-end closing & generate AN
router.post('/execute', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { year } = req.body;

    if (!year) {
      res.status(400).json({ error: 'year is required' });
      return;
    }

    const fiscalYear = parseInt(year, 10);

    // Check if already closed
    const existing = await prisma.accountingEntry.findFirst({
      where: {
        tenantId,
        referenceNumber: `CLOTURE-${fiscalYear}`,
        isDeleted: false,
      },
    });

    if (existing) {
      res.status(400).json({
        error: `L'exercice ${fiscalYear} a déjà été clôturé (Écriture ${existing.referenceNumber}).`,
      });
      return;
    }

    const result = await TunisianFiscalClosingEngine.executeClosing(tenantId, fiscalYear);
    res.json(result);
  } catch (err: any) {
    console.error('Error executing fiscal closing:', err);
    res.status(500).json({ error: err.message || 'Error executing fiscal closing' });
  }
});

export default router;

