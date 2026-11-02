/**
 * Database Seeder for Tunisian Accounting Application.
 * Populates:
 * 1. Tunisian Chart of Accounts (SCE - Loi 96-112)
 * 2. Default Tenant: "STE TUNISIENNE DE COMMERCE ET SERVICES (STCS) SARL"
 * 3. Default Admin user: admin / admin123
 * 4. Sample Tunisian Clients & Suppliers
 * 5. Sample Invoices (Sales with 19% TVA + 1% FODEC + 1 DT Timbre, Purchases with 5% RS)
 * 6. Accounting Entries (Journal des Ventes, Journal des Achats)
 * 
 * STRICT COMPLIANCE: NO TYPE NULL USED ANYWHERE.
 */

import { PrismaClient } from './client/index.js';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string, saltInput?: string): { hash: string; salt: string } {
  const salt = saltInput !== undefined ? saltInput : crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return { hash, salt };
}

// Plan Comptable Général Tunisien (Classes 1 à 7)
const DEFAULT_ACCOUNTS = [
  // Classe 1
  { code: '101000', name: 'Capital social', category: 'CLASSE_1' },
  { code: '111000', name: 'Réserve légale', category: 'CLASSE_1' },
  { code: '118000', name: 'Autres réserves', category: 'CLASSE_1' },
  { code: '121000', name: 'Report à nouveau créditeur', category: 'CLASSE_1' },
  { code: '129000', name: 'Report à nouveau débiteur', category: 'CLASSE_1' },
  { code: '131000', name: "Résultat net de l'exercice - Bénéfice", category: 'CLASSE_1' },
  { code: '139000', name: "Résultat net de l'exercice - Perte", category: 'CLASSE_1' },
  { code: '162000', name: 'Emprunts auprès des établissements de crédit', category: 'CLASSE_1' },

  // Classe 2
  { code: '213000', name: 'Logiciels informatiques et assimilés', category: 'CLASSE_2' },
  { code: '222000', name: 'Constructions et aménagements', category: 'CLASSE_2' },
  { code: '223000', name: 'Installations techniques, matériel et outillage', category: 'CLASSE_2' },
  { code: '224000', name: 'Matériel de transport', category: 'CLASSE_2' },
  { code: '228000', name: 'Matériel de bureau et matériel informatique', category: 'CLASSE_2' },
  { code: '281300', name: 'Amortissements des logiciels', category: 'CLASSE_2' },
  { code: '282200', name: 'Amortissements des constructions', category: 'CLASSE_2' },
  { code: '282400', name: 'Amortissements du matériel de transport', category: 'CLASSE_2' },
  { code: '282800', name: 'Amortissements du matériel informatique', category: 'CLASSE_2' },

  // Classe 3
  { code: '311000', name: 'Matières premières', category: 'CLASSE_3' },
  { code: '355000', name: 'Produits finis', category: 'CLASSE_3' },
  { code: '371000', name: 'Marchandises en magasin', category: 'CLASSE_3' },

  // Classe 4
  { code: '401100', name: "Fournisseurs d'exploitation", category: 'CLASSE_4' },
  { code: '404100', name: "Fournisseurs d'immobilisations", category: 'CLASSE_4' },
  { code: '411100', name: 'Clients ordinaires', category: 'CLASSE_4' },
  { code: '416000', name: 'Clients douteux ou litigieux', category: 'CLASSE_4' },
  { code: '421000', name: 'Personnel - Rémunérations dues', category: 'CLASSE_4' },
  { code: '425000', name: 'Personnel - Avances et acomptes', category: 'CLASSE_4' },
  { code: '432100', name: 'État - TCL (Taxe sur les collectivités locales)', category: 'CLASSE_4' },
  { code: '432200', name: 'État - Droit de timbre fiscal', category: 'CLASSE_4' },
  { code: '432300', name: 'État - FODEC collecté', category: 'CLASSE_4' },
  { code: '434100', name: 'État - Retenues à la source sur salaires (IRPP)', category: 'CLASSE_4' },
  { code: '434200', name: 'État - Retenues à la source sur honoraires', category: 'CLASSE_4' },
  { code: '434300', name: 'État - Retenues à la source sur loyers', category: 'CLASSE_4' },
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
  { code: '441000', name: 'Associés - Comptes courants', category: 'CLASSE_4' },

  // Classe 5
  { code: '512100', name: 'Banque - Compte courant principal', category: 'CLASSE_5' },
  { code: '532100', name: 'Caisse centrale', category: 'CLASSE_5' },
  { code: '581000', name: 'Virements internes de fonds', category: 'CLASSE_5' },

  // Classe 6
  { code: '607000', name: 'Achats de marchandises', category: 'CLASSE_6' },
  { code: '606100', name: 'Fournitures non stockables (STEG)', category: 'CLASSE_6' },
  { code: '613200', name: 'Locations immobilières', category: 'CLASSE_6' },
  { code: '615000', name: 'Entretien et réparations', category: 'CLASSE_6' },
  { code: '616000', name: "Primes d'assurances", category: 'CLASSE_6' },
  { code: '622600', name: "Honoraires d'experts et conseils juridiques", category: 'CLASSE_6' },
  { code: '623000', name: 'Publicité et publications', category: 'CLASSE_6' },
  { code: '626000', name: 'Frais postaux et de télécommunications', category: 'CLASSE_6' },
  { code: '627000', name: 'Services bancaires et assimilés', category: 'CLASSE_6' },
  { code: '631000', name: 'Rémunérations du personnel (Salaires bruts)', category: 'CLASSE_6' },
  { code: '632000', name: 'Cotisations sociales patronales (CNSS)', category: 'CLASSE_6' },
  { code: '633100', name: 'TFP (Taxe de Formation Professionnelle)', category: 'CLASSE_6' },
  { code: '633200', name: 'FOPROLOS (Logements sociaux)', category: 'CLASSE_6' },
  { code: '641000', name: 'TCL (Taxe sur les collectivités locales)', category: 'CLASSE_6' },
  { code: '645000', name: "Droits d'enregistrement et de timbre", category: 'CLASSE_6' },
  { code: '661000', name: "Charges d'intérêts bancaires", category: 'CLASSE_6' },
  { code: '681100', name: 'Dotations aux amortissements des immobilisations', category: 'CLASSE_6' },
  { code: '691000', name: 'Impôt sur les sociétés (IS)', category: 'CLASSE_6' },

  // Classe 7
  { code: '706000', name: 'Prestations de services et études', category: 'CLASSE_7' },
  { code: '707000', name: 'Ventes de marchandises', category: 'CLASSE_7' },
  { code: '755000', name: 'Gains exceptionnels sur opérations de gestion', category: 'CLASSE_7' },
  { code: '764000', name: 'Revenus des placements et intérêts bancaires', category: 'CLASSE_7' },
];

async function main() {
  console.log('Seeding Tunisian Accounting Database...');

  // 1. Create or Find Tenant
  let tenant = await prisma.tenant.findFirst();
  if (tenant) {
    console.log(`Tenant already exists: ${tenant.name} (${tenant.id})`);
    return;
  }

  tenant = await prisma.tenant.create({
    data: {
      name: 'STE TUNISIENNE DE COMMERCE ET SERVICES (STCS) SARL',
      taxId: '1485962B/A/M/000',
      tradeRegister: 'B0145892023',
      vatRegime: 'ASSUJETTI_TOTAL',
      address: '12 Avenue Habib Bourguiba, Centre Ville',
      city: 'Tunis',
      phone: '+216 71 850 120',
      email: 'contact@stcs-tunisie.tn',
      currency: 'TND',
    },
  });
  console.log(`Created Tenant: ${tenant.name}`);

  // 2. Create Administrator User
  const { hash, salt } = hashPassword('admin123');
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username: 'admin',
      passwordHash: hash,
      salt: salt,
      fullName: 'Mohamed Ben Salah (Expert Comptable)',
      role: 'ADMIN',
    },
  });
  console.log(`Created User: ${user.username} (admin / admin123)`);

  // 3. Create Chart of Accounts
  for (const acc of DEFAULT_ACCOUNTS) {
    await prisma.account.create({
      data: {
        tenantId: tenant.id,
        accountCode: acc.code,
        accountName: acc.name,
        accountCategory: acc.category,
      },
    });
  }
  console.log(`Inserted ${DEFAULT_ACCOUNTS.length} Tunisian accounting accounts.`);

  // 4. Create Sample Clients
  const client1 = await prisma.party.create({
    data: {
      tenantId: tenant.id,
      partyType: 'CLIENT',
      name: 'STE CARTHAGE DISTRIBUTION SA',
      taxId: '1298450A/A/M/000',
      rneNumber: 'B0298452020',
      vatStatus: 'ASSUJETTI',
      address: 'Zone Industrielle Charguia II',
      city: 'Tunis',
      phone: '+216 71 770 000',
      email: 'achats@carthage-distrib.tn',
      defaultWithholdingRate: 1.0,
      accountCode: '411100',
      balance: 11899.8,
    },
  });

  const client2 = await prisma.party.create({
    data: {
      tenantId: tenant.id,
      partyType: 'CLIENT',
      name: 'POLYCLINIQUE INTERNATIONALE EL MANAR',
      taxId: '0845123P/A/M/000',
      rneNumber: 'B0845122019',
      vatStatus: 'ASSUJETTI',
      address: 'Avenue Tahar Ben Ammar, El Manar 2',
      city: 'Tunis',
      phone: '+216 71 885 000',
      email: 'finance@elmanar-clinic.tn',
      defaultWithholdingRate: 0.0,
      accountCode: '411100',
      balance: 0.0,
    },
  });

  // 5. Create Sample Suppliers
  const supplier1 = await prisma.party.create({
    data: {
      tenantId: tenant.id,
      partyType: 'SUPPLIER',
      name: "STE TUNISIENNE D'ELECTRICITE ET DU GAZ (STEG)",
      taxId: '0000045B/A/M/000',
      rneNumber: 'B0000041962',
      vatStatus: 'ASSUJETTI',
      address: '38 Rue Kémal Ataturk',
      city: 'Tunis',
      phone: '+216 71 341 311',
      email: 'facturation@steg.com.tn',
      defaultWithholdingRate: 0.0,
      accountCode: '401100',
      balance: 0.0,
    },
  });

  const supplier2 = await prisma.party.create({
    data: {
      tenantId: tenant.id,
      partyType: 'SUPPLIER',
      name: 'CABINET AUDIT & EXPERTISE MAZARS TUNISIE',
      taxId: '0458921K/A/M/000',
      rneNumber: 'B0458922015',
      vatStatus: 'ASSUJETTI',
      address: 'Les Berges du Lac 2',
      city: 'Tunis',
      phone: '+216 71 190 200',
      email: 'contact@mazars.tn',
      defaultWithholdingRate: 5.0, // 5% RS sur honoraires
      accountCode: '401100',
      balance: 2281.0,
    },
  });

  const todayStr = new Date().toISOString().split('T')[0] as string;

  // 6. Sample Sale Invoice
  // 10 000 TND HT + 1% FODEC (100) + 19% TVA (1 919) + 1.000 DT Timbre = 12 020.000 TND TTC
  // Retenue 1% subie = 120.200 TND
  const invoiceSale = await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      invoiceType: 'SALE',
      invoiceNumber: 'FAC-2026-001',
      partyId: client1.id,
      invoiceDate: todayStr,
      dueDate: todayStr,
      subtotalHt: 10000.0,
      fodecAmount: 100.0,
      vatAmount: 1919.0,
      stampDuty: 1.0,
      withholdingTaxAmount: 120.2,
      totalTtc: 12020.0,
      status: 'VALIDATED',
      notes: 'Matériel informatique et prestations réseaux certifiées',
      items: {
        create: [
          {
            description: 'Serveur professionnel et équipements d’infrastructure',
            quantity: 1.0,
            unitPriceHt: 10000.0,
            fodecRate: 1.0,
            fodecAmount: 100.0,
            vatRate: 19.0,
            vatAmount: 1919.0,
            totalHt: 10000.0,
            totalTtc: 12020.0,
          },
        ],
      },
    },
  });

  // Accounting Entry for Sale Invoice (Journal VE)
  const entrySale = await prisma.accountingEntry.create({
    data: {
      tenantId: tenant.id,
      journalCode: 'VE',
      entryDate: todayStr,
      referenceNumber: 'FAC-2026-001',
      description: 'Facture vente STE CARTHAGE DISTRIBUTION',
      invoiceId: invoiceSale.id,
      lines: {
        create: [
          { accountCode: '411100', debit: 11899.8, credit: 0.0, description: 'Client Carthage Distrib net à encaisser' },
          { accountCode: '434800', debit: 120.2, credit: 0.0, description: 'Retenue à la source 1% subie' },
          { accountCode: '707000', debit: 0.0, credit: 10000.0, description: 'Ventes de marchandises HT' },
          { accountCode: '432300', debit: 0.0, credit: 100.0, description: 'FODEC 1% collecté' },
          { accountCode: '436710', debit: 0.0, credit: 1919.0, description: 'TVA collectée 19%' },
          { accountCode: '432200', debit: 0.0, credit: 1.0, description: 'Droit de timbre fiscal sur facture' },
        ],
      },
    },
  });

  // 7. Sample Purchase Invoice
  // 2 000 TND HT + 19% TVA (380) + 1.000 DT Timbre = 2 381.000 TND TTC, RS 5% = 100 TND
  const invoicePur = await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      invoiceType: 'PURCHASE',
      invoiceNumber: 'ACH-2026-0042',
      partyId: supplier2.id,
      invoiceDate: todayStr,
      dueDate: todayStr,
      subtotalHt: 2000.0,
      fodecAmount: 0.0,
      vatAmount: 380.0,
      stampDuty: 1.0,
      withholdingTaxAmount: 100.0,
      totalTtc: 2381.0,
      status: 'VALIDATED',
      notes: 'Honoraires audit contractuel et assistance fiscale',
      items: {
        create: [
          {
            description: 'Audit financier légal et revue des comptes',
            quantity: 1.0,
            unitPriceHt: 2000.0,
            vatRate: 19.0,
            vatAmount: 380.0,
            totalHt: 2000.0,
            totalTtc: 2381.0,
          },
        ],
      },
    },
  });

  // Accounting Entry for Purchase Invoice (Journal AC)
  await prisma.accountingEntry.create({
    data: {
      tenantId: tenant.id,
      journalCode: 'AC',
      entryDate: todayStr,
      referenceNumber: 'ACH-2026-0042',
      description: 'Facture Mazars Tunisie - Audit',
      invoiceId: invoicePur.id,
      lines: {
        create: [
          { accountCode: '622600', debit: 2000.0, credit: 0.0, description: 'Honoraires comptables et fiscaux HT' },
          { accountCode: '436620', debit: 380.0, credit: 0.0, description: 'TVA déductible sur services 19%' },
          { accountCode: '645000', debit: 1.0, credit: 0.0, description: 'Droit de timbre fiscal payé' },
          { accountCode: '401100', debit: 0.0, credit: 2281.0, description: 'Fournisseur Mazars net à payer' },
          { accountCode: '434200', debit: 0.0, credit: 100.0, description: 'Retenue à la source 5% opérée sur honoraires' },
        ],
      },
    },
  });

  // 8. Sample Provisional Payments (AP1, AP2, AP3)
  const currentYear = new Date().getFullYear();
  const baseTax = 12000.0;
  const ap30 = baseTax * 0.3; // 3600 TND

  const apSchedule = [
    { num: 1, due: `${currentYear}-06-25`, ded: 120.2 },
    { num: 2, due: `${currentYear}-09-25`, ded: 0.0 },
    { num: 3, due: `${currentYear}-12-25`, ded: 0.0 },
  ];

  for (const ap of apSchedule) {
    const net = Math.max(0.0, ap30 - ap.ded);
    await prisma.provisionalPaymentAP.create({
      data: {
        tenantId: tenant.id,
        year: currentYear,
        installmentNumber: ap.num,
        previousYearTaxBase: baseTax,
        installmentGross30: ap30,
        withholdingDeducted: ap.ded,
        priorCreditsDeducted: 0.0,
        netPayable: net,
        dueDate: ap.due,
        paymentStatus: 'PENDING',
        notes: `Acompte provisionnel AP${ap.num} calculé selon l'art. 51 du Code IRPP/IS`,
      },
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

