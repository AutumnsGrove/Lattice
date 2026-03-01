import type { DomainSchema } from "../../types";

/**
 * Webring — the old web tradition, alive again.
 * A circle of sites linked together, each pointing to the next.
 */
export const webringSchema: DomainSchema = {
	id: "curios.webring",
	name: "Webring",
	description:
		"Join and manage webrings. A circle of linked sites where visitors navigate between members.",
	group: "social",
	database: "curios",
	readEndpoint: "GET /api/curios/webring",
	writeEndpoint: "PUT /api/curios/webring",
	writeMethod: "PUT",
	fields: {
		enabled: {
			type: "boolean",
			description: "Show the webring widget on your grove",
			default: false,
		},
		webringId: {
			type: "string",
			description: "ID of the webring you belong to",
		},
		displayStyle: {
			type: "enum",
			description: "How the webring navigation appears",
			options: ["banner", "footer", "floating", "hidden"],
			default: "footer",
		},
		showMemberCount: {
			type: "boolean",
			description: "Display how many sites are in the ring",
			default: true,
		},
		customLabel: {
			type: "string",
			description: "Custom label for the webring widget",
			constraints: { maxLength: 60 },
		},
		prevLabel: {
			type: "string",
			description: "Label for the 'previous site' link",
			default: "← prev",
			constraints: { maxLength: 20 },
		},
		nextLabel: {
			type: "string",
			description: "Label for the 'next site' link",
			default: "next →",
			constraints: { maxLength: 20 },
		},
	},
	examples: [
		"Join the indie writers webring",
		"Show the webring in my footer",
		"Hide the member count",
		"Change the navigation labels",
		"Leave the webring",
	],
	keywords: ["webring", "ring", "linked", "circle", "indie web", "webrings"],
};
