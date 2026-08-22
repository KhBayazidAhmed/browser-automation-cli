import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

export interface BrowserProfile {
	id: string;
	browserName: string;
	userDataDir: string;
	profileDir: string;
	displayName: string;
	profilePath: string;
	userName?: string;
}

interface BrowserPathConfig {
	name: string;
	relPath: string;
}

const BROWSER_ROOTS: Record<string, BrowserPathConfig[]> = {
	darwin: [
		{ name: "Google Chrome", relPath: "Library/Application Support/Google/Chrome" },
		{ name: "Brave", relPath: "Library/Application Support/BraveSoftware/Brave-Browser" },
		{ name: "Microsoft Edge", relPath: "Library/Application Support/Microsoft Edge" },
		{ name: "Chromium", relPath: "Library/Application Support/Chromium" },
	],
	linux: [
		{ name: "Google Chrome", relPath: ".config/google-chrome" },
		{ name: "Brave", relPath: ".config/BraveSoftware/Brave-Browser" },
		{ name: "Chromium", relPath: ".config/chromium" },
		{ name: "Microsoft Edge", relPath: ".config/microsoft-edge" },
	],
	win32: [
		{ name: "Google Chrome", relPath: "AppData/Local/Google/Chrome/User Data" },
		{ name: "Brave", relPath: "AppData/Local/BraveSoftware/Brave-Browser/User Data" },
		{ name: "Microsoft Edge", relPath: "AppData/Local/Microsoft/Edge/User Data" },
	],
};

/**
 * Scans standard system directories to discover installed Chromium profiles.
 */
export function detectBrowserProfiles(customUserDataDir?: string): BrowserProfile[] {
	const platform = (process.platform as "darwin" | "linux" | "win32") || "linux";
	const roots: Array<{ name: string; fullPath: string }> = [];

	if (customUserDataDir) {
		roots.push({
			name: basename(customUserDataDir) || "Custom Browser",
			fullPath: customUserDataDir,
		});
	} else {
		const configs = BROWSER_ROOTS[platform] || BROWSER_ROOTS.linux || [];
		const home = homedir();
		for (const cfg of configs) {
			const fullPath = join(home, cfg.relPath);
			if (existsSync(fullPath)) {
				roots.push({ name: cfg.name, fullPath });
			}
		}
	}

	const profiles: BrowserProfile[] = [];

	for (const root of roots) {
		const localStatePath = join(root.fullPath, "Local State");
		const foundProfileDirs = new Set<string>();

		if (existsSync(localStatePath)) {
			try {
				const localState = JSON.parse(readFileSync(localStatePath, "utf-8"));
				const infoCache = localState?.profile?.info_cache || {};

				for (const [folderName, info] of Object.entries<any>(infoCache)) {
					foundProfileDirs.add(folderName);
					const profileName = info.name || folderName;
					const userName = info.user_name || undefined;
					const userSuffix = userName ? ` (${userName})` : "";
					const id = `${root.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${folderName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

					profiles.push({
						id,
						browserName: root.name,
						userDataDir: root.fullPath,
						profileDir: folderName,
						displayName: `${root.name} → ${profileName}${userSuffix}`,
						profilePath: join(root.fullPath, folderName),
						userName,
					});
				}
			} catch {
				// Continue to fallback directory detection
			}
		}

		// Fallback detection: scan for "Default" or "Profile X" directories
		try {
			const entries = readdirSync(root.fullPath, { withFileTypes: true });
			for (const entry of entries) {
				if (
					entry.isDirectory() &&
					(entry.name === "Default" || /^Profile \d+$/i.test(entry.name)) &&
					!foundProfileDirs.has(entry.name)
				) {
					const id = `${root.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${entry.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
					profiles.push({
						id,
						browserName: root.name,
						userDataDir: root.fullPath,
						profileDir: entry.name,
						displayName: `${root.name} → ${entry.name}`,
						profilePath: join(root.fullPath, entry.name),
					});
				}
			}
		} catch {
			// Skip directories we cannot read
		}
	}

	return profiles;
}

/**
 * Clones essential session & auth storage from a real profile to an isolated directory.
 * This avoids Chrome's SingletonLock collision, allowing automation to run while the main browser is open.
 */
export function cloneProfileForAutomation(
	profile: BrowserProfile,
	targetBaseDir?: string,
): { userDataDir: string; profileDirectory: string } {
	const baseDir = targetBaseDir || join(homedir(), ".browser-automation", "profiles", profile.id);

	if (!existsSync(baseDir)) {
		mkdirSync(baseDir, { recursive: true });
	}

	// Copy Root Local State if present
	const sourceLocalState = join(profile.userDataDir, "Local State");
	const destLocalState = join(baseDir, "Local State");
	if (existsSync(sourceLocalState)) {
		try {
			cpSync(sourceLocalState, destLocalState, { force: true });
		} catch {}
	}

	// Create profile subdirectory in cloned base
	const targetProfileDir = join(baseDir, profile.profileDir);
	if (!existsSync(targetProfileDir)) {
		mkdirSync(targetProfileDir, { recursive: true });
	}

	// Critical items to copy for preserving logged-in sessions and cookies
	const itemsToCopy = [
		"Cookies",
		"Cookies-journal",
		"Network",
		"Login Data",
		"Login Data-journal",
		"Web Data",
		"Web Data-journal",
		"Preferences",
		"Secure Preferences",
		"Local Storage",
		"Session Storage",
		"IndexedDB",
	];

	for (const item of itemsToCopy) {
		const srcPath = join(profile.profilePath, item);
		const dstPath = join(targetProfileDir, item);
		if (existsSync(srcPath)) {
			try {
				cpSync(srcPath, dstPath, { recursive: true, force: true });
			} catch {}
		}
	}

	return {
		userDataDir: baseDir,
		profileDirectory: profile.profileDir,
	};
}

/**
 * Prepares launch options for a profile based on mode (cloned or direct).
 */
export function prepareProfileLaunch(
	profile: BrowserProfile,
	mode: "clone" | "direct" = "clone",
): { userDataDir: string; profileDirectory: string } {
	if (mode === "clone") {
		return cloneProfileForAutomation(profile);
	}
	return {
		userDataDir: profile.userDataDir,
		profileDirectory: profile.profileDir,
	};
}
