import { detectBrowserProfiles, prepareProfileLaunch } from "./cdp/index.js";
import { CLI_NAME } from "./version.js";

export function flagValue(cliArgs: string[], name: string): string | undefined {
	const index = cliArgs.indexOf(name);
	if (index !== -1) return cliArgs[index + 1];
	const prefix = `${name}=`;
	return cliArgs.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

export function printUsage(): void {
	console.log(`
Bflow — Browser Workflow Automation

  ${CLI_NAME}                              Open the interactive wizard
  ${CLI_NAME} run <file> [--k=v] [--debug]  Run a workflow (supports --data=<uri>)
  ${CLI_NAME} record [file] [url]          Record a workflow
  ${CLI_NAME} data providers|list          List installed data providers
  ${CLI_NAME} sheets <command>             Manage Google Sheets data
  ${CLI_NAME} tasks|task list              List tasks
  ${CLI_NAME} task [run] <id> [--k=v]      Run a task
  ${CLI_NAME} profiles                     List browser profiles
  ${CLI_NAME} repl                         Open the interactive REPL
  ${CLI_NAME} mcp                          Serve agent authoring tools over MCP stdio
  ${CLI_NAME} cleanup                      Clean managed orphan browsers
  ${CLI_NAME} --url <url> [--screenshot <path>]
  ${CLI_NAME} --version                    Print the installed version

Aliases:
  ${CLI_NAME} flow <file>                  Alias for "${CLI_NAME} run <file>"
  ${CLI_NAME} workflow run <file>          Alias for "${CLI_NAME} run <file> --data=..."
`);
}

export function extractProfileConfig(cliArgs: string[]): {
	userDataDir?: string;
	profileDirectory?: string;
} {
	const directMode = cliArgs.includes("--direct-profile");
	const customUserDataArg = cliArgs.find((arg) => arg.startsWith("--user-data-dir="));
	const customProfileDirArg = cliArgs.find(
		(arg) => arg.startsWith("--profile-directory=") || arg.startsWith("--profile-dir="),
	);
	if (customUserDataArg) {
		return {
			userDataDir: customUserDataArg.slice(customUserDataArg.indexOf("=") + 1),
			profileDirectory: customProfileDirArg
				? customProfileDirArg.slice(customProfileDirArg.indexOf("=") + 1)
				: undefined,
		};
	}
	const profileArg = cliArgs.find((arg) => arg.startsWith("--profile="));
	if (!profileArg) return {};
	const target = profileArg.slice(profileArg.indexOf("=") + 1).toLowerCase();
	const matched = detectBrowserProfiles().find(
		(profile) =>
			profile.id.toLowerCase() === target ||
			profile.profileDir.toLowerCase() === target ||
			profile.browserName.toLowerCase().includes(target) ||
			profile.displayName.toLowerCase().includes(target),
	);
	if (matched) {
		console.log(`\x1b[36mℹ Using Browser Profile: ${matched.displayName}\x1b[0m`);
		return prepareProfileLaunch(matched, directMode ? "direct" : "clone");
	}
	console.warn(`\x1b[33m⚠ Profile matching "${target}" not found. Using a clean profile.\x1b[0m`);
	return {};
}

export function parseCliKeyValues(
	cliArgs: string[],
	startIndex: number,
): Record<string, string | boolean | number> {
	const vars: Record<string, string | boolean | number> = {};
	for (let index = startIndex; index < cliArgs.length; index++) {
		const raw = cliArgs[index] || "";
		if (
			raw.startsWith("--profile") ||
			raw.startsWith("--user-data-dir") ||
			raw.startsWith("--headed")
		)
			continue;
		const cleaned = raw.startsWith("--") ? raw.slice(2) : raw;
		const equalsIndex = cleaned.indexOf("=");
		if (equalsIndex === -1) continue;
		const key = cleaned.slice(0, equalsIndex);
		const value = cleaned.slice(equalsIndex + 1);
		if (!key) continue;
		vars[key] =
			value === "true"
				? true
				: value === "false"
					? false
					: value.trim() !== "" && Number.isFinite(Number(value))
						? Number(value)
						: value;
	}
	return vars;
}
