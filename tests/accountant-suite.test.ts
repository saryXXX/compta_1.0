/**
 * Automated Unit & Integration Tests for Tunisian Accountant / CFO Suite.
 * Validates:
 * 1. Tunisian Payroll Engine (CNSS, IRPP brackets, CSS, TFP, FOPROLOS, voucher balance)
 * 2. NCT 05 Fixed Assets Engine (Linear schedule, prorata temporis, dotations)
 * 3. Bank Reconciliation Engine (Formal statement, dual balance reconciliation, matching)
 * 4. Tax Package Engine (Passage résultat comptable au fiscal, IS 15%, minimum d'IS 0.2%, AP deductions)
 * 5. Fiscal Closing Engine (Soldage 6 & 7, Journal AN equilibrium)
 * 
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import { TunisianPayrollEngine } from '../server/services/payrollEngine.js';
import { TunisianAssetsEngine } from '../server/services/assetsEngine.js';
import { TunisianBankReconciliationEngine } from '../server/services/bankReconciliationEngine.js';
import { TunisianTaxReconciliationEngine } from '../server/services/taxReconciliationEngine.js';
import { TunisianFiscalClosingEngine } from '../server/services/fiscalClosingEngine.js';
import { prisma } from '../server/db.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✔ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('=== RUNNING ACCOUNTANT SUITE TEST SUITE ===\n');

  // ----------------------------------------------------
  // TEST GROUP 1: Tunisian Payroll Engine
  // ----------------------------------------------------
  console.log('--- TEST GROUP 1: Tunisian Payroll Engine ---');
  const payroll1 = TunisianPayrollEngine.calculatePayroll({
    baseSalary: 1500.0,
    maritalStatus: 'MARIE',
    dependentChildren: 2,
  });

  // CNSS Employee = 1500 * 0.0918 = 137.700
  assert(Math.abs(payroll1.cnssEmployee - 137.700) < 0.005, 'CNSS employee contribution is exactly 9.18% (137.700 DT)');
  // Taxable salary = 1500 - 137.7 = 1362.300
  assert(Math.abs(payroll1.taxableSalary - 1362.300) < 0.005, 'Monthly taxable gross salary is 1362.300 DT');
  // Net salary is positive and calculated
  assert(payroll1.netSalary > 1000 && payroll1.netSalary < 1500, `Net salary is realistic (${payroll1.netSalary.toFixed(3)} DT)`);
  // CNSS Employer = 1500 * 0.1657 = 248.550
  assert(Math.abs(payroll1.cnssEmployer - 248.550) < 0.005, 'CNSS employer contribution is 16.57% (248.550 DT)');
  // TFP (2%) = 30 DT, FOPROLOS (1%) = 15 DT
  assert(Math.abs(payroll1.tfpAmount - 30.0) < 0.005, 'TFP is 2% (30.000 DT)');
  assert(Math.abs(payroll1.foprolosAmount - 15.0) < 0.005, 'FOPROLOS is 1% (15.000 DT)');

  // Accounting Voucher Equilibrium Test
  const voucherLines = TunisianPayrollEngine.generateAccountingVoucher(
    payroll1,
    'Sami Mansour',
    '01/2025'
  );
  const totDebitVoucher = voucherLines.reduce((s, l) => s + l.debit, 0);
  const totCreditVoucher = voucherLines.reduce((s, l) => s + l.credit, 0);
  assert(
    Math.abs(totDebitVoucher - totCreditVoucher) < 0.005,
    `Payroll voucher is strictly balanced: Débit ${totDebitVoucher.toFixed(3)} DT == Crédit ${totCreditVoucher.toFixed(3)} DT`
  );

  // ----------------------------------------------------
  // TEST GROUP 2: Fixed Assets NCT 05 Engine
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 2: Fixed Assets NCT 05 Engine ---');
  const assetInput = {
    assetCode: 'IMM-TEST-01',
    name: 'Serveur Informatique Dell',
    category: 'MATERIEL_INFO',
    acquisitionDate: '2024-07-01',
    commissioningDate: '2024-07-01',
    originalValueHt: 6000.0,
    depreciationRate: 33.333, // 3 years
    assetAccountCode: '228000',
    amortAccountCode: '282800',
    dotationAccountCode: '681100',
  };

  const schedule = TunisianAssetsEngine.generateSchedule(assetInput);
  assert(schedule.length >= 3, `Amortization schedule generated ${schedule.length} annual rows`);
  
  // Prorata temporis check for year 2024 (half year ~50% of annual ~2000 => ~1000 DT)
  const dotation2024 = schedule[0].annualDepreciation;
  assert(dotation2024 > 900 && dotation2024 < 1100, `First year prorata temporis dotation is correct (~${dotation2024.toFixed(3)} DT)`);

  // Final Net Book Value must reach 0.000 DT
  const finalRow = schedule[schedule.length - 1];
  assert(finalRow.netBookValue < 0.01, `Final Net Book Value (VCN) reaches 0 DT (${finalRow.netBookValue.toFixed(3)} DT)`);
  assert(Math.abs(finalRow.closingAccumulated - 6000.0) < 0.01, 'Accumulated depreciation equals original value 6000.000 DT');

  const dotationLines = TunisianAssetsEngine.generateDotationVoucherLines(assetInput, 2024);
  assert(dotationLines.length === 2, 'Generated 2 lines for inventory dotations voucher (681100 / 282800)');
  assert(dotationLines[0].debit === dotationLines[1].credit, 'Dotation voucher lines are equal');

  // ----------------------------------------------------
  // TEST GROUP 3: Bank Reconciliation Engine
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 3: Bank Reconciliation Engine ---');
  const mockBankLines = [
    { id: 'B1', operationDate: '2025-01-05', valueDate: '2025-01-05', description: 'Virement client Alpha', debit: 0, credit: 5000.0, isReconciled: true, reconciledEntryLineId: 'L1' },
    { id: 'B2', operationDate: '2025-01-10', valueDate: '2025-01-10', description: 'Frais tenue compte', debit: 25.0, credit: 0, isReconciled: false },
  ];

  const mockLedgerLines = [
    { id: 'L1', entryId: 'E1', journalCode: 'BQ', entryDate: '2025-01-05', referenceNumber: 'VIR-01', accountCode: '512100', description: 'Virement client Alpha', debit: 5000.0, credit: 0, isReconciled: true },
    { id: 'L2', entryId: 'E2', journalCode: 'BQ', entryDate: '2025-01-20', referenceNumber: 'CHQ-99', accountCode: '512100', description: 'Chèque émis fournisseur Beta', debit: 0, credit: 1200.0, isReconciled: false },
  ];

  const reconReport = TunisianBankReconciliationEngine.calculateReconciliation(mockBankLines, mockLedgerLines);
  // Bank balance = 5000 - 25 = 4975
  assert(Math.abs(reconReport.bankStatementClosingBalance - 4975.0) < 0.005, 'Bank statement closing balance is 4975.000 DT');
  // Book balance = 5000 - 1200 = 3800
  assert(Math.abs(reconReport.accountingBookBalance - 3800.0) < 0.005, 'Accounting book balance is 3800.000 DT');
  // Unpresented checks = 1200
  assert(Math.abs(reconReport.unpresentedCompanyChecks - 1200.0) < 0.005, 'Unpresented checks total is 1200.000 DT');
  // Unrecorded bank debits = 25
  assert(Math.abs(reconReport.unrecordedBankDebits - 25.0) < 0.005, 'Unrecorded bank fees is 25.000 DT');

  // Suggest match test
  const suggestions = TunisianBankReconciliationEngine.suggestMatches(
    [{ id: 'B3', operationDate: '2025-01-22', valueDate: '2025-01-22', description: 'Encaissement chèque', debit: 1200.0, credit: 0, isReconciled: false }],
    [{ id: 'L2', entryId: 'E2', journalCode: 'BQ', entryDate: '2025-01-20', referenceNumber: 'CHQ-99', accountCode: '512100', description: 'Chèque fournisseur', debit: 0, credit: 1200.0, isReconciled: false }]
  );
  assert(suggestions.length === 1, 'Automatic matcher suggested 1 match for opposing 1200.000 DT entries');

  // ----------------------------------------------------
  // TEST GROUP 4: Tunisian Tax Reconciliation (Liasse Fiscale & IS)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 4: Tax Reconciliation Engine (IS) ---');
  const taxResult = TunisianTaxReconciliationEngine.computeTaxReconciliation({
    accountingProfitBeforeTax: 25000.0,
    turnoverHt: 100000.0,
    turnoverTtc: 119000.0,
    adjustments: [
      { adjustmentType: 'REINTEGRATION', label: 'Amendes fiscales', amount: 800.0 },
      { adjustmentType: 'REINTEGRATION', label: 'Amortissement excédentaire', amount: 1200.0 },
      { adjustmentType: 'DEDUCTION', label: 'Dividendes reçus filiale', amount: 3000.0 },
    ],
    apPaidTotal: 2500.0,
    withholdingTaxSuffered: 500.0,
  });

  // Net fiscal profit = 25000 + 800 + 1200 - 3000 = 24000
  assert(Math.abs(taxResult.netFiscalProfit - 24000.0) < 0.005, 'Net taxable profit is 24000.000 DT');
  // Calculated IS (15%) = 24000 * 0.15 = 3600
  assert(Math.abs(taxResult.calculatedIs - 3600.0) < 0.005, 'Calculated IS at standard 15% is 3600.000 DT');
  // Minimum IS (0.2% of 119000) = 238 DT, floor is 300 DT => 300 DT
  assert(Math.abs(taxResult.minimumIs - 300.0) < 0.005, 'Minimum IS is 300.000 DT (plancher légal)');
  // Gross IS due = max(3600, 300) = 3600 DT
  assert(Math.abs(taxResult.grossIsDue - 3600.0) < 0.005, 'Gross IS due is 3600.000 DT');
  // Balance payable = 3600 - (2500 + 500) = 600 DT
  assert(Math.abs(taxResult.balancePayable - 600.0) < 0.005, 'Remaining IS balance due is 600.000 DT');

  // ----------------------------------------------------
  // TEST GROUP 5: Fiscal Closing & Journal AN Integration
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 5: Fiscal Closing Engine ---');
  const demoTenant = await prisma.tenant.findFirst({
    where: { isDeleted: false },
  });

  if (demoTenant) {
    // Execute a simulated fiscal closing for year 2023
    const closingRes = await TunisianFiscalClosingEngine.executeClosing(demoTenant.id, 2023);
    assert(closingRes.fiscalYear === 2023, 'Fiscal year closing executed for 2023');
    assert(closingRes.isEquilibrated === true, `Journal des À-Nouveaux AN-2024 is strictly equilibrated (Débit ${closingRes.anTotalDebit} == Crédit ${closingRes.anTotalCredit})`);
  } else {
    console.log('Skipping DB closing test as no tenant found');
  }

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});

