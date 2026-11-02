/**
 * Tunisian Tax Package Engine (Liasse Fiscale & Détermination du Résultat Fiscal).
 * Implements:
 * - Tableau de passage du résultat comptable avant impôt au résultat fiscal (Code IRPP/IS)
 * - Réintégrations fiscales (Amendes fiscales, amortissements excédentaires, charges non justifiées)
 * - Déductions fiscales (Dividendes reçus de filiales tunisiennes, dégrèvements d'investissement)
 * - Calcul de l'Impôt sur les Sociétés (IS) : Taux 15%, 10% ou 35%
 * - Calcul du Minimum d'IS (0.2% du CA TTC / Plancher légal)
 * - Imputation des Acomptes Provisionnels (AP1, AP2, AP3) et Retenues à la Source (RS)
 * - Détermination du reliquat d'IS à payer ou de l'excédent / crédit d'impôt reportable
 * 
 * STRICT COMPLIANCE: ZERO TYPE NULL.
 */

export interface FiscalAdjustmentItem {
  id?: string;
  adjustmentType: 'REINTEGRATION' | 'DEDUCTION';
  label: string;
  amount: number;
  notes?: string;
}

export interface TaxReconciliationInput {
  accountingProfitBeforeTax: number;
  turnoverTtc: number;
  turnoverHt: number;
  isTaxRate?: number; // default 0.15 (15%)
  minTaxRate?: number; // default 0.002 (0.2%)
  minTaxFloor?: number; // default 300 DT / 500 DT
  adjustments: FiscalAdjustmentItem[];
  priorYearDeficitsCarriedForward?: number; // Déficits antérieurs reportables
  apPaidTotal?: number; // Somme des AP payés (AP1 + AP2 + AP3)
  withholdingTaxSuffered?: number; // Retenues à la source subies (compte 4348)
}

export interface TaxReconciliationResult {
  accountingProfitBeforeTax: number;
  totalReintegrations: number;
  totalDeductions: number;
  priorDeficitsDeducted: number;
  netFiscalProfit: number;
  isDeficit: boolean;
  applicableIsRate: number;
  calculatedIs: number;
  minimumIs: number;
  grossIsDue: number; // Max(CalculatedIS, MinimumIS) or MinimumIS if deficit
  apDeducted: number;
  withholdingTaxDeducted: number;
  totalPrepaymentsDeducted: number;
  balancePayable: number;
  taxCreditCarriedForward: number;
}

export class TunisianTaxReconciliationEngine {
  public static readonly DEFAULT_IS_RATE = 0.15; // 15% standard rate
  public static readonly DEFAULT_MIN_TAX_RATE = 0.002; // 0.2% of turnover
  public static readonly DEFAULT_MIN_FLOOR = 300.0; // 300 DT minimum floor

  /**
   * Calculates the complete Tunisian tax reconciliation and corporate income tax (IS) liquidation.
   */
  public static computeTaxReconciliation(input: TaxReconciliationInput): TaxReconciliationResult {
    const isRate = input.isTaxRate !== undefined ? input.isTaxRate : this.DEFAULT_IS_RATE;
    const minTaxRate = input.minTaxRate !== undefined ? input.minTaxRate : this.DEFAULT_MIN_TAX_RATE;
    const minFloor = input.minTaxFloor !== undefined ? input.minTaxFloor : this.DEFAULT_MIN_FLOOR;

    const accountingProfit = Math.round(input.accountingProfitBeforeTax * 1000) / 1000;

    // 1. Sum up Réintégrations
    const reintegrations = input.adjustments
      .filter((a) => a.adjustmentType === 'REINTEGRATION')
      .reduce((sum, a) => sum + Math.max(0, a.amount), 0);
    const totalReintegrations = Math.round(reintegrations * 1000) / 1000;

    // 2. Sum up Déductions ordinaires
    const regularDeductions = input.adjustments
      .filter((a) => a.adjustmentType === 'DEDUCTION')
      .reduce((sum, a) => sum + Math.max(0, a.amount), 0);
    const totalRegularDeductions = Math.round(regularDeductions * 1000) / 1000;

    // Intermediate fiscal base before prior deficits
    const intermediateBase = accountingProfit + totalReintegrations - totalRegularDeductions;

    // 3. Imputation des déficits antérieurs reportables (plafonné au bénéfice positif)
    let priorDeficitsDeducted = 0;
    if (intermediateBase > 0 && input.priorYearDeficitsCarriedForward !== undefined && input.priorYearDeficitsCarriedForward > 0) {
      priorDeficitsDeducted = Math.min(intermediateBase, input.priorYearDeficitsCarriedForward);
      priorDeficitsDeducted = Math.round(priorDeficitsDeducted * 1000) / 1000;
    }

    const netFiscalProfit = Math.round((intermediateBase - priorDeficitsDeducted) * 1000) / 1000;
    const isDeficit = netFiscalProfit <= 0;

    // 4. Calcul de l'IS théorique
    let calculatedIs = 0;
    if (netFiscalProfit > 0) {
      calculatedIs = Math.round(netFiscalProfit * isRate * 1000) / 1000;
    }

    // 5. Calcul du minimum d'impôt (0.2% du CA TTC avec plancher légal)
    const turnoverBase = input.turnoverTtc > 0 ? input.turnoverTtc : input.turnoverHt;
    const minCalculated = Math.round(turnoverBase * minTaxRate * 1000) / 1000;
    const minimumIs = Math.max(minCalculated, minFloor);

    // 6. Impôt Brut Dû
    // En droit fiscal tunisien, le minimum d'IS est exigible même en cas d'exercice déficitaire
    const grossIsDue = isDeficit ? minimumIs : Math.max(calculatedIs, minimumIs);

    // 7. Imputation des avances et acomptes payés
    const apPaid = input.apPaidTotal !== undefined ? Math.max(0, input.apPaidTotal) : 0;
    const rsSuffered = input.withholdingTaxSuffered !== undefined ? Math.max(0, input.withholdingTaxSuffered) : 0;
    const totalPrepayments = Math.round((apPaid + rsSuffered) * 1000) / 1000;

    let balancePayable = 0;
    let taxCreditCarriedForward = 0;

    if (grossIsDue >= totalPrepayments) {
      balancePayable = Math.round((grossIsDue - totalPrepayments) * 1000) / 1000;
      taxCreditCarriedForward = 0;
    } else {
      balancePayable = 0;
      taxCreditCarriedForward = Math.round((totalPrepayments - grossIsDue) * 1000) / 1000;
    }

    return {
      accountingProfitBeforeTax: accountingProfit,
      totalReintegrations,
      totalDeductions: totalRegularDeductions,
      priorDeficitsDeducted,
      netFiscalProfit,
      isDeficit,
      applicableIsRate: isRate,
      calculatedIs,
      minimumIs,
      grossIsDue,
      apDeducted: apPaid,
      withholdingTaxDeducted: rsSuffered,
      totalPrepaymentsDeducted: totalPrepayments,
      balancePayable,
      taxCreditCarriedForward,
    };
  }
}

