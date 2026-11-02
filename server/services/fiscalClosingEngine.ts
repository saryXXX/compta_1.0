/**
 * Fiscal Year-End Closing & Opening Entries Engine (Clôture d'exercice & Journal des À-Nouveaux).
 * Implements:
 * - Soldage des comptes de charges (Classe 6) et produits (Classe 7) vers le compte de résultat 131000
 * - Validation de l'équilibre parfait de clôture (SCE Loi 96-112)
 * - Génération automatique du Journal des À-Nouveaux (Journal "AN") au 01/01/N+1
 * 
 * STRICT COMPLIANCE: ZERO TYPE NULL.
 */

import { prisma } from '../db.js';

export interface ClosingResult {
  fiscalYear: number;
  totalExpensesClosed: number;
  totalRevenuesClosed: number;
  netAccountingResult: number;
  closingEntryId?: string;
  anEntryId?: string;
  anTotalDebit: number;
  anTotalCredit: number;
  isEquilibrated: boolean;
  message: string;
}

export class TunisianFiscalClosingEngine {
  /**
   * Executes the fiscal closing for year N and creates opening entries for year N+1.
   */
  public static async executeClosing(tenantId: string, fiscalYear: number): Promise<ClosingResult> {
    const startDate = `${fiscalYear}-01-01`;
    const endDate = `${fiscalYear}-12-31`;
    const nextYearOpeningDate = `${fiscalYear + 1}-01-01`;

    // 1. Fetch all active entry lines for this tenant up to end of fiscal year
    const lines = await prisma.entryLine.findMany({
      where: {
        isDeleted: false,
        entry: {
          tenantId,
          isDeleted: false,
          entryDate: {
            lte: endDate,
          },
        },
      },
      include: {
        entry: true,
      },
    });

    // 2. Aggregate account balances
    const balancesByAccount: Record<string, { debit: number; credit: number }> = {};
    for (const line of lines) {
      if (!balancesByAccount[line.accountCode]) {
        balancesByAccount[line.accountCode] = { debit: 0, credit: 0 };
      }
      balancesByAccount[line.accountCode].debit += line.debit;
      balancesByAccount[line.accountCode].credit += line.credit;
    }

    // 3. Separate Class 6 (Expenses), Class 7 (Revenues), and Balance Sheet Classes (1, 2, 3, 4, 5)
    let totalExpenses = 0;
    let totalRevenues = 0;
    const closingLinesToCreate: Array<{ accountCode: string; debit: number; credit: number; description: string }> = [];

    for (const [code, bal] of Object.entries(balancesByAccount)) {
      const net = Math.round((bal.debit - bal.credit) * 1000) / 1000;
      if (Math.abs(net) < 0.001) continue;

      if (code.startsWith('6')) {
        // Expense account with debit balance -> Credit it to zero out
        if (net > 0) {
          totalExpenses += net;
          closingLinesToCreate.push({
            accountCode: code,
            debit: 0,
            credit: net,
            description: `Soldage clôture ${fiscalYear}`,
          });
        } else {
          // Negative expense (credit balance)
          totalExpenses += net;
          closingLinesToCreate.push({
            accountCode: code,
            debit: Math.abs(net),
            credit: 0,
            description: `Soldage clôture ${fiscalYear}`,
          });
        }
      } else if (code.startsWith('7')) {
        // Revenue account with credit balance (net < 0) -> Debit it to zero out
        const revenueAmount = -net;
        totalRevenues += revenueAmount;
        if (revenueAmount > 0) {
          closingLinesToCreate.push({
            accountCode: code,
            debit: revenueAmount,
            credit: 0,
            description: `Soldage clôture ${fiscalYear}`,
          });
        } else {
          closingLinesToCreate.push({
            accountCode: code,
            debit: 0,
            credit: Math.abs(revenueAmount),
            description: `Soldage clôture ${fiscalYear}`,
          });
        }
      }
    }

    totalExpenses = Math.round(totalExpenses * 1000) / 1000;
    totalRevenues = Math.round(totalRevenues * 1000) / 1000;
    const netResult = Math.round((totalRevenues - totalExpenses) * 1000) / 1000;

    // Counterpart in Account 131000 (Résultat net de l'exercice)
    if (netResult >= 0) {
      // Bénéfice : Crédit 131000
      closingLinesToCreate.push({
        accountCode: '131000',
        debit: 0,
        credit: netResult,
        description: `Résultat net bénéficiaire ${fiscalYear}`,
      });
    } else {
      // Perte : Débit 131000
      closingLinesToCreate.push({
        accountCode: '131000',
        debit: Math.abs(netResult),
        credit: 0,
        description: `Résultat net déficitaire ${fiscalYear}`,
      });
    }

    // 4. Create Closing Entry in database (Journal OD)
    let closingEntryId: string | undefined = undefined;
    if (closingLinesToCreate.length > 0) {
      const closingEntry = await prisma.accountingEntry.create({
        data: {
          tenantId,
          journalCode: 'OD',
          entryDate: endDate,
          referenceNumber: `CLOTURE-${fiscalYear}`,
          description: `Clôture annuelle des comptes de gestion (Classes 6 et 7) - Exercice ${fiscalYear}`,
          lines: {
            create: closingLinesToCreate.map((l) => ({
              accountCode: l.accountCode,
              debit: l.debit,
              credit: l.credit,
              description: l.description,
            })),
          },
        },
      });
      closingEntryId = closingEntry.id;
    }

    // 5. Prepare Opening Entries (Journal des À-Nouveaux "AN") for year N+1
    // Balance Sheet accounts: Classes 1 to 5 (including newly established account 131000 result)
    const anLinesToCreate: Array<{ accountCode: string; debit: number; credit: number; description: string }> = [];

    for (const [code, bal] of Object.entries(balancesByAccount)) {
      if (code.startsWith('1') || code.startsWith('2') || code.startsWith('3') || code.startsWith('4') || code.startsWith('5')) {
        let net = Math.round((bal.debit - bal.credit) * 1000) / 1000;
        // Include result from closing in account 131000
        if (code === '131000') {
          net = netResult >= 0 ? net - netResult : net + Math.abs(netResult);
        }

        if (Math.abs(net) < 0.001) continue;

        if (net > 0) {
          anLinesToCreate.push({
            accountCode: code,
            debit: net,
            credit: 0,
            description: `Reprise de solde à-nouveaux ${fiscalYear + 1}`,
          });
        } else {
          anLinesToCreate.push({
            accountCode: code,
            debit: 0,
            credit: Math.abs(net),
            description: `Reprise de solde à-nouveaux ${fiscalYear + 1}`,
          });
        }
      }
    }

    // If account 131000 wasn't in balancesByAccount yet, add it
    if (!balancesByAccount['131000'] && Math.abs(netResult) > 0.001) {
      if (netResult > 0) {
        anLinesToCreate.push({
          accountCode: '131000',
          debit: 0,
          credit: netResult,
          description: `Résultat net reporté exercice ${fiscalYear}`,
        });
      } else {
        anLinesToCreate.push({
          accountCode: '131000',
          debit: Math.abs(netResult),
          credit: 0,
          description: `Résultat net reporté exercice ${fiscalYear}`,
        });
      }
    }

    const anTotalDebit = Math.round(anLinesToCreate.reduce((sum, l) => sum + l.debit, 0) * 1000) / 1000;
    const anTotalCredit = Math.round(anLinesToCreate.reduce((sum, l) => sum + l.credit, 0) * 1000) / 1000;
    const isEquilibrated = Math.abs(anTotalDebit - anTotalCredit) < 0.01;

    let anEntryId: string | undefined = undefined;
    if (anLinesToCreate.length > 0) {
      const anEntry = await prisma.accountingEntry.create({
        data: {
          tenantId,
          journalCode: 'AN',
          entryDate: nextYearOpeningDate,
          referenceNumber: `AN-${fiscalYear + 1}`,
          description: `Journal des À-Nouveaux au 01/01/${fiscalYear + 1} (Report des soldes bilanciels)`,
          lines: {
            create: anLinesToCreate.map((l) => ({
              accountCode: l.accountCode,
              debit: l.debit,
              credit: l.credit,
              description: l.description,
            })),
          },
        },
      });
      anEntryId = anEntry.id;
    }

    return {
      fiscalYear,
      totalExpensesClosed: totalExpenses,
      totalRevenuesClosed: totalRevenues,
      netAccountingResult: netResult,
      closingEntryId,
      anEntryId,
      anTotalDebit,
      anTotalCredit,
      isEquilibrated,
      message: `Clôture de l'exercice ${fiscalYear} effectuée avec succès. Journal AN généré au 01/01/${fiscalYear + 1}.`,
    };
  }
}

