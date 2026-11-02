/**
 * Official TEJ (DGI Tunisie) File Exporter for Déclaration de l'Employeur.
 * Generates structured text files compliant with the specifications of
 * the Tunisian General Directorate of Taxation (Direction Générale des Impôts - TEJ platform).
 * 
 * STRICT COMPLIANCE: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

export interface EmployerDeclarationData {
  taxId: string;
  companyName: string;
  address: string;
  year: number;
  totalGrossSalaries: number;
  totalIrppWithheld: number;
  totalFeesPaid: number;
  totalFeesWithheld: number;
  totalRentPaid: number;
  totalRentWithheld: number;
  feesProviders: Array<{
    name: string;
    taxIdOrCin: string;
    profession: string;
    grossAmount: number;
    withholdingRate: number;
    withholdingAmount: number;
    netAmount: number;
  }>;
}

/**
 * Formats a field to a fixed length string with right space padding or zero padding for numbers.
 */
function padStr(val: string, len: number): string {
  const s = val.substring(0, len);
  return s + ' '.repeat(Math.max(0, len - s.length));
}

function padNum(val: number, len: number, decimals: number = 3): string {
  const formatted = val.toFixed(decimals).replace('.', '');
  const s = formatted.substring(0, len);
  return '0'.repeat(Math.max(0, len - s.length)) + s;
}

/**
 * Generates DECEMP (Tableau Récapitulatif) according to the Tunisian DGI specifications.
 */
export function generateDecempFile(data: EmployerDeclarationData): string {
  const lines: string[] = [];

  // En-tête : Code enregistrement, Matricule Fiscal (13 car.), Année (4 car.), Dénomination (40 car.)
  const header = `E01${padStr(data.taxId.replace(/[^A-Z0-9]/g, ''), 13)}${data.year}${padStr(data.companyName, 40)}`;
  lines.push(header);

  // Ligne 1 : Salaires et Traitements (Code D01)
  const lineSalaries = `D01${padNum(data.totalGrossSalaries, 15, 3)}${padNum(data.totalIrppWithheld, 15, 3)}`;
  lines.push(lineSalaries);

  // Ligne 2 : Honoraires et Commissions résidents (Code D02)
  const lineFees = `D02${padNum(data.totalFeesPaid, 15, 3)}${padNum(data.totalFeesWithheld, 15, 3)}`;
  lines.push(lineFees);

  // Ligne 3 : Loyers (Code D03)
  const lineRent = `D03${padNum(data.totalRentPaid, 15, 3)}${padNum(data.totalRentWithheld, 15, 3)}`;
  lines.push(lineRent);

  // Ligne Total des Retenues versées (Code D99)
  const totalRS = data.totalIrppWithheld + data.totalFeesWithheld + data.totalRentWithheld;
  const lineTotal = `D99${padNum(totalRS, 15, 3)}`;
  lines.push(lineTotal);

  return lines.join('\r\n');
}

/**
 * Generates ANXEMP (Annexe II : Honoraires, commissions et loyers servis aux résidents).
 */
export function generateAnxempFile(data: EmployerDeclarationData): string {
  const lines: string[] = [];

  // Header Annexe II
  const header = `A02${padStr(data.taxId.replace(/[^A-Z0-9]/g, ''), 13)}${data.year}`;
  lines.push(header);

  let seq = 1;
  for (const prov of data.feesProviders) {
    const seqStr = String(seq).padStart(4, '0');
    const taxClean = padStr(prov.taxIdOrCin.replace(/[^A-Z0-9]/g, ''), 13);
    const nameStr = padStr(prov.name, 40);
    const profStr = padStr(prov.profession || 'CONSULTANT', 20);
    const grossStr = padNum(prov.grossAmount, 13, 3);
    const rateStr = padNum(prov.withholdingRate, 4, 1);
    const rsStr = padNum(prov.withholdingAmount, 13, 3);
    const netStr = padNum(prov.netAmount, 13, 3);

    const record = `L02${seqStr}${taxClean}${nameStr}${profStr}${grossStr}${rateStr}${rsStr}${netStr}`;
    lines.push(record);
    seq++;
  }

  return lines.join('\r\n');
}

