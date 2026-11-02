# FINANCE TUNISIE — Application de Comptabilité & Fiscalité Tunisienne (Loi 96-112)

Application professionnelle complète de gestion comptable, financière et fiscale pour entreprises, directeurs financiers et cabinets d'expertise comptable en Tunisie. Rigoureusement conforme au **Système Comptable des Entreprises (Loi n° 96-112 du 30 décembre 1996)**, aux **Normes Comptables Tunisiennes (NCT 01, NCT 05, NCT 08)** et à la **Législation Fiscale Tunisienne** (Code de l'IRPP et de l'IS, Code de la TVA, lois de finances et arrêtés de la DGI).

---

## 🚀 Stack Technologique (100% TypeScript)

- **Frontend** : **React 18+**, **TypeScript**, **Tailwind CSS** (design system affûté `rounded-sm`, mode sombre et clair natif).
- **Desktop (Windows)** : **Electron 45+** avec intégration native, menus système Windows et packaging **NSIS & Portable** via `electron-builder`.
- **Backend & API** : **Node.js** / **TypeScript**, **Express** avec architecture modulaire REST & RPC entièrement typée.
- **Base de Données & ORM** : **SQLite** avec **Prisma ORM**, migration automatique et client autonome optimisé pour Electron.
- **Visualisation 3D** : **Three.js** (onde interactive sur la mire d'authentification et sphère financière sur le tableau de bord).
- **Internationalisation (i18n)** : Commutation dynamique **Français / Anglais** sur l'ensemble de l'interface et des rapports financiers.
- **Règle Stricte TypeScript** : **ZÉRO TYPE `null`** sur l'ensemble du projet (utilisation stricte de `undefined`, propriétés optionnelles et valeurs de repli).

---

## 🇹🇳 Fonctionnalités & Conformité Légale Tunisienne

### 1. Système Comptable des Entreprises (SCE - Loi 96-112)
- **Plan Comptable Général Tunisien** complet préconfiguré (Classes 1 à 7 : Capitaux propres, Actifs non courants, Stocks, Comptes de tiers, Trésorerie, Charges, Produits).
- **Principe de la partie double** avec validation d'équilibre strict : $\sum \text{Débit} = \sum \text{Crédit}$.
- **Journaux divisionnaires normalisés** : Ventes (VE), Achats (AC), Banque (BQ), Caisse (CA), Opérations Diverses (OD).
- **Saisie au kilomètre & Grille comptable** : Saisie rapide avec auto-complétion des comptes et raccourcis clavier.
- **Rapports financiers annuels** :
  - **Bilan comptable** ($\text{Actif Total} = \text{Passif Total}$).
  - **État de Résultat** par nature.
  - **Grand Livre général** et **Balance générale des comptes à 6 colonnes**.

### 2. Facturation & Fiscalité Tunisienne
- **Format monétaire légal** : Dinar Tunisien (**TND**) avec **3 décimales obligatoires (Millimes)** et transcription automatique en toutes lettres.
- **Matricule Fiscal Tunisien (NIF / RNE)** : Validation syntaxique rigoureuse selon la clé officielle tunisienne : `[7 chiffres][Clé]/[Catégorie M/P]/[TVA A/B/N/P]/[Activité C/P]/[000]`.
- **Régimes & Taux de TVA légaux** : 19%, 13%, 7%, et 0% (Exportation / Régime suspensif).
- **FODEC (1%)** : Calcul automatique sur le montant HT des biens assujettis et intégration dans l'assiette de TVA.
- **Droit de Timbre Fiscal** : Imputation réglementaire (1,000 DT) sur les factures de vente assujetties.
- **Retenues à la Source (RS)** :
  - **5%** sur honoraires et commissions d'experts et prestataires.
  - **1% ou 1.5%** sur achats et marchés $\ge 1 000$ DT TTC.
  - **15% / 10%** sur loyers commerciaux et professionnels.

### 3. Déclarations Fiscales & Fichiers DGI
- **Déclaration Mensuelle (Bordereau G50 - Formulaire Officiel 2023)** :
  - Tableau I : Chiffre d'affaires imposable par taux, exportation et ventes suspensives.
  - Tableau II : TVA déductible sur immobilisations et autres biens et services, report du crédit de TVA antérieur.
  - Tableau III : Droit de timbre, FODEC (1%), et Taxe sur les Établissements (TCL 0.2%).
  - Tableau IV : Retenues à la source opérées (Traitements et salaires, honoraires 5%, loyers 15%, achats 1%).
  - Tableau V : Taxes sur salaires (TFP 1% ou 2%, FOPROLOS 1%).
  - Mode "Déclaration Néant" pour les mois sans activité.
- **Acomptes Provisionnels (AP1, AP2, AP3)** :
  - Calcul de l'acompte (30% de l'impôt N-1).
  - Déduction des retenues subies et crédits antérieurs.
  - Suivi des échéances légales (Juin, Septembre, Décembre).
- **Déclaration de l'Employeur & Fichiers TEJ** :
  - Génération conforme au cahier des charges DGI pour la télé-déclaration sur le portail officiel **TEJ**.

### 4. Gouvernance, RBAC & Multi-Tenant
- **Isolation Multi-Société (Multi-Tenant)** : Cloisonnement strict des données de chaque société par identifiant de tenant.
- **Gestion des Rôles & Permissions Granulaires** :
  - Profils prédéfinis : `SUPERADMIN`, `ADMIN`, `ACCOUNTANT` (Expert comptable), `COMMERCIAL` (Gestion commerciale).
  - Matrice d'habilitation avec permissions unitaires par action (accès restreint à la G50, clôtures, balance et grand livre pour les non-comptables).
- **Soft Deletes Universel & Corbeille** : Traçabilité des suppressions logiques avec restauration instantanée.

---

## 💻 Installation & Démarrage

### 1. Prérequis
- **Node.js** (v20+ ou v22+ LTS)
- **npm** (v10+)

### 2. Cloner et Installer les Dépendances
```bash
git clone https://github.com/saryXXX/compta_1.0.git
cd compta_1.0
npm install
```

### 3. Initialiser la Base de Données
```bash
# Générer le client Prisma
npm run prisma:generate

# Créer les tables SQLite
npm run prisma:push

# Charger le Plan Comptable Général Tunisien et le compte administrateur initial
npm run prisma:seed
```

### 4. Lancer en Mode Développement (Navigateur)
```bash
# Terminal 1 : Serveur Backend API (Port 3001)
npm run server

# Terminal 2 : Interface Frontend Vite (Port 5173)
npm run dev
```
Accès à l'application web : **`http://localhost:5173`**

### 5. Identifiants par Défaut (Compte Administrateur Démo)
- **Nom d'utilisateur** : `admin`
- **Mot de passe** : `admin123`
- **Société par défaut** : `STE TUNISIENNE DE COMMERCE ET SERVICES (STCS) SARL` (MF: `1485962B/A/M/000`)

---

## 🖥️ Version Bureau Windows (Electron)

L'application peut être exécutée ou distribuée sous forme d'application de bureau native Windows.

### Lancer l'Application Bureau en Développement
```bash
npm run desktop
```

### Compiler les Exécutables & l'Installeur Windows
```bash
npm run build:desktop
```
Cette commande génère automatiquement dans le dossier `dist-electron/` :
1. **`FinanceTunisie-Setup-1.0.0.exe`** : Installeur officiel Windows (NSIS) avec raccourcis Bureau et Menu Démarrer.
2. **`FinanceTunisie-Portable.exe`** : Exécutable autonome sans installation (idéal pour clé USB).
3. **`win-unpacked/Finance Tunisie.exe`** : Binaire décompressé prêt à l'emploi.

> **Persistance des Données** : Dans la version installée, la base SQLite est stockée dans `%APPDATA%\Finance Tunisie\database\finance-tunisie.db`. Les mises à jour ou réinstallations ne suppriment jamais les données financières de vos dossiers.

---

## 🧪 Tests de Qualité & Conformité

```bash
# 1. Vérification statique stricte "Zéro Type Null"
npm run test:no-null

# 2. Tests de calculs comptables et fiscaux (TVA, Timbre, RS, G50, AP, TEJ)
npm test
```

---

## 📂 Structure du Projet

```text
comptabilité/
├── assets/                  # Icônes et logos de l'application
├── electron/                # Processus principal et preload Electron
│   ├── main.cjs             # Gestionnaire de cycle de vie et persistance SQLite
│   └── preload.cjs          # Pont contextBridge sécurisé
├── prisma/
│   ├── schema.prisma        # Schéma ORM et modèles de données
│   └── seed.ts              # Seeder du Plan Comptable Tunisien (SCE)
├── server/                  # API Backend Express & Moteurs de calcul
│   ├── index.ts             # Point d'entrée du serveur HTTP/REST
│   ├── db.ts                # Client Prisma et utilitaires soft delete
│   ├── rbac.ts              # Matrice de contrôle d'accès basé sur les rôles
│   ├── routes/              # Routeurs REST (comptabilité, fiscalité, clôture, etc.)
│   └── services/            # Moteurs métier (TVA, G50, AP, amortissements, TEJ)
├── src/                     # Interface Utilisateur React 18
│   ├── components/          # Composants réutilisables (UI, Layout, Three.js 3D)
│   ├── context/             # Contextes React (Auth, i18n, Thème, Navigation)
│   ├── i18n/                # Dictionnaires bilingues (FR / EN)
│   ├── pages/               # Écrans fonctionnels et modules comptables
│   └── types/               # Définitions TypeScript strictes
├── tests/                   # Suites de tests automatisés (audit no-null, RBAC, etc.)
├── electron-builder.json    # Configuration de packaging Windows NSIS / Portable
└── package.json             # Scripts et dépendances du projet
```

---

## ⚖️ Licence & Conformité

Développé dans le respect strict des textes de loi tunisiens régissant la profession comptable et les obligations fiscales des personnes physiques et morales soumises au régime réel.
