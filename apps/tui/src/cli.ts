import * as readline from "node:readline";
import { Browser } from "./cdp/index.js";
import { handleTaskCommand, listTasks, printReplHelp } from "./cli/repl-dispatcher.js";

const colors = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	green: "\x1b[32m",
	red: "\x1b[31m",
	yellow: "\x1b[33m",
	cyan: "\x1b[36m",
	magenta: "\x1b[35m",
};

export async function startRepl(options: { headless?: boolean } = {}) {
	console.log(
		`\n${colors.bold}${colors.cyan}⚡ Launching Chrome for Interactive CDP Session...${colors.reset}`,
	);

	const browser = await Browser.launch({ headless: options.headless ?? false });
	const page = await browser.newPage();

	console.log(
		`${colors.green}✓ Connected to Chrome CDP on port ${browser.launched.port}${colors.reset}`,
	);
	console.log(
		`${colors.dim}Type "help" for a list of commands, or "exit" to quit.${colors.reset}\n`,
	);

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: `${colors.bold}${colors.magenta}cdp>${colors.reset} `,
	});

	rl.prompt();

	rl.on("line", async (line) => {
		const trimmed = line.trim();
		if (!trimmed) {
			rl.prompt();
			return;
		}

		const [cmd, ...args] = trimmed.split(" ");
		const argStr = args.join(" ");

		try {
			switch (cmd?.toLowerCase()) {
				case "help":
					printReplHelp();
					break;
				case "tasks":
					listTasks();
					break;
				case "task":
					await handleTaskCommand(args, options.headless ?? false);
					break;
				case "goto":
				case "open": {
					if (!argStr) {
						console.log(`${colors.red}Usage: goto <url>${colors.reset}`);
						break;
					}
					const url = argStr.startsWith("http") ? argStr : `https://${argStr}`;
					console.log(`${colors.dim}Navigating to ${url}...${colors.reset}`);
					const start = performance.now();
					await page.goto(url);
					console.log(
						`${colors.green}✓ Loaded${colors.reset} ${colors.dim}(${Math.round(performance.now() - start)}ms)${colors.reset}`,
					);
					break;
				}
				case "title":
					console.log(`${colors.bold}Title:${colors.reset} ${await page.title()}`);
					break;
				case "url":
					console.log(`${colors.bold}URL:${colors.reset} ${await page.url()}`);
					break;
				case "text": {
					if (!argStr) {
						console.log(`${colors.red}Usage: text <selector>${colors.reset}`);
						break;
					}
					const text = await page.getText(argStr);
					console.log(
						`${colors.bold}Text [${argStr}]:${colors.reset} ${text ?? "(element not found)"}`,
					);
					break;
				}
				case "click": {
					if (!argStr) {
						console.log(`${colors.red}Usage: click <selector>${colors.reset}`);
						break;
					}
					await page.click(argStr);
					console.log(`${colors.green}✓ Clicked: "${argStr}"${colors.reset}`);
					break;
				}
				case "type": {
					const firstSpace = argStr.indexOf(" ");
					if (firstSpace === -1) {
						console.log(`${colors.red}Usage: type <selector> <text>${colors.reset}`);
						break;
					}
					const selector = argStr.slice(0, firstSpace);
					const textToType = argStr.slice(firstSpace + 1);
					await page.type(selector, textToType);
					console.log(`${colors.green}✓ Typed into ${selector}${colors.reset}`);
					break;
				}
				case "eval": {
					if (!argStr) {
						console.log(`${colors.red}Usage: eval <js_expression>${colors.reset}`);
						break;
					}
					const result = await page.evaluate(argStr);
					console.log(`${colors.bold}Result:${colors.reset}`, result);
					break;
				}
				case "screenshot": {
					const filename = argStr || "screenshot.png";
					const bytes = await page.screenshot({ path: filename });
					console.log(
						`${colors.green}✓ Saved screenshot (${(bytes.length / 1024).toFixed(1)} KB) to ${filename}${colors.reset}`,
					);
					break;
				}
				case "pdf": {
					const filename = argStr || "page.pdf";
					const bytes = await page.pdf({ path: filename });
					console.log(
						`${colors.green}✓ Saved PDF (${(bytes.length / 1024).toFixed(1)} KB) to ${filename}${colors.reset}`,
					);
					break;
				}
				case "block": {
					const types: any[] = [];
					if (argStr.includes("image") || argStr.includes("img")) types.push("image");
					if (argStr.includes("css") || argStr.includes("style")) types.push("stylesheet");
					if (argStr.includes("font")) types.push("font");
					if (types.length === 0) types.push("image", "stylesheet", "font");
					await page.blockResources(types);
					console.log(`${colors.green}✓ Blocked resources: ${types.join(", ")}${colors.reset}`);
					break;
				}
				case "metrics": {
					const metrics = await page.getMetrics();
					console.log(`\n${colors.bold}Performance Metrics:${colors.reset}`);
					console.log(
						`  JS Heap Used: ${((metrics.JSHeapUsedSize || 0) / 1024 / 1024).toFixed(2)} MB`,
					);
					console.log(`  DOM Nodes:    ${metrics.Nodes ?? "N/A"}`);
					console.log(`  Layout Count: ${metrics.LayoutCount ?? 0}\n`);
					break;
				}
				case "exit":
				case "quit":
					await browser.close();
					process.exit(0);
					break;
				default:
					console.log(`${colors.red}Unknown command: "${cmd}". Type "help".${colors.reset}`);
					break;
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			console.log(`${colors.red}Error: ${msg}${colors.reset}`);
		}

		rl.prompt();
	});

	rl.on("close", async () => {
		await browser.close();
		process.exit(0);
	});
}
