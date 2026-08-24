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

## Initialisation de la version Android

Android Studio et le SDK Android doivent être installés.

```bash
npm install
npx cap add android
npm run android
```

Après la première initialisation, `npm run cap:sync` synchronise la version Web avec le projet Android.
