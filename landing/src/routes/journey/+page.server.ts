import historyData from '../../../static/data/history.csv?raw';

/**
 * CSV Schema (14 columns):
 * timestamp, label, git_hash, total_code_lines, svelte_lines, ts_lines,
 * js_lines, css_lines, doc_words, doc_lines, total_files, directories,
 * estimated_tokens, commits
 */
const EXPECTED_COLUMNS = 14;

interface SnapshotData {
	timestamp: string;
	label: string;
	gitHash: string;
	totalCodeLines: number;
	svelteLines: number;
	tsLines: number;
	jsLines: number;
	cssLines: number;
	docWords: number;
	docLines: number;
	totalFiles: number;
	directories: number;
	estimatedTokens: number;
	commits: number;
	date: string;
}

function safeParseInt(value: string | undefined): number {
	if (!value) return 0;
	const parsed = parseInt(value, 10);
	return isNaN(parsed) ? 0 : parsed;
}

function parseTimestampToDate(timestamp: string): string {
	if (!timestamp || !timestamp.includes('_')) {
		return 'Unknown date';
	}

	const datePart = timestamp.split('_')[0];
	const dateParts = datePart.split('-');

	if (dateParts.length !== 3) {
		return 'Unknown date';
	}

	const year = safeParseInt(dateParts[0]);
	const month = safeParseInt(dateParts[1]);
	const day = safeParseInt(dateParts[2]);

	if (year < 2000 || month < 1 || month > 12 || day < 1 || day > 31) {
		return 'Unknown date';
	}

	return new Date(year, month - 1, day).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}

function parseCSV(csv: string): SnapshotData[] {
	if (!csv || typeof csv !== 'string') {
		console.warn('CSV data is empty or invalid');
		return [];
	}

	const lines = csv.trim().split('\n');

	// Need at least header + 1 data row
	if (lines.length < 2) {
		console.warn('CSV has no data rows');
		return [];
	}

	const results: SnapshotData[] = [];

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i];
		if (!line.trim()) continue;

		const values = line.split(',');

		if (values.length !== EXPECTED_COLUMNS) {
			console.warn(`Skipping malformed CSV line ${i}: expected ${EXPECTED_COLUMNS} columns, got ${values.length}`);
			continue;
		}

		results.push({
			timestamp: values[0] || '',
			label: values[1] || '',
			gitHash: values[2] || '',
			totalCodeLines: safeParseInt(values[3]),
			svelteLines: safeParseInt(values[4]),
			tsLines: safeParseInt(values[5]),
			jsLines: safeParseInt(values[6]),
			cssLines: safeParseInt(values[7]),
			docWords: safeParseInt(values[8]),
			docLines: safeParseInt(values[9]),
			totalFiles: safeParseInt(values[10]),
			directories: safeParseInt(values[11]),
			estimatedTokens: safeParseInt(values[12]),
			commits: safeParseInt(values[13]),
			date: parseTimestampToDate(values[0])
		});
	}

	return results;
}

export function load() {
	const snapshots = parseCSV(historyData);

	// Handle empty data gracefully
	if (snapshots.length === 0) {
		return {
			snapshots: [],
			latest: null,
			growth: null,
			totalSnapshots: 0
		};
	}

	const latest = snapshots[snapshots.length - 1];
	const first = snapshots[0];

	// Calculate growth between first and latest snapshot
	const growth =
		snapshots.length > 1
			? {
					codeLines: latest.totalCodeLines - first.totalCodeLines,
					docWords: latest.docWords - first.docWords,
					files: latest.totalFiles - first.totalFiles,
					commits: latest.commits - first.commits
				}
			: null;

	return {
		snapshots,
		latest,
		growth,
		totalSnapshots: snapshots.length
	};
}
