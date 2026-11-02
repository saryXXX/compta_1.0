/**
 * Bank Reconciliation Engine (État de Rapprochement Bancaire).
 * Implements:
 * - Dual ledger reconciliation between Bank Statement and Account 512100 (Banque)
 * - Matching engine (Automatic suggested match by amount + manual reconciliation)
 * - Formal Tunisian Bank Reconciliation Statement calculation
 * 
 * STRICT COMPLIANCE: ZERO TYPE NULL.
 */

export interface BankStatementLineDTO {
  id: string;
  operationDate: string;
  valueDate: string;
  description: string;
  debit: number;
  credit: number;
  isReconciled: boolean;
  reconciledEntryLineId?: string;
}

export interface LedgerLineDTO {
  id: string;
  entryId: string;
  journalCode: string;
  entryDate: string;
  referenceNumber: string;
  accountCode: string;
  description: string;
  debit: number;
  credit: number;
  isReconciled: boolean;
}

export interface BankReconciliationReport {
  bankStatementClosingBalance: number;
  uncreditedCompanyDeposits: number; // Accounting Debits not yet on bank statement
  unpresentedCompanyChecks: number; // Accounting Credits not yet cleared by bank
  unrecordedBankDebits: number; // Bank Debits (fees/charges) not yet in accounting
  unrecordedBankCredits: number; // Bank Credits not yet in accounting
  reconciledTheoreticalBalance: number;
  accountingBookBalance: number;
  difference: number;
  isBalanced: boolean;
}

export class TunisianBankReconciliationEngine {
  /**
   * Generates formal bank reconciliation statement.
   * 
   * In Tunisian accounting:
   * Company Bank Account 512100 is an ASSET (Debit = Inflows, Credit = Outflows).
   * Bank Statement is a LIABILITY to the bank (Credit = Inflows/Deposits, Debit = Outflows/Withdrawals).
   */
  public static calculateReconciliation(
    bankStatementLines: BankStatementLineDTO[],
    companyLedgerLines: LedgerLineDTO[]
  ): BankReconciliationReport {
    // 1. Bank statement balance = sum of credits (money in) minus sum of debits (money out)
    const bankStatementCredits = bankStatementLines.reduce((acc, l) => acc + l.credit, 0);
    const bankStatementDebits = bankStatementLines.reduce((acc, l) => acc + l.debit, 0);
    const bankStatementClosingBalance = Math.round((bankStatementCredits - bankStatementDebits) * 1000) / 1000;

    // 2. Accounting book balance (Account 512100) = sum of debits minus sum of credits
    const ledgerDebits = companyLedgerLines.reduce((acc, l) => acc + l.debit, 0);
    const ledgerCredits = companyLedgerLines.reduce((acc, l) => acc + l.credit, 0);
    const accountingBookBalance = Math.round((ledgerDebits - ledgerCredits) * 1000) / 1000;

    // 3. Unreconciled accounting entries
    // Debits in accounting not yet on bank statement (add to bank balance)
    const uncreditedCompanyDeposits = companyLedgerLines
      .filter((l) => !l.isReconciled && l.debit > 0)
      .reduce((acc, l) => acc + l.debit, 0);

    // Credits in accounting not yet on bank statement (subtract from bank balance)
    const unpresentedCompanyChecks = companyLedgerLines
      .filter((l) => !l.isReconciled && l.credit > 0)
      .reduce((acc, l) => acc + l.credit, 0);

    // 4. Unreconciled bank statement entries
    // Debits on bank statement not yet recorded in accounting (subtract from accounting book)
    const unrecordedBankDebits = bankStatementLines
      .filter((l) => !l.isReconciled && l.debit > 0)
      .reduce((acc, l) => acc + l.debit, 0);

    // Credits on bank statement not yet recorded in accounting (add to accounting book)
    const unrecordedBankCredits = bankStatementLines
      .filter((l) => !l.isReconciled && l.credit > 0)
      .reduce((acc, l) => acc + l.credit, 0);

    // Reconciled theoretical balance starting from Bank Statement:
    // Theoretical = BankBalance + UncreditedCompanyDeposits - UnpresentedCompanyChecks
    const theoreticalFromBank = Math.round(
      (bankStatementClosingBalance + uncreditedCompanyDeposits - unpresentedCompanyChecks) * 1000
    ) / 1000;

    // Adjusted book balance = BookBalance - UnrecordedBankDebits + UnrecordedBankCredits
    const adjustedBookBalance = Math.round(
      (accountingBookBalance - unrecordedBankDebits + unrecordedBankCredits) * 1000
    ) / 1000;

    const difference = Math.round((theoreticalFromBank - adjustedBookBalance) * 1000) / 1000;
    const isBalanced = Math.abs(difference) < 0.005;

    return {
      bankStatementClosingBalance,
      uncreditedCompanyDeposits: Math.round(uncreditedCompanyDeposits * 1000) / 1000,
      unpresentedCompanyChecks: Math.round(unpresentedCompanyChecks * 1000) / 1000,
      unrecordedBankDebits: Math.round(unrecordedBankDebits * 1000) / 1000,
      unrecordedBankCredits: Math.round(unrecordedBankCredits * 1000) / 1000,
      reconciledTheoreticalBalance: theoreticalFromBank,
      accountingBookBalance,
      difference,
      isBalanced,
    };
  }

  /**
   * Automatic matching helper: finds matching pairs between bank statement line and ledger lines.
   * A bank CREDIT of amount X matches an accounting DEBIT of amount X.
   * A bank DEBIT of amount X matches an accounting CREDIT of amount X.
   */
  public static suggestMatches(
    unreconciledBankLines: BankStatementLineDTO[],
    unreconciledLedgerLines: LedgerLineDTO[]
  ): Array<{ bankLineId: string; ledgerLineId: string; amount: number }> {
    const suggestions: Array<{ bankLineId: string; ledgerLineId: string; amount: number }> = [];
    const matchedLedgerIds = new Set<string>();

    for (const bLine of unreconciledBankLines) {
      if (bLine.credit > 0) {
        // Look for matching ledger debit
        const targetAmount = bLine.credit;
        const match = unreconciledLedgerLines.find(
          (l) => !matchedLedgerIds.has(l.id) && Math.abs(l.debit - targetAmount) < 0.005
        );
        if (match) {
          suggestions.push({
            bankLineId: bLine.id,
            ledgerLineId: match.id,
            amount: targetAmount,
          });
          matchedLedgerIds.add(match.id);
        }
      } else if (bLine.debit > 0) {
        // Look for matching ledger credit
        const targetAmount = bLine.debit;
        const match = unreconciledLedgerLines.find(
          (l) => !matchedLedgerIds.has(l.id) && Math.abs(l.credit - targetAmount) < 0.005
        );
        if (match) {
          suggestions.push({
            bankLineId: bLine.id,
            ledgerLineId: match.id,
            amount: targetAmount,
          });
          matchedLedgerIds.add(match.id);
        }
      }
    }

    return suggestions;
  }
}

