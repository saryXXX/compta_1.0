/**
 * Role-Based Access Control (RBAC) & Granular Permissions System
 * for Tunisian Accounting Application (Loi 96-112 & NCT).
 * 
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';

export type UserRole = 'SUPERADMIN' | 'ACCOUNTANT' | 'COMMERCIAL' | 'ADMIN';

export interface PermissionDefinition {
  id: string;
  label: string;
  description: string;
  category: string;
}

export const PERMISSION_CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: 'ADMIN', label: 'Administration & Multi-Dossiers', icon: 'Building2' },
  { id: 'COMMERCIAL', label: 'Commercial & Facturation', icon: 'FileSpreadsheet' },
  { id: 'ACCOUNTING', label: 'Comptabilité Générale (SCE / NCT)', icon: 'Scale' },
  { id: 'FISCAL', label: 'Fiscalité Tunisienne (DGI & G50)', icon: 'Receipt' },
  { id: 'SOCIAL_TREASURY', label: 'Social, Actifs & Rapprochement', icon: 'Coins' },
];

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // Administration & Multi-Dossiers
  {
    id: 'tenants:create',
    label: 'Création de dossiers entreprises',
    description: "Créer de nouveaux tenants avec matricule fiscal tunisien et initialiser l'exercice comptable.",
    category: 'ADMIN',
  },
  {
    id: 'tenants:manage',
    label: 'Paramétrage des entreprises',
    description: 'Modifier la raison sociale, le régime TVA (Assujetti total/partiel), adresse et monnaie légale TND.',
    category: 'ADMIN',
  },
  {
    id: 'users:manage',
    label: 'Gestion des utilisateurs & Droits',
    description: 'Créer des comptes utilisateurs, assigner les rôles et configurer les permissions granulaires par action.',
    category: 'ADMIN',
  },

  // Commercial & Facturation
  {
    id: 'invoices:view',
    label: 'Consulter les factures',
    description: "Visualiser les factures de vente (clients) et factures d'achat (fournisseurs).",
    category: 'COMMERCIAL',
  },
  {
    id: 'invoices:create',
    label: 'Émettre et saisir des factures',
    description: "Créer des factures de vente avec TVA tunisienne (7%, 13%, 19%), FODEC 1% et droit de timbre 1.000 DT.",
    category: 'COMMERCIAL',
  },
  {
    id: 'invoices:edit',
    label: 'Modifier les factures',
    description: "Mettre à jour les lignes de facturation et les échéances de paiement avant validation définitive.",
    category: 'COMMERCIAL',
  },
  {
    id: 'invoices:delete',
    label: 'Supprimer / Archiver des factures',
    description: 'Supprimer ou envoyer vers la corbeille comptable les factures non validées.',
    category: 'COMMERCIAL',
  },
  {
    id: 'parties:view',
    label: 'Consulter le répertoire des tiers',
    description: 'Consulter la liste et les soldes des clients et fournisseurs.',
    category: 'COMMERCIAL',
  },
  {
    id: 'parties:manage',
    label: 'Créer et éditer des tiers',
    description: 'Créer des clients/fournisseurs avec vérification Matricule Fiscal, RNE et taux de Retenue à la Source.',
    category: 'COMMERCIAL',
  },

  // Comptabilité Générale
  {
    id: 'accounting:view',
    label: 'Consulter journaux et grand-livre',
    description: 'Accéder aux journaux des ventes, achats, trésorerie et opérations diverses (OD).',
    category: 'ACCOUNTING',
  },
  {
    id: 'accounting:post',
    label: 'Saisie comptable au kilomètre',
    description: 'Enregistrer des écritures comptables rapides en partie double (Débit = Crédit) avec raccourcis clavier.',
    category: 'ACCOUNTING',
  },
  {
    id: 'accounting:reports',
    label: 'États financiers NCT 01',
    description: 'Générer le Bilan comptable, État de Résultat et Tableau des Flux de Trésorerie selon les normes tunisiennes.',
    category: 'ACCOUNTING',
  },
  {
    id: 'accounting:closing',
    label: 'Clôture annuelle des comptes',
    description: "Exécuter la clôture d'exercice, solder les classes 6 & 7 et reporter les à-nouveaux (Classes 1 à 5).",
    category: 'ACCOUNTING',
  },

  // Fiscalité Tunisienne
  {
    id: 'fiscal:g50_view',
    label: 'Consulter les déclarations G50',
    description: 'Consulter les bordereaux de déclaration mensuelle G50 et l’historique des télédéclarations.',
    category: 'FISCAL',
  },
  {
    id: 'fiscal:g50_file',
    label: 'Calculer et valider la G50',
    description: 'Calculer la matrice 10-tax (RS, TFP, FOPROLOS, TVA, Timbre, TCL, plancher légal 30 DT) et générer la télétrans.',
    category: 'FISCAL',
  },
  {
    id: 'fiscal:ap_manage',
    label: 'Acomptes Provisionnels (AP1, AP2, AP3)',
    description: 'Calculer et liquider les acomptes provisionnels à 28% de l’IS antérieur avec imputation des RS.',
    category: 'FISCAL',
  },
  {
    id: 'fiscal:employer_manage',
    label: 'Déclaration Employeur Annuelle',
    description: 'Générer les annexes I à VII de la Déclaration Employeur tunisienne pour la recette des finances.',
    category: 'FISCAL',
  },
  {
    id: 'fiscal:tax_package',
    label: 'Liasse Fiscale & Passage Résultat',
    description: 'Calculer la réintégration fiscale, déductions et tableau de passage du résultat comptable au résultat fiscal.',
    category: 'FISCAL',
  },

  // Social, Actifs & Trésorerie
  {
    id: 'payroll:manage',
    label: 'Paie & Déclarations Sociales',
    description: 'Éditer les bulletins de paie, cotisations CNSS (9.18% salariale, 16.57% patronale) et barème IRPP 2024.',
    category: 'SOCIAL_TREASURY',
  },
  {
    id: 'assets:manage',
    label: 'Immobilisations & Amortissements NCT 05',
    description: 'Registre des immobilisations corporelles/incorporelles et calcul des dotations annuelles aux amortissements.',
    category: 'SOCIAL_TREASURY',
  },
  {
    id: 'bank:reconcile',
    label: 'Rapprochement Bancaire',
    description: 'Importer les relevés bancaires (compte 512100) et lettrer automatiquement avec les écritures du journal.',
    category: 'SOCIAL_TREASURY',
  },
];

/**
 * 1-Click Role Presets:
 * - COMMERCIAL: Strictly invoices and parties. Zero fiscal or accounting access.
 * - ACCOUNTANT: Full access to accounting, fiscal, statements, payroll, assets, bank recon, and parties/invoices.
 * - SUPERADMIN: Full unrestricted omnipotent access ('*').
 */
export const COMMERCIAL_PRESET: string[] = [
  'invoices:view',
  'invoices:create',
  'invoices:edit',
  'parties:view',
  'parties:manage',
];

export const ACCOUNTANT_PRESET: string[] = [
  'invoices:view',
  'invoices:create',
  'invoices:edit',
  'parties:view',
  'parties:manage',
  'accounting:view',
  'accounting:post',
  'accounting:reports',
  'accounting:closing',
  'fiscal:g50_view',
  'fiscal:g50_file',
  'fiscal:ap_manage',
  'fiscal:employer_manage',
  'fiscal:tax_package',
  'payroll:manage',
  'assets:manage',
  'bank:reconcile',
];

export const SUPERADMIN_PRESET: string[] = ['*'];

/**
 * Check if a user possesses a specific permission.
 */
export function hasPermission(role: string, permissions: string[], requiredPermission: string): boolean {
  if (role === 'SUPERADMIN' || role === 'ADMIN') return true;
  if (permissions.includes('*')) return true;
  return permissions.includes(requiredPermission);
}

/**
 * Express Middleware: Requires Superadmin privilege.
 */
export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Session non authentifiée.' });
    return;
  }
  const role = req.user.role.toUpperCase();
  if (role !== 'SUPERADMIN' && role !== 'ADMIN' && !req.user.permissions.includes('*')) {
    res.status(403).json({
      error: "Accès refusé. Cette section est strictement réservée à l'administrateur système (Superadmin).",
    });
    return;
  }
  next();
}

/**
 * Express Middleware: Requires Accountant (DAF / Comptable) or Superadmin role.
 * Blocks Commercial users from fiscal declarations, journals, ledger, payroll, etc.
 */
export function requireAccountantOrSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Session non authentifiée.' });
    return;
  }
  const role = req.user.role.toUpperCase();
  if (role === 'COMMERCIAL') {
    res.status(403).json({
      error: 'Accès restreint. Les déclarations fiscales (G50, AP, Déclaration Employeur) et la comptabilité sont réservées au cabinet / comptable.',
    });
    return;
  }
  next();
}

/**
 * Express Middleware factory for checking a specific permission.
 */
export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Session non authentifiée.' });
      return;
    }
    if (!hasPermission(req.user.role, req.user.permissions, permission)) {
      res.status(403).json({
        error: `Accès non autorisé. Permission requise : ${permission}`,
      });
      return;
    }
    next();
  };
}

