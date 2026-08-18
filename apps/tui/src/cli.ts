import * as readline from "node:readline";
import { Browser, type Page } from "./cdp/index.js";
import { taskRegistry } from "./tasks/registry.js";

const colors = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	green: "\x1b[32m",
	red: "\x1b[31m",
	yellow: "\x1b[33m",
	cyan: "\x1b[36m",
	blue: "\x1b[34m",
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
					console.log(`\n${colors.bold}Available Commands:${colors.reset}`);
					console.log(
						`  ${colors.cyan}goto <url>${colors.reset}               - Navigate to a webpage`,
					);
					console.log(
						`  ${colors.cyan}title${colors.reset}                    - Print the current page title`,
					);
					console.log(
						`  ${colors.cyan}url${colors.reset}                      - Print the current page URL`,
					);
					console.log(
						`  ${colors.cyan}text <selector>${colors.reset}          - Get text content of an element`,
					);
					console.log(
						`  ${colors.cyan}click <selector>${colors.reset}         - Click an element`,
					);
					console.log(
						`  ${colors.cyan}type <selector> <text>${colors.reset}   - Type text into an input element`,
					);
					console.log(
						`  ${colors.cyan}eval <expression>${colors.reset}        - Evaluate JavaScript in the browser`,
					);
					console.log(
						`  ${colors.cyan}screenshot [file.png]${colors.reset}   - Capture screenshot (default: screenshot.png)`,
					);
					console.log(
						`  ${colors.cyan}pdf [file.pdf]${colors.reset}          - Export page as PDF`,
					);
					console.log(
						`  ${colors.cyan}block <images|fonts|css>${colors.reset} - Block resource types for max speed`,
					);
					console.log(
						`  ${colors.cyan}metrics${colors.reset}                  - Display memory and layout metrics`,
					);
					console.log(
						`  ${colors.cyan}tasks${colors.reset}                    - List all available automation tasks`,
					);
					console.log(
						`  ${colors.cyan}task <id> [key=val...]${colors.reset}  - Run an automation task`,
					);
					console.log(
						`  ${colors.cyan}exit / quit${colors.reset}              - Close the browser and exit\n`,
					);
					break;

				case "tasks": {
					console.log(
						`\n${colors.bold}Available Automation Tasks:${colors.reset}`,
					);
					for (const task of taskRegistry.list()) {
						console.log(
							`  ${colors.bold}${colors.cyan}${task.id}${colors.reset} - ${task.name}`,
						);
						console.log(`    ${colors.dim}${task.description}${colors.reset}`);
					}
					console.log();
					break;
				}

				case "task": {
					if (!args[0]) {
						console.log(
							`${colors.red}Usage: task <task-id> [key=value ...]${colors.reset}`,
						);
						break;
					}
					const taskId = args[0];
					const taskArgs: Record<string, string | boolean | number> = {};
					for (let i = 1; i < args.length; i++) {
						const [k, v] = (args[i] ?? "").split("=");
						if (k && v !== undefined) {
							taskArgs[k] =
								v === "true"
									? true
									: v === "false"
										? false
										: isNaN(Number(v))
											? v
											: Number(v);
						}
					}
					await taskRegistry.runTask(taskId, taskArgs, {
						headless: options.headless ?? false,
					});
					break;
				}

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

				case "title": {
					const title = await page.title();
					console.log(`${colors.bold}Title:${colors.reset} ${title}`);
					break;
				}

				case "url": {
					const currentUrl = await page.url();
					console.log(`${colors.bold}URL:${colors.reset} ${currentUrl}`);
					break;
				}

				case "text": {
					if (!argStr) {
						console.log(
							`${colors.red}Usage: text <selector or text="Exact">${colors.reset}`,
						);
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
						console.log(
							`${colors.red}Usage: click <selector or "Exact Text">${colors.reset}`,
						);
						break;
					}
					console.log(`${colors.dim}Clicking "${argStr}"...${colors.reset}`);
					await page.click(argStr);
					console.log(`${colors.green}✓ Clicked: "${argStr}"${colors.reset}`);
					break;
				}

				case "type": {
					const firstSpace = argStr.indexOf(" ");
					if (firstSpace === -1) {
						console.log(
							`${colors.red}Usage: type <selector> <text>${colors.reset}`,
						);
						break;
					}
					const selector = argStr.slice(0, firstSpace);
					const textToType = argStr.slice(firstSpace + 1);
					console.log(
						`${colors.dim}Typing into "${selector}"...${colors.reset}`,
					);
					await page.type(selector, textToType);
					console.log(
						`${colors.green}✓ Typed "${textToType}" into ${selector}${colors.reset}`,
					);
					break;
				}

				case "eval": {
					if (!argStr) {
						console.log(
							`${colors.red}Usage: eval <js_expression>${colors.reset}`,
						);
						break;
					}
					const result = await page.evaluate(argStr);
					console.log(`${colors.bold}Result:${colors.reset}`, result);
					break;
				}

				case "screenshot": {
					const filename = argStr || "screenshot.png";
					console.log(
						`${colors.dim}Capturing screenshot to ${filename}...${colors.reset}`,
					);
					const bytes = await page.screenshot({ path: filename });
					console.log(
						`${colors.green}✓ Saved screenshot (${(bytes.length / 1024).toFixed(1)} KB) to ${filename}${colors.reset}`,
					);
					break;
				}

				case "pdf": {
					const filename = argStr || "page.pdf";
					console.log(
						`${colors.dim}Exporting PDF to ${filename}...${colors.reset}`,
					);
					const bytes = await page.pdf({ path: filename });
					console.log(
						`${colors.green}✓ Saved PDF (${(bytes.length / 1024).toFixed(1)} KB) to ${filename}${colors.reset}`,
					);
					break;
				}

				case "block": {
					const types: any[] = [];
					if (argStr.includes("image") || argStr.includes("img"))
						types.push("image");
					if (argStr.includes("css") || argStr.includes("style"))
						types.push("stylesheet");
					if (argStr.includes("font")) types.push("font");
					if (types.length === 0) types.push("image", "stylesheet", "font");

					await page.blockResources(types);
					console.log(
						`${colors.green}✓ Blocked resources: ${types.join(", ")}${colors.reset}`,
					);
					break;
				}

				case "metrics": {
					const metrics = await page.getMetrics();
					console.log(`\n${colors.bold}Performance Metrics:${colors.reset}`);
					console.log(
						`  JS Heap Used: ${((metrics.JSHeapUsedSize || 0) / 1024 / 1024).toFixed(2)} MB`,
					);
					console.log(`  DOM Nodes:    ${metrics.Nodes ?? "N/A"}`);
					console.log(`  Layout Count: ${metrics.LayoutCount ?? 0}`);
					console.log(`  Documents:    ${metrics.Documents ?? 0}\n`);
					break;
				}

				case "exit":
				case "quit": {
					console.log(`${colors.dim}Closing browser...${colors.reset}`);
					await browser.close();
					process.exit(0);
					break;
				}

				default:
					console.log(
						`${colors.red}Unknown command: "${cmd}". Type "help" for a list of commands.${colors.reset}`,
					);
					break;
			}
		} catch (err: any) {
			console.log(`${colors.red}Error: ${err.message}${colors.reset}`);
		}

		rl.prompt();
	});

	rl.on("close", async () => {
		await browser.close();
		process.exit(0);
	});
}
