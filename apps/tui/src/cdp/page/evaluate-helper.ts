export function buildEvaluateExpression(
	expressionOrFn: string | ((...args: any[]) => any),
	args: unknown[],
): string {
	const argsJson = args.map((a) => (a === undefined ? "undefined" : JSON.stringify(a))).join(",");
	if (typeof expressionOrFn === "function") {
		return `(${expressionOrFn.toString()})(${argsJson})`;
	}
	const str = expressionOrFn.trim();
	const firstLine = str.split("\n")[0] || "";
	if (args.length > 0 || str.includes("arguments")) {
		return `(function() {\n${str}\n})(${argsJson})`;
	}
	if (str.startsWith("return ") || firstLine.trim().startsWith("return ")) {
		return `(() => {\n${str}\n})()`;
	}
	return str;
}
