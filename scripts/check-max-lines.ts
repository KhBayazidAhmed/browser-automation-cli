import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const MAX_LINES = 250;
const IGNORE_DIRS = new Set([
	"node_modules",
	".git",
	".turbo",
	"dist",
	".next",
	"output",
	".gemini",
]);
const TARGET_EXTENSIONS = new Set([".ts", ".js", ".json", ".jsonc"]);

function scanDirectory(dir: string, fileList: string[] = []): string[] {
	const entries = readdirSync(dir);
	for (const entry of entries) {
		if (IGNORE_DIRS.has(entry)) continue;
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			scanDirectory(fullPath, fileList);
		} else if (stat.isFile()) {
			const hasExt = Array.from(TARGET_EXTENSIONS).some((ext) => entry.endsWith(ext));
			if (hasExt) fileList.push(fullPath);
		}
	}
	return fileList;
}

const rootDir = process.cwd();
const allFiles = scanDirectory(rootDir);
const violations: Array<{ file: string; lines: number }> = [];

for (const file of allFiles) {
	const content = readFileSync(file, "utf-8");
	const lineCount = content.split("\n").length;
	if (lineCount > MAX_LINES) {
		violations.push({ file: relative(rootDir, file), lines: lineCount });
	}
}

if (violations.length > 0) {
	console.error(
		`\x1b[31m\x1b[1m❌ Max line count (${MAX_LINES}) exceeded in ${violations.length} file(s):\x1b[0m`,
	);
	for (const v of violations) {
		console.error(`  • \x1b[33m${v.file}\x1b[0m: \x1b[1m${v.lines} lines\x1b[0m`);
	}
	process.exit(1);
} else {
	console.log(
		`\x1b[32m\x1b[1m✓ Strict Line Count Check Passed:\x1b[0m All ${allFiles.length} files are strictly <= ${MAX_LINES} lines!`,
	);
}
