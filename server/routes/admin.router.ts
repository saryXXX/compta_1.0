/**
 * Admin Router: Tenant Creation, Initial Account Setup, and Granular RBAC Permissions.
 * Restricted strictly to Superadmin users.
 * 
 * STRICT COMPLIANCE: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { requireAuth, AuthenticatedRequest, hashPassword } from '../auth.js';
import {
  requireSuperAdmin,
  ALL_PERMISSIONS,
  PERMISSION_CATEGORIES,
  COMMERCIAL_PRESET,
  ACCOUNTANT_PRESET,
  SUPERADMIN_PRESET,
} from '../rbac.js';

const router = Router();

// Protect all admin endpoints with SuperAdmin check
router.use(requireAuth);
router.use(requireSuperAdmin);

// Standard Tunisian Chart of Accounts (SCE - Classes 1 à 7) for initializing new tenants
const STANDARD_SCE_ACCOUNTS = [
  { code: '101000', name: 'Capital social', category: 'CLASSE_1' },
  { code: '111000', name: 'Réserve légale', category: 'CLASSE_1' },
  { code: '121000', name: 'Report à nouveau créditeur', category: 'CLASSE_1' },
  { code: '129000', name: 'Report à nouveau débiteur', category: 'CLASSE_1' },
  { code: '131000', name: "Résultat net de l'exercice - Bénéfice", category: 'CLASSE_1' },
  { code: '139000', name: "Résultat net de l'exercice - Perte", category: 'CLASSE_1' },
  { code: '213000', name: 'Logiciels informatiques et assimilés', category: 'CLASSE_2' },
  { code: '222000', name: 'Constructions et aménagements', category: 'CLASSE_2' },
  { code: '224000', name: 'Matériel de transport', category: 'CLASSE_2' },
  { code: '228000', name: 'Matériel de bureau et matériel informatique', category: 'CLASSE_2' },
  { code: '281300', name: 'Amortissements des logiciels', category: 'CLASSE_2' },
  { code: '282200', name: 'Amortissements des constructions', category: 'CLASSE_2' },
  { code: '282400', name: 'Amortissements du matériel de transport', category: 'CLASSE_2' },
  { code: '282800', name: 'Amortissements du matériel informatique', category: 'CLASSE_2' },
  { code: '311000', name: 'Matières premières', category: 'CLASSE_3' },
  { code: '371000', name: 'Marchandises en magasin', category: 'CLASSE_3' },
  { code: '401100', name: "Fournisseurs d'exploitation", category: 'CLASSE_4' },
  { code: '411100', name: 'Clients ordinaires', category: 'CLASSE_4' },
  { code: '421000', name: 'Personnel - Rémunérations dues', category: 'CLASSE_4' },
  { code: '432100', name: 'État - TCL (Taxe sur les collectivités locales)', category: 'CLASSE_4' },
  { code: '432200', name: 'État - Droit de timbre fiscal', category: 'CLASSE_4' },
  { code: '432300', name: 'État - FODEC collecté', category: 'CLASSE_4' },
  { code: '434100', name: 'État - Retenues à la source sur salaires (IRPP)', category: 'CLASSE_4' },
  { code: '434200', name: 'État - Retenues à la source sur honoraires', category: 'CLASSE_4' },
  { code: '434700', name: 'État - Retenues à la source sur marchés et achats', category: 'CLASSE_4' },
  { code: '434800', name: 'État - Retenues à la source subies', category: 'CLASSE_4' },
  { code: '436500', name: 'État - TVA à décaisser', category: 'CLASSE_4' },
  { code: '436610', name: 'État - TVA déductible sur immobilisations', category: 'CLASSE_4' },
  { code: '436620', name: 'État - TVA déductible sur autres biens et services', category: 'CLASSE_4' },
  { code: '436710', name: 'État - TVA collectée à 19%', category: 'CLASSE_4' },
  { code: '436720', name: 'État - TVA collectée à 13%', category: 'CLASSE_4' },
  { code: '436730', name: 'État - TVA collectée à 7%', category: 'CLASSE_4' },
  { code: '436800', name: 'État - Crédit de TVA à reporter', category: 'CLASSE_4' },
  { code: '438100', name: 'Organismes sociaux - CNSS', category: 'CLASSE_4' },
  { code: '512100', name: 'Banque - Compte courant principal', category: 'CLASSE_5' },
  { code: '532100', name: 'Caisse centrale', category: 'CLASSE_5' },
  { code: '607000', name: 'Achats de marchandises', category: 'CLASSE_6' },
  { code: '613200', name: 'Locations immobilières', category: 'CLASSE_6' },
  { code: '622600', name: "Honoraires d'experts et conseils juridiques", category: 'CLASSE_6' },
  { code: '627000', name: 'Services bancaires et assimilés', category: 'CLASSE_6' },
  { code: '631000', name: 'Rémunérations du personnel (Salaires bruts)', category: 'CLASSE_6' },
  { code: '632000', name: 'Cotisations sociales patronales (CNSS)', category: 'CLASSE_6' },
  { code: '633100', name: 'TFP (Taxe de Formation Professionnelle)', category: 'CLASSE_6' },
  { code: '633200', name: 'FOPROLOS (Logements sociaux)', category: 'CLASSE_6' },
  { code: '641000', name: 'TCL (Taxe sur les collectivités locales)', category: 'CLASSE_6' },
  { code: '645000', name: "Droits d'enregistrement et de timbre", category: 'CLASSE_6' },
  { code: '681100', name: 'Dotations aux amortissements des immobilisations', category: 'CLASSE_6' },
  { code: '691000', name: 'Impôt sur les sociétés (IS)', category: 'CLASSE_6' },
  { code: '706000', name: 'Prestations de services et études', category: 'CLASSE_7' },
  { code: '707000', name: 'Ventes de marchandises', category: 'CLASSE_7' },
];

// GET /api/admin/permissions-meta - Get metadata for permission matrix and presets
router.get('/permissions-meta', async (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    permissions: ALL_PERMISSIONS,
    categories: PERMISSION_CATEGORIES,
    presets: {
      ACCOUNTANT: ACCOUNTANT_PRESET,
      COMMERCIAL: COMMERCIAL_PRESET,
      SUPERADMIN: SUPERADMIN_PRESET,
    },
  });
});

// GET /api/admin/tenants - List all tenants with summary statistics
router.get('/tenants', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { isDeleted: false },
      include: {
        _count: {
          select: {
            users: { where: { isDeleted: false } },
            invoices: { where: { isDeleted: false } },
            parties: { where: { isDeleted: false } },
            entries: { where: { isDeleted: false } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      taxId: t.taxId,
      tradeRegister: t.tradeRegister || undefined,
      vatRegime: t.vatRegime,
      address: t.address || undefined,
      city: t.city,
      phone: t.phone || undefined,
      email: t.email || undefined,
      currency: t.currency,
      createdAt: t.createdAt,
      userCount: t._count.users,
      invoiceCount: t._count.invoices,
      partyCount: t._count.parties,
      entryCount: t._count.entries,
    }));

    res.json({ tenants: formatted });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erreur lors de la récupération des dossiers.' });
  }
});

// POST /api/admin/tenants - Superadmin creates a new Tenant AND its first user account
router.post('/tenants', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantData, initialUserData } = req.body;

    if (!tenantData || !tenantData.name || !tenantData.taxId) {
      res.status(400).json({ error: 'Raison sociale et Matricule Fiscal obligatoires pour créer une entreprise.' });
      return;
    }

    if (!initialUserData || !initialUserData.username || !initialUserData.password || !initialUserData.fullName) {
      res.status(400).json({ error: 'Données du premier compte utilisateur obligatoires (Identifiant, Mot de passe, Nom complet).' });
      return;
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: initialUserData.username.trim() },
    });
    if (existingUser) {
      res.status(409).json({ error: `Le nom d'utilisateur "${initialUserData.username}" est déjà attribué.` });
      return;
    }

    // Determine initial role and permissions
    const userRole = (initialUserData.role || 'ACCOUNTANT').toUpperCase();
    let permissionsArray: string[] = [];
    if (Array.isArray(initialUserData.permissions) && initialUserData.permissions.length > 0) {
      permissionsArray = initialUserData.permissions;
    } else {
      if (userRole === 'COMMERCIAL') {
        permissionsArray = COMMERCIAL_PRESET;
      } else if (userRole === 'ACCOUNTANT') {
        permissionsArray = ACCOUNTANT_PRESET;
      } else {
        permissionsArray = SUPERADMIN_PRESET;
      }
    }

    const { hash, salt } = hashPassword(initialUserData.password.trim());

    // Create Tenant & First User atomically
    const newTenant = await prisma.tenant.create({
      data: {
        name: tenantData.name.trim(),
        taxId: tenantData.taxId.trim(),
        tradeRegister: tenantData.tradeRegister ? tenantData.tradeRegister.trim() : undefined,
        vatRegime: tenantData.vatRegime || 'ASSUJETTI_TOTAL',
        address: tenantData.address ? tenantData.address.trim() : undefined,
        city: tenantData.city || 'Tunis',
        phone: tenantData.phone ? tenantData.phone.trim() : undefined,
        email: tenantData.email ? tenantData.email.trim() : undefined,
        currency: tenantData.currency || 'TND',
      },
    });

    const firstUser = await prisma.user.create({
      data: {
        tenantId: newTenant.id,
        username: initialUserData.username.trim(),
        passwordHash: hash,
        salt: salt,
        fullName: initialUserData.fullName.trim(),
        role: userRole,
        permissions: JSON.stringify(permissionsArray),
      },
    });

    // Initialize Standard Chart of Accounts (SCE Classes 1 à 7)
    for (const acc of STANDARD_SCE_ACCOUNTS) {
      await prisma.account.create({
        data: {
          tenantId: newTenant.id,
          accountCode: acc.code,
          accountName: acc.name,
          accountCategory: acc.category,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: `Dossier entreprise "${newTenant.name}" et premier compte "${firstUser.username}" créés avec succès.`,
      tenant: {
        id: newTenant.id,
        name: newTenant.name,
        taxId: newTenant.taxId,
        vatRegime: newTenant.vatRegime,
      },
      user: {
        id: firstUser.id,
        username: firstUser.username,
        fullName: firstUser.fullName,
        role: firstUser.role,
        permissions: permissionsArray,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erreur lors de la création du dossier et du premier compte.' });
  }
});

// GET /api/admin/users - List all users across tenants with permissions
router.get('/users', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { isDeleted: false },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            taxId: true,
            city: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = users.map((u) => {
      let parsedPermissions: string[] = [];
      try {
        parsedPermissions = JSON.parse(u.permissions || '[]');
      } catch {
        parsedPermissions = [];
      }
      return {
        id: u.id,
        tenantId: u.tenantId,
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        permissions: parsedPermissions,
        createdAt: u.createdAt,
        tenant: u.tenant,
      };
    });

    res.json({ users: formatted });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erreur lors du chargement des utilisateurs.' });
  }
});

// POST /api/admin/users - Superadmin creates a new user under an existing tenant
router.post('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, username, password, fullName, role, permissions } = req.body;

    if (!tenantId || !username || !password || !fullName) {
      res.status(400).json({ error: 'tenantId, identifiant, mot de passe et nom complet requis.' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { username: username.trim() },
    });
    if (existingUser) {
      res.status(409).json({ error: `L'identifiant "${username}" existe déjà.` });
      return;
    }

    const userRole = (role || 'ACCOUNTANT').toUpperCase();
    let permissionsArray: string[] = [];
    if (Array.isArray(permissions) && permissions.length > 0) {
      permissionsArray = permissions;
    } else {
      if (userRole === 'COMMERCIAL') permissionsArray = COMMERCIAL_PRESET;
      else if (userRole === 'ACCOUNTANT') permissionsArray = ACCOUNTANT_PRESET;
      else permissionsArray = SUPERADMIN_PRESET;
    }

    const { hash, salt } = hashPassword(password.trim());

    const newUser = await prisma.user.create({
      data: {
        tenantId,
        username: username.trim(),
        passwordHash: hash,
        salt: salt,
        fullName: fullName.trim(),
        role: userRole,
        permissions: JSON.stringify(permissionsArray),
      },
      include: {
        tenant: {
          select: { id: true, name: true, taxId: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: `Utilisateur "${newUser.username}" créé avec succès.`,
      user: {
        id: newUser.id,
        tenantId: newUser.tenantId,
        username: newUser.username,
        fullName: newUser.fullName,
        role: newUser.role,
        permissions: permissionsArray,
        tenant: newUser.tenant,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erreur lors de la création de l'utilisateur." });
  }
});

// PUT /api/admin/users/:id/permissions - Superadmin updates user role and granular permissions
router.put('/users/:id/permissions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role, permissions } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { tenant: true },
    });

    if (!user || user.isDeleted) {
      res.status(404).json({ error: 'Utilisateur introuvable.' });
      return;
    }

    let permissionsArray: string[] = [];
    if (Array.isArray(permissions)) {
      permissionsArray = permissions;
    } else if (typeof permissions === 'string') {
      try {
        permissionsArray = JSON.parse(permissions);
      } catch {
        permissionsArray = [];
      }
    }

    const updatedRole = role ? role.toUpperCase() : user.role;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role: updatedRole,
        permissions: JSON.stringify(permissionsArray),
      },
      include: {
        tenant: {
          select: { id: true, name: true, taxId: true },
        },
      },
    });

    res.json({
      success: true,
      message: `Droits et permissions de l'utilisateur "${updatedUser.username}" mis à jour avec succès.`,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        permissions: permissionsArray,
        tenant: updatedUser.tenant,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erreur lors de la mise à jour des permissions.' });
  }
});

export default router;

