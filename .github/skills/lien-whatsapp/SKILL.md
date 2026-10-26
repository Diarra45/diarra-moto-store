---
name: lien-whatsapp
description: "Créer des liens wa.me pour une commande moto ou un panier WhatsApp prérempli. À utiliser pour formater le numéro ivoirien, ajouter les informations des produits et leurs URLs Cloudinary, et vérifier les messages."
---

# Liens WhatsApp

## Procédure
1. Lire le numéro depuis `.env` sans le recopier dans le code ni dans les journaux. Pour les numéros ivoiriens locaux à 10 chiffres commençant par 01, 05 ou 07, préfixer par 225 sans supprimer le premier zéro. Accepter également les formats `+225` et `00225`.
2. Préparer un message avec le nom, la référence et le prix uniquement s'ils sont confirmés.
3. Ajouter l'URL HTTPS Cloudinary de la photo pour chaque produit qui en possède une. Ne pas télécharger la photo pour un lien `wa.me`.
4. Pour un panier, créer un seul message contenant une ligne par article, quantité et URL d'image disponible ; ne calculer le total que si les prix sont connus et cohérents.
5. Encoder le message avec `encodeURIComponent` ou une API URL standard. Ouvrir le lien et laisser le client relire puis envoyer le texte.

## Limites
- Un lien `wa.me` ne peut pas joindre une image comme pièce jointe. Il peut seulement préremplir un texte avec son URL ; WhatsApp peut afficher un aperçu du lien.
- Ne pas annoncer la commande comme envoyée ou confirmée avant que le client l'envoie dans WhatsApp.
- Ne pas intégrer de clé API ou de jeton WhatsApp dans le frontend.
