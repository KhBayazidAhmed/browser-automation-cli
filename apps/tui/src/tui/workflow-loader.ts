import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { FlowDefinition } from "../flow/types.js";
import { parseFlowDefinition } from "../flow/validate.js";
import { WORKFLOWS_DIR } from "../runtime-paths.js";

export interface WorkflowFile {
	filename: string;
	path: string;
	flow: FlowDefinition;
	stepCount: number;
}

export function loadAllWorkflows(): WorkflowFile[] {
	const workflowsDir = WORKFLOWS_DIR;

	if (!existsSync(workflowsDir)) {
		return [];
	}

	const files = readdirSync(workflowsDir).filter((f) => f.endsWith(".json"));
	const loaded: WorkflowFile[] = [];

	for (const filename of files) {
		const fullPath = join(workflowsDir, filename);
		try {
			const content = parseFlowDefinition(JSON.parse(readFileSync(fullPath, "utf-8")));
			if (content) {
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
