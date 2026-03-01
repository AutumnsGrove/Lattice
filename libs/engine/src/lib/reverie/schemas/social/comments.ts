import type { DomainSchema } from "../../types";

/**
 * Comment Settings (Reeds) — how visitors speak to you.
 * All boolean toggles and one enum. Perfect for natural language.
 */
export const commentsSchema: DomainSchema = {
	id: "social.comments",
	name: "Comment Settings",
	description:
		"Controls whether comments are enabled, who can comment, and notification preferences.",
	group: "social",
	database: "engine",
	readEndpoint: "GET /api/admin/comments/settings",
	writeEndpoint: "PUT /api/admin/comments/settings",
	writeMethod: "PUT",
	fields: {
		commentsEnabled: {
			type: "boolean",
			description: "Master toggle for comments on your grove",
			default: true,
		},
		publicCommentsEnabled: {
			type: "boolean",
			description: "Allow comments from visitors who aren't signed in",
			default: false,
		},
		whoCanComment: {
			type: "enum",
			description: "Who is allowed to leave comments",
			options: ["anyone", "registered", "rooted"],
			default: "registered",
		},
		showCommentCount: {
			type: "boolean",
			description: "Display comment count on post listings",
			default: true,
		},
		notifyOnReply: {
			type: "boolean",
			description: "Email notification when someone replies directly to you",
			default: true,
		},
		notifyOnPending: {
			type: "boolean",
			description: "Email notification when a comment is waiting for approval",
			default: true,
		},
		notifyOnThreadReply: {
			type: "boolean",
			description: "Email notification when someone replies in a thread you started",
			default: false,
		},
	},
	examples: [
		"Turn off comments on my blog",
		"Only let registered users comment",
		"Notify me when someone replies",
		"Turn on comment counts",
		"Allow anyone to comment",
		"Disable public comments",
	],
	keywords: ["comment", "comments", "reply", "replies", "discussion", "reeds"],
};
