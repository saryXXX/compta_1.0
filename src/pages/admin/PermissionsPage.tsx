/**
 * Permissions & Tenant Management Page (Superadmin Console).
 * - Full Tenant Creation (Dossiers Entreprises) with initial user account setup.
 * - Granular Action-Based RBAC Matrix.
 * - 1-Click Presets for Accountant (DAF) and Commercial roles.
 * 
 * STRICT COMPLIANCE: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Modal } from '../../components/ui/Modal.js';
import { MatriculeFiscalInput } from '../../components/ui/MatriculeFiscalInput.js';
import {
  ShieldCheck,
  Building2,
  Users,
  Check,
  Plus,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Briefcase,
  UserCheck,
  Search,
  FileSpreadsheet,
  Scale,
  Receipt,
  Coins,
} from 'lucide-react';

interface TenantSummary {
  id: string;
  name: string;
  taxId: string;
  tradeRegister?: string;
  vatRegime: string;
  address?: string;
  city: string;
  phone?: string;
  email?: string;
  currency: string;
  createdAt: string;
  userCount: number;
  invoiceCount: number;
  partyCount: number;
  entryCount: number;
}

interface UserItem {
  id: string;
  tenantId: string;
  username: string;
  fullName: string;
  role: string;
  permissions: string[];
  createdAt: string;
  tenant: {
    id: string;
    name: string;
    taxId: string;
    city: string;
  };
}

interface PermissionMeta {
  permissions: {
    id: string;
    label: string;
    description: string;
    category: string;
  }[];
  categories: {
    id: string;
    label: string;
    icon: string;
  }[];
  presets: {
    ACCOUNTANT: string[];
    COMMERCIAL: string[];
    SUPERADMIN: string[];
  };
}

export const PermissionsPage: React.FC = () => {
  const { user, authFetch } = useAuth();
  const isSuperAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'PERMISSIONS' | 'TENANTS'>('PERMISSIONS');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [meta, setMeta] = useState<PermissionMeta | undefined>(undefined);

  // Selected User for Permissions Editing
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [selectedUserRole, setSelectedUserRole] = useState<string>('ACCOUNTANT');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | undefined>(undefined);

  // Search filter
  const [userSearch, setUserSearch] = useState<string>('');

  // Tenant & First Account Modal
  const [isTenantModalOpen, setIsTenantModalOpen] = useState<boolean>(false);
  const [tenantFormData, setTenantFormData] = useState({
    name: '',
    taxId: '',
    tradeRegister: '',
    vatRegime: 'ASSUJETTI_TOTAL',
    city: 'Tunis',
    address: '',
    phone: '',
    email: '',
    currency: 'TND',
  });
  const [firstUserFormData, setFirstUserFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    role: 'ACCOUNTANT',
  });
  const [isSubmittingTenant, setIsSubmittingTenant] = useState<boolean>(false);

  // New User for existing tenant Modal
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [targetTenantId, setTargetTenantId] = useState<string>('');
  const [newUserFormData, setNewUserFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    role: 'ACCOUNTANT',
  });
  const [isSubmittingUser, setIsSubmittingUser] = useState<boolean>(false);

  // Load Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [metaRes, tenantsRes, usersRes] = await Promise.all([
        authFetch('/api/admin/permissions-meta'),
        authFetch('/api/admin/tenants'),
        authFetch('/api/admin/users'),
      ]);

      if (metaRes.ok && tenantsRes.ok && usersRes.ok) {
        const metaData = await metaRes.json();
        const tenantsData = await tenantsRes.json();
        const usersData = await usersRes.json();

        setMeta(metaData);
        setTenants(tenantsData.tenants || []);
        setUsers(usersData.users || []);

        if (usersData.users && usersData.users.length > 0) {
          const first = usersData.users[0];
          setSelectedUserId(first.id);
          setSelectedUserRole(first.role);
          setSelectedPermissions(first.permissions || []);
        }
      }
    } catch (err) {
      console.error('Error loading admin permissions data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadData();
    }
  }, [isSuperAdmin]);

  // Handle User selection
  const handleSelectUser = (u: UserItem) => {
    setSelectedUserId(u.id);
    setSelectedUserRole(u.role);
    setSelectedPermissions(u.permissions || []);
    setStatusMessage(undefined);
  };

  // Toggle single permission
  const handleTogglePermission = (permId: string) => {
    if (selectedPermissions.includes('*')) {
      // If user had wildcard, convert to all except clicked
      if (meta) {
        const allExcept = meta.permissions.map((p) => p.id).filter((id) => id !== permId);
        setSelectedPermissions(allExcept);
      }
      return;
    }

    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter((id) => id !== permId));
    } else {
      setSelectedPermissions([...selectedPermissions, permId]);
    }
  };

  // Apply Preset
  const handleApplyPreset = (presetType: 'ACCOUNTANT' | 'COMMERCIAL' | 'SUPERADMIN') => {
    if (!meta) return;
    if (presetType === 'ACCOUNTANT') {
      setSelectedUserRole('ACCOUNTANT');
      setSelectedPermissions(meta.presets.ACCOUNTANT);
    } else if (presetType === 'COMMERCIAL') {
      setSelectedUserRole('COMMERCIAL');
      setSelectedPermissions(meta.presets.COMMERCIAL);
    } else {
      setSelectedUserRole('SUPERADMIN');
      setSelectedPermissions(meta.presets.SUPERADMIN);
    }
    setStatusMessage({
      type: 'success',
      text: `Preset ${presetType} appliqué en mémoire. Cliquez sur "Enregistrer les Autorisations" pour valider.`,
    });
  };

  // Save Permissions
  const handleSavePermissions = async () => {
    if (!selectedUserId) return;
    setIsSavingPermissions(true);
    setStatusMessage(undefined);

    try {
      const res = await authFetch(`/api/admin/users/${selectedUserId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({
          role: selectedUserRole,
          permissions: selectedPermissions,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatusMessage({
          type: 'success',
          text: data.message || 'Permissions mises à jour avec succès.',
        });
        // Update local list
        setUsers((prev) =>
          prev.map((u) =>
            u.id === selectedUserId
              ? { ...u, role: selectedUserRole, permissions: selectedPermissions }
              : u
          )
        );
      } else {
        const err = await res.json();
        setStatusMessage({
          type: 'error',
          text: err.error || 'Erreur lors de la mise à jour des permissions.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Erreur réseau.',
      });
    } finally {
      setIsSavingPermissions(false);
    }
  };

  // Create Tenant & First User
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantFormData.name || !tenantFormData.taxId) return;
    if (!firstUserFormData.username || !firstUserFormData.password || !firstUserFormData.fullName) return;

    setIsSubmittingTenant(true);
    try {
      const res = await authFetch('/api/admin/tenants', {
        method: 'POST',
        body: JSON.stringify({
          tenantData: tenantFormData,
          initialUserData: firstUserFormData,
        }),
      });

      if (res.ok) {
        setIsTenantModalOpen(false);
        setTenantFormData({
          name: '',
          taxId: '',
          tradeRegister: '',
          vatRegime: 'ASSUJETTI_TOTAL',
          city: 'Tunis',
          address: '',
          phone: '',
          email: '',
          currency: 'TND',
        });
        setFirstUserFormData({
          fullName: '',
          username: '',
          password: '',
          role: 'ACCOUNTANT',
        });
        await loadData();
        setStatusMessage({
          type: 'success',
          text: 'Nouvelle entreprise et premier compte créés avec succès !',
        });
      } else {
        const err = await res.json();
        alert(err.error || 'Erreur lors de la création du dossier.');
      }
    } catch (err: any) {
      alert(err.message || 'Erreur réseau');
    } finally {
      setIsSubmittingTenant(false);
    }
  };

  // Create Additional User for an existing Tenant
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTenantId || !newUserFormData.username || !newUserFormData.password || !newUserFormData.fullName) return;

    setIsSubmittingUser(true);
    try {
      const res = await authFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: targetTenantId,
          ...newUserFormData,
        }),
      });

      if (res.ok) {
        setIsUserModalOpen(false);
        setNewUserFormData({
          fullName: '',
          username: '',
          password: '',
          role: 'ACCOUNTANT',
        });
        await loadData();
        setStatusMessage({
          type: 'success',
          text: 'Nouvel utilisateur créé avec succès !',
        });
      } else {
        const err = await res.json();
        alert(err.error || "Erreur lors de la création de l'utilisateur.");
      }
    } catch (err: any) {
      alert(err.message || 'Erreur réseau');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        <Lock className="mx-auto size-12 text-red-500 mb-3" />
        <h2 className="text-lg font-bold">Accès Strictement Restreint</h2>
        <p className="text-sm mt-1">
          Cette console de gouvernance et de gestion des dossiers / permissions est strictement réservée au Superadmin.
        </p>
      </div>
    );
  }

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.tenant.name.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-purple-600/10 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="size-6" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Console Superadmin : Dossiers & Droits d'Accès (RBAC)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Création des entreprises (tenants), premier compte administrateur et matrice granulaire des autorisations d'action (Loi 96-112).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="size-3.5" />}
          >
            Actualiser
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsTenantModalOpen(true)}
            leftIcon={<Plus className="size-4" />}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
          >
            Créer une Entreprise
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Dossiers Entreprises</span>
            <Building2 className="size-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-slate-900 dark:text-white">
            {tenants.length}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Tenants actifs (SCE)</span>
        </div>

        <div className="p-4 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Total Utilisateurs</span>
            <Users className="size-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-slate-900 dark:text-white">
            {users.length}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Comptes configurés</span>
        </div>

        <div className="p-4 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Comptables / DAF</span>
            <Scale className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-amber-600 dark:text-amber-400">
            {users.filter((u) => u.role.toUpperCase() === 'ACCOUNTANT').length}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Accès G50 & Écritures</span>
        </div>

        <div className="p-4 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Commerciaux</span>
            <Briefcase className="size-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-emerald-600 dark:text-emerald-400">
            {users.filter((u) => u.role.toUpperCase() === 'COMMERCIAL').length}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Factures & Tiers uniquement</span>
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-3 rounded-md border text-xs flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="size-4 shrink-0 text-rose-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('PERMISSIONS')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'PERMISSIONS'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sliders className="size-4" />
          <span>Matrice des Droits & Attribution par Rôle</span>
        </button>
        <button
          onClick={() => setActiveTab('TENANTS')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'TENANTS'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="size-4" />
          <span>Dossiers d'Entreprises (Tenants)</span>
        </button>
      </div>

      {/* TAB 1: PERMISSIONS & USER MATRIX */}
      {activeTab === 'PERMISSIONS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: User Selector */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 shadow-subtle p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Utilisateurs ({users.length})
              </span>
              <button
                onClick={() => {
                  if (tenants.length > 0) {
                    setTargetTenantId(tenants[0].id);
                    setIsUserModalOpen(true);
                  }
                }}
                className="text-[11px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <Plus className="size-3" /> Nouveau Compte
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Input
                placeholder="Filtrer par nom, identifiant..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                leftIcon={<Search className="size-3.5 text-slate-400" />}
              />
            </div>

            {/* User List */}
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto scrollbar-thin pr-1">
              {filteredUsers.map((u) => {
                const isSelected = u.id === selectedUserId;
                const roleBadgeColor =
                  u.role === 'SUPERADMIN' || u.role === 'ADMIN'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                    : u.role === 'ACCOUNTANT'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300';

                return (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={`w-full text-left p-3 rounded-md border transition-all ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 shadow-subtle'
                        : 'border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {u.fullName}
                      </span>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${roleBadgeColor}`}>
                        {u.role}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      <span className="font-mono">@{u.username}</span>
                      <span className="truncate max-w-[130px] font-semibold text-slate-600 dark:text-slate-300">
                        {u.tenant.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Permission Matrix for Selected User */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 shadow-subtle p-5 space-y-6">
            {selectedUser ? (
              <>
                {/* User Header & Role Presets */}
                <div className="border-b border-slate-200 dark:border-slate-800 pb-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <UserCheck className="size-5 text-purple-600" />
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          Permissions de : <span className="text-purple-600">{selectedUser.fullName}</span>
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Dossier : <strong className="text-slate-700 dark:text-slate-300">{selectedUser.tenant.name}</strong> (MF : {selectedUser.tenant.taxId})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSavePermissions}
                        isLoading={isSavingPermissions}
                        leftIcon={<Check className="size-4" />}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                      >
                        Enregistrer les Droits
                      </Button>
                    </div>
                  </div>

                  {/* Role Selector & 1-Click Presets */}
                  <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                          Rôle du Compte :
                        </label>
                        <select
                          value={selectedUserRole}
                          onChange={(e) => setSelectedUserRole(e.target.value)}
                          className="text-xs font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                          <option value="ACCOUNTANT">ACCOUNTANT (Comptable / DAF)</option>
                          <option value="COMMERCIAL">COMMERCIAL (Ventes & Tiers)</option>
                          <option value="SUPERADMIN">SUPERADMIN (Accès Total)</option>
                        </select>
                      </div>

                      {/* Presets Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                          Presets 1-Clic :
                        </span>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset('ACCOUNTANT')}
                          className="px-2.5 py-1 rounded text-[11px] font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition-all"
                        >
                          ⚡ Preset Comptable
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset('COMMERCIAL')}
                          className="px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all"
                        >
                          ⚡ Preset Commercial
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset('SUPERADMIN')}
                          className="px-2.5 py-1 rounded text-[11px] font-bold bg-purple-700 text-white hover:bg-purple-800 shadow-sm transition-all"
                        >
                          🛡️ Accès Total
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Granular Permission Checklist Grouped by Category */}
                <div className="space-y-6">
                  {meta?.categories.map((cat) => {
                    const categoryPerms = meta.permissions.filter((p) => p.category === cat.id);
                    const isAllSelected = categoryPerms.every(
                      (p) => selectedPermissions.includes('*') || selectedPermissions.includes(p.id)
                    );

                    return (
                      <div
                        key={cat.id}
                        className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden"
                      >
                        {/* Category Header */}
                        <div className="bg-slate-100/80 dark:bg-slate-800/80 px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            {cat.id === 'ADMIN' && <Building2 className="size-4 text-purple-600" />}
                            {cat.id === 'COMMERCIAL' && <FileSpreadsheet className="size-4 text-emerald-600" />}
                            {cat.id === 'ACCOUNTING' && <Scale className="size-4 text-amber-600" />}
                            {cat.id === 'FISCAL' && <Receipt className="size-4 text-rose-600" />}
                            {cat.id === 'SOCIAL_TREASURY' && <Coins className="size-4 text-blue-600" />}
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {cat.label}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (isAllSelected) {
                                // Deselect all in category
                                setSelectedPermissions(
                                  selectedPermissions.filter((id) => !categoryPerms.some((cp) => cp.id === id))
                                );
                              } else {
                                // Select all in category
                                const newIds = categoryPerms.map((cp) => cp.id);
                                const merged = Array.from(new Set([...selectedPermissions, ...newIds]));
                                setSelectedPermissions(merged);
                              }
                            }}
                            className="text-[10px] font-bold text-slate-500 hover:text-purple-600 dark:text-slate-400"
                          >
                            {isAllSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                          </button>
                        </div>

                        {/* Category Actions Grid */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                          {categoryPerms.map((perm) => {
                            const isChecked =
                              selectedPermissions.includes('*') || selectedPermissions.includes(perm.id);

                            return (
                              <label
                                key={perm.id}
                                className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${
                                  isChecked
                                    ? 'bg-purple-50/20 dark:bg-purple-950/10'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(perm.id)}
                                  className="mt-0.5 size-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                      {perm.label}
                                    </span>
                                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                      {perm.id}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                    {perm.description}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Save Action */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={handleSavePermissions}
                    isLoading={isSavingPermissions}
                    leftIcon={<Check className="size-4" />}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  >
                    Enregistrer les Droits
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                Sélectionnez un compte utilisateur à gauche pour inspecter et modifier ses permissions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TENANTS MANAGEMENT */}
      {activeTab === 'TENANTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Liste des Dossiers Entreprises (Tenants Actifs)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chaque dossier possède son propre plan comptable SCE (Loi 96-112), ses factures et déclarations fiscales.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsTenantModalOpen(true)}
              leftIcon={<Plus className="size-3.5" />}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              Nouveau Dossier
            </Button>
          </div>

          <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-subtle">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Raison Sociale</th>
                    <th className="px-4 py-3">Matricule Fiscal</th>
                    <th className="px-4 py-3">Régime TVA</th>
                    <th className="px-4 py-3">Ville</th>
                    <th className="px-4 py-3 text-center">Utilisateurs</th>
                    <th className="px-4 py-3 text-center">Factures</th>
                    <th className="px-4 py-3 text-center">Écritures</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {t.name}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {t.taxId}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {t.vatRegime}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {t.city}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-purple-600">
                        {t.userCount}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {t.invoiceCount}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-semibold text-amber-600">
                        {t.entryCount}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTargetTenantId(t.id);
                            setIsUserModalOpen(true);
                          }}
                          leftIcon={<Plus className="size-3" />}
                          className="text-purple-600 hover:text-purple-700 font-bold text-[11px]"
                        >
                          + Utilisateur
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE TENANT & INITIAL USER */}
      <Modal
        isOpen={isTenantModalOpen}
        onClose={() => setIsTenantModalOpen(false)}
        title="Créer une Entreprise (Dossier) & Premier Compte"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateTenant} className="space-y-6">
          {/* Section 1: Tenant Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1.5 border-b border-purple-100 dark:border-purple-900/60 pb-1.5">
              <Building2 className="size-4" /> 1. Informations de l'Entreprise (Tenant)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Input
                  label="Raison Sociale *"
                  placeholder="ex: STE EXEMPLE SERVICES SARL"
                  value={tenantFormData.name}
                  onChange={(e) => setTenantFormData({ ...tenantFormData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <MatriculeFiscalInput
                  value={tenantFormData.taxId}
                  onChange={(val) => setTenantFormData({ ...tenantFormData, taxId: val })}
                  required
                />
              </div>

              <div>
                <Input
                  label="Registre de Commerce / RNE"
                  placeholder="ex: B0145892023"
                  value={tenantFormData.tradeRegister}
                  onChange={(e) => setTenantFormData({ ...tenantFormData, tradeRegister: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Régime de TVA *
                </label>
                <select
                  value={tenantFormData.vatRegime}
                  onChange={(e) => setTenantFormData({ ...tenantFormData, vatRegime: e.target.value })}
                  className="w-full text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2"
                >
                  <option value="ASSUJETTI_TOTAL">Assujetti Total (TVA 7%, 13%, 19%)</option>
                  <option value="ASSUJETTI_PARTIEL">Assujetti Partiel (Règle du prorata)</option>
                  <option value="NON_ASSUJETTI">Non Assujetti</option>
                  <option value="EXONERE">Exonéré</option>
                </select>
              </div>

              <div>
                <Input
                  label="Ville *"
                  placeholder="ex: Tunis"
                  value={tenantFormData.city}
                  onChange={(e) => setTenantFormData({ ...tenantFormData, city: e.target.value })}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Adresse Complète"
                  placeholder="ex: 15 Rue de Palestine, Lafayette"
                  value={tenantFormData.address}
                  onChange={(e) => setTenantFormData({ ...tenantFormData, address: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 2: First User Account */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1.5 border-b border-purple-100 dark:border-purple-900/60 pb-1.5">
              <Users className="size-4" /> 2. Premier Compte Utilisateur Initial
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Input
                  label="Nom & Prénom de l'Utilisateur *"
                  placeholder="ex: Ahmed Ben Amor"
                  value={firstUserFormData.fullName}
                  onChange={(e) => setFirstUserFormData({ ...firstUserFormData, fullName: e.target.value })}
                  required
                />
              </div>

              <div>
                <Input
                  label="Identifiant de Connexion *"
                  placeholder="ex: compta_ste"
                  value={firstUserFormData.username}
                  onChange={(e) => setFirstUserFormData({ ...firstUserFormData, username: e.target.value })}
                  required
                />
              </div>

              <div>
                <Input
                  label="Mot de Passe Initial *"
                  type="password"
                  placeholder="••••••••"
                  value={firstUserFormData.password}
                  onChange={(e) => setFirstUserFormData({ ...firstUserFormData, password: e.target.value })}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Rôle Initial & Preset Appliqué *
                </label>
                <select
                  value={firstUserFormData.role}
                  onChange={(e) => setFirstUserFormData({ ...firstUserFormData, role: e.target.value })}
                  className="w-full text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2"
                >
                  <option value="ACCOUNTANT">ACCOUNTANT (Comptable / DAF - Preset Complet)</option>
                  <option value="COMMERCIAL">COMMERCIAL (Ventes & Tiers - Preset Restreint)</option>
                  <option value="SUPERADMIN">SUPERADMIN (Accès Total & Multi-Dossiers)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Le plan de comptes officiel (Classes 1 à 7) sera automatiquement créé et le preset associé au rôle sera attribué d'office.
                </p>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setIsTenantModalOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isSubmittingTenant}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              Créer le Dossier & le Compte
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CREATE ADDITIONAL USER */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title="Créer un Compte Utilisateur Supplémentaire"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Dossier Entreprise *
            </label>
            <select
              value={targetTenantId}
              onChange={(e) => setTargetTenantId(e.target.value)}
              className="w-full text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2"
              required
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (MF: {t.taxId})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Nom & Prénom *"
            placeholder="ex: Sonia Trabelsi"
            value={newUserFormData.fullName}
            onChange={(e) => setNewUserFormData({ ...newUserFormData, fullName: e.target.value })}
            required
          />

          <Input
            label="Identifiant de Connexion *"
            placeholder="ex: commercial_1"
            value={newUserFormData.username}
            onChange={(e) => setNewUserFormData({ ...newUserFormData, username: e.target.value })}
            required
          />

          <Input
            label="Mot de Passe *"
            type="password"
            placeholder="••••••••"
            value={newUserFormData.password}
            onChange={(e) => setNewUserFormData({ ...newUserFormData, password: e.target.value })}
            required
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Rôle du Compte *
            </label>
            <select
              value={newUserFormData.role}
              onChange={(e) => setNewUserFormData({ ...newUserFormData, role: e.target.value })}
              className="w-full text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2"
            >
              <option value="ACCOUNTANT">ACCOUNTANT (Comptable / DAF)</option>
              <option value="COMMERCIAL">COMMERCIAL (Ventes & Tiers)</option>
              <option value="SUPERADMIN">SUPERADMIN (Accès Total)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setIsUserModalOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isSubmittingUser}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              Créer le Compte
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

