/**
 * Live End-to-End Integration Test for Finance Tunisie.
 * Tests every single module, endpoint, calculation, and workflow:
 * 1. Health check
 * 2. Login & Authentication token creation
 * 3. Client & Supplier management (CRUD, Tunisian Tax ID validation)
 * 4. Invoice creation with automated double-entry accounting (TVA 19%, FODEC 1%, Timbre 1 DT, RS 1%)
 * 5. Monthly Return G50 simulation & filing
 * 6. Provisional Installments AP1, AP2, AP3 & payment marking
 * 7. Annual Employer Declaration & TEJ platform export (DECEMP.txt & ANXEMP.txt)
 * 8. Financial Statements (NCT 01 Bilan Actif = Passif & État de Résultat)
 * 9. Soft-Delete & Archive Restoration (Trash bin workflow)
 * 
 * STRICT COMPLIANCE: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runLiveE2ETest() {
  console.log('===============================================================');
  console.log('       FINANCE TUNISIE - LIVE END-TO-END SYSTEM TEST');
  console.log('===============================================================');

  // Use test port 3006 to guarantee isolation
  const TEST_PORT = 3006;
  process.env.PORT = String(TEST_PORT);

  // Dynamically import the express server app
  const serverModule = await import('../server/index.js');
  
  // Wait for server to bind port
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const BASE_URL = `http://localhost:${TEST_PORT}/api`;

  function assert(condition: boolean, stepName: string, details?: string) {
    if (!condition) {
      console.error(`❌ FAILED: ${stepName}`);
      if (details) console.error(`   Details: ${details}`);
      process.exit(1);
    } else {
      console.log(`✅ PASSED: ${stepName} ${details ? `(${details})` : ''}`);
    }
  }

  // 1. Health Check
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthData = await healthRes.json();
  assert(healthRes.ok && healthData.status === 'ok', 'Step 1: API Health Check', healthData.service);

  // 2. Authentication: Login with admin / admin123
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const loginData = await loginRes.json();
  assert(loginRes.ok && loginData.token, 'Step 2: Admin Login Authentication', `User: ${loginData.user.fullName}`);
  const token = loginData.token;
  const tenantId = loginData.user.tenantId;

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // 3. User & Active Tenant Profile
  const meRes = await fetch(`${BASE_URL}/auth/me`, { headers: authHeaders });
  const meData = await meRes.json();
  assert(meRes.ok && meData.user.tenantTaxId === '1485962B/A/M/000', 'Step 3: Active Tenant Session Scoping', `Tenant: ${meData.user.tenantName}`);

  // 4. Create a New Client with Tunisian Matricule Fiscal validation
  const newClientTaxId = '1589423M/A/M/000';
  const createClientRes = await fetch(`${BASE_URL}/parties`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      partyType: 'CLIENT',
      name: 'STE SFAX LOGISTIQUE INTERNATIONALE SA',
      taxId: newClientTaxId,
      rneNumber: 'B0589422022',
      vatStatus: 'ASSUJETTI',
      address: 'Route de Gabès Km 3',
      city: 'Sfax',
      phone: '+216 74 450 000',
      email: 'contact@sfax-logistique.tn',
      defaultWithholdingRate: 1.0,
      accountCode: '411100',
    }),
  });
  const createClientData = await createClientRes.json();
  assert(createClientRes.ok && createClientData.party.taxId === newClientTaxId, 'Step 4: Client Creation with Tunisian Tax ID', `ID: ${createClientData.party.id}`);
  const createdClientId = createClientData.party.id;

  // 5. Test Invalid Matricule Fiscal Rejection
  const invalidClientRes = await fetch(`${BASE_URL}/parties`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      partyType: 'CLIENT',
      name: 'INVALID CLIENT TEST',
      taxId: 'BAD-TAX-ID',
    }),
  });
  assert(!invalidClientRes.ok && invalidClientRes.status === 400, 'Step 5: Invalid Tunisian Tax ID Rejection Check');

  // 6. Create a Sale Invoice (15 000 DT HT + 1% FODEC + 19% TVA + 1 DT Timbre + 1% RS)
  const invoiceNumber = `FAC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const invoiceDate = new Date().toISOString().split('T')[0] as string;

  const createInvoiceRes = await fetch(`${BASE_URL}/invoices`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      invoiceType: 'SALE',
      invoiceNumber,
      partyId: createdClientId,
      invoiceDate,
      dueDate: invoiceDate,
      items: [
        {
          description: 'Systèmes serveurs haute performance et stockage SAN',
          quantity: 1,
          unitPriceHt: 15000,
          discountPercent: 0,
          fodecRate: 1, // 150 TND FODEC
          vatRate: 19, // 19% on (15000 + 150) = 2878.500 TND
        },
      ],
      notes: 'Livraison sur site avec garantie constructeur 3 ans',
    }),
  });
  const createInvoiceData = await createInvoiceRes.json();
  assert(createInvoiceRes.ok && createInvoiceData.invoice, 'Step 6: Sale Invoice Generation', `Invoice: ${invoiceNumber}`);

  const inv = createInvoiceData.invoice;
  // Expected calculations:
  // HT: 15 000.000 DT
  // FODEC: 150.000 DT
  // TVA: 2 878.500 DT
  // Timbre: 1.000 DT
  // Total TTC: 18 029.500 DT
  // RS (1% on TTC): 180.295 DT
  assert(inv.subtotalHt === 15000, '   -> Subtotal HT exact', `${inv.subtotalHt} TND`);
  assert(inv.fodecAmount === 150, '   -> FODEC 1% exact', `${inv.fodecAmount} TND`);
  assert(inv.vatAmount === 2878.5, '   -> VAT 19% on (HT + FODEC) exact', `${inv.vatAmount} TND`);
  assert(inv.stampDuty === 1.0, '   -> Stamp duty 1.000 DT exact', `${inv.stampDuty} TND`);
  assert(inv.totalTtc === 18029.5, '   -> Total TTC exact', `${inv.totalTtc} TND`);
  assert(inv.withholdingTaxAmount === 180.295, '   -> Retenue à la source 1% exact', `${inv.withholdingTaxAmount} TND`);

  // 7. Verify Automated Double-Entry Accounting Entry (Journal VE)
  const entriesRes = await fetch(`${BASE_URL}/accounting/entries?journal=VE`, { headers: authHeaders });
  const entriesData = await entriesRes.json();
  const matchedEntry = entriesData.entries.find((e: any) => e.referenceNumber === invoiceNumber);
  assert(matchedEntry !== undefined, 'Step 7: Automated Double-Entry Voucher Generation in Journal VE');

  let debitSum = 0;
  let creditSum = 0;
  for (const l of matchedEntry.lines) {
    debitSum += l.debit;
    creditSum += l.credit;
  }
  debitSum = Math.round(debitSum * 1000) / 1000;
  creditSum = Math.round(creditSum * 1000) / 1000;
  assert(Math.abs(debitSum - creditSum) < 0.005, '   -> Double-Entry Balance Check (Débit = Crédit)', `Débit: ${debitSum} DT, Crédit: ${creditSum} DT`);

  // 8. Monthly Return (G50) Simulation
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const g50SimRes = await fetch(`${BASE_URL}/fiscal/g50/simulate?month=${currentMonth}&year=${currentYear}`, { headers: authHeaders });
  const g50SimData = await g50SimRes.json();
  assert(g50SimRes.ok && g50SimData.simulation, 'Step 8: Form G50 Monthly Tax Return Simulation');
  assert(g50SimData.simulation.vatCollectedTotal > 0, '   -> VAT collected aggregated from sales', `${g50SimData.simulation.vatCollectedTotal} TND`);
  assert(g50SimData.simulation.tclTotal > 0, '   -> Local Community Tax (TCL 0.2%) computed', `${g50SimData.simulation.tclTotal} TND`);
  assert(g50SimData.simulation.totalToPay > 0, '   -> Total General Payable to Treasury computed', `${g50SimData.simulation.totalToPay} TND`);

  // 9. Deposit / Save Form G50
  const saveG50Res = await fetch(`${BASE_URL}/fiscal/g50/save`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(g50SimData.simulation),
  });
  const saveG50Data = await saveG50Res.json();
  assert(saveG50Res.ok && saveG50Data.success, 'Step 9: Form G50 Filing & Database Persistence');

  // 10. Provisional Installments (AP)
  const apRes = await fetch(`${BASE_URL}/fiscal/ap?year=${currentYear}`, { headers: authHeaders });
  const apData = await apRes.json();
  assert(apRes.ok && apData.apList.length === 3, 'Step 10: Provisional Installments (AP1, AP2, AP3) Schedule', `${apData.apList.length} installments found`);
  
  const ap1 = apData.apList[0];
  assert(ap1.installmentGross30 === 3600, '   -> AP Gross is 30% of N-1 tax', `${ap1.installmentGross30} TND`);
  assert(ap1.withholdingDeducted > 0, '   -> Retenues à la source subies deducted from AP', `${ap1.withholdingDeducted} TND`);

  // Pay AP1
  const payApRes = await fetch(`${BASE_URL}/fiscal/ap/${ap1.id}/pay`, { method: 'POST', headers: authHeaders });
  const payApData = await payApRes.json();
  assert(payApRes.ok && payApData.ap.paymentStatus === 'PAID', '   -> AP1 payment marked as PAID');

  // 11. Employer Declaration & TEJ Platform Files Export
  const employerRes = await fetch(`${BASE_URL}/fiscal/employer?year=${currentYear}`, { headers: authHeaders });
  const employerData = await employerRes.json();
  assert(employerRes.ok && employerData.report, 'Step 11: Annual Employer Declaration DECEMP Generation');

  const tejDecempRes = await fetch(`${BASE_URL}/fiscal/employer/tej?year=${currentYear}&type=DECEMP`, { headers: authHeaders });
  const tejDecempText = await tejDecempRes.text();
  assert(tejDecempRes.ok && tejDecempText.startsWith('E01'), '   -> TEJ DECEMP.txt export file verified', `Header: ${tejDecempText.substring(0, 20)}...`);

  const tejAnxempRes = await fetch(`${BASE_URL}/fiscal/employer/tej?year=${currentYear}&type=ANXEMP`, { headers: authHeaders });
  const tejAnxempText = await tejAnxempRes.text();
  assert(tejAnxempRes.ok && tejAnxempText.startsWith('A02'), '   -> TEJ ANXEMP.txt export file verified', `Header: ${tejAnxempText.substring(0, 20)}...`);

  // 12. Financial Statements (NCT 01 Bilan & État de Résultat)
  const stmRes = await fetch(`${BASE_URL}/accounting/statements?year=${currentYear}`, { headers: authHeaders });
  const stmData = await stmRes.json();
  assert(stmRes.ok && stmData.statements, 'Step 12: NCT 01 Financial Statements Report Generation');
  assert(stmData.statements.balanceSheet.isBalanced, '   -> NCT 01 Bilan Equilibrium Check (Total Actif === Total Passif + Capitaux Propres)', `Total: ${stmData.statements.balanceSheet.assets.totalAssets.toFixed(3)} TND`);
  assert(stmData.statements.incomeStatement.operatingRevenues.total > 0, '   -> NCT 01 État de Résultat Net Revenues Check', `Total CA: ${stmData.statements.incomeStatement.operatingRevenues.total.toFixed(3)} TND`);

  // 13. Soft-Delete & Archive Restoration Workflow
  const deleteClientRes = await fetch(`${BASE_URL}/parties/${createdClientId}`, { method: 'DELETE', headers: authHeaders });
  assert(deleteClientRes.ok, 'Step 13: Soft Delete Party (Moves to Trash)');

  // Verify it no longer appears in active list
  const activeClientsRes = await fetch(`${BASE_URL}/parties?type=CLIENT`, { headers: authHeaders });
  const activeClientsData = await activeClientsRes.json();
  const stillActive = activeClientsData.parties.some((p: any) => p.id === createdClientId);
  assert(!stillActive, '   -> Client successfully filtered out from active list');

  // Verify it appears in Trash / Archive
  const archiveRes = await fetch(`${BASE_URL}/archive`, { headers: authHeaders });
  const archiveData = await archiveRes.json();
  const inArchive = archiveData.archive.parties.some((p: any) => p.id === createdClientId);
  assert(inArchive, '   -> Client visible in Archive / Trash');

  // Restore from Trash
  const restoreRes = await fetch(`${BASE_URL}/archive/restore`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ modelName: 'party', id: createdClientId }),
  });
  const restoreData = await restoreRes.json();
  assert(restoreRes.ok && restoreData.success, '   -> Client successfully restored from Trash');

  // Verify it reappears in active list
  const restoredClientsRes = await fetch(`${BASE_URL}/parties?type=CLIENT`, { headers: authHeaders });
  const restoredClientsData = await restoredClientsRes.json();
  const isBack = restoredClientsData.parties.some((p: any) => p.id === createdClientId);
  assert(isBack, '   -> Client confirmed active again after restoration');

  console.log('===============================================================');
  console.log('  🎉 ALL 13/13 END-TO-END SYSTEM INTEGRATION TESTS PASSED! 🎉');
  console.log('===============================================================');

  process.exit(0);
}

runLiveE2ETest().catch((err) => {
  console.error('Fatal E2E error:', err);
  process.exit(1);
});

