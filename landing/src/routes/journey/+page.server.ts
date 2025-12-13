import { read } from '$app/server';
import historyData from '../../../static/data/history.csv?raw';

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

function parseCSV(csv: string): SnapshotData[] {
	const lines = csv.trim().split('\n');
	const headers = lines[0].split(',');

	return lines.slice(1).map((line) => {
		const values = line.split(',');
		const timestamp = values[0];

		// Parse timestamp to readable date
		const dateParts = timestamp.split('_')[0].split('-');
		const date = new Date(
			parseInt(dateParts[0]),
			parseInt(dateParts[1]) - 1,
			parseInt(dateParts[2])
		).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});

		return {
			timestamp: values[0],
			label: values[1],
			gitHash: values[2],
			totalCodeLines: parseInt(values[3]) || 0,
			svelteLines: parseInt(values[4]) || 0,
			tsLines: parseInt(values[5]) || 0,
			jsLines: parseInt(values[6]) || 0,
			cssLines: parseInt(values[7]) || 0,
			docWords: parseInt(values[8]) || 0,
			docLines: parseInt(values[9]) || 0,
			totalFiles: parseInt(values[10]) || 0,
			directories: parseInt(values[11]) || 0,
			estimatedTokens: parseInt(values[12]) || 0,
			commits: parseInt(values[13]) || 0,
			date
		};
	});
}

export function load() {
	const snapshots = parseCSV(historyData);
	const latest = snapshots[snapshots.length - 1];
	const first = snapshots[0];

	// Calculate growth if we have multiple snapshots
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
