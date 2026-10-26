## Diarra Moto Store

Boutique statique en React et Vite, avec Tailwind CSS, GSAP, catalogue JSON et commandes préparées dans WhatsApp. Aucun backend ni paiement en ligne n'est inclus.

### Démarrer

```sh
npm install
npm run dev
```

Pour configurer WhatsApp, renseigne `VITE_WHATSAPP_NUMBER` dans `.env` au format international, chiffres uniquement, sans `+` ni espaces.

### Catalogue et images

Modifie `public/products.json` pour gérer les motos et les pièces. Les prix sont en XOF ; laisse `price` à `null` tant qu'un tarif n'est pas confirmé. N'annonce une compatibilité de pièce qu'après vérification.

Le site affiche uniquement les URLs Cloudinary. Ajoute le cloud name, l'API key et l'API secret dans `.env`, puis suis [media/images/README.md](media/images/README.md) pour lancer `npm run cloudinary:sync`. Le script remplit `public/motos-cloudinary.json` sans télécharger les images ; avant cela, l'interface montre un placeholder.

### Production

```sh
npm run build
npm run preview
```
