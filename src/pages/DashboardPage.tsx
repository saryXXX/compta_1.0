/**
 * Financial Command Center for Accountants & Finance Managers.
 * Designed according to the Tunisian Accounting UI/UX Design System.
 * 
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useI18n } from '../context/I18nContext.js';
import { MetricCard } from '../components/ui/MetricCard.js';
import { CurrencyDisplay } from '../components/ui/CurrencyDisplay.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Receipt,
  Users,
  Wallet,
  Calendar,
  PlusCircle,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Keyboard,
  Briefcase,
  Landmark,
  Calculator,
  Lock,
  ArrowUpRight,
  Clock,
  PieChart,
} from 'lucide-react';
import { Invoice } from '../types/index.js';

export const DashboardPage: React.FC = () => {
  const { user, authFetch } = useAuth();
  const { t } = useI18n();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Computed metrics
  const [metrics, setMetrics] = useState({
    monthlyTurnover: 0,
    vatCollected: 0,
    vatDeductible: 0,
    netVatDue: 0,
    clientReceivables: 0,
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const res = await authFetch('/api/invoices');
        if (res.ok) {
          const data = await res.json();
          const invList: Invoice[] = data.invoices || [];
          setInvoices(invList);

          const currentMonth = new Date().toISOString().substring(0, 7);
          let turnover = 0;
          let vatColl = 0;
          let vatDed = 0;
          let receivables = 0;

          for (const inv of invList) {
            if (inv.invoiceDate.startsWith(currentMonth)) {
              if (inv.invoiceType === 'SALE') {
                turnover += inv.subtotalHt;
                vatColl += inv.vatAmount;
              } else if (inv.invoiceType === 'PURCHASE') {
                vatDed += inv.vatAmount;
              }
            }
            if (inv.invoiceType === 'SALE' && inv.status !== 'PAID') {
              receivables += inv.totalTtc - inv.withholdingTaxAmount;
            }
          }

          setMetrics({
            monthlyTurnover: turnover,
            vatCollected: vatColl,
            vatDeductible: vatDed,
            netVatDue: Math.max(0, vatColl - vatDed),
            clientReceivables: receivables,
          });
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Workspace Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-subtle">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-tn-carmin-subtle text-tn-carmin-primary border border-red-200/60 dark:bg-red-950/40 dark:border-red-900/60">
              SCE LOI 96-112
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              MF: {user?.tenantTaxId}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {user?.tenantName || 'Société Principale'}
          </h1>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Exercice comptable en cours : <strong className="text-slate-700 dark:text-slate-300 font-mono">{new Date().getFullYear()}</strong> • Régime : <strong className="text-slate-700 dark:text-slate-300">Assujetti Total TVA (19%, 13%, 7%)</strong>
          </p>
        </div>

        {/* Quick Accountant Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/accountant/journal">
            <Button variant="gold" size="sm" icon={<Keyboard className="size-3.5" />}>
              Saisie des Écritures
            </Button>
          </Link>
          <Link to="/invoices">
            <Button variant="primary" size="sm" icon={<PlusCircle className="size-3.5" />}>
              Nouvelle Facture
            </Button>
          </Link>
          <Link to="/accounting/statements">
            <Button variant="outline" size="sm" icon={<PieChart className="size-3.5" />}>
              Bilan NCT 01
            </Button>
          </Link>
        </div>
      </div>

      {/* Financial KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Chiffre d'Affaires du Mois (HT)"
          value={<CurrencyDisplay amount={metrics.monthlyTurnover} />}
          subtitle="Ventes HT facturées en cours"
          icon={<TrendingUp className="size-4" />}
          accentColor="red"
          trend={{ value: '12.4% vs N-1', isPositive: true }}
        />

        <MetricCard
          title="TVA Nette Due au Trésor"
          value={<CurrencyDisplay amount={metrics.netVatDue} />}
          subtitle={`Collectée : ${metrics.vatCollected.toFixed(3)} DT`}
          icon={<Receipt className="size-4" />}
          accentColor="amber"
        />

        <MetricCard
          title="Créances Clients à Encaisser"
          value={<CurrencyDisplay amount={metrics.clientReceivables} />}
          subtitle="Compte 411100 après déduction RS"
          icon={<Users className="size-4" />}
          accentColor="blue"
        />

        <MetricCard
          title="Trésorerie Disponible"
          value={<CurrencyDisplay amount={25400.0} />}
          subtitle="Comptes 512100 Banque & 532100"
          icon={<Wallet className="size-4" />}
          accentColor="emerald"
        />
      </div>

      {/* Accountant Operations Hub Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-5 shadow-subtle space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Poste de Travail Expert-Comptable & Finance
          </span>
          <span className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 font-mono">
            SCE NORMES NCT 01 À 08
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/accountant/journal"
            className="p-3.5 rounded-md bg-slate-50/80 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-700/60 hover:border-amber-400 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <Keyboard className="size-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
              <ArrowUpRight className="size-3 text-slate-400 group-hover:text-amber-600" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block">Saisie des Écritures</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Journaux OD, BQ, CA, VE, AC</span>
          </Link>

          <Link
            to="/accountant/payroll"
            className="p-3.5 rounded-md bg-slate-50/80 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-700/60 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <Briefcase className="size-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
              <ArrowUpRight className="size-3 text-slate-400 group-hover:text-blue-600" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block">Paie & CNSS</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">IRPP, CSS, TFP & OD de paie</span>
          </Link>

          <Link
            to="/accountant/reconciliation"
            className="p-3.5 rounded-md bg-slate-50/80 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-700/60 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <Landmark className="size-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
              <ArrowUpRight className="size-3 text-slate-400 group-hover:text-emerald-600" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block">Rapprochement Bancaire</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Lettrage relevé vs compte 512100</span>
          </Link>

          <Link
            to="/accountant/tax-package"
            className="p-3.5 rounded-md bg-slate-50/80 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-700/60 hover:border-rose-400 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <Calculator className="size-4 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform" />
              <ArrowUpRight className="size-3 text-slate-400 group-hover:text-rose-600" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block">Liasse Fiscale & IS</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Passage comptable au fiscal (15%)</span>
          </Link>
        </div>
      </div>

      {/* Deadlines & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Tax Deadlines */}
        <div className="rounded-lg bg-white dark:bg-slate-900 p-5 shadow-subtle border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
              <Calendar className="size-4 text-tn-carmin-primary" />
              <span>Échéancier Fiscal Tunisien</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400">CALENDRIER DGI</span>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Déclaration Mensuelle (Bordereau G50)
                </span>
                <Badge variant="vat" size="xs">Le 28 du mois</Badge>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                TVA nette due, timbre 1 DT, TCL (0.2%), retenues à la source opérées.
              </p>
              <Link to="/fiscal/g50" className="mt-2 inline-flex items-center text-xs text-tn-carmin-primary font-semibold hover:underline gap-1">
                Générer la déclaration G50 <ArrowRight className="size-3" />
              </Link>
            </div>

            <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Acomptes Provisionnels (AP1, AP2, AP3)
                </span>
                <Badge variant="warning" size="xs">25 Juin / Sept / Déc</Badge>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                30% de l'impôt IS N-1 diminué des retenues à la source subies.
              </p>
              <Link to="/fiscal/ap" className="mt-2 inline-flex items-center text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline gap-1">
                Tableau des acomptes <ArrowRight className="size-3" />
              </Link>
            </div>

            <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Déclaration Annuelle Employeur (TEJ)
                </span>
                <Badge variant="info" size="xs">28 Février</Badge>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Génération des fichiers officiels DECEMP.txt et ANXEMP.txt.
              </p>
              <Link to="/fiscal/employer" className="mt-2 inline-flex items-center text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline gap-1">
                Télé-déclaration TEJ <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Invoices & Accounting Entries */}
        <div className="lg:col-span-2 rounded-lg bg-white dark:bg-slate-900 p-5 shadow-subtle border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                <FileSpreadsheet className="size-4 text-sky-600" />
                <span>Dernières Factures Émises & Reçues</span>
              </div>
              <Link to="/invoices">
                <Button variant="ghost" size="xs" icon={<ArrowRight className="size-3" />}>
                  Voir le grand journal
                </Button>
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Pièce N°</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Tiers / Client</th>
                    <th className="py-2.5 px-3">Journal</th>
                    <th className="py-2.5 px-3 text-right">Montant TTC</th>
                    <th className="py-2.5 px-3 text-center">État</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoices.slice(0, 6).map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {inv.invoiceDate}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200 max-w-[160px] truncate">
                        {inv.party?.name || 'Tiers'}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={inv.invoiceType === 'SALE' ? 'success' : 'info'} size="xs">
                          {inv.invoiceType === 'SALE' ? 'VE (Ventes)' : 'AC (Achats)'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                        <CurrencyDisplay amount={inv.totalTtc} />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant={inv.status === 'VALIDATED' ? 'success' : 'neutral'} size="xs" dot>
                          {inv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        {loading ? 'Chargement des données comptables...' : 'Aucune écriture enregistrée pour le moment.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
