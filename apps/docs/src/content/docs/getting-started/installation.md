---
title: Installation & Setup
description: System requirements, installation steps, and environment configuration.
---

# 📦 Installation & Setup

Setting up **Browser Automation CLI** takes under a minute. There are no heavy browser binaries to download, no WebDriver daemons to install, and no complex configuration files.

---

## 📋 System Requirements

| Requirement | Supported Versions | Notes |
| :--- | :--- | :--- |
| **Bun Runtime** | `v1.1.0` or higher | Recommended `v1.3+`. [Install Bun](https://bun.sh) |
| **Google Chrome / Chromium** | Latest Stable / Canary / Chromium | Auto-detected from default OS paths |
| **Operating System** | macOS (Apple Silicon / Intel), Linux (Ubuntu, Debian, Fedora, Arch), Windows (WSL2 or Native) | Fully cross-platform |

---

## 🛠️ Step-by-Step Installation

### 1. Clone the Repository

```bash
git clone https://github.com/KhBayazidAhmed/browser-automation-cli.git
cd browser-automation-cli
```

### 2. Install Project Dependencies

```bash
bun install
```

This installs Turborepo, Biome linter, and shared TypeScript configurations.

---

## 🔍 Chrome Auto-Discovery

The CLI automatically scans standard system locations for your Chrome or Chromium binary:

- **macOS**:
  - `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
  - `/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary`
  - `/Applications/Chromium.app/Contents/MacOS/Chromium`
- **Linux**:
  - `/usr/bin/google-chrome`
  - `/usr/bin/chromium`
  - `/usr/bin/chromium-browser`
- **Windows**:
  - `C:\Program Files\Google\Chrome\Application\chrome.exe`
  - `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`

> [!TIP]
> You can also specify a custom Chrome path by setting the `CHROME_PATH` environment variable:
> ```bash
> export CHROME_PATH="/custom/path/to/chrome"
> ```

---

## 🧪 Verifying Your Installation

Run the automated test suite to ensure CDP communication and browser spawning work properly:

```bash
bun test
```

You should see 50+ passing tests verifying locators, flow runners, assertion engines, webcam injection, and built-in tasks.

---

## 🚀 Launch the Studio

You are ready to go! Launch the interactive wizard:

```bash
bun cli
# or
bun dev
```
