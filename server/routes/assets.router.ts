/**
 * Fixed Assets Router: NCT 05 Tunisian Asset Register & Amortization.
 * 
 * STRICT COMPLIANCE: ZERO TYPE NULL.
 */

import { Router, Response } from 'express';
import { prisma, softDeleteRecord } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';
import { requireAccountantOrSuperAdmin } from '../rbac.js';
import { TunisianAssetsEngine, FixedAssetInput } from '../services/assetsEngine.js';

const router = Router();

router.use(requireAuth);
router.use(requireAccountantOrSuperAdmin);

// GET /api/assets - List all active fixed assets with current NBV
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const assets = await prisma.fixedAsset.findMany({
      where: {
        tenantId,
        isDeleted: false,
      },
      orderBy: {
        assetCode: 'asc',
      },
    });

    const currentYear = new Date().getFullYear();

    const enriched = assets.map((asset) => {
      const input: FixedAssetInput = {
        assetCode: asset.assetCode,
        name: asset.name,
        category: asset.category,
        acquisitionDate: asset.acquisitionDate,
        commissioningDate: asset.commissioningDate,
        originalValueHt: asset.originalValueHt,
        depreciationRate: asset.depreciationRate,
        assetAccountCode: asset.assetAccountCode,
        amortAccountCode: asset.amortAccountCode,
        dotationAccountCode: asset.dotationAccountCode,
      };

      const schedule = TunisianAssetsEngine.generateSchedule(input);
      const currentRow = schedule.find((s) => s.year === currentYear) || schedule[schedule.length - 1];

      return {
        ...asset,
        currentAccumulatedAmort: currentRow ? currentRow.closingAccumulated : 0,
        currentNetBookValue: currentRow ? currentRow.netBookValue : asset.originalValueHt,
      };
    });

    res.json(enriched);
  } catch (err: any) {
    console.error('Error fetching fixed assets:', err);
    res.status(500).json({ error: err.message || 'Error fetching assets' });
  }
});

// POST /api/assets - Register new fixed asset
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const {
      assetCode,
      name,
      category,
      acquisitionDate,
      commissioningDate,
      originalValueHt,
      depreciationRate,
      assetAccountCode,
      amortAccountCode,
      dotationAccountCode,
    } = req.body;

    if (!assetCode || !name || originalValueHt === undefined || depreciationRate === undefined) {
      res.status(400).json({ error: 'assetCode, name, originalValueHt, and depreciationRate are required' });
      return;
    }

    const asset = await prisma.fixedAsset.create({
      data: {
        tenantId,
        assetCode,
        name,
        category: category || 'EQUIPEMENT',
        acquisitionDate: acquisitionDate || new Date().toISOString().split('T')[0],
        commissioningDate: commissioningDate || acquisitionDate || new Date().toISOString().split('T')[0],
        originalValueHt: parseFloat(originalValueHt),
        depreciationRate: parseFloat(depreciationRate),
        assetAccountCode: assetAccountCode || '228000',
        amortAccountCode: amortAccountCode || '282800',
        dotationAccountCode: dotationAccountCode || '681100',
      },
    });

    res.status(201).json(asset);
  } catch (err: any) {
    console.error('Error creating fixed asset:', err);
    res.status(500).json({ error: err.message || 'Error creating asset' });
  }
});

// GET /api/assets/:id/schedule - Generate complete amortization table
router.get('/:id/schedule', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { id } = req.params;

    const asset = await prisma.fixedAsset.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    const input: FixedAssetInput = {
      assetCode: asset.assetCode,
      name: asset.name,
      category: asset.category,
      acquisitionDate: asset.acquisitionDate,
      commissioningDate: asset.commissioningDate,
      originalValueHt: asset.originalValueHt,
      depreciationRate: asset.depreciationRate,
      assetAccountCode: asset.assetAccountCode,
      amortAccountCode: asset.amortAccountCode,
      dotationAccountCode: asset.dotationAccountCode,
    };

    const schedule = TunisianAssetsEngine.generateSchedule(input);
    res.json({ asset, schedule });
  } catch (err: any) {
    console.error('Error calculating amortization schedule:', err);
    res.status(500).json({ error: err.message || 'Error calculating schedule' });
  }
});

// POST /api/assets/post-dotations - Post year-end inventory voucher for a specific fiscal year
router.post('/post-dotations', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { year } = req.body;

    if (!year) {
      res.status(400).json({ error: 'year is required' });
      return;
    }

    const fiscalYear = parseInt(year, 10);
    const assets = await prisma.fixedAsset.findMany({
      where: { tenantId, isDeleted: false },
    });

    const voucherLines: Array<{ accountCode: string; debit: number; credit: number; description: string }> = [];

    for (const asset of assets) {
      const input: FixedAssetInput = {
        assetCode: asset.assetCode,
        name: asset.name,
        category: asset.category,
        acquisitionDate: asset.acquisitionDate,
        commissioningDate: asset.commissioningDate,
        originalValueHt: asset.originalValueHt,
        depreciationRate: asset.depreciationRate,
        assetAccountCode: asset.assetAccountCode,
        amortAccountCode: asset.amortAccountCode,
        dotationAccountCode: asset.dotationAccountCode,
      };

      const dotation = TunisianAssetsEngine.getDotationForYear(input, fiscalYear);
      if (dotation > 0) {
        voucherLines.push({
          accountCode: asset.dotationAccountCode || '681100',
          debit: dotation,
          credit: 0,
          description: `Dotation amortissement ${asset.name} (${fiscalYear})`,
        });
        voucherLines.push({
          accountCode: asset.amortAccountCode,
          debit: 0,
          credit: dotation,
          description: `Amortissement cumulé ${asset.name} (${fiscalYear})`,
        });
      }
    }

    if (voucherLines.length === 0) {
      res.json({ success: true, message: `Aucune dotation d'amortissement à comptabiliser pour l'exercice ${fiscalYear}` });
      return;
    }

    const entry = await prisma.accountingEntry.create({
      data: {
        tenantId,
        journalCode: 'OD',
        entryDate: `${fiscalYear}-12-31`,
        referenceNumber: `AMORT-${fiscalYear}`,
        description: `Dotations annuelles aux amortissements - Exercice ${fiscalYear}`,
        lines: {
          create: voucherLines.map((l) => ({
            accountCode: l.accountCode,
            debit: l.debit,
            credit: l.credit,
            description: l.description,
          })),
        },
      },
    });

    res.json({
      success: true,
      entryId: entry.id,
      lineCount: voucherLines.length,
      message: `Écriture d'inventaire des dotations comptabilisée avec succès pour l'exercice ${fiscalYear}`,
    });
  } catch (err: any) {
    console.error('Error posting dotation voucher:', err);
    res.status(500).json({ error: err.message || 'Error posting dotations' });
  }
});

// DELETE /api/assets/:id - Soft delete asset
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { id } = req.params;

    const ok = await softDeleteRecord('fixedAsset', id, tenantId);
    if (!ok) {
      res.status(404).json({ error: 'Asset not found or could not be deleted' });
      return;
    }

    res.json({ success: true, message: 'Asset soft-deleted' });
  } catch (err: any) {
    console.error('Error deleting asset:', err);
    res.status(500).json({ error: err.message || 'Error deleting asset' });
  }
});

export default router;

