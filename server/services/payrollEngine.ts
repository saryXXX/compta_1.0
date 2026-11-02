/**
 * Tunisian Payroll Engine (Moteur de Paie et Charges Sociales Tunisiennes).
 * Implements:
 * - CNSS Employee (9.18%) and Employer (16.57%)
 * - Barème Progressif IRPP Tunisien (Loi de Finances)
 * - Déductions familiales (Chef de famille 300 DT/an, enfants à charge 100 DT/an chacun)
 * - Déduction forfaitaire pour frais professionnels (10%, max 2,000 DT/an)
 * - CSS (Contribution Sociale de Solidarité 1%)
 * - TFP (1% ou 2%) & FOPROLOS (1%)
 * - Automated double-entry balanced voucher generator (Journal OD/PAIE)
 * 
 * STRICT COMPLIANCE: ZERO TYPE NULL.
 */

export interface TunisianSalaryCalculationInput {
  baseSalary: number;
  maritalStatus: 'CELIBATAIRE' | 'MARIE' | 'DIVORCE' | 'VEUF';
  dependentChildren: number;
  tfpRate?: number; // default 0.02 (2% services/commerce) or 0.01 (1% industrie)
  foprolosRate?: number; // default 0.01 (1%)
  cssRate?: number; // default 0.01 (1%)
}

export interface TunisianPayrollSlipResult {
  grossSalary: number;
  cnssEmployee: number;
  taxableSalary: number;
  professionalDeduction: number;
  familyDeduction: number;
  annualTaxableBase: number;
  annualIrpp: number;
  irppWithheld: number;
  cssAmount: number;
  netSalary: number;
  // Employer contributions
  cnssEmployer: number;
  tfpAmount: number;
  foprolosAmount: number;
  totalEmployerCost: number;
}

export interface AccountingVoucherLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export class TunisianPayrollEngine {
  public static readonly CNSS_EMPLOYEE_RATE = 0.0918; // 9.18%
  public static readonly CNSS_EMPLOYER_RATE = 0.1657; // 16.57% (16% + 0.57% accidents)
  public static readonly DEFAULT_TFP_RATE = 0.02; // 2%
  public static readonly DEFAULT_FOPROLOS_RATE = 0.01; // 1%
  public static readonly DEFAULT_CSS_RATE = 0.01; // 1%

  /**
   * Calculates monthly Tunisian payroll details with exact centimes/millimes.
   */
  public static calculatePayroll(input: TunisianSalaryCalculationInput): TunisianPayrollSlipResult {
    const gross = Math.max(0, input.baseSalary);
    const tfpRate = input.tfpRate !== undefined ? input.tfpRate : this.DEFAULT_TFP_RATE;
    const foprolosRate = input.foprolosRate !== undefined ? input.foprolosRate : this.DEFAULT_FOPROLOS_RATE;
    const cssRate = input.cssRate !== undefined ? input.cssRate : this.DEFAULT_CSS_RATE;

    // 1. CNSS Salarié (9.18%)
    const cnssEmployee = Math.round(gross * this.CNSS_EMPLOYEE_RATE * 1000) / 1000;

    // 2. Salaire Brut Imposable Mensuel
    const monthlyTaxableGross = Math.max(0, gross - cnssEmployee);

    // 3. Extrapolation Annuelle pour le barème IRPP
    const annualTaxableGross = monthlyTaxableGross * 12;

    // 4. Déduction forfaitaire pour frais professionnels (10%, plafonnée à 2 000 DT/an)
    const annualProfDeduction = Math.min(annualTaxableGross * 0.10, 2000.0);

    // 5. Déductions familiales annuelles
    let annualFamilyDeduction = 0;
    if (input.maritalStatus === 'MARIE') {
      annualFamilyDeduction += 300.0; // 300 DT / an pour le conjoint à charge
    }
    // 100 DT / an par enfant à charge jusqu'à 4 enfants
    const eligibleChildren = Math.min(Math.max(0, input.dependentChildren), 4);
    annualFamilyDeduction += eligibleChildren * 100.0;

    // 6. Revenu Net Imposable Annuel
    const annualTaxableBase = Math.max(0, annualTaxableGross - annualProfDeduction - annualFamilyDeduction);

    // 7. Barème progressif IRPP Tunisien (Tranches annuelles en Dinars)
    // 0 à 5 000 DT : 0%
    // 5 000,001 à 20 000 DT : 26%
    // 20 000,001 à 30 000 DT : 28%
    // 30 000,001 à 50 000 DT : 32%
    // > 50 000 DT : 35%
    let annualIrpp = 0;
    if (annualTaxableBase > 50000) {
      annualIrpp += (annualTaxableBase - 50000) * 0.35;
      annualIrpp += 20000 * 0.32; // tranche 30 000 à 50 000
      annualIrpp += 10000 * 0.28; // tranche 20 000 à 30 000
      annualIrpp += 15000 * 0.26; // tranche 5 000 à 20 000
    } else if (annualTaxableBase > 30000) {
      annualIrpp += (annualTaxableBase - 30000) * 0.32;
      annualIrpp += 10000 * 0.28;
      annualIrpp += 15000 * 0.26;
    } else if (annualTaxableBase > 20000) {
      annualIrpp += (annualTaxableBase - 20000) * 0.28;
      annualIrpp += 15000 * 0.26;
    } else if (annualTaxableBase > 5000) {
      annualIrpp += (annualTaxableBase - 5000) * 0.26;
    }

    // Retenue mensuelle IRPP
    const irppWithheld = Math.round((annualIrpp / 12) * 1000) / 1000;

    // 8. CSS (Contribution Sociale de Solidarité 1% du salaire imposable mensuel)
    const cssAmount = Math.round(monthlyTaxableGross * cssRate * 1000) / 1000;

    // 9. Salaire Net à Payer
    const netSalary = Math.round((gross - cnssEmployee - irppWithheld - cssAmount) * 1000) / 1000;

    // 10. Charges Patronales
    const cnssEmployer = Math.round(gross * this.CNSS_EMPLOYER_RATE * 1000) / 1000;
    const tfpAmount = Math.round(gross * tfpRate * 1000) / 1000;
    const foprolosAmount = Math.round(gross * foprolosRate * 1000) / 1000;
    const totalEmployerCost = Math.round((gross + cnssEmployer + tfpAmount + foprolosAmount) * 1000) / 1000;

    return {
      grossSalary: gross,
      cnssEmployee,
      taxableSalary: monthlyTaxableGross,
      professionalDeduction: Math.round((annualProfDeduction / 12) * 1000) / 1000,
      familyDeduction: Math.round((annualFamilyDeduction / 12) * 1000) / 1000,
      annualTaxableBase: Math.round(annualTaxableBase * 1000) / 1000,
      annualIrpp: Math.round(annualIrpp * 1000) / 1000,
      irppWithheld,
      cssAmount,
      netSalary,
      cnssEmployer,
      tfpAmount,
      foprolosAmount,
      totalEmployerCost,
    };
  }

  /**
   * Generates a strictly balanced double-entry accounting voucher for a monthly payroll.
   * Journal: OD / PAIE
   * Débit:
   *  - 641100 Salaires de base (Gross)
   *  - 645100 Charges de sécurité sociale patronale (CNSS patronale)
   *  - 647100 Taxes sur salaires (TFP & FOPROLOS)
   * Crédit:
   *  - 453100 Sécurité sociale (CNSS Salarié + Patronale)
   *  - 432100 État, retenues à la source (IRPP + CSS)
   *  - 437100 État, autres impôts et taxes (TFP + FOPROLOS)
   *  - 421100 Personnel, rémunérations dues (Net à payer)
   */
  public static generateAccountingVoucher(
    slip: TunisianPayrollSlipResult,
    employeeName: string,
    periodLabel: string
  ): AccountingVoucherLine[] {
    const lines: AccountingVoucherLine[] = [];

    // Débits (Charges d'exploitation)
    lines.push({
      accountCode: '641100',
      accountName: `Salaires de base - ${employeeName} (${periodLabel})`,
      debit: slip.grossSalary,
      credit: 0,
    });

    lines.push({
      accountCode: '645100',
      accountName: `Charges sociales patronales CNSS - ${employeeName}`,
      debit: slip.cnssEmployer,
      credit: 0,
    });

    const totalTaxesSalaires = Math.round((slip.tfpAmount + slip.foprolosAmount) * 1000) / 1000;
    lines.push({
      accountCode: '647100',
      accountName: `TFP et FOPROLOS - ${employeeName}`,
      debit: totalTaxesSalaires,
      credit: 0,
    });

    // Crédits (Dettes sociales, fiscales et personnel)
    const totalCnssDue = Math.round((slip.cnssEmployee + slip.cnssEmployer) * 1000) / 1000;
    lines.push({
      accountCode: '453100',
      accountName: `CNSS à payer (Salarié + Patronal) - ${employeeName}`,
      debit: 0,
      credit: totalCnssDue,
    });

    const totalFiscalWithheld = Math.round((slip.irppWithheld + slip.cssAmount) * 1000) / 1000;
    lines.push({
      accountCode: '432100',
      accountName: `État, IRPP et CSS retenus à la source - ${employeeName}`,
      debit: 0,
      credit: totalFiscalWithheld,
    });

    lines.push({
      accountCode: '437100',
      accountName: `État, TFP et FOPROLOS dus - ${employeeName}`,
      debit: 0,
      credit: totalTaxesSalaires,
    });

    lines.push({
      accountCode: '421100',
      accountName: `Personnel, rémunération nette due - ${employeeName}`,
      debit: 0,
      credit: slip.netSalary,
    });

    // Verify balance and correct micro-millime rounding discrepancy on the net salary line if any
    const totalDebit = lines.reduce((acc, l) => acc + l.debit, 0);
    const totalCredit = lines.reduce((acc, l) => acc + l.credit, 0);
    const diff = Math.round((totalDebit - totalCredit) * 1000) / 1000;
    if (diff !== 0) {
      const netLine = lines.find((l) => l.accountCode === '421100');
      if (netLine) {
        netLine.credit = Math.round((netLine.credit + diff) * 1000) / 1000;
      }
    }

    return lines;
  }
}

