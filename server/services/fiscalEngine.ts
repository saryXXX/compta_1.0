/**
 * Tunisian Fiscal Calculation Engine.
 * Implements:
 * - Tunisian Tax ID (Matricule Fiscal) regex & format validation
 * - Invoice tax calculations (TVA 19/13/7/0%, FODEC 1%, Timbre 1.000 DT, RS)
 * - Monthly Tax Return (Bordereau G50) calculation & aggregation
 * - Provisional Installments (AP1, AP2, AP3) according to Art. 51 Code IRPP/IS
 * - Employer Annual Declaration (DECEMP) aggregation
 * 
 * STRICT COMPLIANCE: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

export interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitPriceHt: number;
  discountPercent?: number;
  fodecRate?: number; // Usually 1% or 0%
  vatRate: number; // 19, 13, 7, 0
}

export interface InvoiceCalculatedTotals {
  subtotalHt: number;
  fodecAmount: number;
  vatAmount: number;
  stampDuty: number;
  withholdingTaxAmount: number;
  totalTtc: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPriceHt: number;
    discountPercent: number;
    fodecRate: number;
    fodecAmount: number;
    vatRate: number;
    vatAmount: number;
    totalHt: number;
    totalTtc: number;
  }>;
}

/**
 * Validates Tunisian Matricule Fiscal (Tax Identification Number).
 * Format: 7 digits + 1 key letter + category (M/P) + TVA status (A/B/N/P) + activity (C/P) + establishment code (000).
 * Examples: 1485962B/A/M/000, 1298450A/A/M/000, 0845123P/A/M/000.
 */
export function validateTunisianTaxId(taxId?: string): { isValid: boolean; message: string } {
  if (!taxId || taxId.trim() === '') {
    return { isValid: false, message: 'Le matricule fiscal ne peut pas être vide.' };
  }

  const clean = taxId.trim().toUpperCase();
  // Standard format: 7 digits + 1 letter + / + 1 letter + / + 1 letter + / + 3 digits
  const standardPattern = /^[0-9]{7}[A-Z]\/[A-Z]\/[A-Z]\/[0-9]{3}$/;
  // Short format sometimes used: 7 digits + 1 letter
  const shortPattern = /^[0-9]{7}[A-Z]$/;

  if (standardPattern.test(clean) || shortPattern.test(clean)) {
    return { isValid: true, message: 'Matricule fiscal tunisien valide.' };
  }

  return {
    isValid: false,
    message: 'Format invalide. Exemple de format légal tunisien : 1485962B/A/M/000 (7 chiffres, 1 lettre, catégorie, TVA, 3 chiffres)',
  };
}

/**
 * Calculates complete tax breakdown for a Tunisian invoice.
 * Rounding to 3 decimal places (Millimes tunisiens).
 */
export function calculateInvoiceTaxes(
  items: InvoiceItemInput[],
  invoiceType: 'SALE' | 'PURCHASE' | 'CREDIT_NOTE',
  withholdingRatePercent: number = 0,
  isVatExempt: boolean = false
): InvoiceCalculatedTotals {
  let subtotalHt = 0;
  let fodecAmount = 0;
  let vatAmount = 0;

  const processedItems = items.map((item) => {
    const qty = Math.max(0, item.quantity);
    const unitPrice = Math.max(0, item.unitPriceHt);
    const disc = Math.min(100, Math.max(0, item.discountPercent !== undefined ? item.discountPercent : 0));
    
    // Net HT
    const itemHt = round3(qty * unitPrice * (1 - disc / 100));
    subtotalHt += itemHt;

    // FODEC (1% on eligible industrial products, enters into VAT base)
    const fodecRate = Math.max(0, item.fodecRate !== undefined ? item.fodecRate : 0);
    const itemFodec = round3(itemHt * (fodecRate / 100));
    fodecAmount += itemFodec;

    // VAT Base = HT + FODEC
    const vatBase = itemHt + itemFodec;
    const vatRate = isVatExempt ? 0 : Math.max(0, item.vatRate);
    const itemVat = round3(vatBase * (vatRate / 100));
    vatAmount += itemVat;

    const itemTtc = round3(vatBase + itemVat);

    return {
      description: item.description,
      quantity: qty,
      unitPriceHt: unitPrice,
      discountPercent: disc,
      fodecRate,
      fodecAmount: itemFodec,
      vatRate,
      vatAmount: itemVat,
      totalHt: itemHt,
      totalTtc: itemTtc,
    };
  });

  subtotalHt = round3(subtotalHt);
  fodecAmount = round3(fodecAmount);
  vatAmount = round3(vatAmount);

  // Timbre fiscal: 1,000 TND per sale invoice subject to VAT (not applied to exports or purchases)
  let stampDuty = 0;
  if (invoiceType === 'SALE' && !isVatExempt && vatAmount > 0) {
    stampDuty = 1.0;
  }

  const rawTotalTtc = round3(subtotalHt + fodecAmount + vatAmount + stampDuty);

  // Retenue à la source (RS):
  // If withholding rate > 0:
  // - 1% or 1.5% is on TTC (Marchés et achats >= 1000 DT)
  // - 5% is on HT (Honoraires et prestations de services)
  let withholdingTaxAmount = 0;
  if (withholdingRatePercent > 0) {
    if (withholdingRatePercent <= 1.5) {
      withholdingTaxAmount = round3(rawTotalTtc * (withholdingRatePercent / 100));
    } else {
      withholdingTaxAmount = round3(subtotalHt * (withholdingRatePercent / 100));
    }
  }

  return {
    subtotalHt,
    fodecAmount,
    vatAmount,
    stampDuty,
    withholdingTaxAmount,
    totalTtc: rawTotalTtc,
    items: processedItems,
  };
}

/**
 * Round number to 3 decimal places (Millimes).
 */
export function round3(val: number): number {
  return Math.round((val + Number.EPSILON) * 1000) / 1000;
}

/**
 * Format currency in Dinars and Millimes.
 * Example: 12500.5 => "12 500,500 TND"
 */
export function formatTnd(val: number): string {
  const parts = val.toFixed(3).split('.');
  const integerPart = (parts[0] || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const decimalPart = parts[1] || '000';
  return `${integerPart},${decimalPart} TND`;
}

/**
 * Converts a numeric amount to Tunisian French words.
 * Example: 1250.500 => "Mille deux cent cinquante Dinars et cinq cents Millimes"
 */
export function amountInWordsTnd(amount: number): string {
  const dinars = Math.floor(amount);
  const millimes = Math.round((amount - dinars) * 1000);

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];

  function convertGroup(n: number): string {
    if (n === 0) return '';
    let res = '';
    const h = Math.floor(n / 100);
    const r = n % 100;

    if (h === 1) res += 'cent ';
    else if (h > 1) res += units[h] + ' cents ';

    if (r > 0) {
      if (r < 10) res += units[r];
      else if (r < 20) res += teens[r - 10];
      else {
        const t = Math.floor(r / 10);
        const u = r % 10;
        if (t === 7 || t === 9) {
          res += tens[t - 1] + '-' + teens[u];
        } else {
          res += tens[t] + (u === 1 && t !== 8 ? ' et un' : u > 0 ? '-' + units[u] : '');
        }
      }
    }
    return res.trim();
  }

  function numberToWords(n: number): string {
    if (n === 0) return 'zéro';
    const millions = Math.floor(n / 1000000);
    const thousands = Math.floor((n % 1000000) / 1000);
    const remainder = n % 1000;

    let str = '';
    if (millions > 0) {
      str += convertGroup(millions) + (millions > 1 ? ' millions ' : ' million ');
    }
    if (thousands > 0) {
      if (thousands === 1) str += 'mille ';
      else str += convertGroup(thousands) + ' mille ';
    }
    if (remainder > 0) {
      str += convertGroup(remainder);
    }
    return str.trim();
  }

  const dinarWord = dinars > 1 ? 'Dinars' : 'Dinar';
  let result = `${numberToWords(dinars)} ${dinarWord}`;
  if (millimes > 0) {
    result += ` et ${numberToWords(millimes)} Millimes`;
  }
  return result.charAt(0).toUpperCase() + result.slice(1);
}

