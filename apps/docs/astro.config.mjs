// @ts-check

import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightThemeRapide from "starlight-theme-rapide";

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: "Browser Automation CLI",
			description:
				"Browser Automation for Humans — Ultra-lightweight, zero-bloat CLI and visual recording studio powered by direct Chrome DevTools Protocol and Bun.",
			plugins: [starlightThemeRapide()],
			social: [
				{
					icon: "github",
					label: "GitHub",
					href: "https://github.com/KhBayazidAhmed/browser-automation-cli",
				},
			],
			sidebar: [
				{
					label: "Getting Started",
					items: [
						{ label: "Introduction", slug: "getting-started/introduction" },
						{
							label: "Quick Start (The Easy Way)",
							slug: "getting-started/quick-start",
							badge: { text: "Start Here", variant: "tip" },
						},
						{ label: "Installation & Setup", slug: "getting-started/installation" },
					],
				},
				{
					label: "Core Guides",
					items: [
						{
							label: "Interactive Studio Wizard",
							slug: "guides/interactive-studio",
							badge: { text: "Easy Mode", variant: "success" },
						},
						{ label: "Visual Live Recorder & HUD", slug: "guides/recorder" },
						{ label: "Smart Data & List Extraction", slug: "guides/data-extraction" },
						{ label: "Assertions & Validation", slug: "guides/assertions" },
						{
							label: "Virtual Webcam Injection",
							slug: "guides/virtual-webcam",
							badge: { text: "New", variant: "note" },
						},
						{ label: "Live Config Inspector Drawer", slug: "guides/config-drawer" },
						{ label: "Workflow Execution & Replay", slug: "guides/workflows" },
						{ label: "Interactive Browser REPL", slug: "guides/repl" },
						{ label: "Built-in Programmatic Tasks", slug: "guides/tasks" },
					],
				},
				{
					label: "Deep Dive & Locators",
					items: [
						{ label: "Human-Centric Text Locators", slug: "deep-dive/locators" },
						{ label: "Performance & Resource Blocking", slug: "deep-dive/performance" },
					],
				},
				{
					label: "Reference & Tooling",
					items: [
						{ label: "CLI Commands & Flags", slug: "reference/cli-commands" },
						{ label: "Workflow JSON Schema", slug: "reference/workflow-schema" },
						{ label: "Process Cleanup & Troubleshooting", slug: "reference/troubleshooting" },
					],
				},
			],
		}),
	],
});
