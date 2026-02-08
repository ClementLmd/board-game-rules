# Règles du Jeu

Site statique en français qui regroupe les règles de jeux de société, expliquées simplement.

Construit avec [Astro](https://astro.build), [Tailwind CSS](https://tailwindcss.com) et [Fuse.js](https://www.fusejs.io/) pour la recherche.

## Fonctionnalités

- Fiches de règles rédigées en Markdown avec métadonnées (joueurs, durée, difficulté, catégories)
- Recherche instantanée côté client (Fuse.js)
- Filtres par difficulté, catégorie et nombre de joueurs
- Pages par catégorie générées automatiquement
- Responsive (mobile-first)
- SEO (meta tags, Open Graph, JSON-LD, sitemap)

## Jeux disponibles

Catan, Citadelles, Dixit, Les Loups-Garous de Thiercelieux, Skull King, Uno

## Commandes

| Commande       | Action                                      |
| :------------- | :------------------------------------------ |
| `pnpm install` | Installer les dépendances                   |
| `pnpm dev`     | Lancer le serveur de dev (`localhost:4321`) |
| `pnpm build`   | Générer le site statique dans `./dist/`     |
| `pnpm preview` | Prévisualiser le build en local             |

## Ajouter un jeu

Créer un fichier Markdown dans `src/content/games/` avec le frontmatter suivant :

```yaml
---
title: "Nom du jeu"
slug: "nom-du-jeu"
description: "Description courte du jeu"
players: { min: 2, max: 6 }
duration: "30-60 min"
age: 10
categories: ["stratégie", "cartes"]
difficulty: "facile" # facile | moyen | difficile
officialRulesUrl: "https://..." # optionnel
---
```

Puis rédiger les règles en Markdown en dessous.

## Déploiement

Le site est déployé sur [Vercel](https://vercel.com). Chaque push sur `main` déclenche un déploiement automatique.
