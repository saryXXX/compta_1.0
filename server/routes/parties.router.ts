/**
 * Parties Router: Clients and Suppliers management with Tunisian Tax ID validation.
 * Supports multi-tenant isolation and soft deletes.
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import { Router, Response } from 'express';
import { prisma, softDeleteRecord } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';
import { validateTunisianTaxId } from '../services/fiscalEngine.js';

const router = Router();

// GET /api/parties?type=CLIENT|SUPPLIER
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const type = req.query.type as string | undefined;

    const whereClause: any = {
      tenantId,
      isDeleted: false,
    };

    if (type === 'CLIENT' || type === 'SUPPLIER') {
      whereClause.partyType = type;
    }

    const parties = await prisma.party.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    });

    res.json({ parties });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/parties/:id
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { id } = req.params;

    const party = await prisma.party.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: {
        invoices: {
          where: { isDeleted: false },
          orderBy: { invoiceDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!party) {
      res.status(404).json({ error: 'Tiers introuvable.' });
      return;
    }

    res.json({ party });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/parties
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const {
      partyType,
      name,
      taxId,
      rneNumber,
      vatStatus,
      vatExemptionNumber,
      vatExemptionExpiry,
      address,
      city,
      phone,
      email,
      defaultWithholdingRate,
      accountCode,
    } = req.body;

    if (!name || !partyType) {
      res.status(400).json({ error: 'Le nom et le type (CLIENT ou SUPPLIER) sont obligatoires.' });
      return;
    }

    // Validate Tax ID if supplied
    if (taxId && taxId.trim() !== '') {
      const validation = validateTunisianTaxId(taxId);
      if (!validation.isValid) {
        res.status(400).json({ error: validation.message });
        return;
      }
    }

    const defaultAcc = partyType === 'CLIENT' ? '411100' : '401100';

    const party = await prisma.party.create({
      data: {
        tenantId,
        partyType,
        name: name.trim(),
        taxId: taxId ? taxId.trim().toUpperCase() : undefined,
        rneNumber: rneNumber ? rneNumber.trim() : undefined,
        vatStatus: vatStatus || 'ASSUJETTI',
        vatExemptionNumber: vatExemptionNumber || undefined,
        vatExemptionExpiry: vatExemptionExpiry || undefined,
        address: address || undefined,
        city: city || 'Tunis',
        phone: phone || undefined,
        email: email || undefined,
        defaultWithholdingRate: defaultWithholdingRate ? parseFloat(defaultWithholdingRate) : 0.0,
        accountCode: accountCode || defaultAcc,
        balance: 0.0,
      },
    });

    res.status(201).json({ party, success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/parties/:id
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { id } = req.params;
    const {
      name,
      taxId,
      rneNumber,
      vatStatus,
      vatExemptionNumber,
      vatExemptionExpiry,
      address,
      city,
      phone,
      email,
      defaultWithholdingRate,
      accountCode,
    } = req.body;

    if (taxId && taxId.trim() !== '') {
      const validation = validateTunisianTaxId(taxId);
      if (!validation.isValid) {
        res.status(400).json({ error: validation.message });
        return;
      }
    }

    const party = await prisma.party.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        taxId: taxId ? taxId.trim().toUpperCase() : undefined,
        rneNumber: rneNumber !== undefined ? rneNumber : undefined,
        vatStatus: vatStatus || undefined,
        vatExemptionNumber: vatExemptionNumber !== undefined ? vatExemptionNumber : undefined,
        vatExemptionExpiry: vatExemptionExpiry !== undefined ? vatExemptionExpiry : undefined,
        address: address !== undefined ? address : undefined,
        city: city || undefined,
        phone: phone !== undefined ? phone : undefined,
        email: email !== undefined ? email : undefined,
        defaultWithholdingRate: defaultWithholdingRate !== undefined ? parseFloat(defaultWithholdingRate) : 0.0,
        accountCode: accountCode || undefined,
      },
    });

    res.json({ party, success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/parties/:id (Soft delete)
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { id } = req.params;

    const ok = await softDeleteRecord('party', id, tenantId);
    if (!ok) {
      res.status(404).json({ error: 'Tiers introuvable ou déjà archivé.' });
      return;
    }

    res.json({ success: true, message: 'Tiers déplacé dans la corbeille.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

