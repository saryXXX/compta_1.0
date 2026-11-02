/**
 * Fiscal Router:
 * - Déclaration Mensuelle d'Impôts (G50) simulation, aggregation & filing (DGI Modèle 2023)
 * - Acomptes Provisionnels (AP1, AP2, AP3) schedule & deduction of RS subies
 * - Déclaration Annuelle de l'Employeur (DECEMP) & TEJ platform export files
 * 
 * STRICT COMPLIANCE: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';
import { requireAccountantOrSuperAdmin } from '../rbac.js';
import { round3 } from '../services/fiscalEngine.js';
import { generateDecempFile, generateAnxempFile } from '../services/tejGenerator.js';
import { computeTunisianMonthlyReturn } from '../services/tunisianTaxReturnEngine.js';
import { DeclarationCode, TaxpayerProfile } from '../../src/types/index.js';

const router = Router();

// Protect all fiscal routes: strictly reserved for Accountant / DAF and Superadmin
router.use(requireAuth);
router.use(requireAccountantOrSuperAdmin);

// GET /api/fiscal/g50/simulate?month=X&year=Y&code=0&profile=COMMERCIAL
router.get('/g50/simulate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const month = parseInt(req.query.month as string, 10);
    const year = parseInt(req.query.year as string, 10);
    const declarationCode = (req.query.code as DeclarationCode) || '0';
    const profile = (req.query.profile as TaxpayerProfile) || 'COMMERCIAL';

    let activeTaxes = undefined;
    if (req.query.activeTaxes) {
      try {
        activeTaxes = JSON.parse(req.query.activeTaxes as string);
      } catch (e) {
        console.error('Failed to parse activeTaxes:', e);
      }
    }

    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
      res.status(400).json({ error: 'Mois (1-12) et Année valides requis.' });
      return;
    }

    const simulation = await computeTunisianMonthlyReturn({
      tenantId,
      month,
      year,
      declarationCode,
      profile,
      activeTaxes,
    });

    res.json({ simulation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fiscal/g50/save
router.post('/g50/save', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const {
      month,
      year,
      caTaxable19,
      caTaxable13,
      caTaxable7,
      caExport0,
      vatCollected19,
      vatCollected13,
      vatCollected7,
      vatCollectedTotal,
      vatDeductibleAssets,
      vatDeductibleOther,
      vatCreditCarriedForward,
      vatNetDue,
      vatCreditGenerated,
      stampDutyTotal,
      tclTotal,
      fodecTotal,
      withholdingSalaries,
      withholdingFees,
      withholdingRent,
      withholdingPurchases,
      withholdingTotal,
      tfpTotal,
      foprolosTotal,
      totalToPay,
      isNil,
      status,
    } = req.body;

    const decl = await prisma.taxDeclarationG50.upsert({
      where: {
        tenantId_month_year: { tenantId, month, year },
      },
      create: {
        tenantId,
        month,
        year,
        caTaxable19: caTaxable19 || 0.0,
        caTaxable13: caTaxable13 || 0.0,
        caTaxable7: caTaxable7 || 0.0,
        caExport0: caExport0 || 0.0,
        caExempt: 0.0,
        vatCollected19: vatCollected19 || 0.0,
        vatCollected13: vatCollected13 || 0.0,
        vatCollected7: vatCollected7 || 0.0,
        vatCollectedTotal: vatCollectedTotal || 0.0,
        vatDeductibleAssets: vatDeductibleAssets || 0.0,
        vatDeductibleOther: vatDeductibleOther || 0.0,
        vatCreditCarriedForward: vatCreditCarriedForward || 0.0,
        vatNetDue: vatNetDue || 0.0,
        vatCreditGenerated: vatCreditGenerated || 0.0,
        stampDutyTotal: stampDutyTotal || 0.0,
        tclTotal: tclTotal || 0.0,
        fodecTotal: fodecTotal || 0.0,
        withholdingSalaries: withholdingSalaries || 0.0,
        withholdingFees: withholdingFees || 0.0,
        withholdingRent: withholdingRent || 0.0,
        withholdingPurchases: withholdingPurchases || 0.0,
        withholdingTotal: withholdingTotal || 0.0,
        tfpTotal: tfpTotal || 0.0,
        foprolosTotal: foprolosTotal || 0.0,
        totalToPay: totalToPay || 0.0,
        isNil: isNil ? true : false,
        status: status || 'DEPOSITED',
      },
      update: {
        caTaxable19: caTaxable19 || 0.0,
        caTaxable13: caTaxable13 || 0.0,
        caTaxable7: caTaxable7 || 0.0,
        vatCollectedTotal: vatCollectedTotal || 0.0,
        vatDeductibleOther: vatDeductibleOther || 0.0,
        vatNetDue: vatNetDue || 0.0,
        vatCreditGenerated: vatCreditGenerated || 0.0,
        stampDutyTotal: stampDutyTotal || 0.0,
        tclTotal: tclTotal || 0.0,
        fodecTotal: fodecTotal || 0.0,
        withholdingTotal: withholdingTotal || 0.0,
        totalToPay: totalToPay || 0.0,
        isNil: isNil ? true : false,
        status: status || 'DEPOSITED',
      },
    });

    res.json({ success: true, declaration: decl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fiscal/g50
router.get('/g50', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const declarations = await prisma.taxDeclarationG50.findMany({
      where: { tenantId, isDeleted: false },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    res.json({ declarations });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fiscal/ap?year=X
router.get('/ap', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();

    let apList = await prisma.provisionalPaymentAP.findMany({
      where: { tenantId, year, isDeleted: false },
      orderBy: { installmentNumber: 'asc' },
    });

    if (apList.length === 0) {
      const baseTax = 12000.0; // Reference tax N-1
      const ap30 = baseTax * 0.3;

      const schedule = [
        { num: 1, due: `${year}-06-25` },
        { num: 2, due: `${year}-09-25` },
        { num: 3, due: `${year}-12-25` },
      ];

      for (const item of schedule) {
        await prisma.provisionalPaymentAP.create({
          data: {
            tenantId,
            year,
            installmentNumber: item.num,
            previousYearTaxBase: baseTax,
            installmentGross30: ap30,
            withholdingDeducted: item.num === 1 ? 120.2 : 0.0,
            priorCreditsDeducted: 0.0,
            netPayable: item.num === 1 ? Math.max(0, ap30 - 120.2) : ap30,
            dueDate: item.due,
            paymentStatus: 'PENDING',
            notes: `Acompte AP${item.num} - 30% impôt N-1`,
          },
        });
      }

      apList = await prisma.provisionalPaymentAP.findMany({
        where: { tenantId, year, isDeleted: false },
        orderBy: { installmentNumber: 'asc' },
      });
    }

    res.json({ apList });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fiscal/ap/:id/pay
router.post('/ap/:id/pay', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const ap = await prisma.provisionalPaymentAP.update({
      where: { id },
      data: { paymentStatus: 'PAID' },
    });

    res.json({ success: true, ap });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fiscal/employer?year=X
router.get('/employer', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      res.status(404).json({ error: 'Tenant introuvable.' });
      return;
    }

    const feeInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        invoiceType: 'PURCHASE',
        isDeleted: false,
        withholdingTaxAmount: { gt: 0 },
        invoiceDate: { gte: `${year}-01-01`, lte: `${year}-12-31` },
      },
      include: {
        party: true,
      },
    });

    let totalFees = 0;
    let totalWithheld = 0;
    const providers = feeInvoices.map((inv) => {
      totalFees += inv.subtotalHt;
      totalWithheld += inv.withholdingTaxAmount;
      const rate = inv.subtotalHt > 0 ? (inv.withholdingTaxAmount / inv.subtotalHt) * 100 : 5.0;

      return {
        name: inv.party.name,
        taxIdOrCin: inv.party.taxId || '0000000A/A/M/000',
        profession: 'EXPERT COMPTABLE / CONSULTANT',
        grossAmount: inv.subtotalHt,
        withholdingRate: Math.round(rate * 10) / 10,
        withholdingAmount: inv.withholdingTaxAmount,
        netAmount: round3(inv.subtotalHt - inv.withholdingTaxAmount),
      };
    });

    const report = {
      taxId: tenant.taxId,
      companyName: tenant.name,
      address: tenant.address || 'Tunis',
      year,
      totalGrossSalaries: 0.0,
      totalIrppWithheld: 0.0,
      totalFeesPaid: round3(totalFees),
      totalFeesWithheld: round3(totalWithheld),
      totalRentPaid: 0.0,
      totalRentWithheld: 0.0,
      feesProviders: providers,
    };

    res.json({ report });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fiscal/employer/tej?year=X (Download DECEMP & ANXEMP files)
router.get('/employer/tej', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
    const type = req.query.type as string;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      res.status(404).json({ error: 'Tenant introuvable.' });
      return;
    }

    const feeInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        invoiceType: 'PURCHASE',
        isDeleted: false,
        withholdingTaxAmount: { gt: 0 },
        invoiceDate: { gte: `${year}-01-01`, lte: `${year}-12-31` },
      },
      include: { party: true },
    });

    let totalFees = 0;
    let totalWithheld = 0;
    const providers = feeInvoices.map((inv) => {
      totalFees += inv.subtotalHt;
      totalWithheld += inv.withholdingTaxAmount;
      const rate = inv.subtotalHt > 0 ? (inv.withholdingTaxAmount / inv.subtotalHt) * 100 : 5.0;
      return {
        name: inv.party.name,
        taxIdOrCin: inv.party.taxId || '0000000A/A/M/000',
        profession: 'CONSULTANT / PRESTATAIRE',
        grossAmount: inv.subtotalHt,
        withholdingRate: Math.round(rate * 10) / 10,
        withholdingAmount: inv.withholdingTaxAmount,
        netAmount: round3(inv.subtotalHt - inv.withholdingTaxAmount),
      };
    });

    const data = {
      taxId: tenant.taxId,
      companyName: tenant.name,
      address: tenant.address || 'Tunis',
      year,
      totalGrossSalaries: 0.0,
      totalIrppWithheld: 0.0,
      totalFeesPaid: round3(totalFees),
      totalFeesWithheld: round3(totalWithheld),
      totalRentPaid: 0.0,
      totalRentWithheld: 0.0,
      feesProviders: providers,
    };

    if (type === 'ANXEMP') {
      const content = generateAnxempFile(data);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="ANXEMP_${year}.txt"`);
      res.send(content);
    } else {
      const content = generateDecempFile(data);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="DECEMP_${year}.txt"`);
      res.send(content);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
