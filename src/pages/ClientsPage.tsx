/**
 * Clients Management Page.
 * Validates Tunisian Tax ID, VAT status, with Soft Deletes.
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useI18n } from '../context/I18nContext.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Modal } from '../components/ui/Modal.js';
import { Badge } from '../components/ui/Badge.js';
import { MatriculeFiscalInput } from '../components/ui/MatriculeFiscalInput.js';
import { CurrencyDisplay } from '../components/ui/CurrencyDisplay.js';
import { Plus, Search, Edit2, Trash2, Building, Phone, Mail, MapPin } from 'lucide-react';
import { Party } from '../types/index.js';

export const ClientsPage: React.FC = () => {
  const { authFetch } = useAuth();
  const { t } = useI18n();

  const [clients, setClients] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Party | undefined>(undefined);
  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    rneNumber: '',
    vatStatus: 'ASSUJETTI',
    address: '',
    city: 'Tunis',
    phone: '',
    email: '',
    defaultWithholdingRate: 0,
    accountCode: '411100',
  });
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const loadClients = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/parties?type=CLIENT');
      if (res.ok) {
        const data = await res.json();
        setClients(data.parties || []);
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const openAddModal = () => {
    setEditingClient(undefined);
    setFormData({
      name: '',
      taxId: '',
      rneNumber: '',
      vatStatus: 'ASSUJETTI',
      address: '',
      city: 'Tunis',
      phone: '',
      email: '',
      defaultWithholdingRate: 0,
      accountCode: '411100',
    });
    setFormError(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (client: Party) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      taxId: client.taxId || '',
      rneNumber: client.rneNumber || '',
      vatStatus: client.vatStatus || 'ASSUJETTI',
      address: client.address || '',
      city: client.city || 'Tunis',
      phone: client.phone || '',
      email: client.email || '',
      defaultWithholdingRate: client.defaultWithholdingRate || 0,
      accountCode: client.accountCode || '411100',
    });
    setFormError(undefined);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(undefined);

    if (!formData.name.trim()) {
      setFormError('La raison sociale est requise.');
      return;
    }

    try {
      setSubmitting(true);
      const url = editingClient ? `/api/parties/${editingClient.id}` : '/api/parties';
      const method = editingClient ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        body: JSON.stringify({
          ...formData,
          partyType: 'CLIENT',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Erreur lors de l’enregistrement.');
        return;
      }

      setIsModalOpen(false);
      loadClients();
    } catch (err: any) {
      setFormError(err.message || 'Erreur serveur.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Voulez-vous déplacer le client "${name}" vers la corbeille ?`)) {
      return;
    }
    try {
      const res = await authFetch(`/api/parties/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadClients();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.taxId && c.taxId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Building className="h-6 w-6 text-tn-red" />
            <span>{t('clientsTitle')}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Répertoire des clients, matricules fiscaux tunisiens et suivi des encours (Compte 411)
          </p>
        </div>

        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openAddModal}>
          Nouveau Client
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Rechercher par raison sociale ou matricule fiscal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="text-xs text-slate-400 font-semibold ml-auto">
          {filteredClients.length} client(s) répertorié(s)
        </div>
      </div>

      {/* Clients Table */}
      <div className="rounded-lg bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Raison Sociale</th>
                <th className="py-3 px-4">Matricule Fiscal</th>
                <th className="py-3 px-4">Régime TVA</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Compte</th>
                <th className="py-3 px-4 text-right">Encours / Solde</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredClients.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 dark:text-white block text-sm">
                      {c.name}
                    </span>
                    {c.rneNumber ? (
                      <span className="text-[10px] text-slate-400 font-mono">
                        RNE : {c.rneNumber}
                      </span>
                    ) : undefined}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {c.taxId || <span className="text-slate-400 italic">Non renseigné</span>}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={c.vatStatus === 'ASSUJETTI' ? 'vat' : c.vatStatus === 'EXONERE' ? 'warning' : 'neutral'} size="sm">
                      {c.vatStatus}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 space-y-0.5">
                    {c.phone ? <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</div> : undefined}
                    {c.email ? <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</div> : undefined}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300 font-semibold">
                    {c.accountCode || '411100'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                    <CurrencyDisplay amount={c.balance} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(c)}
                        title="Modifier"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        title="Déplacer vers la corbeille"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    {loading ? 'Chargement des fiches clients...' : 'Aucun client trouvé.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Client Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? 'Modifier la Fiche Client' : 'Nouvelle Fiche Client'}
        subtitle="Conformité SCE : identification fiscale et régime de TVA"
        maxWidth="xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError ? (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900">
              {formError}
            </div>
          ) : undefined}

          <Input
            label="Raison Sociale / Nom Complet *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex : STE CARTHAGE DISTRIBUTION SA"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MatriculeFiscalInput
              value={formData.taxId}
              onChange={(val) => setFormData({ ...formData, taxId: val })}
            />

            <Input
              label="Numéro Registre RNE"
              value={formData.rneNumber}
              onChange={(e) => setFormData({ ...formData, rneNumber: e.target.value })}
              placeholder="Ex : B0145892023"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Régime d’Assujettissement TVA"
              value={formData.vatStatus}
              onChange={(e) => setFormData({ ...formData, vatStatus: e.target.value })}
              options={[
                { value: 'ASSUJETTI', label: 'Assujetti Total (19%, 13%, 7%)' },
                { value: 'EXONERE', label: 'Exonéré (Art. 13 Code TVA)' },
                { value: 'SUSPENSION', label: 'Régime Suspensif (Exportateur)' },
                { value: 'NON_ASSUJETTI', label: 'Non Assujetti' },
              ]}
            />

            <Input
              label="Compte Comptable Client"
              value={formData.accountCode}
              onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })}
              placeholder="411100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Adresse"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Ex : Zone Industrielle Charguia II"
              />
            </div>
            <Input
              label="Ville"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Tunis"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Téléphone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+216 71 000 000"
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contact@client.tn"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Enregistrer le Client
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

