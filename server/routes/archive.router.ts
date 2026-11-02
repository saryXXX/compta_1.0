/**
 * Archive / Trash Router: View and restore soft-deleted items across the tenant.
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import { Router, Response } from 'express';
import { prisma, restoreRecord } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';

const router = Router();

// GET /api/archive (List all soft deleted items)
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;

    const [parties, invoices, entries, g50Returns] = await Promise.all([
      prisma.party.findMany({
        where: { tenantId, isDeleted: true },
        orderBy: { deletedAt: 'desc' },
      }),
      prisma.invoice.findMany({
        where: { tenantId, isDeleted: true },
        include: { party: true },
        orderBy: { deletedAt: 'desc' },
      }),
      prisma.accountingEntry.findMany({
        where: { tenantId, isDeleted: true },
        orderBy: { deletedAt: 'desc' },
      }),
      prisma.taxDeclarationG50.findMany({
        where: { tenantId, isDeleted: true },
        orderBy: { deletedAt: 'desc' },
      }),
    ]);

    res.json({
      archive: {
        parties,
        invoices,
        entries,
        g50Returns,
        totalCount: parties.length + invoices.length + entries.length + g50Returns.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/archive/restore
router.post('/restore', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { modelName, id } = req.body;

    if (!modelName || !id) {
      res.status(400).json({ error: 'modelName et id requis.' });
      return;
    }

    const success = await restoreRecord(modelName, id, tenantId);
    if (!success) {
      res.status(404).json({ error: 'Élément introuvable ou déjà restauré.' });
      return;
    }

    res.json({ success: true, message: 'Élément restauré avec succès.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

