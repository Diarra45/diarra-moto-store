# Images produit

Ce dossier conserve les originaux des motos, pièces et accessoires. En production, le site utilise les URLs Cloudinary stockées dans le catalogue, pas ces fichiers locaux.

## Exporter les liens Cloudinary

Ajoute les trois variables Cloudinary montrées dans `.env.example` à ton fichier `.env` existant. Garde le numéro WhatsApp qui s'y trouve déjà, et ne préfixe pas les variables Cloudinary par `VITE_`.

Puis, depuis la racine du projet, exécute :

```sh
npm run cloudinary:sync
```

Le script liste les images du dossier Cloudinary `motos` sans les télécharger. Il écrit leurs URLs dans `public/motos-cloudinary.json`. `.env` est ignoré par Git ; ne partage pas son contenu et ne colle pas les clés dans le chat.

Le site lit directement les URLs Cloudinary du manifeste pour afficher les photos. Vérifie les limites actuelles de l'offre Cloudinary avant de t'appuyer sur son palier gratuit.
