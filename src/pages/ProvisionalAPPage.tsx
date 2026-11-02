/**
 * Provisional Installments (Acomptes Provisionnels AP1, AP2, AP3) Page.
 * Conforms to Art. 51 of Code de l'IRPP et de l'IS (30% of N-1 tax).
 * 
 * STRICT COMPLIANCE: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useI18n } from '../context/I18nContext.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { CurrencyDisplay } from '../components/ui/CurrencyDisplay.js';
import { Coins, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { ProvisionalPaymentAP } from '../types/index.js';

export const ProvisionalAPPage: React.FC = () => {
  const { authFetch } = useAuth();
  const { t } = useI18n();

  const [year, setYear] = useState(new Date().getFullYear());
  const [apList, setApList] = useState<ProvisionalPaymentAP[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAP = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`/api/fiscal/ap?year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setApList(data.apList || []);
      }
    } catch (err) {
      console.error('Failed to load AP:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAP();
  }, [year]);

  const handleMarkPaid = async (id: string) => {
    try {
      const res = await authFetch(`/api/fiscal/ap/${id}/pay`, { method: 'POST' });
      if (res.ok) {
        loadAP();
      }
    } catch (err) {
      console.error('Pay AP error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Coins className="h-6 w-6 text-amber-500" />
            <span>{t('apTitle')}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('apSubtitle')}
          </p>
        </div>

        {/* Year Selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-md shadow-sm border border-slate-200 dark:border-slate-800">
          <Calendar className="h-4 w-4 text-amber-500 ml-2" />
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
      </div>

      {/* Explanatory Box */}
      <div className="rounded-md bg-amber-50 dark:bg-amber-950/40 p-4 border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 space-y-1">
        <p className="font-bold flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          Principe Réglementaire des Acomptes Provisionnels en Tunisie :
        </p>
        <p>
          Chaque acompte provisionnel est égal à <strong>30% de l'impôt dû au titre de l'exercice précédent (N-1)</strong>.
          L'entreprise est légalement autorisée à <strong>déduire les retenues à la source subies</strong> sur ses créances clients de l'acompte à payer.
        </p>
      </div>

      {/* 3 AP Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {apList.map((ap) => (
          <div
            key={ap.id}
            className={`rounded-lg bg-white dark:bg-slate-900 p-5 shadow-md border transition-all duration-200 ${
              ap.paymentStatus === 'PAID'
                ? 'border-emerald-300 dark:border-emerald-800'
                : 'border-slate-200 dark:border-slate-800 hover:border-amber-400'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t('installment')}
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  AP {ap.installmentNumber}
                </h3>
              </div>
              <Badge variant={ap.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                {ap.paymentStatus === 'PAID' ? 'Réglé' : 'En Attente'}
              </Badge>
            </div>

            {/* Due date */}
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>Échéance limite : <strong className="text-slate-900 dark:text-white">{ap.dueDate}</strong></span>
            </div>

            {/* Calculations Breakdown */}
            <div className="mt-4 p-3 rounded-md bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-500">
                <span>Base IS N-1 :</span>
                <span>{ap.previousYearTaxBase.toFixed(3)} TND</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold">
                <span>Brut (30%) :</span>
                <span>{ap.installmentGross30.toFixed(3)} TND</span>
              </div>
              {ap.withholdingDeducted > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>- RS subies imputées :</span>
                  <span>- {ap.withholdingDeducted.toFixed(3)} TND</span>
                </div>
              )}
              <div className="pt-2 border-t dark:border-slate-700 flex justify-between text-sm font-bold text-slate-900 dark:text-white">
                <span>Net à décaisser :</span>
                <span className="text-tn-red">{ap.netPayable.toFixed(3)} TND</span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5">
              {ap.paymentStatus === 'PAID' ? (
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 py-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Acompte acquitté</span>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={() => handleMarkPaid(ap.id)}
                >
                  {t('payInstallment')}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

