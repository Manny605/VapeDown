# VapeDown PWA

**Application de réduction progressive du vapotage**
Développé par **A.Kamara**

---

## Design

| Token      | Valeur    | Usage                       |
|------------|-----------|-----------------------------|
| Fond       | `#050508` | Background global           |
| Composant  | `#0D1B2E` | Cards, surfaces Navy        |
| Bordure    | `#1a2f4a` | Séparateurs, borders        |
| Accent     | `#7C6AF7` | Violet — actions, focus     |
| Succès     | `#4ADE80` | Quota respecté, progrès     |
| Alerte     | `#FB923C` | Quota à 80%                 |
| Danger     | `#F87171` | Quota dépassé               |
| Police     | Poppins   | 300/400/500/600/700         |

---

## Stack

- React 18 + React Router 6
- Vite 5 + vite-plugin-pwa
- IndexedDB (offline-first, pas de backend requis)
- Web Worker (timer élapsed)
- Service Worker (cache + push + Background Sync)
- CSS Modules

---

## Structure

```
src/
├── styles/global.css        ← Design tokens complets
├── shell/AppShell.jsx/.css  ← Header + Footer Nav Navy
├── views/
│   ├── Onboarding.jsx/.css  ← 5 étapes d'onboarding
│   ├── Dashboard.jsx/.css   ← Bouton "J'ai vapé" + quota
│   ├── Stats.jsx/.css       ← Graphiques Canvas 14j
│   ├── Plan.jsx/.css        ← Roadmap + ajustement rythme
│   └── Journal.jsx/.css     ← Historique par jour
├── store/idb.js             ← IndexedDB complet
├── workers/timer.worker.js  ← Timer dans thread séparé
├── notifications/push.js    ← Push VAPID + milestones
└── sw.js                    ← Service Worker
```

---

## Fonctionnalités

### Phase 1 — Observation (J1 à J3)
- Log libre sans quota
- Mesure de la consommation réelle
- Plan généré automatiquement après 3 jours

### Phase 2 — Réduction douce
- Quota journalier calculé (−15/25/35% par semaine)
- Jauge temps réel avec couleur adaptative
- Contexte optionnel à chaque bouffée (Café, Stress, Ennui…)

### Phase 3 — Accélération
- Réduction plus soutenue
- Fenêtres horaires proposées

### Phase 4 — Arrêt final
- Moins de 5 bouffées/jour
- Date d'arrêt total définie avec l'utilisateur

---

## Installation

```bash
npm install
npm run dev      # Dev avec SW
npm run build    # → dist/
npm run preview  # Preview PWA
```

Push sur GitHub → Netlify lit `netlify.toml` → build auto → HTTPS → installable.

---

## Crédits

Développé par **A.Kamara**
"# VapeDown" 
