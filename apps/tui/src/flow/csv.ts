function csvCell(value: unknown): string {
	const raw = typeof value === "string" ? value : JSON.stringify(value ?? "");
	return /[",\r\n]/.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw;
}

export function serializeCsv(data: Record<string, unknown>): string {
	const entries = Object.entries(data);
	if (entries.length === 1 && Array.isArray(entries[0]?.[1])) {
		const rows = entries[0][1] as unknown[];
		if (rows.every((row) => row && typeof row === "object" && !Array.isArray(row))) {
			const headers = [
				...new Set(rows.flatMap((row) => Object.keys(row as Record<string, unknown>))),
			];
			return [
				headers.map(csvCell).join(","),
				...rows.map((row) =>
					headers.map((header) => csvCell((row as Record<string, unknown>)[header])).join(","),
				),
			].join("\n");
		}
	}
	return ["key,value", ...entries.map(([key, value]) => `${csvCell(key)},${csvCell(value)}`)].join(
		"\n",
	);
}
