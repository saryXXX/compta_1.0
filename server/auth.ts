/**
 * Authentication and Session Management for Tunisian Accounting API.
 * Uses PBKDF2-HMAC-SHA256 with cryptographically random salts.
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from './db.js';

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  username: string;
  fullName: string;
  role: string;
  permissions: string[];
  tenantName: string;
  tenantTaxId: string;
  tenantCurrency: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  tenantId?: string;
}

export function hashPassword(password: string, saltInput?: string): { hash: string; salt: string } {
  const salt = saltInput !== undefined ? saltInput : crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

export async function createSession(userId: string, tenantId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days session

  await prisma.session.create({
    data: {
      token,
      userId,
      tenantId,
      expiresAt,
    },
  });

  return token;
}

export async function getSession(token?: string): Promise<AuthenticatedUser | undefined> {
  if (!token) return undefined;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          tenant: true,
        },
      },
    },
  });

  if (!session) return undefined;

  // Check expiration
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
    return undefined;
  }

  // Check if user or tenant was soft-deleted
  if (session.user.isDeleted || session.user.tenant.isDeleted) {
    return undefined;
  }

  let userPermissions: string[] = [];
  const rawUser = session.user as typeof session.user & { permissions?: string };
  try {
    userPermissions = JSON.parse(rawUser.permissions || '[]');
  } catch {
    userPermissions = [];
  }

  const role = session.user.role.toUpperCase();
  if (role === 'SUPERADMIN' || role === 'ADMIN') {
    if (!userPermissions.includes('*')) {
      userPermissions.push('*');
    }
  }

  return {
    id: session.user.id,
    tenantId: session.tenantId,
    username: session.user.username,
    fullName: session.user.fullName,
    role: session.user.role,
    permissions: userPermissions,
    tenantName: session.user.tenant.name,
    tenantTaxId: session.user.tenant.taxId,
    tenantCurrency: session.user.tenant.currency,
  };
}

export async function deleteSession(token?: string): Promise<void> {
  if (!token) return;
  await prisma.session.delete({ where: { token } }).catch(() => {});
}

/**
 * Express middleware to authenticate requests via Bearer token or cookie.
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  let token: string | undefined = undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (typeof req.headers['x-session-token'] === 'string') {
    token = req.headers['x-session-token'];
  }

  if (!token) {
    res.status(401).json({ error: 'Non authentifié. Veuillez vous connecter.' });
    return;
  }

  const user = await getSession(token);
  if (!user) {
    res.status(401).json({ error: 'Session expirée ou invalide.' });
    return;
  }

  req.user = user;
  req.tenantId = user.tenantId;
  next();
}
