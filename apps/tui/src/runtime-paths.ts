import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const TUI_ROOT_DIR = fileURLToPath(new URL("../", import.meta.url));
export const WORKFLOWS_DIR = join(TUI_ROOT_DIR, "workflows");
export const OUTPUT_DIR = join(TUI_ROOT_DIR, "output");

export function resolveTuiPath(filePath: string): string {
	if (isAbsolute(filePath)) return filePath;
	if (/^(?:workflows|output)[/\\]/.test(filePath)) return resolve(TUI_ROOT_DIR, filePath);
	return resolve(process.cwd(), filePath);
}
