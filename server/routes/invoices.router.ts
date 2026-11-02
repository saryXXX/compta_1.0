/**
 * Invoices Router: Sales & Purchases Management with Automated Accounting Entries.
 * Implements strict Tunisian tax rules (TVA, FODEC, Timbre fiscal 1 DT, Retenue à la source).
 * 
 * STRICT COMPLIANCE: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import { Router, Response } from 'express';
import { prisma, softDeleteRecord } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';
import { calculateInvoiceTaxes, round3, formatTnd, amountInWordsTnd } from '../services/fiscalEngine.js';
import { createAccountingEntry } from '../services/accountingEngine.js';

const router = Router();

// GET /api/invoices
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const invoiceType = req.query.type as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const whereClause: any = {
      tenantId,
      isDeleted: false,
    };

    if (invoiceType) {
      whereClause.invoiceType = invoiceType;
    }
    if (startDate && endDate) {
      whereClause.invoiceDate = { gte: startDate, lte: endDate };
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        party: true,
        items: {
          where: { isDeleted: false },
        },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    res.json({ invoices });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/:id
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: {
        party: true,
        items: {
          where: { isDeleted: false },
        },
        entries: {
          where: { isDeleted: false },
          include: {
            lines: {
              where: { isDeleted: false },
            },
          },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Facture introuvable.' });
      return;
    }

    const amountInWords = amountInWordsTnd(invoice.totalTtc);

    res.json({
      invoice,
      amountInWords,
      formattedTotal: formatTnd(invoice.totalTtc),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const {
      invoiceType,
      invoiceNumber,
      partyId,
      invoiceDate,
      dueDate,
      items,
      withholdingRatePercent,
      notes,
    } = req.body;

    if (!invoiceType || !invoiceNumber || !partyId || !invoiceDate || !items || !items.length) {
      res.status(400).json({ error: 'Champs obligatoires manquants (type, numéro, tiers, date, lignes d’articles).' });
      return;
    }

    // Verify Party
    const party = await prisma.party.findFirst({
      where: { id: partyId, tenantId, isDeleted: false },
    });
    if (!party) {
      res.status(404).json({ error: 'Tiers client/fournisseur introuvable.' });
      return;
    }

    const isExempt = party.vatStatus === 'EXONERE' || party.vatStatus === 'SUSPENSION';
    const rsRate = withholdingRatePercent !== undefined ? parseFloat(withholdingRatePercent) : party.defaultWithholdingRate;

    // Calculate taxes
    const calc = calculateInvoiceTaxes(items, invoiceType, rsRate, isExempt);

    // Create Invoice with items
    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        invoiceType,
        invoiceNumber: invoiceNumber.trim(),
        partyId,
        invoiceDate,
        dueDate: dueDate || invoiceDate,
        subtotalHt: calc.subtotalHt,
        fodecAmount: calc.fodecAmount,
        vatAmount: calc.vatAmount,
        stampDuty: calc.stampDuty,
        withholdingTaxAmount: calc.withholdingTaxAmount,
        totalTtc: calc.totalTtc,
        status: 'VALIDATED',
        notes: notes || undefined,
        items: {
          create: calc.items.map((it) => ({
            description: it.description,
            quantity: it.quantity,
            unitPriceHt: it.unitPriceHt,
            discountPercent: it.discountPercent,
            fodecRate: it.fodecRate,
            fodecAmount: it.fodecAmount,
            vatRate: it.vatRate,
            vatAmount: it.vatAmount,
            totalHt: it.totalHt,
            totalTtc: it.totalTtc,
          })),
        },
      },
    });

    // Automatically generate balanced double-entry accounting entry
    if (invoiceType === 'SALE') {
      // Net receivable from client = Total TTC - Withholding tax subie
      const clientReceivable = round3(calc.totalTtc - calc.withholdingTaxAmount);
      const lines = [
        {
          accountCode: party.accountCode || '411100',
          debit: clientReceivable,
          credit: 0.0,
          description: `Client ${party.name} - net à encaisser`,
        },
      ];

      if (calc.withholdingTaxAmount > 0) {
        lines.push({
          accountCode: '434800',
          debit: calc.withholdingTaxAmount,
          credit: 0.0,
          description: `Retenue à la source subie (${rsRate}%)`,
        });
      }

      lines.push({
        accountCode: '707000',
        debit: 0.0,
        credit: calc.subtotalHt,
        description: `Vente de marchandises HT`,
      });

      if (calc.fodecAmount > 0) {
        lines.push({
          accountCode: '432300',
          debit: 0.0,
          credit: calc.fodecAmount,
          description: `FODEC 1% collecté`,
        });
      }

      if (calc.vatAmount > 0) {
        lines.push({
          accountCode: '436710',
          debit: 0.0,
          credit: calc.vatAmount,
          description: `TVA collectée`,
        });
      }

      if (calc.stampDuty > 0) {
        lines.push({
          accountCode: '432200',
          debit: 0.0,
          credit: calc.stampDuty,
          description: `Droit de timbre fiscal sur vente`,
        });
      }

      await createAccountingEntry({
        tenantId,
        journalCode: 'VE',
        entryDate: invoiceDate,
        referenceNumber: invoiceNumber,
        description: `Facture vente ${invoiceNumber} - ${party.name}`,
        invoiceId: invoice.id,
        lines,
      });
    } else if (invoiceType === 'PURCHASE') {
      const supplierPayable = round3(calc.totalTtc - calc.withholdingTaxAmount);
      const lines = [
        {
          accountCode: '607000',
          debit: calc.subtotalHt,
          credit: 0.0,
          description: `Achat HT - ${party.name}`,
        },
      ];

      if (calc.vatAmount > 0) {
        lines.push({
          accountCode: '436620',
          debit: calc.vatAmount,
          credit: 0.0,
          description: `TVA déductible sur biens et services`,
        });
      }

      if (calc.stampDuty > 0) {
        lines.push({
          accountCode: '645000',
          debit: calc.stampDuty,
          credit: 0.0,
          description: `Droit de timbre fiscal achat`,
        });
      }

      lines.push({
        accountCode: party.accountCode || '401100',
        debit: 0.0,
        credit: supplierPayable,
        description: `Fournisseur ${party.name} net à payer`,
      });

      if (calc.withholdingTaxAmount > 0) {
        lines.push({
          accountCode: '434200',
          debit: 0.0,
          credit: calc.withholdingTaxAmount,
          description: `Retenue à la source opérée à verser au Trésor`,
        });
      }

      await createAccountingEntry({
        tenantId,
        journalCode: 'AC',
        entryDate: invoiceDate,
        referenceNumber: invoiceNumber,
        description: `Facture achat ${invoiceNumber} - ${party.name}`,
        invoiceId: invoice.id,
        lines,
      });
    }

    res.status(201).json({ invoice, success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/invoices/:id (Soft delete)
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { id } = req.params;

    const ok = await softDeleteRecord('invoice', id, tenantId);
    if (!ok) {
      res.status(404).json({ error: 'Facture introuvable.' });
      return;
    }

    // Also soft delete associated accounting entries
    const entries = await prisma.accountingEntry.findMany({
      where: { invoiceId: id, tenantId },
    });
    for (const entry of entries) {
      await softDeleteRecord('accountingEntry', entry.id, tenantId);
    }

    res.json({ success: true, message: 'Facture déplacée dans la corbeille.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

