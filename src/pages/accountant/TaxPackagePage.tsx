/**
 * Tunisian Tax Package Page (Liasse Fiscale & Détermination du Résultat Fiscal).
 * Implements:
 * - Tableau de passage du résultat comptable au résultat fiscal imposable
 * - Réintégrations & Déductions fiscales (Code de l'IRPP et de l'IS)
 * - Calcul de l'IS (15%), Minimum d'impôt (0.2% CA), imputation des AP et Retenues à la source.
 * 
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React, { useState, useEffect } from 'react';
import { useI18n } from '../../context/I18nContext.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { Modal } from '../../components/ui/Modal.js';
import { Badge } from '../../components/ui/Badge.js';
import { MetricCard } from '../../components/ui/MetricCard.js';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay.js';
import { FiscalAdjustment, TaxReconciliationReport } from '../../types/index.js';
import {
  Calculator,
  Plus,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
  Receipt,
  FileCheck,
} from 'lucide-react';

export const TaxPackagePage: React.FC = () => {
  const { t } = useI18n();

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [report, setReport] = useState<TaxReconciliationReport | undefined>(undefined);
  const [adjustments, setAdjustments] = useState<FiscalAdjustment[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Form State
  const [adjustmentType, setAdjustmentType] = useState<'REINTEGRATION' | 'DEDUCTION'>('REINTEGRATION');
  const [label, setLabel] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchReconciliation();
  }, [selectedYear]);

  const fetchReconciliation = async () => {
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch(`/api/tax-package/reconciliation?year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data.result);
        setAdjustments(data.adjustments || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch('/api/tax-package/adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          year: selectedYear,
          adjustmentType,
          label,
          amount: parseFloat(amount),
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Erreur');
      }

      setIsAddModalOpen(false);
      setMessage('Rectification fiscale enregistrée avec succès !');
      setLabel('');
      setAmount('');
      setNotes('');
      fetchReconciliation();
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdjustment = async (id: string) => {
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch(`/api/tax-package/adjustments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchReconciliation();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
              <Calculator className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t('taxPackageTitle')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('taxPackageSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                Exercice {y}
              </option>
            ))}
          </select>

          <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            {t('addAdjustment')}
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
            title={t('accountingResultBeforeTax')}
            value={<CurrencyDisplay amount={report.accountingProfitBeforeTax} />}
            description={`État de Résultat ${selectedYear}`}
            icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
          />
          <MetricCard
            title={t('netFiscalProfit')}
            value={<CurrencyDisplay amount={report.netFiscalProfit} />}
            description="Assiette soumise à l'IS"
            icon={<Receipt className="w-5 h-5 text-indigo-600" />}
          />
          <MetricCard
            title={t('grossIsDue')}
            value={<CurrencyDisplay amount={report.grossIsDue} />}
            description="IS 15% ou Minimum 0.2%"
            icon={<Calculator className="w-5 h-5 text-amber-600" />}
          />
          <MetricCard
            title={report.balancePayable > 0 ? t('finalBalanceDue') : t('creditCarriedForward')}
            value={<CurrencyDisplay amount={report.balancePayable > 0 ? report.balancePayable : report.taxCreditCarriedForward} />}
            description={report.balancePayable > 0 ? "À liquider au 25 mars N+1" : "Crédit d'IS reportable"}
            icon={<CheckCircle2 className={`w-5 h-5 ${report.balancePayable > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />}
          />
        </div>
      )}

      {/* Main Tableau de passage */}
      {report && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Tableau Officiel de Passage du Résultat Comptable au Résultat Fiscal (IS)
            </h2>
            <Badge variant="outline">Exercice Fiscal {selectedYear}</Badge>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {/* 1. Résultat Comptable */}
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
              <span>1. Résultat Comptable Net Avant Impôt (NCT 01)</span>
              <span>{report.accountingProfitBeforeTax.toFixed(3)} DT</span>
            </div>

            {/* 2. Réintégrations */}
            <div className="space-y-1.5 pl-4 text-rose-600">
              <div className="flex justify-between font-bold">
                <span>(+) RÉINTÉGRATIONS FISCALES :</span>
                <span>+{report.totalReintegrations.toFixed(3)} DT</span>
              </div>
              {adjustments
                .filter((a) => a.adjustmentType === 'REINTEGRATION')
                .map((a) => (
                  <div key={a.id} className="flex justify-between items-center pl-4 text-[11px] text-slate-600 dark:text-slate-400">
                    <span>• {a.label} {a.notes && `(${a.notes})`}</span>
                    <div className="flex items-center gap-2">
                      <span>+{a.amount.toFixed(3)} DT</span>
                      <button onClick={() => handleDeleteAdjustment(a.id)} className="text-slate-400 hover:text-rose-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {/* 3. Déductions */}
            <div className="space-y-1.5 pl-4 text-emerald-600">
              <div className="flex justify-between font-bold">
                <span>(-) DÉDUCTIONS FISCALES :</span>
                <span>-{report.totalDeductions.toFixed(3)} DT</span>
              </div>
              {adjustments
                .filter((a) => a.adjustmentType === 'DEDUCTION')
                .map((a) => (
                  <div key={a.id} className="flex justify-between items-center pl-4 text-[11px] text-slate-600 dark:text-slate-400">
                    <span>• {a.label} {a.notes && `(${a.notes})`}</span>
                    <div className="flex items-center gap-2">
                      <span>-{a.amount.toFixed(3)} DT</span>
                      <button onClick={() => handleDeleteAdjustment(a.id)} className="text-slate-400 hover:text-rose-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {/* 4. Résultat Fiscal Imposable */}
            <div className="flex justify-between py-2.5 border-t border-b border-slate-300 dark:border-slate-700 font-black text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/60 px-3 rounded-lg">
              <span>(=) RÉSULTAT FISCAL NET IMPOSABLE</span>
              <span>{report.netFiscalProfit.toFixed(3)} DT</span>
            </div>

            {/* 5. Liquidation IS */}
            <div className="bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200/60 dark:border-amber-800/40 space-y-2 text-slate-800 dark:text-slate-200">
              <p className="font-bold text-amber-900 dark:text-amber-400">LIQUIDATION DE L'IMPÔT SUR LES SOCIÉTÉS (IS) :</p>
              <div className="flex justify-between pl-4">
                <span>• IS calculé au taux standard (15%) :</span>
                <span>{report.calculatedIs.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between pl-4">
                <span>• Minimum d'IS légal (0.2% du Chiffre d'Affaires / Plancher) :</span>
                <span>{report.minimumIs.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between font-bold pl-4 text-slate-900 dark:text-white border-t border-amber-200/60 pt-1">
                <span>• Impôt Brut Exigible [Max(IS calculé, Minimum d'IS)] :</span>
                <span>{report.grossIsDue.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between pl-4 text-emerald-700 dark:text-emerald-400">
                <span>(-) Acomptes provisionnels payés (AP1 + AP2 + AP3) :</span>
                <span>-{report.apDeducted.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between pl-4 text-emerald-700 dark:text-emerald-400">
                <span>(-) Retenues à la source subies (Compte 4348) :</span>
                <span>-{report.withholdingTaxDeducted.toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between font-black text-sm border-t border-amber-300 dark:border-amber-700 pt-2 text-slate-900 dark:text-white">
                <span>{report.balancePayable > 0 ? "(=) RELIQUAT D'IS RESTANT À PAYER :" : "(=) CRÉDIT D'IMPÔT SUR LES SOCIÉTÉS REPORTABLE :"}</span>
                <span className={report.balancePayable > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                  {report.balancePayable > 0 ? report.balancePayable.toFixed(3) : report.taxCreditCarriedForward.toFixed(3)} DT
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Fiscal Adjustment */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Ajouter une Rectification Fiscale"
      >
        <form onSubmit={handleAddAdjustment} className="space-y-4">
          <Select
            label="Type de Rectification"
            value={adjustmentType}
            onChange={(e) => setAdjustmentType(e.target.value as any)}
            options={[
              { value: 'REINTEGRATION', label: '(+) Réintégration (Charge comptable non admise)' },
              { value: 'DEDUCTION', label: '(-) Déduction (Produit exonéré / Dégrèvement)' },
            ]}
          />

          <Input
            label="Intitulé de la Rectification"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="ex: Amendes et pénalités fiscales (Art. 12 CIRPP/IS), Dividendes exonérés"
            required
          />

          <Input
            label="Montant (DT)"
            type="number"
            step="0.001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.000"
            required
          />

          <Input
            label="Justification / Référence légale (Optionnel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ex: Procès-verbal contrôle n° 142"
          />

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

