---
title: Smart Data & List Extraction
description: Extract single text fields, attributes, and repeating card/table grids with zero code.
---

# 📊 Smart Data & List Extraction

**Bflow** makes scraping web data visual and effortless. Whether you want to grab a single product title, capture an image URL, or scrape 100 rows from a paginated table, you can do it with point-and-click ease.

---

## 🔍 Single Value & Attribute Extraction

To extract a single element's value:

1. During a visual recording session (`bun record ...`), press the **🔍 Extract** button on the floating HUD (or hold `Shift` and click any element on the page).
2. An in-page modal will appear:
   - **Variable Name**: Enter the identifier where the data should be stored (e.g. `pageTitle`, `pricingPlan`).
   - **Target Attribute**: Choose what data to extract:
     - `text` / `innerText` — The visible text inside the element.
     - `href` — The destination URL of a link (`<a>`).
     - `src` — The image source URL (`<img>`).
     - `value` — Current input value (`<input>`, `<textarea>`).
     - `alt` / `title` / `aria-label` — Accessibility attributes.
   - **Extract All Matching**: Check this box if you want an array of strings from all matching elements.
3. Click **Save Extraction**.

```json
{
  "action": "extract",
  "selector": "h1.product-title",
  "as": "mainHeading",
  "attribute": "text"
}
```

---

## 📈 Smart List & Repeating Grid Extraction

Extracting entire catalogs, product lists, or data tables is traditionally tedious. With Bflow's **Smart Pattern Detector**, you only need to select **one** card or row.

### How It Works

1. Click the **📊 List** button on the in-page HUD.
2. Hover over any repeating card or table row — the recorder highlights similar sibling elements in real time.
3. Click the item. The modal opens showing detected repeating fields:
   - **Container Selector**: Auto-detected common container (e.g. `.athing`, `.product-card`, `tr.row`).
   - **Output Variable**: Array name (e.g. `topStories`, `products`).
   - **Limit**: Max number of items to collect (e.g. `10`, `50`, or leave blank for all).
   - **Field Mappings**: Map nested sub-selectors (e.g. `title` -> `.titleline > a`, `url` -> `.titleline > a@href`, `points` -> `.score`).
4. Click **Confirm & Extract**.

```json
{
  "action": "extractMultiple",
  "containerSelector": ".product-card",
  "as": "products",
  "limit": 20,
  "fields": {
    "title": "h3.title",
    "price": ".price-tag",
    "productUrl": "a.link@href",
    "thumbnail": "img@src"
  }
}
```

> [!TIP]
> Use the `@attribute` syntax in field mappings (e.g., `a@href` or `img@src`) to extract HTML attributes directly instead of inner text.

---

## 💾 Saving & Exporting Data

At the end of your workflow, save the extracted data directly to disk in JSON or CSV format:

```json
{
  "action": "save",
  "path": "output/scraped-products.json",
  "format": "json"
}
```

When the workflow runs, two output files are generated in `output/`:
1. `flow-<name>-data.json` — A clean, structured JSON object containing only your extracted variables and arrays.
2. `flow-<name>-result.json` — A complete execution audit log with step-by-step millisecond timings, statuses, and debug telemetry.
