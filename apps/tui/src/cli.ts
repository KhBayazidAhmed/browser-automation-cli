import * as readline from "node:readline";
import { Browser, type Frame } from "./cdp/index.js";
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

export async function startRepl(
	options: { headless?: boolean; userDataDir?: string; profileDirectory?: string } = {},
) {
	console.log(
		`\n${colors.bold}${colors.cyan}⚡ Launching Chrome for Interactive CDP Session...${colors.reset}`,
	);
	const browser = await Browser.launch({
		headless: options.headless ?? false,
		userDataDir: options.userDataDir,
		profileDirectory: options.profileDirectory,
	});
	const page = await browser.newPage();
	let activeFrame: Frame | null = null;

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
	let resolveCompletion: (() => void) | undefined;
	const completion = new Promise<void>((resolve) => {
		resolveCompletion = resolve;
	});
	let isClosing = false;
	let isExecuting = false;

	const updatePrompt = () => {
		const label = activeFrame ? ` [frame:${activeFrame.name || activeFrame.id.slice(-6)}]` : "";
		rl.setPrompt(`${colors.bold}${colors.magenta}cdp${label}>${colors.reset} `);
	};

	rl.prompt();

	rl.on("line", async (line) => {
		const trimmed = line.trim();
		if (!trimmed) {
			rl.prompt();
			return;
		}
		if (isExecuting) return;
		isExecuting = true;
		rl.pause();
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
				case "frames": {
					const allFrames = page.frames();
					console.log(`\n${colors.bold}Active Frames (${allFrames.length}):${colors.reset}`);
					allFrames.forEach((f, idx) => {
						const tag = f.isMainFrame() ? " [MAIN]" : "";
						const star = activeFrame?.id === f.id ? `${colors.green}* ${colors.reset}` : "  ";
						console.log(
							`${star}[${idx}] ${colors.cyan}${f.name || f.id}${colors.reset}${tag} -> ${colors.dim}${f.url || "about:blank"}${colors.reset}`,
						);
					});
					console.log();
					break;
				}
				case "frame": {
					if (!argStr) {
						console.log(`${colors.red}Usage: frame <index|id|name|url>${colors.reset}`);
						break;
					}
					const idx = Number.parseInt(argStr, 10);
					const matched =
						!Number.isNaN(idx) && page.frames()[idx] ? page.frames()[idx] : page.frame(argStr);
					activeFrame = matched ?? null;
					if (activeFrame)
						console.log(
							`${colors.green}✓ Switched context to frame: ${activeFrame.name || activeFrame.id}${colors.reset}`,
						);
					else console.log(`${colors.red}Frame not found: "${argStr}"${colors.reset}`);
					updatePrompt();
					break;
				}
				case "main": {
					activeFrame = null;
					updatePrompt();
					console.log(`${colors.green}✓ Switched context back to main frame${colors.reset}`);
					break;
				}
				case "goto":
				case "open": {
					if (!argStr) {
						console.log(`${colors.red}Usage: goto <url>${colors.reset}`);
						break;
					}
					const url = argStr.startsWith("http") ? argStr : `https://${argStr}`;
					const start = performance.now();
					await page.goto(url);
					activeFrame = null;
					updatePrompt();
					console.log(
						`${colors.green}✓ Loaded${colors.reset} ${colors.dim}(${Math.round(performance.now() - start)}ms)${colors.reset}`,
					);
					break;
				}
				case "title":
					console.log(
						`${colors.bold}Title:${colors.reset} ${activeFrame ? await activeFrame.title() : await page.title()}`,
					);
					break;
				case "url":
					console.log(
						`${colors.bold}URL:${colors.reset} ${activeFrame ? activeFrame.url : await page.url()}`,
					);
					break;
				case "text": {
					if (!argStr) {
						console.log(`${colors.red}Usage: text <selector>${colors.reset}`);
						break;
					}
					const text = activeFrame ? await activeFrame.getText(argStr) : await page.getText(argStr);
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
					if (activeFrame) await activeFrame.click(argStr);
					else await page.click(argStr);
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
					if (activeFrame) await activeFrame.type(selector, textToType);
					else await page.type(selector, textToType);
					console.log(`${colors.green}✓ Typed into ${selector}${colors.reset}`);
					break;
				}
				case "eval": {
					if (!argStr) {
						console.log(`${colors.red}Usage: eval <js_expression>${colors.reset}`);
						break;
					}
					const res = activeFrame
						? await activeFrame.evaluate(argStr)
						: await page.evaluate(argStr);
					console.log(`${colors.bold}Result:${colors.reset}`, res);
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
					const types: string[] = [];
					if (argStr.includes("image") || argStr.includes("img")) types.push("image");
					if (argStr.includes("css") || argStr.includes("style")) types.push("stylesheet");
					if (argStr.includes("font")) types.push("font");
					if (types.length === 0) types.push("image", "stylesheet", "font");
					await page.blockResources(types);
					console.log(`${colors.green}✓ Blocked resources: ${types.join(", ")}${colors.reset}`);
					break;
				}
				case "metrics": {
					const m = await page.getMetrics();
					console.log(
						`\n${colors.bold}Performance Metrics:${colors.reset}\n  JS Heap: ${((m.JSHeapUsedSize || 0) / 1024 / 1024).toFixed(2)} MB\n  DOM Nodes: ${m.Nodes ?? "N/A"}\n  Layouts: ${m.LayoutCount ?? 0}\n`,
					);
					break;
				}
				case "exit":
				case "quit":
					rl.close();
					return;
				default:
					console.log(`${colors.red}Unknown command: "${cmd}". Type "help".${colors.reset}`);
					break;
			}
		} catch (err: unknown) {
			console.log(
				`${colors.red}Error: ${err instanceof Error ? err.message : String(err)}${colors.reset}`,
			);
		} finally {
			isExecuting = false;
			if (!isClosing) {
				rl.resume();
				rl.prompt();
			}
		}
	});

	rl.on("close", async () => {
		if (isClosing) return;
		isClosing = true;
		await browser.close();
		resolveCompletion?.();
	});

	await completion;
}
