// @ts-check

import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: "Browser Automation CLI",
			description:
				"Browser Automation for Humans — Ultra-lightweight, zero-bloat CLI and visual recording studio powered by CDP and Bun.",
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
						{ label: "Quick Start", slug: "getting-started/quick-start" },
					],
				},
				{
					label: "User Guides",
					items: [
						{ label: "Interactive Studio (The Easy Way)", slug: "guides/interactive-studio" },
						{ label: "Visual Live Recorder", slug: "guides/recorder" },
						{ label: "Workflow Execution", slug: "guides/workflows" },
						{ label: "Interactive Browser REPL", slug: "guides/repl" },
						{ label: "Built-in Tasks", slug: "guides/tasks" },
					],
				},
				{
					label: "Reference",
					items: [
						{ label: "CLI Commands & Flags", slug: "reference/cli-commands" },
						{ label: "Workflow JSON Schema", slug: "reference/workflow-schema" },
					],
				},
			],
		}),
	],
});
