# Sonaltech Électrique — Gestion (hors ligne)

Application qui remplace le fichier Excel de l'entreprise : **devis, factures, bons pour, attachements**
(au format habituel de l'entreprise), **pointage** des employés, **salaires**, **frais** et **bénéfice par chantier**.

- **Fonctionne sans internet** : après la première ouverture, tout est gardé sur l'ordinateur.
- **Tout est enregistré sur le site** (Netlify Blobs) dès qu'il y a internet, et retrouvé sur tous les appareils
  connectés avec le mot de passe de l'entreprise. Sans internet, les modifications attendent sur l'appareil.
- **Rien n'est jamais effacé du site** : une suppression va dans la Corbeille (restaurable), et une copie complète
  des données est gardée chaque jour.
- **PDF** de chaque document au format de l'entreprise (bouton PDF, ou menu **Archives PDF** pour tout retrouver
  et tout télécharger en ZIP), ainsi que du pointage/salaires et des frais. Les PDF sont fabriqués dans l'application,
  même sans internet, à partir des données enregistrées sur le site.
- Export **Excel** (avec formules) pour chaque document, le pointage et les frais.

## Version clé USB (sans internet, sans installation)

```bash
npm run build:usb   # → dist-usb/Sonaltech.html (un seul fichier, ~1 Mo)
```

Copier `Sonaltech.html` sur le bureau du client et l'ouvrir avec **Google Chrome** (clic droit → Ouvrir avec → Chrome).
Aucune connexion n'est jamais nécessaire. Les données sont gardées par Chrome sur cet ordinateur : toujours ouvrir
le fichier avec Chrome, et faire des sauvegardes régulières (menu Sauvegarde).

## Installation depuis internet (version en ligne)

1. Ouvrir l'adresse du site dans **Google Chrome** (ou Edge).
2. Cliquer sur l'icône **Installer** (⊕) à droite de la barre d'adresse → **Installer**.
   Une icône « Sonaltech » apparaît sur le bureau ; l'application s'ouvre ensuite sans internet.
3. **Paramètres** : vérifier les coordonnées (RC, ART, NIF…) et le premier numéro de facture de l'année.

## Sauvegarde — important

Les données n'existent que sur cet ordinateur. Menu **Sauvegarde → Télécharger la sauvegarde** au moins une fois
par semaine, et copier le fichier sur une clé USB. Pour changer d'ordinateur : installer l'application sur le nouveau
PC, puis **Sauvegarde → Restaurer**. Ne jamais effacer les « données de navigation » de ce site dans Chrome.

## Développement

```bash
npm install
APP_PASSWORD=test-local-2026 node --experimental-strip-types server/dev-server.mjs   # API locale (port 8787)
npm run dev      # http://localhost:5173
npm run build    # version de production dans dist/
```

Pile : React 18, TypeScript, Vite, Tailwind CSS, Dexie (IndexedDB), vite-plugin-pwa, Netlify Functions + Blobs (`netlify/functions/api.mts`, logique dans `server/core.ts`).
Contenu par défaut (coordonnées, catalogue) : `src/lib/db.ts`.
