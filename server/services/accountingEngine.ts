/**
 * Accounting Engine for Tunisian Accounting (Loi 96-112 & NCT 01).
 * Generates double-entry balanced journal entries.
 * Calculates General Ledger, 6-column Trial Balance, and NCT 01 Balance Sheet and Income Statement.
 * 
 * STRICT COMPLIANCE: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import { prisma } from '../db.js';
import { round3 } from './fiscalEngine.js';

export interface EntryLineInput {
  accountCode: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface AccountingEntryInput {
  tenantId: string;
  journalCode: 'VE' | 'AC' | 'BQ' | 'CA' | 'OD';
  entryDate: string;
  referenceNumber: string;
  description: string;
  invoiceId?: string;
  lines: EntryLineInput[];
}

export interface BalanceSheetItem {
  code: string;
  label: string;
  grossAmount: number;
  amortizationOrDepreciation: number;
  netAmount: number;
}

export interface BalanceSheetSection {
  title: string;
  total: number;
  items: BalanceSheetItem[];
}

export interface BalanceSheetReport {
  assets: {
    nonCurrent: BalanceSheetSection;
    current: BalanceSheetSection;
    totalAssets: number;
  };
  equityAndLiabilities: {
    equity: BalanceSheetSection;
    nonCurrentLiabilities: BalanceSheetSection;
    currentLiabilities: BalanceSheetSection;
    totalEquityAndLiabilities: number;
  };
  isBalanced: boolean;
  difference: number;
}

export interface IncomeStatementReport {
  operatingRevenues: {
    sales: number;
    services: number;
    otherRevenues: number;
    total: number;
  };
  operatingExpenses: {
    purchases: number;
    services: number;
    personnel: number;
    depreciation: number;
    taxes: number;
    total: number;
  };
  operatingResult: number; // Résultat d'exploitation
  financialIncome: number;
  financialExpenses: number;
  financialResult: number;
  ordinaryResultBeforeTax: number; // Résultat des activités ordinaires avant impôt
  corporateTax: number; // Impôt sur les sociétés (15% droit commun)
  netIncome: number; // Résultat net de l'exercice
}

/**
 * Creates a balanced double-entry accounting entry in the specified journal.
 */
export async function createAccountingEntry(data: AccountingEntryInput): Promise<{ id: string; success: boolean }> {
  // 1. Verify double-entry balance: Sum(Debit) === Sum(Credit)
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of data.lines) {
    totalDebit += Math.max(0, line.debit);
    totalCredit += Math.max(0, line.credit);
  }

  totalDebit = round3(totalDebit);
  totalCredit = round3(totalCredit);

  if (Math.abs(totalDebit - totalCredit) > 0.005) {
    throw new Error(`Écriture comptable déséquilibrée : Total Débit (${totalDebit} TND) != Total Crédit (${totalCredit} TND)`);
  }

  // 2. Insert into database
  const entry = await prisma.accountingEntry.create({
    data: {
      tenantId: data.tenantId,
      journalCode: data.journalCode,
      entryDate: data.entryDate,
      referenceNumber: data.referenceNumber,
      description: data.description,
      invoiceId: data.invoiceId,
      lines: {
        create: data.lines.map((line) => ({
          accountCode: line.accountCode,
          debit: round3(line.debit),
          credit: round3(line.credit),
          description: line.description,
        })),
      },
    },
  });

  return { id: entry.id, success: true };
}

/**
 * Computes 6-column Trial Balance (Balance Générale des Comptes).
 * Columns: Opening Debit, Opening Credit, Period Debit, Period Credit, Closing Debit, Closing Credit.
 */
export async function computeTrialBalance(tenantId: string, startDate?: string, endDate?: string) {
  // Fetch active accounts
  const accounts = await prisma.account.findMany({
    where: { tenantId, isDeleted: false },
    orderBy: { accountCode: 'asc' },
  });

  // Fetch all active entry lines
  const lines = await prisma.entryLine.findMany({
    where: {
      isDeleted: false,
      entry: {
        tenantId,
        isDeleted: false,
        ...(startDate && endDate ? { entryDate: { gte: startDate, lte: endDate } } : {}),
      },
    },
    include: {
      entry: true,
    },
  });

  const totalsByAccount = new Map<string, { debit: number; credit: number }>();

  for (const line of lines) {
    const existing = totalsByAccount.get(line.accountCode) || { debit: 0, credit: 0 };
    existing.debit += line.debit;
    existing.credit += line.credit;
    totalsByAccount.set(line.accountCode, existing);
  }

  let totalPeriodDebit = 0;
  let totalPeriodCredit = 0;
  let totalClosingDebit = 0;
  let totalClosingCredit = 0;

  const rows = accounts.map((acc) => {
    const movements = totalsByAccount.get(acc.accountCode) || { debit: 0, credit: 0 };
    const pDebit = round3(movements.debit);
    const pCredit = round3(movements.credit);

    totalPeriodDebit += pDebit;
    totalPeriodCredit += pCredit;

    const net = round3(pDebit - pCredit);
    const closingDebit = net > 0 ? net : 0;
    const closingCredit = net < 0 ? Math.abs(net) : 0;

    totalClosingDebit += closingDebit;
    totalClosingCredit += closingCredit;

    return {
      accountCode: acc.accountCode,
      accountName: acc.accountName,
      category: acc.accountCategory,
      periodDebit: pDebit,
      periodCredit: pCredit,
      closingDebit,
      closingCredit,
    };
  });

  return {
    rows,
    totals: {
      periodDebit: round3(totalPeriodDebit),
      periodCredit: round3(totalPeriodCredit),
      closingDebit: round3(totalClosingDebit),
      closingCredit: round3(totalClosingCredit),
      isBalanced: Math.abs(totalPeriodDebit - totalPeriodCredit) < 0.01 && Math.abs(totalClosingDebit - totalClosingCredit) < 0.01,
    },
  };
}

/**
 * Computes official NCT 01 Balance Sheet (Bilan) and Income Statement (État de Résultat).
 */
export async function computeFinancialStatements(tenantId: string, year: number): Promise<{
  balanceSheet: BalanceSheetReport;
  incomeStatement: IncomeStatementReport;
}> {
  const trialBalance = await computeTrialBalance(tenantId);
  const rows = trialBalance.rows;

  const getAccountNet = (prefix: string): number => {
    return rows
      .filter((r) => r.accountCode.startsWith(prefix))
      .reduce((sum, r) => sum + (r.closingDebit - r.closingCredit), 0);
  };

  const getAccountCreditNet = (prefix: string): number => {
    return rows
      .filter((r) => r.accountCode.startsWith(prefix))
      .reduce((sum, r) => sum + (r.closingCredit - r.closingDebit), 0);
  };

  // 1. Income Statement (État de Résultat)
  const salesGoods = getAccountCreditNet('707');
  const salesServices = getAccountCreditNet('706');
  const otherRevenues = getAccountCreditNet('75');
  const totalRevenues = round3(salesGoods + salesServices + otherRevenues);

  const purchases = getAccountNet('60');
  const externalServices = getAccountNet('61') + getAccountNet('62');
  const personnel = getAccountNet('63');
  const taxes = getAccountNet('64');
  const depreciation = getAccountNet('68');
  const totalOperatingExpenses = round3(purchases + externalServices + personnel + taxes + depreciation);

  const operatingResult = round3(totalRevenues - totalOperatingExpenses);

  const financialIncome = getAccountCreditNet('76');
  const financialExpenses = getAccountNet('66');
  const financialResult = round3(financialIncome - financialExpenses);

  const ordinaryResultBeforeTax = round3(operatingResult + financialResult);

  // Corporate Income Tax (IS) in Tunisia: 15% standard rate on positive income
  const corporateTax = ordinaryResultBeforeTax > 0 ? round3(ordinaryResultBeforeTax * 0.15) : 0;
  const netIncome = round3(ordinaryResultBeforeTax - corporateTax);

  const incomeStatement: IncomeStatementReport = {
    operatingRevenues: {
      sales: salesGoods,
      services: salesServices,
      otherRevenues,
      total: totalRevenues,
    },
    operatingExpenses: {
      purchases,
      services: externalServices,
      personnel,
      depreciation,
      taxes,
      total: totalOperatingExpenses,
    },
    operatingResult,
    financialIncome,
    financialExpenses,
    financialResult,
    ordinaryResultBeforeTax,
    corporateTax,
    netIncome,
  };

  // 2. Balance Sheet (Bilan)
  // Assets
  const softwareGross = Math.max(0, getAccountNet('21'));
  const softwareAmort = Math.max(0, getAccountCreditNet('281'));
  const tangibleGross = Math.max(0, getAccountNet('22'));
  const tangibleAmort = Math.max(0, getAccountCreditNet('282'));

  const nonCurrentAssetsItems: BalanceSheetItem[] = [
    {
      code: '21',
      label: 'Immobilisations incorporelles',
      grossAmount: softwareGross,
      amortizationOrDepreciation: softwareAmort,
      netAmount: round3(softwareGross - softwareAmort),
    },
    {
      code: '22',
      label: 'Immobilisations corporelles',
      grossAmount: tangibleGross,
      amortizationOrDepreciation: tangibleAmort,
      netAmount: round3(tangibleGross - tangibleAmort),
    },
  ];

  const totalNonCurrentAssets = round3(
    nonCurrentAssetsItems.reduce((sum, item) => sum + item.netAmount, 0)
  );

  const stocksNet = Math.max(0, getAccountNet('3'));
  const clientsNet = Math.max(0, getAccountNet('41'));
  const stateDebtorsNet = round3(
    Math.max(0, getAccountNet('4348') + getAccountNet('4366') + getAccountNet('4368'))
  ); // RS subies, TVA déductible & Crédit TVA
  const bankAndCashNet = Math.max(0, getAccountNet('51') + getAccountNet('53'));

  const currentAssetsItems: BalanceSheetItem[] = [
    { code: '3', label: 'Stocks et encours', grossAmount: stocksNet, amortizationOrDepreciation: 0, netAmount: stocksNet },
    { code: '41', label: 'Clients et comptes rattachés', grossAmount: clientsNet, amortizationOrDepreciation: 0, netAmount: clientsNet },
    { code: '43', label: 'Autres actifs courants (Créances État, TVA déductible, RS subies)', grossAmount: stateDebtorsNet, amortizationOrDepreciation: 0, netAmount: stateDebtorsNet },
    { code: '5', label: 'Liquidités et équivalents (Banque/Caisse)', grossAmount: bankAndCashNet, amortizationOrDepreciation: 0, netAmount: bankAndCashNet },
  ];

  const totalCurrentAssets = round3(
    currentAssetsItems.reduce((sum, item) => sum + item.netAmount, 0)
  );

  const totalAssets = round3(totalNonCurrentAssets + totalCurrentAssets);

  // Equity & Liabilities
  const capitalSocial = Math.max(0, getAccountCreditNet('101'));
  const reserves = Math.max(0, getAccountCreditNet('11'));
  const retainedEarnings = getAccountCreditNet('12');

  const equityItems: BalanceSheetItem[] = [
    { code: '101', label: 'Capital social', grossAmount: capitalSocial, amortizationOrDepreciation: 0, netAmount: capitalSocial },
    { code: '11', label: 'Réserves légales et statutaires', grossAmount: reserves, amortizationOrDepreciation: 0, netAmount: reserves },
    { code: '12', label: 'Report à nouveau', grossAmount: retainedEarnings, amortizationOrDepreciation: 0, netAmount: retainedEarnings },
    { code: '13', label: "Résultat net de l'exercice", grossAmount: netIncome, amortizationOrDepreciation: 0, netAmount: netIncome },
  ];

  const totalEquity = round3(equityItems.reduce((sum, item) => sum + item.netAmount, 0));

  const longTermBorrowings = Math.max(0, getAccountCreditNet('16'));
  const nonCurrentLiabilitiesItems: BalanceSheetItem[] = [
    { code: '16', label: 'Emprunts et dettes non courantes (> 1 an)', grossAmount: longTermBorrowings, amortizationOrDepreciation: 0, netAmount: longTermBorrowings },
  ];
  const totalNonCurrentLiabilities = round3(
    nonCurrentLiabilitiesItems.reduce((sum, item) => sum + item.netAmount, 0)
  );

  const suppliersNet = Math.max(0, getAccountCreditNet('40'));
  // Credit accounts of State + provision for corporate tax
  const stateCreditTaxes = getAccountCreditNet('432') + getAccountCreditNet('4341') + getAccountCreditNet('4342') + getAccountCreditNet('4343') + getAccountCreditNet('4347') + getAccountCreditNet('4365') + getAccountCreditNet('4367');
  const taxAndSocialLiabilities = round3(Math.max(0, stateCreditTaxes) + corporateTax);

  const currentLiabilitiesItems: BalanceSheetItem[] = [
    { code: '40', label: 'Fournisseurs et comptes rattachés', grossAmount: suppliersNet, amortizationOrDepreciation: 0, netAmount: suppliersNet },
    { code: '43', label: 'Dettes fiscales et sociales (TVA, Timbre, TCL, RS, IS dû)', grossAmount: taxAndSocialLiabilities, amortizationOrDepreciation: 0, netAmount: taxAndSocialLiabilities },
  ];

  const totalCurrentLiabilities = round3(
    currentLiabilitiesItems.reduce((sum, item) => sum + item.netAmount, 0)
  );

  const totalEquityAndLiabilities = round3(totalEquity + totalNonCurrentLiabilities + totalCurrentLiabilities);
  const diff = round3(Math.abs(totalAssets - totalEquityAndLiabilities));

  const balanceSheet: BalanceSheetReport = {
    assets: {
      nonCurrent: { title: 'Actifs Non Courants (Immobilisations)', total: totalNonCurrentAssets, items: nonCurrentAssetsItems },
      current: { title: 'Actifs Courants (Stocks, Créances, Trésorerie)', total: totalCurrentAssets, items: currentAssetsItems },
      totalAssets,
    },
    equityAndLiabilities: {
      equity: { title: 'Capitaux Propres', total: totalEquity, items: equityItems },
      nonCurrentLiabilities: { title: 'Passifs Non Courants', total: totalNonCurrentLiabilities, items: nonCurrentLiabilitiesItems },
      currentLiabilities: { title: 'Passifs Courants (Dettes d’exploitation)', total: totalCurrentLiabilities, items: currentLiabilitiesItems },
      totalEquityAndLiabilities,
    },
    isBalanced: diff < 0.05,
    difference: diff,
  };

  return {
    balanceSheet,
    incomeStatement,
  };
}

