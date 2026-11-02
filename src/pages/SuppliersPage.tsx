/**
 * Suppliers Management Page.
 * Configures default withholding tax rates (RS 5%, 1%, 15%), Account 401.
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
import { Plus, Search, Edit2, Trash2, Truck, Phone, Mail } from 'lucide-react';
import { Party } from '../types/index.js';

export const SuppliersPage: React.FC = () => {
  const { authFetch } = useAuth();
  const { t } = useI18n();

  const [suppliers, setSuppliers] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Party | undefined>(undefined);
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
    accountCode: '401100',
  });
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/parties?type=SUPPLIER');
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.parties || []);
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const openAddModal = () => {
    setEditingSupplier(undefined);
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
      accountCode: '401100',
    });
    setFormError(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (sup: Party) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name,
      taxId: sup.taxId || '',
      rneNumber: sup.rneNumber || '',
      vatStatus: sup.vatStatus || 'ASSUJETTI',
      address: sup.address || '',
      city: sup.city || 'Tunis',
      phone: sup.phone || '',
      email: sup.email || '',
      defaultWithholdingRate: sup.defaultWithholdingRate || 0,
      accountCode: sup.accountCode || '401100',
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
      const url = editingSupplier ? `/api/parties/${editingSupplier.id}` : '/api/parties';
      const method = editingSupplier ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        body: JSON.stringify({
          ...formData,
          partyType: 'SUPPLIER',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Erreur lors de l’enregistrement.');
        return;
      }

      setIsModalOpen(false);
      loadSuppliers();
    } catch (err: any) {
      setFormError(err.message || 'Erreur serveur.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Déplacer le fournisseur "${name}" vers la corbeille ?`)) {
      return;
    }
    try {
      const res = await authFetch(`/api/parties/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadSuppliers();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.taxId && s.taxId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Truck className="h-6 w-6 text-sky-500" />
            <span>{t('suppliersTitle')}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Répertoire des fournisseurs, suivi des retenues à la source (RS 5%, 1%, 15%) et compte 401
          </p>
        </div>

        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openAddModal}>
          Nouveau Fournisseur
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Rechercher fournisseur par raison sociale ou matricule fiscal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="text-xs text-slate-400 font-semibold ml-auto">
          {filteredSuppliers.length} fournisseur(s)
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="rounded-lg bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Fournisseur / Société</th>
                <th className="py-3 px-4">Matricule Fiscal</th>
                <th className="py-3 px-4">Taux RS Habituel</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Compte</th>
                <th className="py-3 px-4 text-right">Solde Dû</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSuppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 dark:text-white block text-sm">
                      {s.name}
                    </span>
                    {s.rneNumber ? (
                      <span className="text-[10px] text-slate-400 font-mono">
                        RNE : {s.rneNumber}
                      </span>
                    ) : undefined}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {s.taxId || <span className="text-slate-400 italic">Non renseigné</span>}
                  </td>
                  <td className="py-3.5 px-4">
                    {s.defaultWithholdingRate > 0 ? (
                      <Badge variant="warning" size="sm">
                        {s.defaultWithholdingRate}% RS
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        0%
                      </Badge>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 space-y-0.5">
                    {s.phone ? <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {s.phone}</div> : undefined}
                    {s.email ? <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {s.email}</div> : undefined}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300 font-semibold">
                    {s.accountCode || '401100'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                    <CurrencyDisplay amount={s.balance} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(s)}
                        title="Modifier"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        title="Déplacer vers la corbeille"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    {loading ? 'Chargement des fournisseurs...' : 'Aucun fournisseur enregistré.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Supplier */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? 'Modifier le Fournisseur' : 'Nouveau Fournisseur'}
        subtitle="Paramétrez l'identification fiscale et le taux de retenue à la source applicable"
        maxWidth="xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError ? (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900">
              {formError}
            </div>
          ) : undefined}

          <Input
            label="Raison Sociale / Nom du Fournisseur *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex : CABINET AUDIT & EXPERTISE MAZARS TUNISIE"
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
              placeholder="Ex : B0458922015"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Taux de Retenue à la Source (RS) légal"
              value={formData.defaultWithholdingRate}
              onChange={(e) => setFormData({ ...formData, defaultWithholdingRate: parseFloat(e.target.value) })}
              options={[
                { value: 0, label: '0% - Pas de retenue (Achats ordinaires < 1000 DT)' },
                { value: 5, label: '5% - Honoraires d’experts, consultants, commissions (Régime réel)' },
                { value: 1, label: '1% - Marchés publics ou achats d’équipements >= 1 000 DT TTC' },
                { value: 15, label: '15% - Loyers d’immeubles' },
                { value: 10, label: '10% - Rémunérations et jetons' },
              ]}
            />

            <Input
              label="Compte Comptable Fournisseur"
              value={formData.accountCode}
              onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })}
              placeholder="401100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Téléphone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+216 71 190 200"
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contact@fournisseur.tn"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Enregistrer le Fournisseur
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

