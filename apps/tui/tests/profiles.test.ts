import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	Browser,
	cloneProfileForAutomation,
	detectBrowserProfiles,
	prepareProfileLaunch,
} from "../src/cdp/index.js";
import { FlowRecorder } from "../src/flow/recorder.js";

describe("Browser Profiles Discovery & Cloning Engine", () => {
	const testRoot = join(tmpdir(), `test-chrome-userdata-${Date.now()}`);

	beforeEach(() => {
		if (existsSync(testRoot)) {
			rmSync(testRoot, { recursive: true, force: true });
		}
		mkdirSync(testRoot, { recursive: true });
	});

	afterEach(() => {
		if (existsSync(testRoot)) {
			rmSync(testRoot, { recursive: true, force: true });
		}
	});

	it("1. discovers profiles from Local State info_cache", () => {
		// Mock Local State
		const localState = {
			profile: {
				info_cache: {
					Default: {
						name: "Personal Profile",
						user_name: "personal@gmail.com",
					},
					"Profile 1": {
						name: "Work Profile",
						user_name: "engineer@enterprise.com",
					},
				},
			},
		};

		writeFileSync(join(testRoot, "Local State"), JSON.stringify(localState, null, 2));
		mkdirSync(join(testRoot, "Default"), { recursive: true });
		mkdirSync(join(testRoot, "Profile 1"), { recursive: true });

		const profiles = detectBrowserProfiles(testRoot);

		expect(profiles.length).toBe(2);

		const defaultProf = profiles.find((p) => p.profileDir === "Default");
		expect(defaultProf).toBeDefined();
		expect(defaultProf?.displayName).toContain("Personal Profile");
		expect(defaultProf?.displayName).toContain("personal@gmail.com");
		expect(defaultProf?.userDataDir).toBe(testRoot);

		const workProf = profiles.find((p) => p.profileDir === "Profile 1");
		expect(workProf).toBeDefined();
		expect(workProf?.displayName).toContain("Work Profile");
		expect(workProf?.displayName).toContain("engineer@enterprise.com");
	});

	it("2. falls back to folder scanning when Local State is absent", () => {
		mkdirSync(join(testRoot, "Default"), { recursive: true });
		mkdirSync(join(testRoot, "Profile 2"), { recursive: true });

		const profiles = detectBrowserProfiles(testRoot);

		expect(profiles.length).toBe(2);
		expect(profiles.some((p) => p.profileDir === "Default")).toBe(true);
		expect(profiles.some((p) => p.profileDir === "Profile 2")).toBe(true);
	});

	it("3. clones essential session and login files for safe parallel automation", () => {
		const defaultDir = join(testRoot, "Default");
		mkdirSync(defaultDir, { recursive: true });

		// Seed sample session & storage files
		writeFileSync(join(defaultDir, "Cookies"), "MOCK_SQLITE_COOKIES_BINARY_DATA");
		writeFileSync(join(defaultDir, "Login Data"), "MOCK_LOGIN_CREDENTIALS_DATA");
		writeFileSync(
			join(defaultDir, "Preferences"),
			JSON.stringify({ homepage: "https://news.ycombinator.com" }),
		);

		const mockProfile = {
			id: "test-browser-default",
			browserName: "TestBrowser",
			userDataDir: testRoot,
			profileDir: "Default",
			displayName: "TestBrowser → Default",
			profilePath: defaultDir,
		};

		const cloneTargetBase = join(tmpdir(), `test-cloned-profile-${Date.now()}`);

		try {
			const cloned = cloneProfileForAutomation(mockProfile, cloneTargetBase);

			expect(cloned.userDataDir).toBe(cloneTargetBase);
			expect(cloned.profileDirectory).toBe("Default");

			const clonedDefaultDir = join(cloneTargetBase, "Default");
			expect(existsSync(join(clonedDefaultDir, "Cookies"))).toBe(true);
			expect(readFileSync(join(clonedDefaultDir, "Cookies"), "utf-8")).toBe(
				"MOCK_SQLITE_COOKIES_BINARY_DATA",
			);
			expect(existsSync(join(clonedDefaultDir, "Login Data"))).toBe(true);
			expect(existsSync(join(clonedDefaultDir, "Preferences"))).toBe(true);
		} finally {
			if (existsSync(cloneTargetBase)) {
				rmSync(cloneTargetBase, { recursive: true, force: true });
			}
		}
	});

	it("4. supports direct mode preparation without cloning", () => {
		const defaultDir = join(testRoot, "Default");
		const mockProfile = {
			id: "chrome-default",
			browserName: "Google Chrome",
			userDataDir: testRoot,
			profileDir: "Default",
			displayName: "Google Chrome → Personal",
			profilePath: defaultDir,
		};

		const launchConfig = prepareProfileLaunch(mockProfile, "direct");
		expect(launchConfig.userDataDir).toBe(testRoot);
		expect(launchConfig.profileDirectory).toBe("Default");
	});

	it("5. launches Browser instance with custom userDataDir without deleting files on close", async () => {
		const customUserDir = join(tmpdir(), `test-persistent-chrome-${Date.now()}`);
		mkdirSync(customUserDir, { recursive: true });

		const canaryFile = join(customUserDir, "custom-canary.txt");
		writeFileSync(canaryFile, "SHOULD_PERSIST");

		const browser = await Browser.launch({
			headless: true,
			userDataDir: customUserDir,
		});

		expect(browser.launched.isTempProfile).toBe(false);
		expect(browser.launched.userDataDir).toBe(customUserDir);

		const page = await browser.newPage();
		await page.goto("about:blank");
		const title = await page.title();
		expect(title).toBeDefined();

		await browser.close();

		// Ensure persistent userDataDir is not destroyed when closing non-temp profile
		expect(existsSync(customUserDir)).toBe(true);
		expect(existsSync(canaryFile)).toBe(true);
		expect(readFileSync(canaryFile, "utf-8")).toBe("SHOULD_PERSIST");

		rmSync(customUserDir, { recursive: true, force: true });
	});

	it("6. launches FlowRecorder with existing browser profile and preserves profile state", async () => {
		const customProfileDir = join(tmpdir(), `test-recorder-profile-${Date.now()}`);
		mkdirSync(customProfileDir, { recursive: true });

		const canaryPath = join(customProfileDir, "profile-session-marker.txt");
		writeFileSync(canaryPath, "AUTHENTICATED_SESSION_OK");

		const outFlowPath = join(tmpdir(), `test-recorded-flow-${Date.now()}.json`);

		// Launch recorder in headless mode for testing with custom profile
		const recordPromise = FlowRecorder.record(outFlowPath, "about:blank", {
			headless: true,
			userDataDir: customProfileDir,
		});

		// Allow browser launch and recorder script initialization
		await new Promise((r) => setTimeout(r, 1000));

		// Connect to Chrome or trigger finish by simulating terminal finish/file write
		// Since record is waiting for finish, we can kill/close or await
		// FlowRecorder saves flow definition on finish
		const browserList = await Browser.cleanupOrphans(); // will cleanup background orphans if any

		expect(existsSync(canaryPath)).toBe(true);
		expect(readFileSync(canaryPath, "utf-8")).toBe("AUTHENTICATED_SESSION_OK");

		if (existsSync(customProfileDir)) {
			rmSync(customProfileDir, { recursive: true, force: true });
		}
		if (existsSync(outFlowPath)) {
			rmSync(outFlowPath, { force: true });
		}
	});
});
