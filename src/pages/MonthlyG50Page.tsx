/**
 * Tunisian Monthly Tax Return Page (Déclaration Mensuelle des Impôts - DGI Modèle 2023).
 * Complete implementation based on the official 12-page form MENSUELLE__2023.pdf.
 * Dynamic rendering of fields according to taxpayer profile and selected tax schedules.
 * 
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useI18n } from '../context/I18nContext.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { CurrencyDisplay } from '../components/ui/CurrencyDisplay.js';
import {
  Receipt,
  Calendar,
  Printer,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Building2,
  FileText,
  Save,
  CheckSquare,
  Square,
  Percent,
  Coins,
  Scale,
  Briefcase,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  G50Declaration,
  DeclarationCode,
  TaxpayerProfile,
  ActiveTaxTypes,
} from '../types/index.js';

export const MonthlyG50Page: React.FC = () => {
  const { user, authFetch } = useAuth();
  const { t } = useI18n();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [declarationCode, setDeclarationCode] = useState<DeclarationCode>('0');
  const [profile, setProfile] = useState<TaxpayerProfile>('COMMERCIAL');

  // 10-tax selection matrix (Page 1 of MENSUELLE__2023.pdf)
  const [activeTaxes, setActiveTaxes] = useState<ActiveTaxTypes>({
    withholdingTax: true,
    tfp: true,
    foprolos: true,
    consumptionTax: false,
    vat: true,
    otherTurnoverTaxes: false,
    stampDuty: true,
    tcl: true,
    hotelTax: false,
    alcoholLicence: false,
  });

  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'RS' | 'TFP' | 'TVA' | 'TCL' | 'OTHER'>('SUMMARY');
  const [declaration, setDeclaration] = useState<G50Declaration | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | undefined>(undefined);

  const months = [
    { value: 1, label: 'Janvier / جانفي' },
    { value: 2, label: 'Février / فيفري' },
    { value: 3, label: 'Mars / مارس' },
    { value: 4, label: 'Avril / أفريل' },
    { value: 5, label: 'Mai / ماي' },
    { value: 6, label: 'Juin / جوان' },
    { value: 7, label: 'Juillet / جويلية' },
    { value: 8, label: 'Août / أوت' },
    { value: 9, label: 'Septembre / سبتمبر' },
    { value: 10, label: 'Octobre / أكتوبر' },
    { value: 11, label: 'Novembre / نوفمبر' },
    { value: 12, label: 'Décembre / ديسمبر' },
  ];

  // Quick profile changer
  const handleProfileChange = (newProfile: TaxpayerProfile) => {
    setProfile(newProfile);
    if (newProfile === 'COMMERCIAL') {
      setActiveTaxes({
        withholdingTax: true,
        tfp: true,
        foprolos: true,
        consumptionTax: false,
        vat: true,
        otherTurnoverTaxes: false,
        stampDuty: true,
        tcl: true,
        hotelTax: false,
        alcoholLicence: false,
      });
    } else if (newProfile === 'INDUSTRIAL') {
      setActiveTaxes({
        withholdingTax: true,
        tfp: true,
        foprolos: true,
        consumptionTax: false,
        vat: true,
        otherTurnoverTaxes: true, // FODEC 1%
        stampDuty: true,
        tcl: true,
        hotelTax: false,
        alcoholLicence: false,
      });
    } else if (newProfile === 'EXPORTER') {
      setActiveTaxes({
        withholdingTax: true,
        tfp: true,
        foprolos: true,
        consumptionTax: false,
        vat: true,
        otherTurnoverTaxes: false,
        stampDuty: true,
        tcl: true,
        hotelTax: false,
        alcoholLicence: false,
      });
    } else if (newProfile === 'HOTEL') {
      setActiveTaxes({
        withholdingTax: true,
        tfp: true,
        foprolos: true,
        consumptionTax: false,
        vat: true,
        otherTurnoverTaxes: true,
        stampDuty: true,
        tcl: true,
        hotelTax: true,
        alcoholLicence: false,
      });
    } else if (newProfile === 'RESTAURANT') {
      setActiveTaxes({
        withholdingTax: true,
        tfp: true,
        foprolos: true,
        consumptionTax: false,
        vat: true,
        otherTurnoverTaxes: true,
        stampDuty: true,
        tcl: true,
        hotelTax: false,
        alcoholLicence: true,
      });
    }
  };

  const toggleTax = (key: keyof ActiveTaxTypes) => {
    setProfile('CUSTOM');
    setActiveTaxes((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const fetchSimulation = async () => {
    try {
      setLoading(true);
      setSuccessMsg(undefined);
      const activeTaxesParam = encodeURIComponent(JSON.stringify(activeTaxes));
      const res = await authFetch(
        `/api/fiscal/g50/simulate?month=${selectedMonth}&year=${selectedYear}&code=${declarationCode}&profile=${profile}&activeTaxes=${activeTaxesParam}`
      );
      if (res.ok) {
        const data = await res.json();
        setDeclaration(data.simulation);
      }
    } catch (err) {
      console.error('Failed to simulate G50:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimulation();
  }, [selectedMonth, selectedYear, declarationCode, profile, activeTaxes]);

  const handleSave = async () => {
    if (!declaration) return;
    try {
      setSaving(true);
      const res = await authFetch('/api/fiscal/g50/save', {
        method: 'POST',
        body: JSON.stringify({
          ...declaration,
          declarationCode,
          profile,
          activeTaxes,
          status: 'DEPOSITED',
        }),
      });

      if (res.ok) {
        setSuccessMsg(
          `Déclaration fiscale de ${months.find((m) => m.value === selectedMonth)?.label} ${selectedYear} validée et enregistrée avec succès.`
        );
      }
    } catch (err) {
      console.error('Failed to save G50:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Official Header Strip */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-subtle flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-tn-carmin-subtle text-tn-carmin-primary border border-red-200/60 dark:bg-red-950/40 dark:border-red-900/60">
              RÉPUBLIQUE TUNISIENNE • DGI
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Modèle Officiel 2023 (12 Pages)
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Déclaration Mensuelle des Impôts • <span className="font-arabic font-normal text-tn-carmin-primary text-xl">التصريح الشهري بالأداءات</span>
          </h1>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dossier : <strong className="text-slate-700 dark:text-slate-300 font-bold">{user?.tenantName}</strong> • MF : <strong className="text-tn-carmin-primary font-mono">{user?.tenantTaxId}</strong>
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCcw className="size-3.5" />}
            onClick={fetchSimulation}
            disabled={loading}
          >
            Actualiser
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<Printer className="size-3.5" />}
            onClick={() => window.print()}
          >
            Imprimer (DGI)
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Save className="size-3.5" />}
            onClick={handleSave}
            disabled={saving || !declaration}
          >
            {saving ? 'Enregistrement...' : 'Valider & Déposer'}
          </Button>
        </div>
      </div>

      {successMsg ? (
        <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      ) : undefined}

      {/* Control Bar: Période, Code Déclaration & Profil d'Entreprise */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-subtle text-xs">
        {/* Période (Mois / Année) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Période Fiscale (Mois & Année)
          </label>
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="flex-1 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs focus:ring-1 focus:ring-tn-carmin-primary"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="w-24 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-xs focus:ring-1 focus:ring-tn-carmin-primary"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* رمز التصريح (Code Déclaration) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            رمز التصريح • Type de Déclaration
          </label>
          <select
            value={declarationCode}
            onChange={(e) => setDeclarationCode(e.target.value as DeclarationCode)}
            className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs focus:ring-1 focus:ring-tn-carmin-primary"
          >
            <option value="0">0: تلقائي (Spontané / Dépôt Mensuel Normal)</option>
            <option value="1">1: تسوية (Régularisation spontanée)</option>
            <option value="2">2: تصحيح (Rectificatif / Remplace déclaration)</option>
            <option value="3">3: توظيف إجباري (Taxation d'office DGI)</option>
            <option value="4">4: توقيف نشاط (Cessation d'activité)</option>
          </select>
        </div>

        {/* Profil Fiscal d'Activité */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Profil Réglementaire de l'Entreprise
          </label>
          <select
            value={profile}
            onChange={(e) => handleProfileChange(e.target.value as TaxpayerProfile)}
            className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs focus:ring-1 focus:ring-tn-carmin-primary"
          >
            <option value="COMMERCIAL">Commerce & Services (Standard: RS, TFP, FOPROLOS, TVA, Timbre, TCL)</option>
            <option value="INDUSTRIAL">Industrie & Fabrication (+ FODEC 1%, TFP 1%)</option>
            <option value="EXPORTER">Totalement Exportatrice (Suspension TVA, TCL 0.1%)</option>
            <option value="HOTEL">Établissement Hôtelier & Tourisme (+ Taxe Hôtelière 2%)</option>
            <option value="RESTAURANT">Restauration & Boissons (+ Redevance 1-3%, Licence)</option>
            <option value="CUSTOM">Personnalisé (Sélection manuelle des cases)</option>
          </select>
        </div>
      </div>

      {/* 10-Tax Matrix Selector (Page 1 DGI: نوع الأداء أو المعلوم المدفوع على أساس هذا التصريح) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-subtle space-y-2">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Tableau des Taxes Déclarées Ce Mois (Page 1 DGI • نوع الأداء أو المعلوم المدفوع)
          </span>
          <span className="text-[10px] text-slate-400">
            Cliquer pour activer / masquer une rubrique
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { key: 'withholdingTax', label: 'الخصم من المورد (RS)', sub: 'Retenues' },
            { key: 'tfp', label: 'التكوين المهني (TFP)', sub: '1% / 2%' },
            { key: 'foprolos', label: 'صندوق المسكن (FOPROLOS)', sub: '1%' },
            { key: 'vat', label: 'الأداء على القيمة المضافة (TVA)', sub: '19%, 13%, 7%' },
            { key: 'stampDuty', label: 'طابع جبائي (Timbre)', sub: '1 DT' },
            { key: 'tcl', label: 'المعلوم على المؤسسات (TCL)', sub: '0.2% / 0.1%' },
            { key: 'otherTurnoverTaxes', label: 'معاليم أخرى (FODEC)', sub: '1%' },
            { key: 'consumptionTax', label: 'معلوم الاستهلاك (DC)', sub: 'Spécifique' },
            { key: 'hotelTax', label: 'معلوم النزل (Hôtellerie)', sub: '2%' },
            { key: 'alcoholLicence', label: 'معلوم الإجازة (Licence)', sub: 'Forfait' },
          ].map((item) => {
            const isChecked = activeTaxes[item.key as keyof ActiveTaxTypes];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => toggleTax(item.key as keyof ActiveTaxTypes)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-semibold transition-all ${
                  isChecked
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-850 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                }`}
              >
                {isChecked ? <CheckSquare className="size-3.5 text-tn-carmin-primary" /> : <Square className="size-3.5 opacity-40" />}
                <span>{item.label}</span>
                <span className="text-[10px] opacity-60 font-mono font-normal">({item.sub})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex gap-1.5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 text-xs font-bold scrollbar-thin">
        <button
          onClick={() => setActiveTab('SUMMARY')}
          className={`px-3 py-2 rounded-t-md transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'SUMMARY'
              ? 'border-tn-carmin-primary text-tn-carmin-primary bg-red-50/50 dark:bg-red-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="size-3.5" />
          <span>Bordereau Récapitulatif (خلاصة الأداءات)</span>
        </button>

        {activeTaxes.withholdingTax && (
          <button
            onClick={() => setActiveTab('RS')}
            className={`px-3 py-2 rounded-t-md transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'RS'
                ? 'border-tn-carmin-primary text-tn-carmin-primary bg-red-50/50 dark:bg-red-950/20'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Retenue à la Source (الخصم من المورد)</span>
            <Badge variant="outline" size="xs">
              {(declaration?.withholdingTotal || 0).toFixed(3)} DT
            </Badge>
          </button>
        )}

        {(activeTaxes.tfp || activeTaxes.foprolos) && (
          <button
            onClick={() => setActiveTab('TFP')}
            className={`px-3 py-2 rounded-t-md transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'TFP'
                ? 'border-tn-carmin-primary text-tn-carmin-primary bg-red-50/50 dark:bg-red-950/20'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>TFP & FOPROLOS (التكوين والمسكن)</span>
            <Badge variant="outline" size="xs">
              {((declaration?.tfpTotal || 0) + (declaration?.foprolosTotal || 0)).toFixed(3)} DT
            </Badge>
          </button>
        )}

        {activeTaxes.vat && (
          <button
            onClick={() => setActiveTab('TVA')}
            className={`px-3 py-2 rounded-t-md transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'TVA'
                ? 'border-tn-carmin-primary text-tn-carmin-primary bg-red-50/50 dark:bg-red-950/20'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>TVA (الأداء على القيمة المضافة)</span>
            <Badge variant={(declaration?.vatNetDue || 0) > 0 ? 'vat' : 'success'} size="xs">
              {(declaration?.vatNetDue || 0) > 0
                ? `${(declaration?.vatNetDue || 0).toFixed(3)} DT`
                : `Crédit ${(declaration?.vatCreditGenerated || 0).toFixed(3)} DT`}
            </Badge>
          </button>
        )}

        {(activeTaxes.stampDuty || activeTaxes.tcl) && (
          <button
            onClick={() => setActiveTab('TCL')}
            className={`px-3 py-2 rounded-t-md transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'TCL'
                ? 'border-tn-carmin-primary text-tn-carmin-primary bg-red-50/50 dark:bg-red-950/20'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Timbre & TCL (المعاليم المحلية)</span>
            <Badge variant="outline" size="xs">
              {((declaration?.tclTotal || 0) + (declaration?.stampDutyTotal || 0)).toFixed(3)} DT
            </Badge>
          </button>
        )}

        {(activeTaxes.otherTurnoverTaxes || activeTaxes.consumptionTax || activeTaxes.hotelTax || activeTaxes.alcoholLicence) && (
          <button
            onClick={() => setActiveTab('OTHER')}
            className={`px-3 py-2 rounded-t-md transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'OTHER'
                ? 'border-tn-carmin-primary text-tn-carmin-primary bg-red-50/50 dark:bg-red-950/20'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>FODEC & Autres Taxes</span>
          </button>
        )}
      </div>

      {/* TAB 0: MASTER BORDEREAU RÉCAPITULATIF (خلاصة الأداءات والمعاليم - Page 9 DGI) */}
      {activeTab === 'SUMMARY' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-subtle overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>خلاصة الأداءات والمعاليم الواجب دفعها (Page 9 du Formulaire Officiel)</span>
                  <Badge variant="outline" size="xs">DGI • Recette des Finances</Badge>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Synthèse réglementaire des impôts liquidés pour le compte du Trésor public tunisien.
                </p>
              </div>

              {declaration?.isLegalMinimumApplied && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 px-2.5 py-1 rounded-md">
                  <Info className="size-3.5 text-amber-600" />
                  <span>Plancher légal 30 DT appliqué (Note 2 Page 9)</span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4 w-72">الضريبة أو المعلوم • Impôt / Taxe</th>
                    <th className="py-2.5 px-4 text-right">مبلغ أصل الأداء (Principal)</th>
                    <th className="py-2.5 px-4 text-right">الطرح (Déductions / Déjà versé)</th>
                    <th className="py-2.5 px-4 text-right">خطايا التأخير (Pénalités)</th>
                    <th className="py-2.5 px-4 text-right">الأداء المستوجب (Net à Payer)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
                  {declaration?.summaryRows?.map((row) => (
                    <tr
                      key={row.id}
                      className={row.principalAmount > 0 ? 'hover:bg-slate-50/50 dark:hover:bg-slate-850' : 'opacity-40'}
                    >
                      <td className="py-2 px-4 font-sans font-semibold text-slate-800 dark:text-slate-200">
                        <span>{row.name}</span>
                        <span className="block text-[10px] text-slate-400 font-arabic font-normal">{row.arabicLabel}</span>
                      </td>
                      <td className="py-2 px-4 text-right font-bold text-slate-900 dark:text-white">
                        {row.principalAmount > 0 ? row.principalAmount.toFixed(3) : '-'}
                      </td>
                      <td className="py-2 px-4 text-right text-slate-400">
                        {row.deductionsPaid > 0 ? row.deductionsPaid.toFixed(3) : '-'}
                      </td>
                      <td className="py-2 px-4 text-right text-rose-600">
                        {row.penalties > 0 ? row.penalties.toFixed(3) : '-'}
                      </td>
                      <td className="py-2 px-4 text-right font-bold text-slate-900 dark:text-white">
                        {row.netDue > 0 ? row.netDue.toFixed(3) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-900 dark:border-white text-xs">
                  <tr>
                    <td className="py-3 px-4 font-sans text-sm">
                      المجموع العام • TOTAL GÉNÉRAL À RÉGLER (DT) :
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm">
                      {(declaration?.totalPrincipalDue || 0).toFixed(3)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {(declaration?.taxesAlreadyPaid || 0).toFixed(3)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600">
                      {(declaration?.latePenaltyAmount || 0).toFixed(3)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-base text-tn-carmin-primary font-black">
                      {(declaration?.totalToPay || 0).toFixed(3)} TND
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Large Settlement Banner */}
          <div className="rounded-lg bg-gradient-to-r from-red-600 to-tn-darkred text-white p-5 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase opacity-90 block">
                Total Net Liquidation DGI • المبلغ الجملي المستوجب دفعه للقباضة
              </span>
              <span className="text-3xl font-black font-mono tracking-tight mt-1 block">
                <CurrencyDisplay amount={declaration?.totalToPay || 0} />
              </span>
              <p className="text-xs opacity-80 mt-1">
                Échéance légale pour personnes morales : <strong className="underline">28 du mois</strong> • À régler par télé-règlement DGI ou auprès de la Recette de rattachement.
              </p>
            </div>

            <div className="text-right">
              <Button
                variant="secondary"
                size="md"
                className="bg-white text-red-800 hover:bg-slate-100 font-bold shadow-md"
                icon={<Save className="size-4" />}
                onClick={handleSave}
                disabled={saving || !declaration}
              >
                Confirmer & Téléverser
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: RETENUE À LA SOURCE (Pages 1-4 DGI) */}
      {activeTab === 'RS' && activeTaxes.withholdingTax && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-subtle p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                الخصم من المورد • Retenue à la Source (Lignes 1 à 30 du Formulaire)
              </h3>
              <p className="text-[11px] text-slate-400">
                Retenues opérées sur salaires, honoraires, loyers et achats ≥ 1000 DT TTC.
              </p>
            </div>
            <Badge variant="outline">
              Total RS : {(declaration?.withholdingTotal || 0).toFixed(3)} DT
            </Badge>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-500 uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 w-16">Ligne</th>
                  <th className="py-2.5 px-4">Rubrique & Nature de la Retenue</th>
                  <th className="py-2.5 px-4 text-right">Assiette (DT)</th>
                  <th className="py-2.5 px-4 text-center">Taux Légal</th>
                  <th className="py-2.5 px-4 text-right">Retenue Due (DT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
                {declaration?.withholdingLines?.map((line) => (
                  <tr key={line.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-850">
                    <td className="py-2.5 px-4 font-bold text-slate-400 font-mono">{line.code}</td>
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-800 dark:text-slate-200">
                      {line.label}
                    </td>
                    <td className="py-2.5 px-4 text-right">{line.baseAmount.toFixed(3)}</td>
                    <td className="py-2.5 px-4 text-center font-bold text-tn-carmin-primary">
                      {line.rate > 0 ? `${line.rate}%` : 'Barème'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                      {line.taxAmount.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TFP & FOPROLOS (Page 4 DGI) */}
      {activeTab === 'TFP' && (activeTaxes.tfp || activeTaxes.foprolos) && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-subtle p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              الأداء على التكوين المهني والمساهمة في صندوق النهوض بالمسكن لفائدة الأجراء
            </h3>
            <p className="text-[11px] text-slate-400">
              Assiette calculée automatiquement sur la masse salariale brute déclarée à la CNSS.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TFP Card */}
            {activeTaxes.tfp && (
              <div className="p-4 rounded-md bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-900 dark:text-white uppercase">
                    1. Taxe de Formation Professionnelle (TFP)
                  </span>
                  <Badge variant="vat">Taux : {declaration?.tfpRate || 2}%</Badge>
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span className="font-sans">Masse salariale brute CNSS :</span>
                    <span>{(declaration?.grossPayroll || 0).toFixed(3)} DT</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span className="font-sans">Déduction avance TFP autorisée :</span>
                    <span>- {(declaration?.tfpAdvanceDeduction || 0).toFixed(3)} DT</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-white">
                    <span className="font-sans">TFP Nette Due :</span>
                    <span className="text-tn-carmin-primary">{(declaration?.tfpTotal || 0).toFixed(3)} DT</span>
                  </div>
                </div>
              </div>
            )}

            {/* FOPROLOS Card */}
            {activeTaxes.foprolos && (
              <div className="p-4 rounded-md bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-900 dark:text-white uppercase">
                    2. Contribution FOPROLOS
                  </span>
                  <Badge variant="info">Taux Unique : 1%</Badge>
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span className="font-sans">Masse salariale brute CNSS :</span>
                    <span>{(declaration?.grossPayroll || 0).toFixed(3)} DT</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span className="font-sans">Taux réglementaire :</span>
                    <span>1.000%</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-white">
                    <span className="font-sans">FOPROLOS Dû :</span>
                    <span className="text-sky-600">{(declaration?.foprolosTotal || 0).toFixed(3)} DT</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TVA (Pages 5-6 DGI) */}
      {activeTab === 'TVA' && activeTaxes.vat && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-subtle p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                الأداء على القيمة المضافة • Taxe sur la Valeur Ajoutée (TVA)
              </h3>
              <p className="text-[11px] text-slate-400">
                Ventilation par taux légaux (19%, 13%, 7%) et calcul de la TVA nette ou du crédit reporté.
              </p>
            </div>
            <Badge variant={(declaration?.vatNetDue || 0) > 0 ? 'vat' : 'success'}>
              {(declaration?.vatNetDue || 0) > 0 ? 'TVA Nette Due' : 'Crédit Reportable'}
            </Badge>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-500 uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Rubrique Fiscale (Tableau 1 DGI)</th>
                  <th className="py-2.5 px-4 text-right">Base Imposable (CA HT)</th>
                  <th className="py-2.5 px-4 text-center">Taux</th>
                  <th className="py-2.5 px-4 text-right">TVA Collectée / Déductible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
                <tr>
                  <td className="py-2.5 px-4 font-sans">Chiffre d'affaires imposable à 19%</td>
                  <td className="py-2.5 px-4 text-right">{(declaration?.caTaxable19 || 0).toFixed(3)}</td>
                  <td className="py-2.5 px-4 text-center font-bold text-tn-carmin-primary">19%</td>
                  <td className="py-2.5 px-4 text-right font-bold">{(declaration?.vatCollected19 || 0).toFixed(3)}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-sans">Chiffre d'affaires imposable à 13%</td>
                  <td className="py-2.5 px-4 text-right">{(declaration?.caTaxable13 || 0).toFixed(3)}</td>
                  <td className="py-2.5 px-4 text-center font-bold text-sky-600">13%</td>
                  <td className="py-2.5 px-4 text-right font-bold">{(declaration?.vatCollected13 || 0).toFixed(3)}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-sans">Chiffre d'affaires imposable à 7%</td>
                  <td className="py-2.5 px-4 text-right">{(declaration?.caTaxable7 || 0).toFixed(3)}</td>
                  <td className="py-2.5 px-4 text-center font-bold text-emerald-600">7%</td>
                  <td className="py-2.5 px-4 text-right font-bold">{(declaration?.vatCollected7 || 0).toFixed(3)}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-sans">Chiffre d'affaires à l'exportation (Suspension 0%)</td>
                  <td className="py-2.5 px-4 text-right">{(declaration?.caExport0 || 0).toFixed(3)}</td>
                  <td className="py-2.5 px-4 text-center text-slate-400">0%</td>
                  <td className="py-2.5 px-4 text-right text-slate-400">0.000</td>
                </tr>
                <tr className="bg-red-50/60 dark:bg-red-950/30 font-bold">
                  <td className="py-2.5 px-4 font-sans text-tn-carmin-primary">TOTAL TVA COLLECTÉE (I)</td>
                  <td className="py-2.5 px-4 text-right">-</td>
                  <td className="py-2.5 px-4 text-center">-</td>
                  <td className="py-2.5 px-4 text-right text-tn-carmin-primary">{(declaration?.vatCollectedTotal || 0).toFixed(3)}</td>
                </tr>

                {/* Deductions */}
                <tr>
                  <td className="py-2.5 px-4 font-sans">TVA déductible sur biens d'équipement / immobilisations</td>
                  <td className="py-2.5 px-4 text-right">-</td>
                  <td className="py-2.5 px-4 text-center">-</td>
                  <td className="py-2.5 px-4 text-right text-emerald-600">- {(declaration?.vatDeductibleAssets || 0).toFixed(3)}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-sans">TVA déductible sur autres achats et services d'exploitation</td>
                  <td className="py-2.5 px-4 text-right">-</td>
                  <td className="py-2.5 px-4 text-center">-</td>
                  <td className="py-2.5 px-4 text-right text-emerald-600">- {(declaration?.vatDeductibleOther || 0).toFixed(3)}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-sans">Crédit de TVA reporté du mois précédent (الفائض من الشهر السابق)</td>
                  <td className="py-2.5 px-4 text-right">-</td>
                  <td className="py-2.5 px-4 text-center">-</td>
                  <td className="py-2.5 px-4 text-right text-emerald-600">- {(declaration?.vatCreditCarriedForward || 0).toFixed(3)}</td>
                </tr>

                {/* Final VAT Row */}
                <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-sm">
                  <td colSpan={3} className="py-3 px-4 font-sans">
                    {(declaration?.vatNetDue || 0) > 0 ? 'SOLDE : TVA NETTE À PAYER AU TRÉSOR' : 'SOLDE : CRÉDIT DE TVA REPORTABLE SUR LE MOIS SUIVANT'}
                  </td>
                  <td className="py-3 px-4 text-right text-base text-tn-carmin-primary">
                    {(declaration?.vatNetDue || 0) > 0
                      ? `${(declaration?.vatNetDue || 0).toFixed(3)} DT`
                      : `${(declaration?.vatCreditGenerated || 0).toFixed(3)} DT`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: TIMBRE & TCL (Pages 8-9 DGI) */}
      {activeTab === 'TCL' && (activeTaxes.stampDuty || activeTaxes.tcl) && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-subtle p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              المعاليم الراجعة للجماعات المحلية ومعلوم الطابع الجبائي
            </h3>
            <p className="text-[11px] text-slate-400">
              Taxe sur les établissements (TCL: 0.2% local, 0.1% export) et droit de timbre fiscal (1 DT par facture délivrée).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Timbre Fiscal */}
            {activeTaxes.stampDuty && (
              <div className="p-4 rounded-md bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-900 dark:text-white uppercase">
                    Droit de Timbre Fiscal
                  </span>
                  <Badge variant="outline">1.000 DT / Facture</Badge>
                </div>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span className="font-sans">Nombre de factures de vente émises :</span>
                    <span>{declaration?.salesCount || 0}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-white">
                    <span className="font-sans">Total Timbre Fiscal Dû :</span>
                    <span className="text-tn-carmin-primary">{(declaration?.stampDutyTotal || 0).toFixed(3)} DT</span>
                  </div>
                </div>
              </div>
            )}

            {/* TCL */}
            {activeTaxes.tcl && (
              <div className="p-4 rounded-md bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-900 dark:text-white uppercase">
                    Taxe sur les Établissements (TCL)
                  </span>
                  <Badge variant="outline">0.2% Local • 0.1% Export</Badge>
                </div>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span className="font-sans">CA Local HT imposable (0.2%) :</span>
                    <span>{(declaration?.tclLocalHt || 0).toFixed(3)} DT</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span className="font-sans">CA Export HT imposable (0.1%) :</span>
                    <span>{(declaration?.tclExportHt || 0).toFixed(3)} DT</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-white">
                    <span className="font-sans">Total TCL Due :</span>
                    <span className="text-tn-carmin-primary">{(declaration?.tclTotal || 0).toFixed(3)} DT</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: OTHER TAXES (FODEC / DC / Hotel / Licence) */}
      {activeTab === 'OTHER' && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-subtle p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              معاليم أخرى على رقم المعاملات • Taxes Spécifiques & Parafiscales
            </h3>
            <p className="text-[11px] text-slate-400">
              FODEC (1% industrie), redevance de compensation, droit de consommation et taxes sectorielles.
            </p>
          </div>

          <div className="p-4 rounded-md bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-700 dark:text-slate-300 font-bold font-sans">
              <span>FODEC (Fonds de développement de la compétitivité industrielle - 1%) :</span>
              <span className="font-mono text-tn-carmin-primary">{(declaration?.fodecTotal || 0).toFixed(3)} DT</span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              Applicable aux ventes de produits manufacturés locaux selon la nomenclature officielle DGI.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
