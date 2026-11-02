/**
 * Fiscal Closing & Opening Entries (Journal des À-Nouveaux) Page.
 * Implements annual closing of Class 6 and 7 accounts to result account 131000,
 * and automatic generation of Journal AN for year N+1.
 * 
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React, { useState, useEffect } from 'react';
import { useI18n } from '../../context/I18nContext.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { MetricCard } from '../../components/ui/MetricCard.js';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay.js';
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Scale,
  CalendarCheck,
} from 'lucide-react';

export const FiscalClosingPage: React.FC = () => {
  const { t } = useI18n();

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() - 1);
  const [status, setStatus] = useState<any | undefined>(undefined);
  const [closingResult, setClosingResult] = useState<any | undefined>(undefined);

  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchClosingStatus();
  }, [selectedYear]);

  const fetchClosingStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch(`/api/closing/status?year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExecuteClosing = async () => {
    if (!confirm(`Confirmer la clôture annuelle des comptes pour l'exercice ${selectedYear} ? Les comptes de gestion (classes 6 et 7) seront soldés et le journal des À-Nouveaux sera généré au 01/01/${selectedYear + 1}.`)) {
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch('/api/closing/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ year: selectedYear }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la clôture');
      }

      setClosingResult(data);
      setMessage(data.message || 'Clôture et À-Nouveaux exécutés avec succès !');
      fetchClosingStatus();
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
              <Lock className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t('closingTitle')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('closingSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold"
          >
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>
                Exercice {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs font-medium dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
          {error}
        </div>
      )}

      {/* Status Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            {status?.isClosed ? (
              <div className="w-10 h-10 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                <Unlock className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Statut de l'Exercice {selectedYear}
              </h2>
              <p className="text-xs text-slate-500">
                {status?.isClosed ? 'Exercice clôturé et soldé' : 'Exercice en cours / ouvert aux saisies'}
              </p>
            </div>
          </div>

          <div>
            {status?.isClosed ? (
              <Badge variant="success">Clôturé (CLOTURE-{selectedYear})</Badge>
            ) : (
              <Badge variant="warning">Non Clôturé</Badge>
            )}
          </div>
        </div>

        {/* Action Callout */}
        {!status?.isClosed ? (
          <div className="bg-amber-50/60 dark:bg-amber-950/20 p-5 rounded-xl border border-amber-200 dark:border-amber-800/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-400">
                Prêt pour la clôture de l'exercice comptable {selectedYear} ?
              </h3>
              <p className="text-xs text-amber-800/80 dark:text-amber-500/80 mt-1 max-w-xl">
                Cette opération va automatiquement solder l'ensemble des comptes de charges (classe 6) et de produits (classe 7) vers le compte 131000, et générer l'écriture d'ouverture du Journal des À-Nouveaux au 01/01/{selectedYear + 1}.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleExecuteClosing}
              disabled={loading}
              className="shrink-0"
            >
              <Play className="w-4 h-4 mr-2" />
              {loading ? t('loading') : t('executeClosing')}
            </Button>
          </div>
        ) : (
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-5 rounded-xl border border-emerald-200 dark:border-emerald-800/40 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>L'exercice {selectedYear} a été clôturé avec succès selon les normes du SCE tunisien.</span>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-500">
              Le Journal des À-Nouveaux (Journal AN) a été généré au 01/01/{selectedYear + 1} avec reprise fidèle et équilibrée de l'ensemble des comptes de bilan.
            </p>
          </div>
        )}

        {/* Execution Details if just executed */}
        {closingResult && (
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs font-mono">
            <h4 className="font-bold text-slate-900 dark:text-white font-sans text-sm mb-2">
              Détails de l'Opération de Clôture :
            </h4>
            <div className="flex justify-between">
              <span>Charges soldées (Classe 6) :</span>
              <span>{closingResult.totalExpensesClosed.toFixed(3)} DT</span>
            </div>
            <div className="flex justify-between">
              <span>Produits soldés (Classe 7) :</span>
              <span>{closingResult.totalRevenuesClosed.toFixed(3)} DT</span>
            </div>
            <div className="flex justify-between font-bold border-t border-slate-300 dark:border-slate-700 pt-1">
              <span>Résultat Net Constaté (Compte 131000) :</span>
              <span className={closingResult.netAccountingResult >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {closingResult.netAccountingResult.toFixed(3)} DT
              </span>
            </div>
            <div className="flex justify-between text-indigo-600 font-bold border-t border-slate-300 dark:border-slate-700 pt-1">
              <span>Équilibre Journal AN au 01/01/{selectedYear + 1} :</span>
              <span>Débit: {closingResult.anTotalDebit.toFixed(3)} DT | Crédit: {closingResult.anTotalCredit.toFixed(3)} DT {closingResult.isEquilibrated ? '✔' : '❌'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

