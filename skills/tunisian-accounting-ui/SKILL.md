---
name: tunisian-accounting-ui
description: UI/UX design system, color palette, orthography, and interaction craft rules for Tunisian accounting applications (SCE Loi 96-112). Enforces dense, keyboard-first, accountant-grade aesthetics without AI slop.
license: MIT
metadata:
  author: Antigravity
  version: "1.0.0"
---

# Système de Design UI/UX : Finance Tunisie
## Guide de Style & Architecture Visuelle pour Logiciel Comptable de Haute Précision
*Conforme au Système Comptable des Entreprises (Loi 96-112) et aux Normes Comptables Tunisiennes (NCT 01 à 08)*

---

## 1. Philosophie de Design & Diagnostic Anti-Slop

### Le Constat : Rejet des Clichés "AI-Generated"
Les interfaces générées par IA souffrent généralement de 5 défauts majeurs qui détruisent la crédibilité auprès d'un expert-comptable ou d'un directeur financier :
1. **Éparpillement chromatique de jouet** : Des badges violets, roses bonbon, bleus ciel et vert fluo répartis sans logique financière.
2. **Perte d'espace et rembourrage excessif** : D'immenses cartes avec des espacements de 40px ne montrant que 3 lignes d'information, alors qu'un comptable a besoin de voir 20 écritures par écran pour réviser un compte.
3. **Gadgets décoratifs hors-sujet** : Bannières démesurées, globes 3D tournoyants en plein milieu d'un écran de saisie de factures.
4. **Typographie molle et non tabulaire** : Chiffres non alignés verticalement, décimales en décalage, absence de distinction visuelle entre la partie entière et les 3 décimales de millimes.
5. **Absence d'ergonomie clavier** : Obligation d'utiliser la souris pour chaque action au lieu d'enchaîner `Tab`, `Entrée`, `[N]`, `[Équilibrer]`.

### La Vision : Le Poste de Travail du Comptable Moderne
L'interface de **Finance Tunisie** doit évoquer la rigueur, la densité et la vitesse des meilleurs logiciels professionnels mondiaux (**Linear**, **Bloomberg**, **Stripe Dashboard**, **Pennylane**), imprégnée de l'identité institutionnelle tunisienne (rouge carmin régalien, sable chaud, papier parchemin et ardoise sombre).

```
[Précision Numérique] ──────> 3 décimales (Millimes), chiffres tabulaires, polices JetBrains Mono
[Contraste Institutionnel] ──> Slate graphite, bordures d'1px, accent Carmin Tunisien (#B91C1C)
[Ergonomie Comptable] ──────> Navigation rapide, filtres par exercice, contrôle visuel Débit = Crédit
```

---

## 2. Palette de Couleurs & Tokens Sémantiques

La palette est strictement cadrée. Tout usage de dégradés multicolores ou d'accents violets/néon est interdit.

### 2.1. Les Neutres (L'encre et le papier)
| Token | Valeur Light | Valeur Dark | Rôle / Usage |
|---|---|---|---|
| `--surface-canvas` | `#F8FAFC` (Slate 50) | `#090D16` (Obsidian) | Fond d'écran global de l'application |
| `--surface-card` | `#FFFFFF` (White) | `#0F172A` (Slate 900) | Cartes de travail, panneaux, formulaires |
| `--surface-subtle` | `#F1F5F9` (Slate 100) | `#1E293B` (Slate 800) | En-têtes de tableaux, lignes alternées zebra |
| `--surface-border` | `#E2E8F0` (Slate 200) | `#334155` (Slate 700) | Séparateurs nets d'1px |
| `--text-primary` | `#0F172A` (Slate 900) | `#F8FAFC` (Slate 50) | Chiffres financiers, titres, soldes |
| `--text-secondary` | `#475569` (Slate 600) | `#94A3B8` (Slate 400) | Libellés, libellés de lignes, comptes généraux |
| `--text-muted` | `#94A3B8` (Slate 400) | `#64748B` (Slate 500) | Millimes décimaux, métadonnées, mentions légales |

### 2.2. Les Accents Identitaires Tunisiens
| Token | Code Hex | Nuance | Usage |
|---|---|---|---|
| `--tn-carmin-primary` | `#B91C1C` (Red 700) | Carmin officiel régalien | Boutons primaires, bordures actives, TVA |
| `--tn-carmin-hover` | `#991B1B` (Red 800) | Carmin foncé | État hover des boutons primaires |
| `--tn-carmin-subtle` | `#FEF2F2` (Red 50) | Teinte carmin très douce | Badges TVA, alertes déséquilibre |
| `--tn-gold-primary` | `#B45309` (Amber 700) | Or ancien / Bronze fiscal | Indicateur Espace Expert-Comptable / DAF |
| `--tn-gold-subtle` | `#FFFBEB` (Amber 50) | Teinte ambrée douce | Droit de timbre, alertes échéances fiscales |

### 2.3. Sémantique Financière & Polarités Comptables
En comptabilité, la couleur n'est pas décorative ; elle porte un sens juridique :
- **Vert Forêt / Émeraude (`#047857` / `#065F46`)** :
  - Écritures strictement équilibrées ($\text{Diff} = 0$).
  - Produits d'exploitation (Classe 7), Ventes, Encaissements.
  - Déclarations fiscales `VALIDÉES` ou `PAYÉES`.
- **Rouge Rubis / Carmin (`#BE123C` / `#B91C1C`)** :
  - Écritures déséquilibrées (Attention requise immédiate).
  - Charges d'exploitation (Classe 6), Achats, Dettes fiscales dues au Trésor.
  - Retenues à la source opérées.
- **Bleu Acier (`#0369A1` / `#0284C7`)** :
  - Créances clients, opérations de trésorerie bancaire (Compte 512100).
  - Norme NCT 01 / Rapports bilanciels.

---

## 3. Typographie, Échelle & Orthographe Comptable

### 3.1. Règles Typographiques
1. **Titres & Interface** : `Plus Jakarta Sans`
   - Poids autorisés : `400` (Regular), `500` (Medium), `600` (Semibold), `700` (Bold), `800` (ExtraBold).
2. **Données Chiffrées & Numéros de Compte** : `JetBrains Mono`
   - **Règle absolue** : Toujours avec `font-variant-numeric: tabular-nums;`.
   - Les chiffres s'alignent au pixel près d'une ligne à l'autre.
   - Les colonnes numériques dans les tableaux doivent être impérativement **alignées à droite** (`text-right`).

### 3.2. Formatage des Montants en Dinar Tunisien (TND)
Le Dinar Tunisien possède 3 décimales (1 Dinar = 1 000 Millimes). La convention visuelle retenue pour le logiciel :
$$\mathbf{14\ 850}\text{,}\mathbf{750}\text{ TND}$$
- **Partie entière** : Gras, séparateur de milliers par une espace fine insécable.
- **Virgule décimale** : `text-slate-400`.
- **Partie décimale (Millimes)** : 3 chiffres obligatoires, opacité `80%` ou couleur légèrement atténuée pour détacher immédiatement les dinars des millimes.
- **Unité** : Mention `DT` ou `TND` en taille réduite (`text-[10px] font-bold text-slate-400 uppercase ml-1`).

### 3.3. Dictionnaire Orthographique et Termes Réglementaires
| Terme Requis (Conforme) | Terme Banni (Slop/Imprécis) | Contexte Légal |
|---|---|---|
| **Matricule Fiscal** | ID Taxe, Numéro TVA | Format officiel : `7 chiffres + lettre clé + code TVA + catégorie + numéro d'établissement` |
| **Bordereau G50** | Formulaire TVA | Déclaration mensuelle unique des impôts directs et indirects |
| **Acomptes Provisionnels (AP)** | Paiements d'avance | 3 acomptes légaux de 30% chacun (Art. 51 code IRPP/IS) |
| **FODEC** | Taxe industrielle | Fonds de Développement de la Compétitivité Industrielle (1%) |
| **Droit de Timbre** | Timbre postal | 1.000 DT par facture de vente émise |
| **Retenue à la Source (RS)** | Retenue d'impôt | Taux légaux : 1%, 1.5%, 3%, 5%, 15% |
| **Bilan (NCT 01)** | Bilan comptable générique | Présentation officielle : Actifs Non Courants / Courants vs Passifs & Capitaux |
| **Journal des À-Nouveaux (AN)** | Report à nouveau | Écriture solennelle d'ouverture au 01/01/(N+1) |
| **Liasse Fiscale (IS)** | Déclaration fiscale annuelle | Tableau de passage du résultat comptable avant impôt au résultat fiscal |

---

## 4. Composants & Architecture Visuelle

### 4.1. Navigation Duale : Mode Entreprise vs Mode Cabinet Comptable
Un sélecteur clair en haut du menu latéral permet à l'utilisateur de basculer instantanément de posture mentale :
1. **Mode Gestion Commerciale** :
   - Facturation clients (Ventes), Factures fournisseurs (Achats), Reçus, Suivi des encaissements.
2. **Mode Cabinet / Direction Financière (DAF)** :
   - Saisie directe au kilomètre (Journaux VE, AC, BQ, CA, OD, AN).
   - Paie tunisienne & charges patronales (CNSS, IRPP, CSS, TFP, FOPROLOS).
   - Registre des immobilisations et tableau d'amortissement NCT 05.
   - Rapprochement bancaire et état officiel d'apurement.
   - Liasse fiscale et clôture annuelle solennelle.

### 4.2. Grille de Saisie au Kilomètre (Le cœur de métier)
Pour un comptable, la saisie au kilomètre doit être la fonctionnalité la plus rapide du logiciel :
- **Navigation au clavier** : `Tab` passe de Compte $\to$ Libellé $\to$ Débit $\to$ Crédit $\to$ Ligne suivante.
- **Auto-effacement inverse** : La saisie d'un montant au Débit vide automatiquement le champ Crédit de la même ligne, et vice-versa.
- **Bannière d'équilibre vivante** :
  - Vert intense (`bg-emerald-50 text-emerald-800 border-emerald-300`) si $\text{Débit} = \text{Crédit}$.
  - Rouge écarlate (`bg-rose-50 text-rose-800 border-rose-300`) affichant l'écart exact au millime près.
- **Bouton d'équilibrage magique (`Équilibrer l'écart`)** :
  - D'un seul clic ou raccourci, calcule $\text{Diff} = |\sum D - \sum C|$ et remplit la contrepartie exacte sur la dernière ligne.

### 4.3. Tableaux Financiers Haute Densité
- Hauteur de ligne réduite (`py-2.5 px-3`).
- En-têtes fixes (`sticky top-0`) avec fond légèrement teinté (`bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm`).
- Lignes alternées avec survol précis (`hover:bg-slate-100/60 dark:hover:bg-slate-800/50`).
- Codes comptables mis en évidence sous forme de puces (`font-mono text-slate-500 font-bold`).

### 4.4. Barre d'État Financière Globale (Status Bar)
En pied d'écran ou en en-tête permanent :
- **Dossier Actif** : Nom de la société + Matricule fiscal complet.
- **Exercice Comptable** : ex. `Exercice 2026 (Ouvert)` ou `Exercice 2025 (Clôturé)`.
- **Régime Fiscal** : `Assujetti Total TVA • IS 15%`.
- **Indicateur d'Équilibre Global** : `Balance Générale : 0.000 DT d'écart`.

---

## 5. Règle Stricte de Qualité Technique : "Zéro Type Null"

Dans tout le code TypeScript lié à l'interface graphique :
- **INTERDIT** : `: null`, `| null`, `null |`, `<null>`, `as null`, `null as`.
- **OBLIGATOIRE** : Utiliser `undefined`, des propriétés optionnelles (`?`), ou des valeurs de repli explicites (`""`, `0`, `[]`).
- La validation s'effectue systématiquement avec le script d'analyse statique `tests/no-null-check.ts`.

