---
title: Performance & Resource Blocking
description: Maximize scraping speed and reduce network bandwidth by blocking heavy media and tracking scripts.
---

# ⚡ Performance & Resource Blocking

Scraping data or running headless end-to-end tests often wastes time and bandwidth loading megabytes of heavy media files, custom fonts, video streams, and tracking scripts.

**Browser Automation CLI** lets you block these resources directly at the network layer via Chrome DevTools Protocol.

---

## 🚫 Resource Blocking in Workflows

Add a `block` step at the start of your workflow to prevent Chrome from fetching specific resource types:

```json
{
  "name": "High-Speed Article Scraper",
  "startUrl": "https://news.ycombinator.com",
  "steps": [
    {
      "action": "block",
      "types": ["image", "font", "media", "stylesheet"]
    },
    {
      "action": "goto",
      "url": "https://news.ycombinator.com"
    }
  ]
}
```

### Supported Resource Types

| Type | What is Blocked | Typical Speedup |
| :--- | :--- | :--- |
| `"image"` | `.png`, `.jpg`, `.webp`, `.svg`, `.gif` | **3x – 5x faster** |
| `"font"` | `.woff`, `.woff2`, `.ttf`, web font requests | **1.5x faster** |
| `"media"` | `<video>`, `<audio>`, streaming chunks | **5x – 10x faster** |
| `"stylesheet"` | `.css` files (ideal for pure text/data scrapers) | **2x faster** |
| `"script"` | Third-party analytics, ads, trackers | **3x faster** |

---

## 💬 Blocking Resources in REPL

In the interactive REPL, toggle blocking with a single command:

```text
cdp> block image font
✓ Blocked resources: image, font

cdp> goto https://cnn.com
✓ Loaded in 310ms (saving 14MB of assets!)
```

---

## 📊 Measuring Real-time Metrics

You can inspect JavaScript Heap size, DOM node count, and layout calculations using `page.getMetrics()`:

```json
{
  "action": "eval",
  "script": "performance.memory ? performance.memory.usedJSHeapSize : 0",
  "as": "heapBytes"
}
```

Or from the REPL:
```text
cdp> metrics

Performance Metrics:
  JS Heap Used: 4.12 MB
  DOM Nodes:    142
  Layout Count: 4
```
