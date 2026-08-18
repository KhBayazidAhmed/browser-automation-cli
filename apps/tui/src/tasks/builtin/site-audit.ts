import { join } from "node:path";
import type { TaskDefinition } from "../types.js";

export const siteAuditTask: TaskDefinition = {
	id: "site-audit",
	name: "Website Health & DOM Audit",
	description: "Audits a website for speed, DOM metrics, SEO tags, and captures a screenshot",
	params: [
		{
			name: "url",
			description: "Website URL to audit (e.g. https://github.com)",
			default: "https://example.com",
		},
		{
			name: "screenshot",
			description: "Whether to capture screenshot (default: true)",
			default: true,
		},
	],
	async run({ page, args, log, outputDir }) {
		const rawUrl = String(args.url || "https://example.com");
		const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

		log.info(`Auditing target URL: ${url}`);
		const navStart = performance.now();
		await page.goto(url, { waitUntil: "domcontentloaded" });
		const loadTimeMs = Math.round(performance.now() - navStart);

		log.info("Analyzing DOM structure and SEO tags...");
		const auditData = await page.evaluate(() => {
			const title = document.title;
			const metaDescription =
				document.querySelector('meta[name="description"]')?.getAttribute("content") ||
				document.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
				"";

			const h1s = Array.from(document.querySelectorAll("h1")).map((h) => h.innerText.trim());
			const h2s = Array.from(document.querySelectorAll("h2")).map((h) => h.innerText.trim());
			const linksCount = document.querySelectorAll("a").length;
			const imagesCount = document.querySelectorAll("img").length;
			const scriptsCount = document.querySelectorAll("script").length;

			return {
				title,
				metaDescription,
				h1Count: h1s.length,
				h1s,
				h2Count: h2s.length,
				h2s: h2s.slice(0, 5),
				linksCount,
				imagesCount,
				scriptsCount,
			};
		});

		log.info("Collecting Chrome memory & layout metrics...");
		const metrics = await page.getMetrics();
		const heapUsedMb = metrics.JSHeapUsedSize
			? Number((metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2))
			: 0;

		let screenshotFile = "";
		if (args.screenshot !== false) {
			const sanitizedHost = new URL(url).hostname.replace(/[^a-z0-9]/gi, "_");
			screenshotFile = join(outputDir, `audit-${sanitizedHost}.png`);
			log.info(`Capturing screenshot to ${screenshotFile}...`);
			await page.screenshot({ path: screenshotFile });
			log.success("Screenshot saved successfully!");
		}

		const report = {
			url,
			timestamp: new Date().toISOString(),
			performance: {
				loadTimeMs,
				jsHeapUsedMb: heapUsedMb,
				domNodes: metrics.Nodes ?? 0,
				layoutCount: metrics.LayoutCount ?? 0,
			},
			content: auditData,
			screenshot: screenshotFile || null,
		};

		const reportPath = join(
			outputDir,
			`audit-${new URL(url).hostname.replace(/[^a-z0-9]/gi, "_")}.json`,
		);
		await Bun.write(reportPath, JSON.stringify(report, null, 2));
		log.success(`Audit report generated: ${reportPath}`);

		return report;
	},
};
