import { isAbsolute, join, resolve } from "node:path";

// Workflow definitions and generated output are user-owned project files. Resolving
// them from cwd also works from a standalone executable, where import.meta.url
// points inside Bun's embedded filesystem.
export const TUI_ROOT_DIR = process.cwd();
export const WORKFLOWS_DIR = join(TUI_ROOT_DIR, "workflows");
export const OUTPUT_DIR = join(TUI_ROOT_DIR, "output");

export function resolveTuiPath(filePath: string): string {
	if (isAbsolute(filePath)) return filePath;
	if (/^(?:workflows|output)[/\\]/.test(filePath)) return resolve(TUI_ROOT_DIR, filePath);
	return resolve(process.cwd(), filePath);
}
