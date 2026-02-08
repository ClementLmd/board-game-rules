# Regles du Jeu

Site statique en francais qui regroupe les regles de jeux de societe, expliquees simplement.

Construit avec [Astro](https://astro.build), [Tailwind CSS](https://tailwindcss.com) et [Fuse.js](https://www.fusejs.io/) pour la recherche.

## Fonctionnalites

- Fiches de regles redigees en Markdown avec metadonnees (joueurs, duree, difficulte, categories)
- Recherche instantanee cote client (Fuse.js)
- Filtres par difficulte, categorie et nombre de joueurs
- Pages par categorie generees automatiquement
- Responsive (mobile-first)
- SEO (meta tags, Open Graph, JSON-LD, sitemap)

## Jeux disponibles

Catan, Citadelles, Dixit, Les Loups-Garous de Thiercelieux, Skull King, Uno

## Commandes

| Commande         | Action                                    |
| :--------------- | :---------------------------------------- |
| `pnpm install`   | Installer les dependances                 |
| `pnpm dev`       | Lancer le serveur de dev (`localhost:4321`)|
| `pnpm build`     | Generer le site statique dans `./dist/`   |
| `pnpm preview`   | Previsualiser le build en local           |

## Ajouter un jeu

Creer un fichier Markdown dans `src/content/games/` avec le frontmatter suivant :

```yaml
---
title: "Nom du jeu"
slug: "nom-du-jeu"
description: "Description courte du jeu"
players: { min: 2, max: 6 }
duration: "30-60 min"
age: 10
categories: ["strategie", "cartes"]
difficulty: "facile"  # facile | moyen | difficile
officialRulesUrl: "https://..."  # optionnel
---
```

Puis rediger les regles en Markdown en dessous.

## Deploiement

Le site est deploye sur [Vercel](https://vercel.com). Chaque push sur `main` declenche un deploiement automatique.
