# Bflow Documentation Site

Documentation site for **Bflow**, built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build).

## Cloudflare Pages

The Pages project is named `browser-automation-cli` and deploys to `https://browser-automation-cli.bixbd.com`.

Authenticate once and create the Direct Upload project:

```bash
bunx wrangler login
bun run docs:pages:create
```

Deploy the production docs and public installers:

```bash
bun run docs:deploy
```

After the first deployment, add `browser-automation-cli.bixbd.com` under the Pages project's **Custom domains** settings in the Cloudflare dashboard.

## 🚀 Running the Documentation Locally

From the root repository:

```bash
bun --filter apps-docs dev
```

Or from within `apps/docs`:

```bash
cd apps/docs
bun dev
```

Open [http://localhost:4321](http://localhost:4321) to view the documentation site in your browser.

## 🏗 Building for Production

```bash
bun --filter apps-docs build
```

The production output will be generated in `apps/docs/dist/`.

## 📁 Content Structure

- `src/content/docs/index.mdx` — Landing page with hero and feature grid.
- `src/content/docs/getting-started/` — Introduction and Quick Start guide.
- `src/content/docs/guides/` — Step-by-step guides (Interactive Studio "The Easy Way", Visual Live Recorder, Workflow Replay, REPL, Built-in Tasks).
- `src/content/docs/reference/` — CLI commands, flags, and workflow JSON schema.
