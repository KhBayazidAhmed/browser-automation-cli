import { join } from "node:path";
import type { TaskDefinition } from "../types.js";

export const scrapeHnTask: TaskDefinition = {
	id: "scrape-hn",
	name: "Hacker News Scraper",
	description: "Scrapes top stories from Hacker News and exports them as JSON",
	params: [
		{
			name: "limit",
			description: "Number of stories to extract (default: 10)",
			default: 10,
		},
		{
			name: "blockMedia",
			description: "Block images/fonts/css for maximum speed",
			default: true,
		},
	],
	async run({ page, args, log, outputDir }) {
		const limit = Number(args.limit || 10);
		const blockMedia = args.blockMedia !== false;

		if (blockMedia) {
			log.info("Blocking images and fonts for maximum scraping speed...");
			await page.blockResources(["image", "font", "media"]);
		}

		log.info("Navigating to https://news.ycombinator.com...");
		const navStart = performance.now();
		await page.goto("https://news.ycombinator.com");
		log.success(`Page loaded in ${Math.round(performance.now() - navStart)}ms`);

		log.info(`Extracting top ${limit} stories...`);
		const stories = await page.evaluate((maxCount) => {
			const rows = Array.from(document.querySelectorAll("tr.athing"));
			return rows.slice(0, maxCount).map((row) => {
				const id = row.getAttribute("id") || "";
				const titleEl = row.querySelector("span.titleline > a") as HTMLAnchorElement | null;
				const subtext = row.nextElementSibling;
				const scoreEl = subtext?.querySelector(".score");
				const authorEl = subtext?.querySelector(".hnuser");

				return {
					id,
					title: titleEl?.innerText || "",
					url: titleEl?.href || "",
					score: scoreEl?.textContent || "0 points",
					author: authorEl?.textContent || "unknown",
				};
			});
		}, limit);

		log.success(`Extracted ${stories.length} stories!`);

		const jsonPath = join(outputDir, "hn-stories.json");
		await Bun.write(jsonPath, JSON.stringify(stories, null, 2));
		log.success(`Saved JSON output to: ${jsonPath}`);

		return {
			count: stories.length,
			stories,
			savedTo: jsonPath,
		};
	},
};
