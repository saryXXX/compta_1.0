/**
 * Global TypeScript Interfaces for Tunisian Accounting & Fiscal Application.
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 * All optional or nullable fields are typed as `T | undefined` or with `?`.
 */

export interface Tenant {
  id: string;
  name: string;
  taxId: string;
  tradeRegister?: string;
  vatRegime: string;
  address?: string;
  city: string;
  phone?: string;
  email?: string;
  currency: string;
  isDeleted: boolean;
  deletedAt?: string;
}

export interface User {
  id: string;
  tenantId: string;
  username: string;
  fullName: string;
  role: 'SUPERADMIN' | 'ACCOUNTANT' | 'COMMERCIAL' | 'ADMIN' | string;
  permissions: string[];
  tenantName: string;
  tenantTaxId: string;
  tenantCurrency: string;
}

export interface PermissionDefinition {
  id: string;
  label: string;
  description: string;
  category: string;
}

export interface PermissionCategory {
  id: string;
  label: string;
  icon: string;
}

export interface RolePresets {
  ACCOUNTANT: string[];
  COMMERCIAL: string[];
  SUPERADMIN: string[];
}

export interface Party {
  id: string;
  tenantId: string;
  partyType: 'CLIENT' | 'SUPPLIER';
  name: string;
  taxId?: string;
  rneNumber?: string;
  vatStatus: 'ASSUJETTI' | 'EXONERE' | 'SUSPENSION' | 'NON_ASSUJETTI';
  vatExemptionNumber?: string;
  vatExemptionExpiry?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  defaultWithholdingRate: number;
  accountCode?: string;
  balance: number;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPriceHt: number;
  discountPercent?: number;
  fodecRate?: number;
  fodecAmount?: number;
  vatRate: number; // 19, 13, 7, 0
  vatAmount?: number;
  totalHt: number;
  totalTtc: number;
  isDeleted?: boolean;
}

export interface Invoice {
  id: string;
  tenantId: string;
  invoiceType: 'SALE' | 'PURCHASE' | 'CREDIT_NOTE';
  invoiceNumber: string;
  partyId: string;
  party?: Party;
  invoiceDate: string;
  dueDate: string;
  subtotalHt: number;
  fodecAmount: number;
  vatAmount: number;
  stampDuty: number;
  withholdingTaxAmount: number;
  totalTtc: number;
  status: 'DRAFT' | 'VALIDATED' | 'PAID' | 'CANCELLED';
  notes?: string;
  items: InvoiceItem[];
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
}

export interface EntryLine {
  id?: string;
  accountCode: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface AccountingEntry {
  id: string;
  tenantId: string;
  journalCode: 'VE' | 'AC' | 'BQ' | 'CA' | 'OD';
  entryDate: string;
  referenceNumber: string;
  description: string;
  invoiceId?: string;
  lines: EntryLine[];
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
}

export interface Account {
  id: string;
  tenantId: string;
  accountCode: string;
  accountName: string;
  accountCategory: string;
}

export type DeclarationCode = '0' | '1' | '2' | '3' | '4'; // 0: Spontané, 1: Régularisation, 2: Rectificatif, 3: Taxation d'office, 4: Cessation
export type TaxpayerProfile = 'COMMERCIAL' | 'INDUSTRIAL' | 'EXPORTER' | 'HOTEL' | 'RESTAURANT' | 'CUSTOM';

export interface ActiveTaxTypes {
  withholdingTax: boolean;    // الخصم من المورد
  tfp: boolean;               // الأداء على التكوين المهني
  foprolos: boolean;          // المساهمة في صندوق النهوض بالمسكن
  consumptionTax: boolean;    // المعلوم على الاستهلاك
  vat: boolean;               // الأداء على القيمة المضافة
  otherTurnoverTaxes: boolean;// معاليم أخرى على رقم المعاملات (FODEC, etc.)
  stampDuty: boolean;         // معلوم الطابع الجبائي
  tcl: boolean;               // المعلوم على المؤسسات
  hotelTax: boolean;          // المعلوم على النزل
  alcoholLicence: boolean;    // معلوم الإجازة
}

export interface WithholdingLineDetail {
  code: string;
  label: string;
  baseAmount: number;
  rate: number;
  taxAmount: number;
}

export interface SummaryBordereauItem {
  id: string;
  name: string;
  arabicLabel: string;
  principalAmount: number;
  deductionsPaid: number;
  penalties: number;
  netDue: number;
}

export interface G50Declaration {
  id?: string;
  tenantId: string;
  month: number;
  year: number;
  declarationCode?: DeclarationCode;
  profile?: TaxpayerProfile;
  activeTaxes?: ActiveTaxTypes;
  caTaxable19: number;
  caTaxable13: number;
  caTaxable7: number;
  caExport0: number;
  caExempt: number;
  vatCollected19: number;
  vatCollected13: number;
  vatCollected7: number;
  vatCollectedTotal: number;
  vatDeductibleAssets: number;
  vatDeductibleOther: number;
  vatCreditCarriedForward: number;
  vatNetDue: number;
  vatCreditGenerated: number;
  stampDutyTotal: number;
  stampDutyInvoiceCount?: number;
  tclLocalHt?: number;
  tclExportHt?: number;
  tclTotal: number;
  fodecTotal: number;
  withholdingSalaries: number;
  withholdingCss?: number;
  withholdingFees: number;
  withholdingRent: number;
  withholdingPurchases?: number;
  withholdingVat25?: number;
  withholdingTotal: number;
  withholdingLines?: WithholdingLineDetail[];
  grossPayroll?: number;
  tfpRate?: number;
  tfpAdvanceDeduction?: number;
  tfpTotal: number;
  foprolosTotal: number;
  consumptionTaxTotal?: number;
  hotelTaxTotal?: number;
  alcoholLicenceTotal?: number;
  totalPrincipalDue?: number;
  legalMinimumFloor?: number;
  isLegalMinimumApplied?: boolean;
  latePenaltyRate?: number;
  latePenaltyAmount?: number;
  taxesAlreadyPaid?: number;
  summaryRows?: SummaryBordereauItem[];
  totalToPay: number;
  isNil: boolean;
  status: 'DRAFT' | 'DEPOSITED' | 'PAID';
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt?: string;
  salesCount?: number;
  purchasesCount?: number;
}

export interface ProvisionalPaymentAP {
  id: string;
  tenantId: string;
  year: number;
  installmentNumber: number; // 1, 2, 3
  previousYearTaxBase: number;
  installmentGross30: number;
  withholdingDeducted: number;
  priorCreditsDeducted: number;
  netPayable: number;
  dueDate: string;
  paymentStatus: 'PENDING' | 'PAID' | 'EXEMPT';
  notes?: string;
}

export interface EmployerDeclarationReport {
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

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  category: string;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface TrialBalance {
  rows: TrialBalanceRow[];
  totals: {
    periodDebit: number;
    periodCredit: number;
    closingDebit: number;
    closingCredit: number;
    isBalanced: boolean;
  };
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
  operatingResult: number;
  financialIncome: number;
  financialExpenses: number;
  financialResult: number;
  ordinaryResultBeforeTax: number;
  corporateTax: number;
  netIncome: number;
}

export interface Employee {
  id: string;
  tenantId: string;
  cinNumber: string;
  cnssNumber?: string;
  fullName: string;
  jobTitle: string;
  baseSalary: number;
  maritalStatus: 'CELIBATAIRE' | 'MARIE' | 'DIVORCE' | 'VEUF';
  dependentChildren: number;
  hireDate: string;
  isDeleted: boolean;
  deletedAt?: string;
}

export interface PayrollSlip {
  id: string;
  tenantId: string;
  employeeId: string;
  employee?: Employee;
  month: number;
  year: number;
  grossSalary: number;
  cnssEmployee: number;
  taxableSalary: number;
  irppWithheld: number;
  cssAmount: number;
  cnssEmployer: number;
  tfpAmount: number;
  foprolosAmount: number;
  netSalary: number;
  isAccounted: boolean;
  isDeleted: boolean;
}

export interface FixedAsset {
  id: string;
  tenantId: string;
  assetCode: string;
  name: string;
  category: string;
  acquisitionDate: string;
  commissioningDate: string;
  originalValueHt: number;
  depreciationRate: number;
  amortizationMethod: string;
  assetAccountCode: string;
  amortAccountCode: string;
  dotationAccountCode: string;
  currentAccumulatedAmort?: number;
  currentNetBookValue?: number;
  isDeleted: boolean;
}

export interface AmortizationRow {
  year: number;
  grossValue: number;
  openingAccumulated: number;
  annualDepreciation: number;
  closingAccumulated: number;
  netBookValue: number;
}

export interface BankStatementLine {
  id: string;
  tenantId: string;
  operationDate: string;
  valueDate: string;
  description: string;
  debit: number;
  credit: number;
  isReconciled: boolean;
  reconciledEntryLineId?: string;
}

export interface BankReconciliationReport {
  bankStatementClosingBalance: number;
  uncreditedCompanyDeposits: number;
  unpresentedCompanyChecks: number;
  unrecordedBankDebits: number;
  unrecordedBankCredits: number;
  reconciledTheoreticalBalance: number;
  accountingBookBalance: number;
  difference: number;
  isBalanced: boolean;
}

export interface FiscalAdjustment {
  id: string;
  tenantId: string;
  year: number;
  adjustmentType: 'REINTEGRATION' | 'DEDUCTION';
  label: string;
  amount: number;
  notes?: string;
  isDeleted: boolean;
}

export interface TaxReconciliationReport {
  accountingProfitBeforeTax: number;
  totalReintegrations: number;
  totalDeductions: number;
  priorDeficitsDeducted: number;
  netFiscalProfit: number;
  isDeficit: boolean;
  applicableIsRate: number;
  calculatedIs: number;
  minimumIs: number;
  grossIsDue: number;
  apDeducted: number;
  withholdingTaxDeducted: number;
  totalPrepaymentsDeducted: number;
  balancePayable: number;
  taxCreditCarriedForward: number;
}


