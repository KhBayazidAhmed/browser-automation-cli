const colors = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	green: "\x1b[32m",
	red: "\x1b[31m",
	cyan: "\x1b[36m",
};

export function logFlowStart(name: string, description?: string, totalSteps = 0) {
	console.log(
		`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════════════${colors.reset}`,
	);
	console.log(`  🌊 Executing Flow: ${colors.bold}${name}${colors.reset}`);
	if (description) console.log(`  📝 ${description}`);
	console.log(`  🔢 Total Steps: ${totalSteps}`);
	console.log(
		`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════════════${colors.reset}\n`,
	);
}

export function logStepStart(index: number, total: number, stepName: string) {
	process.stdout.write(`  [${index}/${total}] ${stepName}... `);
}

export function logStepPass(durationMs: number) {
	console.log(`${colors.green}✓ PASS${colors.reset} ${colors.dim}(${durationMs}ms)${colors.reset}`);
}

export function logStepFail(errorMsg: string) {
	console.log(`${colors.red}✗ FAIL${colors.reset}`);
	console.log(`    ${colors.red}↳ ${errorMsg}${colors.reset}`);
}

export function logFlowSummary(
	totalDuration: number,
	extractedData: Record<string, unknown>,
	dataFile?: string,
	resultFile?: string,
) {
	console.log(
		`\n${colors.green}${colors.bold}✓ Flow completed successfully in ${totalDuration}ms!${colors.reset}`,
	);
	const dataKeys = Object.keys(extractedData);
	if (dataKeys.length > 0) {
		console.log(
			`\n${colors.bold}${colors.cyan}📊 Extracted Data Summary (${dataKeys.length} items):${colors.reset}`,
		);
		for (const key of dataKeys) {
			const val = extractedData[key];
			if (Array.isArray(val)) {
				console.log(`  • ${colors.bold}${key}${colors.reset}: [${val.length} items]`);
				if (val.length > 0 && typeof val[0] === "object") {
					console.log(`    ${colors.dim}Preview: ${JSON.stringify(val[0])}${colors.reset}`);
				}
			} else {
				console.log(`  • ${colors.bold}${key}${colors.reset}: "${val}"`);
			}
		}
		if (dataFile) {
			console.log(
				`\n  💾 ${colors.bold}Clean Data File:${colors.reset} ${colors.green}${dataFile}${colors.reset}`,
			);
		}
	}
	if (resultFile) {
		console.log(`  📋 ${colors.bold}Full Run Report:${colors.reset} ${resultFile}\n`);
	}
}
