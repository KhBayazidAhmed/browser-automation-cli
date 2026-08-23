import { detectBrowserProfiles, prepareProfileLaunch } from "./cdp/index.js";

export function flagValue(cliArgs: string[], name: string): string | undefined {
	const index = cliArgs.indexOf(name);
	if (index !== -1) return cliArgs[index + 1];
	const prefix = `${name}=`;
	return cliArgs.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

export function printUsage(): void {
	console.log(`
Browser Automation CLI

  bun src/index.ts                         Open the interactive wizard
  bun src/index.ts record [file] [url]     Record a workflow
  bun src/index.ts flow <file> [--k=v]     Run a workflow
  bun src/index.ts tasks                   List tasks
  bun src/index.ts task <id> [--k=v]       Run a task
  bun src/index.ts profiles                List browser profiles
  bun src/index.ts repl                    Open the interactive REPL
  bun src/index.ts cleanup                 Clean managed orphan browsers
  bun src/index.ts --url <url> [--screenshot <path>]
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
