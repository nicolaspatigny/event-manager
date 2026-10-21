# Rassemble — plateforme de gestion d’événements

Projet CDA de remplacement de stage : API Spring Boot / Java 21, interface Angular 21
et **MongoDB uniquement**. Interface française responsive, rôles participant (`USER`),
organisateur et administrateur. Le cahier des charges initial mentionnait SQL Server ;
ce choix est remplacé explicitement à la demande du porteur de projet.

## Fonctionnalités

- Inscription, connexion, déconnexion effective (révocation des JWT), profil, mot de passe.
- Agenda public : recherche par titre, catégorie, lieu et plage de dates via API.
- Création, modification et annulation d’événements ; contrôle de propriété serveur.
- Inscription et désinscription ; capacité et unicité vérifiées atomiquement dans MongoDB.
- Historique des événements auxquels le participant est encore inscrit, tableaux de bord.
- Administration des comptes/rôles, catégories, événements et journaux d’activité.
- Export personnel et suppression du compte, minimisation et expiration des journaux.

Hors périmètre : paiement, chat, recommandations, e-mails, QR codes, récupération de
mot de passe et invitations automatiques. Le projet n’est pas présenté comme une
application déjà auditée ou exploitée en production.

## Lancement avec Docker Compose

Prérequis : Docker Engine et Compose v2. Copier `.env.example` vers `.env`, puis renseigner
un mot de passe administrateur d’au moins 12 caractères, un secret JWT aléatoire d’au
moins 32 octets et un mot de passe MongoDB aléatoire **hexadécimal** (évite les problèmes
d’encodage des identifiants dans l’URI). Générer les secrets avec `openssl rand -hex 32`.
Ne jamais committer `.env`.

```bash
cp .env.example .env
# Modifier les valeurs de .env avant le lancement.
docker compose up --build -d
docker compose logs --tail=50 backend
```

Le port web par défaut est 8081, lié à l’interface locale. MongoDB et l’API ne sont pas
publiés. L’administrateur initial est créé seulement si son e-mail n’existe pas ; changer
la variable ne change pas un mot de passe existant. Connecter l’administrateur, créer des
catégories, puis promouvoir un compte participant en organisateur pour publier.

Le jeton reste en mémoire : un rechargement de page exige une reconnexion. Aucun compte
ou mot de passe par défaut n’est inclus. TLS et les réglages d’exploitation restent à
configurer avant ouverture publique : voir [déploiement](docs/DEPLOYMENT.md).

## Développement local

Prérequis : JDK 21 complet, Node 24, MongoDB 8 sur le port 27017.

```bash
docker run -d --name event-manager-mongo -p 127.0.0.1:27017:27017 mongo:8.0
export MONGODB_URI=mongodb://127.0.0.1:27017/event_manager
export JWT_SECRET="$(openssl rand -hex 32)"
# ADMIN_EMAIL et ADMIN_PASSWORD sont optionnels, pour créer le premier administrateur.
cd frontend && npm ci && cd ..
bash scripts/dev.sh
```

Angular relaie `/api` vers le backend en développement. Les processus de développement
utilisent les ports 4200 et 8080. Aucun service SQL n’est nécessaire.

## Vérifications

```bash
cd backend && bash gradlew test bootJar --no-daemon && cd ..
cd frontend && npm ci && npm run build && npx playwright install chromium && cd ..
bash scripts/e2e.sh
```

Les tests d’intégration utilisent des bases MongoDB dédiées ; les tests navigateur utilisent
`event_manager_e2e` (base jetable, ne jamais lui donner des données réelles).
Voir [le plan de tests](docs/TESTS.md), [les preuves](docs/EVIDENCE.md) et les rapports générés.

## Dossier de projet

Commencer par [docs/INDEX.md](docs/INDEX.md) : analyse, modèle conceptuel, cas d’utilisation,
architecture, maquettes, Gantt, backlog, API, OWASP 2025, RGPD, maintenance et trame de
soutenance. Le contexte de structure, la validation par l’enseignant et l’analyse
personnelle sont explicitement laissés à compléter avec des informations réelles.

## Jeu de démonstration facultatif

Pour une recette visuelle avec six événements fictifs : choisir un `DEMO_PASSWORD`
dans votre configuration privée et lancer, depuis la racine avec Node 24 :

```bash
node --env-file=.env scripts/seed-demo.mjs
```

Ce script utilise l’API web du Compose sur le port 8081 (modifiable avec `API_URL`),
crée les comptes `organisateur@demo.example` et `participant@demo.example` avec le mot
de passe que vous fournissez, puis publie six événements. Ne l’utiliser que sur une
instance de démonstration. Il ne réinitialise pas les mots de passe des comptes existants.
