import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { FlowDefinition } from "../flow/types.js";

export interface WorkflowFile {
	filename: string;
	path: string;
	flow: FlowDefinition;
	stepCount: number;
}

export function loadAllWorkflows(): WorkflowFile[] {
	const rootDir = process.cwd();
	const workflowsDir = join(rootDir, "workflows");

	if (!existsSync(workflowsDir)) {
		return [];
	}

	const files = readdirSync(workflowsDir).filter((f) => f.endsWith(".json"));
	const loaded: WorkflowFile[] = [];

	for (const filename of files) {
		const fullPath = join(workflowsDir, filename);
		try {
			const content = require(fullPath);
			if (content && content.name && Array.isArray(content.steps)) {
				loaded.push({
					filename,
					path: fullPath,
					flow: content as FlowDefinition,
					stepCount: content.steps.length,
				});
			}
		} catch {}
	}

	return loaded;
}
