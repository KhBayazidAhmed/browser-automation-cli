import { existsSync } from "node:fs";
import * as p from "@clack/prompts";
import {
	type BrowserProfile,
	detectBrowserProfiles,
	prepareProfileLaunch,
} from "../cdp/profiles.js";

export interface SelectedProfileConfig {
	userDataDir?: string;
	profileDirectory?: string;
	profile?: BrowserProfile;
	mode: "temp" | "clone" | "direct";
}

export async function promptProfileSelection(
	message = "Select Browser Profile for this session:",
): Promise<SelectedProfileConfig | null> {
	const profiles = detectBrowserProfiles();

	const options: Array<{ value: string; label: string; hint?: string }> = [
		{
			value: "temp",
			label: "⚡ Isolated Clean Profile (Default)",
			hint: "Fresh session, no saved cookies or logins",
		},
	];

	for (const prof of profiles) {
		options.push({
			value: `prof:${prof.id}`,
			label: `👤 ${prof.displayName}`,
			hint: `${prof.profileDir}`,
		});
	}

	options.push({
		value: "custom",
		label: "📁 Custom User Data Directory...",
		hint: "Specify a custom path to Chrome user data",
	});

	const choice = await p.select({
		message,
		options,
	});

	if (p.isCancel(choice)) return null;

	if (choice === "temp") {
		return { mode: "temp" };
	}

	if (choice === "custom") {
		const customDir = await p.text({
			message: "Enter absolute path to browser User Data directory:",
			validate: (val) => {
				if (!val) return "Path cannot be empty";
				if (!existsSync(val)) return "Directory does not exist";
			},
		});

		if (p.isCancel(customDir)) return null;

		const profileDirName = await p.text({
			message: "Enter profile folder name (leave empty for 'Default'):",
			defaultValue: "Default",
		});

		if (p.isCancel(profileDirName)) return null;

		return {
			userDataDir: customDir as string,
			profileDirectory: (profileDirName as string) || "Default",
			mode: "direct",
		};
	}

	// An existing detected profile was chosen
	const profId = (choice as string).replace(/^prof:/, "");
	const selected = profiles.find((p) => p.id === profId);

	if (!selected) {
		return { mode: "temp" };
	}

	const launchMode = await p.select({
		message: `How would you like to run profile "${selected.displayName}"?`,
		options: [
			{
				value: "clone",
				label: "🛡️ Safe Cloned Session (Recommended)",
				hint: "Copies logins & cookies. Works even when browser is already open!",
			},
			{
				value: "direct",
				label: "🔗 Direct Profile Access",
				hint: "Attaches directly to original profile. (Browser MUST be closed)",
			},
		],
	});

	if (p.isCancel(launchMode)) return null;

	const mode = launchMode as "clone" | "direct";
	const s = p.spinner();
	if (mode === "clone") {
		s.start("Cloning profile session cookies and state for isolated automation...");
	}

	const prepared = prepareProfileLaunch(selected, mode);

	if (mode === "clone") {
		s.stop(`Profile cloned safely to ${prepared.userDataDir}`);
	}

	return {
		...prepared,
		profile: selected,
		mode,
	};
}
