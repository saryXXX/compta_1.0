/**
 * Tunisian Fixed Assets & Depreciation Page (Norme Comptable NCT 05).
 * Linear depreciation schedule with prorata temporis & automatic inventory dotation voucher.
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
import { FixedAsset, AmortizationRow } from '../../types/index.js';
import {
  Building2,
  Plus,
  Calendar,
  CheckCircle2,
  Trash2,
  Table,
  Layers,
  Archive,
} from 'lucide-react';

export const FixedAssetsPage: React.FC = () => {
  const { t } = useI18n();

  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);

  const [activeAsset, setActiveAsset] = useState<FixedAsset | undefined>(undefined);
  const [activeSchedule, setActiveSchedule] = useState<AmortizationRow[]>([]);

  // New Asset Form
  const [assetCode, setAssetCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('MATERIEL_INFO');
  const [acquisitionDate, setAcquisitionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [commissioningDate, setCommissioningDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [originalValueHt, setOriginalValueHt] = useState<string>('3500.000');
  const [depreciationRate, setDepreciationRate] = useState<string>('33.33');
  const [assetAccountCode, setAssetAccountCode] = useState<string>('228000');
  const [amortAccountCode, setAmortAccountCode] = useState<string>('282800');

  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch('/api/assets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAssets(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assetCode,
          name,
          category,
          acquisitionDate,
          commissioningDate,
          originalValueHt: parseFloat(originalValueHt),
          depreciationRate: parseFloat(depreciationRate),
          assetAccountCode,
          amortAccountCode,
          dotationAccountCode: '681100',
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erreur lors de la création de l’immobilisation');
      }

      setIsNewAssetModalOpen(false);
      setMessage('Immobilisation enregistrée avec succès !');
      // Reset
      setAssetCode('');
      setName('');
      fetchAssets();
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSchedule = async (asset: FixedAsset) => {
    setActiveAsset(asset);
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch(`/api/assets/${asset.id}/schedule`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSchedule(data.schedule || []);
        setIsScheduleModalOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePostDotations = async () => {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch('/api/assets/post-dotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ year: selectedYear }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la comptabilisation des dotations');
      }

      setMessage(data.message || 'Dotations comptabilisées avec succès !');
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette immobilisation ?')) return;
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch(`/api/assets/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessage('Immobilisation supprimée.');
        fetchAssets();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Metrics
  const totalGrossCost = assets.reduce((s, a) => s + a.originalValueHt, 0);
  const totalAccumulated = assets.reduce((s, a) => s + (a.currentAccumulatedAmort || 0), 0);
  const totalNetBookValue = assets.reduce((s, a) => s + (a.currentNetBookValue || a.originalValueHt), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
              <Building2 className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t('assetsTitle')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('assetsSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm" onClick={() => setIsNewAssetModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            {t('newAsset')}
          </Button>

          <Button variant="outline" size="sm" onClick={handlePostDotations} disabled={loading}>
            <Calendar className="w-4 h-4 mr-1.5" />
            Dotations {selectedYear}
          </Button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
          {error}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Valeur Brute Totale (HT)"
          value={<CurrencyDisplay amount={totalGrossCost} />}
          description="Comptes Classe 2"
          icon={<Layers className="w-5 h-5 text-blue-600" />}
        />
        <MetricCard
          title="Amortissements Cumulés"
          value={<CurrencyDisplay amount={totalAccumulated} />}
          description="Comptes Classe 28"
          icon={<Archive className="w-5 h-5 text-rose-600" />}
        />
        <MetricCard
          title="Valeur Comptable Nette (VCN)"
          value={<CurrencyDisplay amount={totalNetBookValue} />}
          description="Actif Net au Bilan"
          icon={<Building2 className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      {/* Assets Register Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold uppercase">
              <th className="py-3 px-4">Code & Désignation</th>
              <th className="py-3 px-4">Dates Acquis. / Service</th>
              <th className="py-3 px-4 text-center">Taux</th>
              <th className="py-3 px-4 text-right">Valeur Origine HT</th>
              <th className="py-3 px-4 text-right">Amort. Cumulés</th>
              <th className="py-3 px-4 text-right">VCN Actuelle</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {assets.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  Aucune immobilisation enregistrée. Cliquez sur "Nouvelle Immobilisation" pour créer une fiche.
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{asset.name}</div>
                    <div className="font-mono text-[11px] text-slate-400">{asset.assetCode} • {asset.category}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                    <div>Acq: {asset.acquisitionDate}</div>
                    <div className="text-[10px] text-amber-600">Serv: {asset.commissioningDate}</div>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                    {asset.depreciationRate}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold">
                    <CurrencyDisplay amount={asset.originalValueHt} />
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-rose-600">
                    <CurrencyDisplay amount={asset.currentAccumulatedAmort || 0} />
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                    <CurrencyDisplay amount={asset.currentNetBookValue || asset.originalValueHt} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewSchedule(asset)}
                      >
                        <Table className="w-3.5 h-3.5 mr-1" />
                        Tableau
                      </Button>
                      <button
                        onClick={() => handleDelete(asset.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: New Asset */}
      <Modal
        isOpen={isNewAssetModalOpen}
        onClose={() => setIsNewAssetModalOpen(false)}
        title="Enregistrer une Immobilisation (NCT 05)"
      >
        <form onSubmit={handleCreateAsset} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('assetCode')}
              value={assetCode}
              onChange={(e) => setAssetCode(e.target.value)}
              placeholder="ex: IMM-2025-01"
              required
            />
            <Select
              label={t('category')}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: 'MATERIEL_INFO', label: 'Matériel Informatique & Bureau' },
                { value: 'MOBILIER', label: 'Mobilier de Bureau' },
                { value: 'VEHICULE', label: 'Matériel de Transport' },
                { value: 'MACHINES', label: 'Installations & Outillage' },
                { value: 'LOGICIEL', label: 'Logiciels & Brevets (Incorporel)' },
              ]}
            />
          </div>

          <Input
            label={t('assetName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Ordinateur Dell Precision 3660 + 2 Écrans"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('acquisitionDate')}
              type="date"
              value={acquisitionDate}
              onChange={(e) => setAcquisitionDate(e.target.value)}
              required
            />
            <Input
              label={t('commissioningDate')}
              type="date"
              value={commissioningDate}
              onChange={(e) => setCommissioningDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('originalValueHt')}
              type="number"
              step="0.001"
              value={originalValueHt}
              onChange={(e) => setOriginalValueHt(e.target.value)}
              required
            />
            <Input
              label={t('depreciationRate')}
              type="number"
              step="0.01"
              value={depreciationRate}
              onChange={(e) => setDepreciationRate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('assetAccount')}
              value={assetAccountCode}
              onChange={(e) => setAssetAccountCode(e.target.value)}
              placeholder="228000"
              required
            />
            <Input
              label={t('amortAccount')}
              value={amortAccountCode}
              onChange={(e) => setAmortAccountCode(e.target.value)}
              placeholder="282800"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={() => setIsNewAssetModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? t('loading') : t('save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Amortization Schedule Table */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title={`Tableau d’Amortissement Linéaire : ${activeAsset?.name || ''}`}
      >
        <div className="space-y-4">
          <div className="text-xs text-slate-500">
            Valeur d'origine : <span className="font-mono font-bold text-slate-900 dark:text-white">{activeAsset?.originalValueHt.toFixed(3)} DT</span> • Taux : <span className="font-bold">{activeAsset?.depreciationRate}%</span>
          </div>

          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Année</th>
                  <th className="py-2.5 px-3 text-right">Base Amort.</th>
                  <th className="py-2.5 px-3 text-right">Dotation Annuelle</th>
                  <th className="py-2.5 px-3 text-right">Amort. Cumulés</th>
                  <th className="py-2.5 px-3 text-right">VCN Fin d'Exercice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {activeSchedule.map((row) => (
                  <tr key={row.year} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">{row.year}</td>
                    <td className="py-2.5 px-3 text-right">{row.grossValue.toFixed(3)}</td>
                    <td className="py-2.5 px-3 text-right text-rose-600 font-bold">{row.annualDepreciation.toFixed(3)}</td>
                    <td className="py-2.5 px-3 text-right">{row.closingAccumulated.toFixed(3)}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">{row.netBookValue.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsScheduleModalOpen(false)}>
              Fermer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

