/**
 * Annual Employer Declaration (DECEMP & TEJ Platform) Page.
 * Conforms to the official Tunisian DGI magnetic support / TEJ format.
 * 
 * STRICT COMPLIANCE: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useI18n } from '../context/I18nContext.js';
import { Button } from '../components/ui/Button.js';
import { CurrencyDisplay } from '../components/ui/CurrencyDisplay.js';
import { FileCheck2, Download, Calendar, Users, Award, ShieldCheck } from 'lucide-react';
import { EmployerDeclarationReport } from '../types/index.js';

export const EmployerDecPage: React.FC = () => {
  const { authFetch } = useAuth();
  const { t } = useI18n();

  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState<EmployerDeclarationReport | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`/api/fiscal/employer?year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
      }
    } catch (err) {
      console.error('Failed to load employer declaration:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [year]);

  const handleDownloadTej = async (type: 'DECEMP' | 'ANXEMP') => {
    try {
      const res = await authFetch(`/api/fiscal/employer/tej?year=${year}&type=${type}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_${year}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Download TEJ error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileCheck2 className="h-6 w-6 text-emerald-500" />
            <span>{t('employerTitle')}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('employerSubtitle')}
          </p>
        </div>

        {/* Year Selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-md shadow-sm border border-slate-200 dark:border-slate-800">
          <Calendar className="h-4 w-4 text-emerald-500 ml-2" />
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="text-xs font-semibold bg-transparent border-0 text-slate-800 dark:text-slate-200 focus:ring-0 cursor-pointer font-mono"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                Année {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TEJ Platform Export Banner */}
      <div className="rounded-lg bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 text-white p-5 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded backdrop-blur">
            Portail Officiel TEJ • Direction Générale des Impôts
          </span>
          <h2 className="text-xl font-bold mt-2">
            Génération des Fichiers Textes Homologués DGI
          </h2>
          <p className="text-xs opacity-80 mt-1 max-w-xl">
            Téléchargez directement les fichiers normés <code>DECEMP.txt</code> et <code>ANXEMP.txt</code> pour les téléverser sur la plateforme TEJ avant le 28 février.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="secondary"
            size="md"
            className="bg-white text-emerald-800 hover:bg-slate-100 font-bold shadow-md"
            icon={<Download className="h-4 w-4" />}
            onClick={() => handleDownloadTej('DECEMP')}
          >
            DECEMP.txt
          </Button>

          <Button
            variant="secondary"
            size="md"
            className="bg-white text-emerald-800 hover:bg-slate-100 font-bold shadow-md"
            icon={<Download className="h-4 w-4" />}
            onClick={() => handleDownloadTej('ANXEMP')}
          >
            ANXEMP.txt
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Salaries & IRPP */}
        <div className="rounded-lg bg-white dark:bg-slate-900 p-5 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-base mb-4">
            <Users className="h-5 w-5 text-sky-500" />
            <span>Annexe I : Traitements & Salaires</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div className="flex justify-between p-2.5 rounded-md bg-slate-50 dark:bg-slate-850">
              <span className="font-sans text-slate-500">Masse salariale brute :</span>
              <span className="font-bold text-slate-900 dark:text-white">
                <CurrencyDisplay amount={report?.totalGrossSalaries || 0} />
              </span>
            </div>
            <div className="flex justify-between p-2.5 rounded-md bg-slate-50 dark:bg-slate-850">
              <span className="font-sans text-slate-500">Total IRPP retenu à la source :</span>
              <span className="font-bold text-tn-red">
                <CurrencyDisplay amount={report?.totalIrppWithheld || 0} />
              </span>
            </div>
          </div>
        </div>

        {/* Professional Fees & Rent */}
        <div className="rounded-lg bg-white dark:bg-slate-900 p-5 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-base mb-4">
            <Award className="h-5 w-5 text-amber-500" />
            <span>Annexe II : Honoraires, Commissions & Loyers</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div className="flex justify-between p-2.5 rounded-md bg-slate-50 dark:bg-slate-850">
              <span className="font-sans text-slate-500">Montant total brut servi :</span>
              <span className="font-bold text-slate-900 dark:text-white">
                <CurrencyDisplay amount={report?.totalFeesPaid || 0} />
              </span>
            </div>
            <div className="flex justify-between p-2.5 rounded-md bg-slate-50 dark:bg-slate-850">
              <span className="font-sans text-slate-500">Total retenues 5% / 15% opérées :</span>
              <span className="font-bold text-emerald-600">
                <CurrencyDisplay amount={report?.totalFeesWithheld || 0} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Annex II Providers Detail Table */}
      <div className="rounded-lg bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            Détail des Bénéficiaires Déclarés (Annexe II)
          </h3>
          <p className="text-xs text-slate-500">
            Liste des prestataires de services, experts et consultants assujettis à la retenue à la source
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 font-semibold text-slate-500 uppercase">
              <tr>
                <th className="py-3 px-4">Bénéficiaire / Prestataire</th>
                <th className="py-3 px-4">Matricule Fiscal / CIN</th>
                <th className="py-3 px-4">Qualité</th>
                <th className="py-3 px-4 text-right">Montant Brut</th>
                <th className="py-3 px-4 text-center">Taux RS</th>
                <th className="py-3 px-4 text-right">Retenue Opérée</th>
                <th className="py-3 px-4 text-right">Montant Net Payé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {report?.feesProviders?.map((prov, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
                  <td className="py-3 px-4 font-sans font-bold text-slate-900 dark:text-white">
                    {prov.name}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                    {prov.taxIdOrCin}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-500">
                    {prov.profession}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <CurrencyDisplay amount={prov.grossAmount} />
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-amber-600">
                    {prov.withholdingRate}%
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-tn-red">
                    <CurrencyDisplay amount={prov.withholdingAmount} />
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                    <CurrencyDisplay amount={prov.netAmount} />
                  </td>
                </tr>
              ))}
              {(!report?.feesProviders || report.feesProviders.length === 0) && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 font-sans">
                    Aucun honoraire ou retenue à déclarer pour l'exercice {year}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

