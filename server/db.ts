  /**
 * Prisma database client & soft delete / multi-tenant utilities.
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import type { PrismaClient as PrismaClientType } from '../prisma/client/index.js';
import PrismaPkg from '../prisma/client/index.js';

// CommonJS and ESM interop safe constructor for PrismaClient
const PrismaClientConstructor = ((PrismaPkg as any).PrismaClient || (PrismaPkg as any).default?.PrismaClient || PrismaPkg) as typeof PrismaClientType;

const dbUrl = process.env.DATABASE_URL;
export const prisma = dbUrl
  ? new PrismaClientConstructor({ datasources: { db: { url: dbUrl } } })
  : new PrismaClientConstructor();

export interface SoftDeleteOptions {
  tenantId: string;
  id: string;
}

/**
 * Universal Soft Delete helper for any table with isDeleted / deletedAt fields.
 */
export async function softDeleteRecord(modelName: string, id: string, tenantId: string): Promise<boolean> {
  const nowIso = new Date().toISOString();
  try {
    switch (modelName) {
      case 'party':
        await prisma.party.update({
          where: { id },
          data: { isDeleted: true, deletedAt: nowIso },
        });
        return true;
      case 'invoice':
        await prisma.invoice.update({
          where: { id },
          data: { isDeleted: true, deletedAt: nowIso },
        });
        return true;
      case 'accountingEntry':
        await prisma.accountingEntry.update({
          where: { id },
          data: { isDeleted: true, deletedAt: nowIso },
        });
        return true;
      case 'g50':
        await prisma.taxDeclarationG50.update({
          where: { id },
          data: { isDeleted: true, deletedAt: nowIso },
        });
        return true;
      case 'ap':
        await prisma.provisionalPaymentAP.update({
          where: { id },
          data: { isDeleted: true, deletedAt: nowIso },
        });
        return true;
      case 'employee':
        await prisma.employee.update({
          where: { id },
          data: { isDeleted: true, deletedAt: nowIso },
        });
        return true;
      case 'payrollSlip':
        await prisma.payrollSlip.update({
          where: { id },
          data: { isDeleted: true, deletedAt: nowIso },
        });
        return true;
      case 'fixedAsset':
        await prisma.fixedAsset.update({
          where: { id },
          data: { isDeleted: true, deletedAt: nowIso },
        });
        return true;
      case 'bankStatementLine':
        await prisma.bankStatementLine.update({
          where: { id },
          data: { isDeleted: true, deletedAt: nowIso },
        });
        return true;
      case 'fiscalAdjustment':
        await prisma.fiscalAdjustment.update({
          where: { id },
          data: { isDeleted: true, deletedAt: nowIso },
        });
        return true;
      default:
        return false;
    }
  } catch (err) {
    console.error(`Error soft deleting ${modelName} ${id}:`, err);
    return false;
  }
}

/**
 * Universal Restore helper for soft-deleted records.
 */
export async function restoreRecord(modelName: string, id: string, tenantId: string): Promise<boolean> {
  try {
    switch (modelName) {
      case 'party':
        await prisma.party.update({
          where: { id },
          data: { isDeleted: false, deletedAt: undefined },
        });
        return true;
      case 'invoice':
        await prisma.invoice.update({
          where: { id },
          data: { isDeleted: false, deletedAt: undefined },
        });
        return true;
      case 'accountingEntry':
        await prisma.accountingEntry.update({
          where: { id },
          data: { isDeleted: false, deletedAt: undefined },
        });
        return true;
      case 'g50':
        await prisma.taxDeclarationG50.update({
          where: { id },
          data: { isDeleted: false, deletedAt: undefined },
        });
        return true;
      case 'ap':
        await prisma.provisionalPaymentAP.update({
          where: { id },
          data: { isDeleted: false, deletedAt: undefined },
        });
        return true;
      case 'employee':
        await prisma.employee.update({
          where: { id },
          data: { isDeleted: false, deletedAt: undefined },
        });
        return true;
      case 'payrollSlip':
        await prisma.payrollSlip.update({
          where: { id },
          data: { isDeleted: false, deletedAt: undefined },
        });
        return true;
      case 'fixedAsset':
        await prisma.fixedAsset.update({
          where: { id },
          data: { isDeleted: false, deletedAt: undefined },
        });
        return true;
      case 'bankStatementLine':
        await prisma.bankStatementLine.update({
          where: { id },
          data: { isDeleted: false, deletedAt: undefined },
        });
        return true;
      case 'fiscalAdjustment':
        await prisma.fiscalAdjustment.update({
          where: { id },
          data: { isDeleted: false, deletedAt: undefined },
        });
        return true;
      default:
        return false;
    }
  } catch (err) {
    console.error(`Error restoring ${modelName} ${id}:`, err);
    return false;
  }
}

