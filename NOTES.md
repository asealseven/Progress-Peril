# NOTES.md

Gap decisions. Each entry names the GDD section, the gap and the rule chosen.

## Milestone 0

- **GDD 15.1, colours.** CLAUDE.md gives the hex values. They live in `src/data/palette.ts`.
- **GDD 15.2, safe areas.** The game container sits inside the CSS safe-area insets, so the canvas never draws under a notch.
- **GDD 3.5, horizontal orientation.** A CSS overlay shows the rotate prompt on touch devices in vertical orientation. The web app manifest requests landscape.
- **GDD 15.12, hosting.** The build uses relative paths, so the same `dist/` works at a domain root and under a GitHub Pages sub-path.
- **CLAUDE.md, folder layout.** `src/data` gains three small files not named in the layout: `palette.ts`, `fonts.ts` and `screen.ts`. Each holds constants from CLAUDE.md tables.
