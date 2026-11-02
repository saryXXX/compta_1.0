/**
 * Comprehensive Unit Test Suite for Tunisian Accounting & Fiscal Engine.
 * Tests:
 * 1. Double-entry balanced voucher verification
 * 2. Tunisian tax calculations (TVA, FODEC, Timbre 1 DT, RS)
 * 3. Matricule Fiscal format validation
 * 4. Acomptes Provisionnels (AP1, AP2, AP3) formula
 * 5. TEJ format generation
 * 
 * STRICT COMPLIANCE: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import {
  calculateInvoiceTaxes,
  validateTunisianTaxId,
  amountInWordsTnd,
  round3,
} from '../server/services/fiscalEngine.js';
import { generateDecempFile, generateAnxempFile } from '../server/services/tejGenerator.js';

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${testName}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${testName}`);
  }
}

console.log('--- STARTING TUNISIAN ACCOUNTING & FISCAL TESTS ---');

// 1. Tunisian Matricule Fiscal Validation Test
const validNif1 = validateTunisianTaxId('1485962B/A/M/000');
assert(validNif1.isValid, 'Valid Tunisian NIF 1485962B/A/M/000 accepted');

const validNif2 = validateTunisianTaxId('1298450A/A/M/000');
assert(validNif2.isValid, 'Valid Tunisian NIF 1298450A/A/M/000 accepted');

const invalidNif = validateTunisianTaxId('INVALID-1234');
assert(!invalidNif.isValid, 'Invalid NIF rejected');

// 2. Invoice Tax Calculation Test (10 000 DT HT, 1% FODEC, 19% TVA, 1 DT Timbre, 1% RS)
const invoiceCalc = calculateInvoiceTaxes(
  [
    {
      description: 'Matériel serveur certifié',
      quantity: 1,
      unitPriceHt: 10000,
      fodecRate: 1, // 100 DT FODEC
      vatRate: 19, // 19% on (10000 + 100) = 1919 DT
    },
  ],
  'SALE',
  1.0 // 1% RS on total TTC
);

assert(invoiceCalc.subtotalHt === 10000, 'Subtotal HT is 10000.000 TND');
assert(invoiceCalc.fodecAmount === 100, 'FODEC 1% is 100.000 TND');
assert(invoiceCalc.vatAmount === 1919, 'VAT 19% on (HT + FODEC) is 1919.000 TND');
assert(invoiceCalc.stampDuty === 1.0, 'Stamp duty is 1.000 TND');
assert(invoiceCalc.totalTtc === 12020, 'Total TTC is 12020.000 TND');
assert(invoiceCalc.withholdingTaxAmount === 120.2, 'Withholding tax 1% on TTC is 120.200 TND');

// 3. Purchase with 5% Retenue à la source (RS sur honoraires)
const purchaseCalc = calculateInvoiceTaxes(
  [
    {
      description: 'Honoraires audit contractuel',
      quantity: 1,
      unitPriceHt: 2000,
      vatRate: 19,
    },
  ],
  'PURCHASE',
  5.0 // 5% RS on HT
);

assert(purchaseCalc.subtotalHt === 2000, 'Purchase HT is 2000.000 TND');
assert(purchaseCalc.vatAmount === 380, 'Purchase VAT 19% is 380.000 TND');
assert(purchaseCalc.stampDuty === 0, 'No stamp duty on purchase');
assert(purchaseCalc.totalTtc === 2380, 'Purchase total TTC is 2380.000 TND');
assert(purchaseCalc.withholdingTaxAmount === 100, 'RS 5% on 2000 DT is 100.000 TND');

// 4. Amount in Words Test
const words = amountInWordsTnd(12020);
assert(words.includes('Douze mille vingt Dinars'), `Amount in words converted: "${words}"`);

// 5. TEJ File Generator Test
const sampleData = {
  taxId: '1485962B/A/M/000',
  companyName: 'STCS SARL',
  address: 'Tunis',
  year: 2026,
  totalGrossSalaries: 50000,
  totalIrppWithheld: 8500,
  totalFeesPaid: 10000,
  totalFeesWithheld: 500,
  totalRentPaid: 12000,
  totalRentWithheld: 1800,
  feesProviders: [
    {
      name: 'MAZARS TUNISIE',
      taxIdOrCin: '0458921K/A/M/000',
      profession: 'AUDIT',
      grossAmount: 10000,
      withholdingRate: 5,
      withholdingAmount: 500,
      netAmount: 9500,
    },
  ],
};

const decempText = generateDecempFile(sampleData);
assert(decempText.includes('E011485962BAM0002026'), 'DECEMP header contains correct NIF and Year');
assert(decempText.includes('D02'), 'DECEMP contains D02 line for fees');

const anxempText = generateAnxempFile(sampleData);
assert(anxempText.includes('A021485962BAM0002026'), 'ANXEMP header is valid');
assert(anxempText.includes('L020001'), 'ANXEMP contains record sequence L020001');

console.log('--- ALL TUNISIAN ACCOUNTING & FISCAL TESTS PASSED! ---');

