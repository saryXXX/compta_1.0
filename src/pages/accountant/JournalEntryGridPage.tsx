/**
 * Direct Keyboard-first Journal Entry Grid (Saisie au kilomètre).
 * Designed for Accountants, Finance Managers & Comptables.
 * Real-time Debit = Credit balance enforcement with instant visual feedback and auto-balance.
 * 
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React, { useState, useEffect } from 'react';
import { useI18n } from '../../context/I18nContext.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { Badge } from '../../components/ui/Badge.js';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay.js';
import { Keyboard, Plus, Trash2, CheckCircle2, AlertTriangle, ArrowRight, Wand2 } from 'lucide-react';

interface GridLine {
  id: string;
  accountCode: string;
  description: string;
  debit: string;
  credit: string;
}

export const JournalEntryGridPage: React.FC = () => {
  const { t } = useI18n();

  const [journalCode, setJournalCode] = useState<string>('OD');
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const [lines, setLines] = useState<GridLine[]>([
    { id: '1', accountCode: '601000', description: '', debit: '', credit: '' },
    { id: '2', accountCode: '401100', description: '', debit: '', credit: '' },
  ]);

  const [chartAccounts, setChartAccounts] = useState<Array<{ accountCode: string; accountName: string }>>([]);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchAccounts();
    fetchRecentEntries();
  }, [journalCode]);

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch('/api/accounting/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChartAccounts(data.accounts || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecentEntries = async () => {
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch(`/api/accounting/entries?journal=${journalCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecentEntries(data.entries || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        accountCode: '',
        description: '',
        debit: '',
        credit: '',
      },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLine = (id: string, field: keyof GridLine, value: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;

        if (field === 'debit' && value !== '') {
          return { ...l, debit: value, credit: '' };
        }
        if (field === 'credit' && value !== '') {
          return { ...l, credit: value, debit: '' };
        }

        return { ...l, [field]: value };
      })
    );
  };

  // Balance calculation
  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const diff = Math.round(Math.abs(totalDebit - totalCredit) * 1000) / 1000;
  const isBalanced = diff < 0.001 && totalDebit > 0;

  // Auto-balance: fills the missing side on the last line
  const handleAutoBalance = () => {
    if (diff <= 0.001) return;
    const lastLine = lines[lines.length - 1];
    if (!lastLine) return;

    if (totalDebit > totalCredit) {
      updateLine(lastLine.id, 'credit', (parseFloat(lastLine.credit || '0') + diff).toFixed(3));
    } else {
      updateLine(lastLine.id, 'debit', (parseFloat(lastLine.debit || '0') + diff).toFixed(3));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!isBalanced) {
      setError(t('unbalancedAlert'));
      return;
    }

    if (!referenceNumber || !description) {
      setError('Veuillez renseigner le numéro de référence et le libellé.');
      return;
    }

    const payloadLines = lines
      .filter((l) => l.accountCode.trim().length > 0 && ((parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0))
      .map((l) => ({
        accountCode: l.accountCode.trim(),
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        description: l.description.trim() || description.trim(),
      }));

    if (payloadLines.length < 2) {
      setError('Une écriture doit comporter au moins 2 lignes renseignées.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch('/api/accounting/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          journalCode,
          entryDate,
          referenceNumber,
          description,
          lines: payloadLines,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la comptabilisation');
      }

      setMessage(`Écriture ${referenceNumber} comptabilisée avec succès !`);
      setReferenceNumber('');
      setDescription('');
      setLines([
        { id: '1', accountCode: '601000', description: '', debit: '', credit: '' },
        { id: '2', accountCode: '401100', description: '', debit: '', credit: '' },
      ]);
      fetchRecentEntries();
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Keyboard className="size-4" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {t('journalGridTitle')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('journalGridSubtitle')}
          </p>
        </div>

        {/* Real-time Balance Status Header Badge */}
        <div className="flex items-center gap-3">
          <div className={`px-3.5 py-1.5 rounded-md border flex items-center gap-2 text-xs font-bold shadow-subtle ${
            isBalanced
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
          }`}>
            {isBalanced ? (
              <>
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>{t('balancedAlert')}</span>
              </>
            ) : (
              <>
                <AlertTriangle className="size-4 text-rose-500" />
                <span>{t('differenceBalance')}: {diff.toFixed(3)} DT</span>
              </>
            )}
          </div>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs font-medium dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs font-medium dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 flex items-center gap-2">
          <AlertTriangle className="size-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Entry Voucher Card */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-subtle p-6 space-y-6">
        {/* Voucher Meta row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Select
            label={t('journalCode')}
            value={journalCode}
            onChange={(e) => setJournalCode(e.target.value)}
            options={[
              { value: 'OD', label: 'OD - Opérations Diverses' },
              { value: 'VE', label: 'VE - Ventes' },
              { value: 'AC', label: 'AC - Achats' },
              { value: 'BQ', label: 'BQ - Banque' },
              { value: 'CA', label: 'CA - Caisse' },
              { value: 'AN', label: 'AN - À-Nouveaux' },
            ]}
          />

          <Input
            label={t('entryDate')}
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            required
          />

          <Input
            label={t('referenceNumber')}
            placeholder="ex: CHQ-4982, OD-2025/01"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            required
          />

          <Input
            label={t('entryDescription')}
            placeholder="ex: Régularisation charges constatées d'avance"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* Lines Grid Table */}
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-md overflow-hidden shadow-subtle">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px]">
                <th className="py-3 px-3.5 w-52">{t('accountNumber')}</th>
                <th className="py-3 px-3.5">{t('notes')} / Libellé ligne</th>
                <th className="py-3 px-3.5 w-40 text-right">{t('debit')}</th>
                <th className="py-3 px-3.5 w-40 text-right">{t('credit')}</th>
                <th className="py-3 px-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lines.map((line) => (
                <tr key={line.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-2">
                    <input
                      type="text"
                      list="accounts-datalist"
                      value={line.accountCode}
                      onChange={(e) => updateLine(line.id, 'accountCode', e.target.value)}
                      placeholder="ex: 601000"
                      className="w-full px-2.5 py-1.5 font-mono text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-subtle"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                      placeholder={description || 'Libellé spécifique (optionnel)'}
                      className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-subtle"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={line.debit}
                      onChange={(e) => updateLine(line.id, 'debit', e.target.value)}
                      placeholder="0.000"
                      className="w-full px-2.5 py-1.5 font-mono text-xs text-right rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-subtle"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={line.credit}
                      onChange={(e) => updateLine(line.id, 'credit', e.target.value)}
                      placeholder="0.000"
                      className="w-full px-2.5 py-1.5 font-mono text-xs text-right rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-subtle"
                    />
                  </td>
                  <td className="p-2 text-center">
                    {lines.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="size-7 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 dark:bg-slate-800/70 font-bold border-t border-slate-200 dark:border-slate-700 text-xs">
                <td colSpan={2} className="py-3 px-3.5 text-right uppercase tracking-wider text-slate-500">
                  TOTAL ÉCRITURE (DT)
                </td>
                <td className="py-3 px-3.5 text-right font-mono text-slate-900 dark:text-white text-sm">
                  {totalDebit.toFixed(3)}
                </td>
                <td className="py-3 px-3.5 text-right font-mono text-slate-900 dark:text-white text-sm">
                  {totalCredit.toFixed(3)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          <datalist id="accounts-datalist">
            {chartAccounts.map((a) => (
              <option key={a.accountCode} value={a.accountCode}>
                {a.accountCode} - {a.accountName}
              </option>
            ))}
          </datalist>
        </div>

        {/* Buttons Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="size-3.5 mr-1" />
              Ajouter une ligne
            </Button>

            {!isBalanced && diff > 0.001 && (
              <Button type="button" variant="ghost" size="sm" onClick={handleAutoBalance} className="text-amber-600 dark:text-amber-400">
                <Wand2 className="size-3.5 mr-1" />
                Équilibrer l'écart ({diff.toFixed(3)} DT)
              </Button>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={!isBalanced || loading}
            className="w-full sm:w-auto"
          >
            <CheckCircle2 className="size-4 mr-2" />
            {loading ? t('loading') : t('postEntry')}
          </Button>
        </div>
      </form>

      {/* Recent Entries in this Journal */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-5 shadow-subtle space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Dernières écritures du journal {journalCode}</span>
            <Badge variant="outline" size="xs">{recentEntries.length}</Badge>
          </h2>
        </div>

        {recentEntries.length === 0 ? (
          <p className="text-xs text-slate-400">Aucune écriture enregistrée pour ce journal.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentEntries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-md transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{entry.referenceNumber}</span>
                    <span className="text-slate-400 font-mono text-[11px]">• {entry.entryDate}</span>
                    <Badge variant="outline" size="xs">{entry.journalCode}</Badge>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">{entry.description}</p>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {entry.lines.reduce((s: number, l: any) => s + l.debit, 0).toFixed(3)} DT
                  </span>
                  <span className="block text-[10px] text-emerald-600 font-bold">Équilibrée ✔</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
