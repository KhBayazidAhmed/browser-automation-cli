import { basename, resolve } from "node:path";

const supportedTargets = new Set([
	"bun-darwin-arm64",
	"bun-darwin-x64",
	"bun-linux-arm64",
	"bun-linux-arm64-musl",
	"bun-linux-x64-baseline",
	"bun-linux-x64-musl",
	"bun-windows-arm64",
	"bun-windows-x64-baseline",
]);

const [, , target, outputArgument, versionArgument] = Bun.argv;

if (!target || !supportedTargets.has(target)) {
	console.error(
		`Usage: bun scripts/build-release.ts <target> <outfile> [version]\n\nSupported targets:\n${[
			...supportedTargets,
		]
			.sort()
			.map((value) => `  ${value}`)
			.join("\n")}`,
	);
	process.exit(1);
}

if (!outputArgument) {
	console.error("Missing output file path.");
	process.exit(1);
}

const packageJson = (await Bun.file(resolve(import.meta.dir, "../package.json")).json()) as {
	version?: string;
};
const version = versionArgument || packageJson.version;

if (!version) {
	console.error("A release version is required.");
	process.exit(1);
}

const outfile = resolve(outputArgument);
const nativePlatform = process.platform === "win32" ? "windows" : process.platform;
const nativeArchitecture = process.arch === "arm64" ? "arm64" : "x64";
const nativeTarget = `bun-${nativePlatform}-${nativeArchitecture}`;
const result = await Bun.build({
	entrypoints: [resolve(import.meta.dir, "../apps/tui/src/index.ts")],
	compile: {
		...(target === nativeTarget ? {} : { target: target as Bun.Build.Target }),
		outfile,
		autoloadDotenv: false,
		autoloadBunfig: false,
	},
	define: {
		BFLOW_VERSION: JSON.stringify(version),
	},
	minify: true,
});

if (!result.success) {
	for (const log of result.logs) console.error(log);
	process.exit(1);
}

if (target.startsWith("bun-darwin-") && process.platform === "darwin") {
	const entitlements = resolve(import.meta.dir, "macos-entitlements.plist");
	const removeSignature = Bun.spawnSync(["codesign", "--remove-signature", outfile], {
		stdout: "inherit",
		stderr: "inherit",
	});
	if (!removeSignature.success) process.exit(removeSignature.exitCode);

	const sign = Bun.spawnSync(
		["codesign", "--deep", "--force", "--sign", "-", "--entitlements", entitlements, outfile],
		{
			stdout: "inherit",
			stderr: "inherit",
		},
	);
	if (!sign.success) process.exit(sign.exitCode);
}

console.log(`Built ${basename(outfile)} ${version} for ${target}`);
