# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commandes

```sh
npm install                 # dépendances
npm run dev                 # serveur Vite local
npm run build               # build de production dans dist/
npm run preview             # sert dist/ localement
npm run cloudinary:sync     # écrit public/motos-cloudinary.json (lit .env via --env-file)
```

Il n'y a ni script de lint ni suite de tests. Pour vérifier un changement, lance `npm run build` puis `npm run dev` et contrôle le rendu dans le navigateur.

## Configuration

- `VITE_WHATSAPP_NUMBER` est lu au build par `src/data/store.js` via `import.meta.env`. Modifier `.env` impose de relancer le serveur de dev ou un nouveau build.
- Les variables `CLOUDINARY_*` n'ont pas le préfixe `VITE_` : elles ne doivent jamais atteindre le bundle. Elles sont utilisées uniquement par `scripts/cloudinary-list-motos.mjs`.
- `.env` est ignoré par Git et par Vercel. Ne jamais copier ses valeurs dans le code, les commits ou le chat.

## Architecture

Site statique (SPA React + Vite), sans backend ni paiement. Le « panier » sert seulement à préparer un message WhatsApp.

Flux de données :

1. `public/products.json` est le catalogue, édité à la main. Il est récupéré à l'exécution avec `fetch`, pas importé dans le bundle.
2. `scripts/cloudinary-list-motos.mjs` liste le dossier Cloudinary `motos` via l'API et écrit `public/motos-cloudinary.json`. Le site ne charge jamais les images locales de `media/images/`.
3. `src/App.jsx` associe chaque produit à une image : `product.imageMatch` est une liste de sous-chaînes en minuscules, toutes comprises dans le `public_id` Cloudinary. Sans correspondance, il prend `product.imageUrl`, puis affiche un placeholder.

`src/App.jsx` est un composant unique qui contient tout l'état : filtres, panier, drawer, aperçu photo, toast et JSON-LD. Les sections utilisent des classes CSS écrites à la main dans `src/index.css`, pas des utilitaires Tailwind. Les nouvelles classes vont donc dans `index.css`, en réutilisant les variables `:root`.

- Panier : persisté dans `localStorage` sous la clé `diarra-cart`.
- Commande : `orderOnWhatsApp` construit un lien `wa.me` prérempli. Le total n'apparaît que si tous les articles ont un prix.
- Prix : `price: null` signifie « Prix sur demande » (XOF). Ne jamais inventer un prix ni une compatibilité de pièce.
- Animations : GSAP dans des `useEffect`, avec `gsap.context` pour pouvoir les nettoyer.
- Données structurées : `index.html` contient un JSON-LD statique ; `App.jsx` en injecte un second selon le catalogue. Ils doivent rester cohérents.

## Déploiement

Vercel (`.vercel/project.json`, `.vercelignore`). `.vercelignore` exclut `media/images`, `scripts`, `dist` et les fichiers `.env*`. Le manifeste `public/motos-cloudinary.json` fait partie du déploiement : tant qu'il n'a pas été régénéré, le site affiche les placeholders. `dist/` est généré et ne doit pas être édité à la main.

## Contenu

Les textes du site sont en français. Le skill `.github/skills/lien-whatsapp/SKILL.md` détaille le format des liens WhatsApp, y compris la normalisation des numéros ivoiriens à 10 chiffres. Les autres skills de `.github/skills/` sont vides à ce jour.
