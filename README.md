# HKDBF Inventory

A GitHub Pages-ready inventory tracker for the Hong Kong Dragon Boat Festival in Queens, NY. It starts from the 2026 closing inventory, organizes equipment by location, and records year-specific additions and removals.

## Project layout

- `scripts/clean_inventory.py` — **file 1**: imports and cleans the original CSV into the baseline inventory.
- `data/changes.json` — **file 2**: the committed annual-change ledger. It contains the requested 2026 changes and an empty 2027 year.
- `index.html`, `app.js`, and `styles.css` — **file 3**: the interactive website.

## What was cleaned

The import script skips the title row, empty rows, and section headings. Empty locations become `Annex`; quantity expressions become whole numbers (`≈ 1` → `1`, `1+3` → `4`, and `6,6` → `12`). The boat heading is converted to one inventory item: **17 boats** with the note “12 Simons, 4 Swifts, 1 Wooden.” Items with no stated count are retained as `0` and flagged in their details.

The first baseline was generated from the supplied CSV. It has 147 tracked item lines.

## Run locally

The app needs a simple local server because browsers block `fetch()` from `file://` pages.

```bash
cd /Users/aronya.sw/Documents/Codex/2026-09-12/take-this-document-and-complete-this
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000).

## Use the tracker

1. Choose a location card.
2. Choose `2026` or `2027` from **Editing year**.
3. Use `−` and `+`, or type a number into the adjustment field. The selected year’s net change and current total update immediately.
4. Hover the `?` beside an item for its original comments.
5. Use **Add inventory** or **Add item here** for new stock, including a new location and optional comments.
6. Download a backup periodically.

The deployed static site saves edits in the browser's local storage. This means it is private to that browser and cannot write directly back into your GitHub repository. The starting data and the shareable ledger live in `data/inventory.json` and `data/changes.json`. For long-term team records, download the backup and commit its relevant changes to those files, or later connect the site to a database/API.

## Update the base inventory from a new CSV

Do this only when you want to replace the starting inventory, not for normal annual adjustments:

```bash
python3 scripts/clean_inventory.py "/full/path/to/new-closing-inventory.csv"
```

## Publish with GitHub Pages

1. Create an empty GitHub repository, for example `hkdbf-inventory`.
2. In this folder, run:

   ```bash
   git init
   git add .
   git commit -m "Create HKDBF inventory tracker"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/hkdbf-inventory.git
   git push -u origin main
   ```

3. On GitHub, open the repository’s **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, choose `main`, and choose `/ (root)`. Save.
5. GitHub will show the public website URL after deployment, usually `https://YOUR-USERNAME.github.io/hkdbf-inventory/`.

No server, database, or paid hosting is needed for this version.
