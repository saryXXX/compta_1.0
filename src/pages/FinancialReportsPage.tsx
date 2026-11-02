/**
 * Financial Reports Page: Balance Sheet (Bilan) & Income Statement (État de Résultat)
 * Strictly conforms to Tunisian Accounting Standard NCT 01 (Loi 96-112).
 * 
 * STRICT COMPLIANCE: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useI18n } from '../context/I18nContext.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { CurrencyDisplay } from '../components/ui/CurrencyDisplay.js';
import { PieChart, Printer, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';
import { BalanceSheetReport, IncomeStatementReport, TrialBalance } from '../types/index.js';

export const FinancialReportsPage: React.FC = () => {
  const { authFetch } = useAuth();
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<'BILAN' | 'RESULTAT' | 'BALANCE'>('BILAN');
  const [year, setYear] = useState(new Date().getFullYear());

  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetReport | undefined>(undefined);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementReport | undefined>(undefined);
  const [trialBalance, setTrialBalance] = useState<TrialBalance | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const loadStatements = async () => {
    try {
      setLoading(true);
      const [stmRes, balRes] = await Promise.all([
        authFetch(`/api/accounting/statements?year=${year}`),
        authFetch('/api/accounting/balance'),
      ]);

      if (stmRes.ok) {
        const data = await stmRes.json();
        setBalanceSheet(data.statements.balanceSheet);
        setIncomeStatement(data.statements.incomeStatement);
      }
      if (balRes.ok) {
        const bData = await balRes.json();
        setTrialBalance(bData.balance);
      }
    } catch (err) {
      console.error('Failed to load statements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatements();
  }, [year]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <PieChart className="h-6 w-6 text-tn-red" />
            <span>{t('financialReportsTitle')}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Bilan annuel équilibré, État de Résultat et Balance générale des comptes (Norme NCT 01)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-md shadow-sm border border-slate-200 dark:border-slate-800">
            <Calendar className="h-4 w-4 text-tn-red ml-2" />
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="text-xs font-semibold bg-transparent border-0 text-slate-800 dark:text-slate-200 focus:ring-0 cursor-pointer font-mono"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  Exercice {y}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            size="md"
            icon={<Printer className="h-4 w-4" />}
            onClick={() => window.print()}
          >
            {t('print')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('BILAN')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'BILAN'
              ? 'border-tn-red text-tn-red'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {t('balanceSheetTab')}
        </button>
        <button
          onClick={() => setActiveTab('RESULTAT')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'RESULTAT'
              ? 'border-sky-500 text-sky-600 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {t('incomeStatementTab')}
        </button>
        <button
          onClick={() => setActiveTab('BALANCE')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'BALANCE'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {t('trialBalanceTab')}
        </button>
      </div>

      {/* TAB 1: BILAN (Norme NCT 01) */}
      {activeTab === 'BILAN' && balanceSheet && (
        <div className="space-y-6">
          {/* Balance Equilibrium Banner */}
          <div
            className={`p-3.5 rounded-md border flex items-center justify-between text-xs font-semibold ${
              balanceSheet.isBalanced
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-800 dark:text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {balanceSheet.isBalanced ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              <span>
                {t('balancedCheck')}{' '}
                <strong>
                  {balanceSheet.isBalanced
                    ? 'Parfaitement Équilibré (Actif = Passif)'
                    : `Écart de ${balanceSheet.difference.toFixed(3)} TND`}
                </strong>
              </span>
            </div>
            <span className="font-mono text-sm font-bold">
              Total Actif : {balanceSheet.assets.totalAssets.toFixed(3)} TND | Total Passif :{' '}
              {balanceSheet.equityAndLiabilities.totalEquityAndLiabilities.toFixed(3)} TND
            </span>
          </div>

          {/* Two-Column NCT 01 Balance Sheet */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ACTIF */}
            <div className="rounded-lg bg-white dark:bg-slate-900 p-5 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="border-b pb-3 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-wide">
                  {t('assets')}
                </h3>
                <span className="text-xs text-slate-400 font-mono">Montants Nets</span>
              </div>

              {/* Actifs Non Courants */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg">
                  <span>{balanceSheet.assets.nonCurrent.title}</span>
                  <span className="font-mono">{balanceSheet.assets.nonCurrent.total.toFixed(3)} TND</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono">
                  {balanceSheet.assets.nonCurrent.items.map((it, i) => (
                    <div key={i} className="flex justify-between py-2 px-2 text-slate-600 dark:text-slate-400">
                      <span className="font-sans">{it.label}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{it.netAmount.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actifs Courants */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg">
                  <span>{balanceSheet.assets.current.title}</span>
                  <span className="font-mono">{balanceSheet.assets.current.total.toFixed(3)} TND</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono">
                  {balanceSheet.assets.current.items.map((it, i) => (
                    <div key={i} className="flex justify-between py-2 px-2 text-slate-600 dark:text-slate-400">
                      <span className="font-sans">{it.label}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{it.netAmount.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Actif */}
              <div className="pt-4 border-t-2 border-slate-900 dark:border-white flex justify-between items-center text-sm font-black">
                <span>{t('totalAssets')}</span>
                <span className="text-tn-red font-mono text-base">
                  <CurrencyDisplay amount={balanceSheet.assets.totalAssets} />
                </span>
              </div>
            </div>

            {/* PASSIF & CAPITAUX PROPRES */}
            <div className="rounded-lg bg-white dark:bg-slate-900 p-5 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="border-b pb-3 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-wide">
                  {t('equityAndLiabilities')}
                </h3>
                <span className="text-xs text-slate-400 font-mono">Montants Nets</span>
              </div>

              {/* Capitaux Propres */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg">
                  <span>{balanceSheet.equityAndLiabilities.equity.title}</span>
                  <span className="font-mono">{balanceSheet.equityAndLiabilities.equity.total.toFixed(3)} TND</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono">
                  {balanceSheet.equityAndLiabilities.equity.items.map((it, i) => (
                    <div key={i} className="flex justify-between py-2 px-2 text-slate-600 dark:text-slate-400">
                      <span className="font-sans">{it.label}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{it.netAmount.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Passifs Non Courants */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg">
                  <span>{balanceSheet.equityAndLiabilities.nonCurrentLiabilities.title}</span>
                  <span className="font-mono">
                    {balanceSheet.equityAndLiabilities.nonCurrentLiabilities.total.toFixed(3)} TND
                  </span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono">
                  {balanceSheet.equityAndLiabilities.nonCurrentLiabilities.items.map((it, i) => (
                    <div key={i} className="flex justify-between py-2 px-2 text-slate-600 dark:text-slate-400">
                      <span className="font-sans">{it.label}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{it.netAmount.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Passifs Courants */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg">
                  <span>{balanceSheet.equityAndLiabilities.currentLiabilities.title}</span>
                  <span className="font-mono">
                    {balanceSheet.equityAndLiabilities.currentLiabilities.total.toFixed(3)} TND
                  </span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono">
                  {balanceSheet.equityAndLiabilities.currentLiabilities.items.map((it, i) => (
                    <div key={i} className="flex justify-between py-2 px-2 text-slate-600 dark:text-slate-400">
                      <span className="font-sans">{it.label}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{it.netAmount.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Passif & Capitaux Propres */}
              <div className="pt-4 border-t-2 border-slate-900 dark:border-white flex justify-between items-center text-sm font-black">
                <span>{t('totalEquityAndLiabilities')}</span>
                <span className="text-tn-red font-mono text-base">
                  <CurrencyDisplay amount={balanceSheet.equityAndLiabilities.totalEquityAndLiabilities} />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ÉTAT DE RÉSULTAT */}
      {activeTab === 'RESULTAT' && incomeStatement && (
        <div className="rounded-lg bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200 dark:border-slate-800 max-w-4xl mx-auto space-y-6">
          <div className="border-b pb-4 dark:border-slate-850 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                ÉTAT DE RÉSULTAT DE L'EXERCICE {year}
              </h3>
              <p className="text-xs text-slate-500">Présentation par nature selon la norme NCT 01</p>
            </div>
            <Badge variant="vat">Taux IS Droit Commun : 15%</Badge>
          </div>

          <div className="space-y-4 font-mono text-xs">
            {/* Operating Revenues */}
            <div className="p-3.5 rounded-md bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-2">
              <div className="flex justify-between font-bold text-emerald-800 dark:text-emerald-300 font-sans text-sm">
                <span>{t('operatingRevenues')}</span>
                <span>{incomeStatement.operatingRevenues.total.toFixed(3)} TND</span>
              </div>
              <div className="divide-y divide-emerald-100 dark:divide-emerald-900/30">
                <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                  <span className="font-sans">• Ventes de marchandises (Compte 707)</span>
                  <span>{incomeStatement.operatingRevenues.sales.toFixed(3)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                  <span className="font-sans">• Prestations de services (Compte 706)</span>
                  <span>{incomeStatement.operatingRevenues.services.toFixed(3)}</span>
                </div>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="p-3.5 rounded-md bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 space-y-2">
              <div className="flex justify-between font-bold text-rose-800 dark:text-rose-300 font-sans text-sm">
                <span>{t('operatingExpenses')}</span>
                <span>- {incomeStatement.operatingExpenses.total.toFixed(3)} TND</span>
              </div>
              <div className="divide-y divide-rose-100 dark:divide-rose-900/30">
                <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                  <span className="font-sans">• Achats consommés (Compte 60)</span>
                  <span>{incomeStatement.operatingExpenses.purchases.toFixed(3)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                  <span className="font-sans">• Services extérieurs et honoraires (Comptes 61/62)</span>
                  <span>{incomeStatement.operatingExpenses.services.toFixed(3)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                  <span className="font-sans">• Charges de personnel (Compte 63)</span>
                  <span>{incomeStatement.operatingExpenses.personnel.toFixed(3)}</span>
                </div>
              </div>
            </div>

            {/* Operating Result */}
            <div className="flex justify-between p-3 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-sm">
              <span className="font-sans text-slate-800 dark:text-slate-200">{t('operatingResult')}</span>
              <span className={incomeStatement.operatingResult >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {incomeStatement.operatingResult.toFixed(3)} TND
              </span>
            </div>

            {/* Financial Result */}
            <div className="flex justify-between px-3 py-1.5 text-slate-600 dark:text-slate-400 font-medium">
              <span className="font-sans">{t('financialResult')}</span>
              <span>{incomeStatement.financialResult.toFixed(3)} TND</span>
            </div>

            {/* Ordinary Result Before Tax */}
            <div className="flex justify-between p-3 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-sm">
              <span className="font-sans text-slate-800 dark:text-slate-200">{t('resultBeforeTax')}</span>
              <span>{incomeStatement.ordinaryResultBeforeTax.toFixed(3)} TND</span>
            </div>

            {/* Corporate Tax (IS) */}
            <div className="flex justify-between px-3 py-1.5 text-tn-red font-medium">
              <span className="font-sans">{t('corporateTax')} (15%)</span>
              <span>- {incomeStatement.corporateTax.toFixed(3)} TND</span>
            </div>

            {/* Net Income */}
            <div className="flex justify-between p-4 rounded-md bg-slate-900 text-white font-black text-lg">
              <span className="font-sans">{t('netIncome')}</span>
              <span className="text-tn-red font-mono">
                <CurrencyDisplay amount={incomeStatement.netIncome} />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BALANCE GÉNÉRALE (6 COLONNES) */}
      {activeTab === 'BALANCE' && trialBalance && (
        <div className="rounded-lg bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Balance Générale des Comptes (Classes 1 à 7)
            </h3>
            <Badge variant={trialBalance.totals.isBalanced ? 'success' : 'warning'}>
              {trialBalance.totals.isBalanced ? 'Balance Équilibrée' : 'Écart Débit/Crédit'}
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase font-semibold text-slate-500 font-sans">
                <tr>
                  <th className="py-3 px-4">N° Compte</th>
                  <th className="py-3 px-4">Intitulé du Compte</th>
                  <th className="py-3 px-4 text-right">Mouvement Débit</th>
                  <th className="py-3 px-4 text-right">Mouvement Crédit</th>
                  <th className="py-3 px-4 text-right">Solde Débiteur</th>
                  <th className="py-3 px-4 text-right">Solde Créditeur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {trialBalance.rows
                  .filter((r) => r.periodDebit > 0 || r.periodCredit > 0 || r.closingDebit > 0 || r.closingCredit > 0)
                  .map((row) => (
                    <tr key={row.accountCode} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{row.accountCode}</td>
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-700 dark:text-slate-300">
                        {row.accountName}
                      </td>
                      <td className="py-2.5 px-4 text-right">{row.periodDebit > 0 ? row.periodDebit.toFixed(3) : '-'}</td>
                      <td className="py-2.5 px-4 text-right">{row.periodCredit > 0 ? row.periodCredit.toFixed(3) : '-'}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-emerald-600">
                        {row.closingDebit > 0 ? row.closingDebit.toFixed(3) : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-rose-600">
                        {row.closingCredit > 0 ? row.closingCredit.toFixed(3) : '-'}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-900 dark:border-white">
                <tr>
                  <td colSpan={2} className="py-3 px-4 font-sans text-sm">
                    TOTAUX GÉNÉRAUX DE LA BALANCE :
                  </td>
                  <td className="py-3 px-4 text-right">{trialBalance.totals.periodDebit.toFixed(3)}</td>
                  <td className="py-3 px-4 text-right">{trialBalance.totals.periodCredit.toFixed(3)}</td>
                  <td className="py-3 px-4 text-right text-emerald-600">{trialBalance.totals.closingDebit.toFixed(3)}</td>
                  <td className="py-3 px-4 text-right text-rose-600">{trialBalance.totals.closingCredit.toFixed(3)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

