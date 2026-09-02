---
title: Installation & Setup
description: System requirements, installation steps, and environment configuration.
---

# 📦 Installation & Setup

Setting up **Bflow** takes under a minute. There are no heavy browser binaries to download, no WebDriver daemons to install, and no complex configuration files.

---

## 📋 System Requirements

| Requirement | Supported Versions | Notes |
| :--- | :--- | :--- |
| **Bun Runtime** | Not required for releases | Source development uses Bun `v1.3.12`. [Install Bun](https://bun.sh) |
| **Chromium-based browser** | Google Chrome, Chromium, Brave, or Microsoft Edge | Auto-detected from standard OS paths |
| **Operating System** | macOS (Apple Silicon / Intel), Linux (Ubuntu, Debian, Fedora, Arch), Windows (WSL2 or Native) | Fully cross-platform |

---

## 🛠️ Install a Release

macOS and Linux:

```bash
curl -fsSL https://browser-automation-cli.bixbd.com/install.sh | sh
```

Windows PowerShell:

```powershell
irm https://browser-automation-cli.bixbd.com/install.ps1 | iex
```

The installer detects the operating system and CPU architecture, verifies the release checksum, installs in a user-owned directory, and adds that directory to `PATH`. Open a new terminal if `bflow` is not immediately available.

Set `BFLOW_VERSION` to install a particular tag (with or without the leading `v`) and `BFLOW_INSTALL_DIR` to override the user-owned destination. `BFLOW_REPOSITORY` can point the installer at a compatible fork.

```bash
bflow --version
bflow
```

To uninstall on macOS/Linux, remove the installed `bflow` file and the installer-marked PATH entry from your shell configuration. On Windows, remove the installation directory (default `%LOCALAPPDATA%\Programs\bflow`) and its user PATH entry.

## 🧑‍💻 Install From Source

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
  - `/Applications/Chromium.app/Contents/MacOS/Chromium`
  - `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`
  - `/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`
- **Linux**:
  - `/usr/bin/google-chrome`
  - `/usr/bin/chromium`
  - `/usr/bin/chromium-browser`
  - `/usr/bin/brave-browser`
  - `/usr/bin/microsoft-edge-stable`
  - `/opt/google/chrome/google-chrome`
  - `/snap/bin/chromium`
- **Windows**:
  - Chrome, Edge, Brave, and Chromium under `Program Files`, `Program Files (x86)`, or `LocalAppData`

> [!TIP]
> You can also specify a custom Chrome path by setting the `CHROME_PATH` environment variable:
> ```bash
> export CHROME_PATH="/custom/path/to/chrome"
> ```

---

## 🧪 Verifying Your Installation

For a source checkout, run the automated test suite to ensure CDP communication and browser spawning work properly:

```bash
bun test
```

You should see 50+ passing tests verifying locators, flow runners, assertion engines, webcam injection, and built-in tasks.

---

## 🚀 Launch the Studio

For standalone binary installations:

```bash
bflow
```

For monorepo source development:

```bash
bun cli
```

> [!NOTE]
> `bun dev` starts all development workspaces across the monorepo, including the documentation site. Use `bun cli` when you want to run the automation studio standalone in a source checkout.

---

## 📦 Building a Standalone Executable

The release builder compiles the CLI into a single zero-dependency executable and embeds the supplied version:

```bash
# Build standalone binary for current or cross-platform target
bun run build:release bun-darwin-arm64 dist/bflow 0.1.0

# Verify compiled binary
./dist/bflow --version
```

Supported target names are:
- `bun-darwin-arm64` (macOS Apple Silicon)
- `bun-darwin-x64` (macOS Intel)
- `bun-linux-arm64` (Linux ARM64 / glibc)
- `bun-linux-arm64-musl` (Linux ARM64 / musl, e.g., Alpine)
- `bun-linux-x64-baseline` (Linux x64 / glibc)
- `bun-linux-x64-musl` (Linux x64 / musl, e.g., Alpine)
- `bun-windows-arm64` (Windows ARM64)
- `bun-windows-x64-baseline` (Windows x64)

Source checkouts report the version as `development`; compiled standalone releases report their embedded version number (e.g. `bflow 0.1.0`).

All workflow paths (`workflows/`) and execution outputs (`output/`) are resolved relative to the current working directory from which `bflow` or `bun cli` is executed.
