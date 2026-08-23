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

For a release installation, launch the interactive wizard:

```bash
bflow
```

For a source checkout:

```bash
bun cli
```

`bun dev` starts all development workspaces, including the docs site. Use `bun cli` for the automation studio alone.

## 📦 Building a Standalone Executable

The release builder compiles the CLI into a single executable and embeds the supplied version:

```bash
bun run build:release bun-darwin-arm64 dist/bflow 0.1.0
./dist/bflow --version
```

Supported target names are `bun-darwin-arm64`, `bun-darwin-x64`, `bun-linux-arm64`, `bun-linux-arm64-musl`, `bun-linux-x64-baseline`, `bun-linux-x64-musl`, `bun-windows-arm64`, and `bun-windows-x64-baseline`. Source runs report the version as `development`; compiled releases report the embedded version.

Workflow and output paths are resolved from the current working directory. This keeps `workflows/` and `output/` beside the project that invokes either the source CLI or standalone executable.
