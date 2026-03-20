/**
 * GitHub Service Definition
 *
 * Actions: list_repos, get_repo, get_issue, list_issues,
 *          create_issue, create_comment, list_workflow_runs, trigger_workflow
 */

import { z } from "zod";
import { registerService } from "./registry";
import type { ServiceAction } from "./registry";

const BASE_URL = "https://api.github.com";

const commonHeaders = (token: string) => ({
	Authorization: `Bearer ${token}`,
	Accept: "application/vnd.github+json",
	"X-GitHub-Api-Version": "2022-11-28",
	"User-Agent": "Grove-Warden/0.1",
});

const actions: Record<string, ServiceAction> = {
	list_repos: {
		schema: z.object({
			owner: z.string().optional(),
			per_page: z.number().int().min(1).max(100).default(30),
			page: z.number().int().min(1).default(1),
		}),
		buildRequest: (params, token) => {
			const path = params.owner ? `/users/${params.owner}/repos` : "/user/repos";
			const qs = new URLSearchParams({
				per_page: String(params.per_page ?? 30),
				page: String(params.page ?? 1),
			});
			return {
				url: `${BASE_URL}${path}?${qs}`,
				method: "GET",
				headers: commonHeaders(token),
			};
		},
	},

	get_repo: {
		schema: z.object({
			owner: z.string(),
			repo: z.string(),
		}),
		buildRequest: (params, token) => ({
			url: `${BASE_URL}/repos/${params.owner}/${params.repo}`,
			method: "GET",
			headers: commonHeaders(token),
		}),
	},

	get_issue: {
		schema: z.object({
			owner: z.string(),
			repo: z.string(),
			issue_number: z.number().int(),
		}),
		buildRequest: (params, token) => ({
			url: `${BASE_URL}/repos/${params.owner}/${params.repo}/issues/${params.issue_number}`,
			method: "GET",
			headers: commonHeaders(token),
		}),
	},

	list_issues: {
		schema: z.object({
			owner: z.string(),
			repo: z.string(),
			state: z.enum(["open", "closed", "all"]).default("open"),
			per_page: z.number().int().min(1).max(100).default(30),
			page: z.number().int().min(1).default(1),
		}),
		buildRequest: (params, token) => {
			const qs = new URLSearchParams({
				state: String(params.state ?? "open"),
				per_page: String(params.per_page ?? 30),
				page: String(params.page ?? 1),
			});
			return {
				url: `${BASE_URL}/repos/${params.owner}/${params.repo}/issues?${qs}`,
				method: "GET",
				headers: commonHeaders(token),
			};
		},
	},

	create_issue: {
		schema: z.object({
			owner: z.string(),
			repo: z.string(),
			title: z.string(),
			body: z.string().optional(),
			labels: z.array(z.string()).optional(),
			assignees: z.array(z.string()).optional(),
		}),
		buildRequest: (params, token) => ({
			url: `${BASE_URL}/repos/${params.owner}/${params.repo}/issues`,
			method: "POST",
			headers: { ...commonHeaders(token), "Content-Type": "application/json" },
			body: JSON.stringify({
				title: params.title,
				body: params.body,
				labels: params.labels,
				assignees: params.assignees,
			}),
		}),
	},

	create_comment: {
		schema: z.object({
			owner: z.string(),
			repo: z.string(),
			issue_number: z.number().int(),
			body: z.string(),
		}),
		buildRequest: (params, token) => ({
			url: `${BASE_URL}/repos/${params.owner}/${params.repo}/issues/${params.issue_number}/comments`,
			method: "POST",
			headers: { ...commonHeaders(token), "Content-Type": "application/json" },
			body: JSON.stringify({ body: params.body }),
		}),
	},

	list_workflow_runs: {
		schema: z.object({
			owner: z.string(),
			repo: z.string(),
			workflow_id: z.union([z.string(), z.number()]).optional(),
			per_page: z.number().int().min(1).max(100).default(10),
		}),
		buildRequest: (params, token) => {
			const base = params.workflow_id
				? `${BASE_URL}/repos/${params.owner}/${params.repo}/actions/workflows/${params.workflow_id}/runs`
				: `${BASE_URL}/repos/${params.owner}/${params.repo}/actions/runs`;
			const qs = new URLSearchParams({ per_page: String(params.per_page ?? 10) });
			return {
				url: `${base}?${qs}`,
				method: "GET",
				headers: commonHeaders(token),
			};
		},
	},

	trigger_workflow: {
		schema: z.object({
			owner: z.string(),
			repo: z.string(),
			workflow_id: z.union([z.string(), z.number()]),
			ref: z.string().default("main"),
			inputs: z.record(z.string(), z.string()).optional(),
		}),
		buildRequest: (params, token) => ({
			url: `${BASE_URL}/repos/${params.owner}/${params.repo}/actions/workflows/${params.workflow_id}/dispatches`,
			method: "POST",
			headers: { ...commonHeaders(token), "Content-Type": "application/json" },
			body: JSON.stringify({ ref: params.ref, inputs: params.inputs }),
		}),
	},
};

registerService({
	name: "github",
	baseUrl: BASE_URL,
	auth: { type: "bearer" },
	actions,
});
