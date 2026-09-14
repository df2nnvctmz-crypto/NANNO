# NANNO

Biotech design studio website — a static, multi-page marketing site for a scientific illustration studio.

## Pages

- `index.html` — home. A single fixed hero (no scrolling by design).
- `work.html` — selected work, a 6-project portfolio grid.
- `process.html` — process & services (how the studio works, and what it draws).
- `studio.html` — about the studio.
- `start-a-project.html` — contact form with a live, interactive price estimator.

## Stack

Plain HTML/CSS/JS, no build step and no dependencies.

- `css/styles.css` — design tokens (ported from a "Modernist" design system) and all page styles.
- `js/main.js` — shared interactions: scroll reveals, character-split text parallax, and the custom cursor/lens effect on project hover.
- `js/calculator.js` — the price estimator logic on the Start a Project page.

## Running locally

Any static file server works, e.g.:

```bash
npx serve .
```

Then open the printed local URL.

## Design source

`design-handoff/` contains the original Claude Design export this site was built from, kept for reference.
