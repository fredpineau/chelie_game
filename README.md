# Chelie Game

Jeu 2D destiné au Web et à Android, développé avec Phaser, TypeScript, Vite et Capacitor.

## Démarrage local

```bash
npm install
npm run dev
```

## Construction de la version Web

```bash
npm run build
npm run preview
```

Le dossier généré est `dist/`. Le dépôt peut être importé directement dans Vercel.

### Retours de l’Espace Bêta

La fonction Vercel `api/beta-feedback.js` crée une Issue GitHub lorsqu’un joueur
envoie un rapport de bug ou le questionnaire bêta. Configurer dans Vercel :

- `GITHUB_FEEDBACK_TOKEN` : token GitHub à droits minimaux avec `Issues: Read and write` sur ce dépôt ;
- `GITHUB_FEEDBACK_REPOSITORY` (facultatif) : dépôt cible au format `owner/repository`, par défaut `fredpineau/chelie_game` ;
- `VITE_BETA_FEEDBACK_URL` (facultatif) : URL absolue de l’API pour un build Android qui ne doit pas utiliser l’URL de production par défaut.

Le token GitHub est lu uniquement par la fonction serveur et ne doit jamais être
préfixé par `VITE_`, afin de ne pas être inclus dans le JavaScript du navigateur.

## Initialisation de la version Android

Android Studio et le SDK Android doivent être installés.

```bash
npm install
npx cap add android
npm run android
```

Après la première initialisation, `npm run cap:sync` synchronise la version Web avec le projet Android.
