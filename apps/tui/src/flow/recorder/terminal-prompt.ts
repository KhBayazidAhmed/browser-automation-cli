import * as readline from "node:readline";
import type { FlowStep } from "../types.js";

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

export function printRecordingHeader(initialUrl: string, outputPath: string) {
	console.log(
		`\n${colors.bold}${colors.red}🔴 Launching Browser in Advanced Recording Mode...${colors.reset}`,
	);
	console.log(
		`${colors.dim}═══════════════════════════════════════════════════════════════════${colors.reset}`,
	);
	console.log(
		`  🎯 ${colors.bold}Target Website${colors.reset}       : ${colors.cyan}${initialUrl}${colors.reset}`,
	);
	console.log(
		`  📁 ${colors.bold}Output Flow Path${colors.reset}     : ${colors.green}${outputPath}${colors.reset}`,
	);
	console.log(
		`${colors.dim}───────────────────────────────────────────────────────────────────${colors.reset}`,
	);
	console.log(
		`  🖱️  ${colors.bold}Normal Click${colors.reset}         : Records a smart click action`,
	);
	console.log(
		`  ⌨️  ${colors.bold}Type into Input${colors.reset}      : Records typed text with target label`,
	);
	console.log(
		`  🔍 ${colors.bold}Extract Text (HUD)${colors.reset}   : Extracts element text into a variable`,
	);
	console.log(
		`  📊 ${colors.bold}Extract List (HUD)${colors.reset}   : Extracts table rows / repeating item cards`,
	);
	console.log(
		`  🔎 ${colors.bold}Assert Text (HUD)${colors.reset}    : Asserts element text (Strict, Contains, Regex)`,
	);
	console.log(
		`  ⏱️  ${colors.bold}Add Wait Step (HUD)${colors.reset}  : Injects custom delay or wait for selector`,
	);
	console.log(
		`  ⚙️  ${colors.bold}Live Config (HUD)${colors.reset}    : ${colors.magenta}Open Live Steps & JSON Config Inspector${colors.reset}`,
	);
	console.log(
		`  ↩  ${colors.bold}Undo Step${colors.reset}             : Reverts the last recorded action`,
	);
	console.log(
		`  🛑 ${colors.bold}Finish & Save${colors.reset}         : Saves workflow and closes browser`,
	);
	console.log(
		`${colors.dim}═══════════════════════════════════════════════════════════════════${colors.reset}\n`,
	);
}

export function setupTerminalInterface(
	flowName: string,
	steps: FlowStep[],
	variables: Record<string, unknown>,
	getPaused: () => boolean,
	setPaused: (paused: boolean) => void,
	onSyncState: () => Promise<void>,
	onFinish: () => void,
): readline.Interface {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	console.log(`\n${colors.bold}${colors.magenta}👉 Terminal Controls:${colors.reset}`);
	console.log(
		`   ${colors.cyan}c${colors.reset} or ${colors.cyan}config${colors.reset}  : View live JSON workflow configuration`,
	);
	console.log(
		`   ${colors.cyan}s${colors.reset} or ${colors.cyan}steps${colors.reset}   : View step-by-step breakdown`,
	);
	console.log(`   ${colors.cyan}w <ms>${colors.reset}         : Insert wait delay (e.g. 'w 2000')`);
	console.log(
		`   ${colors.cyan}u${colors.reset} or ${colors.cyan}undo${colors.reset}    : Undo last recorded step`,
	);
	console.log(
		`   ${colors.cyan}d <num>${colors.reset}        : Delete a specific step number (e.g. 'd 2')`,
	);
	console.log(
		`   ${colors.cyan}v <k>=<v>${colors.reset}      : Add workflow variable (e.g. 'v query=bun')`,
	);
	console.log(
		`   ${colors.cyan}p${colors.reset} or ${colors.cyan}pause${colors.reset}   : Toggle pause/resume`,
	);
	console.log(
		`   ${colors.cyan}f${colors.reset} or ${colors.cyan}[Enter]${colors.reset} : Finish and save flow\n`,
	);

	rl.on("line", async (line) => {
		const trimmed = line.trim();
		if (
			!trimmed ||
			trimmed === "f" ||
			trimmed === "finish" ||
			trimmed === "done" ||
			trimmed === "exit"
		) {
			rl.close();
			onFinish();
			return;
		}

		const [cmd, ...cmdArgs] = trimmed.split(" ");
		const argStr = cmdArgs.join(" ");

		switch (cmd?.toLowerCase()) {
			case "c":
			case "config":
				console.log(
					`\n${colors.bold}${colors.cyan}════════════════════ LIVE FLOW CONFIG ════════════════════${colors.reset}`,
				);
				console.log(
					JSON.stringify(
						{
							name: flowName,
							description: `Recorded workflow (${steps.length} steps)`,
							variables,
							steps,
						},
						null,
						2,
					),
				);
				console.log(
					`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`,
				);
				break;

			case "s":
			case "steps":
				console.log(
					`\n${colors.bold}${colors.cyan}Recorded Steps (${steps.length}):${colors.reset}`,
				);
				if (steps.length === 0)
					console.log(`  ${colors.dim}(No steps recorded yet)${colors.reset}\n`);
				else {
					steps.forEach((st, idx) => {
						const s = st as Record<string, unknown>;
						const details = s.selector
							? `sel: ${s.selector}`
							: s.url
								? `url: ${s.url}`
								: s.durationMs
									? `duration: ${s.durationMs}ms`
									: s.text || "";
						console.log(
							`  ${colors.bold}[${idx + 1}] ${st.action.toUpperCase()}${colors.reset} - ${st.name || st.action} ${colors.dim}(${details})${colors.reset}`,
						);
					});
					console.log();
				}
				break;

			case "w":
			case "wait": {
				const ms = Number(cmdArgs[0]) || 1000;
				steps.push({ name: `Wait ${ms}ms`, action: "wait", durationMs: ms });
				console.log(
					`  ${colors.green}✓ [WAIT]${colors.reset} Added ${ms}ms delay (Step ${steps.length})`,
				);
				await onSyncState();
				break;
			}

			case "u":
			case "undo": {
				const popped = steps.pop();
				if (popped) {
					console.log(
						`  ${colors.yellow}✓ [UNDO]${colors.reset} Removed: ${popped.name || popped.action}`,
					);
					await onSyncState();
				} else console.log(`  ${colors.dim}No steps to undo${colors.reset}`);
				break;
			}

			case "d":
			case "del":
			case "delete": {
				const num = Number(cmdArgs[0]);
				if (num >= 1 && num <= steps.length) {
					const removed = steps.splice(num - 1, 1)[0];
					console.log(
						`  ${colors.red}✓ [DELETE]${colors.reset} Removed step #${num}: ${removed?.name || removed?.action}`,
					);
					await onSyncState();
				} else
					console.log(
						`${colors.red}Invalid step number. Choose 1 to ${steps.length}.${colors.reset}`,
					);
				break;
			}

			case "v":
			case "var": {
				const [k, v] = argStr.split("=");
				if (k && v !== undefined) {
					variables[k.trim()] = v.trim();
					console.log(
						`  ${colors.magenta}✓ [VARIABLE]${colors.reset} Set "${k.trim()}" = "${v.trim()}"`,
					);
					await onSyncState();
				} else console.log(`${colors.red}Usage: v <variable_name>=<default_value>${colors.reset}`);
				break;
			}

			case "p":
			case "pause": {
				const nextPaused = !getPaused();
				setPaused(nextPaused);
				console.log(
					nextPaused
						? `  ${colors.yellow}⏸️  [PAUSED] Recording suspended${colors.reset}`
						: `  ${colors.green}▶️  [RESUMED] Recording active${colors.reset}`,
				);
				await onSyncState();
				break;
			}

			default:
				console.log(
					`${colors.dim}Type 'c' for config, 's' for steps, 'w <ms>' for wait, 'u' for undo, or Enter to finish.${colors.reset}`,
				);
				break;
		}
	});

	return rl;
}
