---
title: Smart Data & List Extraction
description: Extract single text fields, attributes, and repeating card/table grids with zero code.
---

# 📊 Smart Data & List Extraction

**Bflow** makes extracting structured web data visual and effortless. Whether you want to grab a single product title, capture an image URL, or scrape hundreds of rows from a catalog or paginated table, you can do it with point-and-click ease.

---

## 🔍 Single Value & Attribute Extraction (`extract`)

To extract a single element's value:

1. During a visual recording session (`bflow record ...` / `bun record ...`), click **Add step ▾ → Extract value** on the floating HUD (or hold `Shift` and click any element on the page).
2. Enter the target variable name (e.g. `pageTitle`, `pricingPlan`).
3. The recorder automatically captures the element text or attribute.

### Step Schema & Options

```json
{
  "name": "Extract article title",
  "action": "extract",
  "selector": "h1.product-title",
  "as": "mainHeading",
  "attribute": "text",
  "all": false,
  "timeout": 5000
}
```

| Property | Type | Description |
| :--- | :--- | :--- |
| `selector` | `string` | CSS selector or human text locator. |
| `as` | `string` | Variable name to store the extracted result. |
| `attribute` | `string` | Target attribute: `text` (default), `innerText`, `href`, `src`, `value`, `aria-label`, etc. |
| `all` | `boolean` | When `true`, returns an array of strings (`string[]`) for every matching element on the page. |
| `frame` | `string` | Optional child iframe identifier. |
| `timeout` | `number` | Maximum time to wait for the element to appear in milliseconds. |

---

## 📈 Smart List & Repeating Grid Extraction (`extractMultiple`)

Extracting entire product catalogs, search result feeds, or data tables is traditionally tedious. With Bflow's **Smart Pattern Detector**, you only need to select **one** card or row.

### How It Works

1. Click **Add step ▾ → Extract list** on the in-page HUD.
2. Hover over any repeating card or table row — the recorder highlights similar sibling elements in real time.
3. Click the item. The modal opens with auto-detected repeating fields:
   - **Container Selector**: Auto-detected common container (e.g. `.product-card`, `tr.athing`, `li.result-item`).
   - **Output Variable**: Array variable name (e.g. `products`, `topStories`).
   - **Limit**: Maximum number of items to collect (e.g. `20`, `100`, or omit for all).
   - **Field Mappings**: Map nested sub-selectors (e.g. `title` → `h3.title`, `link` → `a@href`, `image` → `img@src`).
4. Click **Save Extraction**.

### Step Schema & Options

```json
{
  "name": "Extract product list",
  "action": "extractMultiple",
  "containerSelector": ".product-card",
  "as": "products",
  "limit": 25,
  "fields": {
    "title": "h3.title",
    "price": ".price-tag",
    "productUrl": "a.link@href",
    "thumbnail": "img.photo@src"
  },
  "filterText": "In Stock",
  "filterIgnoreCase": true
}
```

| Property | Type | Description |
| :--- | :--- | :--- |
| `containerSelector` | `string` | Selector for repeating item containers. |
| `as` | `string` | Output variable name storing the array of objects. |
| `fields` | `Record<string, string>` | Key-value pairs mapping property names to CSS sub-selectors. Append `@attribute` (e.g. `a@href`, `img@src`) to extract attributes instead of inner text. |
| `limit` | `number` | Maximum number of matching containers to extract. |
| `filterText` | `string` | Substring filter: only containers containing this text are extracted. |
| `filterIgnoreCase` | `boolean` | Case-insensitive matching for `filterText`. |
| `filterRegex` | `string` | Regular expression filter for container text. |
| `frame` | `string` | Optional child iframe identifier. |

---

## 💾 Saving & Exporting Data (`save`)

At the end of your workflow, export extracted variables and lists to disk in JSON or CSV format:

```json
{
  "name": "Export scraped dataset",
  "action": "save",
  "path": "{{outputDir}}/scraped-products.json",
  "format": "json"
}
```

To export as a spreadsheet-compatible CSV:

```json
{
  "name": "Export scraped dataset as CSV",
  "action": "save",
  "path": "output/products.csv",
  "format": "csv"
}
```

---

## 🔐 Sensitive Data Protection

When running with external data or sensitive workflows, columns flagged as sensitive (such as passwords, social security numbers, or auth tokens) are automatically redacted from saved output files (`save`), execution traces, and audit logs.
