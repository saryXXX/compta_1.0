/**
 * Auth Router: Login, Profile, Logout, Tenant switcher.
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { verifyPassword, createSession, deleteSession, requireAuth, AuthenticatedRequest } from '../auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Nom d'utilisateur et mot de passe requis." });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { tenant: true },
    });

    if (!user || user.isDeleted || user.tenant.isDeleted) {
      res.status(401).json({ error: "Identifiants invalides." });
      return;
    }

    const isMatch = verifyPassword(password, user.salt, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: "Identifiants invalides." });
      return;
    }

    const token = await createSession(user.id, user.tenantId);

    let userPermissions: string[] = [];
    const rawUser = user as typeof user & { permissions?: string };
    try {
      userPermissions = JSON.parse(rawUser.permissions || '[]');
    } catch {
      userPermissions = [];
    }
    const roleUpper = user.role.toUpperCase();
    if (roleUpper === 'SUPERADMIN' || roleUpper === 'ADMIN') {
      if (!userPermissions.includes('*')) userPermissions.push('*');
    }

    res.json({
      token,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        permissions: userPermissions,
        tenantName: user.tenant.name,
        tenantTaxId: user.tenant.taxId,
        tenantCurrency: user.tenant.currency,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erreur interne du serveur' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
router.post('/logout', async (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    await deleteSession(token);
  }
  res.json({ success: true, message: 'Déconnexion réussie.' });
});

// GET /api/auth/tenants
router.get('/tenants', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const tenants = await prisma.tenant.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      name: true,
      taxId: true,
      tradeRegister: true,
      city: true,
      currency: true,
    },
  });
  res.json({ tenants });
});

// POST /api/auth/switch-tenant
router.post('/switch-tenant', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { tenantId } = req.body;
  if (!tenantId) {
    res.status(400).json({ error: 'tenantId requis.' });
    return;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant || tenant.isDeleted) {
    res.status(404).json({ error: 'Dossier société introuvable.' });
    return;
  }

  // Update session tenant
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    await prisma.session.update({
      where: { token },
      data: { tenantId },
    });
  }

  res.json({
    success: true,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      taxId: tenant.taxId,
      currency: tenant.currency,
    },
  });
});

export default router;

