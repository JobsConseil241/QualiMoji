# Protocole de test — QualiMoji

## 1. Authentification

| # | Test | Action | Résultat attendu |
|---|------|--------|-----------------|
| 1.1 | Login admin | Se connecter avec `admin@bgfi.com` / `password` | Dashboard complet, toutes les agences visibles |
| 1.2 | Login directeur zone | Se connecter avec `marc.ndong@bgfi.com` / `password` | Seulement les 4 agences Zone Libreville |
| 1.3 | Login directeur agence | Se connecter avec `jm.obiang@bgfi.com` / `password` | Seulement BGFI Siège Central |
| 1.4 | Login directeur agence Centauri | Se connecter avec `c.moussavou@bgfi.com` / `password` | Seulement Centauri Premium Libreville |
| 1.5 | Mot de passe incorrect | Saisir un mauvais mot de passe | Message d'erreur "Erreur de connexion" |
| 1.6 | Comptes démo | Cliquer sur un compte démo sur la page login | Email et mot de passe pré-remplis |

---

## 2. Gestion des utilisateurs (Settings > Utilisateurs)

| # | Test | Action | Résultat attendu |
|---|------|--------|-----------------|
| 2.1 | Créer un utilisateur | Cliquer "Inviter", remplir nom/email/mot de passe/rôle | Utilisateur créé, email d'invitation reçu |
| 2.2 | Mot de passe obligatoire | Tenter de créer sans mot de passe | Message "Veuillez définir un mot de passe" |
| 2.3 | Mot de passe < 6 chars | Saisir "abc" comme mot de passe | Message "au moins 6 caractères" |
| 2.4 | Modifier nom/email | Éditer un utilisateur, changer nom et email | Infos mises à jour dans la liste |
| 2.5 | Changer le rôle | Modifier le rôle d'un utilisateur | Rôle mis à jour, badge modifié |
| 2.6 | Directeur zone → zone | Créer/modifier un dir. de zone, assigner une zone | Zone affichée avec ses agences dans la liste |
| 2.7 | Directeur agence → 1 seule | Assigner un dir. d'agence | Un seul sélecteur d'agence (pas de multi-sélection) |
| 2.8 | Réinitialiser mot de passe (icône clé) | Cliquer l'icône clé, saisir nouveau mot de passe | Dialog custom (pas de prompt natif). Email envoyé |
| 2.9 | Désactiver un utilisateur | Cliquer "Désactiver" | Dialog de confirmation. Après validation : badge "Inactif", bouton devient "Activer" |
| 2.10 | Réactiver | Cliquer "Activer" sur un utilisateur inactif | Activation directe (pas de confirmation), badge "Actif" |
| 2.11 | Email d'invitation | Créer un utilisateur avec une vraie adresse email | Vérifier la réception du mail avec identifiants |

---

## 3. Gestion des zones (Settings > Zones)

| # | Test | Action | Résultat attendu |
|---|------|--------|-----------------|
| 3.1 | Voir les zones | Aller dans l'onglet Zones | 3 zones affichées avec nombre d'agences |
| 3.2 | Créer une zone | Cliquer "Nouvelle zone", remplir nom/description | Zone ajoutée à la liste |
| 3.3 | Modifier une zone | Cliquer l'icône crayon | Nom/description modifiables |
| 3.4 | Supprimer une zone | Cliquer poubelle rouge | Confirmation demandée. Agences désassignées, pas supprimées |
| 3.5 | Désactiver une zone | Toggle switch | Badge "Inactive" |

---

## 4. Gestion des agences (Settings > Agences)

| # | Test | Action | Résultat attendu |
|---|------|--------|-----------------|
| 4.1 | Colonne Zone visible | Ouvrir la liste des agences | Colonne "Zone" avec badge violet |
| 4.2 | Assigner une zone | Éditer une agence, sélectionner une zone | Zone affichée dans le tableau |
| 4.3 | Importer des agences (xlsx) | Télécharger le modèle, le remplir, l'importer | Colonnes nom/ville/province/adresse/zone. Zones auto-créées si elles n'existent pas |
| 4.4 | Désactiver une agence | Toggle switch | Agence disparaît de la page Branches (listing) mais reste visible dans Settings |

---

## 5. Dashboard — Filtrage par rôle

| # | Test | Action | Résultat attendu |
|---|------|--------|-----------------|
| 5.1 | Admin | Se connecter admin | Stats de toutes les 9 agences |
| 5.2 | Directeur zone Libreville | Se connecter marc.ndong | Stats des 4 agences Libreville uniquement (Siège, Boulevard, Oloumi, Owendo) |
| 5.3 | Directeur agence | Se connecter jm.obiang | Stats de BGFI Siège Central uniquement |

---

## 6. Alertes

| # | Test | Action | Résultat attendu |
|---|------|--------|-----------------|
| 6.1 | Types d'alertes | Ouvrir la page Alertes | Types : Pic négatif, Satisfaction basse, Négatifs consécutifs, Volume faible |
| 6.2 | Filtrer par type | Sélectionner "Satisfaction basse" | Seules les alertes de ce type affichées |
| 6.3 | Filtrer par sévérité | Vérifier le compteur "Critiques" | Correspond aux alertes `severity: high` |
| 6.4 | Résoudre une alerte | Cliquer "Résoudre", ajouter une note | Statut passe à "Résolue" |
| 6.5 | Notification dropdown | Cliquer la cloche en haut | Icônes correctes (pas d'erreur `undefined`) |

---

## 7. Kiosque — Formulaire de contact

| # | Test | Action | Résultat attendu |
|---|------|--------|-----------------|
| 7.1 | Champs Nom + Prénom | Compléter un feedback, arriver à l'écran contact | Deux champs séparés : "Nom" et "Prénom" |
| 7.2 | Genre | Vérifier les boutons Homme/Femme | Toggle, sélection/désélection au clic |
| 7.3 | Téléphone obligatoire | Laisser le téléphone vide | Bouton "Envoyer" grisé, message rouge "* obligatoire" |
| 7.4 | Numéro Gabon 9 chiffres | Saisir `076546985` (+241) | Envoyé comme `+24176546985` (0 enlevé) |
| 7.5 | Numéro Gabon 8 chiffres | Saisir `06546985` (+241) | Envoyé comme `+24106546985` (0 gardé) |

---

## 8. Rapports

| # | Test | Action | Résultat attendu |
|---|------|--------|-----------------|
| 8.1 | Sélection par zone | Aller dans Rapport personnalisé | Zones affichées comme boutons, agences groupées par zone |
| 8.2 | Cocher une zone | Cliquer "Zone Libreville" | Les 4 agences de la zone sont cochées automatiquement |
| 8.3 | Export PDF — colonne Zone | Générer un rapport PDF | Tableau "Détail par agence" avec colonne Zone |
| 8.4 | Export Excel — colonne Zone | Générer un rapport Excel | Feuille "Agences" et "Feedbacks" avec colonne Zone |
| 8.5 | Branding organisation | Vérifier l'en-tête du PDF | "BGFI Bank Gabon" (pas "QualiMoji") |

---

## 9. Emails

| # | Test | Action | Résultat attendu |
|---|------|--------|-----------------|
| 9.1 | SMTP fonctionnel | Créer un utilisateur avec email réel | Email reçu dans la boîte |
| 9.2 | Contenu invitation | Ouvrir l'email reçu | Nom org, rôle, email, mot de passe, bouton "Se connecter" |
| 9.3 | Reset password email | Réinitialiser le mdp depuis la liste | Email reçu avec nouveaux identifiants |

---

## 10. Import xlsx

| # | Test | Action | Résultat attendu |
|---|------|--------|-----------------|
| 10.1 | Modèle agences | Télécharger le modèle xlsx agences | Colonnes : nom, ville, province, adresse, zone |
| 10.2 | Modèle utilisateurs | Télécharger le modèle xlsx utilisateurs | 2 feuilles : "Utilisateurs" (avec nouveaux rôles) + "Rôles" (référence) |
| 10.3 | Import avec zone inconnue | Importer une agence avec zone "Zone Test" | Zone auto-créée en DB |

---

## Comptes de test

| Rôle | Email | Mot de passe | Périmètre |
|------|-------|-------------|-----------|
| Admin | `admin@bgfi.com` | `password` | Tout |
| Dir. Qualité | `sophie.nze@bgfi.com` | `password` | Tout |
| Dir. Zone | `marc.ndong@bgfi.com` | `password` | Zone Libreville (4 agences) |
| Dir. Agence | `jm.obiang@bgfi.com` | `password` | BGFI Siège Central |
| Dir. Agence | `c.moussavou@bgfi.com` | `password` | Centauri Premium Libreville |
| Admin IT | `p.ntoutoume@bgfi.com` | `password` | Technique |
