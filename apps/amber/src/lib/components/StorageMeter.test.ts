import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import StorageMeter from "./StorageMeter.svelte";
import type { QuotaStatus } from "$types";

describe("StorageMeter", () => {
	const baseQuota: QuotaStatus = {
		tier_gb: 20,
		additional_gb: 0,
		total_gb: 20,
		used_bytes: 5 * 1024 * 1024 * 1024, // 5 GB
		used_gb: 5,
		available_bytes: 15 * 1024 * 1024 * 1024,
		percentage: 25,
		warning_level: "none",
	};

	it("should render storage info", () => {
		render(StorageMeter, { props: { quota: baseQuota } });

		expect(screen.getByText("Storage")).toBeInTheDocument();
		expect(screen.getByText(/5 GB \/ 20 GB/)).toBeInTheDocument();
	});

	it("should display percentage used", () => {
		render(StorageMeter, { props: { quota: baseQuota } });

		expect(screen.getByText(/25\.0% used/)).toBeInTheDocument();
	});

	it("should display available space", () => {
		render(StorageMeter, { props: { quota: baseQuota } });

		expect(screen.getByText(/15 GB available/)).toBeInTheDocument();
	});

	it("should show warning message at 80%", () => {
		const warningQuota: QuotaStatus = {
			...baseQuota,
			used_bytes: 16 * 1024 * 1024 * 1024,
			used_gb: 16,
			available_bytes: 4 * 1024 * 1024 * 1024,
			percentage: 80,
			warning_level: "warning",
		};

		render(StorageMeter, { props: { quota: warningQuota } });

		expect(screen.getByText(/approaching your storage limit/i)).toBeInTheDocument();
	});

	it("should show critical message at 95%", () => {
		const criticalQuota: QuotaStatus = {
			...baseQuota,
			used_bytes: 19 * 1024 * 1024 * 1024,
			used_gb: 19,
			available_bytes: 1 * 1024 * 1024 * 1024,
			percentage: 95,
			warning_level: "critical",
		};

		render(StorageMeter, { props: { quota: criticalQuota } });

		expect(screen.getByText(/Storage almost full/i)).toBeInTheDocument();
	});

	it("should show full message at 100%", () => {
		const fullQuota: QuotaStatus = {
			...baseQuota,
			used_bytes: 20 * 1024 * 1024 * 1024,
			used_gb: 20,
			available_bytes: 0,
			percentage: 100,
			warning_level: "full",
		};

		render(StorageMeter, { props: { quota: fullQuota } });

		expect(screen.getByText(/Storage full/i)).toBeInTheDocument();
	});

	it("should not show warning for normal usage", () => {
		render(StorageMeter, { props: { quota: baseQuota } });

		expect(screen.queryByText(/approaching your storage limit/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/Storage almost full/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/Storage full/i)).not.toBeInTheDocument();
	});
});
