# Réforme du questionnaire — Modes Quadrimoji & Questions ouvertes

**Date :** 2026-04-19
**Statut :** Design validé, en attente de plan d'implémentation
**Contexte projet :** QualiMoji (Laravel 11 + React/TypeScript), déploiement BGFI Bank Gabon

---

## 1. Objectif

Permettre à chaque agence (ou par défaut à l'organisation) de choisir entre deux modes de collecte de feedback après la sélection du smiley initial :

- **Quadrimoji** (mode historique) : question de suivi conditionnelle au sentiment, avec options cliquables prédéfinies et texte libre optionnel.
- **Questions ouvertes** (nouveau mode) : liste commune de questions — indépendante du sentiment — avec réponses typées (texte court/long, note 1-5, note 1-10, choix unique/multiple).

Le smiley initial reste toujours affiché dans les deux modes.

## 2. Règles fonctionnelles

### 2.1 Hiérarchie de configuration

- **Mode par défaut** défini au niveau de l'organisation.
- **Surcharge possible** au niveau de chaque agence (ou héritage de l'org si non défini).

### 2.2 Permissions

| Action | Admin | Directeur de Zone | Directeur d'Agence |
|---|---|---|---|
| Changer le mode de l'organisation | ✅ | ✅ | ❌ |
| Surcharger le mode d'une agence | ✅ | ✅ (ses agences) | ✅ (son agence) |
| Éditer le contenu des questions (org) | ✅ | ✅ | ❌ |
| Éditer le contenu des questions (agence) | ✅ | ✅ (ses agences) | ✅ (son agence) |

### 2.3 Mode Quadrimoji (inchangé)

- 4 sentiments par défaut (`very_happy, happy, unhappy, very_unhappy`), personnalisables.
- Chaque sentiment a sa propre question de suivi avec 2 à 6 options cliquables + texte libre optionnel.

### 2.4 Mode Questions ouvertes (nouveau)

- **1 à 10 questions** dans l'ordre `sort_order`.
- **Types supportés** :
  - `short_text` — champ `<Input>` max 100 chars
  - `long_text` — `<Textarea>` max 500 chars
  - `rating_1_5` — 5 boutons/étoiles
  - `rating_1_10` — 10 boutons horizontaux
  - `single_choice` — une seule option sélectionnable
  - `multi_choice` — plusieurs options sélectionnables
- **Toggle `is_required`** par question.
- **Indépendance du sentiment** : la liste est la même quel que soit le smiley choisi.

### 2.5 Transition entre modes

- Les organisations existantes conservent leur mode courant (`quadrimoji`) sans action requise.
- Un changement de mode déclenche une AlertDialog : « conserver la config de l'ancien mode » (restaurable au retour) ou « la supprimer définitivement ».
- Les feedbacks déjà collectés sont immuables ; chaque ligne porte le mode utilisé au moment de la collecte pour l'exploitation en rapport.

## 3. Modèle de données

### 3.1 Colonnes ajoutées

**`organizations`**
```
questionnaire_mode  ENUM('quadrimoji','open')  DEFAULT 'quadrimoji'  NOT NULL
```

**`branches`**
```
questionnaire_mode  ENUM('quadrimoji','open')  NULLABLE
```
`NULL` = héritage de `organizations.questionnaire_mode`.

**`feedbacks`**
```
questionnaire_mode  ENUM('quadrimoji','open')  NOT NULL  DEFAULT 'quadrimoji'
```
Backfill `quadrimoji` sur toutes les lignes existantes à la migration.

### 3.2 Nouvelle table `open_questions`

```
id                UUID, PK
organization_id   UUID, FK → organizations (nullable)
branch_id         STRING, FK → branches (nullable)
label             STRING           -- le texte de la question
type              ENUM('short_text','long_text','rating_1_5','rating_1_10','single_choice','multi_choice')
options           JSON             -- [{id,label,order}] ; utilisé uniquement pour *_choice
is_required       BOOLEAN  DEFAULT false
is_active         BOOLEAN  DEFAULT true
sort_order        INT      DEFAULT 0
version           INT      DEFAULT 1
created_at / updated_at
```

### 3.3 Résolution du mode effectif

Pour une agence `X` de l'organisation `O` :

1. **Mode** : `branches.questionnaire_mode` si non-null, sinon `organizations.questionnaire_mode`.
2. **Questions** : rows où `branch_id = X` ; fallback sur `organization_id = O AND branch_id IS NULL`.

### 3.4 Stockage des réponses (`feedbacks.follow_up_responses`)

Le champ JSON existant est réutilisé avec deux formats distincts selon le mode :

**Mode Quadrimoji** (inchangé)
```json
[
  {"option_id": "opt-1"},
  {"option_id": "opt-2"},
  {"free_text": "commentaire libre..."}
]
```

**Mode Open** (nouveau)
```json
[
  {"question_id": "uuid-1", "type": "short_text", "answer": "Accueil chaleureux"},
  {"question_id": "uuid-2", "type": "rating_1_5", "answer": 4},
  {"question_id": "uuid-3", "type": "multi_choice", "answer": ["opt-a", "opt-c"]}
]
```

## 4. API

### 4.1 Routes admin (`SettingsController`)

**Existantes (inchangées)**
```
GET  /api/settings/question-configs     → Quadrimoji
POST /api/settings/question-configs     → Quadrimoji
```

**Nouvelles**
```
GET  /api/settings/questionnaire-mode
     → { org_mode, branches: [{branch_id, mode|null}] }

PUT  /api/settings/questionnaire-mode
     body: { mode, branch_id?, wipe_other_mode_config? }
     - branch_id présent : surcharge l'agence
     - absent : modifie le mode par défaut de l'org
     - wipe_other_mode_config true : supprime la config de l'ancien mode

GET  /api/settings/open-questions?branch_id=
     → liste des questions ouvertes (org + surcharges)

POST /api/settings/open-questions
     body: { configs: [...], branch_id? }
     → upsert bulk
```

### 4.2 Routes kiosque (`KioskController`)

**Existante (modifiée)**
```
GET /api/kiosk/{branchId}/config
```
Retour enrichi :
```json
{
  "branch": {...},
  "organization": {...},
  "kiosk_config": {...},
  "questionnaire_mode": "quadrimoji" | "open",
  "question_configs": [...],      // présent si mode = quadrimoji
  "open_questions": [...]         // présent si mode = open
}
```

**Existante (modifiée)**
```
POST /api/kiosk/feedbacks
```
- Stocke `questionnaire_mode` sur la ligne (mode effectif de la branche à l'instant T).
- `follow_up_responses` accepte les deux formats selon le mode.
- Validation conditionnelle côté serveur (cohérence type ↔ answer).

## 5. UI Admin — `Settings > Questionnaire`

### 5.1 Renommage

L'onglet actuel **Settings > Questions** est renommé **Settings > Questionnaire**.

### 5.2 Structure à 2 onglets

- **Onglet « Organisation »**
  - Sélecteur de mode (radio : Quadrimoji / Questions ouvertes)
  - Éditeur correspondant au mode (`QuestionsConfig` existant OU `OpenQuestionsEditor` nouveau)

- **Onglet « Agences »**
  - Liste des agences avec badge du mode effectif (hérite / surcharge)
  - Bouton « Surcharger » → modal avec éditeur scopé à l'agence
  - Bouton « Rétablir l'héritage » → `branches.questionnaire_mode = NULL` + option de purge

### 5.3 AlertDialog au changement de mode

```
⚠ Changer le mode du questionnaire ?

Vous passez de « Quadrimoji » à « Questions ouvertes ».
Que faire de votre configuration Quadrimoji actuelle ?

○ La conserver (restaurable si je reviens)
○ La supprimer définitivement

         [Annuler]   [Confirmer le changement]
```

### 5.4 Composant `OpenQuestionsEditor`

- Liste plate de questions (pas de carte par sentiment)
- Dropdown de type par question
- Champ `options` visible seulement pour `single_choice` / `multi_choice`
- Toggle `is_required` par question
- Drag & drop dnd-kit pour réordonner
- Prévisualisation intégrée (wizard kiosque simulé)
- Limite 10 questions max

### 5.5 Composants (React/TypeScript)

| Fichier | Action |
|---|---|
| `resources/js/components/settings/QuestionnaireSettings.tsx` | Nouveau — page hôte |
| `resources/js/components/settings/OpenQuestionsEditor.tsx` | Nouveau |
| `resources/js/components/settings/BranchOverridePanel.tsx` | Nouveau |
| `resources/js/components/settings/QuestionsConfig.tsx` | Inchangé (réutilisé) |
| Menu/route Settings | Renommage « Questions » → « Questionnaire » |

## 6. Flux kiosque

### 6.1 Parcours commun

1. Écran d'accueil (inchangé)
2. Choix du smiley (inchangé)

### 6.2 Branchement selon `questionnaire_mode`

**Mode Quadrimoji** (inchangé) :
- Écran 2 : question de suivi conditionnelle au sentiment
- Écran 3 : contact
- Écran 4 : remerciement

**Mode Open** (nouveau) :
- Écrans 2..N+1 : wizard — une question par écran
- Écran N+2 : contact
- Écran N+3 : remerciement

### 6.3 Wizard mode Open

Chaque écran :
- Indicateur de progression (`● ● ○ ○ ○ — 3 sur 5`)
- Texte de la question + marque `* obligatoire` si applicable
- Champ adapté au type (voir §2.4)
- Boutons **Précédent** (si pas la première) et **Suivant** (désactivé si champ obligatoire vide)
- Réponses conservées côté client tant que le feedback n'est pas envoyé

### 6.4 Règles

- **Obligatoire non rempli** → « Suivant » désactivé + message rouge
- **Optionnel vide** → `null` dans `follow_up_responses`
- **Inactivité** → reset du flow (réutilise `kiosk_config.inactivity_timeout`)

### 6.5 Payload d'envoi

```json
POST /api/kiosk/feedbacks
{
  "branch_id": "...",
  "sentiment": "happy",
  "questionnaire_mode": "open",
  "follow_up_responses": [
    {"question_id": "uuid-1", "type": "short_text", "answer": "..."},
    {"question_id": "uuid-2", "type": "rating_1_5", "answer": 4}
  ]
}
```

### 6.6 Composants kiosque

| Fichier | Action |
|---|---|
| `resources/js/pages/kiosk/KioskFlow.tsx` (ou équivalent) | Modifié — branchement |
| `resources/js/components/kiosk/OpenQuestionsWizard.tsx` | Nouveau |
| `resources/js/components/kiosk/question-types/ShortText.tsx` | Nouveau |
| `resources/js/components/kiosk/question-types/LongText.tsx` | Nouveau |
| `resources/js/components/kiosk/question-types/Rating1to5.tsx` | Nouveau |
| `resources/js/components/kiosk/question-types/Rating1to10.tsx` | Nouveau |
| `resources/js/components/kiosk/question-types/SingleChoice.tsx` | Nouveau |
| `resources/js/components/kiosk/question-types/MultiChoice.tsx` | Nouveau |
| `resources/js/components/kiosk/FollowUpQuestion.tsx` (Quadrimoji) | Inchangé |

## 7. Reports

### 7.1 Rapport mono-agence

**Mode Quadrimoji** : inchangé.

**Mode Open** : répartition des smileys + section « Réponses détaillées » sous forme de **tableau** avec colonnes dynamiques :

| Date | Smiley | Q1 Accueil | Q2 Note rapidité | Q3 Améliorations | ... |
|---|---|---|---|---|---|
| 18/04 | 🙂 | "Personnel très…" | 4 | "Plus de…" | … |
| 18/04 | 😞 | (vide) | 2 | "Attente…" | … |

- Texte tronqué à ~60 chars avec `…`.
- Une colonne par question active de l'agence.

### 7.2 Rapport multi-agences

Sections séparées par mode (exigence B1) :

- **Métriques globales** communes (smileys, volume)
- **Section « Agences Quadrimoji »** : format historique (motifs agrégés)
- **Section « Agences Questions ouvertes »** : tableau ligne-par-ligne (idem §7.1)

### 7.3 Excel

- **Feuille 1 « Synthèse »** : métriques communes
- **Feuille 2 « Agences Quadrimoji »** : tableau classique (inchangé)
- **Feuille 3 « Agences Open »** : une ligne par feedback avec colonnes dynamiques par question
- Si le rapport ne contient qu'un seul mode, la feuille correspondante au mode absent est omise.

### 7.4 Filtre UI Reports

Ajout d'un sélecteur **« Mode questionnaire »** (All / Quadrimoji / Open) pour isoler les agences par mode.

### 7.5 Fichiers à modifier

| Fichier | Action |
|---|---|
| `app/Services/ReportBuilder.php` (ou équivalent) | Branchement par mode |
| `app/Exports/*.php` | Feuilles conditionnelles |
| `resources/views/reports/pdf/*.blade.php` | Sections conditionnelles |
| `resources/js/pages/reports/*.tsx` | Ajout filtre mode |

## 8. Migration & rollout

### 8.1 Migrations DB (zero-downtime)

```
1. add_questionnaire_mode_to_organizations       (DEFAULT 'quadrimoji')
2. add_questionnaire_mode_to_branches            (nullable)
3. add_questionnaire_mode_to_feedbacks           (DEFAULT 'quadrimoji' + backfill)
4. create_open_questions_table
```

Exécution : `php artisan migrate`. Uniquement des ALTER additifs + une nouvelle table.

### 8.2 Déploiement

- Toutes les orgs restent en `quadrimoji` (A1) ; aucun changement visible pour les clients.
- Communication interne : « Nouveau mode disponible dans Settings > Questionnaire ».
- Activation opt-in par org/agence.

### 8.3 Rollback

- Migrations `down` : DROP des 4 colonnes + DROP table `open_questions`.
- Les feedbacks collectés pendant la fenêtre de test conservent leur `questionnaire_mode`, champ devenu inutilisé mais non bloquant.

### 8.4 Tests

- **Unitaires** : résolution du mode effectif, validation par type.
- **Feature (Pest)** : endpoints API, policies, retour `kiosk/{branchId}/config`.
- **E2E** (si infra existe) : parcours kiosque complet en mode Open.

## 9. Non-objectifs (YAGNI)

Explicitement hors scope de cette réforme :

- Analyse NLP / sentiment automatique sur le texte libre
- Versionnage des questionnaires avec historique
- Plusieurs modes actifs pour une même agence à un instant T
- Traduction multi-langues des questions
- Import/export Excel des questions ouvertes (pourra être ajouté plus tard comme pour les agences)
