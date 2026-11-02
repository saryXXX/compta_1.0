/**
 * Invoices Page: Sales & Purchases Management with Automated Accounting Entries.
 * Implements Tunisian VAT (19, 13, 7, 0%), FODEC (1%), Timbre (1 DT), and RS.
 * 
 * STRICT COMPLIANCE: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useI18n } from '../context/I18nContext.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Modal } from '../components/ui/Modal.js';
import { Badge } from '../components/ui/Badge.js';
import { CurrencyDisplay } from '../components/ui/CurrencyDisplay.js';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Eye,
  Trash2,
  Printer,
  Calendar,
  CheckCircle2,
  PlusCircle,
  XCircle,
} from 'lucide-react';
import { Invoice, Party } from '../types/index.js';

interface InvoiceItemDraft {
  description: string;
  quantity: number;
  unitPriceHt: number;
  discountPercent: number;
  fodecRate: number;
  vatRate: number;
}

export const InvoicesPage: React.FC = () => {
  const { authFetch } = useAuth();
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<'SALE' | 'PURCHASE'>('SALE');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0] as string);
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split('T')[0] as string);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItemDraft[]>([
    { description: '', quantity: 1, unitPriceHt: 0, discountPercent: 0, fodecRate: 0, vatRate: 19 },
  ]);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal
  const [viewingInvoice, setViewingInvoice] = useState<any | undefined>(undefined);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invRes, partRes] = await Promise.all([
        authFetch(`/api/invoices?type=${activeTab}`),
        authFetch(`/api/parties?type=${activeTab === 'SALE' ? 'CLIENT' : 'SUPPLIER'}`),
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData.invoices || []);
      }
      if (partRes.ok) {
        const partData = await partRes.json();
        const partyList: Party[] = partData.parties || [];
        setParties(partyList);
        if (partyList.length > 0 && !selectedPartyId) {
          setSelectedPartyId(partyList[0]?.id || '');
        }
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const openCreateModal = () => {
    const prefix = activeTab === 'SALE' ? 'FAC' : 'ACH';
    const randNum = Math.floor(100 + Math.random() * 900);
    setInvoiceNumber(`${prefix}-${new Date().getFullYear()}-${randNum}`);
    setItems([
      { description: '', quantity: 1, unitPriceHt: 0, discountPercent: 0, fodecRate: activeTab === 'SALE' ? 1 : 0, vatRate: 19 },
    ]);
    setNotes('');
    setFormError(undefined);
    setIsCreateModalOpen(true);
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { description: '', quantity: 1, unitPriceHt: 0, discountPercent: 0, fodecRate: 0, vatRate: 19 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItemDraft, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index]!, [field]: value };
      return copy;
    });
  };

  // Live tax calculation preview
  const calculateLiveTotals = () => {
    let subtotalHt = 0;
    let totalFodec = 0;
    let totalVat = 0;

    for (const it of items) {
      const lineHt = it.quantity * it.unitPriceHt * (1 - it.discountPercent / 100);
      subtotalHt += lineHt;
      const lineFodec = lineHt * (it.fodecRate / 100);
      totalFodec += lineFodec;
      const lineVat = (lineHt + lineFodec) * (it.vatRate / 100);
      totalVat += lineVat;
    }

    const stampDuty = activeTab === 'SALE' && totalVat > 0 ? 1.0 : 0.0;
    const totalTtc = subtotalHt + totalFodec + totalVat + stampDuty;

    return {
      subtotalHt: Math.round(subtotalHt * 1000) / 1000,
      totalFodec: Math.round(totalFodec * 1000) / 1000,
      totalVat: Math.round(totalVat * 1000) / 1000,
      stampDuty,
      totalTtc: Math.round(totalTtc * 1000) / 1000,
    };
  };

  const totals = calculateLiveTotals();

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(undefined);

    if (!selectedPartyId) {
      setFormError('Veuillez sélectionner un tiers.');
      return;
    }

    const validItems = items.filter((it) => it.description.trim() !== '' && it.unitPriceHt > 0);
    if (validItems.length === 0) {
      setFormError('Veuillez renseigner au moins une ligne d’article avec désignation et prix.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await authFetch('/api/invoices', {
        method: 'POST',
        body: JSON.stringify({
          invoiceType: activeTab,
          invoiceNumber,
          partyId: selectedPartyId,
          invoiceDate,
          dueDate,
          items: validItems,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Erreur lors de la création.');
        return;
      }

      setIsCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erreur serveur.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewInvoice = async (id: string) => {
    try {
      const res = await authFetch(`/api/invoices/${id}`);
      if (res.ok) {
        const data = await res.json();
        setViewingInvoice(data);
        setIsDetailModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to view invoice:', err);
    }
  };

  const handleDeleteInvoice = async (id: string, num: string) => {
    if (!window.confirm(`Déplacer la facture "${num}" vers la corbeille ?`)) return;
    try {
      const res = await authFetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Failed to delete invoice:', err);
    }
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.party && inv.party.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-tn-red/10 text-tn-red flex items-center justify-center">
              <FileSpreadsheet className="size-4" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('invoicesTitle')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Génération automatique en partie double (Journaux VE & AC) selon les normes fiscales tunisiennes
          </p>
        </div>

        <Button variant="primary" icon={<Plus className="size-4" />} onClick={openCreateModal}>
          {activeTab === 'SALE' ? t('newSaleInvoice') : t('newPurchaseInvoice')}
        </Button>
      </div>

      {/* Segmented Control & Search Bar Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Segmented Pills */}
        <div className="inline-flex p-1 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-subtle">
          <button
            onClick={() => setActiveTab('SALE')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded transition-all ${
              activeTab === 'SALE'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>{t('salesTab')}</span>
            <Badge variant={activeTab === 'SALE' ? 'vat' : 'neutral'} size="xs">
              {invoices.filter((i) => i.invoiceType === 'SALE').length}
            </Badge>
          </button>
          <button
            onClick={() => setActiveTab('PURCHASE')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded transition-all ${
              activeTab === 'PURCHASE'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>{t('purchasesTab')}</span>
            <Badge variant={activeTab === 'PURCHASE' ? 'info' : 'neutral'} size="xs">
              {invoices.filter((i) => i.invoiceType === 'PURCHASE').length}
            </Badge>
          </button>
        </div>

        {/* Search Bar */}
        <div className="w-full sm:w-80">
          <Input
            placeholder="Rechercher par N° facture ou tiers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="size-3.5" />}
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-lg bg-white dark:bg-slate-900 shadow-subtle border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">{t('invoiceNumber')}</th>
                <th className="py-3 px-4">{t('date')}</th>
                <th className="py-3 px-4">{t('clientOrSupplier')}</th>
                <th className="py-3 px-4 text-right">{t('subtotalHt')}</th>
                <th className="py-3 px-4 text-right">TVA</th>
                <th className="py-3 px-4 text-right">Timbre</th>
                <th className="py-3 px-4 text-right">{t('totalTtc')}</th>
                <th className="py-3 px-4 text-center">{t('status')}</th>
                <th className="py-3 px-4 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    {inv.invoiceDate}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {inv.party?.name || 'Tiers inconnu'}
                    </span>
                    {inv.party?.taxId ? (
                      <span className="text-[10px] text-slate-400 font-mono">
                        MF : {inv.party.taxId}
                      </span>
                    ) : undefined}
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                    <CurrencyDisplay amount={inv.subtotalHt} />
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-amber-600 dark:text-amber-400">
                    <CurrencyDisplay amount={inv.vatAmount} />
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                    {inv.stampDuty.toFixed(3)} DT
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                    <CurrencyDisplay amount={inv.totalTtc} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Badge variant={inv.status === 'VALIDATED' ? 'success' : 'neutral'} size="xs" dot>
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleViewInvoice(inv.id)}
                        title="Consulter et Imprimer"
                        className="size-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Eye className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                        title="Archiver"
                        className="size-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    {loading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="size-6 animate-spin rounded-full border-2 border-tn-red border-t-transparent" />
                        <span>Chargement des factures...</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs">Aucune facture enregistrée dans ce journal.</p>
                        <Button variant="primary" size="sm" onClick={openCreateModal}>
                          Créer votre première facture
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={activeTab === 'SALE' ? 'Émettre une Facture de Vente' : 'Enregistrer une Facture d’Achat'}
        subtitle="Conformité tunisienne : calcul automatique TVA, FODEC 1%, Timbre 1 DT et écriture comptable"
        maxWidth="4xl"
      >
        <form onSubmit={handleSaveInvoice} className="space-y-4">
          {formError ? (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900">
              {formError}
            </div>
          ) : undefined}

          {/* Top Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label={activeTab === 'SALE' ? 'Sélectionner le Client *' : 'Sélectionner le Fournisseur *'}
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              options={parties.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.taxId || 'Sans MF'})`,
              }))}
            />

            <Input
              label={t('invoiceNumber')}
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              required
            />

            <Input
              label={t('invoiceDate')}
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
            />
          </div>

          {/* Line items table */}
          <div className="mt-4 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 font-bold text-xs text-slate-700 dark:text-slate-300 flex justify-between items-center">
              <span>Lignes d'Articles & Prestations</span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-tn-red font-semibold flex items-center gap-1 hover:underline text-xs"
              >
                <PlusCircle className="h-3.5 w-3.5" /> {t('addItem')}
              </button>
            </div>

            <div className="p-3 space-y-2.5 max-h-60 overflow-y-auto">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50/50 dark:bg-slate-850 p-2 rounded-lg text-xs">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Désignation du produit ou prestation *"
                      value={it.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      placeholder="Qté"
                      value={it.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-center"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="P.U. HT"
                      value={it.unitPriceHt}
                      onChange={(e) => handleItemChange(idx, 'unitPriceHt', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-right font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      value={it.vatRate}
                      onChange={(e) => handleItemChange(idx, 'vatRate', parseFloat(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    >
                      <option value={19}>TVA 19%</option>
                      <option value={13}>TVA 13%</option>
                      <option value={7}>TVA 7%</option>
                      <option value={0}>TVA 0% (Export)</option>
                    </select>
                  </div>
                  <div className="col-span-1 flex items-center gap-1">
                    <label className="text-[10px] text-slate-400">FODEC</label>
                    <input
                      type="checkbox"
                      checked={it.fodecRate === 1}
                      onChange={(e) => handleItemChange(idx, 'fodecRate', e.target.checked ? 1 : 0)}
                      className="rounded border-slate-300 text-tn-red focus:ring-tn-red"
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                      className="p-1 text-slate-400 hover:text-rose-500 disabled:opacity-30"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tax Breakdown Totals Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 space-y-1">
              <p>• Timbre Fiscal : <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{totals.stampDuty.toFixed(3)} TND</span></p>
              <p>• FODEC (1%) : <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{totals.totalFodec.toFixed(3)} TND</span></p>
              <p>• TVA Totale : <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{totals.totalVat.toFixed(3)} TND</span></p>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Net TTC</p>
              <p className="text-2xl font-black text-tn-red font-mono">
                <CurrencyDisplay amount={totals.totalTtc} />
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Valider la Facture & Passer l’Écriture
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invoice Detail & Printable Modal */}
      {viewingInvoice && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Facture ${viewingInvoice.invoice.invoiceNumber}`}
          subtitle={`Émise le ${viewingInvoice.invoice.invoiceDate}`}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs">
            {/* Header / Parties */}
            <div className="flex justify-between items-start border-b pb-4 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {viewingInvoice.invoice.party?.name}
                </h4>
                <p className="font-mono text-slate-500">
                  MF : {viewingInvoice.invoice.party?.taxId || 'Non spécifié'}
                </p>
                <p className="text-slate-500">{viewingInvoice.invoice.party?.address}</p>
              </div>
              <div className="text-right">
                <Badge variant={viewingInvoice.invoice.invoiceType === 'SALE' ? 'vat' : 'info'}>
                  {viewingInvoice.invoice.invoiceType === 'SALE' ? 'FACTURE DE VENTE' : 'FACTURE D’ACHAT'}
                </Badge>
                <p className="mt-1 font-mono text-slate-400">Échéance : {viewingInvoice.invoice.dueDate}</p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-left">
              <thead>
                <tr className="border-b dark:border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2">Désignation</th>
                  <th className="py-2 text-center">Qté</th>
                  <th className="py-2 text-right">P.U. HT</th>
                  <th className="py-2 text-center">TVA</th>
                  <th className="py-2 text-right">Total HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {viewingInvoice.invoice.items?.map((it: any) => (
                  <tr key={it.id}>
                    <td className="py-2 font-medium">{it.description}</td>
                    <td className="py-2 text-center">{it.quantity}</td>
                    <td className="py-2 text-right font-mono">{it.unitPriceHt.toFixed(3)}</td>
                    <td className="py-2 text-center">{it.vatRate}%</td>
                    <td className="py-2 text-right font-mono font-bold">{it.totalHt.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Recap */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Total Hors Taxe (HT) :</span>
                <span>{viewingInvoice.invoice.subtotalHt.toFixed(3)} TND</span>
              </div>
              {viewingInvoice.invoice.fodecAmount > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>FODEC (1%) :</span>
                  <span>{viewingInvoice.invoice.fodecAmount.toFixed(3)} TND</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Taxe sur la Valeur Ajoutée (TVA) :</span>
                <span>{viewingInvoice.invoice.vatAmount.toFixed(3)} TND</span>
              </div>
              {viewingInvoice.invoice.stampDuty > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Droit de Timbre Fiscal :</span>
                  <span>{viewingInvoice.invoice.stampDuty.toFixed(3)} TND</span>
                </div>
              )}
              {viewingInvoice.invoice.withholdingTaxAmount > 0 && (
                <div className="flex justify-between text-amber-600 font-semibold">
                  <span>Retenue à la Source (RS) :</span>
                  <span>- {viewingInvoice.invoice.withholdingTaxAmount.toFixed(3)} TND</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white pt-2 border-t dark:border-slate-700">
                <span>TOTAL TOUTES TAXES COMPRISES (TTC) :</span>
                <span className="text-tn-red">{viewingInvoice.invoice.totalTtc.toFixed(3)} TND</span>
              </div>
            </div>

            {/* Amount in words */}
            <div className="italic text-slate-500 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="font-semibold">{t('amountInWords')}</span> {viewingInvoice.amountInWords}
            </div>

            {/* Double Entry Voucher */}
            {viewingInvoice.invoice.entries?.length > 0 && (
              <div className="mt-4 pt-4 border-t dark:border-slate-800">
                <p className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                  {t('accountingEntryRef')}
                </p>
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border font-mono text-[11px] space-y-1">
                  {viewingInvoice.invoice.entries[0]?.lines?.map((l: any, i: number) => (
                    <div key={i} className="flex justify-between">
                      <span className="w-16 font-bold">{l.accountCode}</span>
                      <span className="flex-1 text-slate-500 truncate px-2">{l.description}</span>
                      <span className="w-24 text-right text-emerald-600">{l.debit > 0 ? l.debit.toFixed(3) : ''}</span>
                      <span className="w-24 text-right text-rose-600">{l.credit > 0 ? l.credit.toFixed(3) : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                icon={<Printer className="h-4 w-4" />}
                onClick={() => window.print()}
              >
                Imprimer la Facture
              </Button>
              <Button variant="primary" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

