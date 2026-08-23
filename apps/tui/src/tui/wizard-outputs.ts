import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";

export async function handleViewOutputs(outputDir: string, outputFiles: string[]): Promise<void> {
	if (outputFiles.length === 0) {
		p.log.warn("No output files generated yet. Run a workflow first!");
		return;
	}
	const fileChoices = outputFiles.map((filename) => {
		const stats = statSync(join(outputDir, filename));
		return {
			value: filename,
			label: filename,
			hint: `${(stats.size / 1024).toFixed(1)} KB - ${new Date(stats.mtime).toLocaleTimeString()}`,
		};
	});
	const selectedFile = (await p.select({
		message: "Select an output file to inspect:",
		options: fileChoices,
	})) as string | symbol;
	if (p.isCancel(selectedFile)) return;
	const fullPath = join(outputDir, selectedFile);
	if (selectedFile.endsWith(".json")) {
		try {
			const content = JSON.parse(readFileSync(fullPath, "utf-8"));
			p.note(JSON.stringify(content, null, 2), `Content: ${selectedFile}`);
		} catch {
			p.log.error(`Could not read ${selectedFile}`);
		}
	} else if (selectedFile.endsWith(".png")) {
		p.log.success(`📸 Image saved at: ${fullPath}`);
	} else {
		p.log.info(`Output saved at: ${fullPath}`);
	}
}
