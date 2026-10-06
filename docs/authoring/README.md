# Authoring helpers (not part of the storefront)

The pages in the project root are plain static HTML. These helpers only regenerate them.

- `src/` — page sources. `{{HEADER}}` / `{{FOOTER}}` are replaced with `src/_header.html` / `src/_footer.html` (the icon sprite is inlined from `assets/img/icons.svg`), and `{{CARDS:slug,slug}}` with sample product cards.
- `python build.py` rebuilds every page plus `partials/` (header/footer stay byte-identical; only the active-nav class differs). `python gen_policies.py` regenerates the four policy page sources.
- `tools/` — QA and screenshot scripts (Puppeteer). Install once with `npm i` inside `tools/`, serve the project root on `http://127.0.0.1:8765` (e.g. `python -m http.server 8765`), then run `node qa.js all` or `node final-shots.js`.

The developer does not need any of this to integrate the frontend.
