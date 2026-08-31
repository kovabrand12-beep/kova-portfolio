# Kova — Portfolio

Portfolio site for Kova, a small web design/development studio.

## What this is

The projects under `/demos` are **self-directed concept builds**, not paid client work. Each one demonstrates a different kind of site a real client might commission (restaurant, SaaS landing page, e-commerce catalog, photography portfolio). They're labeled as concept projects on the site itself and in each project's footer.

## Structure

- `index.html` / `assets/main.css` — the main portfolio site
- `demos/bloom-cafe/` — restaurant marketing site (vanilla HTML/CSS)
- `demos/pulseops/` — SaaS product landing page (vanilla HTML/CSS)
- `demos/verde-goods/` — e-commerce catalog with a working add-to-cart UI (HTML/CSS/JS)
- `demos/atelier-noor/` — dark-mode photography portfolio (vanilla HTML/CSS)

No build step — every page is static HTML/CSS/JS and can be opened directly or served as-is (e.g. via GitHub Pages).

## Running locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
