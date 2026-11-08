# Sonaltech Électrique — Gestion (hors ligne)

Application qui remplace le fichier Excel de l'entreprise : **devis, factures, bons pour, attachements**
(au format habituel de l'entreprise), **pointage** des employés, **salaires**, **frais** et **bénéfice par chantier**.

- **Fonctionne sans internet** : après la première ouverture, tout est gardé sur l'ordinateur.
- **Les données restent sur l'ordinateur** du client (base du navigateur). Aucune donnée n'est envoyée sur internet.
- Impression / PDF au format A4 et export **Excel** (avec formules) pour chaque document, le pointage et les frais.

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
npm run dev      # http://localhost:5173
npm run build    # version de production dans dist/
```

Pile : React 18, TypeScript, Vite, Tailwind CSS, Dexie (IndexedDB), vite-plugin-pwa.
Contenu par défaut (coordonnées, catalogue) : `src/lib/db.ts`.
