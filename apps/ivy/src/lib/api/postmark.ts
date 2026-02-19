/**
 * Postmark API Client
 *
 * Handles newsletter/broadcast sending via Postmark.
 * https://postmarkapp.com/developer
 */

export interface PostmarkConfig {
	serverToken: string;
	baseUrl?: string;
}

export interface BroadcastParams {
	from: string;
	to: string[];
	subject: string;
	htmlBody?: string;
	textBody?: string;
	messageStream?: string;
}

export class PostmarkClient {
	private serverToken: string;
	private baseUrl: string;

	constructor(config: PostmarkConfig) {
		this.serverToken = config.serverToken;
		this.baseUrl = config.baseUrl ?? "https://api.postmarkapp.com";
	}

	// TODO: Implement broadcast send
	async sendBroadcast(params: BroadcastParams): Promise<{ messageId: string }> {
		throw new Error("Not implemented");
	}
}
