# Progress & Peril

The Age of Invention. Every discovery has a consequence.

A top-down arena roguelike for the browser, on PC and phone. A personal, non-commercial project.

- `GDD.md`: the game design document and source of truth.
- `CLAUDE.md`: the build guide and milestone plan.
- `PROGRESS.md`: milestone status.
- `NOTES.md`: decisions made where the design document leaves a gap.

## Commands

```
npm install
npm run dev          # local development server
npm run dev:phone    # same server on the local network, for a phone
npm run build        # production build into dist/
npm run preview      # serve the production build locally
npm run test         # Vitest, single run
npm run typecheck    # tsc --noEmit
```

## Phone install

Pushes to `main` build and publish `dist/` to GitHub Pages. Enable Pages once under Settings, Pages, Source: GitHub Actions. Open the Pages address on the phone and add the game to the home screen.
