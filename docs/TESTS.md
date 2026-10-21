# Stratégie de tests et qualité

Les tests d’intégration démarrent une vraie API sur un port aléatoire et communiquent avec
un vrai MongoDB local. Ils ne remplacent pas la persistance par des mocks. Une base
`platform_test_<uuid>` est créée puis supprimée ; le test de contexte utilise une base
sans données métier. Exécuter MongoDB avant Gradle.

| Scénario | Test automatisé |
|---|---|
| disponibilité MongoDB et application prête | healthChecksApplicationReadinessAndMongoDB |
| JWT expiré et signature altérée | expiredAndTamperedTokensAreRejected |
| inscription, hash, normalisation, unicité, rôle initial | authenticationValidationAndEmailUniqueness |
| endpoints publics/protégés et privilèges | anonymousAndInsufficientRolesAreRejected |
| déconnexion et changement mot de passe | logoutAndPasswordChangeRevokeTokens |
| propriétaire, tiers, date passée et révision obsolète | eventOwnershipValidationAndOptimisticConcurrency |
| complet, double inscription, désinscription, annulé, historique | registrationCapacityDuplicatesCancellationAndHistory |
| RM02 / RM05 : 12 requêtes pour 3 places | simultaneousRegistrationsNeverOversell |
| RM03 : 6 réservations du même utilisateur | simultaneousDuplicateRegistrationIsAtomic |
| réduction capacité et événement passé | capacityCannotBeReducedBelowRegistrationsAndPastEventsRejectRegistration |
| rôle et compte désactivé, protection admin | adminRoleChangesAndDisabledAccountsInvalidateExistingTokens |
| recherche littérale, catégories inactives, pagination, audit | categoriesSearchPaginationAndAudit |
| profil, export sans secrets, effacement et références | profileExportAndErasure |

Tests Playwright : agenda/filtres/mobile ; création de compte participant, réservation,
profil/export/effacement ; publication/modification/annulation organisateur ; administration
catégories/comptes/journal. Les tests utilisent une base jetable distincte et des données
fictives, puis la suppriment. Les captures produites montrent ces données seulement.

## Commandes et résultats

```bash
cd backend && bash gradlew test bootJar --no-daemon
cd ../frontend && npm ci && npm run build
# Installer Chromium Playwright une fois, puis revenir à la racine :
npx playwright install chromium
cd .. && bash scripts/e2e.sh
```

Si un Chromium système existe, `CHROMIUM_PATH=/usr/bin/chromium bash scripts/e2e.sh`
est une alternative ; aucune vérification TLS n’est désactivée pour télécharger un navigateur.

Rapports : `backend/build/reports/tests/test`, `frontend/playwright-report`, traces des
échecs dans `frontend/test-results`, captures `artifacts/screenshots`. Ces sorties sont
ignorées par Git ; les exporter et anonymiser avant de les joindre à une soutenance.
La CI conserve les rapports en artefacts, mais aucune exécution GitHub distante n’est
revendiquée tant qu’elle n’a pas eu lieu.

## Recette humaine à compléter

- Naviguer au clavier, vérifier lecteur d’écran, contrastes et retours d’erreur.
- Confirmer les libellés et les décisions métier avec l’enseignant.
- Tester fuseau horaire, deux navigateurs et un mobile physique.
- Simuler perte réseau, panne MongoDB, restauration et rotation de secrets.
- Mesurer le temps de réponse sous une charge représentative du futur hébergement.

Pas de pourcentage de couverture inventé. La réussite de ces tests prouve les scénarios
exécutés, pas l’absence de toute vulnérabilité ni l’aptitude à une charge inconnue.
