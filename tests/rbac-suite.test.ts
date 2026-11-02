/**
 * Automated Integration Test Suite for RBAC, Role Presets & Superadmin Tenant Creation.
 * 
 * Tests:
 * 1. Superadmin authentication & Permissions Meta endpoint
 * 2. Superadmin creates a new Tenant & initial user account with auto Chart of Accounts (SCE)
 * 3. Commercial user restriction: G50, Accounting, and Admin endpoints strictly blocked (403 Forbidden)
 * 4. Accountant user authorization: G50 simulation and Accounting accessible (200 OK)
 * 5. Dynamic Granular Permission granting via Superadmin API
 * 
 * STRICT COMPLIANCE: ZERO TYPE NULL.
 */

import { prisma } from '../server/db.js';
import { hashPassword } from '../server/auth.js';
import { ALL_PERMISSIONS, COMMERCIAL_PRESET, ACCOUNTANT_PRESET } from '../server/rbac.js';

async function runRBACTestSuite() {
  console.log('===============================================================');
  console.log('        FINANCE TUNISIE - RBAC & TENANT CREATION TESTS');
  console.log('===============================================================');

  // Use test port 3005 to guarantee isolation
  const TEST_PORT = 3005;
  process.env.PORT = String(TEST_PORT);

  // Dynamically import server
  await import('../server/index.js');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const BASE_URL = `http://localhost:${TEST_PORT}/api`;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (!condition) {
      console.error(`❌ FAILED: ${testName}`);
      if (detail) console.error(`   ${detail}`);
      process.exit(1);
    } else {
      console.log(`  ✔ PASS: ${testName} ${detail ? `(${detail})` : ''}`);
    }
  }

  // --- Step 1: Admin / Superadmin Login ---
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const adminLoginData = await adminLoginRes.json();
  assert(adminLoginRes.ok && adminLoginData.token, 'Superadmin login successful', `User: ${adminLoginData.user.username}`);
  const adminToken = adminLoginData.token;
  const adminHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`,
  };

  // --- Step 2: Permissions Metadata ---
  const metaRes = await fetch(`${BASE_URL}/admin/permissions-meta`, { headers: adminHeaders });
  const metaData = await metaRes.json();
  assert(metaRes.ok, 'Permissions metadata fetched');
  assert(metaData.permissions.length === ALL_PERMISSIONS.length, `20 granular actions registered (Found: ${metaData.permissions.length})`);
  assert(Array.isArray(metaData.presets.ACCOUNTANT) && metaData.presets.ACCOUNTANT.length === ACCOUNTANT_PRESET.length, 'Accountant preset correctly configured');
  assert(Array.isArray(metaData.presets.COMMERCIAL) && metaData.presets.COMMERCIAL.length === COMMERCIAL_PRESET.length, 'Commercial preset correctly configured');

  // --- Step 3: Superadmin creates Tenant & Initial Account ---
  const testTenantTaxId = `1985${Math.floor(100 + Math.random() * 900)}M/A/M/000`;
  const initialUsername = `cfo_test_${Date.now().toString().slice(-4)}`;

  const createTenantRes = await fetch(`${BASE_URL}/admin/tenants`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      tenantData: {
        name: 'STE TEST AUTOMATION NORD SARL',
        taxId: testTenantTaxId,
        tradeRegister: 'B9998882024',
        vatRegime: 'ASSUJETTI_TOTAL',
        city: 'Ariana',
        currency: 'TND',
      },
      initialUserData: {
        fullName: 'Khaled Test (Comptable Agréé)',
        username: initialUsername,
        password: 'Password123!',
        role: 'ACCOUNTANT',
      },
    }),
  });
  const createTenantData = await createTenantRes.json();
  assert(createTenantRes.ok && createTenantData.tenant.id, 'Superadmin creates Tenant & First User', `Tenant: ${createTenantData.tenant.name}`);
  const createdTenantId = createTenantData.tenant.id;

  // Verify chart of accounts automatically initialized
  const createdAccountsCount = await prisma.account.count({
    where: { tenantId: createdTenantId },
  });
  assert(createdAccountsCount >= 40, `SCE Chart of accounts initialized for new tenant (${createdAccountsCount} accounts)`);

  // --- Step 4: Login with newly created Accountant account ---
  const cfoLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: initialUsername, password: 'Password123!' }),
  });
  const cfoLoginData = await cfoLoginRes.json();
  assert(cfoLoginRes.ok && cfoLoginData.user.role === 'ACCOUNTANT', 'Accountant login successful', `Role: ${cfoLoginData.user.role}`);
  const cfoHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${cfoLoginData.token}`,
  };

  // Accountant CAN access G50 simulation
  const cfoG50Res = await fetch(`${BASE_URL}/fiscal/g50/simulate?month=1&year=2026`, { headers: cfoHeaders });
  assert(cfoG50Res.ok, 'Accountant can access G50 simulation (200 OK)');

  // Accountant CANNOT access Superadmin tenant creation
  const cfoAdminRes = await fetch(`${BASE_URL}/admin/tenants`, { headers: cfoHeaders });
  assert(cfoAdminRes.status === 403, 'Accountant blocked from Superadmin tenant management (403 Forbidden)');

  // --- Step 5: Superadmin creates a Commercial user ---
  const commercialUsername = `sales_user_${Date.now().toString().slice(-4)}`;
  const createCommercialRes = await fetch(`${BASE_URL}/admin/users`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      tenantId: createdTenantId,
      fullName: 'Yassine Commercial',
      username: commercialUsername,
      password: 'Commercial123!',
      role: 'COMMERCIAL',
    }),
  });
  const createCommercialData = await createCommercialRes.json();
  assert(createCommercialRes.ok && createCommercialData.user.role === 'COMMERCIAL', 'Superadmin creates Commercial user');
  const commercialUserId = createCommercialData.user.id;

  // Login as Commercial user
  const commLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: commercialUsername, password: 'Commercial123!' }),
  });
  const commLoginData = await commLoginRes.json();
  assert(commLoginRes.ok && commLoginData.user.role === 'COMMERCIAL', 'Commercial login successful');
  const commHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${commLoginData.token}`,
  };

  // Commercial user CAN access invoices
  const commInvoicesRes = await fetch(`${BASE_URL}/invoices`, { headers: commHeaders });
  assert(commInvoicesRes.ok, 'Commercial user can view invoices (200 OK)');

  // Commercial user CAN access parties
  const commPartiesRes = await fetch(`${BASE_URL}/parties`, { headers: commHeaders });
  assert(commPartiesRes.ok, 'Commercial user can view clients/suppliers (200 OK)');

  // Commercial user CANNOT access G50 simulation (403)
  const commG50Res = await fetch(`${BASE_URL}/fiscal/g50/simulate?month=1&year=2026`, { headers: commHeaders });
  assert(commG50Res.status === 403, 'Commercial user strictly blocked from G50 simulation (403 Forbidden)');

  // Commercial user CANNOT access General Accounting (403)
  const commAccountingRes = await fetch(`${BASE_URL}/accounting/accounts`, { headers: commHeaders });
  assert(commAccountingRes.status === 403, 'Commercial user strictly blocked from Accounting Accounts (403 Forbidden)');

  // Commercial user CANNOT access Payroll (403)
  const commPayrollRes = await fetch(`${BASE_URL}/payroll/employees`, { headers: commHeaders });
  assert(commPayrollRes.status === 403, 'Commercial user strictly blocked from Payroll (403 Forbidden)');

  // Commercial user CANNOT access Fixed Assets (403)
  const commAssetsRes = await fetch(`${BASE_URL}/assets`, { headers: commHeaders });
  assert(commAssetsRes.status === 403, 'Commercial user strictly blocked from Fixed Assets (403 Forbidden)');

  // --- Step 6: Superadmin updates permissions dynamically ---
  const updatePermsRes = await fetch(`${BASE_URL}/admin/users/${commercialUserId}/permissions`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({
      role: 'COMMERCIAL',
      permissions: [...COMMERCIAL_PRESET, 'fiscal:g50_view'],
    }),
  });
  const updatePermsData = await updatePermsRes.json();
  assert(updatePermsRes.ok, 'Superadmin grants granular permissions dynamically');
  assert(updatePermsData.user.permissions.includes('fiscal:g50_view'), 'Granular permission reflected in user profile');

  console.log('===============================================================');
  console.log('✅ ALL RBAC & ROLE PRESET INTEGRATION TESTS PASSED PERFECTLY!');
  console.log('===============================================================');

  // Clean up created test tenant and users
  await prisma.account.deleteMany({ where: { tenantId: createdTenantId } });
  await prisma.session.deleteMany({ where: { tenantId: createdTenantId } });
  await prisma.user.deleteMany({ where: { tenantId: createdTenantId } });
  await prisma.tenant.delete({ where: { id: createdTenantId } });

  process.exit(0);
}

runRBACTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
