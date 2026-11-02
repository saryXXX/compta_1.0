/**
 * Archive / Trash Page: View and restore soft-deleted items.
 * Strictly implements the soft-delete requirement across all models.
 * 
 * STRICT COMPLIANCE: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useI18n } from '../context/I18nContext.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { CurrencyDisplay } from '../components/ui/CurrencyDisplay.js';
import { Trash2, RotateCcw, Building, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

export const ArchivePage: React.FC = () => {
  const { authFetch } = useAuth();
  const { t } = useI18n();

  const [archive, setArchive] = useState<{
    parties: any[];
    invoices: any[];
    entries: any[];
    g50Returns: any[];
    totalCount: number;
  }>({
    parties: [],
    invoices: [],
    entries: [],
    g50Returns: [],
    totalCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | undefined>(undefined);

  const loadArchive = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/archive');
      if (res.ok) {
        const data = await res.json();
        setArchive(data.archive);
      }
    } catch (err) {
      console.error('Failed to load archive:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArchive();
  }, []);

  const handleRestore = async (modelName: string, id: string, name: string) => {
    try {
      const res = await authFetch('/api/archive/restore', {
        method: 'POST',
        body: JSON.stringify({ modelName, id }),
      });
      if (res.ok) {
        setSuccessMsg(`"${name}" a été restauré avec succès.`);
        loadArchive();
      }
    } catch (err) {
      console.error('Restore error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
          <Trash2 className="h-6 w-6 text-slate-400" />
          <span>{t('archiveTitle')}</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t('archiveSubtitle')}
        </p>
      </div>

      {successMsg ? (
        <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      ) : undefined}

      {/* Parties Trash */}
      <div className="rounded-lg bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Building className="h-4 w-4 text-tn-red" />
          <span>Clients & Fournisseurs Archivés ({archive.parties.length})</span>
        </h3>

        {archive.parties.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {archive.parties.map((p) => (
              <div key={p.id} className="py-3 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">{p.name}</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Type : {p.partyType} • MF : {p.taxId || 'N/A'} • Supprimé le : {p.deletedAt?.substring(0, 10)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<RotateCcw className="h-3.5 w-3.5" />}
                  onClick={() => handleRestore('party', p.id, p.name)}
                >
                  {t('restoreItem')}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Aucun tiers dans la corbeille.</p>
        )}
      </div>

      {/* Invoices Trash */}
      <div className="rounded-lg bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-sky-500" />
          <span>Factures Archivées ({archive.invoices.length})</span>
        </h3>

        {archive.invoices.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {archive.invoices.map((inv) => (
              <div key={inv.id} className="py-3 flex justify-between items-center">
                <div>
                  <span className="font-bold font-mono text-slate-900 dark:text-white block">
                    {inv.invoiceNumber} ({inv.invoiceType === 'SALE' ? 'Vente' : 'Achat'})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Tiers : {inv.party?.name || 'Tiers'} • Total : <CurrencyDisplay amount={inv.totalTtc} /> • Supprimé le : {inv.deletedAt?.substring(0, 10)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<RotateCcw className="h-3.5 w-3.5" />}
                  onClick={() => handleRestore('invoice', inv.id, inv.invoiceNumber)}
                >
                  {t('restoreItem')}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Aucune facture dans la corbeille.</p>
        )}
      </div>
    </div>
  );
};

