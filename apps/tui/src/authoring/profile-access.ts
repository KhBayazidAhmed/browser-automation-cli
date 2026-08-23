import { detectBrowserProfiles, prepareProfileLaunch } from "../cdp/index.js";

export function listAuthoringProfiles() {
	return detectBrowserProfiles().map(({ id, browserName, displayName, profileDir }) => ({
		id,
		browserName,
		displayName,
		profileDirectory: profileDir,
	}));
}

export function resolveAuthoringProfile(profileId: string, confirmed: boolean) {
	if (!confirmed) {
		throw new Error("Using a browser profile requires explicit user confirmation");
	}
	const normalized = profileId.toLowerCase();
	const profile = detectBrowserProfiles().find(
		(candidate) =>
			candidate.id.toLowerCase() === normalized ||
			candidate.profileDir.toLowerCase() === normalized ||
			candidate.displayName.toLowerCase() === normalized,
	);
	if (!profile) throw new Error(`Browser profile "${profileId}" was not found`);
	return prepareProfileLaunch(profile, "clone");
}
