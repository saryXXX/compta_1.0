/**
 * Tunisian Bank Reconciliation & Matching Page (État de Rapprochement Bancaire).
 * Dual panel: Bank statement lines vs Company Account 512100 ledger lines.
 * Computes formal audit-ready reconciliation statement.
 * 
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React, { useState, useEffect } from 'react';
import { useI18n } from '../../context/I18nContext.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Modal } from '../../components/ui/Modal.js';
import { Badge } from '../../components/ui/Badge.js';
import { MetricCard } from '../../components/ui/MetricCard.js';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay.js';
import {
  BankStatementLine,
  BankReconciliationReport,
} from '../../types/index.js';
import {
  Landmark,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Trash2,
  Scale,
  Sparkles,
} from 'lucide-react';

interface LedgerLine {
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

export const BankReconciliationPage: React.FC = () => {
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<'statement' | 'report'>('statement');
  const [bankLines, setBankLines] = useState<BankStatementLine[]>([]);
  const [ledgerLines, setLedgerLines] = useState<LedgerLine[]>([]);
  const [report, setReport] = useState<BankReconciliationReport | undefined>(undefined);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Selection for manual match
  const [selectedBankLineId, setSelectedBankLineId] = useState<string>('');
  const [selectedLedgerLineId, setSelectedLedgerLineId] = useState<string>('');

  // Add line modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [opDate, setOpDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [debitAmount, setDebitAmount] = useState<string>('');
  const [creditAmount, setCreditAmount] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('auth_token') || '';
      const [resBank, resLedger, resReport] = await Promise.all([
        fetch('/api/reconciliation/bank-lines', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/reconciliation/ledger-lines', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/reconciliation/report', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (resBank.ok) {
        const b = await resBank.json();
        setBankLines(b || []);
      }
      if (resLedger.ok) {
        const l = await resLedger.json();
        setLedgerLines(l || []);
      }
      if (resReport.ok) {
        const r = await resReport.json();
        setReport(r.report);
        setSuggestions(r.suggestions || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddBankLine = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch('/api/reconciliation/bank-lines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          operationDate: opDate,
          description,
          debit: parseFloat(debitAmount || '0'),
          credit: parseFloat(creditAmount || '0'),
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Erreur');
      }

      setIsAddModalOpen(false);
      setMessage('Ligne du relevé bancaire ajoutée.');
      setDescription('');
      setDebitAmount('');
      setCreditAmount('');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleMatch = async (bankId: string, ledgerId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch('/api/reconciliation/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bankLineId: bankId,
          ledgerLineId: ledgerId,
        }),
      });

      if (res.ok) {
        setMessage('Lignes rapprochées avec succès !');
        setSelectedBankLineId('');
        setSelectedLedgerLineId('');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUnmatch = async (bankId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch('/api/reconciliation/unmatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bankLineId: bankId }),
      });

      if (res.ok) {
        setMessage('Rapprochement annulé.');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoMatchSuggestions = async () => {
    for (const s of suggestions) {
      await handleMatch(s.bankLineId, s.ledgerLineId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
              <Landmark className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t('reconciliationTitle')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('reconciliationSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {suggestions.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleAutoMatchSuggestions}>
              <Sparkles className="w-4 h-4 mr-1.5 text-amber-500" />
              Lettrage Auto ({suggestions.length})
            </Button>
          )}

          <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            {t('importBankStatement')}
          </Button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
          {message}
        </div>
      )}

      {/* Metrics Row */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <MetricCard
            title={t('bankStatementBalance')}
            value={<CurrencyDisplay amount={report.bankStatementClosingBalance} />}
            description="Relevé bancaire à date"
            icon={<Landmark className="w-5 h-5 text-blue-600" />}
          />
          <MetricCard
            title={t('bookBalance')}
            value={<CurrencyDisplay amount={report.accountingBookBalance} />}
            description="Solde compte 512100"
            icon={<Scale className="w-5 h-5 text-slate-600" />}
          />
          <MetricCard
            title={t('theoreticalBalance')}
            value={<CurrencyDisplay amount={report.reconciledTheoreticalBalance} />}
            description="Solde théorique corrigé"
            icon={<ArrowRightLeft className="w-5 h-5 text-indigo-600" />}
          />
          <MetricCard
            title={t('reconciliationGap')}
            value={<CurrencyDisplay amount={report.difference} />}
            description={report.isBalanced ? 'Parfaitement justifié' : 'Écart à justifier'}
            icon={
              report.isBalanced ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              )
            }
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('statement')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'statement'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {t('bankStatementTab')} & Lettrage
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'report'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {t('reconciliationReportTab')} (État de Rapprochement)
        </button>
      </div>

      {/* Tab 1: Dual Matching Tables */}
      {activeTab === 'statement' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel Left: Bank Statement Lines */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>1. Relevé de Compte Bancaire</span>
                <Badge variant="outline">{bankLines.length}</Badge>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                    <th className="py-2 px-2">Date</th>
                    <th className="py-2 px-2">Libellé</th>
                    <th className="py-2 px-2 text-right">Débit (-)</th>
                    <th className="py-2 px-2 text-right">Crédit (+)</th>
                    <th className="py-2 px-2 text-center">État</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {bankLines.map((line) => (
                    <tr
                      key={line.id}
                      onClick={() => !line.isReconciled && setSelectedBankLineId(line.id)}
                      className={`cursor-pointer transition-colors ${
                        selectedBankLineId === line.id
                          ? 'bg-amber-50 dark:bg-amber-950/40'
                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2 px-2 font-mono text-[11px]">{line.operationDate}</td>
                      <td className="py-2 px-2 text-slate-800 dark:text-slate-200">{line.description}</td>
                      <td className="py-2 px-2 text-right font-mono text-rose-600">
                        {line.debit > 0 ? line.debit.toFixed(3) : ''}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-emerald-600">
                        {line.credit > 0 ? line.credit.toFixed(3) : ''}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {line.isReconciled ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnmatch(line.id);
                            }}
                            className="text-[10px] text-emerald-600 font-bold hover:underline"
                          >
                            Rapproché (✕)
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">En suspens</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Panel Right: Company Ledger Lines (512100) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>2. Grand Livre Compte 512100 (Banque)</span>
                <Badge variant="outline">{ledgerLines.length}</Badge>
              </h3>

              {selectedBankLineId && selectedLedgerLineId && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleMatch(selectedBankLineId, selectedLedgerLineId)}
                  disabled={loading}
                >
                  Valider le Rapprochement
                </Button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                    <th className="py-2 px-2">Date / Réf</th>
                    <th className="py-2 px-2">Libellé écriture</th>
                    <th className="py-2 px-2 text-right">Débit (+)</th>
                    <th className="py-2 px-2 text-right">Crédit (-)</th>
                    <th className="py-2 px-2 text-center">État</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ledgerLines.map((line) => (
                    <tr
                      key={line.id}
                      onClick={() => !line.isReconciled && setSelectedLedgerLineId(line.id)}
                      className={`cursor-pointer transition-colors ${
                        selectedLedgerLineId === line.id
                          ? 'bg-amber-50 dark:bg-amber-950/40'
                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2 px-2 font-mono text-[11px]">
                        <div>{line.entryDate}</div>
                        <div className="text-[10px] text-slate-400">{line.referenceNumber}</div>
                      </td>
                      <td className="py-2 px-2 text-slate-800 dark:text-slate-200">{line.description}</td>
                      <td className="py-2 px-2 text-right font-mono text-emerald-600">
                        {line.debit > 0 ? line.debit.toFixed(3) : ''}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-rose-600">
                        {line.credit > 0 ? line.credit.toFixed(3) : ''}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {line.isReconciled ? (
                          <span className="text-[10px] text-emerald-600 font-bold">Rapproché</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">En suspens</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Formal Reconciliation Statement */}
      {activeTab === 'report' && report && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              État de Rapprochement Bancaire Conforme NCT
            </h2>
            <p className="text-xs text-slate-500">
              Document officiel de justification des soldes de trésorerie pour réviseurs et commissaires aux comptes.
            </p>
          </div>

          <div className="space-y-4 max-w-2xl mx-auto text-xs font-mono">
            {/* Bank Side */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between font-bold text-slate-900 dark:text-white text-sm">
                <span>1. Solde du Relevé Bancaire au Dernier Jour :</span>
                <span>{report.bankStatementClosingBalance.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between text-emerald-600 pl-4">
                <span>(+) Recettes compta non encore créditées par la banque :</span>
                <span>+{report.uncreditedCompanyDeposits.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between text-rose-600 pl-4">
                <span>(-) Chèques émis non encore débités par la banque :</span>
                <span>-{report.unpresentedCompanyChecks.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between font-black text-slate-900 dark:text-white border-t border-slate-300 dark:border-slate-700 pt-2 text-sm">
                <span>(=) Solde Rapproché Théorique :</span>
                <span>{report.reconciledTheoreticalBalance.toFixed(3)} DT</span>
              </div>
            </div>

            {/* Book Side */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between font-bold text-slate-900 dark:text-white text-sm">
                <span>2. Solde du Compte 512100 en Comptabilité :</span>
                <span>{report.accountingBookBalance.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between text-rose-600 pl-4">
                <span>(-) Agio / Frais bancaires non encore comptabilisés :</span>
                <span>-{report.unrecordedBankDebits.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between text-emerald-600 pl-4">
                <span>(+) Virements reçus directs non encore comptabilisés :</span>
                <span>+{report.unrecordedBankCredits.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between font-black text-slate-900 dark:text-white border-t border-slate-300 dark:border-slate-700 pt-2 text-sm">
                <span>(=) Solde Comptable Corrigé :</span>
                <span>{(report.accountingBookBalance - report.unrecordedBankDebits + report.unrecordedBankCredits).toFixed(3)} DT</span>
              </div>
            </div>

            {/* Equilibrium Alert */}
            <div className={`p-4 rounded-xl border flex items-center justify-between font-bold text-sm ${
              report.isBalanced
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
            }`}>
              <span>ÉCART DE RAPPROCHEMENT :</span>
              <span>{report.difference.toFixed(3)} DT {report.isBalanced ? '✔ (PARFAIT)' : '❌ (À JUSTIFIER)'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Bank Statement Line */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Ajouter une Ligne de Relevé Bancaire"
      >
        <form onSubmit={handleAddBankLine} className="space-y-4">
          <Input
            label={t('date')}
            type="date"
            value={opDate}
            onChange={(e) => setOpDate(e.target.value)}
            required
          />

          <Input
            label={t('entryDescription')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ex: Virement client Société ABC, Frais tenue compte"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Débit (Sortie DT)"
              type="number"
              step="0.001"
              value={debitAmount}
              onChange={(e) => {
                setDebitAmount(e.target.value);
                if (e.target.value) setCreditAmount('');
              }}
              placeholder="0.000"
            />
            <Input
              label="Crédit (Entrée DT)"
              type="number"
              step="0.001"
              value={creditAmount}
              onChange={(e) => {
                setCreditAmount(e.target.value);
                if (e.target.value) setDebitAmount('');
              }}
              placeholder="0.000"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? t('loading') : t('save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

