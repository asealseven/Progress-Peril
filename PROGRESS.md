# PROGRESS.md

## Done

### Milestone 0: Project setup

- Vite, TypeScript in strict mode, Phaser 4.2.1, Vitest and `vite-plugin-pwa`.
- npm scripts: `dev`, `dev:phone`, `build`, `preview`, `test`, `typecheck`.
- Self-hosted fonts through Fontsource: IM Fell English, Alegreya Sans, Caveat.
- Boot scene with the title on parchment.
- Web app manifest, service worker precache, landscape orientation, rotate prompt.
- GitHub Actions workflow: typecheck, test and build on every push, deploy to GitHub Pages from `main`.

## Known issues

- Phone checks ran in an emulated phone viewport only. No test on a physical phone yet.
- ART_PROMPTS.md is missing from the build pack. Asset folders follow the CLAUDE.md example until the file arrives.

## Next step

Milestone 1: First playable combat.
