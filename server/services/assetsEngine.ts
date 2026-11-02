/**
 * Tunisian Fixed Assets & Depreciation Engine (Norme Comptable Tunisienne NCT 05).
 * Implements:
 * - Linear depreciation schedule calculation (Amortissement Linéaire)
 * - Prorata temporis calculation for first year based on commissioning date
 * - Net Book Value (Valeur Comptable Nette - VCN) tracking
 * - Year-end inventory accounting voucher generation (Débit 681100 / Crédit 282xxx)
 * 
 * STRICT COMPLIANCE: ZERO TYPE NULL.
 */

export interface AmortizationScheduleRow {
  year: number;
  grossValue: number;
  openingAccumulated: number;
  annualDepreciation: number;
  closingAccumulated: number;
  netBookValue: number; // VCN
}

export interface FixedAssetInput {
  assetCode: string;
  name: string;
  category: string;
  acquisitionDate: string; // YYYY-MM-DD
  commissioningDate: string; // YYYY-MM-DD
  originalValueHt: number;
  depreciationRate: number; // e.g. 20 for 20% or 0.20
  amortizationMethod?: 'LINEAIRE';
  assetAccountCode: string;
  amortAccountCode: string;
  dotationAccountCode?: string;
}

export class TunisianAssetsEngine {
  /**
   * Normalizes the rate (handles either 0.20 or 20 for 20%).
   */
  public static normalizeRate(rate: number): number {
    return rate > 1.0 ? rate / 100.0 : rate;
  }

  /**
   * Computes the number of days between two YYYY-MM-DD dates in a fiscal year.
   */
  private static getDaysInYearFromDate(dateStr: string): { daysActive: number; totalDays: number } {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const commDate = new Date(year, month, day);
    const endOfYear = new Date(year, 11, 31);
    const startOfYear = new Date(year, 0, 1);

    const totalDays = Math.round((endOfYear.getTime() - startOfYear.getTime()) / (1000 * 3600 * 24)) + 1;
    const daysActive = Math.max(1, Math.round((endOfYear.getTime() - commDate.getTime()) / (1000 * 3600 * 24)) + 1);

    return { daysActive, totalDays };
  }

  /**
   * Generates complete linear amortization schedule according to NCT 05.
   */
  public static generateSchedule(asset: FixedAssetInput): AmortizationScheduleRow[] {
    const gross = Math.max(0, asset.originalValueHt);
    const rate = this.normalizeRate(asset.depreciationRate);

    if (rate <= 0 || gross <= 0) {
      return [];
    }

    const durationYears = Math.ceil(1.0 / rate);
    const startYear = parseInt(asset.commissioningDate.split('-')[0], 10);
    const { daysActive, totalDays } = this.getDaysInYearFromDate(asset.commissioningDate);

    const schedule: AmortizationScheduleRow[] = [];
    let accumulated = 0;

    // First Year: Prorata Temporis
    const fullAnnual = gross * rate;
    const firstYearDotation = Math.min(
      gross,
      Math.round(fullAnnual * (daysActive / totalDays) * 1000) / 1000
    );
    accumulated += firstYearDotation;

    schedule.push({
      year: startYear,
      grossValue: gross,
      openingAccumulated: 0,
      annualDepreciation: firstYearDotation,
      closingAccumulated: accumulated,
      netBookValue: Math.max(0, Math.round((gross - accumulated) * 1000) / 1000),
    });

    // Intermediate Years
    let currentYear = startYear + 1;
    while (accumulated < gross && schedule.length < durationYears + 2) {
      const remaining = Math.round((gross - accumulated) * 1000) / 1000;
      const annual = Math.min(remaining, Math.round(fullAnnual * 1000) / 1000);

      const opening = accumulated;
      accumulated = Math.round((accumulated + annual) * 1000) / 1000;

      schedule.push({
        year: currentYear,
        grossValue: gross,
        openingAccumulated: opening,
        annualDepreciation: annual,
        closingAccumulated: accumulated,
        netBookValue: Math.max(0, Math.round((gross - accumulated) * 1000) / 1000),
      });

      if (accumulated >= gross) {
        break;
      }
      currentYear++;
    }

    return schedule;
  }

  /**
   * Computes the depreciation amount for a specific fiscal year.
   */
  public static getDotationForYear(asset: FixedAssetInput, year: number): number {
    const schedule = this.generateSchedule(asset);
    const row = schedule.find((r) => r.year === year);
    return row !== undefined ? row.annualDepreciation : 0;
  }

  /**
   * Generates the year-end inventory voucher lines (Journal OD - Dotations).
   * Débit: 681100 Dotations aux amortissements des immobilisations
   * Crédit: amortAccountCode (e.g. 282800) Amortissement
   */
  public static generateDotationVoucherLines(
    asset: FixedAssetInput,
    year: number
  ): Array<{ accountCode: string; accountName: string; debit: number; credit: number }> {
    const dotation = this.getDotationForYear(asset, year);
    if (dotation <= 0) {
      return [];
    }

    const dotationAccount = asset.dotationAccountCode || '681100';

    return [
      {
        accountCode: dotationAccount,
        accountName: `Dotation amortissement ${asset.name} (${year})`,
        debit: dotation,
        credit: 0,
      },
      {
        accountCode: asset.amortAccountCode,
        accountName: `Amortissement cumulé ${asset.name}`,
        debit: 0,
        credit: dotation,
      },
    ];
  }
}

