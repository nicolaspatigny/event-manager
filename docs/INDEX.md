# Dossier de projet CDA — Rassemble

Ce dossier accompagne un projet individuel en remplacement de stage. Il ne constitue
ni une attestation d’entreprise ni un dossier personnel déjà validé par l’ENI.

| Document | Usage |
|---|---|
| [ANALYSIS.md](ANALYSIS.md) | Contexte, besoin, périmètre, règles métier, critères d’acceptation |
| [DESIGN.md](DESIGN.md) | MCD, modèle documentaire, cas d’utilisation, architecture, séquence atomique |
| [WIREFRAMES.md](WIREFRAMES.md) | Maquettes des écrans et décisions ergonomiques |
| [PROJECT.md](PROJECT.md) | Planning Gantt proposé, backlog, méthode de travail et risques |
| [API.md](API.md) | Contrats REST, erreurs et autorisations |
| [SECURITY.md](SECURITY.md) | OWASP Top 10 2025, RGPD et limites |
| [TESTS.md](TESTS.md) | Stratégie et traçabilité des règles/test |
| [EVIDENCE.md](EVIDENCE.md) | Résultats vérifiés et collecte des preuves |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Installation, livraison, sauvegarde et maintenance |
| [ASSESSMENT.md](ASSESSMENT.md) | Missions, blocs CDA, difficultés, réflexion personnelle et soutenance |

Les éléments marqués « à compléter » nécessitent des informations personnelles ou une
validation réelle. Le planning est une proposition, pas un historique inventé. Les
captures sont produites par des tests avec des comptes fictifs.

## Exports

- [Dossier imprimable PDF](DOSSIER.pdf) et [version HTML](DOSSIER.html).
- Diagrammes SVG : [MCD](diagrams/diagram1.svg), [cas d’utilisation](diagrams/diagram2.svg), [architecture](diagrams/diagram3.svg), [inscription atomique](diagrams/diagram4.svg), [Gantt](diagrams/diagram5.svg).
- [Captures de démonstration et résultats](EVIDENCE.md).

Pour régénérer les diagrammes et le dossier : `npm ci --prefix docs/tools`, puis
`node scripts/render-docs.mjs` après installation des dépendances frontend et du navigateur
Playwright. Si disponible, `CHROMIUM_PATH=/usr/bin/chromium node scripts/render-docs.mjs`
utilise Chromium système. Aucun service web externe n’est utilisé pour le rendu.
